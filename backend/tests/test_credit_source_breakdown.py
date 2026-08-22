"""
Tests for get_credit_source_breakdown (app/services/analytics.py).

Covers the three sources it now reports: refund_recovery (from Offer),
goodwill and winback (from CreditTransaction, tagged at issuance time).
"""

from datetime import UTC, datetime, timedelta

from app.models.credit_transaction import (
    CreditTransaction,
    TransactionSource,
    TransactionType,
)
from app.models.merchant import Merchant, SubscriptionStatus
from app.models.offer import Offer, OfferStatus
from app.services.analytics import get_credit_source_breakdown


def make_merchant(**overrides) -> Merchant:
    defaults = {
        "shop_domain": "sources.myshopify.com",
        "access_token_encrypted": b"encrypted_token",
        "merchant_email": "merchant@sources.com",
        "subscription_status": SubscriptionStatus.ACTIVE,
        "bonus_percentage": 10,
        "bonus_cap_cents": 5000,
        "brand_color": "#000000",
    }
    defaults.update(overrides)
    return Merchant(**defaults)


def by_source(breakdown, source: str):
    return next(s for s in breakdown.sources if s.source == source)


async def test_empty_state_returns_all_sources_zeroed(db_session):
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.commit()

    breakdown = await get_credit_source_breakdown(str(merchant.id), db_session)

    assert {s.source for s in breakdown.sources} == {
        "refund_recovery",
        "goodwill",
        "winback",
    }
    for s in breakdown.sources:
        assert s.issued_cents == 0
        assert s.percentage == 0.0


async def test_breakdown_across_all_three_sources(db_session):
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    accepted_at = datetime.now(UTC) - timedelta(days=5)
    db_session.add(
        Offer(
            merchant_id=merchant.id,
            shopify_refund_id="ref_src_1",
            shopify_order_id="order_src_1",
            customer_email="a@example.com",
            customer_first_name="A",
            refund_amount_cents=6000,
            credit_amount_cents=6600,
            bonus_applied_cents=600,
            status=OfferStatus.ACCEPTED,
            accepted_at=accepted_at,
        )
    )
    db_session.add(
        CreditTransaction(
            merchant_id=merchant.id,
            customer_email="b@example.com",
            transaction_type=TransactionType.CREDIT,
            amount_cents=2000,
            currency="USD",
            source=TransactionSource.GOODWILL,
            occurred_at=accepted_at,
        )
    )
    db_session.add(
        CreditTransaction(
            merchant_id=merchant.id,
            customer_email="c@example.com",
            transaction_type=TransactionType.CREDIT,
            amount_cents=1400,
            currency="USD",
            source=TransactionSource.WINBACK,
            occurred_at=accepted_at,
        )
    )
    await db_session.commit()

    breakdown = await get_credit_source_breakdown(str(merchant.id), db_session)

    rr = by_source(breakdown, "refund_recovery")
    gw = by_source(breakdown, "goodwill")
    wb = by_source(breakdown, "winback")

    assert rr.issued_cents == 6600
    assert gw.issued_cents == 2000
    assert wb.issued_cents == 1400

    total = 6600 + 2000 + 1400
    assert rr.percentage == round(6600 / total * 100, 1)
    assert gw.percentage == round(2000 / total * 100, 1)
    assert wb.percentage == round(1400 / total * 100, 1)


async def test_external_transactions_excluded_from_breakdown(db_session):
    """EXTERNAL-tagged transactions (unmatched webhooks) must not appear here."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    db_session.add(
        CreditTransaction(
            merchant_id=merchant.id,
            customer_email="d@example.com",
            transaction_type=TransactionType.CREDIT,
            amount_cents=9999,
            currency="USD",
            source=TransactionSource.EXTERNAL,
            occurred_at=datetime.now(UTC),
        )
    )
    await db_session.commit()

    breakdown = await get_credit_source_breakdown(str(merchant.id), db_session)

    for s in breakdown.sources:
        assert s.issued_cents == 0
