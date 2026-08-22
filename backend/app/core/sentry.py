"""
Sentry error monitoring — shared init for every process that touches this
codebase.

The FastAPI API server and the Celery worker/beat processes are separate
Python processes (the worker entrypoint is `celery -A app.core.celery_app`,
which never imports app.main), so each process must call init_sentry() for
itself. A module-level init in app.main only covers the API process.

Never sends PII/secrets to Sentry: send_default_pii is always False, and no
request/task bodies are attached.
"""

import sentry_sdk
from sentry_sdk.integrations.celery import CeleryIntegration

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_initialized = False


def init_sentry(*, celery: bool = False) -> None:
    """
    Initialize Sentry for the current process, if SENTRY_DSN is configured.

    Idempotent and safe to call multiple times (e.g. once from app.main and
    again from a test) — only the first call in a process takes effect.

    Args:
        celery: True when called from the Celery worker/beat process. Adds
            CeleryIntegration so task failures, retries, and beat schedule
            runs are captured with task-level context (task name, id, args).
    """
    global _initialized
    if _initialized or not settings.SENTRY_DSN:
        return

    integrations = [CeleryIntegration(monitor_beat_tasks=True)] if celery else []

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.APP_ENV,
        # We do NOT set release here — the backend image tag is the deploy id.
        traces_sample_rate=0.0,
        send_default_pii=False,  # never send customer PII/blobs to Sentry
        integrations=integrations,
    )
    _initialized = True
    logger.info("sentry_initialized", env=settings.APP_ENV, celery=celery)
