"""rename waitlist current_use_cases to credit_sources

Revision ID: 009
Revises: 008
Create Date: 2026-08-02
"""

from alembic import op

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "waitlist_submissions",
        "current_use_cases",
        new_column_name="credit_sources",
    )


def downgrade() -> None:
    op.alter_column(
        "waitlist_submissions",
        "credit_sources",
        new_column_name="current_use_cases",
    )
