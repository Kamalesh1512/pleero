"""
Waitlist endpoints.
Public route for early access and customer discovery submissions.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.logging import get_logger
from app.core.rate_limit import limiter
from app.models.waitlist_submission import WaitlistSubmission
from app.schemas.waitlist import (
    WaitlistSubmissionCreate,
    WaitlistSubmissionResponse,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/api/waitlist", tags=["waitlist"])


@router.post("")
@limiter.limit("5/minute")
async def create_waitlist_submission(
    request: Request,
    payload: WaitlistSubmissionCreate,
    db: AsyncSession = Depends(get_db),
) -> WaitlistSubmissionResponse:
    """
    Store a public waitlist submission.

    The endpoint intentionally does not require merchant authentication because it
    powers the public landing page. PII is persisted in Postgres and not sent to
    analytics.
    """
    existing = await db.execute(
        select(WaitlistSubmission.id).where(
            or_(
                WaitlistSubmission.email == payload.email,
                WaitlistSubmission.store_url == payload.store_url,
            )
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409,
            detail="This email or store URL is already on the waitlist.",
        )

    submission = WaitlistSubmission(
        email=payload.email,
        store_url=payload.store_url,
        business_category=payload.business_category,
        monthly_orders=payload.monthly_orders,
        credit_sources=payload.credit_sources,
        biggest_pain=payload.biggest_pain,
        open_response=payload.open_response,
        valuable_capability=payload.valuable_capability,
        interview_willingness=payload.interview_willingness,
    )
    db.add(submission)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This email or store URL is already on the waitlist.",
        ) from exc

    logger.info(
        "waitlist_submission_created",
        submission_id=str(submission.id),
        business_category=submission.business_category,
        monthly_orders=submission.monthly_orders,
        biggest_pain=submission.biggest_pain,
        valuable_capability=submission.valuable_capability,
        interview_willingness=submission.interview_willingness,
    )

    return WaitlistSubmissionResponse(
        status="success",
        message="You're on the early access waitlist.",
    )
