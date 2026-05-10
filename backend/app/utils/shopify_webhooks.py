"""
Shopify webhook utilities.
Handles webhook HMAC verification, parsing, and business logic.
"""

import hmac
import hashlib
import base64
from typing import Any

from app.core.logging import get_logger
from app.models.merchant import SubscriptionStatus

logger = get_logger(__name__)


def verify_webhook_hmac(body: bytes, hmac_header: str, secret: str) -> bool:
    """
    Verify webhook HMAC signature.

    CRITICAL: Hard rule #1 - Always verify HMAC with constant-time comparison.

    Args:
        body: Raw request body (bytes)
        hmac_header: X-Shopify-Hmac-SHA256 header value
        secret: Shopify API secret

    Returns:
        True if HMAC is valid, False otherwise
    """
    if not hmac_header:
        logger.warning("webhook_hmac_verification_failed", reason="missing_header")
        return False

    # Compute HMAC-SHA256
    computed_hmac = base64.b64encode(
        hmac.new(secret.encode("utf-8"), body, hashlib.sha256).digest()
    ).decode("utf-8")

    # Constant-time comparison (prevents timing attacks)
    is_valid = hmac.compare_digest(computed_hmac, hmac_header)

    if not is_valid:
        logger.warning(
            "webhook_hmac_verification_failed",
            reason="mismatch",
        )

    return is_valid


class RefundWebhookData:
    """Parsed refund webhook data."""

    def __init__(self, payload: dict[str, Any]) -> None:
        """Initialize from webhook payload."""
        self.refund_id = str(payload.get("id", ""))
        self.order_id = str(payload.get("order_id", ""))

        # Get refund line items
        refund_line_items = payload.get("refund_line_items", [])
        self.refund_amount_cents = sum(
            int(float(item.get("subtotal", 0)) * 100) for item in refund_line_items
        )

        # Get order data
        order = payload.get("order", {})
        self.order_name = order.get("name", "")

        # Get customer data
        customer = order.get("customer", {})
        self.customer_email = customer.get("email", "")
        self.customer_first_name = customer.get("first_name", "")
        self.customer_country = customer.get("default_address", {}).get(
            "country_code", ""
        )

        # Get return reason (if available)
        # Note: Shopify doesn't always provide this in the webhook
        self.return_reason = None
        for item in refund_line_items:
            if "return_reason" in item:
                self.return_reason = item["return_reason"]
                break

    def is_valid(self) -> bool:
        """Check if webhook data has all required fields."""
        return bool(
            self.refund_id
            and self.order_id
            and self.customer_email
            and self.refund_amount_cents > 0
        )


def parse_refund_webhook(payload: dict[str, Any]) -> RefundWebhookData:
    """
    Parse refund webhook payload.

    Args:
        payload: Webhook JSON payload

    Returns:
        Parsed refund data
    """
    return RefundWebhookData(payload)


def should_skip_offer(
    webhook_data: RefundWebhookData,
    merchant_subscription_status: SubscriptionStatus,
) -> tuple[bool, str]:
    """
    Determine if offer should be skipped based on business rules.

    Business rules:
    1. Skip if return reason is defective/damaged/wrong
    2. Skip if customer country is not US (Phase 1, hard rule #10)
    3. Skip if merchant subscription is not ACTIVE or TRIAL
    4. Skip if customer has no email
    5. Skip if refund amount is $0

    Args:
        webhook_data: Parsed webhook data
        merchant_subscription_status: Merchant's subscription status

    Returns:
        Tuple of (should_skip, reason)
    """
    # Check customer email
    if not webhook_data.customer_email:
        logger.info(
            "offer_skipped",
            reason="no_email",
            refund_id=webhook_data.refund_id,
        )
        return True, "no_email"

    # Check refund amount
    if webhook_data.refund_amount_cents <= 0:
        logger.info(
            "offer_skipped",
            reason="zero_amount",
            refund_id=webhook_data.refund_id,
        )
        return True, "zero_amount"

    # Check return reason (skip if defective/damaged/wrong)
    if webhook_data.return_reason:
        skip_reasons = ["defective", "damaged", "wrong", "wrong_item"]
        if webhook_data.return_reason.lower() in skip_reasons:
            logger.info(
                "offer_skipped",
                reason="defective_item",
                refund_id=webhook_data.refund_id,
                return_reason=webhook_data.return_reason,
            )
            return True, "defective_item"

    # Check customer country (US-only in Phase 1, hard rule #10)
    if webhook_data.customer_country and webhook_data.customer_country != "US":
        logger.info(
            "offer_skipped",
            reason="non_us_customer",
            refund_id=webhook_data.refund_id,
            country=webhook_data.customer_country,
        )
        return True, "non_us_customer"

    # Check merchant subscription status
    if merchant_subscription_status not in [
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.TRIAL,
    ]:
        logger.info(
            "offer_skipped",
            reason="inactive_subscription",
            refund_id=webhook_data.refund_id,
            subscription_status=merchant_subscription_status.value,
        )
        return True, "inactive_subscription"

    # All checks passed
    return False, ""


def calculate_bonus(
    refund_amount_cents: int,
    bonus_percentage: int,
    bonus_cap_cents: int,
) -> tuple[int, int]:
    """
    Calculate bonus amount with cap enforcement.

    Args:
        refund_amount_cents: Original refund amount in cents
        bonus_percentage: Bonus percentage (5-20%)
        bonus_cap_cents: Maximum bonus amount in cents

    Returns:
        Tuple of (credit_amount_cents, bonus_applied_cents)

    Examples:
        - $100 refund, 10% bonus, $50 cap → $110 credit, $10 bonus
        - $500 refund, 10% bonus, $50 cap → $550 credit, $50 bonus (capped)
    """
    # Calculate bonus before cap
    bonus_before_cap = int(refund_amount_cents * bonus_percentage / 100)

    # Apply cap
    bonus_applied = min(bonus_before_cap, bonus_cap_cents)

    # Calculate total credit
    credit_amount = refund_amount_cents + bonus_applied

    return credit_amount, bonus_applied
