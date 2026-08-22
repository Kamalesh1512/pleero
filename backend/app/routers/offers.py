"""
Offer endpoints.
Public routes for customers to view, accept, or decline store credit offers.
"""

from datetime import datetime, UTC, timedelta

from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.offer import Offer, OfferStatus, RefundStatus
from app.models.merchant import Merchant
from app.models.offer_event import OfferEvent, EventType
from app.services.billing import (
    merchant_has_feature_access,
    sync_merchant_subscription_from_shopify,
)
from app.services.shopify import RefundActionOutcome, refund_to_store_credit
from app.services.email import format_currency

logger = get_logger(__name__)
router = APIRouter(prefix="/offers", tags=["offers"])
limiter = Limiter(key_func=get_remote_address)


async def expire_offer_if_due(db: AsyncSession, offer: Offer) -> bool:
    """
    Lazily expire a PENDING offer older than OFFER_EXPIRY_DAYS.

    Idempotent: only acts while the offer is PENDING. Emits an EXPIRED event so
    expiry is observable in the lifecycle. Returns True if the offer expired.
    """
    if offer.status != OfferStatus.PENDING:
        return False

    if offer.created_at is not None:
        age = datetime.now(UTC) - offer.created_at
        if age < timedelta(days=settings.OFFER_EXPIRY_DAYS):
            return False

    offer.status = OfferStatus.EXPIRED
    offer.expired_at = datetime.now(UTC)
    db.add(
        OfferEvent(
            offer_id=offer.id,
            event_type=EventType.EXPIRED,
            offer_event_metadata={"reason": "expiry_period_elapsed"},
        )
    )
    await db.commit()
    logger.info("offer_expired_lazily", offer_id=str(offer.id))
    return True


class OfferResponse(BaseModel):
    """Response schema for offer data."""

    offer_token: str
    customer_first_name: str
    refund_amount_cents: int
    credit_amount_cents: int
    bonus_applied_cents: int
    status: OfferStatus
    merchant_logo_url: str | None
    merchant_brand_color: str

    model_config = {
        "from_attributes": True,
    }


class OfferActionResponse(BaseModel):
    """Response schema for offer actions (accept/decline)."""

    status: str
    message: str


@router.get("/{offer_token}")
@limiter.limit("20/minute")
async def get_offer(
    request: Request,
    offer_token: str,
    db: AsyncSession = Depends(get_db),
) -> OfferResponse:
    """
    Get offer details by token.

    Public route - no authentication required.

    Args:
        offer_token: Offer token (UUID string)

    Returns:
        Offer data with merchant branding

    Raises:
        HTTPException: 404 if offer not found, 410 if offer expired/used
    """
    # Load offer
    result = await db.execute(select(Offer).where(Offer.offer_token == offer_token))
    offer = result.scalar_one_or_none()

    if not offer:
        logger.warning("offer_not_found", offer_token=offer_token)
        raise HTTPException(
            status_code=404,
            detail="Offer not found",
        )

    # Lazily expire the offer if its validity window has elapsed.
    await expire_offer_if_due(db, offer)

    # Check offer status
    if offer.status != OfferStatus.PENDING:
        logger.info(
            "offer_already_processed",
            offer_token=offer_token,
            status=offer.status.value,
        )
        raise HTTPException(
            status_code=410,
            detail=f"Offer already {offer.status.value.lower()}",
        )

    # Load merchant for branding
    merchant_result = await db.execute(
        select(Merchant).where(Merchant.id == offer.merchant_id)
    )
    merchant: Merchant | None = merchant_result.scalar_one_or_none()

    if not merchant:
        logger.error("merchant_not_found", offer_id=str(offer.id))
        raise HTTPException(
            status_code=500,
            detail="Merchant not found",
        )

    # Create VIEWED event
    event = OfferEvent(
        offer_id=offer.id,
        event_type=EventType.VIEWED,
    )
    db.add(event)
    await db.commit()

    logger.info(
        "offer_viewed",
        offer_id=str(offer.id),
        offer_token=offer_token,
    )

    return OfferResponse(
        offer_token=offer.offer_token,
        customer_first_name=offer.customer_first_name,
        refund_amount_cents=offer.refund_amount_cents,
        credit_amount_cents=offer.credit_amount_cents,
        bonus_applied_cents=offer.bonus_applied_cents,
        status=offer.status,
        merchant_logo_url=merchant.logo_url,
        merchant_brand_color=merchant.brand_color,
    )


@router.post("/{offer_token}/accept")
@limiter.limit("5/minute")
async def accept_offer(
    request: Request,
    offer_token: str,
    db: AsyncSession = Depends(get_db),
) -> OfferActionResponse:
    """
    Accept store credit offer.

    Public route - no authentication required.

    Flow:
    1. Load offer (must be PENDING)
    2. Issue a native store-credit refund via Shopify API (no separate cash
       refund is created, so nothing needs to be cancelled/reversed). If a
       cash refund already paid out, flag the offer for manual review instead
       of issuing credit on top of it.
    3. Update offer status to ACCEPTED
    4. Create audit events

    Idempotent: If already accepted, return success.

    Args:
        offer_token: Offer token (UUID string)

    Returns:
        Success message

    Raises:
        HTTPException: 404 if not found, 410 if expired, 500 if credit fails
    """
    # Load offer
    result = await db.execute(select(Offer).where(Offer.offer_token == offer_token))
    offer = result.scalar_one_or_none()

    if not offer:
        logger.warning("offer_not_found", offer_token=offer_token)
        raise HTTPException(
            status_code=404,
            detail="Offer not found",
        )

    # Lazily expire the offer if its validity window has elapsed.
    await expire_offer_if_due(db, offer)

    # Idempotent: If already accepted, return success
    if offer.status == OfferStatus.ACCEPTED:
        logger.info(
            "offer_already_accepted",
            offer_id=str(offer.id),
            offer_token=offer_token,
        )
        return OfferActionResponse(
            status="success",
            message="Offer already accepted",
        )

    # Check if offer is still pending
    if offer.status != OfferStatus.PENDING:
        logger.warning(
            "offer_cannot_accept",
            offer_id=str(offer.id),
            status=offer.status.value,
        )
        raise HTTPException(
            status_code=410,
            detail=f"Offer is {offer.status.value.lower()} and cannot be accepted",
        )

    # Load merchant
    merchant_result = await db.execute(
        select(Merchant).where(Merchant.id == offer.merchant_id)
    )
    merchant = merchant_result.scalar_one_or_none()

    if not merchant:
        logger.error("merchant_not_found", offer_id=str(offer.id))
        raise HTTPException(
            status_code=500,
            detail="Merchant not found",
        )

    await sync_merchant_subscription_from_shopify(db, merchant)
    if not merchant_has_feature_access(merchant):
        logger.warning(
            "offer_accept_inactive_subscription",
            offer_id=str(offer.id),
            merchant_id=str(merchant.id),
            subscription_status=merchant.subscription_status.value,
        )
        raise HTTPException(
            status_code=403,
            detail="Merchant subscription is inactive",
        )

    try:
        # Step 1: Issue a native store-credit refund (refundCreate + storeCreditRefund).
        # This issues the credit directly and no separate cash refund is made, so no
        # reversal is needed. It is idempotent via the offer's UUID as the
        # refundCreate idempotency key.
        outcome = await refund_to_store_credit(
            db=db,
            merchant_id=merchant.id,
            order_id=offer.shopify_order_id,
            refund_id=offer.shopify_refund_id,
            credit_amount_cents=offer.credit_amount_cents,
            currency=offer.currency_code,
            idempotency_key=offer.id,
        )

        if outcome != RefundActionOutcome.CREDIT_REFUND_CREATED:
            # Consistent with the no-silent-credit rule: the offer stays PENDING
            # and is flagged for merchant/manual review rather than pretending the
            # credit was issued while a cash refund may still pay out.
            offer.refund_status = RefundStatus.MANUAL_REVIEW
            await db.commit()
            logger.error(
                "offer_accept_store_credit_refund_manual_review",
                offer_id=str(offer.id),
                merchant_id=str(merchant.id),
                order_id=offer.shopify_order_id,
                refund_id=offer.shopify_refund_id,
            )

            # Alert the merchant off the request path so they can resolve this
            # in Shopify admin — Pleero never fakes success on this path.
            from app.tasks.email_tasks import send_manual_review_alert_email_task

            send_manual_review_alert_email_task.delay(str(offer.id))

            raise HTTPException(
                status_code=500,
                detail=(
                    "We couldn't automatically issue your store credit right now. "
                    "The store has been notified and will resolve this shortly — "
                    "no further action is needed from you."
                ),
            )

        # Step 2: Mark the offer accepted and record the refund lifecycle.
        offer.status = OfferStatus.ACCEPTED
        offer.refund_status = RefundStatus.CREDIT_REFUND_CREATED
        offer.accepted_at = datetime.now(UTC)

        # Step 3: Create audit events
        event_accepted = OfferEvent(
            offer_id=offer.id,
            event_type=EventType.ACCEPTED,
        )
        db.add(event_accepted)

        event_credit_issued = OfferEvent(
            offer_id=offer.id,
            event_type=EventType.CREDIT_ISSUED,
            offer_event_metadata={
                "amount_cents": offer.credit_amount_cents,
                "refund_id": offer.shopify_refund_id,
                "order_id": offer.shopify_order_id,
                "refund_status": RefundStatus.CREDIT_REFUND_CREATED.value,
            },
        )
        db.add(event_credit_issued)

        await db.commit()

        logger.info(
            "offer_accepted",
            offer_id=str(offer.id),
            credit_amount_cents=offer.credit_amount_cents,
        )

        credit_str = format_currency(offer.credit_amount_cents, offer.currency_code)
        return OfferActionResponse(
            status="success",
            message=f"Store credit of {credit_str} has been added to your account",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "offer_accept_unexpected_error",
            offer_id=str(offer.id),
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing your request",
        ) from None


@router.post("/{offer_token}/decline")
@limiter.limit("5/minute")
async def decline_offer(
    request: Request,
    offer_token: str,
    db: AsyncSession = Depends(get_db),
) -> OfferActionResponse:
    """
    Decline store credit offer.

    Public route - no authentication required.

    Customer chooses to receive cash refund instead.
    Do NOT touch the Shopify refund - let it proceed normally.

    Args:
        offer_token: Offer token (UUID string)

    Returns:
        Success message

    Raises:
        HTTPException: 404 if not found, 410 if already processed
    """
    # Load offer
    result = await db.execute(select(Offer).where(Offer.offer_token == offer_token))
    offer = result.scalar_one_or_none()

    if not offer:
        logger.warning("offer_not_found", offer_token=offer_token)
        raise HTTPException(
            status_code=404,
            detail="Offer not found",
        )

    # Lazily expire the offer if its validity window has elapsed.
    await expire_offer_if_due(db, offer)

    # Check if offer is still pending
    if offer.status != OfferStatus.PENDING:
        logger.warning(
            "offer_cannot_decline",
            offer_id=str(offer.id),
            status=offer.status.value,
        )
        raise HTTPException(
            status_code=410,
            detail=f"Offer is {offer.status.value.lower()} and cannot be declined",
        )

    # Update offer status
    offer.status = OfferStatus.DECLINED
    offer.declined_at = datetime.now(UTC)

    # Create audit event
    event = OfferEvent(
        offer_id=offer.id,
        event_type=EventType.DECLINED,
    )
    db.add(event)

    await db.commit()

    logger.info(
        "offer_declined",
        offer_id=str(offer.id),
    )

    return OfferActionResponse(
        status="success",
        message="Your cash refund will be processed in 5-7 business days",
    )
