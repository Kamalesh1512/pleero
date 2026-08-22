"""
Tests for Sentry init (app.core.sentry).

Covers: no-op when SENTRY_DSN is unset, correct kwargs when it is set, the
Celery-only CeleryIntegration, idempotency, and that PII is never sent.
"""

from unittest.mock import MagicMock

import app.core.sentry as sentry_module
from app.core.config import settings
from app.core.sentry import init_sentry


def _reset(monkeypatch):
    """Each process only initializes once — reset the guard between tests."""
    monkeypatch.setattr(sentry_module, "_initialized", False)


def test_noop_when_dsn_unset(monkeypatch):
    _reset(monkeypatch)
    monkeypatch.setattr(settings, "SENTRY_DSN", None)
    mock_init = MagicMock()
    monkeypatch.setattr(sentry_module.sentry_sdk, "init", mock_init)

    init_sentry()

    mock_init.assert_not_called()
    assert sentry_module._initialized is False


def test_initializes_with_dsn_set(monkeypatch):
    _reset(monkeypatch)
    monkeypatch.setattr(settings, "SENTRY_DSN", "https://fake@sentry.example/1")
    monkeypatch.setattr(settings, "APP_ENV", "production")
    mock_init = MagicMock()
    monkeypatch.setattr(sentry_module.sentry_sdk, "init", mock_init)

    init_sentry()

    mock_init.assert_called_once()
    _, kwargs = mock_init.call_args
    assert kwargs["dsn"] == "https://fake@sentry.example/1"
    assert kwargs["environment"] == "production"
    assert kwargs["send_default_pii"] is False
    assert kwargs["integrations"] == []
    assert sentry_module._initialized is True


def test_celery_flag_adds_celery_integration(monkeypatch):
    _reset(monkeypatch)
    monkeypatch.setattr(settings, "SENTRY_DSN", "https://fake@sentry.example/1")
    mock_init = MagicMock()
    monkeypatch.setattr(sentry_module.sentry_sdk, "init", mock_init)

    init_sentry(celery=True)

    _, kwargs = mock_init.call_args
    assert len(kwargs["integrations"]) == 1
    assert type(kwargs["integrations"][0]).__name__ == "CeleryIntegration"


def test_second_call_is_noop(monkeypatch):
    _reset(monkeypatch)
    monkeypatch.setattr(settings, "SENTRY_DSN", "https://fake@sentry.example/1")
    mock_init = MagicMock()
    monkeypatch.setattr(sentry_module.sentry_sdk, "init", mock_init)

    init_sentry()
    init_sentry()

    mock_init.assert_called_once()
