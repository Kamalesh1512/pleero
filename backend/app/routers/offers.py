"""
Offer endpoints.
Public routes for customers to view, accept, or decline store credit offers.
"""

from datetime import datetime, UTC

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.core.logging import get_logger
from app.models.offer import Offer, OfferStatus
from app.models.merchant import Merchant
from app.models.offer_event import OfferEvent, EventType
from app.services.shopify import issue_store_credit, cancel_refund

logger = get_logger(__name__)
router = APIRouter(prefix="/offers", tags=["offers"])


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
async def get_offer(
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
    result = await db.execute(
        select(Offer).where(Offer.offer_token == offer_token)
    )
    offer = result.scalar_one_or_none()

    if not offer:
        logger.warning("offer_not_found", offer_token=offer_token)
        raise HTTPException(
            status_code=404,
            detail="Offer not found",
        )

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
    result = await db.execute(
        select(Merchant).where(Merchant.id == offer.merchant_id)
    )
    merchant = result.scalar_one_or_none()

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
async def accept_offer(
    offer_token: str,
    db: AsyncSession = Depends(get_db),
) -> OfferActionResponse:
    """
    Accept store credit offer.

    Public route - no authentication required.

    Flow:
    1. Load offer (must be PENDING)
    2. Issue store credit via Shopify API
    3. Cancel refund (if possible)
    4. Update offer status to ACCEPTED
    5. Create audit events

    Idempotent: If already accepted, return success.

    Args:
        offer_token: Offer token (UUID string)

    Returns:
        Success message

    Raises:
        HTTPException: 404 if not found, 410 if expired, 500 if credit fails
    """
    # Load offer
    result = await db.execute(
        select(Offer).where(Offer.offer_token == offer_token)
    )
    offer = result.scalar_one_or_none()

    if not offer:
        logger.warning("offer_not_found", offer_token=offer_token)
        raise HTTPException(
            status_code=404,
            detail="Offer not found",
        )

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
    result = await db.execute(
        select(Merchant).where(Merchant.id == offer.merchant_id)
    )
    merchant = result.scalar_one_or_none()

    if not merchant:
        logger.error("merchant_not_found", offer_id=str(offer.id))
        raise HTTPException(
            status_code=500,
            detail="Merchant not found",
        )

    try:
        # Step 1: Issue store credit
        credit_issued = await issue_store_credit(
            db=db,
            merchant_id=merchant.id,
            customer_email=offer.customer_email,
            amount_cents=offer.credit_amount_cents,
            currency="USD",
            note=f"Store credit from return (Order {offer.shopify_order_id})",
        )

        if not credit_issued:
            logger.error(
                "offer_accept_credit_failed",
                offer_id=str(offer.id),
            )
            raise HTTPException(
                status_code=500,
                detail="Failed to issue store credit",
            )

        # Step 2: Cancel refund (best effort)
        await cancel_refund(
            db=db,
            merchant_id=merchant.id,
            order_id=offer.shopify_order_id,
            refund_id=offer.shopify_refund_id,
        )

        # Step 3: Update offer status
        offer.status = OfferStatus.ACCEPTED
        offer.accepted_at = datetime.now(UTC)

        # Step 4: Create audit events
        event_accepted = OfferEvent(
            offer_id=offer.id,
            event_type=EventType.ACCEPTED,
        )
        db.add(event_accepted)

        event_credit_issued = OfferEvent(
            offer_id=offer.id,
            event_type=EventType.CREDIT_ISSUED,
            metadata={
                "amount_cents": offer.credit_amount_cents,
                "customer_email": offer.customer_email,
            },
        )
        db.add(event_credit_issued)

        await db.commit()

        logger.info(
            "offer_accepted",
            offer_id=str(offer.id),
            customer_email=offer.customer_email,
            credit_amount_cents=offer.credit_amount_cents,
        )

        return OfferActionResponse(
            status="success",
            message=f"Store credit of ${offer.credit_amount_cents / 100:.0f} has been added to your account",
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
        )


@router.post("/{offer_token}/decline")
async def decline_offer(
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
    result = await db.execute(
        select(Offer).where(Offer.offer_token == offer_token)
    )
    offer = result.scalar_one_or_none()

    if not offer:
        logger.warning("offer_not_found", offer_token=offer_token)
        raise HTTPException(
            status_code=404,
            detail="Offer not found",
        )

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
        customer_email=offer.customer_email,
    )

    return OfferActionResponse(
        status="success",
        message="Your cash refund will be processed in 5-7 business days",
    )
