"""
Central configuration using pydantic_settings.BaseSettings.
All environment variables are loaded from .env file.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = (
        "postgresql+asyncpg://pleero_user:pleero_password@localhost:5432/pleero"
    )

    # Redis
    REDIS_URL: str = "redis://:your_redis_password@localhost:6379/0"

    # Shopify
    SHOPIFY_API_KEY: str
    SHOPIFY_API_SECRET: str
    SHOPIFY_API_VERSION: str = "2026-04"  # Hard rule #5: Never hardcode in API calls

    # Encryption
    ENCRYPTION_KEY: str  # Fernet key for encrypting access tokens

    # Resend (optional - emails will be logged if not set)
    RESEND_API_KEY: str | None = None

    # Application
    APP_ENV: str = "production"  # Fail-closed: default to production for safety
    API_BASE_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


# Global settings instance
settings = Settings()
