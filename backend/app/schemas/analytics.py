"""
Analytics schemas — typed views into Store Credit intelligence.

Every metric carries its attribution methodology so the consumer
knows whether a number is _observed_, _attributed_, or _estimated_.
"""

from datetime import datetime

from pydantic import BaseModel, Field


# ─── Metric attribution tagging ───────────────────────────────────────────────

OBSERVED = "observed"  # Directly from a known event or Shopify API
ATTRIBUTED = "attributed"  # Derived via a documented rule
ESTIMATED = "estimated"  # Inferred / approximated


# ─── Store Credit Overview ─────────────────────────────────────────────────────


class StoreCreditOverview(BaseModel):
    """
    Top-level Store Credit health metrics for the merchant.

    All amounts are in cents (smallest currency unit).
    """

    credit_issued_cents: int = Field(
        ..., description="Total Store Credit issued (Pleero offers accepted)"
    )
    credit_issued_attribution: str = OBSERVED

    credit_redeemed_cents: int = Field(
        ...,
        description="Total Store Credit redeemed by customers (from Shopify debit webhooks)",
    )
    credit_redeemed_attribution: str = OBSERVED

    outstanding_credit_cents: int = Field(
        ...,
        description=(
            "Estimated outstanding credit (issued - redeemed). "
            "Only tracks Pleero-issued credit redemptions observed via webhook."
        ),
    )
    outstanding_credit_attribution: str = ATTRIBUTED

    redemption_rate: float = Field(
        ..., description="Redeemed / issued × 100 (0.0 if no issuance)"
    )
    redemption_rate_attribution: str = ATTRIBUTED

    avg_days_to_redemption: float | None = Field(
        None, description="Average calendar days between issuance and redemption"
    )
    avg_days_to_redemption_attribution: str = ATTRIBUTED

    customers_with_active_credit: int = Field(
        ...,
        description="Customers who have outstanding credit > 0 (Pleero-issued)",
    )
    customers_with_active_credit_attribution: str = ATTRIBUTED

    revenue_influenced_cents: int = Field(
        ...,
        description="Total value of credit redemptions observed (proxy for revenue Store Credit influenced)",
    )
    revenue_influenced_attribution: str = ATTRIBUTED

    period_label: str = Field(
        ...,
        description="Human-readable label for the time window, e.g. 'Last 30 days'",
    )

    cached_at: datetime | None = None


# ─── Time-series point ────────────────────────────────────────────────────────


class TimeSeriesPoint(BaseModel):
    """One day's worth of Store Credit activity."""

    date: str  # ISO date string "2026-08-01"
    credit_issued_cents: int = 0
    credit_redeemed_cents: int = 0
    offers_sent: int = 0
    offers_accepted: int = 0


class TimeSeriesResponse(BaseModel):
    """Time-series data for a requested window."""

    points: list[TimeSeriesPoint]
    period_days: int  # 7, 30, or 90


# ─── Credit source breakdown ───────────────────────────────────────────────────


class CreditSourceItem(BaseModel):
    """One row in the credit-source breakdown."""

    source: str  # e.g. "refund_recovery", "goodwill", "winback"
    label: str  # Human-readable label
    issued_cents: int
    count: int
    percentage: float  # Share of total issuance (0–100)


class CreditSourceBreakdown(BaseModel):
    """Breakdown of Store Credit by source type."""

    sources: list[CreditSourceItem]


# ─── Refund Recovery funnel ────────────────────────────────────────────────────


class RefundRecoveryFunnel(BaseModel):
    """
    Offers → Views → Accepts → Credit issued → Redeemed → Spend.

    Every step is observed from our Offer lifecycle events.
    """

    eligible_refund_value_cents: int = Field(
        ..., description="Total refund value of all eligible refunds"
    )
    offers_sent: int
    offers_viewed: int
    offers_accepted: int
    offers_declined: int
    acceptance_rate: float  # 0–100
    refund_value_retained_cents: int = Field(
        ..., description="Sum of refund_amount_cents of accepted offers"
    )
    bonus_credit_issued_cents: int = Field(
        ..., description="Sum of bonus_applied_cents of accepted offers"
    )
    total_credit_issued_cents: int = Field(
        ..., description="Sum of credit_amount_cents of accepted offers"
    )
    credit_redeemed_cents: int = Field(
        ..., description="Observed redemption of Pleero-issued credit"
    )
    credit_redeemed_attribution: str = ATTRIBUTED


# ─── Automation performance ────────────────────────────────────────────────────


class AutomationWorkflowPerformance(BaseModel):
    """
    Performance of one Store Credit Automation workflow.

    `redeemed_customers`/`redemption_rate` are ESTIMATED, not ATTRIBUTED:
    Shopify Store Credit balances are fungible (one balance per customer,
    merging credit from every source), so a later redemption cannot be
    tied back to a specific workflow with certainty. The proxy used here is
    "customers reached by this workflow who redeemed *any* credit
    afterward" — directionally useful, not a precise dollar attribution.
    """

    workflow: (
        str  # e.g. "refund_recovery", "goodwill", "winback", "redemption_reminder"
    )
    label: str
    executions: int = Field(
        ..., description="Count of actions this workflow took in the period"
    )
    executions_attribution: str = OBSERVED
    credit_issued_cents: int = Field(
        ...,
        description="Store Credit issued directly by this workflow (0 for non-issuing workflows)",
    )
    credit_issued_attribution: str = OBSERVED
    customers_reached: int
    redeemed_customers: int | None = Field(
        None,
        description="Of customers reached, how many redeemed any credit afterward. Null if executions is 0.",
    )
    redemption_rate: float | None = Field(
        None,
        description="redeemed_customers / customers_reached × 100. Null if executions is 0.",
    )
    redemption_rate_attribution: str = ESTIMATED
    notes: str | None = Field(
        None, description="Caveats about this workflow's current implementation, if any"
    )


class AutomationPerformance(BaseModel):
    """Performance breakdown across all Store Credit Automation workflows."""

    workflows: list[AutomationWorkflowPerformance]
    period_days: int


# ─── CSV export ────────────────────────────────────────────────────────────────


class CsvExportRow(BaseModel):
    """One row in the CSV export of offer lifecycle data."""

    offer_id: str
    order_number: str
    customer_email: str
    refund_amount_cents: int
    credit_amount_cents: int
    bonus_applied_cents: int
    status: str
    refund_status: str
    created_at: datetime
    accepted_at: datetime | None
    viewed_at: datetime | None
    declined_at: datetime | None
    expired_at: datetime | None
    redeemed_cents: int | None
