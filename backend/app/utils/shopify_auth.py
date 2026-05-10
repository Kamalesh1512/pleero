"""
Shopify OAuth utilities.
Handles OAuth flow, HMAC verification, and token exchange.
"""

import hmac
import hashlib
from urllib.parse import urlencode
from typing import Any

import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def verify_hmac(query_params: dict[str, Any], secret: str) -> bool:
    """
    Verify HMAC signature for OAuth callback.

    Args:
        query_params: Query parameters from OAuth callback
        secret: Shopify API secret

    Returns:
        True if HMAC is valid, False otherwise

    Critical: Hard rule #1 - Always verify HMAC
    """
    # Extract hmac from params
    hmac_to_verify = query_params.get("hmac", "")
    if not hmac_to_verify:
        logger.warning("hmac_verification_failed", reason="missing_hmac")
        return False

    # Create a copy without hmac for verification
    params_copy = {k: v for k, v in query_params.items() if k != "hmac"}

    # Sort and encode parameters
    encoded_params = urlencode(sorted(params_copy.items()))

    # Compute HMAC
    computed_hmac = hmac.new(
        secret.encode("utf-8"), encoded_params.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    # Constant-time comparison
    is_valid = hmac.compare_digest(computed_hmac, hmac_to_verify)

    if not is_valid:
        logger.warning(
            "hmac_verification_failed",
            reason="mismatch",
            shop=query_params.get("shop"),
        )

    return is_valid


def build_auth_url(
    shop: str,
    scopes: list[str],
    redirect_uri: str,
    state: str,
) -> str:
    """
    Build Shopify OAuth authorization URL.

    Args:
        shop: Shop domain (e.g., "store.myshopify.com")
        scopes: List of OAuth scopes
        redirect_uri: OAuth callback URL
        state: CSRF state token

    Returns:
        Full OAuth authorization URL
    """
    params = {
        "client_id": settings.SHOPIFY_API_KEY,
        "scope": ",".join(scopes),
        "redirect_uri": redirect_uri,
        "state": state,
    }

    auth_url = f"https://{shop}/admin/oauth/authorize?{urlencode(params)}"

    logger.info(
        "oauth_url_generated",
        shop=shop,
        scopes=scopes,
    )

    return auth_url


async def exchange_code_for_token(shop: str, code: str) -> str | None:
    """
    Exchange OAuth authorization code for access token.

    Args:
        shop: Shop domain
        code: Authorization code from OAuth callback

    Returns:
        Access token if successful, None otherwise

    Hard rule #4: Use httpx (async), never requests (blocking)
    """
    url = f"https://{shop}/admin/oauth/access_token"

    data = {
        "client_id": settings.SHOPIFY_API_KEY,
        "client_secret": settings.SHOPIFY_API_SECRET,
        "code": code,
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=data, timeout=10.0)
            response.raise_for_status()

            result = response.json()
            access_token = result.get("access_token")

            if not access_token:
                logger.error(
                    "token_exchange_failed",
                    shop=shop,
                    reason="no_access_token_in_response",
                )
                return None

            logger.info(
                "token_exchange_successful",
                shop=shop,
            )

            return access_token

    except httpx.HTTPError as e:
        logger.error(
            "token_exchange_http_error",
            shop=shop,
            error=str(e),
        )
        return None
    except Exception as e:
        logger.error(
            "token_exchange_unexpected_error",
            shop=shop,
            error=str(e),
        )
        return None


def validate_shop_domain(shop: str) -> bool:
    """
    Validate that shop domain is a valid myshopify.com domain.

    Args:
        shop: Shop domain to validate

    Returns:
        True if valid, False otherwise
    """
    if not shop:
        return False

    # Must end with .myshopify.com
    if not shop.endswith(".myshopify.com"):
        return False

    # Must not contain protocol
    if "://" in shop:
        return False

    # Must not contain path
    if "/" in shop:
        return False

    # Basic format check: [store-name].myshopify.com
    parts = shop.split(".")
    if len(parts) != 3:
        return False

    return True
