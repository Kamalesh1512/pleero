"""
Shopify webhook endpoints.
Receives and processes webhook events from Shopify.
"""

from fastapi import APIRouter, Request, HTTPException, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.merchant import Merchant, SubscriptionStatus
from app.models.offer import Offer, OfferStatus
from app.models.offer_event import OfferEvent, EventType
from app.utils.shopify_webhooks import (
    verify_webhook_hmac,
    parse_refund_webhook,
    should_skip_offer,
    calculate_bonus,
)
from app.schemas.webhook import RefundWebhookPayload, AppUninstalledPayload

logger = get_logger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


async def verify_webhook_signature(
    request: Request,
    x_shopify_hmac_sha256: str = Header(...),
) -> bytes:
    """
    FastAPI dependency to verify webhook HMAC.

    CRITICAL: Hard rule #1 - Always verify HMAC on every webhook endpoint.

    Args:
        request: FastAPI request
        x_shopify_hmac_sha256: Shopify HMAC header

    Returns:
        Raw request body

    Raises:
        HTTPException: If HMAC verification fails
    """
    body = await request.body()

    if not verify_webhook_hmac(body, x_shopify_hmac_sha256, settings.SHOPIFY_API_SECRET):
        logger.error(
            "webhook_hmac_verification_failed",
            headers=dict(request.headers),
        )
        raise HTTPException(
            status_code=401,
            detail="HMAC verification failed",
        )

    return body


@router.post("/refunds/create")
async def handle_refund_created(
    request: Request,
    payload: RefundWebhookPayload,
    db: AsyncSession = Depends(get_db),
    _body: bytes = Depends(verify_webhook_signature),
) -> dict[str, str]:
    """
    Handle refunds/create webhook from Shopify.

    This is the core webhook that triggers offer creation.
    Must respond within 5 seconds or Shopify will retry.

    Flow:
    1. Verify HMAC (done in dependency)
    2. Parse webhook payload
    3. Load merchant by shop domain
    4. Check skip conditions
    5. Calculate bonus
    6. Create offer record
    7. Send offer email (directly, no Celery for MVP)
    8. Return 200 OK

    Hard rule #4: Must be async route, use httpx for external calls
    """
    # Get shop domain from header
    shop_domain = request.headers.get("x-shopify-shop-domain")
    if not shop_domain:
        logger.error("webhook_missing_shop_domain")
        return {"status": "error", "message": "Missing shop domain"}

    logger.info(
        "webhook_received",
        event="refunds/create",
        shop=shop_domain,
        refund_id=payload.id,
        order_id=payload.order_id,
    )

    try:
        # Load merchant
        result = await db.execute(
            select(Merchant).where(Merchant.shop_domain == shop_domain)
        )
        merchant = result.scalar_one_or_none()

        if not merchant:
            logger.error(
                "webhook_merchant_not_found",
                shop=shop_domain,
            )
            # Return 200 to prevent retry (shop not installed)
            return {"status": "skipped", "reason": "merchant_not_found"}

        # Parse webhook data
        webhook_data = parse_refund_webhook(payload.model_dump())

        # Validate webhook data
        if not webhook_data.is_valid():
            logger.warning(
                "webhook_invalid_data",
                shop=shop_domain,
                refund_id=webhook_data.refund_id,
            )
            return {"status": "skipped", "reason": "invalid_data"}

        # Check skip conditions
        should_skip, skip_reason = should_skip_offer(
            webhook_data,
            merchant.subscription_status,
        )

        if should_skip:
            logger.info(
                "offer_bypassed",
                shop=shop_domain,
                refund_id=webhook_data.refund_id,
                reason=skip_reason,
            )
            return {"status": "skipped", "reason": skip_reason}

        # Calculate bonus
        credit_amount_cents, bonus_applied_cents = calculate_bonus(
            webhook_data.refund_amount_cents,
            merchant.bonus_percentage,
            merchant.bonus_cap_cents,
        )

        # Check if offer already exists (idempotency)
        result = await db.execute(
            select(Offer).where(
                Offer.merchant_id == merchant.id,
                Offer.shopify_refund_id == str(webhook_data.refund_id),
            )
        )
        existing_offer = result.scalar_one_or_none()

        if existing_offer:
            logger.info(
                "offer_already_exists",
                shop=shop_domain,
                refund_id=webhook_data.refund_id,
                offer_id=str(existing_offer.id),
            )
            return {"status": "skipped", "reason": "already_exists"}

        # Create offer record
        offer = Offer(
            merchant_id=merchant.id,
            shopify_refund_id=str(webhook_data.refund_id),
            shopify_order_id=str(webhook_data.order_id),
            customer_email=webhook_data.customer_email,
            customer_first_name=webhook_data.customer_first_name or "Customer",
            refund_amount_cents=webhook_data.refund_amount_cents,
            credit_amount_cents=credit_amount_cents,
            bonus_applied_cents=bonus_applied_cents,
            status=OfferStatus.PENDING,
        )
        db.add(offer)
        await db.flush()  # Get offer ID without committing

        # Create audit event
        event = OfferEvent(
            offer_id=offer.id,
            event_type=EventType.CREATED,
            metadata={
                "refund_id": webhook_data.refund_id,
                "order_id": webhook_data.order_id,
                "order_name": webhook_data.order_name,
            },
        )
        db.add(event)

        await db.commit()

        logger.info(
            "offer_created",
            shop=shop_domain,
            offer_id=str(offer.id),
            refund_id=webhook_data.refund_id,
            refund_amount_cents=webhook_data.refund_amount_cents,
            credit_amount_cents=credit_amount_cents,
            bonus_applied_cents=bonus_applied_cents,
        )

        # Send offer email
        from app.services.email import send_offer_email
        await send_offer_email(db, offer.id)

        # Return 200 OK (Shopify requires this within 5 seconds)
        return {
            "status": "success",
            "offer_id": str(offer.id),
        }

    except Exception as e:
        logger.error(
            "webhook_processing_error",
            shop=shop_domain,
            refund_id=payload.id,
            error=str(e),
            exc_info=True,
        )
        # Return 200 to prevent retry on bugs (log to Sentry instead)
        # We don't want Shopify to retry on application errors
        return {"status": "error", "message": str(e)}


@router.post("/app/uninstalled")
async def handle_app_uninstalled(
    request: Request,
    payload: AppUninstalledPayload,
    db: AsyncSession = Depends(get_db),
    _body: bytes = Depends(verify_webhook_signature),
) -> dict[str, str]:
    """
    Handle app/uninstalled webhook from Shopify.

    When merchant uninstalls the app:
    1. Set subscription_status = CANCELLED
    2. Log event

    Note: We don't delete merchant data (may reinstall later)
    """
    # Get shop domain from header
    shop_domain = request.headers.get("x-shopify-shop-domain")
    if not shop_domain:
        logger.error("webhook_missing_shop_domain")
        return {"status": "error", "message": "Missing shop domain"}

    logger.info(
        "webhook_received",
        event="app/uninstalled",
        shop=shop_domain,
    )

    try:
        # Load merchant
        result = await db.execute(
            select(Merchant).where(Merchant.shop_domain == shop_domain)
        )
        merchant = result.scalar_one_or_none()

        if not merchant:
            logger.warning(
                "webhook_merchant_not_found",
                shop=shop_domain,
            )
            return {"status": "skipped", "reason": "merchant_not_found"}

        # Update subscription status
        merchant.subscription_status = SubscriptionStatus.CANCELLED

        await db.commit()

        logger.info(
            "app_uninstalled",
            shop=shop_domain,
            merchant_id=str(merchant.id),
        )

        return {"status": "success"}

    except Exception as e:
        logger.error(
            "webhook_processing_error",
            shop=shop_domain,
            error=str(e),
            exc_info=True,
        )
        return {"status": "error", "message": str(e)}
