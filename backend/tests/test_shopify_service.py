"""
Tests for the Shopify service layer — refund_to_store_credit and helpers.

Covers:
- refund_to_store_credit: success path and all MANUAL_REVIEW branches
- _cash_refund_already_processed: detects cash refunds, store-credit refunds, unknown state
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from app.services.shopify import (
    RefundActionOutcome,
    _cash_refund_already_processed,
    refund_to_store_credit,
)


# ── Helpers ────────────────────────────────────────────────────────────────────

MERCHANT_ID = uuid.uuid4()
ORDER_ID = "888001"
REFUND_ID = "999001"
CREDIT_CENTS = 11000
CURRENCY = "USD"
IDEMPOTENCY_KEY = uuid.uuid4()
SHOP_DOMAIN = "service-test.myshopify.com"


def _mock_client() -> MagicMock:
    """Return a MagicMock that looks enough like an httpx.AsyncClient."""
    client = MagicMock(spec=httpx.AsyncClient)
    client.aclose = AsyncMock()
    return client


def _make_shopify_client_result(client=None):
    """Return the tuple that get_shopify_client produces."""
    if client is None:
        client = _mock_client()
    return (client, SHOP_DOMAIN, "shpua_test_token")


# ── refund_to_store_credit: success path ──────────────────────────────────────


async def test_refund_to_store_credit_success(db_session):
    """
    Full happy path: no cash refund, line items found, refundCreate succeeds
    → CREDIT_REFUND_CREATED.
    """
    with (
        patch(
            "app.services.shopify.get_shopify_client",
            new=AsyncMock(return_value=_make_shopify_client_result()),
        ),
        patch(
            "app.services.shopify._cash_refund_already_processed",
            new=AsyncMock(return_value=False),
        ),
        patch(
            "app.services.shopify._fetch_refund_line_items",
            new=AsyncMock(
                return_value=[
                    {"lineItemId": "gid://shopify/LineItem/1001", "quantity": 1}
                ]
            ),
        ),
        patch(
            "app.services.shopify._create_store_credit_refund",
            new=AsyncMock(return_value="gid://shopify/Refund/new_999"),
        ),
    ):
        outcome = await refund_to_store_credit(
            db=db_session,
            merchant_id=MERCHANT_ID,
            order_id=ORDER_ID,
            refund_id=REFUND_ID,
            credit_amount_cents=CREDIT_CENTS,
            currency=CURRENCY,
            idempotency_key=IDEMPOTENCY_KEY,
        )

    assert outcome == RefundActionOutcome.CREDIT_REFUND_CREATED


# ── refund_to_store_credit: MANUAL_REVIEW branches ───────────────────────────


async def test_refund_to_store_credit_no_client_is_manual_review(db_session):
    """get_shopify_client returns None (merchant not found) → MANUAL_REVIEW."""
    with patch(
        "app.services.shopify.get_shopify_client",
        new=AsyncMock(return_value=None),
    ):
        outcome = await refund_to_store_credit(
            db=db_session,
            merchant_id=MERCHANT_ID,
            order_id=ORDER_ID,
            refund_id=REFUND_ID,
            credit_amount_cents=CREDIT_CENTS,
            currency=CURRENCY,
            idempotency_key=IDEMPOTENCY_KEY,
        )

    assert outcome == RefundActionOutcome.MANUAL_REVIEW


async def test_refund_to_store_credit_cash_already_processed_is_manual_review(
    db_session,
):
    """A captured cash refund detected on the order → MANUAL_REVIEW (no double-pay)."""
    with (
        patch(
            "app.services.shopify.get_shopify_client",
            new=AsyncMock(return_value=_make_shopify_client_result()),
        ),
        patch(
            "app.services.shopify._cash_refund_already_processed",
            new=AsyncMock(return_value=True),
        ),
    ):
        outcome = await refund_to_store_credit(
            db=db_session,
            merchant_id=MERCHANT_ID,
            order_id=ORDER_ID,
            refund_id=REFUND_ID,
            credit_amount_cents=CREDIT_CENTS,
            currency=CURRENCY,
            idempotency_key=IDEMPOTENCY_KEY,
        )

    assert outcome == RefundActionOutcome.MANUAL_REVIEW


async def test_refund_to_store_credit_unknown_cash_state_is_manual_review(db_session):
    """When the order's refund state cannot be determined (None) → MANUAL_REVIEW."""
    with (
        patch(
            "app.services.shopify.get_shopify_client",
            new=AsyncMock(return_value=_make_shopify_client_result()),
        ),
        patch(
            "app.services.shopify._cash_refund_already_processed",
            new=AsyncMock(return_value=None),
        ),
    ):
        outcome = await refund_to_store_credit(
            db=db_session,
            merchant_id=MERCHANT_ID,
            order_id=ORDER_ID,
            refund_id=REFUND_ID,
            credit_amount_cents=CREDIT_CENTS,
            currency=CURRENCY,
            idempotency_key=IDEMPOTENCY_KEY,
        )

    assert outcome == RefundActionOutcome.MANUAL_REVIEW


async def test_refund_to_store_credit_no_line_items_is_manual_review(db_session):
    """When line-item fetch returns an empty list → MANUAL_REVIEW."""
    with (
        patch(
            "app.services.shopify.get_shopify_client",
            new=AsyncMock(return_value=_make_shopify_client_result()),
        ),
        patch(
            "app.services.shopify._cash_refund_already_processed",
            new=AsyncMock(return_value=False),
        ),
        patch(
            "app.services.shopify._fetch_refund_line_items",
            new=AsyncMock(return_value=[]),
        ),
    ):
        outcome = await refund_to_store_credit(
            db=db_session,
            merchant_id=MERCHANT_ID,
            order_id=ORDER_ID,
            refund_id=REFUND_ID,
            credit_amount_cents=CREDIT_CENTS,
            currency=CURRENCY,
            idempotency_key=IDEMPOTENCY_KEY,
        )

    assert outcome == RefundActionOutcome.MANUAL_REVIEW


async def test_refund_to_store_credit_fetch_returns_none_is_manual_review(db_session):
    """When line-item fetch returns None (API error) → MANUAL_REVIEW."""
    with (
        patch(
            "app.services.shopify.get_shopify_client",
            new=AsyncMock(return_value=_make_shopify_client_result()),
        ),
        patch(
            "app.services.shopify._cash_refund_already_processed",
            new=AsyncMock(return_value=False),
        ),
        patch(
            "app.services.shopify._fetch_refund_line_items",
            new=AsyncMock(return_value=None),
        ),
    ):
        outcome = await refund_to_store_credit(
            db=db_session,
            merchant_id=MERCHANT_ID,
            order_id=ORDER_ID,
            refund_id=REFUND_ID,
            credit_amount_cents=CREDIT_CENTS,
            currency=CURRENCY,
            idempotency_key=IDEMPOTENCY_KEY,
        )

    assert outcome == RefundActionOutcome.MANUAL_REVIEW


async def test_refund_to_store_credit_create_fails_is_manual_review(db_session):
    """When refundCreate returns None (Shopify error) → MANUAL_REVIEW."""
    with (
        patch(
            "app.services.shopify.get_shopify_client",
            new=AsyncMock(return_value=_make_shopify_client_result()),
        ),
        patch(
            "app.services.shopify._cash_refund_already_processed",
            new=AsyncMock(return_value=False),
        ),
        patch(
            "app.services.shopify._fetch_refund_line_items",
            new=AsyncMock(
                return_value=[
                    {"lineItemId": "gid://shopify/LineItem/1001", "quantity": 1}
                ]
            ),
        ),
        patch(
            "app.services.shopify._create_store_credit_refund",
            new=AsyncMock(return_value=None),
        ),
    ):
        outcome = await refund_to_store_credit(
            db=db_session,
            merchant_id=MERCHANT_ID,
            order_id=ORDER_ID,
            refund_id=REFUND_ID,
            credit_amount_cents=CREDIT_CENTS,
            currency=CURRENCY,
            idempotency_key=IDEMPOTENCY_KEY,
        )

    assert outcome == RefundActionOutcome.MANUAL_REVIEW


# ── _cash_refund_already_processed ────────────────────────────────────────────


def _make_get_response(json_body: dict, status_code: int = 200) -> AsyncMock:
    """Build a mock httpx Response for client.get()."""
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status_code
    resp.json = MagicMock(return_value=json_body)
    mock_get = AsyncMock(return_value=resp)
    return mock_get


async def test_cash_refund_detected_by_financial_status():
    """order.financial_status == 'refunded' → True (cash already paid out)."""
    client = _mock_client()
    client.get = _make_get_response(
        {"order": {"financial_status": "refunded", "refunds": []}}
    )

    result = await _cash_refund_already_processed(client, SHOP_DOMAIN, ORDER_ID)

    assert result is True


async def test_cash_refund_detected_by_transaction():
    """A successful non-store-credit REFUND transaction → True."""
    client = _mock_client()
    client.get = _make_get_response(
        {
            "order": {
                "financial_status": "partially_refunded",
                "refunds": [
                    {
                        "transactions": [
                            {
                                "kind": "refund",
                                "status": "success",
                                "gateway": "stripe",
                            }
                        ]
                    }
                ],
            }
        }
    )

    result = await _cash_refund_already_processed(client, SHOP_DOMAIN, ORDER_ID)

    assert result is True


async def test_store_credit_refund_transaction_not_flagged():
    """A successful store_credit gateway REFUND transaction must not block issuance."""
    client = _mock_client()
    client.get = _make_get_response(
        {
            "order": {
                "financial_status": "partially_refunded",
                "refunds": [
                    {
                        "transactions": [
                            {
                                "kind": "refund",
                                "status": "success",
                                "gateway": "shopify_store_credit",
                            }
                        ]
                    }
                ],
            }
        }
    )

    result = await _cash_refund_already_processed(client, SHOP_DOMAIN, ORDER_ID)

    assert result is False


async def test_cash_refund_state_non_200_returns_none():
    """A non-200 response from the order API → None (unknown state → MANUAL_REVIEW)."""
    client = _mock_client()
    client.get = _make_get_response({}, status_code=404)

    result = await _cash_refund_already_processed(client, SHOP_DOMAIN, ORDER_ID)

    assert result is None


async def test_cash_refund_state_http_error_returns_none():
    """An httpx.HTTPError during the order fetch → None."""
    client = _mock_client()
    client.get = AsyncMock(side_effect=httpx.ConnectError("timeout"))

    result = await _cash_refund_already_processed(client, SHOP_DOMAIN, ORDER_ID)

    assert result is None


async def test_no_refunds_on_order_returns_false():
    """An order with no refunds at all → False (no cash has paid out)."""
    client = _mock_client()
    client.get = _make_get_response(
        {
            "order": {
                "financial_status": "paid",
                "refunds": [],
            }
        }
    )

    result = await _cash_refund_already_processed(client, SHOP_DOMAIN, ORDER_ID)

    assert result is False
