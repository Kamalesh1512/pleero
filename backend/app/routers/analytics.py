"""
Analytics API endpoints — Store Credit Intelligence.

All endpoints require App Bridge session authentication and return
metrics with documented attribution methodology so the merchant knows
what Pleero _observed_ vs. _attributed_.
"""

import csv
import io
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.logging import get_logger
from app.models.merchant import Merchant
from app.schemas.analytics import (
    AutomationPerformance,
    CreditSourceBreakdown,
    RefundRecoveryFunnel,
    StoreCreditOverview,
    TimeSeriesResponse,
)
from app.services.analytics import (
    get_automation_performance,
    get_credit_source_breakdown,
    get_csv_export,
    get_refund_recovery_funnel,
    get_store_credit_overview,
    get_time_series,
)
from app.utils.session_auth import get_current_shop

logger = get_logger(__name__)
router = APIRouter(prefix="/api/analytics", tags=["analytics"])


async def _load_merchant(shop: str, db: AsyncSession) -> Merchant:
    """Load merchant or raise 404."""
    result = await db.execute(select(Merchant).where(Merchant.shop_domain == shop))
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return merchant


# ─── Store Credit Overview ────────────────────────────────────────────────────


@router.get("/overview", response_model=StoreCreditOverview)
async def analytics_overview(
    shop: str = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db),
    period_days: Annotated[int, Query(ge=1, le=365)] = 30,
) -> StoreCreditOverview:
    """
    Top-level Store Credit health metrics.

    Returns observed and attributed metrics for Store Credit issuance,
    redemption, outstanding balance, and revenue influence over the
    requested period.
    """
    merchant = await _load_merchant(shop, db)
    return await get_store_credit_overview(
        str(merchant.id), db, period_days=period_days
    )


# ─── Time series ──────────────────────────────────────────────────────────────


@router.get("/timeseries", response_model=TimeSeriesResponse)
async def analytics_timeseries(
    shop: str = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db),
    period_days: Annotated[int, Query(ge=7, le=365)] = 30,
) -> TimeSeriesResponse:
    """Daily time-series data for the requested window (7, 30, or 90 days)."""
    merchant = await _load_merchant(shop, db)
    return await get_time_series(str(merchant.id), db, period_days=period_days)


# ─── Credit source breakdown ──────────────────────────────────────────────────


@router.get("/sources", response_model=CreditSourceBreakdown)
async def analytics_sources(
    shop: str = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db),
    period_days: Annotated[int, Query(ge=1, le=365)] = 30,
) -> CreditSourceBreakdown:
    """Breakdown of issued Store Credit by source type."""
    merchant = await _load_merchant(shop, db)
    return await get_credit_source_breakdown(
        str(merchant.id), db, period_days=period_days
    )


# ─── Refund Recovery funnel ────────────────────────────────────────────────────


@router.get("/funnel", response_model=RefundRecoveryFunnel)
async def analytics_funnel(
    shop: str = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db),
    period_days: Annotated[int, Query(ge=1, le=365)] = 30,
) -> RefundRecoveryFunnel:
    """
    Refund Recovery funnel metrics.

    Tracks customers from eligible refund → offer sent → offer viewed →
    offer accepted → credit issued → credit redeemed.
    """
    merchant = await _load_merchant(shop, db)
    return await get_refund_recovery_funnel(
        str(merchant.id), db, period_days=period_days
    )


# ─── Automation performance ────────────────────────────────────────────────────


@router.get("/automation", response_model=AutomationPerformance)
async def analytics_automation_performance(
    shop: str = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db),
    period_days: Annotated[int, Query(ge=1, le=365)] = 30,
) -> AutomationPerformance:
    """
    Performance breakdown across Store Credit Automation workflows.

    Executions and credit issued are observed directly; redemption/outcome
    figures are estimated (see AutomationWorkflowPerformance) since Shopify
    Store Credit balances are fungible across sources.
    """
    merchant = await _load_merchant(shop, db)
    return await get_automation_performance(
        str(merchant.id), db, period_days=period_days
    )


# ─── CSV export ────────────────────────────────────────────────────────────────


@router.get("/export")
async def analytics_csv_export(
    shop: str = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """
    CSV export of full offer lifecycle data.

    Returns a CSV with one row per offer, including customer, order,
    amount, status, and lifecycle timestamps.
    """
    merchant = await _load_merchant(shop, db)
    rows = await get_csv_export(str(merchant.id), db)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "offer_id",
            "order_number",
            "customer_email",
            "refund_amount_cents",
            "credit_amount_cents",
            "bonus_applied_cents",
            "status",
            "refund_status",
            "created_at",
            "accepted_at",
            "viewed_at",
            "declined_at",
            "expired_at",
            "redeemed_cents",
        ]
    )
    for row in rows:
        writer.writerow(
            [
                row.offer_id,
                row.order_number,
                row.customer_email,
                row.refund_amount_cents,
                row.credit_amount_cents,
                row.bonus_applied_cents,
                row.status,
                row.refund_status,
                row.created_at.isoformat() if row.created_at else "",
                row.accepted_at.isoformat() if row.accepted_at else "",
                row.viewed_at.isoformat() if row.viewed_at else "",
                row.declined_at.isoformat() if row.declined_at else "",
                row.expired_at.isoformat() if row.expired_at else "",
                row.redeemed_cents if row.redeemed_cents is not None else "",
            ]
        )

    logger.info("analytics_csv_exported", merchant_id=str(merchant.id), rows=len(rows))
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=pleero_export.csv"},
    )
