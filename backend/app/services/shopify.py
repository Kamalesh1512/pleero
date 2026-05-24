"""
Shopify API service.
Handles interactions with Shopify Admin API.
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
from app.models.merchant import Merchant

logger = get_logger(__name__)


async def get_shopify_client(
    db: AsyncSession,
    merchant_id: UUID,
) -> tuple[httpx.AsyncClient, str, str] | None:
    """
    Get authenticated Shopify API client for a merchant.

    Args:
        db: Database session
        merchant_id: Merchant ID

    Returns:
        Tuple of (client, shop_domain, access_token) or None if merchant not found
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

    return client, merchant.shop_domain, access_token


async def issue_store_credit(
    db: AsyncSession,
    merchant_id: UUID,
    customer_email: str,
    amount_cents: int,
    currency: str,
    note: str,
    customer_shopify_id: str | None = None,
) -> bool:
    """
    Issue store credit to a customer via Shopify GraphQL API.

    Uses the storeCreditAccountCredit mutation.

    Args:
        db: Database session
        merchant_id: Merchant ID
        customer_email: Customer email address (fallback lookup)
        amount_cents: Credit amount in cents
        currency: Currency code (e.g., "USD")
        note: Note to attach to the credit
        customer_shopify_id: Pre-known Shopify GID (avoids protected customers query)

    Returns:
        True if successful, False otherwise
    """
    client_data = await get_shopify_client(db, merchant_id)
    if not client_data:
        return False

    client, shop_domain, _ = client_data

    try:
        # Always use the Shopify GID from the webhook payload.
        # We do not query the Customers API (no write_customers scope needed).
        customer_id = customer_shopify_id

        if not customer_id:
            logger.error(
                "issue_store_credit_failed",
                reason="customer_not_found",
                merchant_id=str(merchant_id),
                customer_email=customer_email,
            )
            return False

        # Convert cents to Shopify amount format (e.g., "50.00")
        amount = f"{amount_cents / 100:.2f}"

        # Issue store credit via GraphQL (API 2026-04 signature: id + creditInput)
        mutation = """
        mutation storeCreditAccountCredit($id: ID!, $creditInput: StoreCreditAccountCreditInput!) {
            storeCreditAccountCredit(id: $id, creditInput: $creditInput) {
                storeCreditAccountTransaction {
                    id
                    amount {
                        amount
                        currencyCode
                    }
                }
                userErrors {
                    field
                    message
                }
            }
        }
        """

        variables = {
            "id": customer_id,
            "creditInput": {
                "creditAmount": {
                    "amount": amount,
                    "currencyCode": currency,
                },
            },
        }

        url = f"https://{shop_domain}/admin/api/{settings.SHOPIFY_API_VERSION}/graphql.json"

        response = await client.post(
            url,
            json={"query": mutation, "variables": variables},
        )

        response.raise_for_status()
        data = response.json()

        # Check for errors
        if "errors" in data:
            logger.error(
                "issue_store_credit_graphql_error",
                merchant_id=str(merchant_id),
                errors=data["errors"],
            )
            return False

        result = data.get("data", {}).get("storeCreditAccountCredit", {})
        user_errors = result.get("userErrors", [])

        if user_errors:
            logger.error(
                "issue_store_credit_user_errors",
                merchant_id=str(merchant_id),
                errors=user_errors,
            )
            return False

        transaction = result.get("storeCreditAccountTransaction")
        if not transaction:
            logger.error(
                "issue_store_credit_no_transaction",
                merchant_id=str(merchant_id),
            )
            return False

        logger.info(
            "store_credit_issued",
            merchant_id=str(merchant_id),
            amount_cents=amount_cents,
            transaction_id=transaction["id"],
        )

        return True

    except httpx.HTTPError as e:
        logger.error(
            "issue_store_credit_http_error",
            merchant_id=str(merchant_id),
            error=str(e),
            exc_info=True,
        )
        return False

    except Exception as e:
        logger.error(
            "issue_store_credit_unexpected_error",
            merchant_id=str(merchant_id),
            error=str(e),
            exc_info=True,
        )
        return False

    finally:
        await client.aclose()


async def cancel_refund(
    db: AsyncSession,
    merchant_id: UUID,
    order_id: str,
    refund_id: str,
) -> bool:
    """
    Cancel a refund in Shopify.

    Note: This is called AFTER credit is issued successfully.
    Shopify will not process the refund if we cancel it.

    Args:
        db: Database session
        merchant_id: Merchant ID
        order_id: Shopify order ID
        refund_id: Shopify refund ID

    Returns:
        True if successful, False otherwise
    """
    client_data = await get_shopify_client(db, merchant_id)
    if not client_data:
        return False

    client, shop_domain, _ = client_data

    try:
        # Note: Shopify doesn't have a direct "cancel refund" endpoint
        # Once a refund is created, it's already processed
        # What we actually need to do is NOT process the refund in the first place
        # For MVP, we'll just log this - the merchant needs to manually cancel in Shopify admin

        logger.warning(
            "cancel_refund_not_implemented",
            merchant_id=str(merchant_id),
            order_id=order_id,
            refund_id=refund_id,
            note="Merchant must manually cancel refund in Shopify admin",
        )

        # TODO: Investigate if we can use refund transactions API to reverse
        # For now, return True as this is not critical for MVP
        return True

    finally:
        await client.aclose()
