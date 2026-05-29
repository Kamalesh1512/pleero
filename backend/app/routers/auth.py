"""
Shopify OAuth authentication routes.
Handles app installation and OAuth callback.
"""

import secrets
from datetime import datetime, timedelta, UTC
from typing import Annotated

import httpx
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
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
from app.utils.session_auth import (
    COOKIE_NAME,
    SESSION_TTL,
    create_session,
    get_current_shop,
    revoke_session_for_shop,
)
from app.utils.shopify_auth import (
    verify_hmac,
    build_auth_url,
    exchange_code_for_token,
    validate_shop_domain,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])
api_router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

# Redis client for OAuth state token storage (separate from session Redis in session_auth)
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

    # Exchange code for an expiring offline access token (expiring=1).
    # Returns access_token (1h TTL), refresh_token (90d TTL), expires_at.
    token_result = await exchange_code_for_token(shop, code)
    if not token_result:
        logger.error("oauth_callback_token_exchange_failed", shop=shop)
        raise HTTPException(
            status_code=500,
            detail="Failed to exchange code for token",
        )

    access_token = token_result["access_token"]

    # Encrypt tokens at rest (hard rule #2)
    encrypted_token = encrypt_token(access_token)
    encrypted_refresh = (
        encrypt_token(token_result["refresh_token"])
        if token_result["refresh_token"]
        else None
    )
    token_expires_at = token_result["expires_at"]

    # Fetch shop details from Shopify (used in emails and credit issuance)
    shop_name: str | None = None
    shop_currency: str = "USD"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://{shop}/admin/api/{settings.SHOPIFY_API_VERSION}/shop.json",
                headers={"X-Shopify-Access-Token": access_token},
            )
            if resp.status_code == 200:
                shop_data = resp.json().get("shop", {})
                shop_name = shop_data.get("name")
                shop_currency = shop_data.get("currency", "USD")
    except Exception:
        logger.warning("shop_details_fetch_failed", shop=shop)

    # Check if merchant already exists
    result = await db.execute(select(Merchant).where(Merchant.shop_domain == shop))
    merchant = result.scalar_one_or_none()

    if merchant:
        merchant.access_token_encrypted = encrypted_token
        merchant.refresh_token_encrypted = encrypted_refresh
        merchant.access_token_expires_at = token_expires_at
        merchant.subscription_status = SubscriptionStatus.TRIAL
        merchant.trial_ends_at = datetime.now(UTC) + timedelta(days=14)
        if shop_name:
            merchant.shop_name = shop_name
        merchant.currency = shop_currency

        logger.info("merchant_reinstalled", shop=shop, merchant_id=str(merchant.id))
    else:
        merchant = Merchant(
            shop_domain=shop,
            access_token_encrypted=encrypted_token,
            refresh_token_encrypted=encrypted_refresh,
            access_token_expires_at=token_expires_at,
            subscription_status=SubscriptionStatus.TRIAL,
            trial_ends_at=datetime.now(UTC) + timedelta(days=14),
            merchant_email=f"merchant@{shop}",
            bonus_percentage=10,
            bonus_cap_cents=5000,
            brand_color="#000000",
            shop_name=shop_name,
            currency=shop_currency,
        )
        db.add(merchant)

        logger.info("merchant_created", shop=shop, merchant_id=str(merchant.id))

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

    # Create a Pleero session cookie so the frontend can authenticate without
    # App Bridge session tokens.  The cookie is HttpOnly + Secure and scoped to
    # api.pleero.app; same-site Lax means it is sent on cross-origin fetches
    # from app.pleero.app (same eTLD+1) to api.pleero.app.
    session_id = await create_session(shop)
    is_prod = settings.APP_ENV == "production"

    response = RedirectResponse(
        url=f"{settings.FRONTEND_URL}/dashboard",
        status_code=302,
    )
    response.set_cookie(
        key=COOKIE_NAME,
        value=session_id,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        max_age=SESSION_TTL,
        path="/",
    )
    return response


# ─── Authenticated session endpoints ─────────────────────────────────────────


@api_router.get("/me")
async def get_me(shop: str = Depends(get_current_shop)) -> dict[str, str]:
    """Return the shop domain for the current session. Used by the frontend to
    verify auth state on every page load."""
    return {"shop": shop}


@api_router.post("/logout")
async def logout(
    response: Response,
    pleero_session: Annotated[str | None, Cookie()] = None,
) -> dict[str, str]:
    """Invalidate the session cookie and remove the Redis session."""
    if pleero_session:
        shop = await redis_client.get(f"session:{pleero_session}")
        if shop:
            await revoke_session_for_shop(shop)
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"status": "logged_out"}
