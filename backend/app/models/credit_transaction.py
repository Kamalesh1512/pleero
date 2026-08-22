"""
CreditTransaction model — observed Store Credit transactions from Shopify webhooks.

Records credit and debit events received via the store_credit_accounts/credit
and store_credit_accounts/debit webhooks so Pleero can track redemption
activity and compute derived intelligence metrics.

Shopify is the authoritative source for Store Credit balances. Pleero stores
only the observed event stream for analytics and attribution purposes.
"""

import uuid
from datetime import datetime, UTC
from enum import Enum as PyEnum

from sqlalchemy import String, Integer, Enum, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, generate_uuid


class TransactionType(PyEnum):
    """Direction of a Store Credit transaction."""

    CREDIT = "CREDIT"  # Credit was added (issued)
    DEBIT = "DEBIT"  # Credit was debited (redeemed / adjusted)
    EXPIRY = "EXPIRY"  # Credit expired


class TransactionSource(PyEnum):
    """
    Origin of the Store Credit transaction.

    When emitted by Pleero via the shopify service we tag it with the Pleero
    workflow name. Transactions that originate outside Pleero carry 'external'.
    """

    REFUND_RECOVERY = "refund_recovery"
    GOODWILL = "goodwill"
    WINBACK = "winback"
    REDEMPTION_REMINDER = "redemption_reminder"
    LOYALTY = "loyalty"
    MANUAL = "manual"
    EXTERNAL = "external"


class CreditTransaction(Base):
    """
    One observed Store Credit transaction from Shopify.

    Attributes:
        id: UUID primary key
        merchant_id: Foreign key to the owning merchant
        customer_email: Email address of the credit owner
        customer_shopify_id: Shopify customer GID
        transaction_type: CREDIT, DEBIT, or EXPIRY
        amount_cents: Amount in cents
        currency: ISO 4217 currency code
        source: Origin of the transaction
        offer_id: FK to the Offer that caused this transaction, when known.
            Populated for Refund Recovery via a heuristic match at webhook
            time (see routers.webhooks._match_refund_recovery_offer) —
            ATTRIBUTED, not OBSERVED, since Shopify's webhook payload
            carries no reference back to the offer that triggered it.
        shopify_transaction_id: Shopify transaction reference
        occurred_at: When the transaction occurred in Shopify
        created_at: When Pleero observed this event
    """

    __tablename__ = "credit_transactions"

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
        index=True,
    )

    customer_shopify_id: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    transaction_type: Mapped[TransactionType] = mapped_column(
        Enum(TransactionType),
        nullable=False,
    )

    amount_cents: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        default="USD",
        nullable=False,
    )

    source: Mapped[TransactionSource] = mapped_column(
        Enum(TransactionSource),
        default=TransactionSource.EXTERNAL,
        nullable=False,
    )

    offer_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("offers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    shopify_transaction_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
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
            "shopify_transaction_id",
            name="uq_merchant_shopify_txn",
        ),
    )
