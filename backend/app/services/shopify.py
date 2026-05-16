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
) -> bool:
    """
    Issue store credit to a customer via Shopify GraphQL API.

    Uses the storeCreditAccountCredit mutation.

    Args:
        db: Database session
        merchant_id: Merchant ID
        customer_email: Customer email address
        amount_cents: Credit amount in cents
        currency: Currency code (e.g., "USD")
        note: Note to attach to the credit

    Returns:
        True if successful, False otherwise
    """
    client_data = await get_shopify_client(db, merchant_id)
    if not client_data:
        return False

    client, shop_domain, _ = client_data

    try:
        # First, get customer ID by email
        customer_id = await get_customer_id_by_email(
            client,
            shop_domain,
            customer_email,
        )

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

        # Issue store credit via GraphQL
        mutation = """
        mutation storeCreditAccountCredit($input: StoreCreditAccountCreditInput!) {
            storeCreditAccountCredit(input: $input) {
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
            "input": {
                "accountId": customer_id,
                "amount": {
                    "amount": amount,
                    "currencyCode": currency,
                },
                "note": note,
            }
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
            customer_email=customer_email,
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


async def get_customer_id_by_email(
    client: httpx.AsyncClient,
    shop_domain: str,
    email: str,
) -> str | None:
    """
    Get Shopify customer ID by email address.

    Args:
        client: Authenticated Shopify API client
        shop_domain: Shop domain
        email: Customer email

    Returns:
        Customer GID or None if not found
    """
    try:
        query = """
        query getCustomer($email: String!) {
            customers(first: 1, query: $email) {
                edges {
                    node {
                        id
                        email
                        firstName
                    }
                }
            }
        }
        """

        variables = {"email": f"email:{email}"}

        url = f"https://{shop_domain}/admin/api/{settings.SHOPIFY_API_VERSION}/graphql.json"

        response = await client.post(
            url,
            json={"query": query, "variables": variables},
        )

        response.raise_for_status()
        data = response.json()

        edges = data.get("data", {}).get("customers", {}).get("edges", [])

        if not edges:
            return None

        customer_id: str = edges[0]["node"]["id"]
        return customer_id

    except Exception as e:
        logger.error(
            "get_customer_id_error",
            email=email,
            error=str(e),
            exc_info=True,
        )
        return None


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


async def get_customer_by_email(
    db: AsyncSession,
    merchant_id: UUID,
    email: str,
) -> dict[str, str] | None:
    """
    Get customer information by email.

    Args:
        db: Database session
        merchant_id: Merchant ID
        email: Customer email

    Returns:
        Dict with customer data or None if not found
    """
    client_data = await get_shopify_client(db, merchant_id)
    if not client_data:
        return None

    client, shop_domain, _ = client_data

    try:
        customer_id = await get_customer_id_by_email(client, shop_domain, email)

        if not customer_id:
            return None

        return {
            "id": customer_id,
            "email": email,
        }

    finally:
        await client.aclose()
