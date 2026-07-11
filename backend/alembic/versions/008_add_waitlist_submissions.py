"""add waitlist submissions

Revision ID: 008
Revises: 007
Create Date: 2026-07-11
"""

from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "waitlist_submissions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("store_url", sa.String(length=255), nullable=False),
        sa.Column("business_category", sa.String(length=100), nullable=False),
        sa.Column("monthly_orders", sa.String(length=50), nullable=False),
        sa.Column("current_use_cases", sa.JSON(), nullable=False),
        sa.Column("biggest_pain", sa.String(length=150), nullable=False),
        sa.Column("open_response", sa.Text(), nullable=False),
        sa.Column("valuable_capability", sa.String(length=150), nullable=False),
        sa.Column("interview_willingness", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_waitlist_submissions_email"),
        sa.UniqueConstraint("store_url", name="uq_waitlist_submissions_store_url"),
    )
    op.create_index(
        op.f("ix_waitlist_submissions_email"),
        "waitlist_submissions",
        ["email"],
        unique=False,
    )
    op.create_index(
        op.f("ix_waitlist_submissions_store_url"),
        "waitlist_submissions",
        ["store_url"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_waitlist_submissions_store_url"),
        table_name="waitlist_submissions",
    )
    op.drop_index(
        op.f("ix_waitlist_submissions_email"),
        table_name="waitlist_submissions",
    )
    op.drop_table("waitlist_submissions")
