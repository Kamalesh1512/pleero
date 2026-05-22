"""
Offer model - represents a store credit offer sent to a customer.
"""

import secrets
import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import String, Integer, Enum, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, generate_uuid


def generate_secure_offer_token() -> str:
    """
    Generate cryptographically secure offer token.
    Uses secrets module for 256-bit entropy.
    Returns URL-safe base64-encoded string.
    """
    return secrets.token_urlsafe(32)  # 32 bytes = 256 bits of entropy


class OfferStatus(PyEnum):
    """Status of an offer."""

    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    EXPIRED = "EXPIRED"


class Offer(Base, TimestampMixin):
    """
    Offer model - one record per refund that gets an offer.

    Attributes:
        id: UUID primary key
        merchant_id: Foreign key to merchant who owns this offer
        shopify_refund_id: Shopify refund ID (from webhook)
        shopify_order_id: Shopify order ID (from webhook)
        customer_email: Customer's email address
        customer_first_name: Customer's first name
        refund_amount_cents: Original refund amount in cents
        credit_amount_cents: Credit amount with bonus in cents
        bonus_applied_cents: Bonus amount (difference between credit and refund)
        offer_token: UUID token for public URL (unique, indexed)
        status: Current status of the offer
        sent_at: When the offer email was sent
        accepted_at: When the customer accepted the offer
        declined_at: When the customer declined the offer
        expired_at: When the offer expired
        created_at: When offer was created (webhook received)
        updated_at: Last update timestamp
    """

    __tablename__ = "offers"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )

    merchant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("merchants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    shopify_refund_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    shopify_order_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    order_number: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    customer_email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    customer_first_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # Shopify GID stored from webhook payload — avoids protected customers query at accept time
    # Format: "gid://shopify/Customer/12345678"
    customer_shopify_id: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    refund_amount_cents: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    credit_amount_cents: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    bonus_applied_cents: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    offer_token: Mapped[str] = mapped_column(
        String(48),  # URL-safe base64 encoded 32 bytes (~43 chars + padding)
        unique=True,
        index=True,
        nullable=False,
        default=generate_secure_offer_token,
    )

    status: Mapped[OfferStatus] = mapped_column(
        Enum(OfferStatus),
        default=OfferStatus.PENDING,
        nullable=False,
    )

    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    declined_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    expired_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    __table_args__ = (
        UniqueConstraint("merchant_id", "shopify_refund_id", name="uq_merchant_refund"),
    )
