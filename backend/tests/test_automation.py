"""
Tests for Store Credit Automation — service layer (app/services/automation.py).

Covers:
- ensure_automation_configs / get_automation_configs: defaults, idempotency
- issue_goodwill_credit: success + failure paths, validation
- find_winback_candidates: inactive-customer discovery
- build_reminder_email_html: content + escaping
- run_reminder_sweep / send_redemption_reminder: eligibility, dedup, caps
- Celery beat schedule wiring for automation sweeps
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.models.automation import (
    AutomationConfig,
    AutomationWorkflow,
    RedemptionReminder,
)
from app.models.credit_transaction import (
    CreditTransaction,
    TransactionSource,
    TransactionType,
)
from app.models.merchant import Merchant, SubscriptionStatus
from app.models.offer import Offer, OfferStatus
from app.services.automation import (
    build_reminder_email_html,
    ensure_automation_configs,
    find_winback_candidates,
    get_automation_configs,
    issue_goodwill_credit,
    issue_winback_credit,
    run_reminder_sweep,
    send_redemption_reminder,
)


# ── Helpers ────────────────────────────────────────────────────────────────────


def make_merchant(*, shop_domain: str = "automation.myshopify.com") -> Merchant:
    return Merchant(
        shop_domain=shop_domain,
        shop_name="Automation Co",
        access_token_encrypted=b"dummy_encrypted_bytes",
        merchant_email="merchant@automation.com",
        subscription_status=SubscriptionStatus.ACTIVE,
        bonus_percentage=10,
        bonus_cap_cents=5000,
        brand_color="#000000",
    )


def make_accepted_offer(
    merchant: Merchant,
    *,
    customer_email: str = "customer@example.com",
    first_name: str = "Alice",
    accepted_days_ago: int = 30,
    credit_cents: int = 11000,
    refund_id_suffix: str = "",
) -> Offer:
    """Build an ACCEPTED offer the sweep will consider."""
    accepted_at = datetime.now(UTC) - timedelta(days=accepted_days_ago)
    return Offer(
        merchant_id=merchant.id,
        shopify_refund_id=f"ref_auto_{accepted_days_ago}{refund_id_suffix}",
        shopify_order_id="order_auto",
        customer_email=customer_email,
        customer_first_name=first_name,
        customer_shopify_id="gid://shopify/Customer/888",
        refund_amount_cents=10000,
        credit_amount_cents=credit_cents,
        bonus_applied_cents=max(0, credit_cents - 10000),
        status=OfferStatus.ACCEPTED,
        accepted_at=accepted_at,
    )


@pytest.fixture
def mock_resend(monkeypatch):
    """
    Force send_redemption_reminder down its success+record path without any
    real network I/O: stub the RESEND key and httpx.AsyncClient post.
    """
    monkeypatch.setattr(settings, "RESEND_API_KEY", "test-resend-key")

    fake_response = MagicMock()
    fake_response.raise_for_status = lambda: None
    fake_client = MagicMock()
    fake_client.post = AsyncMock(return_value=fake_response)
    fake_client.__aenter__ = AsyncMock(return_value=fake_client)
    fake_client.__aexit__ = AsyncMock(return_value=False)
    monkeypatch.setattr(
        "app.services.automation.httpx.AsyncClient", lambda **kw: fake_client
    )
    return fake_client


# ── Config helpers ─────────────────────────────────────────────────────────────


async def test_ensure_configs_creates_all_workflows(db_session):
    """ensure_automation_configs must create a default row for every workflow."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.commit()

    configs = await ensure_automation_configs(merchant.id, db_session)

    assert set(configs.keys()) == {w.value for w in AutomationWorkflow}
    # All workflows enabled by default
    assert all(c.enabled for c in configs.values())


async def test_default_config_values(db_session):
    """Redemption reminder waits 14 days; other workflows wait 7 days."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.commit()

    configs = await ensure_automation_configs(merchant.id, db_session)

    assert configs[AutomationWorkflow.REFUND_RECOVERY.value].min_days_before_action == 7
    assert configs[AutomationWorkflow.GOODWILL.value].min_days_before_action == 7
    assert configs[AutomationWorkflow.WINBACK.value].min_days_before_action == 7
    assert (
        configs[AutomationWorkflow.REDEMPTION_REMINDER.value].min_days_before_action
        == 14
    )
    assert all(c.max_actions_per_customer == 3 for c in configs.values())


async def test_ensure_configs_is_idempotent(db_session):
    """Calling ensure_automation_configs twice must not create duplicate rows."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.commit()

    first = await ensure_automation_configs(merchant.id, db_session)
    second = await ensure_automation_configs(merchant.id, db_session)

    assert first == second
    rows = (
        (
            await db_session.execute(
                select(AutomationConfig).where(
                    AutomationConfig.merchant_id == merchant.id
                )
            )
        )
        .scalars()
        .all()
    )
    assert len(rows) == len(AutomationWorkflow)


async def test_get_automation_configs_empty_when_none(db_session):
    """get_automation_configs returns empty dict when no rows exist."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.commit()

    configs = await get_automation_configs(merchant.id, db_session)
    assert configs == {}


# ── Goodwill issuance ──────────────────────────────────────────────────────────


async def test_issue_goodwill_success_records_transaction(db_session):
    """A successful goodwill issuance must record a CREDIT txn sourced GOODWILL."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.commit()

    with patch(
        "app.services.automation.issue_store_credit",
        new=AsyncMock(return_value=True),
    ):
        success, message = await issue_goodwill_credit(
            db=db_session,
            merchant=merchant,
            customer_email="customer@example.com",
            customer_first_name="Alice",
            amount_cents=5000,
            note="Apology",
        )

    assert success is True
    assert "success" in message.lower()

    txns = (
        (
            await db_session.execute(
                select(CreditTransaction).where(
                    CreditTransaction.merchant_id == merchant.id
                )
            )
        )
        .scalars()
        .all()
    )
    assert len(txns) == 1
    assert txns[0].transaction_type == TransactionType.CREDIT
    assert txns[0].source == TransactionSource.GOODWILL
    assert txns[0].amount_cents == 5000
    assert txns[0].customer_email == "customer@example.com"


async def test_issue_goodwill_failure_returns_false(db_session):
    """When issue_store_credit fails, goodwill must return failure and no txn."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.commit()

    with patch(
        "app.services.automation.issue_store_credit",
        new=AsyncMock(return_value=False),
    ):
        success, message = await issue_goodwill_credit(
            db=db_session,
            merchant=merchant,
            customer_email="customer@example.com",
            customer_first_name="Alice",
            amount_cents=5000,
        )

    assert success is False
    txns = (
        (
            await db_session.execute(
                select(CreditTransaction).where(
                    CreditTransaction.merchant_id == merchant.id
                )
            )
        )
        .scalars()
        .all()
    )
    assert len(txns) == 0


async def test_issue_goodwill_rejects_nonpositive_amount(db_session):
    """Goodwill credit with zero/negative amount must be rejected before Shopify."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.commit()

    success, message = await issue_goodwill_credit(
        db=db_session,
        merchant=merchant,
        customer_email="customer@example.com",
        customer_first_name="Alice",
        amount_cents=0,
    )

    assert success is False
    assert "amount" in message.lower()


async def test_issue_goodwill_requires_email(db_session):
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.commit()

    success, message = await issue_goodwill_credit(
        db=db_session,
        merchant=merchant,
        customer_email="",
        customer_first_name="Alice",
        amount_cents=5000,
    )

    assert success is False
    assert "email" in message.lower()


# ── Win-back issuance ────────────────────────────────────────────────────────────


async def test_issue_winback_success_records_transaction(db_session):
    """A successful win-back issuance must record a CREDIT txn sourced WINBACK."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.commit()

    with patch(
        "app.services.automation.issue_store_credit",
        new=AsyncMock(return_value=True),
    ):
        success, message = await issue_winback_credit(
            db=db_session,
            merchant=merchant,
            customer_email="inactive@example.com",
            customer_first_name="Bob",
            amount_cents=2500,
        )

    assert success is True
    assert "success" in message.lower()

    txns = (
        (
            await db_session.execute(
                select(CreditTransaction).where(
                    CreditTransaction.merchant_id == merchant.id
                )
            )
        )
        .scalars()
        .all()
    )
    assert len(txns) == 1
    assert txns[0].transaction_type == TransactionType.CREDIT
    assert txns[0].source == TransactionSource.WINBACK
    assert txns[0].amount_cents == 2500
    assert txns[0].customer_email == "inactive@example.com"


async def test_issue_winback_failure_returns_false(db_session):
    """When issue_store_credit fails, win-back must return failure and no txn."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.commit()

    with patch(
        "app.services.automation.issue_store_credit",
        new=AsyncMock(return_value=False),
    ):
        success, message = await issue_winback_credit(
            db=db_session,
            merchant=merchant,
            customer_email="inactive@example.com",
            customer_first_name="Bob",
            amount_cents=2500,
        )

    assert success is False
    txns = (
        (
            await db_session.execute(
                select(CreditTransaction).where(
                    CreditTransaction.merchant_id == merchant.id
                )
            )
        )
        .scalars()
        .all()
    )
    assert len(txns) == 0


async def test_issue_winback_rejects_nonpositive_amount(db_session):
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.commit()

    success, message = await issue_winback_credit(
        db=db_session,
        merchant=merchant,
        customer_email="inactive@example.com",
        customer_first_name="Bob",
        amount_cents=0,
    )

    assert success is False
    assert "amount" in message.lower()


# ── Win-back discovery ─────────────────────────────────────────────────────────


async def test_find_winback_candidates_only_inactive(db_session):
    """Candidates must include only accepted-offer customers inactive 90+ days."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.commit()

    inactive = make_accepted_offer(
        merchant, customer_email="inactive@example.com", accepted_days_ago=120
    )
    active = make_accepted_offer(
        merchant, customer_email="recent@example.com", accepted_days_ago=10
    )
    db_session.add_all([inactive, active])
    await db_session.commit()

    candidates = await find_winback_candidates(merchant.id, db_session)

    emails = {c["customer_email"] for c in candidates}
    assert "inactive@example.com" in emails
    assert "recent@example.com" not in emails
    assert candidates[0]["days_since_last_activity"] >= 90


async def test_find_winback_candidates_empty_when_none(db_session):
    """No accepted offers → no candidates."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.commit()

    candidates = await find_winback_candidates(merchant.id, db_session)
    assert candidates == []


# ── Reminder email template ────────────────────────────────────────────────────


def test_build_reminder_email_html_contains_content():
    html = build_reminder_email_html(
        merchant_name="Co & Sons",
        customer_first_name="Alice",
        credit_amount_cents=5000,
        currency="USD",
        shop_url="https://copper.myshopify.com",
    )

    assert "Alice" in html
    assert "Co &amp; Sons" in html  # escaped
    assert "https://copper.myshopify.com" in html
    assert "$50" in html  # format_currency(5000, USD)


def test_build_reminder_email_html_escapes_unsafe_input():
    html = build_reminder_email_html(
        merchant_name="<script>bad</script>",
        customer_first_name="<b>X</b>",
        credit_amount_cents=1000,
        currency="USD",
        shop_url="javascript:alert(1)",
    )

    assert "<script>" not in html
    assert "<b>X</b>" not in html


# ── Reminder sweep ─────────────────────────────────────────────────────────────


async def _setup_merchant_with_reminder_config(
    db_session,
    *,
    enabled: bool = True,
    min_days: int = 14,
    max_actions: int = 3,
):
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()
    db_session.add(
        AutomationConfig(
            merchant_id=merchant.id,
            workflow=AutomationWorkflow.REDEMPTION_REMINDER,
            enabled=enabled,
            min_days_before_action=min_days,
            max_actions_per_customer=max_actions,
        )
    )
    await db_session.commit()
    return merchant


async def test_sweep_returns_zero_when_disabled(db_session):
    """Disabled reminder workflow → sweep sends nothing."""
    merchant = await _setup_merchant_with_reminder_config(db_session, enabled=False)
    db_session.add(make_accepted_offer(merchant, accepted_days_ago=60))
    await db_session.commit()

    sent = await run_reminder_sweep(merchant.id, db_session)
    assert sent == 0


async def test_sweep_returns_zero_when_no_offers(db_session):
    """No accepted offers → nothing to remind about."""
    merchant = await _setup_merchant_with_reminder_config(db_session, enabled=True)
    sent = await run_reminder_sweep(merchant.id, db_session)
    assert sent == 0


async def test_sweep_skips_offers_below_min_days(db_session):
    """Offers accepted more recently than the min-days window are ignored."""
    merchant = await _setup_merchant_with_reminder_config(
        db_session, enabled=True, min_days=30
    )
    recent = make_accepted_offer(merchant, accepted_days_ago=5)
    db_session.add(recent)
    await db_session.commit()

    # RESEND key unset → send returns True without an external call
    sent = await run_reminder_sweep(merchant.id, db_session)
    assert sent == 0


async def test_sweep_sends_for_unredeemed_old_offer(db_session, mock_resend):
    """An old accepted offer with no debits → one reminder sent."""
    merchant = await _setup_merchant_with_reminder_config(db_session, enabled=True)
    offer = make_accepted_offer(merchant, accepted_days_ago=60)
    db_session.add(offer)
    await db_session.commit()

    sent = await run_reminder_sweep(merchant.id, db_session)
    assert sent == 1
    # The reminder path must have recorded a row
    reminders = (
        (
            await db_session.execute(
                select(RedemptionReminder).where(
                    RedemptionReminder.merchant_id == merchant.id
                )
            )
        )
        .scalars()
        .all()
    )
    assert len(reminders) == 1
    assert reminders[0].customer_email == offer.customer_email


async def test_sweep_skips_fully_redeemed_customer(db_session):
    """Customers whose total debits >= issued credit are not reminded."""
    merchant = await _setup_merchant_with_reminder_config(db_session, enabled=True)
    offer = make_accepted_offer(
        merchant,
        customer_email="redeemed@example.com",
        accepted_days_ago=60,
        credit_cents=11000,
    )
    db_session.add(offer)
    await db_session.commit()

    # Full redemption recorded
    db_session.add(
        CreditTransaction(
            merchant_id=merchant.id,
            customer_email="redeemed@example.com",
            customer_shopify_id="gid://shopify/Customer/888",
            transaction_type=TransactionType.DEBIT,
            amount_cents=11000,
            currency="USD",
            source=TransactionSource.EXTERNAL,
            occurred_at=datetime.now(UTC),
        )
    )
    await db_session.commit()

    sent = await run_reminder_sweep(merchant.id, db_session)
    assert sent == 0


async def test_sweep_respects_max_actions(db_session):
    """A customer at max reminders is never reminded again."""
    merchant = await _setup_merchant_with_reminder_config(
        db_session, enabled=True, max_actions=2
    )
    offer = make_accepted_offer(merchant, accepted_days_ago=60)
    db_session.add(offer)
    # Two reminders already recorded
    db_session.add_all(
        [
            RedemptionReminder(
                merchant_id=merchant.id,
                customer_email=offer.customer_email,
                reminder_round=1,
            ),
            RedemptionReminder(
                merchant_id=merchant.id,
                customer_email=offer.customer_email,
                reminder_round=2,
            ),
        ]
    )
    await db_session.commit()

    sent = await run_reminder_sweep(merchant.id, db_session)
    assert sent == 0


async def test_send_redemption_reminder_increments_round(db_session, mock_resend):
    """A second reminder to the same customer must be round 2."""
    merchant = await _setup_merchant_with_reminder_config(db_session, enabled=True)
    offer = make_accepted_offer(merchant, accepted_days_ago=60)
    db_session.add(offer)
    await db_session.commit()

    # Round 1 exists
    db_session.add(
        RedemptionReminder(
            merchant_id=merchant.id,
            customer_email=offer.customer_email,
            reminder_round=1,
        )
    )
    await db_session.commit()

    success = await send_redemption_reminder(
        db=db_session,
        merchant_id=merchant.id,
        customer_email=offer.customer_email,
        credit_amount_cents=11000,
        currency="USD",
        offer_id=offer.id,
    )

    assert success is True
    reminders = (
        (
            await db_session.execute(
                select(RedemptionReminder).where(
                    RedemptionReminder.merchant_id == merchant.id,
                    RedemptionReminder.customer_email == offer.customer_email,
                )
            )
        )
        .scalars()
        .all()
    )
    assert len(reminders) == 2
    assert max(r.reminder_round for r in reminders) == 2


# ── Celery beat wiring ─────────────────────────────────────────────────────────


def test_beat_schedule_includes_automation_sweeps():
    from app.core.celery_app import celery_app

    assert "redemption-reminder-sweep" in celery_app.conf.beat_schedule
    assert "winback-evaluation-sweep" in celery_app.conf.beat_schedule

    reminder = celery_app.conf.beat_schedule["redemption-reminder-sweep"]
    assert reminder["task"] == "app.tasks.automation_tasks.redemption_reminder_sweep"
    assert reminder["schedule"] == 86400.0

    winback = celery_app.conf.beat_schedule["winback-evaluation-sweep"]
    assert winback["task"] == "app.tasks.automation_tasks.winback_evaluation_sweep"
    assert winback["schedule"] == 86400.0
