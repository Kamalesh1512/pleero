"""
Merchant model - represents a Shopify store that has installed the app.
"""

import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import String, Integer, LargeBinary, Enum, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, generate_uuid


class SubscriptionStatus(PyEnum):
    """Subscription status for a merchant."""

    ACTIVE = "ACTIVE"
    CANCELLED = "CANCELLED"
    TRIAL = "TRIAL"
    EXPIRED = "EXPIRED"


class Merchant(Base, TimestampMixin):
    """
    Merchant model - one record per Shopify store installation.

    Attributes:
        id: UUID primary key
        shop_domain: Unique Shopify domain (e.g., "store.myshopify.com")
        access_token_encrypted: Fernet-encrypted Shopify access token (NEVER plain text)
        subscription_id: Shopify subscription charge ID
        subscription_status: Current subscription status
        bonus_percentage: Bonus percentage to offer (5-20%)
        bonus_cap_cents: Maximum bonus amount in cents ($50 = 5000)
        merchant_email: Contact email for the merchant
        logo_url: URL to merchant's logo (for branding emails/offer pages)
        brand_color: Hex color code for branding (default black)
        trial_ends_at: When the trial period ends
        created_at: When merchant was created (OAuth completed)
        updated_at: Last update timestamp
    """

    __tablename__ = "merchants"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )

    shop_domain: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    access_token_encrypted: Mapped[bytes] = mapped_column(
        LargeBinary,
        nullable=False,
    )

    subscription_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    subscription_status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus),
        default=SubscriptionStatus.TRIAL,
        nullable=False,
    )

    bonus_percentage: Mapped[int] = mapped_column(
        Integer,
        default=10,
        nullable=False,
    )

    bonus_cap_cents: Mapped[int] = mapped_column(
        Integer,
        default=5000,  # $50
        nullable=False,
    )

    merchant_email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    logo_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    brand_color: Mapped[str] = mapped_column(
        String(7),
        default="#000000",
        nullable=False,
    )

    shop_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    trial_ends_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
