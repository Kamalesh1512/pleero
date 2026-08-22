"""
Database models for Pleero.
Import all models here so Alembic can detect them.
"""

from app.models.base import Base, TimestampMixin
from app.models.merchant import Merchant, SubscriptionStatus
from app.models.offer import Offer, OfferStatus
from app.models.offer_event import OfferEvent, EventType
from app.models.report_request import ReportRequest
from app.models.waitlist_submission import WaitlistSubmission
from app.models.credit_transaction import (
    CreditTransaction,
    TransactionType,
    TransactionSource,
)
from app.models.automation import (
    AutomationConfig,
    AutomationWorkflow,
    RedemptionReminder,
)

__all__ = [
    "Base",
    "TimestampMixin",
    "Merchant",
    "SubscriptionStatus",
    "Offer",
    "OfferStatus",
    "OfferEvent",
    "EventType",
    "ReportRequest",
    "WaitlistSubmission",
    "CreditTransaction",
    "TransactionType",
    "TransactionSource",
    "AutomationConfig",
    "AutomationWorkflow",
    "RedemptionReminder",
]
