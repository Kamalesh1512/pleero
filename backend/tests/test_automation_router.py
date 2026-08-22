"""
Router-level smoke test for POST /api/automation/winback/issue.

Service-level behavior (validation, CreditTransaction tagging) is covered by
test_automation.py's issue_winback_credit tests — this just confirms the
FastAPI route/schema wiring is correct end-to-end.
"""

from unittest.mock import AsyncMock, patch

import pytest_asyncio

from app.main import app
from app.models.merchant import Merchant, SubscriptionStatus
from app.utils.session_auth import get_current_shop


@pytest_asyncio.fixture
async def authed_client(client):
    async def override_get_current_shop() -> str:
        return "winback-router.myshopify.com"

    app.dependency_overrides[get_current_shop] = override_get_current_shop
    yield client
    del app.dependency_overrides[get_current_shop]


async def test_winback_issue_endpoint_success(authed_client, db_session):
    merchant = Merchant(
        shop_domain="winback-router.myshopify.com",
        access_token_encrypted=b"encrypted_token",
        merchant_email="merchant@winback-router.com",
        subscription_status=SubscriptionStatus.ACTIVE,
        bonus_percentage=10,
        bonus_cap_cents=5000,
        brand_color="#000000",
    )
    db_session.add(merchant)
    await db_session.commit()

    with patch(
        "app.services.automation.issue_store_credit",
        new=AsyncMock(return_value=True),
    ):
        response = await authed_client.post(
            "/api/automation/winback/issue",
            json={"customer_email": "inactive@example.com", "amount_cents": 2500},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
