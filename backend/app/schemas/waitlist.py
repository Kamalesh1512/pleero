"""
Waitlist request and response schemas.
"""

from typing import Self

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


BUSINESS_CATEGORIES = {
    "Apparel / Fashion",
    "Beauty / Skincare",
    "Accessories",
    "Home & Lifestyle",
    "Food & Beverage",
    "Other",
}

MONTHLY_ORDER_VOLUMES = {
    "Fewer than 100",
    "100-500",
    "500-2,000",
    "2,000-10,000",
    "10,000+",
}

CREDIT_SOURCES = {
    "Shopify's native Store Credit",
    "A returns app (Loop, AfterShip, ReturnGO, etc.)",
    "A loyalty or gift-card app (Rise.ai, Smile.io, etc.)",
    "Manually — gift cards, discount codes, or a spreadsheet",
    "We don't use Store Credit yet",
    "Not sure",
}

PAIN_POINTS = {
    "I don't know what % of it actually gets redeemed",
    "I can't tell if it's bringing customers back or just sitting there",
    "Our Store Credit data is scattered across different tools",
    "I don't know how much is about to expire unused",
    "Converting refunds into Store Credit in the first place",
    "Automating when Store Credit gets issued",
    "Something else",
}

CAPABILITIES = {
    "A single dashboard showing redemption rate and revenue brought back",
    "Alerts for credit that's about to expire, unused",
    "One view across every tool that issues our Store Credit",
    "Automatic reminders to customers with unused credit",
    "A bonus-credit offer at checkout or during returns",
    "Something else",
}

INTERVIEW_OPTIONS = {
    "Yes, happy to chat",
    "Maybe",
    "Not right now",
}


class WaitlistSubmissionCreate(BaseModel):
    """Public waitlist submission payload."""

    email: EmailStr
    store_url: str = Field(alias="storeUrl", min_length=4, max_length=255)
    business_category: str = Field(alias="businessCategory")
    monthly_orders: str = Field(alias="monthlyOrders")
    credit_sources: list[str] = Field(alias="creditSources", min_length=1)
    biggest_pain: str = Field(alias="biggestPain")
    open_response: str = Field(alias="openResponse", min_length=10, max_length=3000)
    valuable_capability: str = Field(alias="valuableCapability")
    interview_willingness: str = Field(alias="interviewWillingness")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("store_url")
    @classmethod
    def normalize_store_url(cls, value: str) -> str:
        normalized = (
            value.strip().lower().removeprefix("https://").removeprefix("http://")
        )
        normalized = normalized.rstrip("/")
        if "." not in normalized:
            raise ValueError("Enter a valid store URL.")
        return normalized

    @field_validator(
        "business_category",
        "monthly_orders",
        "biggest_pain",
        "valuable_capability",
        "interview_willingness",
        "open_response",
    )
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("credit_sources")
    @classmethod
    def strip_credit_sources(cls, value: list[str]) -> list[str]:
        return [item.strip() for item in value if item.strip()]

    @model_validator(mode="after")
    def validate_choice_sets(self) -> Self:
        if self.business_category not in BUSINESS_CATEGORIES:
            raise ValueError("Choose a valid business category.")
        if self.monthly_orders not in MONTHLY_ORDER_VOLUMES:
            raise ValueError("Choose a valid monthly order volume.")
        if not self.credit_sources or any(
            source not in CREDIT_SOURCES for source in self.credit_sources
        ):
            raise ValueError("Choose valid Store Credit sources.")
        if self.biggest_pain not in PAIN_POINTS:
            raise ValueError("Choose a valid Store Credit challenge.")
        if self.valuable_capability not in CAPABILITIES:
            raise ValueError("Choose a valid capability.")
        if self.interview_willingness not in INTERVIEW_OPTIONS:
            raise ValueError("Choose a valid interview option.")
        return self


class WaitlistSubmissionResponse(BaseModel):
    """Public response after joining the waitlist."""

    status: str
    message: str
