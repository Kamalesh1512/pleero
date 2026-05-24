"""
Shopify webhook endpoints.
Receives and processes webhook events from Shopify.
"""

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.merchant import Merchant, SubscriptionStatus
from app.models.offer import Offer, OfferStatus
from app.models.offer_event import EventType, OfferEvent
from app.schemas.webhook import (
    AppUninstalledPayload,
    CustomersDataRequestPayload,
    CustomersRedactPayload,
    RefundWebhookPayload,
    ShopRedactPayload,
)
from app.utils.shopify_webhooks import (
    calculate_bonus,
    parse_refund_webhook,
    should_skip_offer,
    verify_webhook_hmac,
)

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

    if not verify_webhook_hmac(
        body, x_shopify_hmac_sha256, settings.SHOPIFY_API_SECRET
    ):
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
        topic="refunds/create",
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
            order_number=webhook_data.order_name or None,
            customer_email=webhook_data.customer_email,
            customer_first_name=webhook_data.customer_first_name or "Customer",
            customer_shopify_id=webhook_data.customer_shopify_gid,
            refund_amount_cents=webhook_data.refund_amount_cents,
            credit_amount_cents=credit_amount_cents,
            bonus_applied_cents=bonus_applied_cents,
            currency_code=webhook_data.currency_code,
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
        # In production, hide error details; in development, show them
        error_message = (
            str(e) if settings.APP_ENV == "development" else "Internal processing error"
        )
        return {"status": "error", "message": error_message}


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
        topic="app/uninstalled",
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
        error_message = (
            str(e) if settings.APP_ENV == "development" else "Internal processing error"
        )
        return {"status": "error", "message": error_message}


# ── Mandatory compliance webhooks ──────────────────────────────────────────────
# Required by Shopify for any app that stores customer PII.
# Shopify will fail the app review automated check if these are missing.
# Docs: https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance


@router.post("/customers/data_request")
async def handle_customers_data_request(
    request: Request,
    payload: CustomersDataRequestPayload,
    db: AsyncSession = Depends(get_db),
    _body: bytes = Depends(verify_webhook_signature),
) -> dict[str, str]:
    """
    customers/data_request — customer asked what data we hold about them.

    We store: customer_email, customer_first_name in the offers table.
    Acknowledging receipt satisfies Shopify's requirement. The merchant
    is responsible for responding to the customer within 30 days.
    """
    logger.info(
        "compliance_data_request_received",
        shop_domain=payload.shop_domain,
        shop_id=payload.shop_id,
        customer_id=payload.customer.id,
        customer_email=payload.customer.email,
        orders_requested=payload.orders_requested,
    )
    return {"status": "acknowledged"}


@router.post("/customers/redact")
async def handle_customers_redact(
    request: Request,
    payload: CustomersRedactPayload,
    db: AsyncSession = Depends(get_db),
    _body: bytes = Depends(verify_webhook_signature),
) -> dict[str, str]:
    """
    customers/redact — anonymise all PII for this customer in our offers table.

    Keeps financial records (amounts, status, timestamps) intact for merchant
    revenue reporting but scrubs personal identifiers. Must complete within 30 days.
    """
    try:
        from sqlalchemy import update

        customer_email = payload.customer.email
        if not customer_email:
            logger.warning(
                "compliance_redact_no_email",
                shop_domain=payload.shop_domain,
                customer_id=payload.customer.id,
            )
            return {"status": "skipped", "reason": "no_email_provided"}

        redacted_email = f"redacted_{payload.customer.id}@redacted.invalid"
        result = await db.execute(
            update(Offer)
            .where(Offer.customer_email == customer_email)
            .values(
                customer_email=redacted_email,
                customer_first_name="Redacted",
                customer_shopify_id=None,
            )
        )
        await db.commit()

        logger.info(
            "compliance_customer_redacted",
            shop_domain=payload.shop_domain,
            customer_id=payload.customer.id,
            rows_updated=result.rowcount,
        )
        return {"status": "success"}

    except Exception as e:
        logger.error(
            "compliance_redact_error",
            shop_domain=payload.shop_domain,
            error=str(e),
            exc_info=True,
        )
        return {"status": "error", "message": "Internal processing error"}


@router.post("/shop/redact")
async def handle_shop_redact(
    request: Request,
    payload: ShopRedactPayload,
    db: AsyncSession = Depends(get_db),
    _body: bytes = Depends(verify_webhook_signature),
) -> dict[str, str]:
    """
    shop/redact — triggered 48 h after app uninstall.
    Deletes all offers and the merchant row for this shop.
    """
    try:
        from sqlalchemy import delete

        from app.models.offer_event import OfferEvent

        result = await db.execute(
            select(Merchant).where(Merchant.shop_domain == payload.shop_domain)
        )
        merchant = result.scalar_one_or_none()

        if not merchant:
            logger.info(
                "compliance_shop_redact_no_merchant",
                shop_domain=payload.shop_domain,
            )
            return {"status": "skipped", "reason": "merchant_not_found"}

        offer_ids_result = await db.execute(
            select(Offer.id).where(Offer.merchant_id == merchant.id)
        )
        offer_ids = [row[0] for row in offer_ids_result.fetchall()]

        if offer_ids:
            await db.execute(
                delete(OfferEvent).where(OfferEvent.offer_id.in_(offer_ids))
            )
            await db.execute(delete(Offer).where(Offer.merchant_id == merchant.id))

        await db.delete(merchant)
        await db.commit()

        logger.info(
            "compliance_shop_redacted",
            shop_domain=payload.shop_domain,
            shop_id=payload.shop_id,
            offers_deleted=len(offer_ids),
        )
        return {"status": "success"}

    except Exception as e:
        logger.error(
            "compliance_shop_redact_error",
            shop_domain=payload.shop_domain,
            error=str(e),
            exc_info=True,
        )
        return {"status": "error", "message": "Internal processing error"}


# ── Combined compliance endpoint (required by shopify.app.toml compliance_topics) ─
# Shopify sends all three compliance topics to this single URI.
# Dispatches to the individual handlers above based on X-Shopify-Topic header.


@router.post("/compliance")
async def handle_compliance(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _body: bytes = Depends(verify_webhook_signature),
) -> dict[str, str]:
    """
    Combined compliance webhook handler for customers/data_request,
    customers/redact, and shop/redact.

    shopify.app.toml compliance_topics requires a single URI for all three.
    Dispatches based on X-Shopify-Topic header.
    """
    topic = request.headers.get("x-shopify-topic", "")
    body_json = await request.json()

    if topic == "customers/data_request":
        payload = CustomersDataRequestPayload(**body_json)
        logger.info(
            "compliance_data_request_received",
            shop_domain=payload.shop_domain,
            customer_id=payload.customer.id,
        )
        return {"status": "acknowledged"}

    if topic == "customers/redact":
        payload = CustomersRedactPayload(**body_json)
        return await _redact_customer(db, payload)

    if topic == "shop/redact":
        payload = ShopRedactPayload(**body_json)
        return await _redact_shop(db, payload)

    logger.warning("compliance_unknown_topic", topic=topic)
    return {"status": "ignored", "topic": topic}


async def _redact_customer(
    db: AsyncSession, payload: CustomersRedactPayload
) -> dict[str, str]:
    """Shared logic extracted from handle_customers_redact."""
    try:
        from sqlalchemy import update

        customer_email = payload.customer.email
        if not customer_email:
            return {"status": "skipped", "reason": "no_email_provided"}

        redacted_email = f"redacted_{payload.customer.id}@redacted.invalid"
        result = await db.execute(
            update(Offer)
            .where(Offer.customer_email == customer_email)
            .values(
                customer_email=redacted_email,
                customer_first_name="Redacted",
                customer_shopify_id=None,
            )
        )
        await db.commit()
        logger.info(
            "compliance_customer_redacted",
            shop_domain=payload.shop_domain,
            customer_id=payload.customer.id,
            rows_updated=result.rowcount,
        )
        return {"status": "success"}
    except Exception as e:
        logger.error(
            "compliance_redact_error",
            shop_domain=payload.shop_domain,
            error=str(e),
            exc_info=True,
        )
        return {"status": "error", "message": "Internal processing error"}


async def _redact_shop(db: AsyncSession, payload: ShopRedactPayload) -> dict[str, str]:
    """Shared logic extracted from handle_shop_redact."""
    try:
        from sqlalchemy import delete

        result = await db.execute(
            select(Merchant).where(Merchant.shop_domain == payload.shop_domain)
        )
        merchant = result.scalar_one_or_none()

        if not merchant:
            return {"status": "skipped", "reason": "merchant_not_found"}

        offer_ids_result = await db.execute(
            select(Offer.id).where(Offer.merchant_id == merchant.id)
        )
        offer_ids = [row[0] for row in offer_ids_result.fetchall()]

        if offer_ids:
            await db.execute(
                delete(OfferEvent).where(OfferEvent.offer_id.in_(offer_ids))
            )
            await db.execute(delete(Offer).where(Offer.merchant_id == merchant.id))

        await db.delete(merchant)
        await db.commit()

        logger.info(
            "compliance_shop_redacted",
            shop_domain=payload.shop_domain,
            shop_id=payload.shop_id,
            offers_deleted=len(offer_ids),
        )
        return {"status": "success"}
    except Exception as e:
        logger.error(
            "compliance_shop_redact_error",
            shop_domain=payload.shop_domain,
            error=str(e),
            exc_info=True,
        )
        return {"status": "error", "message": "Internal processing error"}
