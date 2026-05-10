"""
Structured logging setup with structlog.
JSON output format with request_id correlation.
Hard rule #8: Always use structlog — never print()
"""

import logging
import sys
from typing import Any

import structlog
from structlog.types import Processor

from app.core.config import settings


def configure_logging() -> None:
    """
    Configure structlog for the application.

    - JSON output in production
    - Pretty console output in development
    - Request ID correlation
    - Timestamp in ISO format
    """

    # Determine if we should use colored output
    use_colors = settings.APP_ENV == "development"

    # Common processors for all environments
    shared_processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    # Configure structlog
    if use_colors:
        # Development: pretty console output
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=True)
        ]
    else:
        # Production: JSON output
        processors = shared_processors + [
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer()
        ]

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.INFO if settings.APP_ENV == "production" else logging.DEBUG,
    )


def get_logger(name: str | None = None) -> Any:
    """
    Get a structured logger instance.

    Usage:
        logger = get_logger(__name__)
        logger.info("event_happened", user_id=123, action="login")
    """
    return structlog.get_logger(name)
