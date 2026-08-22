"""
Shopify API service.
Handles interactions with Shopify Admin API.
Hard rule #4: Use httpx (async), never requests (blocking).
Hard rule #5: Never hardcode API version - use settings.SHOPIFY_API_VERSION.
"""

from uuid import UUID

from enum import StrEnum

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.logging import get_logger
from app.models.merchant import Merchant
from app.utils.shopify_auth import get_valid_access_token

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


class RefundActionOutcome(StrEnum):
    """Result of attempting to create a native store-credit refund."""

    CREDIT_REFUND_CREATED = "CREDIT_REFUND_CREATED"
    MANUAL_REVIEW = "MANUAL_REVIEW"


# ─── ID helpers ──────────────────────────────────────────────────────────────


def _numeric(gid_or_id: str | int) -> int:
    """Extract the trailing numeric ID from a Shopify GID or numeric string."""
    return int(str(gid_or_id).split("/")[-1])


def _order_gid(order_id: str | int) -> str:
    return f"gid://shopify/Order/{_numeric(order_id)}"


def _refund_gid(refund_id: str | int) -> str:
    return f"gid://shopify/Refund/{_numeric(refund_id)}"


def _line_item_gid(line_item_id: str | int) -> str:
    return f"gid://shopify/LineItem/{_numeric(line_item_id)}"


# ─── Shopify calls ───────────────────────────────────────────────────────────


async def _fetch_refund_line_items(
    client: httpx.AsyncClient,
    shop_domain: str,
    order_id: str | int,
    refund_id: str | int,
) -> list[dict] | None:
    """
    Fetch the line items of the original refund so the store-credit refund
    mirrors exactly what the merchant refunded.

    Returns a list of refundCreate RefundLineItem inputs or None on failure.
    """
    url = (
        f"https://{shop_domain}/admin/api/{settings.SHOPIFY_API_VERSION}"
        f"/orders/{_numeric(order_id)}/refunds/{_numeric(refund_id)}.json"
    )
    try:
        resp = await client.get(url)
        if resp.status_code != 200:
            logger.warning(
                "refund_line_items_fetch_non_200",
                shop=shop_domain,
                order_id=order_id,
                status=resp.status_code,
            )
            return None
        data = resp.json().get("refund") or {}
        items: list[dict] = []
        for rli in data.get("refund_line_items", []):
            lid = rli.get("line_item_id")
            qty = rli.get("quantity")
            if lid and qty:
                items.append({"lineItemId": _line_item_gid(lid), "quantity": int(qty)})
        return items
    except httpx.HTTPError as exc:
        logger.error(
            "refund_line_items_fetch_error",
            shop=shop_domain,
            order_id=order_id,
            error=str(exc),
        )
        return None
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(
            "refund_line_items_fetch_unexpected",
            shop=shop_domain,
            order_id=order_id,
            error=str(exc),
            exc_info=True,
        )
        return None


async def _cash_refund_already_processed(
    client: httpx.AsyncClient,
    shop_domain: str,
    order_id: str | int,
) -> bool | None:
    """
    Detect whether a cash refund for this order has already paid out.

    If it has, issuing a store-credit refund on top would double-pay the
    customer, so the accept step must flag for manual review instead.

    Returns True if a cash refund was captured, False otherwise, or None if
    the order state could not be determined (treat as manual review).
    """
    url = (
        f"https://{shop_domain}/admin/api/{settings.SHOPIFY_API_VERSION}"
        f"/orders/{_numeric(order_id)}.json"
        f"?fields=id,financial_status,refunds"
    )
    try:
        resp = await client.get(url)
        if resp.status_code != 200:
            logger.warning(
                "refund_state_fetch_non_200",
                shop=shop_domain,
                order_id=order_id,
                status=resp.status_code,
            )
            return None
        order = resp.json().get("order") or {}

        financial_status = (order.get("financial_status") or "").upper()
        if financial_status == "REFUNDED":
            return True

        for refund in order.get("refunds") or []:
            for txn in refund.get("transactions") or []:
                kind = (txn.get("kind") or "").upper()
                status = (txn.get("status") or "").upper()
                gateway = txn.get("gateway") or ""
                if (
                    kind == "REFUND"
                    and status == "SUCCESS"
                    and gateway != "shopify_store_credit"
                ):
                    return True
        return False
    except httpx.HTTPError as exc:
        logger.error(
            "refund_state_fetch_error",
            shop=shop_domain,
            order_id=order_id,
            error=str(exc),
        )
        return None
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(
            "refund_state_fetch_unexpected",
            shop=shop_domain,
            order_id=order_id,
            error=str(exc),
            exc_info=True,
        )
        return None


async def _create_store_credit_refund(
    client: httpx.AsyncClient,
    shop_domain: str,
    order_id: str | int,
    refund_line_items: list[dict],
    amount_cents: int,
    currency: str,
    idempotency_key: str,
) -> str | None:
    """
    Create a refund whose method is store credit (refundCreate + storeCreditRefund).

    Shopify (2026-04+) requires the @idempotent directive with a literal key on
    refundCreate; we use the offer's UUID so retries never double-spend.

    Returns the created refund GID on success, or None on failure.
    """
    amount = f"{amount_cents / 100:.2f}"
    safe_key = str(idempotency_key)  # our own UUID — safe to inline as a literal

    mutation = f"""
    mutation refundCreate($input: RefundInput!) {{
        refundCreate(input: $input) @idempotent(key: "{safe_key}") {{
            refund {{
                id
                totalRefundedSet {{
                    presentmentMoney {{ amount }}
                }}
            }}
            order {{ id }}
            userErrors {{ field message }}
        }}
    }}
    """
    variables = {
        "input": {
            "orderId": _order_gid(order_id),
            "refundLineItems": refund_line_items,
            "transactions": [],
            "refundMethods": [
                {
                    "storeCreditRefund": {
                        "amount": {"amount": amount, "currencyCode": currency},
                    }
                }
            ],
        }
    }

    url = f"https://{shop_domain}/admin/api/{settings.SHOPIFY_API_VERSION}/graphql.json"
    try:
        response = await client.post(
            url, json={"query": mutation, "variables": variables}
        )
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPError as exc:
        logger.error(
            "store_credit_refund_http_error",
            shop=shop_domain,
            order_id=order_id,
            error=str(exc),
        )
        return None
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(
            "store_credit_refund_unexpected",
            shop=shop_domain,
            order_id=order_id,
            error=str(exc),
            exc_info=True,
        )
        return None

    if "errors" in data:
        logger.error(
            "store_credit_refund_graphql_error",
            shop=shop_domain,
            order_id=order_id,
            errors=data["errors"],
        )
        return None

    result = data.get("data", {}).get("refundCreate", {})
    user_errors = result.get("userErrors") or []
    if user_errors:
        logger.error(
            "store_credit_refund_user_errors",
            shop=shop_domain,
            order_id=order_id,
            errors=user_errors,
        )
        return None

    refund = result.get("refund") or {}
    refund_id = refund.get("id")
    if not refund_id:
        logger.error(
            "store_credit_refund_missing_refund",
            shop=shop_domain,
            order_id=order_id,
            result=result,
        )
        return None

    logger.info(
        "store_credit_refund_created",
        shop=shop_domain,
        order_id=order_id,
        refund_id=refund_id,
        amount_cents=amount_cents,
    )
    return refund_id


async def refund_to_store_credit(
    db: AsyncSession,
    merchant_id: UUID,
    order_id: str,
    refund_id: str,
    credit_amount_cents: int,
    currency: str,
    idempotency_key: UUID,
) -> RefundActionOutcome:
    """
    Issue a refund as a native Shopify store-credit refund (Refund Recovery).

    Shopify cannot reverse an already-processed cash refund, so this replaces
    the refund's method at creation time with store credit (refundCreate +
    storeCreditRefund). It never double-pays: if a cash refund for the order was
    already captured, the outcome is MANUAL_REVIEW and the offer must not be
    marked accepted.

    Args:
        db: Database session
        merchant_id: Merchant ID
        order_id: Shopify order ID (numeric, from webhook)
        refund_id: Shopify refund ID (numeric, from webhook)
        credit_amount_cents: Store credit amount to issue (refund + bonus)
        currency: ISO 4217 currency code
        idempotency_key: Offer UUID used as the refundCreate idempotency key

    Returns:
        RefundActionOutcome.CREDIT_REFUND_CREATED or RefundActionOutcome.MANUAL_REVIEW
    """
    client_data = await get_shopify_client(db, merchant_id)
    if not client_data:
        logger.error(
            "refund_to_store_credit_no_client",
            merchant_id=str(merchant_id),
            order_id=order_id,
        )
        return RefundActionOutcome.MANUAL_REVIEW

    client, shop_domain, _ = client_data

    try:
        # Guard against double-pay: never issue store credit on top of a cash
        # refund that has already paid out.
        cash_processed = await _cash_refund_already_processed(
            client, shop_domain, order_id
        )
        if cash_processed is None:
            logger.warning(
                "refund_state_unknown_manual_review",
                shop=shop_domain,
                merchant_id=str(merchant_id),
                order_id=order_id,
            )
            return RefundActionOutcome.MANUAL_REVIEW
        if cash_processed:
            logger.warning(
                "cash_refund_already_processed_manual_review",
                shop=shop_domain,
                merchant_id=str(merchant_id),
                order_id=order_id,
            )
            return RefundActionOutcome.MANUAL_REVIEW

        refund_line_items = await _fetch_refund_line_items(
            client, shop_domain, order_id, refund_id
        )
        if not refund_line_items:
            logger.warning(
                "no_refund_line_items_manual_review",
                shop=shop_domain,
                merchant_id=str(merchant_id),
                order_id=order_id,
                refund_id=refund_id,
            )
            return RefundActionOutcome.MANUAL_REVIEW

        created_refund_id = await _create_store_credit_refund(
            client,
            shop_domain,
            order_id,
            refund_line_items,
            credit_amount_cents,
            currency,
            idempotency_key=str(idempotency_key),
        )
        if not created_refund_id:
            return RefundActionOutcome.MANUAL_REVIEW

        return RefundActionOutcome.CREDIT_REFUND_CREATED

    finally:
        await client.aclose()
