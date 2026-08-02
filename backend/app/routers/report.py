"""
Report request endpoints.
Public route for capturing free Store Credit report / real-numbers requests.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.logging import get_logger
from app.core.rate_limit import limiter
from app.models.report_request import ReportRequest
from app.schemas.report_request import (
    ReportRequestCreate,
    ReportRequestResponse,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/api/report-requests", tags=["report-requests"])


@router.post("")
@limiter.limit("5/minute")
async def create_report_request(
    request: Request,
    payload: ReportRequestCreate,
    db: AsyncSession = Depends(get_db),
) -> ReportRequestResponse:
    """
    Store a public request for the free Store Credit report.

    The endpoint intentionally does not require merchant authentication because
    it powers the public landing page estimator. PII is persisted in Postgres and
    not sent to analytics.
    """
    report_request = ReportRequest(
        email=payload.email,
        monthly_credit_issued=payload.monthly_credit_issued,
        redemption_rate=payload.redemption_rate,
        source=payload.source,
    )
    db.add(report_request)
    await db.commit()

    logger.info(
        "report_request_created",
        report_request_id=str(report_request.id),
        source=report_request.source,
    )

    return ReportRequestResponse(
        status="success",
        message="We'll email you when your real numbers are ready.",
    )
