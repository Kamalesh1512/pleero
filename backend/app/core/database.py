"""
Async database session management with SQLAlchemy.
Uses asyncpg driver for PostgreSQL.
"""

from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings

# Create async engine
# SQL echo only in development AND not using production database
# Fail-closed: if APP_ENV is missing or wrong, echo defaults to False
should_echo = (
    settings.APP_ENV == "development"
    and "localhost" in settings.DATABASE_URL
)

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=should_echo,
    poolclass=NullPool if settings.APP_ENV == "test" else None,
    pool_pre_ping=True,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency for database sessions.

    Usage:
        @app.get("/")
        async def route(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
