"""
Verifies that `alembic upgrade head` produces a schema that exactly matches
the SQLAlchemy models (Base.metadata).

Every other test in this suite builds its schema straight from the models
via Base.metadata.create_all() on in-memory SQLite (see conftest.py) — that
never actually executes the Alembic migrations. That's how the offer_events
`metadata` vs `offer_event_metadata` column-name mismatch (fixed by
migration 011) went unnoticed by the test suite: the migrations only ever
ran for real in production, via `alembic upgrade head` in
.github/workflows/cd.yml. This test closes that gap by running the real
migration chain against a real Postgres database and diffing the result
against the models.

Requires a reachable Postgres server — migrations use Postgres-specific DDL
(native ENUM types) that doesn't translate to SQLite. Skipped automatically
when no server is reachable at DATABASE_URL's host (e.g. local dev without
Postgres running). CI's backend-test job always has a Postgres service
available (see .github/workflows/ci.yml), so this runs there.
"""

import asyncio
import os
import subprocess
import sys
import uuid
from pathlib import Path
from typing import Any

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _server_url(db_name: str) -> str:
    """Swap the database name in settings.DATABASE_URL for db_name."""
    base = settings.DATABASE_URL.rsplit("/", 1)[0]
    return f"{base}/{db_name}"


async def _server_reachable(admin_url: str) -> bool:
    engine = create_async_engine(admin_url)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
    finally:
        await engine.dispose()


async def _create_database(admin_url: str, db_name: str) -> None:
    engine = create_async_engine(admin_url, isolation_level="AUTOCOMMIT")
    try:
        async with engine.connect() as conn:
            await conn.execute(text(f'CREATE DATABASE "{db_name}"'))
    finally:
        await engine.dispose()


async def _drop_database(admin_url: str, db_name: str) -> None:
    engine = create_async_engine(admin_url, isolation_level="AUTOCOMMIT")
    try:
        async with engine.connect() as conn:
            # Force-disconnect anything still attached before dropping.
            await conn.execute(
                text(
                    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                    "WHERE datname = :db AND pid <> pg_backend_pid()"
                ),
                {"db": db_name},
            )
            await conn.execute(text(f'DROP DATABASE IF EXISTS "{db_name}"'))
    finally:
        await engine.dispose()


def _run_alembic_upgrade(database_url: str) -> None:
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=str(BACKEND_DIR),
        env={**os.environ, "DATABASE_URL": database_url},
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert result.returncode == 0, (
        "alembic upgrade head failed:\n"
        f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}"
    )


async def _diff_against_models(database_url: str) -> list[Any]:
    from alembic.autogenerate import compare_metadata
    from alembic.runtime.migration import MigrationContext

    from app.models.base import Base

    engine = create_async_engine(database_url)
    try:
        async with engine.connect() as conn:

            def _compare(sync_conn: Any) -> list[Any]:
                migration_ctx = MigrationContext.configure(sync_conn)
                return compare_metadata(migration_ctx, Base.metadata)

            return await conn.run_sync(_compare)
    finally:
        await engine.dispose()


def test_migrations_match_models() -> None:
    """
    Running every Alembic migration must produce exactly Base.metadata —
    no missing/extra tables, columns, indexes, or constraints.
    """
    admin_url = _server_url("postgres")

    if not asyncio.run(_server_reachable(admin_url)):
        pytest.skip("No reachable Postgres server at DATABASE_URL's host")

    db_name = f"pleero_migration_check_{uuid.uuid4().hex[:8]}"
    check_url = _server_url(db_name)

    asyncio.run(_create_database(admin_url, db_name))
    try:
        _run_alembic_upgrade(check_url)
        diffs = asyncio.run(_diff_against_models(check_url))
        assert diffs == [], (
            "`alembic upgrade head` produced a schema that differs from the "
            f"SQLAlchemy models — add a corrective migration: {diffs!r}"
        )
    finally:
        asyncio.run(_drop_database(admin_url, db_name))
