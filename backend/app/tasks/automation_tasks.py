"""
Celery tasks for Store Credit Automation workflows.

Scheduled sweeps:
- redemption_reminder_sweep — daily check + send reminders for unredeemed credit
- winback_evaluation_sweep — daily identification of inactive customers

All sweeps iterate over merchants with ACTIVE or TRIAL subscription and
automation workflows enabled.
"""

import asyncio

from sqlalchemy import select

from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.core.logging import get_logger
from app.models.automation import AutomationConfig, AutomationWorkflow
from app.models.merchant import Merchant, SubscriptionStatus

logger = get_logger(__name__)


async def _get_active_merchant_ids() -> list[str]:
    """Return IDs of merchants with feature access (ACTIVE / TRIAL)."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Merchant.id).where(
                Merchant.subscription_status.in_(
                    [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]
                )
            )
        )
        return [str(row[0]) for row in result.fetchall()]


async def _is_workflow_enabled(
    merchant_id: str,
    workflow: AutomationWorkflow,
) -> bool:
    """Check if the given workflow is enabled for this merchant."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AutomationConfig).where(
                AutomationConfig.merchant_id == merchant_id,
                AutomationConfig.workflow == workflow,
                AutomationConfig.enabled,
            )
        )
        return result.scalar_one_or_none() is not None


# ─── Redemption reminder sweep (daily) ────────────────────────────────────────


@celery_app.task
def redemption_reminder_sweep() -> int:
    """
    Daily sweep: send redemption reminders to customers with unredeemed
    Store Credit, for merchants who have the workflow enabled.

    Returns total reminders sent across all merchants.
    """
    from app.services.automation import run_reminder_sweep

    async def _run() -> int:
        merchant_ids = await _get_active_merchant_ids()
        total = 0

        for mid in merchant_ids:
            if not await _is_workflow_enabled(
                mid, AutomationWorkflow.REDEMPTION_REMINDER
            ):
                continue

            async with AsyncSessionLocal() as db:
                try:
                    count = await run_reminder_sweep(UUID(mid), db)
                    total += count
                except Exception as exc:
                    logger.error(
                        "reminder_sweep_merchant_error",
                        merchant_id=mid,
                        error=str(exc),
                        exc_info=True,
                    )

        return total

    from uuid import UUID

    total_sent = asyncio.run(_run())
    logger.info("redemption_reminder_sweep_done", sent=total_sent)
    return total_sent


# ─── Win-back evaluation sweep (daily) ────────────────────────────────────────


@celery_app.task
def winback_evaluation_sweep() -> int:
    """
    Daily sweep: identify win-back candidates and log them.

    Phase 3 discovery — identifies inactive customers for merchant review.
    Actual automated win-back credit issuance comes in a future iteration.
    """
    from app.services.automation import find_winback_candidates

    async def _run() -> int:
        merchant_ids = await _get_active_merchant_ids()
        total_candidates = 0

        for mid in merchant_ids:
            if not await _is_workflow_enabled(mid, AutomationWorkflow.WINBACK):
                continue

            async with AsyncSessionLocal() as db:
                try:
                    candidates = await find_winback_candidates(UUID(mid), db)
                    if candidates:
                        logger.info(
                            "winback_candidates_found",
                            merchant_id=mid,
                            count=len(candidates),
                        )
                    total_candidates += len(candidates)
                except Exception as exc:
                    logger.error(
                        "winback_evaluation_error",
                        merchant_id=mid,
                        error=str(exc),
                        exc_info=True,
                    )

        return total_candidates

    from uuid import UUID

    total = asyncio.run(_run())
    logger.info("winback_evaluation_sweep_done", candidates=total)
    return total
