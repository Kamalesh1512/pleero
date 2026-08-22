"""
Tests for dashboard/merchant-facing offer list endpoints.

Focused on the MANUAL_REVIEW visibility work: refund_status exposed on the
offers list, the needs_review filter, and the offers_needing_review metric.
"""

import pytest
import pytest_asyncio
from datetime import datetime, UTC

from app.main import app
from app.models.merchant import Merchant, SubscriptionStatus
from app.models.offer import Offer, OfferStatus, RefundStatus
from app.utils.session_auth import get_current_shop


@pytest_asyncio.fixture
async def authed_client(client):
    """Test client with get_current_shop overridden to a fixed shop domain."""

    async def override_get_current_shop() -> str:
        return "test.myshopify.com"

    app.dependency_overrides[get_current_shop] = override_get_current_shop
    yield client
    del app.dependency_overrides[get_current_shop]


async def _create_merchant(db_session) -> Merchant:
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
    return merchant


def _make_offer(
    merchant_id,
    refund_id: str,
    refund_status: RefundStatus,
    status: OfferStatus = OfferStatus.PENDING,
) -> Offer:
    return Offer(
        merchant_id=merchant_id,
        shopify_refund_id=refund_id,
        shopify_order_id="789",
        customer_email="customer@example.com",
        customer_first_name="John",
        refund_amount_cents=10000,
        credit_amount_cents=11000,
        bonus_applied_cents=1000,
        status=status,
        refund_status=refund_status,
        accepted_at=datetime.now(UTC) if status == OfferStatus.ACCEPTED else None,
    )


@pytest.mark.asyncio
class TestMerchantOffersList:
    """Test GET /api/offers endpoint."""

    async def test_offer_list_exposes_refund_status(self, authed_client, db_session):
        merchant = await _create_merchant(db_session)
        offer = _make_offer(
            merchant.id, "1", RefundStatus.CREDIT_REFUND_CREATED, OfferStatus.ACCEPTED
        )
        db_session.add(offer)
        await db_session.commit()

        response = await authed_client.get("/api/offers")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["offers"][0]["refund_status"] == "CREDIT_REFUND_CREATED"

    async def test_needs_review_filter_returns_only_manual_review_offers(
        self, authed_client, db_session
    ):
        merchant = await _create_merchant(db_session)
        db_session.add(
            _make_offer(
                merchant.id,
                "1",
                RefundStatus.CREDIT_REFUND_CREATED,
                OfferStatus.ACCEPTED,
            )
        )
        db_session.add(_make_offer(merchant.id, "2", RefundStatus.MANUAL_REVIEW))
        db_session.add(_make_offer(merchant.id, "3", RefundStatus.PENDING))
        await db_session.commit()

        response = await authed_client.get("/api/offers?needs_review=true")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["offers"][0]["refund_status"] == "MANUAL_REVIEW"

    async def test_offer_list_without_filter_returns_all_offers(
        self, authed_client, db_session
    ):
        merchant = await _create_merchant(db_session)
        db_session.add(
            _make_offer(
                merchant.id,
                "1",
                RefundStatus.CREDIT_REFUND_CREATED,
                OfferStatus.ACCEPTED,
            )
        )
        db_session.add(_make_offer(merchant.id, "2", RefundStatus.MANUAL_REVIEW))
        await db_session.commit()

        response = await authed_client.get("/api/offers")

        assert response.status_code == 200
        assert response.json()["total"] == 2


@pytest.mark.asyncio
class TestDashboardMetrics:
    """Test GET /api/dashboard/metrics endpoint."""

    async def test_offers_needing_review_counts_manual_review_offers(
        self, authed_client, db_session
    ):
        merchant = await _create_merchant(db_session)
        db_session.add(_make_offer(merchant.id, "1", RefundStatus.MANUAL_REVIEW))
        db_session.add(_make_offer(merchant.id, "2", RefundStatus.MANUAL_REVIEW))
        db_session.add(
            _make_offer(
                merchant.id,
                "3",
                RefundStatus.CREDIT_REFUND_CREATED,
                OfferStatus.ACCEPTED,
            )
        )
        await db_session.commit()

        response = await authed_client.get("/api/dashboard/metrics")

        assert response.status_code == 200
        assert response.json()["offers_needing_review"] == 2

    async def test_offers_needing_review_zero_when_none_pending(
        self, authed_client, db_session
    ):
        merchant = await _create_merchant(db_session)
        db_session.add(
            _make_offer(
                merchant.id,
                "1",
                RefundStatus.CREDIT_REFUND_CREATED,
                OfferStatus.ACCEPTED,
            )
        )
        await db_session.commit()

        response = await authed_client.get("/api/dashboard/metrics")

        assert response.status_code == 200
        assert response.json()["offers_needing_review"] == 0
