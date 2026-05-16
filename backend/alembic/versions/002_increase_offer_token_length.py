"""increase offer token length for cryptographic security

Revision ID: 002
Revises: 001
Create Date: 2025-01-16

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Increase offer_token column length from 36 to 48 characters."""
    # Alter column length for offer_token
    op.alter_column(
        'offers',
        'offer_token',
        type_=sa.String(48),
        existing_type=sa.String(36),
        existing_nullable=False,
    )


def downgrade() -> None:
    """Revert offer_token column length back to 36 characters."""
    op.alter_column(
        'offers',
        'offer_token',
        type_=sa.String(36),
        existing_type=sa.String(48),
        existing_nullable=False,
    )
