"""
Tests for offer expiry — lazy check and scheduled sweep logic.

Covers:
- expire_offer_if_due: fresh offer skipped, stale offer expired, idempotency
- event emitted on expiry
- accepted/declined offers never re-expired
- accepting an expired offer returns 410
- sweep logic correctly identifies stale vs. fresh offers
- Celery beat schedule wired
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.core.config import settings
from app.models.merchant import Merchant, SubscriptionStatus
from app.models.offer import Offer, OfferStatus
from app.models.offer_event import EventType, OfferEvent
from app.routers.offers import expire_offer_if_due


# ── Helpers ────────────────────────────────────────────────────────────────────


def make_merchant() -> Merchant:
    return Merchant(
        shop_domain="expiry.myshopify.com",
        access_token_encrypted=b"dummy_encrypted_bytes",
        merchant_email="merchant@expiry.com",
        subscription_status=SubscriptionStatus.ACTIVE,
        bonus_percentage=10,
        bonus_cap_cents=5000,
        brand_color="#000000",
    )


def make_offer(
    merchant: Merchant,
    *,
    created_days_ago: int = 0,
    status: OfferStatus = OfferStatus.PENDING,
    refund_id_suffix: str = "",
) -> Offer:
    created_at = datetime.now(UTC) - timedelta(days=created_days_ago)
    return Offer(
        merchant_id=merchant.id,
        shopify_refund_id=f"ref_{created_days_ago}_{status.value}{refund_id_suffix}",
        shopify_order_id="order_1",
        customer_email="customer@example.com",
        customer_first_name="Alice",
        refund_amount_cents=10000,
        credit_amount_cents=11000,
        bonus_applied_cents=1000,
        status=status,
        created_at=created_at,
    )


# ── expire_offer_if_due: basic cases ─────────────────────────────────────────


async def test_fresh_offer_not_expired(db_session):
    """An offer created 1 day ago must not be expired."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    offer = make_offer(merchant, created_days_ago=1)
    db_session.add(offer)
    await db_session.commit()

    expired = await expire_offer_if_due(db_session, offer)

    assert expired is False
    assert offer.status == OfferStatus.PENDING
    assert offer.expired_at is None


async def test_stale_offer_expires(db_session):
    """An offer older than OFFER_EXPIRY_DAYS must be transitioned to EXPIRED."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    offer = make_offer(merchant, created_days_ago=settings.OFFER_EXPIRY_DAYS + 1)
    db_session.add(offer)
    await db_session.commit()

    expired = await expire_offer_if_due(db_session, offer)

    assert expired is True
    assert offer.status == OfferStatus.EXPIRED
    assert offer.expired_at is not None


async def test_expiry_emits_expired_event(db_session):
    """Expiring an offer must create an EXPIRED event in offer_events."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    offer = make_offer(merchant, created_days_ago=settings.OFFER_EXPIRY_DAYS + 1)
    db_session.add(offer)
    await db_session.commit()

    await expire_offer_if_due(db_session, offer)

    events = (
        (
            await db_session.execute(
                select(OfferEvent).where(OfferEvent.offer_id == offer.id)
            )
        )
        .scalars()
        .all()
    )
    assert any(e.event_type == EventType.EXPIRED for e in events)


# ── expire_offer_if_due: idempotency ─────────────────────────────────────────


async def test_already_expired_offer_not_re_expired(db_session):
    """Calling expire_offer_if_due on an EXPIRED offer must be a no-op."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    offer = make_offer(
        merchant,
        created_days_ago=settings.OFFER_EXPIRY_DAYS + 5,
        status=OfferStatus.EXPIRED,
    )
    offer.expired_at = datetime.now(UTC) - timedelta(days=1)
    db_session.add(offer)
    await db_session.commit()

    expired = await expire_offer_if_due(db_session, offer)

    assert expired is False


async def test_accepted_offer_not_expired(db_session):
    """An ACCEPTED offer must never be transitioned to EXPIRED."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    offer = make_offer(
        merchant,
        created_days_ago=settings.OFFER_EXPIRY_DAYS + 5,
        status=OfferStatus.ACCEPTED,
    )
    db_session.add(offer)
    await db_session.commit()

    expired = await expire_offer_if_due(db_session, offer)

    assert expired is False
    assert offer.status == OfferStatus.ACCEPTED


async def test_declined_offer_not_expired(db_session):
    """A DECLINED offer must never be transitioned to EXPIRED."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    offer = make_offer(
        merchant,
        created_days_ago=settings.OFFER_EXPIRY_DAYS + 5,
        status=OfferStatus.DECLINED,
    )
    db_session.add(offer)
    await db_session.commit()

    expired = await expire_offer_if_due(db_session, offer)

    assert expired is False
    assert offer.status == OfferStatus.DECLINED


# ── HTTP endpoint: stale offer returns 410 ───────────────────────────────────


async def test_view_expired_offer_returns_410(client, db_session):
    """GET /offers/{token} on a stale offer must lazily expire and return 410."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    offer = make_offer(merchant, created_days_ago=settings.OFFER_EXPIRY_DAYS + 1)
    db_session.add(offer)
    await db_session.commit()

    response = await client.get(f"/offers/{offer.offer_token}")

    assert response.status_code == 410
    assert "expired" in response.json()["detail"].lower()


async def test_accept_expired_offer_returns_410(client, db_session):
    """POST /offers/{token}/accept on a stale offer must return 410."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    offer = make_offer(merchant, created_days_ago=settings.OFFER_EXPIRY_DAYS + 1)
    db_session.add(offer)
    await db_session.commit()

    response = await client.post(f"/offers/{offer.offer_token}/accept")

    assert response.status_code == 410


# ── Sweep logic (mirrors offer_tasks.expire_stale_offers inner async _run) ──


async def test_sweep_expires_multiple_stale_offers(db_session):
    """Sweep logic must expire every stale PENDING offer, leaving fresh ones alone."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    stale = [
        make_offer(
            merchant,
            created_days_ago=settings.OFFER_EXPIRY_DAYS + i + 1,
            refund_id_suffix=f"_stale{i}",
        )
        for i in range(3)
    ]
    fresh = make_offer(merchant, created_days_ago=1, refund_id_suffix="_fresh")

    for o in stale + [fresh]:
        db_session.add(o)
    await db_session.commit()

    # Run the same query + update logic as offer_tasks.expire_stale_offers
    cutoff = datetime.now(UTC) - timedelta(days=settings.OFFER_EXPIRY_DAYS)
    result = await db_session.execute(
        select(Offer).where(
            Offer.status == OfferStatus.PENDING,
            Offer.created_at < cutoff,
        )
    )
    to_expire = result.scalars().all()
    now = datetime.now(UTC)
    for o in to_expire:
        o.status = OfferStatus.EXPIRED
        o.expired_at = now
        db_session.add(
            OfferEvent(
                offer_id=o.id,
                event_type=EventType.EXPIRED,
                offer_event_metadata={"reason": "scheduled_sweep"},
            )
        )
    await db_session.commit()

    for o in stale:
        await db_session.refresh(o)
        assert o.status == OfferStatus.EXPIRED, (
            f"offer {o.shopify_refund_id} should be EXPIRED"
        )

    await db_session.refresh(fresh)
    assert fresh.status == OfferStatus.PENDING


async def test_sweep_is_idempotent(db_session):
    """Running the sweep twice on the same stale offer must not double-expire."""
    merchant = make_merchant()
    db_session.add(merchant)
    await db_session.flush()

    offer = make_offer(merchant, created_days_ago=settings.OFFER_EXPIRY_DAYS + 1)
    db_session.add(offer)
    await db_session.commit()

    # First expiry
    await expire_offer_if_due(db_session, offer)
    assert offer.status == OfferStatus.EXPIRED

    events_before = (
        (
            await db_session.execute(
                select(OfferEvent).where(
                    OfferEvent.offer_id == offer.id,
                    OfferEvent.event_type == EventType.EXPIRED,
                )
            )
        )
        .scalars()
        .all()
    )

    # Second call must not add another EXPIRED event
    await expire_offer_if_due(db_session, offer)

    events_after = (
        (
            await db_session.execute(
                select(OfferEvent).where(
                    OfferEvent.offer_id == offer.id,
                    OfferEvent.event_type == EventType.EXPIRED,
                )
            )
        )
        .scalars()
        .all()
    )

    assert len(events_after) == len(events_before)


# ── Celery beat schedule ───────────────────────────────────────────────────────


def test_beat_schedule_includes_daily_expiry_sweep():
    from app.core.celery_app import celery_app

    assert "expire-stale-offers" in celery_app.conf.beat_schedule
    item = celery_app.conf.beat_schedule["expire-stale-offers"]
    assert item["task"] == "app.tasks.offer_tasks.expire_stale_offers"
    assert item["schedule"] == 86400.0
