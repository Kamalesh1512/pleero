"""
Schemas for Store Credit Automation API.
"""

from pydantic import BaseModel, Field


class AutomationConfigItem(BaseModel):
    """One workflow configuration visible to the merchant."""

    workflow: (
        str  # e.g. "refund_recovery", "goodwill", "winback", "redemption_reminder"
    )
    enabled: bool
    min_days_before_action: int
    max_actions_per_customer: int


class AutomationConfigResponse(BaseModel):
    """All automation workflow configurations for a merchant."""

    workflows: list[AutomationConfigItem]


class AutomationConfigUpdate(BaseModel):
    """Update one workflow config."""

    enabled: bool | None = None
    min_days_before_action: int | None = Field(None, ge=1, le=365)
    max_actions_per_customer: int | None = Field(None, ge=1, le=20)


class GoodwillRequest(BaseModel):
    """Request to issue manual goodwill Store Credit."""

    customer_email: str = Field(..., min_length=1)
    customer_first_name: str = ""
    amount_cents: int = Field(..., gt=0)
    currency: str = "USD"
    note: str = ""


class GoodwillResponse(BaseModel):
    """Result of a goodwill credit issuance."""

    success: bool
    message: str


class WinbackCandidate(BaseModel):
    """One customer identified as a win-back candidate."""

    customer_email: str
    customer_first_name: str
    customer_shopify_id: str | None
    last_activity: str | None
    days_since_last_activity: int | None


class WinbackCandidatesResponse(BaseModel):
    """List of win-back candidates for a merchant."""

    candidates: list[WinbackCandidate]
    count: int


class WinbackIssueRequest(BaseModel):
    """Request to issue win-back Store Credit to a candidate."""

    customer_email: str = Field(..., min_length=1)
    customer_first_name: str = ""
    customer_shopify_id: str | None = None
    amount_cents: int = Field(..., gt=0)
    currency: str = "USD"
    note: str = ""


class WinbackIssueResponse(BaseModel):
    """Result of a win-back credit issuance."""

    success: bool
    message: str


class ReminderTriggerResponse(BaseModel):
    """Result of triggering a manual reminder sweep."""

    reminders_sent: int
