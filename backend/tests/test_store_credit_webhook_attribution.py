"""
Tests for Refund Recovery source attribution on the store_credit_accounts/credit
webhook (app/routers/webhooks.py handle_store_credit_credit, _match_refund_recovery_offer).

Covers:
- _match_refund_recovery_offer: matches an unclaimed, in-window, exact-amount
  accepted offer; does not match on amount mismatch, stale offers, or offers
  already linked to another transaction.
- End-to-end webhook handling: CreditTransaction gets source=REFUND_RECOVERY
  + offer_id when a match exists, source=EXTERNAL + offer_id=None otherwise.
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import patch

from sqlalchemy import select

from app.models.credit_transaction import (
    CreditTransaction,
    TransactionSource,
    TransactionType,
)
from app.models.merchant import Merchant, SubscriptionStatus
from app.models.offer import Offer, OfferStatus, RefundStatus
from app.routers.webhooks import _match_refund_recovery_offer


def make_merchant(**overrides) -> Merchant:
    defaults = {
        "shop_domain": "sc-attrib.myshopify.com",
        "access_token_encrypted": b"encrypted_token",
        "merchant_email": "merchant@sc-attrib.com",
        "subscription_status": SubscriptionStatus.ACTIVE,
        "bonus_percentage": 10,
        "bonus_cap_cents": 5000,
        "brand_color": "#000000",
    }
    defaults.update(overrides)
    return Merchant(**defaults)


def make_accepted_offer(merchant_id, **overrides) -> Offer:
    defaults = {
        "merchant_id": merchant_id,
        "shopify_refund_id": "ref_attrib_1",
        "shopify_order_id": "order_attrib_1",
        "customer_email": "match@example.com",
        "customer_first_name": "Match",
        "refund_amount_cents": 10000,
        "credit_amount_cents": 11000,
        "bonus_applied_cents": 1000,
        "status": OfferStatus.ACCEPTED,
        "refund_status": RefundStatus.CREDIT_REFUND_CREATED,
        "accepted_at": datetime.now(UTC) - timedelta(minutes=2),
    }
    defaults.update(overrides)
    return Offer(**defaults)


# ── _match_refund_recovery_offer ────────────────────────────────────────────


async def test_matches_unclaimed_accepted_offer(db_session):
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    offer = make_accepted_offer(merchant.id)
    db_session.add(offer)
    await db_session.commit()

    match = await _match_refund_recovery_offer(
        db_session, merchant.id, "match@example.com", 11000
    )

    assert match is not None
    assert match.id == offer.id


async def test_no_match_on_amount_mismatch(db_session):
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    db_session.add(make_accepted_offer(merchant.id, credit_amount_cents=11000))
    await db_session.commit()

    match = await _match_refund_recovery_offer(
        db_session, merchant.id, "match@example.com", 5000
    )

    assert match is None


async def test_no_match_outside_time_window(db_session):
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    db_session.add(
        make_accepted_offer(
            merchant.id,
            accepted_at=datetime.now(UTC) - timedelta(hours=2),
        )
    )
    await db_session.commit()

    match = await _match_refund_recovery_offer(
        db_session, merchant.id, "match@example.com", 11000
    )

    assert match is None


async def test_no_match_when_offer_already_linked(db_session):
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    offer = make_accepted_offer(merchant.id)
    db_session.add(offer)
    await db_session.flush()

    # A prior transaction already claimed this offer.
    db_session.add(
        CreditTransaction(
            merchant_id=merchant.id,
            customer_email="match@example.com",
            transaction_type=TransactionType.CREDIT,
            amount_cents=11000,
            currency="USD",
            source=TransactionSource.REFUND_RECOVERY,
            offer_id=offer.id,
            occurred_at=datetime.now(UTC),
        )
    )
    await db_session.commit()

    match = await _match_refund_recovery_offer(
        db_session, merchant.id, "match@example.com", 11000
    )

    assert match is None


async def test_no_match_when_refund_status_not_credit_refund_created(db_session):
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    db_session.add(
        make_accepted_offer(merchant.id, refund_status=RefundStatus.MANUAL_REVIEW)
    )
    await db_session.commit()

    match = await _match_refund_recovery_offer(
        db_session, merchant.id, "match@example.com", 11000
    )

    assert match is None


# ── End-to-end webhook handling ─────────────────────────────────────────────


def _credit_webhook_payload(
    *, customer_id: int, email: str, amount_cents: int, txn_id: str
) -> dict:
    return {
        "customer_credit_balance_transaction": {
            "id": txn_id,
            "credit_balance": {"customer": {"id": customer_id, "email": email}},
            "amount": {"amount": f"{amount_cents / 100:.2f}", "currency_code": "USD"},
        }
    }


async def test_webhook_tags_refund_recovery_when_matched(client, db_session):
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    offer = make_accepted_offer(merchant.id)
    db_session.add(offer)
    await db_session.commit()

    payload = _credit_webhook_payload(
        customer_id=555,
        email="match@example.com",
        amount_cents=11000,
        txn_id="txn_matched_1",
    )

    with patch("app.routers.webhooks.verify_webhook_hmac", return_value=True):
        response = await client.post(
            "/webhooks/store_credit/credit",
            json=payload,
            headers={
                "X-Shopify-Shop-Domain": merchant.shop_domain,
                "X-Shopify-Hmac-Sha256": "valid_hmac",
            },
        )

    assert response.status_code == 200
    assert response.json()["status"] == "success"

    result = await db_session.execute(
        select(CreditTransaction).where(
            CreditTransaction.shopify_transaction_id == "txn_matched_1"
        )
    )
    ct = result.scalar_one()
    assert ct.source == TransactionSource.REFUND_RECOVERY
    assert ct.offer_id == offer.id


async def test_webhook_falls_back_to_external_when_unmatched(client, db_session):
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.commit()

    payload = _credit_webhook_payload(
        customer_id=556,
        email="nomatch@example.com",
        amount_cents=2500,
        txn_id="txn_unmatched_1",
    )

    with patch("app.routers.webhooks.verify_webhook_hmac", return_value=True):
        response = await client.post(
            "/webhooks/store_credit/credit",
            json=payload,
            headers={
                "X-Shopify-Shop-Domain": merchant.shop_domain,
                "X-Shopify-Hmac-Sha256": "valid_hmac",
            },
        )

    assert response.status_code == 200

    result = await db_session.execute(
        select(CreditTransaction).where(
            CreditTransaction.shopify_transaction_id == "txn_unmatched_1"
        )
    )
    ct = result.scalar_one()
    assert ct.source == TransactionSource.EXTERNAL
    assert ct.offer_id is None
