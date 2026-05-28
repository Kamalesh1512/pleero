"""
Shopify OAuth utilities.
Handles OAuth flow, HMAC verification, token exchange, and token refresh.

Shopify expiring offline token lifecycle (required for public apps since April 2026):
  - access_token  expires after 3600 s (1 hour)
  - refresh_token expires after 7 776 000 s (90 days); rolling — each use
    returns a fresh pair and invalidates the previous refresh token.
"""

from __future__ import annotations

import hmac
import hashlib
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any, TypedDict
from urllib.parse import urlencode

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

if TYPE_CHECKING:
    from app.models.merchant import Merchant

from app.core.config import settings
from app.core.encryption import decrypt_token, encrypt_token
from app.core.logging import get_logger

logger = get_logger(__name__)

# Refresh the access token this many seconds before it actually expires.
_REFRESH_BUFFER_SECONDS = 300  # 5 minutes


# ─── Types ────────────────────────────────────────────────────────────────────


class TokenExchangeResult(TypedDict):
    access_token: str
    refresh_token: str | None  # None for legacy non-expiring tokens
    expires_at: datetime | None  # None for legacy non-expiring tokens


# ─── HMAC verification ────────────────────────────────────────────────────────


def verify_hmac(query_params: dict[str, Any], secret: str) -> bool:
    """
    Verify HMAC signature for OAuth callback.
    Hard rule #1: Always verify HMAC.
    """
    hmac_to_verify = query_params.get("hmac", "")
    if not hmac_to_verify:
        logger.warning("hmac_verification_failed", reason="missing_hmac")
        return False

    params_copy = {k: v for k, v in query_params.items() if k != "hmac"}
    encoded_params = urlencode(sorted(params_copy.items()))
    computed_hmac = hmac.new(
        secret.encode("utf-8"), encoded_params.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    is_valid = hmac.compare_digest(computed_hmac, hmac_to_verify)

    if not is_valid:
        logger.warning(
            "hmac_verification_failed",
            reason="mismatch",
            shop=query_params.get("shop"),
        )
    return is_valid


# ─── OAuth URL builder ────────────────────────────────────────────────────────


def build_auth_url(
    shop: str,
    scopes: list[str],
    redirect_uri: str,
    state: str,
) -> str:
    """Build Shopify OAuth authorization URL."""
    params = {
        "client_id": settings.SHOPIFY_API_KEY,
        "scope": ",".join(scopes),
        "redirect_uri": redirect_uri,
        "state": state,
    }
    auth_url = f"https://{shop}/admin/oauth/authorize?{urlencode(params)}"
    logger.info("oauth_url_generated", shop=shop, scopes=scopes)
    return auth_url


# ─── Token exchange (OAuth callback) ─────────────────────────────────────────


async def exchange_code_for_token(
    shop: str,
    code: str,
) -> TokenExchangeResult | None:
    """
    Exchange OAuth authorization code for an expiring offline access token.

    Passes expiring=1 so Shopify returns both an access_token (1-hour TTL)
    and a refresh_token (90-day TTL) per the April 2026 requirement.

    Returns TokenExchangeResult or None on failure.
    Hard rule #4: Use httpx (async), never requests.
    """
    url = f"https://{shop}/admin/oauth/access_token"
    data = {
        "client_id": settings.SHOPIFY_API_KEY,
        "client_secret": settings.SHOPIFY_API_SECRET,
        "code": code,
        "expiring": "1",  # request expiring offline token
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, data=data)
            response.raise_for_status()
            result = response.json()

        access_token: str | None = result.get("access_token")
        if not access_token:
            logger.error(
                "token_exchange_failed",
                shop=shop,
                reason="no_access_token_in_response",
            )
            return None

        refresh_token: str | None = result.get("refresh_token")
        expires_in: int | None = result.get("expires_in")
        expires_at: datetime | None = None
        if expires_in is not None:
            expires_at = datetime.now(UTC) + timedelta(seconds=int(expires_in))

        logger.info(
            "token_exchange_successful",
            shop=shop,
            expiring=refresh_token is not None,
        )
        return TokenExchangeResult(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
        )

    except httpx.HTTPError as e:
        logger.error("token_exchange_http_error", shop=shop, error=str(e))
        return None
    except Exception as e:
        logger.error("token_exchange_unexpected_error", shop=shop, error=str(e))
        return None


# ─── Token refresh ────────────────────────────────────────────────────────────


async def _call_refresh_endpoint(
    shop: str,
    refresh_token: str,
) -> TokenExchangeResult | None:
    """
    POST to Shopify's token endpoint with grant_type=refresh_token.
    Returns a fresh TokenExchangeResult or None on failure.
    """
    url = f"https://{shop}/admin/oauth/access_token"
    data = {
        "client_id": settings.SHOPIFY_API_KEY,
        "client_secret": settings.SHOPIFY_API_SECRET,
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, data=data)
            response.raise_for_status()
            result = response.json()

        new_access = result.get("access_token")
        if not new_access:
            logger.error("token_refresh_failed", shop=shop, reason="no_access_token")
            return None

        new_refresh: str | None = result.get("refresh_token")
        expires_in: int | None = result.get("expires_in")
        expires_at: datetime | None = None
        if expires_in is not None:
            expires_at = datetime.now(UTC) + timedelta(seconds=int(expires_in))

        logger.info("token_refresh_successful", shop=shop)
        return TokenExchangeResult(
            access_token=new_access,
            refresh_token=new_refresh,
            expires_at=expires_at,
        )

    except httpx.HTTPError as e:
        logger.error("token_refresh_http_error", shop=shop, error=str(e))
        return None
    except Exception as e:
        logger.error("token_refresh_unexpected_error", shop=shop, error=str(e))
        return None


# ─── get_valid_access_token ───────────────────────────────────────────────────


async def get_valid_access_token(
    merchant: Merchant,
    db: AsyncSession,
) -> str:
    """
    Return a valid Shopify access token for this merchant.

    If the stored token expires within _REFRESH_BUFFER_SECONDS (5 min),
    automatically exchanges the refresh token for a fresh pair and
    persists the new tokens to the database.

    Falls back to the stored token if refresh fails so existing API
    calls are not blocked (Shopify accepts expired tokens briefly after
    expiry while the new one propagates).
    """
    now = datetime.now(UTC)

    needs_refresh = (
        merchant.access_token_expires_at is not None
        and merchant.refresh_token_encrypted is not None
        and merchant.access_token_expires_at
        <= now + timedelta(seconds=_REFRESH_BUFFER_SECONDS)
    )

    if not needs_refresh:
        return decrypt_token(merchant.access_token_encrypted)

    # Token is near expiry — refresh it silently.
    refresh_token = decrypt_token(merchant.refresh_token_encrypted)
    result = await _call_refresh_endpoint(merchant.shop_domain, refresh_token)

    if result is None:
        logger.warning(
            "token_refresh_fallback_to_existing",
            shop=merchant.shop_domain,
        )
        return decrypt_token(merchant.access_token_encrypted)

    # Persist the fresh tokens (Hard rule #2: store encrypted).
    merchant.access_token_encrypted = encrypt_token(result["access_token"])
    if result["refresh_token"]:
        merchant.refresh_token_encrypted = encrypt_token(result["refresh_token"])
    merchant.access_token_expires_at = result["expires_at"]
    await db.commit()

    return result["access_token"]


# ─── Domain validation ────────────────────────────────────────────────────────


def validate_shop_domain(shop: str) -> bool:
    """Validate that shop domain is a valid myshopify.com domain."""
    if not shop:
        return False
    if not shop.endswith(".myshopify.com"):
        return False
    if "://" in shop:
        return False
    if "/" in shop:
        return False
    parts = shop.split(".")
    if len(parts) != 3:
        return False
    return True
