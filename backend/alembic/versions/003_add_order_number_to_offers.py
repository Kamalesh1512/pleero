"""add order_number to offers

Revision ID: 003
Revises: 002
Create Date: 2026-05-20

"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "003"
down_revision: str | None = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add order_number column to offers table (nullable for backwards compatibility)."""
    op.add_column(
        "offers",
        sa.Column("order_number", sa.String(64), nullable=True),
    )


def downgrade() -> None:
    """Remove order_number column from offers table."""
    op.drop_column("offers", "order_number")
