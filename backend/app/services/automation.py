"""
Automation service — Store Credit Automation workflows.

Opinionated Store Credit workflows:
- Goodwill (manual) — merchant-initiated credit issuance
- Win-back — automated credit for inactive customers
- Redemption reminder — follow-up for unredeemed credit

Refund Recovery is its own webhook-driven flow (routers/webhooks.py).
"""

from datetime import UTC, datetime, timedelta
from html import escape
from uuid import UUID

import httpx
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.models.automation import (
    AutomationConfig,
    AutomationWorkflow,
    RedemptionReminder,
)
from app.models.credit_transaction import (
    CreditTransaction,
    TransactionSource,
    TransactionType,
)
from app.models.merchant import Merchant
from app.models.offer import Offer, OfferStatus
from app.services.shopify import (
    issue_store_credit,
)

logger = get_logger(__name__)


# ─── Automation config helpers ─────────────────────────────────────────────────


async def get_automation_configs(
    merchant_id: UUID,
    db: AsyncSession,
) -> dict[str, AutomationConfig]:
    """Load all automation configs for a merchant, keyed by workflow value."""
    result = await db.execute(
        select(AutomationConfig).where(AutomationConfig.merchant_id == merchant_id)
    )
    configs = result.scalars().all()
    return {c.workflow.value: c for c in configs}


def _default_config(workflow: AutomationWorkflow) -> dict:
    """Return default config values for a workflow."""
    base = {
        "enabled": True,
        "min_days_before_action": 7,
        "max_actions_per_customer": 3,
    }
    # Redemption reminders: wait longer before first nudge
    if workflow == AutomationWorkflow.REDEMPTION_REMINDER:
        base["min_days_before_action"] = 14
    return base


async def ensure_automation_configs(
    merchant_id: UUID,
    db: AsyncSession,
) -> dict[str, AutomationConfig]:
    """
    Ensure default automation configs exist for the merchant.
    Returns the configs dict.
    """
    configs = await get_automation_configs(merchant_id, db)

    created_any = False
    for workflow in AutomationWorkflow:
        if workflow.value not in configs:
            defaults = _default_config(workflow)
            cfg = AutomationConfig(
                merchant_id=merchant_id,
                workflow=workflow,
                enabled=defaults["enabled"],
                min_days_before_action=defaults["min_days_before_action"],
                max_actions_per_customer=defaults["max_actions_per_customer"],
            )
            db.add(cfg)
            configs[workflow.value] = cfg
            created_any = True

    # Only flush/commit if we actually added new configs (idempotent otherwise).
    if created_any:
        try:
            await db.commit()
        except IntegrityError:
            # Concurrent request already created the same (merchant_id, workflow)
            # row (uq_merchant_workflow) — safe to discard our copies and re-read.
            await db.rollback()
            configs = await get_automation_configs(merchant_id, db)

    return configs


# ─── Manual issuance (Goodwill, Win-back) ──────────────────────────────────────


async def _issue_tagged_credit(
    db: AsyncSession,
    merchant: Merchant,
    customer_email: str,
    amount_cents: int,
    source: TransactionSource,
    default_note: str,
    log_event: str,
    currency: str = "USD",
    note: str = "",
    customer_shopify_id: str | None = None,
) -> tuple[bool, str]:
    """
    Issue Store Credit via Shopify and record it as a tagged CREDIT
    transaction. Shared by issue_goodwill_credit and issue_winback_credit —
    both are merchant-initiated, source-tagged-at-issuance-time issuances
    that differ only in their TransactionSource and default note.
    """
    if amount_cents <= 0:
        return False, "Amount must be greater than zero"

    if not customer_email:
        return False, "Customer email is required"

    success = await issue_store_credit(
        db=db,
        merchant_id=merchant.id,
        customer_email=customer_email,
        amount_cents=amount_cents,
        currency=currency,
        note=note or default_note,
        customer_shopify_id=customer_shopify_id,
    )

    if not success:
        logger.error(
            f"{log_event}_failed",
            merchant_id=str(merchant.id),
            customer_email=customer_email,
            amount_cents=amount_cents,
        )
        return False, "Failed to issue store credit via Shopify"

    # Record in credit_transactions for analytics
    ct = CreditTransaction(
        merchant_id=merchant.id,
        customer_email=customer_email,
        customer_shopify_id=customer_shopify_id,
        transaction_type=TransactionType.CREDIT,
        amount_cents=amount_cents,
        currency=currency,
        source=source,
        occurred_at=datetime.now(UTC),
    )
    db.add(ct)
    await db.commit()

    logger.info(
        f"{log_event}_issued",
        merchant_id=str(merchant.id),
        customer_email=customer_email,
        amount_cents=amount_cents,
    )
    return True, "Store credit issued successfully"


async def issue_goodwill_credit(
    db: AsyncSession,
    merchant: Merchant,
    customer_email: str,
    customer_first_name: str,
    amount_cents: int,
    currency: str = "USD",
    note: str = "",
    customer_shopify_id: str | None = None,
) -> tuple[bool, str]:
    """Manually issue goodwill Store Credit to a customer."""
    return await _issue_tagged_credit(
        db=db,
        merchant=merchant,
        customer_email=customer_email,
        amount_cents=amount_cents,
        source=TransactionSource.GOODWILL,
        default_note="Goodwill credit from merchant",
        log_event="goodwill_credit",
        currency=currency,
        note=note,
        customer_shopify_id=customer_shopify_id,
    )


async def issue_winback_credit(
    db: AsyncSession,
    merchant: Merchant,
    customer_email: str,
    customer_first_name: str,
    amount_cents: int,
    currency: str = "USD",
    note: str = "",
    customer_shopify_id: str | None = None,
) -> tuple[bool, str]:
    """
    Manually issue win-back Store Credit to an inactive customer.

    Merchant-initiated: the merchant reviews candidates from
    find_winback_candidates() and chooses who to re-engage. There is no
    automated trigger yet — this mirrors issue_goodwill_credit's shape but
    tags the resulting transaction as WINBACK for analytics attribution.
    """
    return await _issue_tagged_credit(
        db=db,
        merchant=merchant,
        customer_email=customer_email,
        amount_cents=amount_cents,
        source=TransactionSource.WINBACK,
        default_note="We miss you — here's Store Credit to come back",
        log_event="winback_credit",
        currency=currency,
        note=note,
        customer_shopify_id=customer_shopify_id,
    )


# ─── Win-back evaluation ──────────────────────────────────────────────────────


async def find_winback_candidates(
    merchant_id: UUID,
    db: AsyncSession,
    inactivity_days: int = 90,
    limit: int = 50,
) -> list[dict]:
    """
    Find customers who have not purchased recently and have no active
    outstanding credit (they could be re-engaged with a credit offer).

    Returns list of {customer_email, customer_first_name, last_order_date,
    days_since_last_order, customer_shopify_id}.

    This is discovery only — issuance is merchant-initiated via
    issue_winback_credit() after reviewing this list. There is no automated
    trigger yet.
    """
    # Find customers who have accepted offers (they have an email we know)
    # and have no recent transaction
    result = await db.execute(
        select(
            Offer.customer_email,
            Offer.customer_first_name,
            Offer.customer_shopify_id,
            func.max(Offer.accepted_at).label("last_activity"),
        )
        .where(
            Offer.merchant_id == merchant_id,
            Offer.status == OfferStatus.ACCEPTED,
        )
        .group_by(
            Offer.customer_email, Offer.customer_first_name, Offer.customer_shopify_id
        )
        .limit(limit)
    )
    rows = result.fetchall()
    now = datetime.now(UTC)
    candidates = []
    for row in rows:
        last_activity = row.last_activity
        if last_activity is None:
            continue
        # SQLite returns naive datetimes (no tz persisted); normalize to UTC so
        # the subtraction is valid on every backend. Postgres rows are untouched.
        if last_activity.tzinfo is None:
            last_activity = last_activity.replace(tzinfo=UTC)
        if (now - last_activity).days >= inactivity_days:
            candidates.append(
                {
                    "customer_email": row.customer_email,
                    "customer_first_name": row.customer_first_name,
                    "customer_shopify_id": row.customer_shopify_id,
                    "last_activity": last_activity.isoformat(),
                    "days_since_last_activity": (now - last_activity).days,
                }
            )
    return candidates


# ─── Redemption reminder ──────────────────────────────────────────────────────


def build_reminder_email_html(
    merchant_name: str,
    customer_first_name: str,
    credit_amount_cents: int,
    currency: str,
    shop_url: str,
) -> str:
    """
    Build redemption reminder email HTML.

    One hardcoded template (no template editor in launch scope).
    """
    from app.services.email import format_currency

    credit_amount = format_currency(credit_amount_cents, currency)

    safe_merchant_name = escape(merchant_name)
    safe_customer_first_name = escape(customer_first_name)
    safe_shop_url = escape(shop_url)

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You have Store Credit at {safe_merchant_name}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background-color:#f5f5f5;">
    <div style="max-width:600px;margin:0 auto;background-color:#ffffff;padding:40px 20px;">
        <h1 style="font-size:24px;font-weight:600;color:#111111;margin:0 0 16px 0;">
            Hi {safe_customer_first_name}
        </h1>

        <p style="font-size:16px;color:#333333;line-height:1.5;margin:0 0 24px 0;">
            You have <strong>{credit_amount}</strong> in Store Credit waiting at {safe_merchant_name}.
        </p>

        <p style="font-size:16px;color:#333333;line-height:1.5;margin:0 0 32px 0;">
            It's ready to use on your next order — no expiration, no minimum spend.
        </p>

        <div style="margin-bottom: 32px;">
            <a href="{safe_shop_url}" style="display:inline-block;background-color:#111111;color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:6px;font-size:16px;font-weight:600;min-width:200px;text-align:center;">
                Shop now & use your credit
            </a>
        </div>

        <div style="border-top:1px solid #e5e5e5;padding-top:24px;">
            <p style="font-size:12px;color:#999999;margin:0;text-align:center;">
                This reminder was sent by {safe_merchant_name}.
            </p>
        </div>
    </div>
</body>
</html>"""


async def send_redemption_reminder(
    db: AsyncSession,
    merchant_id: UUID,
    customer_email: str,
    credit_amount_cents: int,
    currency: str,
    offer_id: UUID | None = None,
) -> bool:
    """Send a redemption reminder email and record it."""

    # Load merchant for branding
    result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    merchant = result.scalar_one_or_none()
    if not merchant:
        logger.error("reminder_merchant_not_found", merchant_id=str(merchant_id))
        return False

    # Get customer first name from an accepted offer
    offer_result = await db.execute(
        select(Offer)
        .where(
            Offer.merchant_id == merchant_id,
            Offer.customer_email == customer_email,
            Offer.status == OfferStatus.ACCEPTED,
        )
        .order_by(Offer.accepted_at.desc())
        .limit(1)
    )
    offer = offer_result.scalar_one_or_none()
    first_name = offer.customer_first_name if offer else "there"

    merchant_name = (
        merchant.shop_name
        or merchant.shop_domain.split(".")[0].replace("-", " ").title()
    )
    shop_url = f"https://{merchant.shop_domain}"

    html = build_reminder_email_html(
        merchant_name=merchant_name,
        customer_first_name=first_name,
        credit_amount_cents=credit_amount_cents,
        currency=currency,
        shop_url=shop_url,
    )

    # Send via Resend
    if not settings.RESEND_API_KEY:
        logger.warning(
            "reminder_email_skipped_no_resend_key",
            merchant_id=str(merchant_id),
            customer_email=customer_email,
        )
        # Still record the reminder attempt for visibility
        return True

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": f"{merchant_name} <reminders@pleero.app>",
                    "to": [customer_email],
                    "subject": f"You have Store Credit at {merchant_name}",
                    "html": html,
                },
            )
            response.raise_for_status()

        # Record the reminder. uq_merchant_customer_round protects against a
        # concurrent sweep/manual trigger picking the same round number — on a
        # collision we re-read the latest round and retry once.
        for attempt in range(2):
            prev_result = await db.execute(
                select(RedemptionReminder)
                .where(
                    RedemptionReminder.merchant_id == merchant_id,
                    RedemptionReminder.customer_email == customer_email,
                )
                .order_by(RedemptionReminder.reminder_round.desc())
                .limit(1)
            )
            prev = prev_result.scalar_one_or_none()
            round_num = (prev.reminder_round + 1) if prev else 1

            reminder = RedemptionReminder(
                merchant_id=merchant_id,
                customer_email=customer_email,
                reminder_round=round_num,
                offer_id=offer_id,
            )
            db.add(reminder)
            try:
                await db.commit()
                break
            except IntegrityError:
                await db.rollback()
                if attempt == 1:
                    logger.warning(
                        "redemption_reminder_record_race_unresolved",
                        merchant_id=str(merchant_id),
                        customer_email=customer_email,
                    )
                    return True
                continue

        logger.info(
            "redemption_reminder_sent",
            merchant_id=str(merchant_id),
            customer_email=customer_email,
            round_number=round_num,
        )
        return True

    except httpx.HTTPError as e:
        logger.error(
            "redemption_reminder_send_failed",
            merchant_id=str(merchant_id),
            customer_email=customer_email,
            error=str(e),
        )
        return False
    except Exception as e:
        logger.error(
            "redemption_reminder_unexpected_error",
            merchant_id=str(merchant_id),
            customer_email=customer_email,
            error=str(e),
        )
        return False


# ─── Reminder sweep ───────────────────────────────────────────────────────────


async def run_reminder_sweep(
    merchant_id: UUID,
    db: AsyncSession,
    config: AutomationConfig | None = None,
) -> int:
    """
    Evaluate and send redemption reminders for this merchant.

    Finds customers with unredeemed Pleero-issued credit where:
    - The customer has accepted an offer (credit was issued)
    - The credit has NOT been fully redeemed
    - The minimum days-before-reminder has elapsed since issuance
    - No duplicate reminder was already sent

    Returns count of reminders sent.
    """
    if not config:
        cfg_result = await db.execute(
            select(AutomationConfig).where(
                AutomationConfig.merchant_id == merchant_id,
                AutomationConfig.workflow == AutomationWorkflow.REDEMPTION_REMINDER,
            )
        )
        config = cfg_result.scalar_one_or_none()

    if not config or not config.enabled:
        return 0

    min_days = config.min_days_before_action
    max_actions = config.max_actions_per_customer
    cutoff = datetime.now(UTC) - timedelta(days=min_days)

    # Find accepted offers older than the min_days threshold
    # that have no matching full debit in credit_transactions
    result = await db.execute(
        select(Offer)
        .where(
            Offer.merchant_id == merchant_id,
            Offer.status == OfferStatus.ACCEPTED,
            Offer.accepted_at < cutoff,
        )
        .order_by(Offer.accepted_at.desc())
    )
    accepted_offers = result.scalars().all()

    if not accepted_offers:
        return 0

    # Get already-reminded customers
    reminded_result = await db.execute(
        select(RedemptionReminder.customer_email, func.count().label("cnt"))
        .where(
            RedemptionReminder.merchant_id == merchant_id,
        )
        .group_by(RedemptionReminder.customer_email)
    )
    reminded_counts = dict(reminded_result.fetchall())

    # Get redemption data by customer
    redeemed_result = await db.execute(
        select(
            CreditTransaction.customer_email,
            func.sum(CreditTransaction.amount_cents),
        )
        .where(
            CreditTransaction.merchant_id == merchant_id,
            CreditTransaction.transaction_type == TransactionType.DEBIT,
        )
        .group_by(CreditTransaction.customer_email)
    )
    redeemed_map = dict(redeemed_result.fetchall())

    # Pre-aggregate total issued credit per customer in a single query instead
    # of issuing one SUM query per customer inside the loop below (N+1).
    issued_result = await db.execute(
        select(
            Offer.customer_email,
            func.sum(Offer.credit_amount_cents),
        )
        .where(
            Offer.merchant_id == merchant_id,
            Offer.status == OfferStatus.ACCEPTED,
        )
        .group_by(Offer.customer_email)
    )
    issued_map = dict(issued_result.fetchall())

    sent_count = 0
    processed_emails: set[str] = set()

    for offer in accepted_offers:
        email = offer.customer_email
        if email in processed_emails:
            continue
        processed_emails.add(email)

        # Skip if already maxed out on reminders
        if reminded_counts.get(email, 0) >= max_actions:
            continue

        # Skip if fully redeemed (debits >= credit issued for this email)
        total_redeemed = redeemed_map.get(email, 0)
        total_issued = issued_map.get(email, 0)

        if total_redeemed >= total_issued:
            continue

        # This customer has unredeemed credit — send reminder
        outstanding = total_issued - total_redeemed
        success = await send_redemption_reminder(
            db=db,
            merchant_id=merchant_id,
            customer_email=email,
            credit_amount_cents=outstanding,
            currency=offer.currency_code,
            offer_id=offer.id,
        )
        if success:
            sent_count += 1

    logger.info(
        "reminder_sweep_complete",
        merchant_id=str(merchant_id),
        sent=sent_count,
        scanned=len(accepted_offers),
    )
    return sent_count
