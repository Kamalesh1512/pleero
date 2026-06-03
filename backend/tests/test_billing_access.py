"""
Tests for merchant feature entitlement.
"""

from datetime import UTC, datetime, timedelta

from app.models.merchant import Merchant, SubscriptionStatus
from app.services.billing import (
    _status_after_shopify_subscription_removed,
    merchant_has_feature_access,
)


def make_merchant(
    status: SubscriptionStatus,
    *,
    subscription_id: str | None = None,
    trial_ends_at: datetime | None = None,
) -> Merchant:
    return Merchant(
        shop_domain="test.myshopify.com",
        access_token_encrypted=b"token",
        subscription_status=status,
        subscription_id=subscription_id,
        trial_ends_at=trial_ends_at,
        merchant_email="merchant@test.myshopify.com",
        bonus_percentage=10,
        bonus_cap_cents=5000,
        brand_color="#000000",
    )


def test_active_subscription_has_feature_access() -> None:
    merchant = make_merchant(SubscriptionStatus.ACTIVE)

    assert merchant_has_feature_access(merchant) is True


def test_approved_shopify_trial_has_feature_access() -> None:
    merchant = make_merchant(
        SubscriptionStatus.TRIAL,
        subscription_id="gid://shopify/AppSubscription/123",
        trial_ends_at=datetime.now(UTC) - timedelta(days=1),
    )

    assert merchant_has_feature_access(merchant) is True


def test_unapproved_local_trial_has_access_before_trial_end() -> None:
    merchant = make_merchant(
        SubscriptionStatus.TRIAL,
        trial_ends_at=datetime.now(UTC) + timedelta(days=1),
    )

    assert merchant_has_feature_access(merchant) is True


def test_unapproved_local_trial_has_no_access_after_trial_end() -> None:
    merchant = make_merchant(
        SubscriptionStatus.TRIAL,
        trial_ends_at=datetime.now(UTC) - timedelta(days=1),
    )

    assert merchant_has_feature_access(merchant) is False


def test_cancelled_subscription_has_no_feature_access() -> None:
    merchant = make_merchant(SubscriptionStatus.CANCELLED)

    assert merchant_has_feature_access(merchant) is False


def test_subscription_removed_during_trial_preserves_trial_status() -> None:
    merchant = make_merchant(
        SubscriptionStatus.ACTIVE,
        trial_ends_at=datetime.now(UTC) + timedelta(days=1),
    )

    assert (
        _status_after_shopify_subscription_removed(merchant) == SubscriptionStatus.TRIAL
    )


def test_subscription_removed_after_trial_expires_subscription() -> None:
    merchant = make_merchant(
        SubscriptionStatus.ACTIVE,
        trial_ends_at=datetime.now(UTC) - timedelta(days=1),
    )

    assert (
        _status_after_shopify_subscription_removed(merchant)
        == SubscriptionStatus.EXPIRED
    )
