"""
Celery application for async and scheduled work.

Runs on the same Redis instance as the session store (broker + result backend).
Only used for asynchronous/scheduled work — email delivery with retry, offer
expiry sweeps, later redemption reminders and win-back — never for CRUD.

Hard rule #4 still applies inside tasks: all external I/O stays async (httpx),
the sync Celery worker merely wraps async entrypoints with asyncio.run().
"""

from celery import Celery

from app.core.config import settings
from app.core.sentry import init_sentry

# The worker/beat processes are separate Python processes from the API
# server (entrypoint: `celery -A app.core.celery_app worker`/`beat`) and
# never import app.main, so Sentry must be initialized here too.
init_sentry(celery=True)

celery_app = Celery(
    "pleero",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.email_tasks",
        "app.tasks.offer_tasks",
        "app.tasks.automation_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    # Must match the queue name the worker listens on (docker-compose.production.yml
    # runs `celery worker -Q default`). Without this, tasks publish to Celery's
    # built-in default queue name ("celery") and the worker never consumes them.
    task_default_queue="default",
    beat_schedule={
        "expire-stale-offers": {
            "task": "app.tasks.offer_tasks.expire_stale_offers",
            "schedule": 86400.0,  # daily
        },
        "redemption-reminder-sweep": {
            "task": "app.tasks.automation_tasks.redemption_reminder_sweep",
            "schedule": 86400.0,  # daily
        },
        "winback-evaluation-sweep": {
            "task": "app.tasks.automation_tasks.winback_evaluation_sweep",
            "schedule": 86400.0,  # daily
        },
    },
)
