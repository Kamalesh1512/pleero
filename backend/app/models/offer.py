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


class RefundStatus(PyEnum):
    """
    State of the refund that backs a Refund Recovery offer.

    Shopify cannot reverse an already-processed cash refund. Refund Recovery
    therefore issues the refund as a native store-credit refund (refundCreate
    + storeCreditRefund method) at accept time.

    * PENDING                 — offer created, no refund action taken yet.
    * CREDIT_REFUND_CREATED   — accept created a native store-credit refund.
    * MANUAL_REVIEW           — credit refund could not be created safely
                                (e.g. a cash refund was already captured, or
                                Shopify refused); surfaced to the merchant for
                                manual handling. The offer stays PENDING so no
                                credit is silently issued on top of a refund.
    """

    PENDING = "PENDING"
    CREDIT_REFUND_CREATED = "CREDIT_REFUND_CREATED"
    MANUAL_REVIEW = "MANUAL_REVIEW"


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

    currency_code: Mapped[str] = mapped_column(
        String(3),
        default="USD",
        nullable=False,
        server_default="USD",
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

    # State of the backing refund for Refund Recovery (native store-credit refund).
    refund_status: Mapped[RefundStatus] = mapped_column(
        Enum(RefundStatus),
        default=RefundStatus.PENDING,
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
