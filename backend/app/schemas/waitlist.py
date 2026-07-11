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

CURRENT_USE_CASES = {
    "Refunds or returns",
    "Customer service / goodwill",
    "Loyalty or rewards",
    "Promotions or campaigns",
    "VIP customers",
    "We don't use Store Credit yet",
    "Other",
}

PAIN_POINTS = {
    "Converting refunds into Store Credit",
    "Automating when Store Credit is issued",
    "Understanding whether Store Credit gets redeemed",
    "Getting customers to come back and use their credit",
    "Reporting and analytics",
    "Bulk management",
    "Customer communication and notifications",
    "Something else",
}

CAPABILITIES = {
    "Refund-to-Store-Credit conversion",
    "Store Credit analytics and reporting",
    "Automated Store Credit workflows",
    "Customer reminders and redemption campaigns",
    "All-in-one Store Credit platform",
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
    current_use_cases: list[str] = Field(alias="currentUseCases", min_length=1)
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

    @field_validator("current_use_cases")
    @classmethod
    def strip_use_cases(cls, value: list[str]) -> list[str]:
        return [item.strip() for item in value if item.strip()]

    @model_validator(mode="after")
    def validate_choice_sets(self) -> Self:
        if self.business_category not in BUSINESS_CATEGORIES:
            raise ValueError("Choose a valid business category.")
        if self.monthly_orders not in MONTHLY_ORDER_VOLUMES:
            raise ValueError("Choose a valid monthly order volume.")
        if not self.current_use_cases or any(
            use_case not in CURRENT_USE_CASES for use_case in self.current_use_cases
        ):
            raise ValueError("Choose valid Store Credit use cases.")
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
