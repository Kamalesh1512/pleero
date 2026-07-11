"""
Tests for public waitlist endpoint.
"""

import pytest
from sqlalchemy import select

from app.models.waitlist_submission import WaitlistSubmission


def valid_waitlist_payload() -> dict[str, object]:
    """Return a valid public waitlist payload."""
    return {
        "email": "Merchant@Example.com",
        "storeUrl": "https://example-store.myshopify.com/",
        "businessCategory": "Apparel / Fashion",
        "monthlyOrders": "100-500",
        "currentUseCases": ["Refunds or returns", "Customer service / goodwill"],
        "biggestPain": "Understanding whether Store Credit gets redeemed",
        "openResponse": "I want to know whether credit actually drives repeat purchases.",
        "valuableCapability": "Store Credit analytics and reporting",
        "interviewWillingness": "Maybe",
    }


@pytest.mark.asyncio
class TestWaitlistSubmission:
    """Test POST /api/waitlist endpoint."""

    async def test_create_waitlist_submission(self, client, db_session):
        """A valid payload creates a normalized waitlist submission."""
        response = await client.post("/api/waitlist", json=valid_waitlist_payload())

        assert response.status_code == 200
        assert response.json()["status"] == "success"

        result = await db_session.execute(select(WaitlistSubmission))
        submission = result.scalar_one()

        assert submission.email == "merchant@example.com"
        assert submission.store_url == "example-store.myshopify.com"
        assert submission.business_category == "Apparel / Fashion"
        assert submission.current_use_cases == [
            "Refunds or returns",
            "Customer service / goodwill",
        ]

    async def test_duplicate_email_or_store_returns_conflict(self, client):
        """Duplicate email or store URL is rejected."""
        payload = valid_waitlist_payload()

        first_response = await client.post("/api/waitlist", json=payload)
        assert first_response.status_code == 200

        duplicate_response = await client.post("/api/waitlist", json=payload)
        assert duplicate_response.status_code == 409

    async def test_invalid_choice_returns_validation_error(self, client):
        """Invalid enum-like choices are rejected by the schema."""
        payload = valid_waitlist_payload()
        payload["businessCategory"] = "Unsupported category"

        response = await client.post("/api/waitlist", json=payload)
        assert response.status_code == 422
