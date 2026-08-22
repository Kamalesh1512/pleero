"""
AutomationConfig model — per-merchant settings for Store Credit Automation workflows.

Opinionated configuration for supported automation workflows:
- Refund Recovery (always-on for active merchants)
- Goodwill (manual issuance)
- Win-back (inactive customers)
- Redemption reminders (unredeemed credit follow-up)
"""

import uuid
from datetime import datetime, UTC
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    Integer,
    String,
    Enum,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, generate_uuid


class AutomationWorkflow(PyEnum):
    """Workflows Pleero can automate."""

    REFUND_RECOVERY = "refund_recovery"
    GOODWILL = "goodwill"
    WINBACK = "winback"
    REDEMPTION_REMINDER = "redemption_reminder"


class AutomationConfig(Base):
    """
    Per-merchant automation workflow configuration.

    One row per merchant per workflow. All workflows default to enabled
    so Pleero works out of the box.

    Attributes:
        id: UUID primary key
        merchant_id: FK to merchant
        workflow: Which workflow this config applies to
        enabled: Whether the workflow is active
        min_days_before_action: Days to wait before automation acts
            (e.g. days after credit issuance before reminder)
        max_actions_per_customer: Cap on how many times to reach out
        created_at: When configured
        updated_at: Last update
    """

    __tablename__ = "automation_config"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )

    merchant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("merchants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    workflow: Mapped[AutomationWorkflow] = mapped_column(
        Enum(AutomationWorkflow),
        nullable=False,
    )

    enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    # Days after trigger condition before automation acts
    min_days_before_action: Mapped[int] = mapped_column(
        Integer,
        default=7,
        nullable=False,
    )

    # Max automation actions per customer per workflow
    max_actions_per_customer: Mapped[int] = mapped_column(
        Integer,
        default=3,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("merchant_id", "workflow", name="uq_merchant_workflow"),
    )


class RedemptionReminder(Base):
    """
    Tracks redemption reminder emails sent to customers.

    Prevents duplicate reminders — one row per merchant per customer
    per reminder round.

    Attributes:
        id: UUID primary key
        merchant_id: FK to merchant
        customer_email: Who was reminded
        reminder_round: Which round (1, 2, 3 etc.)
        sent_at: When the reminder was sent
        offer_id: Optional link to the original offer that prompted this
    """

    __tablename__ = "redemption_reminders"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )

    merchant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("merchants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    customer_email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    reminder_round: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )

    offer_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("offers.id", ondelete="SET NULL"),
        nullable=True,
    )

    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "merchant_id",
            "customer_email",
            "reminder_round",
            name="uq_merchant_customer_round",
        ),
    )
