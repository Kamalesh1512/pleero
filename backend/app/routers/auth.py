"""
Shopify OAuth authentication routes.
Handles app installation and OAuth callback.
"""

import secrets
from datetime import datetime, timedelta, UTC

import httpx
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import redis.asyncio as aioredis
from slowapi import Limiter
from slowapi.util import get_remote_address

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

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

# Redis client for state token storage
redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)


@router.get("/install")
@limiter.limit("10/minute")
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

    # OAuth scopes required (must match shopify.app.toml)
    # See: https://shopify.dev/docs/api/usage/access-scopes
    scopes = [
        "write_orders",  # Covers refunds AND refund webhook subscriptions
        "write_customers",  # Customer management
        "write_store_credit_account_transactions",  # Required for store credit issuance
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
@limiter.limit("10/minute")
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

    # Fetch shop name from Shopify (used in customer-facing emails)
    shop_name: str | None = None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://{shop}/admin/api/{settings.SHOPIFY_API_VERSION}/shop.json",
                headers={"X-Shopify-Access-Token": access_token},
            )
            if resp.status_code == 200:
                shop_name = resp.json().get("shop", {}).get("name")
    except Exception:
        logger.warning("shop_name_fetch_failed", shop=shop)

    # Check if merchant already exists
    result = await db.execute(select(Merchant).where(Merchant.shop_domain == shop))
    merchant = result.scalar_one_or_none()

    if merchant:
        # Update existing merchant
        merchant.access_token_encrypted = encrypted_token
        merchant.subscription_status = SubscriptionStatus.TRIAL
        merchant.trial_ends_at = datetime.now(UTC) + timedelta(days=14)
        if shop_name:
            merchant.shop_name = shop_name

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
            shop_name=shop_name,
        )
        db.add(merchant)

        logger.info(
            "merchant_created",
            shop=shop,
            merchant_id=str(merchant.id),
        )

    await db.commit()

    # NOTE: REFUNDS_CREATE webhook requires Shopify approval for programmatic registration
    # due to protected customer data. Instead, we rely on shopify.app.toml declarative
    # webhooks which are automatically registered by Shopify during deployment.
    # See: https://shopify.dev/docs/apps/launch/protected-customer-data
    #
    # In production: shopify.app.toml webhooks are auto-registered
    # In development: Use Partner Dashboard to manually register webhooks for testing

    logger.info(
        "oauth_completed",
        shop=shop,
        merchant_id=str(merchant.id),
        webhooks_registered="via_toml",
    )

    # Redirect to frontend dashboard
    dashboard_url = f"{settings.FRONTEND_URL}/?shop={shop}"
    return RedirectResponse(url=dashboard_url)
