"""
Report request model.
Stores low-friction email captures from the landing page's free Store Credit
report estimator, distinct from full waitlist submissions.
"""

import uuid
from decimal import Decimal

from sqlalchemy import Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, generate_uuid


class ReportRequest(Base, TimestampMixin):
    """A request for Pleero's free Store Credit report / real numbers."""

    __tablename__ = "report_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    monthly_credit_issued: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True,
    )

    redemption_rate: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2),
        nullable=True,
    )

    source: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
