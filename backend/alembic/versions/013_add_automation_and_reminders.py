"""add automation_config and redemption_reminders tables

Revision ID: 013
Revises: 012
Create Date: 2026-08-21

Adds opinionated automation workflow support:
- automation_config: per-merchant settings for each workflow
- redemption_reminders: tracks sent reminders to prevent duplicates
"""

import sqlalchemy as sa
from alembic import op

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None

_workflow_enum = sa.Enum(
    "REFUND_RECOVERY",
    "GOODWILL",
    "WINBACK",
    "REDEMPTION_REMINDER",
    name="automationworkflow",
)


def upgrade() -> None:
    # No standalone .create() here: op.create_table() below auto-creates
    # this enum type as part of creating automation_config's own "workflow"
    # column. Also calling .create() first causes a DuplicateObjectError on
    # a fresh database, since the table-create path doesn't check for that.
    op.create_table(
        "automation_config",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "merchant_id",
            sa.Uuid(),
            sa.ForeignKey("merchants.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("workflow", _workflow_enum, nullable=False),
        sa.Column(
            "enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")
        ),
        sa.Column(
            "min_days_before_action",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("7"),
        ),
        sa.Column(
            "max_actions_per_customer",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("3"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("merchant_id", "workflow", name="uq_merchant_workflow"),
    )

    op.create_table(
        "redemption_reminders",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "merchant_id",
            sa.Uuid(),
            sa.ForeignKey("merchants.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("customer_email", sa.String(255), nullable=False),
        sa.Column(
            "reminder_round", sa.Integer(), nullable=False, server_default=sa.text("1")
        ),
        sa.Column(
            "offer_id",
            sa.Uuid(),
            sa.ForeignKey("offers.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "sent_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "merchant_id",
            "customer_email",
            "reminder_round",
            name="uq_merchant_customer_round",
        ),
    )


def downgrade() -> None:
    op.drop_table("redemption_reminders")
    op.drop_table("automation_config")
    _workflow_enum.drop(op.get_bind(), checkfirst=True)
