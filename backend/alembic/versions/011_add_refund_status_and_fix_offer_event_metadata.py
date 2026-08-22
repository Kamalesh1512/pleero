"""add refund_status and fix offer_events metadata column name

Revision ID: 011
Revises: 010
Create Date: 2026-08-20

Corrective migration:
1. Rename `offer_events.metadata` -> `offer_event_metadata` so the physical
   schema matches the SQLAlchemy model (initial migration 001 used `metadata`
   while the ORM resolves `offer_event_metadata` as the column name; since
   conftest builds the schema from the model, tests never exposed this in prod).
2. Add `offers.refund_status` (Refund Recovery native store-credit refund
   lifecycle) with a server default so existing rows backfill to PENDING.
"""

import sqlalchemy as sa
from alembic import op

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None

_refund_status_enum = sa.Enum(
    "PENDING",
    "CREDIT_REFUND_CREATED",
    "MANUAL_REVIEW",
    name="refundstatus",
)


def upgrade() -> None:
    # 1. offer_events: metadata -> offer_event_metadata
    op.alter_column(
        "offer_events",
        "metadata",
        new_column_name="offer_event_metadata",
        existing_type=sa.JSON(),
        existing_nullable=True,
    )

    # 2. offers: add refund_status
    _refund_status_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "offers",
        sa.Column(
            "refund_status",
            _refund_status_enum,
            nullable=False,
            server_default="PENDING",
        ),
    )


def downgrade() -> None:
    op.drop_column("offers", "refund_status")
    _refund_status_enum.drop(op.get_bind(), checkfirst=True)
    op.alter_column(
        "offer_events",
        "offer_event_metadata",
        new_column_name="metadata",
        existing_type=sa.JSON(),
        existing_nullable=True,
    )
