"""
Waitlist submission model.
Stores early access and customer discovery responses from the public landing page.
"""

import uuid

from sqlalchemy import JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, generate_uuid


class WaitlistSubmission(Base, TimestampMixin):
    """Early access waitlist submission."""

    __tablename__ = "waitlist_submissions"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    store_url: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    business_category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    monthly_orders: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    current_use_cases: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
    )

    biggest_pain: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    open_response: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    valuable_capability: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    interview_willingness: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("email", name="uq_waitlist_submissions_email"),
        UniqueConstraint("store_url", name="uq_waitlist_submissions_store_url"),
    )
