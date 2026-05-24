"""
Pydantic schemas for Shopify webhook payloads.
These match the structure of Shopify's webhook JSON.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class RefundLineItem(BaseModel):
    """Refund line item from Shopify webhook."""

    id: int
    line_item_id: int
    quantity: int
    subtotal: str
    total_tax: str
    return_reason: str | None = None


class CustomerAddress(BaseModel):
    """Customer address from Shopify webhook."""

    country_code: str | None = None
    country: str | None = None


class Customer(BaseModel):
    """Customer data from Shopify webhook."""

    id: int
    email: str
    first_name: str | None = None
    last_name: str | None = None
    default_address: CustomerAddress | None = None


class Order(BaseModel):
    """Order data from Shopify webhook."""

    id: int
    name: str
    customer: Customer | None = None


class RefundWebhookPayload(BaseModel):
    """
    Shopify refunds/create webhook payload.

    Matches the structure of Shopify's refund webhook.
    See: https://shopify.dev/docs/api/admin-rest/2025-01/resources/refund
    """

    id: int
    order_id: int
    created_at: datetime
    note: str | None = None
    user_id: int | None = None
    refund_line_items: list[RefundLineItem] = Field(default_factory=list)
    transactions: list[dict[str, Any]] = Field(default_factory=list)
    order: Order | None = None

    # Additional fields that may be present
    processed_at: datetime | None = None
    restock: bool = False


class AppUninstalledPayload(BaseModel):
    """
    Shopify app/uninstalled webhook payload.

    Minimal payload - just contains basic app info.
    """

    id: int  # App installation ID
    name: str | None = None


# ── Compliance webhook payloads ────────────────────────────────────────────────


class ComplianceCustomer(BaseModel):
    """Customer identifier block inside compliance payloads."""

    id: int
    email: str | None = None
    phone: str | None = None


class CustomersDataRequestPayload(BaseModel):
    """
    customers/data_request — customer asked the merchant what data the app holds.
    We must acknowledge receipt within 30 days (no data needs to be returned
    in the webhook response itself).
    """

    shop_id: int
    shop_domain: str
    customer: ComplianceCustomer
    orders_requested: list[int] = Field(default_factory=list)
    data_request: dict[str, Any] | None = None


class CustomersRedactPayload(BaseModel):
    """
    customers/redact — customer or merchant requested PII deletion.
    We must anonymise all customer fields within 30 days.
    """

    shop_id: int
    shop_domain: str
    customer: ComplianceCustomer
    orders_to_redact: list[int] = Field(default_factory=list)


class ShopRedactPayload(BaseModel):
    """
    shop/redact — triggered 48 h after app uninstall.
    We must delete all data for the shop.
    """

    shop_id: int
    shop_domain: str
