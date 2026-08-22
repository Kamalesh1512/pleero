"""
Celery tasks for email delivery.

Email is delivered off the webhook request path so Shopify's 5-second timeout
is never consumed by upstream SMTP latency. Send failures retry with
exponential backoff instead of being silently dropped.
"""

import asyncio
from uuid import UUID

from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.core.logging import get_logger
from app.services.email import send_manual_review_alert_email, send_offer_email

logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    max_retries=5,
    default_retry_delay=60,
    retry_backoff=True,
    autoretry_for=(),
)
def send_offer_email_task(self, offer_id: str) -> bool:
    """Send the offer email for an offer (async send, sync wrapper)."""

    async def _send() -> bool:
        async with AsyncSessionLocal() as db:
            return await send_offer_email(db, UUID(offer_id))

    try:
        sent = asyncio.run(_send())
    except Exception as exc:
        logger.error(
            "email_task_exception",
            offer_id=offer_id,
            error=str(exc),
            exc_info=True,
        )
        raise self.retry(exc=exc) from exc

    if not sent:
        logger.warning("email_task_send_failed_retrying", offer_id=offer_id)
        raise self.retry()

    logger.info("email_task_sent", offer_id=offer_id)
    return True


@celery_app.task(
    bind=True,
    max_retries=5,
    default_retry_delay=60,
    retry_backoff=True,
    autoretry_for=(),
)
def send_manual_review_alert_email_task(self, offer_id: str) -> bool:
    """Notify the merchant that an offer needs manual review (async send, sync wrapper)."""

    async def _send() -> bool:
        async with AsyncSessionLocal() as db:
            return await send_manual_review_alert_email(db, UUID(offer_id))

    try:
        sent = asyncio.run(_send())
    except Exception as exc:
        logger.error(
            "manual_review_alert_task_exception",
            offer_id=offer_id,
            error=str(exc),
            exc_info=True,
        )
        raise self.retry(exc=exc) from exc

    if not sent:
        logger.warning(
            "manual_review_alert_task_send_failed_retrying", offer_id=offer_id
        )
        raise self.retry()

    logger.info("manual_review_alert_task_sent", offer_id=offer_id)
    return True
