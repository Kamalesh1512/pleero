"""
Shopify OAuth authentication routes.
Handles app installation and OAuth callback.
"""

import secrets
from datetime import datetime, timedelta, UTC

from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import redis.asyncio as aioredis

from app.core.config import settings
from app.core.database import get_db
from app.core.encryption import encrypt_token
from app.core.logging import get_logger
from app.models.merchant import Merchant, SubscriptionStatus
from app.utils.shopify_auth import (
    verify_hmac,
    build_auth_url,
    exchange_code_for_token,
    validate_shop_domain,
)
from app.utils.webhook_registration import register_webhooks

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

# Redis client for state token storage
redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)


@router.get("/install")
async def install(
    request: Request,
    shop: str,
) -> RedirectResponse:
    """
    Initiate Shopify OAuth flow.

    Query params:
        shop: Shopify shop domain (e.g., "store.myshopify.com")

    Returns:
        Redirect to Shopify OAuth consent screen
    """
    # Validate shop domain
    if not validate_shop_domain(shop):
        logger.warning("invalid_shop_domain", shop=shop)
        raise HTTPException(
            status_code=400,
            detail="Invalid shop domain. Must be a valid myshopify.com domain.",
        )

    # Generate CSRF state token
    state = secrets.token_urlsafe(32)

    # Store state in Redis with 5-minute TTL
    await redis_client.setex(
        f"oauth_state:{state}",
        300,  # 5 minutes
        shop,
    )

    logger.info(
        "oauth_initiated",
        shop=shop,
        state=state,
    )

    # OAuth scopes required
    scopes = [
        "read_orders",
        "write_customers",
        "read_refunds",
        "write_draft_orders",
    ]

    # Build redirect URI
    redirect_uri = f"{settings.API_BASE_URL}/auth/callback"

    # Build and return OAuth URL
    auth_url = build_auth_url(
        shop=shop,
        scopes=scopes,
        redirect_uri=redirect_uri,
        state=state,
    )

    return RedirectResponse(url=auth_url)


@router.get("/callback")
async def callback(
    request: Request,
    code: str,
    shop: str,
    state: str,
    hmac: str,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """
    OAuth callback handler.

    CRITICAL: Verifies HMAC first (hard rule #1) — reject if fails.

    Query params:
        code: OAuth authorization code
        shop: Shop domain
        state: CSRF state token
        hmac: HMAC signature
        ... (other Shopify params)

    Returns:
        Redirect to frontend dashboard
    """
    # Get all query parameters
    query_params = dict(request.query_params)

    # CRITICAL: Verify HMAC first (hard rule #1)
    if not verify_hmac(query_params, settings.SHOPIFY_API_SECRET):
        logger.error(
            "oauth_callback_hmac_failed",
            shop=shop,
        )
        raise HTTPException(
            status_code=401,
            detail="HMAC verification failed",
        )

    # Verify state token
    stored_shop = await redis_client.get(f"oauth_state:{state}")
    if not stored_shop or stored_shop != shop:
        logger.error(
            "oauth_callback_state_mismatch",
            shop=shop,
            state=state,
        )
        raise HTTPException(
            status_code=400,
            detail="Invalid state token",
        )

    # Delete used state token
    await redis_client.delete(f"oauth_state:{state}")

    # Exchange code for access token
    access_token = await exchange_code_for_token(shop, code)
    if not access_token:
        logger.error(
            "oauth_callback_token_exchange_failed",
            shop=shop,
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to exchange code for token",
        )

    # Encrypt access token (hard rule #2)
    encrypted_token = encrypt_token(access_token)

    # Check if merchant already exists
    result = await db.execute(select(Merchant).where(Merchant.shop_domain == shop))
    merchant = result.scalar_one_or_none()

    if merchant:
        # Update existing merchant
        merchant.access_token_encrypted = encrypted_token
        merchant.subscription_status = SubscriptionStatus.TRIAL
        merchant.trial_ends_at = datetime.now(UTC) + timedelta(days=14)

        logger.info(
            "merchant_reinstalled",
            shop=shop,
            merchant_id=str(merchant.id),
        )
    else:
        # Create new merchant
        merchant = Merchant(
            shop_domain=shop,
            access_token_encrypted=encrypted_token,
            subscription_status=SubscriptionStatus.TRIAL,
            trial_ends_at=datetime.now(UTC) + timedelta(days=14),
            merchant_email=f"merchant@{shop}",  # Placeholder, will be updated in settings
            bonus_percentage=10,
            bonus_cap_cents=5000,
            brand_color="#000000",
        )
        db.add(merchant)

        logger.info(
            "merchant_created",
            shop=shop,
            merchant_id=str(merchant.id),
        )

    await db.commit()

    # Register webhooks programmatically
    webhook_success = await register_webhooks(shop, access_token)
    if not webhook_success:
        logger.warning(
            "webhook_registration_partial_failure",
            shop=shop,
            merchant_id=str(merchant.id),
        )
        # Don't fail the OAuth flow - merchant can still use the app
        # Webhooks can be re-registered later

    logger.info(
        "oauth_completed",
        shop=shop,
        merchant_id=str(merchant.id),
        webhooks_registered=webhook_success,
    )

    # Redirect to frontend dashboard
    dashboard_url = f"{settings.FRONTEND_URL}/?shop={shop}"
    return RedirectResponse(url=dashboard_url)
