"""
Shopify billing service.
Handles recurring charge creation and subscription management.
Hard rule #4: Use httpx (async), never requests (blocking).
Hard rule #5: Never hardcode API version - use settings.SHOPIFY_API_VERSION.
"""

from uuid import UUID

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.encryption import decrypt_token
from app.core.logging import get_logger
from app.models.merchant import Merchant, SubscriptionStatus

logger = get_logger(__name__)


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

    # Decrypt access token
    access_token = decrypt_token(merchant.access_token_encrypted)

    # Create authenticated client
    client = httpx.AsyncClient(
        headers={
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json",
        },
        timeout=30.0,
    )

    try:
        # GraphQL mutation for recurring charge
        mutation = """
        mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: String!, $trialDays: Int) {
            appSubscriptionCreate(
                name: $name
                lineItems: $lineItems
                returnUrl: $returnUrl
                trialDays: $trialDays
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
            "name": "Pleero - Store Credit Offers",
            "lineItems": [
                {
                    "plan": {
                        "appRecurringPricingDetails": {
                            "price": {"amount": 99.0, "currencyCode": "USD"},
                            "interval": "EVERY_30_DAYS",
                        }
                    }
                }
            ],
            "returnUrl": f"{settings.API_BASE_URL}/api/billing/callback",
            "trialDays": 14,
        }

        url = f"https://{merchant.shop_domain}/admin/api/{settings.SHOPIFY_API_VERSION}/graphql.json"

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
            logger.error(
                "create_subscription_user_errors",
                merchant_id=str(merchant_id),
                errors=user_errors,
            )
            return None

        confirmation_url = result.get("confirmationUrl")
        if not confirmation_url:
            logger.error(
                "create_subscription_no_confirmation_url",
                merchant_id=str(merchant_id),
            )
            return None

        # Store subscription ID
        subscription = result.get("appSubscription", {})
        subscription_id = subscription.get("id")

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

    # Decrypt access token
    access_token = decrypt_token(merchant.access_token_encrypted)

    # Create authenticated client
    client = httpx.AsyncClient(
        headers={
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json",
        },
        timeout=30.0,
    )

    try:
        # GraphQL query for current subscription
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

        url = f"https://{merchant.shop_domain}/admin/api/{settings.SHOPIFY_API_VERSION}/graphql.json"

        response = await client.post(
            url,
            json={"query": query},
        )

        response.raise_for_status()
        data = response.json()

        # Check for errors
        if "errors" in data:
            logger.error(
                "get_subscription_status_graphql_error",
                merchant_id=str(merchant_id),
                errors=data["errors"],
            )
            return merchant.subscription_status

        installation = data.get("data", {}).get("currentAppInstallation", {})
        subscriptions = installation.get("activeSubscriptions", [])

        if not subscriptions:
            # No active subscription
            return SubscriptionStatus.EXPIRED

        subscription = subscriptions[0]
        status = subscription.get("status", "").upper()

        # Map Shopify status to our enum
        if status == "ACTIVE":
            return SubscriptionStatus.ACTIVE
        elif status == "PENDING":
            # During trial
            return SubscriptionStatus.TRIAL
        elif status == "CANCELLED":
            return SubscriptionStatus.CANCELLED
        else:
            return SubscriptionStatus.EXPIRED

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

    finally:
        await client.aclose()


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
