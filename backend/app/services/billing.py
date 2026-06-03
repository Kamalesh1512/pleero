"""
Shopify billing service.
Handles recurring charge creation and subscription management.
Hard rule #4: Use httpx (async), never requests (blocking).
Hard rule #5: Never hardcode API version - use settings.SHOPIFY_API_VERSION.
"""

from datetime import UTC, datetime, timedelta
from uuid import UUID

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.logging import get_logger
from app.models.merchant import Merchant, SubscriptionStatus
from app.utils.shopify_auth import get_valid_access_token

logger = get_logger(__name__)

PLAN_NAME = "Pleero - Store Credit Offers"
PLAN_PRICE = 99.0
PLAN_TRIAL_DAYS = 14


def _ensure_aware_utc(value: datetime) -> datetime:
    """Normalize database datetimes before entitlement comparisons."""
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def merchant_has_feature_access(merchant: Merchant) -> bool:
    """
    Return whether Pleero automation should run for this merchant.

    ACTIVE subscriptions always have access. TRIAL is allowed when it is backed
    by an approved Shopify subscription, or while the legacy local trial window
    has not ended.
    """
    if merchant.subscription_status == SubscriptionStatus.ACTIVE:
        return True

    if merchant.subscription_status != SubscriptionStatus.TRIAL:
        return False

    if merchant.subscription_id:
        return True

    if not merchant.trial_ends_at:
        return False

    return _ensure_aware_utc(merchant.trial_ends_at) > datetime.now(UTC)


def _status_after_shopify_subscription_removed(merchant: Merchant) -> SubscriptionStatus:
    """
    Preserve free-trial access after a merchant cancels billing during trial.

    Shopify removes the active subscription immediately after cancellation, but
    Pleero still honors the local trial window until trial_ends_at.
    """
    if (
        merchant.trial_ends_at
        and _ensure_aware_utc(merchant.trial_ends_at) > datetime.now(UTC)
    ):
        return SubscriptionStatus.TRIAL

    return SubscriptionStatus.EXPIRED


def _subscription_status_from_shopify(status: str) -> SubscriptionStatus:
    """Map Shopify AppSubscriptionStatus values to the local enum."""
    normalized_status = status.upper()
    if normalized_status == "ACTIVE":
        return SubscriptionStatus.ACTIVE
    if normalized_status == "PENDING":
        return SubscriptionStatus.TRIAL
    if normalized_status == "CANCELLED":
        return SubscriptionStatus.CANCELLED
    return SubscriptionStatus.EXPIRED


async def fetch_current_app_subscription(
    merchant: Merchant,
    db: AsyncSession,
) -> tuple[SubscriptionStatus, str | None]:
    """
    Fetch the merchant's current app subscription from Shopify.

    Shopify's Billing API uses currentAppInstallation.activeSubscriptions as the
    source of truth after a merchant approves a charge.
    """
    access_token = await get_valid_access_token(merchant, db)

    async with httpx.AsyncClient(
        headers={
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json",
        },
        timeout=30.0,
    ) as client:
        query = """
        query {
            currentAppInstallation {
                activeSubscriptions {
                    id
                    status
                    trialDays
                    currentPeriodEnd
                }
            }
        }
        """

        response = await client.post(
            (
                f"https://{merchant.shop_domain}/admin/api/"
                f"{settings.SHOPIFY_API_VERSION}/graphql.json"
            ),
            json={"query": query},
        )
        response.raise_for_status()
        data = response.json()

    if "errors" in data:
        raise ValueError(f"Shopify GraphQL errors: {data['errors']}")

    subscriptions = (
        data.get("data", {})
        .get("currentAppInstallation", {})
        .get("activeSubscriptions", [])
    )

    if not subscriptions:
        return SubscriptionStatus.EXPIRED, None

    subscription = subscriptions[0]
    return (
        _subscription_status_from_shopify(subscription.get("status", "")),
        subscription.get("id"),
    )


async def sync_merchant_subscription_from_shopify(
    db: AsyncSession,
    merchant: Merchant,
) -> SubscriptionStatus:
    """
    Persist Shopify's current subscription state locally.

    If Shopify cannot be reached, keep the existing local status rather than
    blocking the app on a transient API problem.
    """
    try:
        status, subscription_id = await fetch_current_app_subscription(merchant, db)
    except Exception as e:
        logger.error(
            "subscription_sync_failed",
            shop=merchant.shop_domain,
            merchant_id=str(merchant.id),
            error=str(e),
            exc_info=True,
        )
        return merchant.subscription_status

    if status == SubscriptionStatus.EXPIRED and subscription_id is None:
        status = _status_after_shopify_subscription_removed(merchant)

    merchant.subscription_status = status
    merchant.subscription_id = subscription_id
    if status == SubscriptionStatus.TRIAL and merchant.trial_ends_at is None:
        merchant.trial_ends_at = datetime.now(UTC) + timedelta(days=PLAN_TRIAL_DAYS)

    await db.commit()
    await db.refresh(merchant)

    logger.info(
        "subscription_synced_from_shopify",
        shop=merchant.shop_domain,
        merchant_id=str(merchant.id),
        status=status.value,
        subscription_id=subscription_id,
    )

    return status


async def create_subscription(
    db: AsyncSession,
    merchant_id: UUID,
) -> str | None:
    """
    Create a recurring charge for $99/month with 14-day trial.

    Uses Shopify GraphQL appSubscriptionCreate mutation.

    Args:
        db: Database session
        merchant_id: Merchant ID

    Returns:
        Confirmation URL for merchant to approve charge, or None if failed
    """
    # Load merchant
    result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    merchant = result.scalar_one_or_none()

    if not merchant:
        logger.error("merchant_not_found", merchant_id=str(merchant_id))
        return None

    # Get a valid (auto-refreshed if near expiry) access token
    access_token = await get_valid_access_token(merchant, db)

    # Create authenticated client
    client = httpx.AsyncClient(
        headers={
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json",
        },
        timeout=30.0,
    )

    try:
        # Partner Development Stores require test=true or Shopify returns a user error.
        # Auto-detect by checking plan_name so no manual flag is needed for reviewers.
        use_test_mode = settings.BILLING_TEST_MODE
        try:
            shop_resp = await client.get(
                f"https://{merchant.shop_domain}/admin/api"
                f"/{settings.SHOPIFY_API_VERSION}/shop.json"
            )
            if shop_resp.status_code == 200:
                plan_name = shop_resp.json().get("shop", {}).get("plan_name", "")
                if plan_name == "partner_test":
                    use_test_mode = True
                    logger.info(
                        "billing_test_mode_auto_enabled",
                        merchant_id=str(merchant_id),
                        plan_name=plan_name,
                    )
        except Exception:
            pass  # network hiccup — fall back to settings.BILLING_TEST_MODE

        # GraphQL mutation for recurring charge
        mutation = """
        mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int, $test: Boolean) {
            appSubscriptionCreate(
                name: $name
                lineItems: $lineItems
                returnUrl: $returnUrl
                trialDays: $trialDays
                test: $test
            ) {
                appSubscription {
                    id
                    status
                    trialDays
                }
                confirmationUrl
                userErrors {
                    field
                    message
                }
            }
        }
        """

        variables = {
            "name": PLAN_NAME,
            "lineItems": [
                {
                    "plan": {
                        "appRecurringPricingDetails": {
                            "price": {"amount": PLAN_PRICE, "currencyCode": "USD"},
                            "interval": "EVERY_30_DAYS",
                        }
                    }
                }
            ],
            "returnUrl": (
                f"{settings.API_BASE_URL}/api/billing/callback"
                f"?shop={merchant.shop_domain}"
            ),
            "trialDays": PLAN_TRIAL_DAYS,
            "test": use_test_mode,
        }

        url = (
            f"https://{merchant.shop_domain}/admin/api/"
            f"{settings.SHOPIFY_API_VERSION}/graphql.json"
        )

        response = await client.post(
            url,
            json={"query": mutation, "variables": variables},
        )

        response.raise_for_status()
        data = response.json()

        # Check for GraphQL errors
        if "errors" in data:
            logger.error(
                "create_subscription_graphql_error",
                merchant_id=str(merchant_id),
                errors=data["errors"],
            )
            return None

        result = data.get("data", {}).get("appSubscriptionCreate", {})
        user_errors = result.get("userErrors", [])

        if user_errors:
            error_messages = [e.get("message", "") for e in user_errors]
            logger.error(
                "create_subscription_user_errors",
                merchant_id=str(merchant_id),
                errors=user_errors,
                messages=error_messages,
                billing_test_mode=use_test_mode,
            )
            return None

        confirmation_url: str | None = result.get("confirmationUrl")
        if not confirmation_url:
            logger.error(
                "create_subscription_no_confirmation_url",
                merchant_id=str(merchant_id),
            )
            return None

        # Store subscription ID
        subscription = result.get("appSubscription", {})
        subscription_id: str | None = subscription.get("id")

        if subscription_id:
            merchant.subscription_id = subscription_id

            await db.commit()

        logger.info(
            "subscription_created",
            merchant_id=str(merchant_id),
            subscription_id=subscription_id,
            confirmation_url=confirmation_url,
        )

        return confirmation_url

    except httpx.HTTPError as e:
        logger.error(
            "create_subscription_http_error",
            merchant_id=str(merchant_id),
            error=str(e),
            exc_info=True,
        )
        return None

    except Exception as e:
        logger.error(
            "create_subscription_unexpected_error",
            merchant_id=str(merchant_id),
            error=str(e),
            exc_info=True,
        )
        return None

    finally:
        await client.aclose()


async def cancel_subscription(
    db: AsyncSession,
    merchant_id: UUID,
) -> SubscriptionStatus | None:
    """
    Cancel the merchant's current Shopify app subscription.

    Returns the updated local subscription status, or None if cancellation
    failed before Shopify accepted the mutation.
    """
    result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    merchant = result.scalar_one_or_none()

    if not merchant:
        logger.error("merchant_not_found", merchant_id=str(merchant_id))
        return None

    await sync_merchant_subscription_from_shopify(db, merchant)
    if not merchant.subscription_id:
        logger.info(
            "cancel_subscription_no_active_subscription",
            merchant_id=str(merchant_id),
            shop=merchant.shop_domain,
        )
        merchant.subscription_status = _status_after_shopify_subscription_removed(merchant)
        await db.commit()
        return merchant.subscription_status

    access_token = await get_valid_access_token(merchant, db)

    async with httpx.AsyncClient(
        headers={
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json",
        },
        timeout=30.0,
    ) as client:
        mutation = """
        mutation AppSubscriptionCancel($id: ID!, $prorate: Boolean) {
            appSubscriptionCancel(id: $id, prorate: $prorate) {
                userErrors {
                    field
                    message
                }
                appSubscription {
                    id
                    status
                }
            }
        }
        """

        response = await client.post(
            (
                f"https://{merchant.shop_domain}/admin/api/"
                f"{settings.SHOPIFY_API_VERSION}/graphql.json"
            ),
            json={
                "query": mutation,
                "variables": {
                    "id": merchant.subscription_id,
                    "prorate": True,
                },
            },
        )
        response.raise_for_status()
        data = response.json()

    if "errors" in data:
        logger.error(
            "cancel_subscription_graphql_error",
            merchant_id=str(merchant_id),
            errors=data["errors"],
        )
        return None

    result_data = data.get("data", {}).get("appSubscriptionCancel", {})
    user_errors = result_data.get("userErrors", [])
    if user_errors:
        logger.error(
            "cancel_subscription_user_errors",
            merchant_id=str(merchant_id),
            errors=user_errors,
        )
        return None

    subscription = result_data.get("appSubscription") or {}
    status = _subscription_status_from_shopify(subscription.get("status", "CANCELLED"))
    if status == SubscriptionStatus.CANCELLED:
        status = _status_after_shopify_subscription_removed(merchant)

    merchant.subscription_status = status
    merchant.subscription_id = None
    await db.commit()
    await db.refresh(merchant)

    logger.info(
        "subscription_cancelled",
        merchant_id=str(merchant_id),
        shop=merchant.shop_domain,
        subscription_id=merchant.subscription_id,
        status=status.value,
    )

    return status


async def get_subscription_status(
    db: AsyncSession,
    merchant_id: UUID,
) -> SubscriptionStatus:
    """
    Get current subscription status from Shopify.

    Queries active subscriptions via GraphQL.

    Args:
        db: Database session
        merchant_id: Merchant ID

    Returns:
        Subscription status (ACTIVE, TRIAL, CANCELLED, EXPIRED)
    """
    # Load merchant
    result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    merchant = result.scalar_one_or_none()

    if not merchant:
        logger.error("merchant_not_found", merchant_id=str(merchant_id))
        return SubscriptionStatus.CANCELLED

    try:
        status, _subscription_id = await fetch_current_app_subscription(merchant, db)
        return status

    except httpx.HTTPError as e:
        logger.error(
            "get_subscription_status_http_error",
            merchant_id=str(merchant_id),
            error=str(e),
            exc_info=True,
        )
        return merchant.subscription_status

    except Exception as e:
        logger.error(
            "get_subscription_status_unexpected_error",
            merchant_id=str(merchant_id),
            error=str(e),
            exc_info=True,
        )
        return merchant.subscription_status


async def update_merchant_subscription(
    db: AsyncSession,
    merchant_id: UUID,
    status: SubscriptionStatus,
    subscription_id: str | None = None,
) -> bool:
    """
    Update merchant subscription status in database.

    Args:
        db: Database session
        merchant_id: Merchant ID
        status: New subscription status
        subscription_id: Shopify subscription ID (optional)

    Returns:
        True if successful, False otherwise
    """
    try:
        # Load merchant
        result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
        merchant = result.scalar_one_or_none()

        if not merchant:
            logger.error("merchant_not_found", merchant_id=str(merchant_id))
            return False

        # Update status
        merchant.subscription_status = status

        if subscription_id:
            merchant.subscription_id = subscription_id

        await db.commit()

        logger.info(
            "merchant_subscription_updated",
            merchant_id=str(merchant_id),
            status=status.value,
        )

        return True

    except Exception as e:
        logger.error(
            "update_merchant_subscription_error",
            merchant_id=str(merchant_id),
            error=str(e),
            exc_info=True,
        )
        return False
