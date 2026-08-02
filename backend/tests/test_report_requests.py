"""
Tests for public report request endpoint.
"""

import pytest
from sqlalchemy import select

from app.models.report_request import ReportRequest


def valid_report_payload() -> dict[str, object]:
    """Return a valid report request payload."""
    return {
        "email": "Merchant@Example.com",
        "monthlyCreditIssued": 5000,
        "redemptionRate": 38,
        "source": "landing_report_modal",
    }


@pytest.mark.asyncio
class TestReportRequest:
    """Test POST /api/report-requests endpoint."""

    async def test_create_report_request(self, client, db_session):
        """A valid payload creates a normalized report request."""
        response = await client.post(
            "/api/report-requests", json=valid_report_payload()
        )

        assert response.status_code == 200
        assert response.json()["status"] == "success"

        result = await db_session.execute(select(ReportRequest))
        report_request = result.scalar_one()

        assert report_request.email == "merchant@example.com"
        assert report_request.monthly_credit_issued == 5000
        assert report_request.redemption_rate == 38
        assert report_request.source == "landing_report_modal"

    async def test_report_request_without_optional_numbers(self, client):
        """Email-only report requests are accepted."""
        payload = {
            "email": "solo@example.com",
        }

        response = await client.post("/api/report-requests", json=payload)

        assert response.status_code == 200
        assert response.json()["status"] == "success"

    async def test_invalid_email_rejected(self, client):
        """An invalid email is rejected."""
        payload = valid_report_payload()
        payload["email"] = "not-an-email"

        response = await client.post("/api/report-requests", json=payload)

        assert response.status_code == 422
