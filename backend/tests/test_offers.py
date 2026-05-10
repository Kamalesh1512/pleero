"""
Tests for offer endpoints.
Covers offer viewing, accepting, and declining.
"""

import pytest
from unittest.mock import patch, AsyncMock
from datetime import datetime, UTC

from app.models.merchant import Merchant, SubscriptionStatus
from app.models.offer import Offer, OfferStatus


@pytest.mark.asyncio
class TestGetOffer:
    """Test GET /offers/{token} endpoint."""

    async def test_get_valid_pending_offer(self, client, db_session):
        """Test retrieving a valid pending offer."""
        # Create merchant
        merchant = Merchant(
            shop_domain="test.myshopify.com",
            access_token_encrypted=b"encrypted_token",
            merchant_email="merchant@test.com",
            subscription_status=SubscriptionStatus.ACTIVE,
            bonus_percentage=10,
            bonus_cap_cents=5000,
            brand_color="#000000",
            logo_url="https://example.com/logo.png",
        )
        db_session.add(merchant)
        await db_session.flush()

        # Create offer
        offer = Offer(
            merchant_id=merchant.id,
            shopify_refund_id="123456",
            shopify_order_id="789",
            customer_email="customer@example.com",
            customer_first_name="John",
            refund_amount_cents=10000,
            credit_amount_cents=11000,
            bonus_applied_cents=1000,
            status=OfferStatus.PENDING,
        )
        db_session.add(offer)
        await db_session.commit()

        # Get offer
        response = await client.get(f"/offers/{offer.offer_token}")

        assert response.status_code == 200
        data = response.json()
        assert data["offer_token"] == offer.offer_token
        assert data["customer_first_name"] == "John"
        assert data["refund_amount_cents"] == 10000
        assert data["credit_amount_cents"] == 11000
        assert data["bonus_applied_cents"] == 1000
        assert data["status"] == "PENDING"
        assert data["merchant_logo_url"] == "https://example.com/logo.png"
        assert data["merchant_brand_color"] == "#000000"

    async def test_get_nonexistent_offer(self, client):
        """Test retrieving non-existent offer returns 404."""
        response = await client.get("/offers/nonexistent-token")
        assert response.status_code == 404

    async def test_get_accepted_offer_returns_410(self, client, db_session):
        """Test that already-accepted offer returns 410 Gone."""
        # Create merchant and offer
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
        await db_session.flush()

        offer = Offer(
            merchant_id=merchant.id,
            shopify_refund_id="123456",
            shopify_order_id="789",
            customer_email="customer@example.com",
            customer_first_name="John",
            refund_amount_cents=10000,
            credit_amount_cents=11000,
            bonus_applied_cents=1000,
            status=OfferStatus.ACCEPTED,
            accepted_at=datetime.now(UTC),
        )
        db_session.add(offer)
        await db_session.commit()

        response = await client.get(f"/offers/{offer.offer_token}")
        assert response.status_code == 410


@pytest.mark.asyncio
class TestAcceptOffer:
    """Test POST /offers/{token}/accept endpoint."""

    async def test_accept_offer_issues_credit(self, client, db_session):
        """Test that accepting offer issues store credit."""
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
        await db_session.flush()

        # Create offer
        offer = Offer(
            merchant_id=merchant.id,
            shopify_refund_id="123456",
            shopify_order_id="789",
            customer_email="customer@example.com",
            customer_first_name="John",
            refund_amount_cents=10000,
            credit_amount_cents=11000,
            bonus_applied_cents=1000,
            status=OfferStatus.PENDING,
        )
        db_session.add(offer)
        await db_session.commit()

        # Mock Shopify API calls
        with patch(
            "app.routers.offers.issue_store_credit",
            new_callable=AsyncMock,
            return_value=True,
        ):
            with patch(
                "app.routers.offers.cancel_refund",
                new_callable=AsyncMock,
                return_value=True,
            ):
                response = await client.post(f"/offers/{offer.offer_token}/accept")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "credit" in data["message"].lower()

        # Verify offer status updated
        await db_session.refresh(offer)
        assert offer.status == OfferStatus.ACCEPTED
        assert offer.accepted_at is not None

    async def test_accept_offer_twice_is_idempotent(self, client, db_session):
        """Test that accepting same offer twice is idempotent."""
        # Create merchant and offer
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
        await db_session.flush()

        offer = Offer(
            merchant_id=merchant.id,
            shopify_refund_id="123456",
            shopify_order_id="789",
            customer_email="customer@example.com",
            customer_first_name="John",
            refund_amount_cents=10000,
            credit_amount_cents=11000,
            bonus_applied_cents=1000,
            status=OfferStatus.ACCEPTED,  # Already accepted
            accepted_at=datetime.now(UTC),
        )
        db_session.add(offer)
        await db_session.commit()

        # Accept again
        response = await client.post(f"/offers/{offer.offer_token}/accept")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "already accepted" in data["message"].lower()

    async def test_accept_declined_offer_fails(self, client, db_session):
        """Test that accepting a declined offer fails."""
        # Create merchant and declined offer
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
        await db_session.flush()

        offer = Offer(
            merchant_id=merchant.id,
            shopify_refund_id="123456",
            shopify_order_id="789",
            customer_email="customer@example.com",
            customer_first_name="John",
            refund_amount_cents=10000,
            credit_amount_cents=11000,
            bonus_applied_cents=1000,
            status=OfferStatus.DECLINED,
            declined_at=datetime.now(UTC),
        )
        db_session.add(offer)
        await db_session.commit()

        response = await client.post(f"/offers/{offer.offer_token}/accept")
        assert response.status_code == 410

    async def test_accept_offer_credit_fails(self, client, db_session):
        """Test handling when store credit issuance fails."""
        # Create merchant and offer
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
        await db_session.flush()

        offer = Offer(
            merchant_id=merchant.id,
            shopify_refund_id="123456",
            shopify_order_id="789",
            customer_email="customer@example.com",
            customer_first_name="John",
            refund_amount_cents=10000,
            credit_amount_cents=11000,
            bonus_applied_cents=1000,
            status=OfferStatus.PENDING,
        )
        db_session.add(offer)
        await db_session.commit()

        # Mock credit issuance failure
        with patch(
            "app.routers.offers.issue_store_credit",
            new_callable=AsyncMock,
            return_value=False,
        ):
            response = await client.post(f"/offers/{offer.offer_token}/accept")

        assert response.status_code == 500

        # Verify offer status NOT updated
        await db_session.refresh(offer)
        assert offer.status == OfferStatus.PENDING


@pytest.mark.asyncio
class TestDeclineOffer:
    """Test POST /offers/{token}/decline endpoint."""

    async def test_decline_offer(self, client, db_session):
        """Test declining an offer."""
        # Create merchant and offer
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
        await db_session.flush()

        offer = Offer(
            merchant_id=merchant.id,
            shopify_refund_id="123456",
            shopify_order_id="789",
            customer_email="customer@example.com",
            customer_first_name="John",
            refund_amount_cents=10000,
            credit_amount_cents=11000,
            bonus_applied_cents=1000,
            status=OfferStatus.PENDING,
        )
        db_session.add(offer)
        await db_session.commit()

        response = await client.post(f"/offers/{offer.offer_token}/decline")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "refund" in data["message"].lower()

        # Verify offer status updated
        await db_session.refresh(offer)
        assert offer.status == OfferStatus.DECLINED
        assert offer.declined_at is not None

    async def test_decline_accepted_offer_fails(self, client, db_session):
        """Test that declining an accepted offer fails."""
        # Create merchant and accepted offer
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
        await db_session.flush()

        offer = Offer(
            merchant_id=merchant.id,
            shopify_refund_id="123456",
            shopify_order_id="789",
            customer_email="customer@example.com",
            customer_first_name="John",
            refund_amount_cents=10000,
            credit_amount_cents=11000,
            bonus_applied_cents=1000,
            status=OfferStatus.ACCEPTED,
            accepted_at=datetime.now(UTC),
        )
        db_session.add(offer)
        await db_session.commit()

        response = await client.post(f"/offers/{offer.offer_token}/decline")
        assert response.status_code == 410

    async def test_decline_nonexistent_offer(self, client):
        """Test declining non-existent offer returns 404."""
        response = await client.post("/offers/nonexistent-token/decline")
        assert response.status_code == 404
