"""add refresh_token and access_token_expires_at to merchants

Shopify now requires expiring offline tokens for public apps (April 2026).
These columns store the refresh token (90-day lifetime) and the expiry
timestamp of the current access token (1-hour lifetime) so the backend
can silently rotate tokens without requiring merchant reinstallation.

Revision ID: 007
Revises: 006
Create Date: 2026-05-28
"""

from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "merchants",
        sa.Column("refresh_token_encrypted", sa.LargeBinary(), nullable=True),
    )
    op.add_column(
        "merchants",
        sa.Column(
            "access_token_expires_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("merchants", "access_token_expires_at")
    op.drop_column("merchants", "refresh_token_encrypted")
