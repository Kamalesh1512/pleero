"""
Pytest configuration and fixtures for Pleero tests.
"""

import asyncio
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from httpx import AsyncClient

from app.core.config import settings
from app.models.base import Base
from app.main import app
from app.core.database import get_db


# Test database URL (use in-memory SQLite for fast tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def engine():
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
    )

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(engine):
    """Create database session for tests."""
    AsyncSessionLocal = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with AsyncSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session):
    """Create test client with database override."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def mock_shopify_webhook_headers():
    """Mock Shopify webhook headers."""
    return {
        "X-Shopify-Topic": "refunds/create",
        "X-Shopify-Shop-Domain": "test.myshopify.com",
        "X-Shopify-Hmac-Sha256": "test_hmac",
    }


@pytest.fixture
def mock_refund_webhook_payload():
    """Mock Shopify refunds/create webhook payload."""
    return {
        "id": 123456789,
        "order_id": 987654321,
        "created_at": "2025-01-15T10:30:00-05:00",
        "note": "Customer requested return",
        "refund_line_items": [
            {
                "id": 1,
                "line_item_id": 111,
                "quantity": 1,
                "subtotal": "100.00",
                "total_tax": "10.00",
            }
        ],
        "order": {
            "id": 987654321,
            "name": "#1001",
            "customer": {
                "id": 555,
                "email": "customer@example.com",
                "first_name": "John",
                "last_name": "Doe",
                "default_address": {
                    "country_code": "US",
                    "country": "United States",
                },
            },
        },
    }
