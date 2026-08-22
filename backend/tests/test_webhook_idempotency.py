"""
Tests for webhook idempotency and duplicate delivery handling.

Covers:
- DB-level unique constraint (uq_merchant_refund) prevents duplicate offers
- Second delivery of the same webhook returns "already_exists"
- Different refund IDs create separate offers
- Missing shop domain returns an error instead of 500
- Unknown merchant is skipped cleanly
"""

import pytest
from sqlalchemy import select
from unittest.mock import AsyncMock, MagicMock, patch

from app.main import app
from app.models.merchant import Merchant, SubscriptionStatus
from app.models.offer import Offer
from app.routers.webhooks import verify_webhook_signature


# ── Shared fixtures & helpers ──────────────────────────────────────────────────

SHOP_DOMAIN = "idempotency-test.myshopify.com"

WEBHOOK_HEADERS = {
    "X-Shopify-Shop-Domain": SHOP_DOMAIN,
    # Any value is fine — we bypass HMAC in these tests
    "X-Shopify-Hmac-Sha256": "bypass",
    "Content-Type": "application/json",
}


def make_refund_payload(refund_id: int, order_id: int) -> dict:
    """Minimal valid refunds/create payload including customer data."""
    return {
        "id": refund_id,
        "order_id": order_id,
        "created_at": "2026-08-01T10:00:00Z",
        "refund_line_items": [
            {
                "id": 1,
                "line_item_id": 1001,
                "quantity": 1,
                "subtotal": "100.00",
                "total_tax": "0.00",
            }
        ],
        "transactions": [],
        # Include full order+customer so _fetch_order_into_webhook_data is skipped
        "order": {
            "id": order_id,
            "name": f"#{order_id}",
            "currency": "USD",
            "customer": {
                "id": 555001,
                "email": "customer@example.com",
                "first_name": "Alice",
                "default_address": {"country_code": "US"},
            },
        },
    }


def make_active_merchant() -> Merchant:
    return Merchant(
        shop_domain=SHOP_DOMAIN,
        access_token_encrypted=b"dummy_encrypted",
        merchant_email="merchant@idempotency-test.com",
        subscription_status=SubscriptionStatus.ACTIVE,
        bonus_percentage=10,
        bonus_cap_cents=5000,
        brand_color="#000000",
    )


# ── DB-level constraint ────────────────────────────────────────────────────────


async def test_db_unique_constraint_prevents_duplicate_offers(db_session):
    """
    uq_merchant_refund unique constraint must raise an IntegrityError when two
    Offer rows share the same (merchant_id, shopify_refund_id).
    """
    import sqlalchemy.exc

    merchant = make_active_merchant()
    db_session.add(merchant)
    await db_session.flush()

    offer1 = Offer(
        merchant_id=merchant.id,
        shopify_refund_id="dup_refund_001",
        shopify_order_id="order_001",
        customer_email="c@example.com",
        customer_first_name="Alice",
        refund_amount_cents=10000,
        credit_amount_cents=11000,
        bonus_applied_cents=1000,
    )
    db_session.add(offer1)
    await db_session.commit()

    offer2 = Offer(
        merchant_id=merchant.id,
        shopify_refund_id="dup_refund_001",  # same refund ID
        shopify_order_id="order_001",
        customer_email="c@example.com",
        customer_first_name="Alice",
        refund_amount_cents=10000,
        credit_amount_cents=11000,
        bonus_applied_cents=1000,
    )
    db_session.add(offer2)

    with pytest.raises(sqlalchemy.exc.IntegrityError):
        await db_session.commit()


# ── Endpoint-level idempotency ─────────────────────────────────────────────────


async def test_duplicate_webhook_delivery_returns_already_exists(client, db_session):
    """
    Sending the same refund webhook twice must:
    - Create exactly one offer on the first delivery
    - Return status=skipped, reason=already_exists on the second delivery
    - Enqueue the Celery email task exactly once
    """
    merchant = make_active_merchant()
    db_session.add(merchant)
    await db_session.commit()

    # Override HMAC check for this test
    app.dependency_overrides[verify_webhook_signature] = lambda: b""

    payload = make_refund_payload(refund_id=888001, order_id=777001)

    with (
        patch(
            "app.routers.webhooks.sync_merchant_subscription_from_shopify",
            new=AsyncMock(),
        ),
        patch("app.tasks.email_tasks.send_offer_email_task") as mock_task,
    ):
        mock_task.delay = MagicMock()

        resp1 = await client.post(
            "/webhooks/refunds/create", json=payload, headers=WEBHOOK_HEADERS
        )
        resp2 = await client.post(
            "/webhooks/refunds/create", json=payload, headers=WEBHOOK_HEADERS
        )

    assert resp1.json()["status"] == "success"
    assert "offer_id" in resp1.json()

    assert resp2.json()["status"] == "skipped"
    assert resp2.json()["reason"] == "already_exists"

    # Celery email enqueued exactly once
    mock_task.delay.assert_called_once()

    # Only one offer in the DB
    result = await db_session.execute(
        select(Offer).where(
            Offer.merchant_id == merchant.id,
            Offer.shopify_refund_id == "888001",
        )
    )
    offers = result.scalars().all()
    assert len(offers) == 1


async def test_different_refund_ids_create_separate_offers(client, db_session):
    """Two webhooks with different refund IDs must each create their own offer."""
    merchant = make_active_merchant()
    db_session.add(merchant)
    await db_session.commit()

    app.dependency_overrides[verify_webhook_signature] = lambda: b""

    payload_a = make_refund_payload(refund_id=111111, order_id=222222)
    payload_b = make_refund_payload(refund_id=333333, order_id=222222)

    with (
        patch(
            "app.routers.webhooks.sync_merchant_subscription_from_shopify",
            new=AsyncMock(),
        ),
        patch("app.tasks.email_tasks.send_offer_email_task") as mock_task,
    ):
        mock_task.delay = MagicMock()

        resp_a = await client.post(
            "/webhooks/refunds/create", json=payload_a, headers=WEBHOOK_HEADERS
        )
        resp_b = await client.post(
            "/webhooks/refunds/create", json=payload_b, headers=WEBHOOK_HEADERS
        )

    assert resp_a.json()["status"] == "success"
    assert resp_b.json()["status"] == "success"
    assert resp_a.json()["offer_id"] != resp_b.json()["offer_id"]
    assert mock_task.delay.call_count == 2


# ── Skip / error conditions ────────────────────────────────────────────────────


async def test_webhook_missing_shop_domain_header(client, db_session):
    """
    A webhook without X-Shopify-Shop-Domain must return status=error without
    raising an unhandled 500 (Shopify must get a 200 to stop retries).
    """
    app.dependency_overrides[verify_webhook_signature] = lambda: b""

    payload = make_refund_payload(refund_id=999999, order_id=888888)
    headers_no_domain = {
        "X-Shopify-Hmac-Sha256": "bypass",
        "Content-Type": "application/json",
    }

    resp = await client.post(
        "/webhooks/refunds/create", json=payload, headers=headers_no_domain
    )

    assert resp.status_code == 200
    assert resp.json()["status"] == "error"


async def test_webhook_unknown_merchant_is_skipped(client, db_session):
    """
    A webhook for a shop domain that has no merchant record must return
    status=skipped, reason=merchant_not_found (Shopify stops retrying).
    """
    app.dependency_overrides[verify_webhook_signature] = lambda: b""

    payload = make_refund_payload(refund_id=123, order_id=456)
    headers = {
        "X-Shopify-Shop-Domain": "no-such-store.myshopify.com",
        "X-Shopify-Hmac-Sha256": "bypass",
        "Content-Type": "application/json",
    }

    resp = await client.post("/webhooks/refunds/create", json=payload, headers=headers)

    assert resp.status_code == 200
    assert resp.json()["status"] == "skipped"
    assert resp.json()["reason"] == "merchant_not_found"
