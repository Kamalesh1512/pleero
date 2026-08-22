"""add offer_id to credit_transactions

Revision ID: 014
Revises: 013
Create Date: 2026-08-22

Adds a nullable offer_id FK to credit_transactions so a transaction can be
linked back to the Offer that caused it, when known. Used by the Refund
Recovery webhook-matching heuristic (routers.webhooks) to tag CreditTransaction
rows with source=REFUND_RECOVERY instead of always defaulting to EXTERNAL,
and to prevent the same offer being matched to more than one transaction.
"""

import sqlalchemy as sa
from alembic import op

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "credit_transactions",
        sa.Column("offer_id", sa.Uuid(), nullable=True),
    )
    op.create_index(
        op.f("ix_credit_transactions_offer_id"),
        "credit_transactions",
        ["offer_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_credit_transactions_offer_id_offers",
        "credit_transactions",
        "offers",
        ["offer_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_credit_transactions_offer_id_offers",
        "credit_transactions",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_credit_transactions_offer_id"), table_name="credit_transactions"
    )
    op.drop_column("credit_transactions", "offer_id")
