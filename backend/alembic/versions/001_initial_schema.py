"""initial schema

Revision ID: 001
Revises:
Create Date: 2025-05-06 00:00:00.000000

"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Create merchants table
    op.create_table(
        "merchants",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("shop_domain", sa.String(length=255), nullable=False),
        sa.Column("access_token_encrypted", sa.LargeBinary(), nullable=False),
        sa.Column("subscription_id", sa.String(length=255), nullable=True),
        sa.Column(
            "subscription_status",
            sa.Enum(
                "ACTIVE", "CANCELLED", "TRIAL", "EXPIRED", name="subscriptionstatus"
            ),
            nullable=False,
        ),
        sa.Column("bonus_percentage", sa.Integer(), nullable=False),
        sa.Column("bonus_cap_cents", sa.Integer(), nullable=False),
        sa.Column("merchant_email", sa.String(length=255), nullable=False),
        sa.Column("logo_url", sa.String(length=500), nullable=True),
        sa.Column("brand_color", sa.String(length=7), nullable=False),
        sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_merchants_shop_domain"), "merchants", ["shop_domain"], unique=True
    )

    # Create offers table
    op.create_table(
        "offers",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("merchant_id", sa.UUID(), nullable=False),
        sa.Column("shopify_refund_id", sa.String(length=255), nullable=False),
        sa.Column("shopify_order_id", sa.String(length=255), nullable=False),
        sa.Column("customer_email", sa.String(length=255), nullable=False),
        sa.Column("customer_first_name", sa.String(length=255), nullable=False),
        sa.Column("refund_amount_cents", sa.Integer(), nullable=False),
        sa.Column("credit_amount_cents", sa.Integer(), nullable=False),
        sa.Column("bonus_applied_cents", sa.Integer(), nullable=False),
        sa.Column("offer_token", sa.String(length=36), nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "ACCEPTED", "DECLINED", "EXPIRED", name="offerstatus"),
            nullable=False,
        ),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("declined_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expired_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["merchant_id"], ["merchants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "merchant_id", "shopify_refund_id", name="uq_merchant_refund"
        ),
    )
    op.create_index(
        op.f("ix_offers_merchant_id"), "offers", ["merchant_id"], unique=False
    )
    op.create_index(
        op.f("ix_offers_offer_token"), "offers", ["offer_token"], unique=True
    )
    op.create_index(
        op.f("ix_offers_shopify_order_id"), "offers", ["shopify_order_id"], unique=False
    )
    op.create_index(
        op.f("ix_offers_shopify_refund_id"),
        "offers",
        ["shopify_refund_id"],
        unique=False,
    )

    # Create offer_events table
    op.create_table(
        "offer_events",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("offer_id", sa.UUID(), nullable=False),
        sa.Column(
            "event_type",
            sa.Enum(
                "CREATED",
                "SENT",
                "VIEWED",
                "ACCEPTED",
                "DECLINED",
                "EXPIRED",
                "CREDIT_ISSUED",
                name="eventtype",
            ),
            nullable=False,
        ),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["offer_id"], ["offers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_offer_events_offer_id"), "offer_events", ["offer_id"], unique=False
    )


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index(op.f("ix_offer_events_offer_id"), table_name="offer_events")
    op.drop_table("offer_events")

    op.drop_index(op.f("ix_offers_shopify_refund_id"), table_name="offers")
    op.drop_index(op.f("ix_offers_shopify_order_id"), table_name="offers")
    op.drop_index(op.f("ix_offers_offer_token"), table_name="offers")
    op.drop_index(op.f("ix_offers_merchant_id"), table_name="offers")
    op.drop_table("offers")

    op.drop_index(op.f("ix_merchants_shop_domain"), table_name="merchants")
    op.drop_table("merchants")

    # Drop enums
    op.execute("DROP TYPE IF EXISTS eventtype")
    op.execute("DROP TYPE IF EXISTS offerstatus")
    op.execute("DROP TYPE IF EXISTS subscriptionstatus")
