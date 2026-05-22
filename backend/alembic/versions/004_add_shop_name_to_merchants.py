"""add shop_name to merchants

Revision ID: 004
Revises: 003
Create Date: 2026-05-21
"""

from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "merchants",
        sa.Column("shop_name", sa.String(255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("merchants", "shop_name")
