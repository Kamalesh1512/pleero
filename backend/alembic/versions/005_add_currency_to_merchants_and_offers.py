"""add currency to merchants and offers

Revision ID: 005
Revises: 004
Create Date: 2026-05-23
"""

from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "merchants",
        sa.Column(
            "currency",
            sa.String(3),
            nullable=False,
            server_default="USD",
        ),
    )
    op.add_column(
        "offers",
        sa.Column(
            "currency_code",
            sa.String(3),
            nullable=False,
            server_default="USD",
        ),
    )


def downgrade() -> None:
    op.drop_column("merchants", "currency")
    op.drop_column("offers", "currency_code")
