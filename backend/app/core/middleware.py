"""
HTTP middleware for request correlation.

Binds a request_id (client-provided X-Request-Id or generated) to the
structlog contextvars so every log line emitted during a request carries the
same correlation id. Also logs a structured summary for each request.
"""

from uuid import uuid4

import sentry_sdk
import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import get_logger

logger = get_logger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware that binds a request_id to structlog context for the request's
    lifetime and logs a completion summary line.

    Honors an incoming X-Request-Id header (idempotent retries / client
    correlation) and otherwise generates one. The contextvars are always
    cleared so one request's id never leaks into another.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid4())
        structlog.contextvars.bind_contextvars(request_id=request_id)
        # No-op if Sentry isn't initialized (e.g. SENTRY_DSN unset, tests) —
        # correlates any error captured for this request with its log lines.
        sentry_sdk.set_tag("request_id", request_id)

        try:
            response = await call_next(request)
            status = response.status_code
        except Exception:
            structlog.contextvars.clear_contextvars()
            raise

        logger.info(
            "request_completed",
            method=request.method,
            path=str(request.url.path),
            status=status,
        )
        response.headers["X-Request-Id"] = request_id
        structlog.contextvars.clear_contextvars()
        return response
