"""add report requests

Revision ID: 010
Revises: 009
Create Date: 2026-08-02
"""

from alembic import op
import sqlalchemy as sa

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "report_requests",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("monthly_credit_issued", sa.Numeric(12, 2), nullable=True),
        sa.Column("redemption_rate", sa.Numeric(5, 2), nullable=True),
        sa.Column("source", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_report_requests_email"),
        "report_requests",
        ["email"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_report_requests_email"),
        table_name="report_requests",
    )
    op.drop_table("report_requests")
