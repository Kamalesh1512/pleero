"""
Pydantic schemas for Merchant model.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.merchant import SubscriptionStatus


class MerchantBase(BaseModel):
    """Base merchant schema with common fields."""

    shop_domain: str = Field(..., description="Shopify shop domain")
    merchant_email: EmailStr = Field(..., description="Merchant contact email")
    bonus_percentage: int = Field(
        default=10,
        ge=5,
        le=20,
        description="Bonus percentage (5-20%)",
    )
    bonus_cap_cents: int = Field(
        default=5000,
        ge=1000,
        description="Maximum bonus amount in cents (min $10)",
    )
    brand_color: str = Field(
        default="#000000",
        pattern="^#[0-9A-Fa-f]{6}$",
        description="Hex color code for branding",
    )
    logo_url: str | None = Field(
        None,
        description="URL to merchant logo",
    )


class MerchantCreate(MerchantBase):
    """Schema for creating a new merchant."""

    access_token: str = Field(
        ..., description="Shopify access token (will be encrypted)"
    )


class MerchantUpdate(BaseModel):
    """Schema for updating merchant settings."""

    merchant_email: EmailStr | None = None
    bonus_percentage: int | None = Field(None, ge=5, le=20)
    bonus_cap_cents: int | None = Field(None, ge=1000)
    brand_color: str | None = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    logo_url: str | None = None

    @field_validator("bonus_cap_cents")
    @classmethod
    def validate_bonus_cap(cls, v: int | None) -> int | None:
        """Ensure bonus cap is at least $10 (1000 cents)."""
        if v is not None and v < 1000:
            raise ValueError("Bonus cap must be at least $10 (1000 cents)")
        return v


class MerchantResponse(MerchantBase):
    """Schema for merchant API responses."""

    id: UUID
    subscription_status: SubscriptionStatus
    subscription_id: str | None = None
    trial_ends_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    # Exclude access_token from responses (security)

    model_config = {
        "from_attributes": True,
    }


class MerchantSettings(BaseModel):
    """Schema for public merchant settings (for offer pages)."""

    logo_url: str | None
    brand_color: str

    model_config = {
        "from_attributes": True,
    }
