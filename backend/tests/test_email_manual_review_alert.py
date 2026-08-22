"""
Tests for the merchant-facing MANUAL_REVIEW alert email.

Covers send_manual_review_alert_email: happy path (Resend called, correct
recipient), the no-Resend-key skip, and missing offer/merchant handling.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.config import settings
from app.models.merchant import Merchant, SubscriptionStatus
from app.models.offer import Offer, OfferStatus, RefundStatus
from app.services.email import send_manual_review_alert_email


def make_merchant(**overrides) -> Merchant:
    defaults = {
        "shop_domain": "alert-test.myshopify.com",
        "access_token_encrypted": b"encrypted_token",
        "merchant_email": "owner@alert-test.com",
        "subscription_status": SubscriptionStatus.ACTIVE,
        "bonus_percentage": 10,
        "bonus_cap_cents": 5000,
        "brand_color": "#000000",
    }
    defaults.update(overrides)
    return Merchant(**defaults)


def make_offer(merchant_id, **overrides) -> Offer:
    defaults = {
        "merchant_id": merchant_id,
        "shopify_refund_id": "ref_1",
        "shopify_order_id": "order_1",
        "customer_email": "customer@example.com",
        "customer_first_name": "Jane",
        "refund_amount_cents": 10000,
        "credit_amount_cents": 11000,
        "bonus_applied_cents": 1000,
        "status": OfferStatus.PENDING,
        "refund_status": RefundStatus.MANUAL_REVIEW,
    }
    defaults.update(overrides)
    return Offer(**defaults)


@pytest.fixture
def mock_resend(monkeypatch):
    """Stub the RESEND key and httpx.AsyncClient.post used by email.py."""
    monkeypatch.setattr(settings, "RESEND_API_KEY", "test-resend-key")

    fake_response = MagicMock()
    fake_response.raise_for_status = lambda: None
    fake_client = MagicMock()
    fake_client.post = AsyncMock(return_value=fake_response)
    fake_client.__aenter__ = AsyncMock(return_value=fake_client)
    fake_client.__aexit__ = AsyncMock(return_value=False)
    monkeypatch.setattr(
        "app.services.email.httpx.AsyncClient", lambda **kw: fake_client
    )
    return fake_client


async def test_sends_alert_to_merchant_email(db_session, mock_resend):
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    offer = make_offer(merchant.id)
    db_session.add(offer)
    await db_session.commit()

    result = await send_manual_review_alert_email(db_session, offer.id)

    assert result is True
    mock_resend.post.assert_called_once()
    _, kwargs = mock_resend.post.call_args
    assert kwargs["json"]["to"] == [merchant.merchant_email]
    assert "action needed" in kwargs["json"]["subject"].lower()


async def test_skips_send_when_resend_not_configured(db_session, monkeypatch):
    monkeypatch.setattr(settings, "RESEND_API_KEY", None)

    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    offer = make_offer(merchant.id)
    db_session.add(offer)
    await db_session.commit()

    result = await send_manual_review_alert_email(db_session, offer.id)

    assert result is True  # never fails the caller


async def test_returns_false_for_missing_offer(db_session, mock_resend):
    import uuid

    result = await send_manual_review_alert_email(db_session, uuid.uuid4())

    assert result is False
    mock_resend.post.assert_not_called()
