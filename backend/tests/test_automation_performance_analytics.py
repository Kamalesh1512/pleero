"""
Tests for automation-performance analytics (app/services/analytics.py
get_automation_performance, app/routers/analytics.py GET /api/analytics/automation).

Covers each workflow's executions/credit_issued/redemption methodology:
- Refund Recovery: derived from accepted Offers
- Goodwill: derived from CreditTransaction(source=GOODWILL)
- Win-back: always zero — issuance isn't implemented yet
- Redemption reminder: derived from RedemptionReminder rows, issues no credit
"""

from datetime import UTC, datetime, timedelta

from app.main import app
from app.models.automation import RedemptionReminder
from app.models.credit_transaction import (
    CreditTransaction,
    TransactionSource,
    TransactionType,
)
from app.models.merchant import Merchant, SubscriptionStatus
from app.models.offer import Offer, OfferStatus
from app.services.analytics import get_automation_performance
from app.utils.session_auth import get_current_shop


def make_merchant(*, shop_domain: str = "auto-perf.myshopify.com") -> Merchant:
    return Merchant(
        shop_domain=shop_domain,
        shop_name="Auto Perf Co",
        access_token_encrypted=b"dummy_encrypted_bytes",
        merchant_email="merchant@auto-perf.com",
        subscription_status=SubscriptionStatus.ACTIVE,
        bonus_percentage=10,
        bonus_cap_cents=5000,
        brand_color="#000000",
    )


def by_workflow(performance, workflow: str):
    return next(w for w in performance.workflows if w.workflow == workflow)


async def test_no_activity_returns_zero_with_null_rates(db_session):
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.commit()

    performance = await get_automation_performance(str(merchant.id), db_session)

    assert {w.workflow for w in performance.workflows} == {
        "refund_recovery",
        "goodwill",
        "winback",
        "redemption_reminder",
    }
    for w in performance.workflows:
        assert w.executions == 0
        assert w.credit_issued_cents == 0
        assert w.redeemed_customers is None
        assert w.redemption_rate is None


async def test_winback_metrics(db_session):
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    occurred_at = datetime.now(UTC) - timedelta(days=6)
    ct = CreditTransaction(
        merchant_id=merchant.id,
        customer_email="erin@example.com",
        transaction_type=TransactionType.CREDIT,
        amount_cents=3000,
        currency="USD",
        source=TransactionSource.WINBACK,
        occurred_at=occurred_at,
    )
    db_session.add(ct)
    await db_session.commit()

    performance = await get_automation_performance(str(merchant.id), db_session)
    winback = by_workflow(performance, "winback")

    assert winback.executions == 1
    assert winback.credit_issued_cents == 3000
    assert winback.customers_reached == 1
    assert winback.redeemed_customers == 0
    assert winback.redemption_rate == 0.0


async def test_refund_recovery_metrics_and_redemption(db_session):
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    accepted_at = datetime.now(UTC) - timedelta(days=10)
    offer = Offer(
        merchant_id=merchant.id,
        shopify_refund_id="ref_1",
        shopify_order_id="order_1",
        customer_email="alice@example.com",
        customer_first_name="Alice",
        refund_amount_cents=10000,
        credit_amount_cents=11000,
        bonus_applied_cents=1000,
        status=OfferStatus.ACCEPTED,
        accepted_at=accepted_at,
    )
    db_session.add(offer)

    # Redeemed after acceptance -> counts as a redeemed customer.
    debit = CreditTransaction(
        merchant_id=merchant.id,
        customer_email="alice@example.com",
        transaction_type=TransactionType.DEBIT,
        amount_cents=5000,
        currency="USD",
        source=TransactionSource.EXTERNAL,
        occurred_at=accepted_at + timedelta(days=2),
    )
    db_session.add(debit)
    await db_session.commit()

    performance = await get_automation_performance(str(merchant.id), db_session)
    rr = by_workflow(performance, "refund_recovery")

    assert rr.executions == 1
    assert rr.credit_issued_cents == 11000
    assert rr.customers_reached == 1
    assert rr.redeemed_customers == 1
    assert rr.redemption_rate == 100.0


async def test_refund_recovery_debit_before_issuance_not_counted(db_session):
    """A debit that happened BEFORE this workflow issued credit must not
    count as redemption of THIS issuance (it predates it)."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    accepted_at = datetime.now(UTC) - timedelta(days=5)
    offer = Offer(
        merchant_id=merchant.id,
        shopify_refund_id="ref_2",
        shopify_order_id="order_2",
        customer_email="bob@example.com",
        customer_first_name="Bob",
        refund_amount_cents=8000,
        credit_amount_cents=8800,
        bonus_applied_cents=800,
        status=OfferStatus.ACCEPTED,
        accepted_at=accepted_at,
    )
    db_session.add(offer)

    stale_debit = CreditTransaction(
        merchant_id=merchant.id,
        customer_email="bob@example.com",
        transaction_type=TransactionType.DEBIT,
        amount_cents=100,
        currency="USD",
        source=TransactionSource.EXTERNAL,
        occurred_at=accepted_at - timedelta(days=30),
    )
    db_session.add(stale_debit)
    await db_session.commit()

    performance = await get_automation_performance(str(merchant.id), db_session)
    rr = by_workflow(performance, "refund_recovery")

    assert rr.customers_reached == 1
    assert rr.redeemed_customers == 0
    assert rr.redemption_rate == 0.0


async def test_goodwill_metrics(db_session):
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    occurred_at = datetime.now(UTC) - timedelta(days=3)
    ct = CreditTransaction(
        merchant_id=merchant.id,
        customer_email="carol@example.com",
        transaction_type=TransactionType.CREDIT,
        amount_cents=2500,
        currency="USD",
        source=TransactionSource.GOODWILL,
        occurred_at=occurred_at,
    )
    db_session.add(ct)
    await db_session.commit()

    performance = await get_automation_performance(str(merchant.id), db_session)
    goodwill = by_workflow(performance, "goodwill")

    assert goodwill.executions == 1
    assert goodwill.credit_issued_cents == 2500
    assert goodwill.customers_reached == 1
    assert goodwill.redeemed_customers == 0
    assert goodwill.redemption_rate == 0.0


async def test_redemption_reminder_metrics_issues_no_credit(db_session):
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    sent_at = datetime.now(UTC) - timedelta(days=4)
    reminder = RedemptionReminder(
        merchant_id=merchant.id,
        customer_email="dana@example.com",
        reminder_round=1,
        sent_at=sent_at,
    )
    db_session.add(reminder)

    debit = CreditTransaction(
        merchant_id=merchant.id,
        customer_email="dana@example.com",
        transaction_type=TransactionType.DEBIT,
        amount_cents=1500,
        currency="USD",
        source=TransactionSource.EXTERNAL,
        occurred_at=sent_at + timedelta(hours=6),
    )
    db_session.add(debit)
    await db_session.commit()

    performance = await get_automation_performance(str(merchant.id), db_session)
    reminder_perf = by_workflow(performance, "redemption_reminder")

    assert reminder_perf.executions == 1
    assert reminder_perf.credit_issued_cents == 0
    assert reminder_perf.redeemed_customers == 1
    assert reminder_perf.redemption_rate == 100.0
    assert reminder_perf.notes is not None


async def test_automation_performance_endpoint_returns_all_workflows(
    client, db_session
):
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.commit()

    async def override_get_current_shop() -> str:
        return merchant.shop_domain

    app.dependency_overrides[get_current_shop] = override_get_current_shop
    try:
        response = await client.get("/api/analytics/automation")
    finally:
        del app.dependency_overrides[get_current_shop]

    assert response.status_code == 200
    data = response.json()
    assert data["period_days"] == 30
    assert {w["workflow"] for w in data["workflows"]} == {
        "refund_recovery",
        "goodwill",
        "winback",
        "redemption_reminder",
    }
