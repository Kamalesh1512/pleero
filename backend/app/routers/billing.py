"""
Billing endpoints.
Handles Shopify recurring charge activation and callback.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.merchant import Merchant, SubscriptionStatus
from app.services.billing import create_subscription, update_merchant_subscription
from app.utils.app_bridge_auth import get_current_shop

logger = get_logger(__name__)
router = APIRouter(prefix="/api/billing", tags=["billing"])


class ActivateResponse(BaseModel):
    """Response for activation request."""

    confirmation_url: str


@router.post("/activate")
async def activate_subscription(
    shop: str = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db),
) -> ActivateResponse:
    """
    Create recurring charge for merchant.

    Called from frontend when merchant clicks "Activate plan".
    Returns Shopify confirmation URL for merchant to approve.

    Requires App Bridge session token authentication.

    Returns:
        Confirmation URL to redirect merchant to
    """
    # Load merchant
    result = await db.execute(
        select(Merchant).where(Merchant.shop_domain == shop)
    )
    merchant = result.scalar_one_or_none()

    if not merchant:
        logger.error("merchant_not_found", shop=shop)
        raise HTTPException(
            status_code=404,
            detail="Merchant not found",
        )

    # Create subscription
    confirmation_url = await create_subscription(db, merchant.id)

    if not confirmation_url:
        logger.error(
            "subscription_creation_failed",
            shop=shop,
            merchant_id=str(merchant.id),
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to create subscription",
        )

    logger.info(
        "subscription_activation_initiated",
        shop=shop,
        merchant_id=str(merchant.id),
    )

    return ActivateResponse(confirmation_url=confirmation_url)


@router.get("/callback")
async def billing_callback(
    charge_id: str = Query(..., description="Shopify charge ID"),
    shop: str = Query(..., description="Shop domain"),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """
    Handle billing approval callback from Shopify.

    After merchant approves the charge, Shopify redirects here.

    Steps:
    1. Verify charge ID
    2. Update merchant subscription status to ACTIVE
    3. Redirect to frontend dashboard

    Query params:
        charge_id: Shopify charge ID
        shop: Shop domain

    Returns:
        Redirect to frontend dashboard
    """
    logger.info(
        "billing_callback_received",
        shop=shop,
        charge_id=charge_id,
    )

    # Load merchant
    result = await db.execute(
        select(Merchant).where(Merchant.shop_domain == shop)
    )
    merchant = result.scalar_one_or_none()

    if not merchant:
        logger.error("merchant_not_found", shop=shop)
        raise HTTPException(
            status_code=404,
            detail="Merchant not found",
        )

    # Update subscription status to ACTIVE
    success = await update_merchant_subscription(
        db,
        merchant.id,
        SubscriptionStatus.ACTIVE,
        charge_id,
    )

    if not success:
        logger.error(
            "subscription_update_failed",
            shop=shop,
            merchant_id=str(merchant.id),
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to update subscription",
        )

    logger.info(
        "subscription_activated",
        shop=shop,
        merchant_id=str(merchant.id),
        charge_id=charge_id,
    )

    # Redirect to frontend dashboard
    dashboard_url = f"{settings.FRONTEND_URL}/?shop={shop}&activated=true"
    return RedirectResponse(url=dashboard_url)
