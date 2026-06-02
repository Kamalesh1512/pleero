"""
Billing endpoints.
Handles Shopify recurring charge activation and callback.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.merchant import Merchant, SubscriptionStatus
from app.services.billing import (
    cancel_subscription,
    create_subscription,
    sync_merchant_subscription_from_shopify,
)
from app.utils.session_auth import get_current_shop
from app.utils.shopify_auth import verify_hmac

logger = get_logger(__name__)
router = APIRouter(prefix="/api/billing", tags=["billing"])


class ActivateResponse(BaseModel):
    """Response for activation request."""

    confirmation_url: str


class CancelResponse(BaseModel):
    """Response for cancellation request."""

    status: SubscriptionStatus


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
    result = await db.execute(select(Merchant).where(Merchant.shop_domain == shop))
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


@router.post("/cancel")
async def cancel_current_subscription(
    shop: str = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db),
) -> CancelResponse:
    """
    Cancel the merchant's current Shopify app subscription.

    This gives merchants a self-serve way to change away from the paid plan
    without contacting support or reinstalling the app.
    """
    result = await db.execute(select(Merchant).where(Merchant.shop_domain == shop))
    merchant = result.scalar_one_or_none()

    if not merchant:
        logger.error("merchant_not_found", shop=shop)
        raise HTTPException(
            status_code=404,
            detail="Merchant not found",
        )

    status = await cancel_subscription(db, merchant.id)
    if status is None:
        logger.error(
            "subscription_cancellation_failed",
            shop=shop,
            merchant_id=str(merchant.id),
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to cancel subscription",
        )

    return CancelResponse(status=status)


@router.get("/callback")
async def billing_callback(
    request: Request,
    charge_id: str | None = Query(None, description="Shopify charge ID"),
    shop: str = Query(..., description="Shop domain"),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """
    Handle billing approval callback from Shopify.

    After merchant approves the charge, Shopify redirects here.

    Steps:
    1. Verify HMAC signature (security: prevent forged callbacks)
    2. Verify approval by reading active subscriptions from Shopify
    3. Update merchant subscription status from Shopify's source of truth
    4. Redirect to frontend dashboard

    Query params:
        charge_id: Shopify charge ID, when included by Shopify
        shop: Shop domain
        hmac: HMAC signature from Shopify

    Returns:
        Redirect to frontend dashboard
    """
    logger.info(
        "billing_callback_received",
        shop=shop,
        charge_id=charge_id,
    )

    # Step 1: Verify HMAC signature when Shopify includes one.
    # Billing return URLs are validated below against Shopify's active
    # subscriptions, which is the source of truth for charge approval.
    query_params = dict(request.query_params)
    callback_hmac = query_params.get("hmac")
    if callback_hmac and not verify_hmac(query_params, settings.SHOPIFY_API_SECRET):
        logger.error(
            "billing_callback_hmac_failed",
            shop=shop,
            charge_id=charge_id,
        )
        raise HTTPException(
            status_code=401,
            detail="HMAC verification failed",
        )

    # Load merchant
    result = await db.execute(select(Merchant).where(Merchant.shop_domain == shop))
    merchant = result.scalar_one_or_none()

    if not merchant:
        logger.error("merchant_not_found", shop=shop)
        raise HTTPException(
            status_code=404,
            detail="Merchant not found",
        )

    status = await sync_merchant_subscription_from_shopify(db, merchant)
    if status not in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]:
        logger.error(
            "subscription_not_approved",
            shop=shop,
            merchant_id=str(merchant.id),
            charge_id=charge_id,
            status=status.value,
        )
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/billing")

    logger.info(
        "subscription_activated",
        shop=shop,
        merchant_id=str(merchant.id),
        charge_id=charge_id,
    )

    # Redirect to the standalone dashboard — session cookie identifies the shop
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/dashboard")
