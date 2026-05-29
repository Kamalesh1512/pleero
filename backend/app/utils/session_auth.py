"""
Cookie-based session authentication.

Replaces App Bridge JWT session tokens with a Redis-backed Pleero session cookie.
One session per shop; reinstall or logout revokes the old session immediately.
"""

import secrets
from typing import Annotated

import redis.asyncio as aioredis
from fastapi import Cookie, HTTPException

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

COOKIE_NAME = "pleero_session"
SESSION_TTL = 30 * 24 * 60 * 60  # 30 days

_redis: aioredis.Redis | None = None


def _get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


async def create_session(shop: str) -> str:
    """
    Create a new session for a shop, invalidate any prior session, and return
    the new session ID.  Stores two Redis keys:
      session:{id}      → shop domain  (looked up on every authenticated request)
      shop_session:{shop} → session id (used by revoke to find the key to delete)
    """
    r = _get_redis()

    # Revoke the previous session for this shop (reinstall / re-auth)
    old_id = await r.get(f"shop_session:{shop}")
    if old_id:
        await r.delete(f"session:{old_id}")

    session_id = secrets.token_urlsafe(32)
    await r.setex(f"session:{session_id}", SESSION_TTL, shop)
    await r.setex(f"shop_session:{shop}", SESSION_TTL, session_id)

    logger.info("session_created", shop=shop)
    return session_id


async def revoke_session_for_shop(shop: str) -> None:
    """Delete the session for a shop — called on app/uninstalled webhook."""
    r = _get_redis()
    session_id = await r.get(f"shop_session:{shop}")
    if session_id:
        await r.delete(f"session:{session_id}")
    await r.delete(f"shop_session:{shop}")
    logger.info("session_revoked", shop=shop)


async def get_current_shop(
    pleero_session: Annotated[str | None, Cookie()] = None,
) -> str:
    """
    FastAPI dependency: resolve the authenticated shop from the session cookie.

    Usage:
        @router.get("/api/some-route")
        async def route(shop: str = Depends(get_current_shop)):
            ...
    """
    if not pleero_session:
        raise HTTPException(status_code=401, detail="Not authenticated")

    shop = await _get_redis().get(f"session:{pleero_session}")
    if not shop:
        raise HTTPException(status_code=401, detail="Session expired or invalid")

    return shop
