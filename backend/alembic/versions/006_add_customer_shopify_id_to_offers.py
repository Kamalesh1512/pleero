"""add customer_shopify_id to offers

Revision ID: 006
Revises: 005
Create Date: 2026-05-25
"""

from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "offers",
        sa.Column(
            "customer_shopify_id",
            sa.String(64),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("offers", "customer_shopify_id")
