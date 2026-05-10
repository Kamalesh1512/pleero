"""
SQLAlchemy declarative base and shared mixins.
"""

import uuid
from datetime import datetime, UTC

from sqlalchemy import DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all database models."""

    pass


class TimestampMixin:
    """
    Mixin to add created_at and updated_at timestamps to models.
    Timestamps are auto-populated on insert and update.
    """

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


def generate_uuid() -> uuid.UUID:
    """Generate a new UUID for primary keys."""
    return uuid.uuid4()
