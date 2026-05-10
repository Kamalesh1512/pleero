"""
Tests for webhook handlers.
Covers HMAC verification, offer creation, and skip conditions.
"""

import pytest
import hmac
import hashlib
import base64
from unittest.mock import patch, AsyncMock

from app.models.merchant import Merchant, SubscriptionStatus
from app.utils.shopify_webhooks import (
    verify_webhook_hmac,
    parse_refund_webhook,
    should_skip_offer,
)


class TestWebhookHMACVerification:
    """Test webhook HMAC verification (Hard rule #1)."""

    def test_valid_hmac(self):
        """Test that valid HMAC is accepted."""
        secret = "test_secret"
        body = b'{"test": "data"}'

        # Compute valid HMAC
        computed_hmac = base64.b64encode(
            hmac.new(secret.encode(), body, hashlib.sha256).digest()
        ).decode()

        # Verify
        assert verify_webhook_hmac(body, computed_hmac, secret) is True

    def test_invalid_hmac_rejected(self):
        """Test that invalid HMAC is rejected."""
        secret = "test_secret"
        body = b'{"test": "data"}'
        invalid_hmac = "invalid_hmac_value"

        # Verify rejects
        assert verify_webhook_hmac(body, invalid_hmac, secret) is False

    def test_missing_hmac_header(self):
        """Test that missing HMAC header is rejected."""
        secret = "test_secret"
        body = b'{"test": "data"}'

        # Verify rejects None
        assert verify_webhook_hmac(body, None, secret) is False
        assert verify_webhook_hmac(body, "", secret) is False

    def test_tampered_body_rejected(self):
        """Test that tampered body fails verification."""
        secret = "test_secret"
        original_body = b'{"test": "data"}'
        tampered_body = b'{"test": "hacked"}'

        # Compute HMAC for original
        valid_hmac = base64.b64encode(
            hmac.new(secret.encode(), original_body, hashlib.sha256).digest()
        ).decode()

        # Verify tampered body fails
        assert verify_webhook_hmac(tampered_body, valid_hmac, secret) is False


class TestRefundWebhookParsing:
    """Test refund webhook payload parsing."""

    def test_parse_valid_webhook(self, mock_refund_webhook_payload):
        """Test parsing valid webhook payload."""
        webhook_data = parse_refund_webhook(mock_refund_webhook_payload)

        assert webhook_data.refund_id == "123456789"
        assert webhook_data.order_id == "987654321"
        assert webhook_data.customer_email == "customer@example.com"
        assert webhook_data.customer_first_name == "John"
        assert webhook_data.customer_country == "US"
        assert webhook_data.refund_amount_cents == 10000  # $100

    def test_parse_webhook_missing_customer(self):
        """Test parsing webhook with missing customer data."""
        payload = {
            "id": 123,
            "order_id": 456,
            "refund_line_items": [
                {"id": 1, "subtotal": "50.00", "total_tax": "5.00"}
            ],
            "order": {},
        }

        webhook_data = parse_refund_webhook(payload)

        assert webhook_data.refund_id == "123"
        assert webhook_data.customer_email == ""
        assert webhook_data.customer_first_name == ""

    def test_parse_webhook_multiple_line_items(self):
        """Test parsing webhook with multiple refund line items."""
        payload = {
            "id": 123,
            "order_id": 456,
            "refund_line_items": [
                {"id": 1, "subtotal": "50.00", "total_tax": "5.00"},
                {"id": 2, "subtotal": "30.00", "total_tax": "3.00"},
                {"id": 3, "subtotal": "20.00", "total_tax": "2.00"},
            ],
            "order": {
                "customer": {
                    "email": "test@example.com",
                    "first_name": "Test",
                }
            },
        }

        webhook_data = parse_refund_webhook(payload)

        # Total: $50 + $30 + $20 = $100
        assert webhook_data.refund_amount_cents == 10000


class TestOfferSkipLogic:
    """Test offer skip conditions."""

    def test_skip_defective_return(self, mock_refund_webhook_payload):
        """Test that defective returns are skipped."""
        # Add defective return reason
        mock_refund_webhook_payload["refund_line_items"][0][
            "return_reason"
        ] = "defective"

        webhook_data = parse_refund_webhook(mock_refund_webhook_payload)
        should_skip, reason = should_skip_offer(
            webhook_data, SubscriptionStatus.ACTIVE
        )

        assert should_skip is True
        assert reason == "defective_item"

    def test_skip_non_us_customer(self, mock_refund_webhook_payload):
        """Test that non-US customers are skipped (Hard rule #10)."""
        # Change country to Canada
        mock_refund_webhook_payload["order"]["customer"]["default_address"][
            "country_code"
        ] = "CA"

        webhook_data = parse_refund_webhook(mock_refund_webhook_payload)
        should_skip, reason = should_skip_offer(
            webhook_data, SubscriptionStatus.ACTIVE
        )

        assert should_skip is True
        assert reason == "non_us_customer"

    def test_skip_inactive_subscription(self, mock_refund_webhook_payload):
        """Test that inactive subscriptions are skipped."""
        webhook_data = parse_refund_webhook(mock_refund_webhook_payload)

        # Test with CANCELLED status
        should_skip, reason = should_skip_offer(
            webhook_data, SubscriptionStatus.CANCELLED
        )
        assert should_skip is True
        assert reason == "inactive_subscription"

        # Test with EXPIRED status
        should_skip, reason = should_skip_offer(
            webhook_data, SubscriptionStatus.EXPIRED
        )
        assert should_skip is True
        assert reason == "inactive_subscription"

    def test_skip_no_email(self, mock_refund_webhook_payload):
        """Test that customers without email are skipped."""
        # Remove email
        mock_refund_webhook_payload["order"]["customer"]["email"] = ""

        webhook_data = parse_refund_webhook(mock_refund_webhook_payload)
        should_skip, reason = should_skip_offer(
            webhook_data, SubscriptionStatus.ACTIVE
        )

        assert should_skip is True
        assert reason == "no_email"

    def test_skip_zero_amount(self, mock_refund_webhook_payload):
        """Test that zero-amount refunds are skipped."""
        # Set refund amount to zero
        mock_refund_webhook_payload["refund_line_items"][0]["subtotal"] = "0.00"

        webhook_data = parse_refund_webhook(mock_refund_webhook_payload)
        should_skip, reason = should_skip_offer(
            webhook_data, SubscriptionStatus.ACTIVE
        )

        assert should_skip is True
        assert reason == "zero_amount"

    def test_do_not_skip_valid_refund(self, mock_refund_webhook_payload):
        """Test that valid refunds are NOT skipped."""
        webhook_data = parse_refund_webhook(mock_refund_webhook_payload)
        should_skip, reason = should_skip_offer(
            webhook_data, SubscriptionStatus.ACTIVE
        )

        assert should_skip is False
        assert reason == ""

    def test_trial_subscription_allowed(self, mock_refund_webhook_payload):
        """Test that TRIAL subscriptions are allowed."""
        webhook_data = parse_refund_webhook(mock_refund_webhook_payload)
        should_skip, reason = should_skip_offer(
            webhook_data, SubscriptionStatus.TRIAL
        )

        assert should_skip is False
        assert reason == ""


@pytest.mark.asyncio
class TestWebhookEndpoint:
    """Test webhook endpoint integration."""

    async def test_webhook_creates_offer(
        self, client, db_session, mock_refund_webhook_payload
    ):
        """Test that valid webhook creates offer."""
        # Create merchant first
        merchant = Merchant(
            shop_domain="test.myshopify.com",
            access_token_encrypted=b"encrypted_token",
            merchant_email="merchant@test.com",
            subscription_status=SubscriptionStatus.ACTIVE,
            bonus_percentage=10,
            bonus_cap_cents=5000,
            brand_color="#000000",
        )
        db_session.add(merchant)
        await db_session.commit()

        # Mock HMAC verification
        with patch(
            "app.routers.webhooks.verify_webhook_hmac", return_value=True
        ):
            # Mock email sending
            with patch("app.routers.webhooks.send_offer_email", new_callable=AsyncMock):
                response = await client.post(
                    "/webhooks/refunds/create",
                    json=mock_refund_webhook_payload,
                    headers={
                        "X-Shopify-Shop-Domain": "test.myshopify.com",
                        "X-Shopify-Hmac-Sha256": "valid_hmac",
                    },
                )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "offer_id" in data

    async def test_webhook_invalid_hmac_rejected(self, client, mock_refund_webhook_payload):
        """Test that webhook with invalid HMAC is rejected."""
        # Mock HMAC verification to fail
        with patch(
            "app.routers.webhooks.verify_webhook_hmac", return_value=False
        ):
            response = await client.post(
                "/webhooks/refunds/create",
                json=mock_refund_webhook_payload,
                headers={
                    "X-Shopify-Shop-Domain": "test.myshopify.com",
                    "X-Shopify-Hmac-Sha256": "invalid_hmac",
                },
            )

        assert response.status_code == 401

    async def test_webhook_skips_defective_return(
        self, client, db_session, mock_refund_webhook_payload
    ):
        """Test that defective returns are skipped."""
        # Create merchant
        merchant = Merchant(
            shop_domain="test.myshopify.com",
            access_token_encrypted=b"encrypted_token",
            merchant_email="merchant@test.com",
            subscription_status=SubscriptionStatus.ACTIVE,
            bonus_percentage=10,
            bonus_cap_cents=5000,
            brand_color="#000000",
        )
        db_session.add(merchant)
        await db_session.commit()

        # Add defective reason
        mock_refund_webhook_payload["refund_line_items"][0][
            "return_reason"
        ] = "defective"

        with patch(
            "app.routers.webhooks.verify_webhook_hmac", return_value=True
        ):
            response = await client.post(
                "/webhooks/refunds/create",
                json=mock_refund_webhook_payload,
                headers={
                    "X-Shopify-Shop-Domain": "test.myshopify.com",
                    "X-Shopify-Hmac-Sha256": "valid_hmac",
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "skipped"
        assert data["reason"] == "defective_item"
