"""
OfferEvent model - audit trail for offer lifecycle events.
"""

import uuid
from enum import Enum as PyEnum

from sqlalchemy import Enum, ForeignKey, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime, UTC

from app.models.base import Base, generate_uuid


class EventType(PyEnum):
    """Types of events in the offer lifecycle."""

    CREATED = "CREATED"
    SENT = "SENT"
    VIEWED = "VIEWED"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    EXPIRED = "EXPIRED"
    CREDIT_ISSUED = "CREDIT_ISSUED"


class OfferEvent(Base):
    """
    Audit trail for offer events.

    Attributes:
        id: UUID primary key
        offer_id: Foreign key to the offer
        event_type: Type of event
        metadata: Additional JSON metadata (optional)
        created_at: When the event occurred
    """

    __tablename__ = "offer_events"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )

    offer_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("offers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    event_type: Mapped[EventType] = mapped_column(
        Enum(EventType),
        nullable=False,
    )

    offer_event_metadata: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
