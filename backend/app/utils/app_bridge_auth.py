"""
Shopify App Bridge session token authentication.
Verifies JWT tokens from embedded app frontend.
"""

from urllib.parse import urlparse

import jwt
from fastapi import Header, HTTPException
from typing import Annotated

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def _extract_shop_domain(dest: str) -> str | None:
    """
    Robustly extract the bare shop domain from the JWT dest claim.

    Shopify's dest is always 'https://shop.myshopify.com' but we parse it
    defensively to handle any trailing slashes or unexpected formatting.
    """
    if not dest:
        return None
    try:
        parsed = urlparse(dest)
        # Use netloc (hostname) when dest is a URL; fall back to raw value
        domain = parsed.netloc if parsed.netloc else dest
        return domain.lower().rstrip("/")
    except Exception:
        return dest.replace("https://", "").replace("http://", "").rstrip("/").lower()


def verify_session_token(token: str) -> dict[str, str]:
    """
    Verify and decode Shopify session token (JWT).

    Args:
        token: JWT token from App Bridge

    Returns:
        Dict with decoded token data (shop domain, user ID, etc.)

    Raises:
        HTTPException: If token is invalid
    """
    try:
        # Shopify uses HS256 signed with the API secret; audience is the API key (client_id)
        payload = jwt.decode(
            token,
            settings.SHOPIFY_API_SECRET,
            algorithms=["HS256"],
            audience=settings.SHOPIFY_API_KEY,
            leeway=600,
        )

        # Extract and normalize shop domain from the dest claim
        dest = payload.get("dest")
        if not dest:
            logger.error("session_token_missing_dest")
            raise HTTPException(
                status_code=401,
                detail="Invalid session token: missing dest",
            )

        shop_domain = _extract_shop_domain(dest)
        if not shop_domain:
            logger.error("session_token_invalid_dest", dest=dest)
            raise HTTPException(
                status_code=401,
                detail="Invalid session token: malformed dest",
            )

        logger.debug("session_token_verified", shop=shop_domain)

        return {
            "shop": shop_domain,
            "user_id": str(payload.get("sub", "")),
            "iss": payload.get("iss", ""),
            "exp": str(payload.get("exp", "")),
        }

    except jwt.ExpiredSignatureError:
        logger.warning("session_token_expired")
        raise HTTPException(
            status_code=401,
            detail="Session token expired",
        ) from None

    except jwt.InvalidTokenError as e:
        logger.warning("session_token_invalid", error=str(e))
        raise HTTPException(
            status_code=401,
            detail="Invalid session token",
        ) from None


async def get_current_shop(
    authorization: Annotated[str, Header()],
) -> str:
    """
    FastAPI dependency to get current shop from session token.

    Usage:
        @app.get("/api/route")
        async def route(shop: str = Depends(get_current_shop)):
            ...

    Args:
        authorization: Authorization header with Bearer token

    Returns:
        Shop domain

    Raises:
        HTTPException: If token is invalid
    """
    # Extract token from "Bearer <token>" format
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header format",
        )

    token = authorization.replace("Bearer ", "")

    # Verify and decode token
    token_data = verify_session_token(token)

    return token_data["shop"]
