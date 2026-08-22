"""add credit_transactions table for store credit intelligence

Revision ID: 012
Revises: 011
Create Date: 2026-08-21

Creates the credit_transactions table to store observed Store Credit
debit/credit/expiry events from Shopify webhooks, enabling analytics
metrics like redemption rate, outstanding credit, and time-to-redeem.
"""

import sqlalchemy as sa
from alembic import op

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None

_transaction_type_enum = sa.Enum(
    "CREDIT",
    "DEBIT",
    "EXPIRY",
    name="transactiontype",
)

_transaction_source_enum = sa.Enum(
    "REFUND_RECOVERY",
    "GOODWILL",
    "WINBACK",
    "REDEMPTION_REMINDER",
    "LOYALTY",
    "MANUAL",
    "EXTERNAL",
    name="transactionsource",
)


def upgrade() -> None:
    # No standalone .create() here: op.create_table() below auto-creates
    # these enum types as part of creating the table's own columns. Also
    # calling .create() first causes a DuplicateObjectError on a fresh
    # database, since the table-create path doesn't check for that.
    op.create_table(
        "credit_transactions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "merchant_id",
            sa.Uuid(),
            sa.ForeignKey("merchants.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("customer_email", sa.String(255), nullable=False, index=True),
        sa.Column("customer_shopify_id", sa.String(64), nullable=True),
        sa.Column(
            "transaction_type",
            _transaction_type_enum,
            nullable=False,
        ),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column(
            "source",
            _transaction_source_enum,
            nullable=False,
            server_default="EXTERNAL",
        ),
        sa.Column("shopify_transaction_id", sa.String(255), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "merchant_id",
            "shopify_transaction_id",
            name="uq_merchant_shopify_txn",
        ),
    )


def downgrade() -> None:
    op.drop_table("credit_transactions")
    _transaction_source_enum.drop(op.get_bind(), checkfirst=True)
    _transaction_type_enum.drop(op.get_bind(), checkfirst=True)
