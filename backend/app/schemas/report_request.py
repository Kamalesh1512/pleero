"""
Report request schemas.
"""

from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field, field_validator


class ReportRequestCreate(BaseModel):
    """Public payload from the free report estimator on the landing page."""

    email: EmailStr
    monthly_credit_issued: Decimal | None = Field(
        default=None,
        alias="monthlyCreditIssued",
        ge=0,
        le=10_000_000,
    )
    redemption_rate: Decimal | None = Field(
        default=None,
        alias="redemptionRate",
        ge=0,
        le=100,
    )
    source: str | None = Field(default=None, max_length=100)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("source")
    @classmethod
    def strip_source(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class ReportRequestResponse(BaseModel):
    """Public response after requesting the free report."""

    status: str
    message: str
