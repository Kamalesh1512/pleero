"""
Analytics service — computes Store Credit intelligence metrics from
observed lifecycle events and Shopify data.

Every metric distinguishes between _observed_ and _attributed_ values
so the consumer understands exactly what Pleero knows vs. derives.

Cache: analytics results are cached in Redis with 5-minute TTL.
"""

import json
import uuid
from datetime import UTC, datetime, timedelta

import redis.asyncio as redis_async
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.models.automation import RedemptionReminder
from app.models.credit_transaction import (
    CreditTransaction,
    TransactionSource,
    TransactionType,
)
from app.models.offer import Offer, OfferStatus
from app.models.offer_event import EventType, OfferEvent
from app.schemas.analytics import (
    CsvExportRow,
    AutomationPerformance,
    AutomationWorkflowPerformance,
    CreditSourceBreakdown,
    CreditSourceItem,
    RefundRecoveryFunnel,
    StoreCreditOverview,
    TimeSeriesPoint,
    TimeSeriesResponse,
)

logger = get_logger(__name__)

# ─── Redis cache ──────────────────────────────────────────────────────────────

CACHE_TTL_SECONDS = 300  # 5 minutes

_CACHE_PREFIX = "analytics:v1:"


def _cache_key(merchant_id: str, metric: str, suffix: str = "") -> str:
    return f"{_CACHE_PREFIX}{merchant_id}:{metric}{suffix}"


async def _get_cached(key: str) -> dict | None:
    """Read serialised JSON from Redis. Returns None on miss or error."""
    try:
        r = redis_async.from_url(settings.REDIS_URL, decode_responses=True)
        raw = await r.get(key)
        await r.aclose()
        if raw is not None:
            return json.loads(raw)
    except Exception as exc:
        logger.warning("analytics_cache_read_error", key=key, error=str(exc))
    return None


async def _set_cached(key: str, data: dict) -> None:
    """Write serialised JSON to Redis with TTL."""
    try:
        r = redis_async.from_url(settings.REDIS_URL, decode_responses=True)
        await r.setex(key, CACHE_TTL_SECONDS, json.dumps(data, default=str))
        await r.aclose()
    except Exception as exc:
        logger.warning("analytics_cache_write_error", key=key, error=str(exc))


# ─── Period helpers ───────────────────────────────────────────────────────────


def _period_limits(period_days: int) -> tuple[datetime, datetime]:
    """Return (start, end) for the given period ending now."""
    now = datetime.now(UTC)
    start = now - timedelta(days=period_days)
    return start, now


# ─── Offer lifecycle helpers ─────────────────────────────────────────────────


def _single_or_zero(row) -> int:
    """Return the value or 0 for a sum/count query result."""
    return row if row is not None else 0


# ─── Overview ─────────────────────────────────────────────────────────────────


async def get_store_credit_overview(
    merchant_id: str,
    db: AsyncSession,
    period_days: int = 30,
    *,
    skip_cache: bool = False,
) -> StoreCreditOverview:
    """
    Top-level Store Credit health metrics.

    Methodology:
      - credit_issued: sum of credit_amount_cents of ACCEPTED offers in window
      - credit_redeemed: sum of observed debit amounts (from Shopify webhook)
      - outstanding: issued - redeemed (only Pleero-observed)
      - redemption_rate: redeemed / issued * 100
      - customers_with_active_credit: distinct customers w/ issued > redeemed
      - revenue_influenced: total redeemed cents (attributed proxy)
    """
    cache_key_name = _cache_key(str(merchant_id), "overview", f":{period_days}d")
    if not skip_cache:
        cached = await _get_cached(cache_key_name)
        if cached is not None:
            return StoreCreditOverview(**cached)

    start, end = _period_limits(period_days)

    # ── Issuance from accepted offers ──────────────────────────────────────
    issued_result = await db.execute(
        select(
            func.coalesce(func.sum(Offer.credit_amount_cents), 0).label("issued"),
            func.coalesce(func.sum(Offer.bonus_applied_cents), 0).label("bonus"),
        ).where(
            Offer.merchant_id == merchant_id,
            Offer.status == OfferStatus.ACCEPTED,
            Offer.accepted_at >= start,
            Offer.accepted_at <= end,
        )
    )
    issued_row = issued_result.one()
    credit_issued_cents = _single_or_zero(issued_row.issued)

    # ── Redemption from observed debit events ─────────────────────────────
    # credit_redeemed_cents pulls from the CreditTransaction table (debit events
    # received via the store_credit_accounts/debit webhook).
    redeemed_result = await db.execute(
        select(func.coalesce(func.sum(CreditTransaction.amount_cents), 0)).where(
            CreditTransaction.merchant_id == merchant_id,
            CreditTransaction.transaction_type == TransactionType.DEBIT,
            CreditTransaction.occurred_at >= start,
            CreditTransaction.occurred_at <= end,
        )
    )
    redeemed_cents = _single_or_zero(redeemed_result.scalar())

    # ── Derived metrics ───────────────────────────────────────────────────
    outstanding = max(0, credit_issued_cents - redeemed_cents)
    redemption_rate = (
        round(redeemed_cents / credit_issued_cents * 100, 1)
        if credit_issued_cents > 0
        else 0.0
    )

    # ── Average days to redemption ────────────────────────────────────────
    avg_days = None
    # For offers that were accepted AND have a matching debit.
    # Match by customer email across offers and credit transactions.
    avg_result = await db.execute(
        select(
            func.avg(
                func.extract("epoch", CreditTransaction.occurred_at - Offer.accepted_at)
                / 86400
            )
        ).where(
            Offer.merchant_id == merchant_id,
            Offer.status == OfferStatus.ACCEPTED,
            Offer.customer_email
            == CreditTransaction.customer_email,  # inner join condition
            CreditTransaction.merchant_id == merchant_id,
            CreditTransaction.transaction_type == TransactionType.DEBIT,
            CreditTransaction.occurred_at >= start,
        )
    )
    avg_val = avg_result.scalar()
    if avg_val is not None:
        avg_days = round(float(avg_val), 1)

    # ── Customers with active credit ─────────────────────────────────────
    # Distinct customers who have been issued credit but haven't fully
    # redeemed it yet: SUM(issued) - SUM(redeemed) > 0, computed with a
    # single aggregated query per side rather than a per-customer scan.
    issued_by_customer = await db.execute(
        select(
            Offer.customer_email,
            func.coalesce(func.sum(Offer.credit_amount_cents), 0).label("issued"),
        )
        .where(
            Offer.merchant_id == merchant_id,
            Offer.status == OfferStatus.ACCEPTED,
            Offer.accepted_at >= start,
        )
        .group_by(Offer.customer_email)
    )
    issued_by_customer_map = dict(issued_by_customer.fetchall())

    active_customers = 0
    if issued_by_customer_map:
        redeemed_result = await db.execute(
            select(
                CreditTransaction.customer_email,
                func.sum(CreditTransaction.amount_cents),
            )
            .where(
                CreditTransaction.merchant_id == merchant_id,
                CreditTransaction.transaction_type == TransactionType.DEBIT,
                CreditTransaction.customer_email.in_(issued_by_customer_map.keys()),
            )
            .group_by(CreditTransaction.customer_email)
        )
        redeemed_map = dict(redeemed_result.fetchall())

        for email, issued in issued_by_customer_map.items():
            if issued > redeemed_map.get(email, 0):
                active_customers += 1

    overview = StoreCreditOverview(
        credit_issued_cents=credit_issued_cents,
        credit_redeemed_cents=redeemed_cents,
        outstanding_credit_cents=outstanding,
        redemption_rate=redemption_rate,
        avg_days_to_redemption=avg_days,
        customers_with_active_credit=active_customers,
        revenue_influenced_cents=redeemed_cents,
        period_label=f"Last {period_days} days",
        cached_at=datetime.now(UTC),
    )

    # Cache and return
    await _set_cached(cache_key_name, overview.model_dump(mode="json"))
    return overview


# ─── Time series ──────────────────────────────────────────────────────────────


async def get_time_series(
    merchant_id: str,
    db: AsyncSession,
    period_days: int = 30,
    *,
    skip_cache: bool = False,
) -> TimeSeriesResponse:
    """Daily time-series data for the requested window."""
    cache_key_name = _cache_key(str(merchant_id), "ts", f":{period_days}d")
    if not skip_cache:
        cached = await _get_cached(cache_key_name)
        if cached is not None:
            return TimeSeriesResponse(**cached)

    start, end = _period_limits(period_days)

    # Offer creation events by day
    sent_result = await db.execute(
        select(
            func.date(Offer.created_at).label("day"),
            func.count(Offer.id).label("cnt"),
        )
        .where(
            Offer.merchant_id == merchant_id,
            Offer.created_at >= start,
        )
        .group_by(func.date(Offer.created_at))
        .order_by(func.date(Offer.created_at))
    )
    sent_by_day = {str(row.day): row.cnt for row in sent_result.fetchall()}

    # Accepted offers by day
    accepted_result = await db.execute(
        select(
            func.date(Offer.accepted_at).label("day"),
            func.count(Offer.id).label("cnt"),
            func.coalesce(func.sum(Offer.credit_amount_cents), 0).label("issued"),
        )
        .where(
            Offer.merchant_id == merchant_id,
            Offer.status == OfferStatus.ACCEPTED,
            Offer.accepted_at >= start,
        )
        .group_by(func.date(Offer.accepted_at))
        .order_by(func.date(Offer.accepted_at))
    )
    accepted_by_day: dict[str, tuple[int, int]] = {
        str(row.day): (row.cnt, row.issued) for row in accepted_result.fetchall()
    }

    # Redemption by day
    redeemed_result = await db.execute(
        select(
            func.date(CreditTransaction.occurred_at).label("day"),
            func.coalesce(func.sum(CreditTransaction.amount_cents), 0).label("cnt"),
        )
        .where(
            CreditTransaction.merchant_id == merchant_id,
            CreditTransaction.transaction_type == TransactionType.DEBIT,
            CreditTransaction.occurred_at >= start,
        )
        .group_by(func.date(CreditTransaction.occurred_at))
        .order_by(func.date(CreditTransaction.occurred_at))
    )
    redeemed_by_day: dict[str, int] = {
        str(row.day): row.cnt for row in redeemed_result.fetchall()
    }

    # Build daily points
    points: list[TimeSeriesPoint] = []
    current = start
    while current <= end:
        day_key = current.strftime("%Y-%m-%d")
        sent = sent_by_day.get(day_key, 0)
        acc_info = accepted_by_day.get(day_key, (0, 0))
        redeemed = redeemed_by_day.get(day_key, 0)

        points.append(
            TimeSeriesPoint(
                date=day_key,
                credit_issued_cents=acc_info[1],
                credit_redeemed_cents=redeemed,
                offers_sent=sent,
                offers_accepted=acc_info[0],
            )
        )
        current += timedelta(days=1)

    response = TimeSeriesResponse(points=points, period_days=period_days)
    await _set_cached(cache_key_name, response.model_dump(mode="json"))
    return response


# ─── Credit source breakdown ──────────────────────────────────────────────────


async def get_credit_source_breakdown(
    merchant_id: str,
    db: AsyncSession,
    period_days: int = 30,
) -> CreditSourceBreakdown:
    """
    Breakdown of issued credit by source: refund_recovery, goodwill, winback.

    Refund Recovery is computed from the Offer table directly (complete and
    reliable back to launch, including offers accepted before the webhook
    source-matching heuristic in routers.webhooks existed). Goodwill and
    Win-back are computed from CreditTransaction rows, which are tagged with
    their source at issuance time (services.automation._issue_tagged_credit).
    """
    start, end = _period_limits(period_days)
    merchant_uuid = uuid.UUID(str(merchant_id))

    rr_result = await db.execute(
        select(
            func.coalesce(func.sum(Offer.credit_amount_cents), 0).label("issued"),
            func.count(Offer.id).label("cnt"),
        ).where(
            Offer.merchant_id == merchant_uuid,
            Offer.status == OfferStatus.ACCEPTED,
            Offer.accepted_at >= start,
            Offer.accepted_at <= end,
        )
    )
    rr_row = rr_result.one()
    rr_issued = _single_or_zero(rr_row.issued)
    rr_count = _single_or_zero(rr_row.cnt)

    other_result = await db.execute(
        select(
            CreditTransaction.source,
            func.coalesce(func.sum(CreditTransaction.amount_cents), 0).label("issued"),
            func.count(CreditTransaction.id).label("cnt"),
        )
        .where(
            CreditTransaction.merchant_id == merchant_uuid,
            CreditTransaction.transaction_type == TransactionType.CREDIT,
            CreditTransaction.source.in_(
                [TransactionSource.GOODWILL, TransactionSource.WINBACK]
            ),
            CreditTransaction.occurred_at >= start,
            CreditTransaction.occurred_at <= end,
        )
        .group_by(CreditTransaction.source)
    )
    other_by_source = {row.source: (row.issued, row.cnt) for row in other_result.all()}
    gw_issued, gw_count = other_by_source.get(TransactionSource.GOODWILL, (0, 0))
    wb_issued, wb_count = other_by_source.get(TransactionSource.WINBACK, (0, 0))

    total = rr_issued + gw_issued + wb_issued

    def _pct(value: int) -> float:
        return round(value / total * 100, 1) if total > 0 else 0.0

    sources = [
        CreditSourceItem(
            source="refund_recovery",
            label="Refund Recovery",
            issued_cents=rr_issued,
            count=rr_count,
            percentage=_pct(rr_issued),
        ),
        CreditSourceItem(
            source="goodwill",
            label="Goodwill",
            issued_cents=gw_issued,
            count=gw_count,
            percentage=_pct(gw_issued),
        ),
        CreditSourceItem(
            source="winback",
            label="Win-back",
            issued_cents=wb_issued,
            count=wb_count,
            percentage=_pct(wb_issued),
        ),
    ]

    return CreditSourceBreakdown(sources=sources)


# ─── Refund Recovery funnel ───────────────────────────────────────────────────


async def get_refund_recovery_funnel(
    merchant_id: str,
    db: AsyncSession,
    period_days: int = 30,
) -> RefundRecoveryFunnel:
    """
    Full funnel: eligible refunds → offers → views → accepts → credit → redeemed.

    Methodology:
      - eligible_refund_value: sum of refund_amount_cents of all offers created
      - offers_sent: total offers created
      - offers_viewed: distinct offers with a VIEWED event
      - offers_accepted: total offers accepted
      - offers_declined: total offers declined
      - acceptance_rate: accepted / sent * 100
      - refund_value_retained: sum of refund_amount_cents of accepted offers
      - bonus_issued: sum of bonus_applied_cents of accepted offers
      - total_credit_issued: sum of credit_amount_cents of accepted offers
      - credit_redeemed: observed redemptions (from debit webhooks)
    """
    start, end = _period_limits(period_days)

    # Total eligible refunds
    eligible_result = await db.execute(
        select(
            func.coalesce(func.sum(Offer.refund_amount_cents), 0).label("total_refund"),
            func.count(Offer.id).label("total_offers"),
        ).where(
            Offer.merchant_id == merchant_id,
            Offer.created_at >= start,
            Offer.created_at <= end,
        )
    )
    eligible_row = eligible_result.one()
    eligible_refund = _single_or_zero(eligible_row.total_refund)
    total_offers = _single_or_zero(eligible_row.total_offers)

    # Accepted
    accepted_result = await db.execute(
        select(
            func.count(Offer.id).label("accepted_cnt"),
            func.coalesce(func.sum(Offer.refund_amount_cents), 0).label("retained"),
            func.coalesce(func.sum(Offer.bonus_applied_cents), 0).label("bonus"),
            func.coalesce(func.sum(Offer.credit_amount_cents), 0).label("credit"),
        ).where(
            Offer.merchant_id == merchant_id,
            Offer.status == OfferStatus.ACCEPTED,
            Offer.accepted_at >= start,
            Offer.accepted_at <= end,
        )
    )
    accepted_row = accepted_result.one()
    accepted_count = _single_or_zero(accepted_row.accepted_cnt)
    retained = _single_or_zero(accepted_row.retained)
    bonus = _single_or_zero(accepted_row.bonus)
    credit_issued = _single_or_zero(accepted_row.credit)

    # Declined
    declined_result = await db.execute(
        select(func.count(Offer.id)).where(
            Offer.merchant_id == merchant_id,
            Offer.status == OfferStatus.DECLINED,
            Offer.declined_at >= start,
            Offer.declined_at <= end,
        )
    )
    declined_count = _single_or_zero(declined_result.scalar())

    # Viewed: distinct offers that have at least one VIEWED event
    viewed_result = await db.execute(
        select(func.count(func.distinct(OfferEvent.offer_id))).where(
            OfferEvent.offer_id.in_(
                select(Offer.id).where(
                    Offer.merchant_id == merchant_id,
                    Offer.created_at >= start,
                    Offer.created_at <= end,
                )
            ),
            OfferEvent.event_type == EventType.VIEWED,
        )
    )
    viewed_count = _single_or_zero(viewed_result.scalar())

    # Redemption (from webhook data)
    redeemed_result = await db.execute(
        select(func.coalesce(func.sum(CreditTransaction.amount_cents), 0)).where(
            CreditTransaction.merchant_id == merchant_id,
            CreditTransaction.transaction_type == TransactionType.DEBIT,
            CreditTransaction.occurred_at >= start,
            CreditTransaction.occurred_at <= end,
        )
    )
    redeemed_cents = _single_or_zero(redeemed_result.scalar())

    acceptance_rate = (
        round(accepted_count / total_offers * 100, 1) if total_offers > 0 else 0.0
    )

    return RefundRecoveryFunnel(
        eligible_refund_value_cents=eligible_refund,
        offers_sent=total_offers,
        offers_viewed=viewed_count,
        offers_accepted=accepted_count,
        offers_declined=declined_count,
        acceptance_rate=acceptance_rate,
        refund_value_retained_cents=retained,
        bonus_credit_issued_cents=bonus,
        total_credit_issued_cents=credit_issued,
        credit_redeemed_cents=redeemed_cents,
    )


# ─── Automation performance ───────────────────────────────────────────────────


def _normalize_utc(dt: datetime) -> datetime:
    """SQLite test DBs return naive datetimes; normalize so comparisons are valid."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=UTC)


async def _redemption_summary(
    merchant_id: uuid.UUID,
    db: AsyncSession,
    since_by_customer: dict[str, datetime],
) -> tuple[int, int]:
    """
    Given {customer_email: earliest_issuance_at} for one workflow's actions in
    the period, return (customers_reached, redeemed_customers).

    redeemed_customers counts customers with any DEBIT transaction on/after
    their issuance timestamp. This is an ESTIMATE, not an exact attribution:
    Shopify Store Credit balances are fungible, so a later debit may spend
    credit from multiple sources at once — see AutomationWorkflowPerformance.
    """
    customers_reached = len(since_by_customer)
    if customers_reached == 0:
        return 0, 0

    debit_result = await db.execute(
        select(
            CreditTransaction.customer_email,
            func.min(CreditTransaction.occurred_at).label("first_debit"),
        )
        .where(
            CreditTransaction.merchant_id == merchant_id,
            CreditTransaction.customer_email.in_(since_by_customer.keys()),
            CreditTransaction.transaction_type == TransactionType.DEBIT,
        )
        .group_by(CreditTransaction.customer_email)
    )
    first_debit_by_customer = {
        row.customer_email: row.first_debit for row in debit_result.all()
    }

    redeemed = 0
    for email, since in since_by_customer.items():
        first_debit = first_debit_by_customer.get(email)
        if first_debit is not None and _normalize_utc(first_debit) >= _normalize_utc(
            since
        ):
            redeemed += 1

    return customers_reached, redeemed


async def get_automation_performance(
    merchant_id: str,
    db: AsyncSession,
    period_days: int = 30,
) -> AutomationPerformance:
    """
    Performance breakdown for each Store Credit Automation workflow.

    Methodology per workflow:
      - Refund Recovery: executions = offers accepted in period.
      - Goodwill / Win-back: executions = manual CREDIT transactions issued
        in period, tagged at issuance time in
        services.automation._issue_tagged_credit. Both are merchant-
        initiated — there is no automated trigger for either yet.
      - Redemption reminder: executions = reminders sent in period; issues
        no credit itself, so credit_issued_cents is always 0.

    redeemed_customers/redemption_rate are ESTIMATED (see
    AutomationWorkflowPerformance docstring) — not usable as exact
    per-workflow revenue attribution.
    """
    start, end = _period_limits(period_days)
    workflows: list[AutomationWorkflowPerformance] = []

    # SQLAlchemy's generic Uuid type needs an actual uuid.UUID for bind
    # params on some dialects (SQLite in tests) — the string form only
    # works transparently on Postgres.
    merchant_uuid = uuid.UUID(str(merchant_id))

    # ── Refund Recovery ─────────────────────────────────────────────────
    rr_result = await db.execute(
        select(
            Offer.customer_email,
            func.min(Offer.accepted_at).label("since"),
            func.count(Offer.id).label("cnt"),
            func.coalesce(func.sum(Offer.credit_amount_cents), 0).label("issued"),
        )
        .where(
            Offer.merchant_id == merchant_uuid,
            Offer.status == OfferStatus.ACCEPTED,
            Offer.accepted_at >= start,
            Offer.accepted_at <= end,
        )
        .group_by(Offer.customer_email)
    )
    rr_rows = rr_result.all()
    rr_since = {r.customer_email: r.since for r in rr_rows}
    rr_executions = sum(r.cnt for r in rr_rows)
    rr_credit_issued = sum(r.issued for r in rr_rows)
    rr_reached, rr_redeemed = await _redemption_summary(merchant_uuid, db, rr_since)
    workflows.append(
        AutomationWorkflowPerformance(
            workflow="refund_recovery",
            label="Refund Recovery",
            executions=rr_executions,
            credit_issued_cents=rr_credit_issued,
            customers_reached=rr_reached,
            redeemed_customers=rr_redeemed if rr_executions > 0 else None,
            redemption_rate=(
                round(rr_redeemed / rr_reached * 100, 1) if rr_reached > 0 else None
            ),
        )
    )

    # ── Goodwill / Win-back (both manual, tagged CreditTransaction) ───────
    for workflow_key, label, source in (
        ("goodwill", "Goodwill", TransactionSource.GOODWILL),
        ("winback", "Win-back", TransactionSource.WINBACK),
    ):
        wf_result = await db.execute(
            select(
                CreditTransaction.customer_email,
                func.min(CreditTransaction.occurred_at).label("since"),
                func.count(CreditTransaction.id).label("cnt"),
                func.coalesce(func.sum(CreditTransaction.amount_cents), 0).label(
                    "issued"
                ),
            )
            .where(
                CreditTransaction.merchant_id == merchant_uuid,
                CreditTransaction.source == source,
                CreditTransaction.transaction_type == TransactionType.CREDIT,
                CreditTransaction.occurred_at >= start,
                CreditTransaction.occurred_at <= end,
            )
            .group_by(CreditTransaction.customer_email)
        )
        wf_rows = wf_result.all()
        wf_since = {r.customer_email: r.since for r in wf_rows}
        wf_executions = sum(r.cnt for r in wf_rows)
        wf_credit_issued = sum(r.issued for r in wf_rows)
        wf_reached, wf_redeemed = await _redemption_summary(merchant_uuid, db, wf_since)
        workflows.append(
            AutomationWorkflowPerformance(
                workflow=workflow_key,
                label=label,
                executions=wf_executions,
                credit_issued_cents=wf_credit_issued,
                customers_reached=wf_reached,
                redeemed_customers=wf_redeemed if wf_executions > 0 else None,
                redemption_rate=(
                    round(wf_redeemed / wf_reached * 100, 1) if wf_reached > 0 else None
                ),
            )
        )

    # ── Redemption reminder ──────────────────────────────────────────────
    rem_result = await db.execute(
        select(
            RedemptionReminder.customer_email,
            func.min(RedemptionReminder.sent_at).label("since"),
            func.count(RedemptionReminder.id).label("cnt"),
        )
        .where(
            RedemptionReminder.merchant_id == merchant_uuid,
            RedemptionReminder.sent_at >= start,
            RedemptionReminder.sent_at <= end,
        )
        .group_by(RedemptionReminder.customer_email)
    )
    rem_rows = rem_result.all()
    rem_since = {r.customer_email: r.since for r in rem_rows}
    rem_executions = sum(r.cnt for r in rem_rows)
    rem_reached, rem_redeemed = await _redemption_summary(merchant_uuid, db, rem_since)
    workflows.append(
        AutomationWorkflowPerformance(
            workflow="redemption_reminder",
            label="Redemption Reminder",
            executions=rem_executions,
            credit_issued_cents=0,
            customers_reached=rem_reached,
            redeemed_customers=rem_redeemed if rem_executions > 0 else None,
            redemption_rate=(
                round(rem_redeemed / rem_reached * 100, 1) if rem_reached > 0 else None
            ),
            notes="Redemption reminders don't issue credit themselves — they nudge redemption of existing balance.",
        )
    )

    return AutomationPerformance(workflows=workflows, period_days=period_days)


# ─── CSV export ────────────────────────────────────────────────────────────────


async def get_csv_export(
    merchant_id: str,
    db: AsyncSession,
) -> list[CsvExportRow]:
    """Full export of offer lifecycle data for CSV download."""
    result = await db.execute(
        select(Offer)
        .where(Offer.merchant_id == merchant_id)
        .order_by(Offer.created_at.desc())
    )
    offers = result.scalars().all()

    # Get VIEWED timestamps
    viewed_result = await db.execute(
        select(
            OfferEvent.offer_id,
            func.min(OfferEvent.created_at).label("first_viewed"),
        )
        .where(
            OfferEvent.offer_id.in_([o.id for o in offers]),
            OfferEvent.event_type == EventType.VIEWED,
        )
        .group_by(OfferEvent.offer_id)
    )
    viewed_map = {
        str(row.offer_id): row.first_viewed for row in viewed_result.fetchall()
    }

    # Get redemption data per customer
    rt_result = await db.execute(
        select(
            CreditTransaction.customer_email,
            func.coalesce(func.sum(CreditTransaction.amount_cents), 0),
        )
        .where(
            CreditTransaction.merchant_id == merchant_id,
            CreditTransaction.transaction_type == TransactionType.DEBIT,
        )
        .group_by(CreditTransaction.customer_email)
    )
    redeemed_per_customer: dict[str, int] = dict(rt_result.fetchall())

    rows: list[CsvExportRow] = []
    for offer in offers:
        rows.append(
            CsvExportRow(
                offer_id=str(offer.id),
                order_number=offer.order_number or offer.shopify_order_id,
                customer_email=offer.customer_email,
                refund_amount_cents=offer.refund_amount_cents,
                credit_amount_cents=offer.credit_amount_cents,
                bonus_applied_cents=offer.bonus_applied_cents,
                status=offer.status.value,
                refund_status=offer.refund_status.value,
                created_at=offer.created_at,
                accepted_at=offer.accepted_at,
                viewed_at=viewed_map.get(str(offer.id)),
                declined_at=offer.declined_at,
                expired_at=offer.expired_at,
                redeemed_cents=redeemed_per_customer.get(offer.customer_email),
            )
        )

    return rows
