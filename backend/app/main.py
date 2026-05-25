"""
Main FastAPI application.
Entry point for the Pleero backend.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.routers import auth, billing, dashboard, offers, webhooks

# Configure logging on import
configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan events.
    Runs on startup and shutdown.
    """
    # Startup
    logger.info(
        "application_startup",
        app_env=settings.APP_ENV,
        api_base_url=settings.API_BASE_URL,
    )

    yield

    # Shutdown
    logger.info("application_shutdown")


# Create FastAPI app
app = FastAPI(
    title="Pleero API",
    description="Shopify app that converts refund requests into store credit offers",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
# Shopify embedded apps can be loaded from admin.shopify.com, *.myshopify.com,
# or the app's own Vercel/custom domain depending on context. Since all protected
# routes are secured by JWT session token validation (get_current_shop), CORS
# acts as a secondary browser-side guard only — we allow all HTTPS origins.
# Bearer token auth does not use cookies, so allow_credentials stays False.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(webhooks.router)
app.include_router(offers.router)
app.include_router(dashboard.router)
app.include_router(billing.router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """
    Health check endpoint.

    Returns:
        Status message
    """
    return {
        "status": "healthy",
    }


@app.get("/")
async def root() -> dict[str, str]:
    """
    Root endpoint.

    Returns:
        Welcome message
    """
    return {
        "message": "Pleero API",
        "version": "1.0.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.APP_ENV == "development",
    )
