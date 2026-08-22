"""
Celery scheduled tasks for offer lifecycle maintenance.

Daily sweep is the authoritative expiry enforcement; the lazy check in the
offer router covers on-access expiry in between slices.
"""

import asyncio
from datetime import datetime, UTC, timedelta

from sqlalchemy import select

from app.core.celery_app import celery_app
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.logging import get_logger
from app.models.offer import Offer, OfferStatus
from app.models.offer_event import OfferEvent, EventType

logger = get_logger(__name__)


@celery_app.task
def expire_stale_offers() -> int:
    """Expire all PENDING offers older than OFFER_EXPIRY_DAYS."""

    async def _run() -> int:
        cutoff = datetime.now(UTC) - timedelta(days=settings.OFFER_EXPIRY_DAYS)
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Offer).where(
                    Offer.status == OfferStatus.PENDING,
                    Offer.created_at < cutoff,
                )
            )
            offers = result.scalars().all()
            expired_count = 0
            for offer in offers:
                offer.status = OfferStatus.EXPIRED
                offer.expired_at = datetime.now(UTC)
                db.add(
                    OfferEvent(
                        offer_id=offer.id,
                        event_type=EventType.EXPIRED,
                        offer_event_metadata={"reason": "scheduled_sweep"},
                    )
                )
                expired_count += 1
            await db.commit()
            return expired_count

    count = asyncio.run(_run())
    logger.info("offer_expiry_sweep_done", expired_count=count)
    return count
