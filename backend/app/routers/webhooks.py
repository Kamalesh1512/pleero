"""
Shopify webhook endpoints.
Receives and processes webhook events from Shopify.
"""

from datetime import UTC, datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import exists, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.merchant import Merchant, SubscriptionStatus
from app.models.offer import Offer, OfferStatus, RefundStatus
from app.models.offer_event import EventType, OfferEvent
from app.schemas.webhook import (
    AppUninstalledPayload,
    CustomersDataRequestPayload,
    CustomersRedactPayload,
    RefundWebhookPayload,
    ShopRedactPayload,
    StoreCreditDebitPayload,
)
from app.services.billing import (
    merchant_has_feature_access,
    sync_merchant_subscription_from_shopify,
)
from app.utils.session_auth import revoke_session_for_shop
from app.utils.shopify_auth import get_valid_access_token
from app.utils.shopify_webhooks import (
    RefundWebhookData,
    calculate_bonus,
    parse_refund_webhook,
    should_skip_offer,
    verify_webhook_hmac,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


async def verify_webhook_signature(
    request: Request,
    x_shopify_hmac_sha256: str = Header(...),
) -> bytes:
    """
    FastAPI dependency to verify webhook HMAC.

    CRITICAL: Hard rule #1 - Always verify HMAC on every webhook endpoint.

    Args:
        request: FastAPI request
        x_shopify_hmac_sha256: Shopify HMAC header

    Returns:
        Raw request body

    Raises:
        HTTPException: If HMAC verification fails
    """
    body = await request.body()

    if not verify_webhook_hmac(
        body, x_shopify_hmac_sha256, settings.SHOPIFY_API_SECRET
    ):
        logger.error(
            "webhook_hmac_verification_failed",
            headers=dict(request.headers),
        )
        raise HTTPException(
            status_code=401,
            detail="HMAC verification failed",
        )

    return body


async def _fetch_order_into_webhook_data(
    webhook_data: RefundWebhookData,
    merchant: Merchant,
    order_id: int,
    db: AsyncSession,
) -> None:
    """Fetch order from Shopify Admin API and populate missing customer fields."""
    try:
        access_token = await get_valid_access_token(merchant, db)

        async with httpx.AsyncClient(
            headers={"X-Shopify-Access-Token": access_token},
            timeout=8.0,
        ) as client:
            resp = await client.get(
                f"https://{merchant.shop_domain}/admin/api"
                f"/{settings.SHOPIFY_API_VERSION}/orders/{order_id}.json",
                params={"fields": "id,name,customer,currency"},
            )
            if resp.status_code != 200:
                logger.warning(
                    "order_fetch_non_200",
                    order_id=order_id,
                    status=resp.status_code,
                )
                return

            order = resp.json().get("order") or {}
            customer = order.get("customer") or {}

            webhook_data.customer_email = customer.get("email", "")
            webhook_data.customer_first_name = customer.get("first_name", "")
            webhook_data.order_name = order.get("name", "")
            webhook_data.currency_code = order.get("currency", "USD")
            raw_id = customer.get("id")
            if raw_id:
                webhook_data.customer_shopify_gid = f"gid://shopify/Customer/{raw_id}"

            logger.info(
                "order_fetched_for_webhook",
                order_id=order_id,
                customer_email=webhook_data.customer_email,
            )
    except Exception as exc:
        logger.warning(
            "order_fetch_failed",
            order_id=order_id,
            error=str(exc),
        )


@router.post("/refunds/create")
async def handle_refund_created(
    request: Request,
    payload: RefundWebhookPayload,
    db: AsyncSession = Depends(get_db),
    _body: bytes = Depends(verify_webhook_signature),
) -> dict[str, str]:
    """
    Handle refunds/create webhook from Shopify.

    This is the core webhook that triggers offer creation.
    Must respond within 5 seconds or Shopify will retry.

    Flow:
    1. Verify HMAC (done in dependency)
    2. Parse webhook payload
    3. Load merchant by shop domain
    4. Check skip conditions
    5. Calculate bonus
    6. Create offer record
    7. Enqueue offer email to Celery (off the webhook path, keeps this under
       Shopify's 5-second response window)
    8. Return 200 OK

    Hard rule #4: Must be async route, use httpx for external calls
    """
    # Get shop domain from header
    shop_domain = request.headers.get("x-shopify-shop-domain")
    if not shop_domain:
        logger.error("webhook_missing_shop_domain")
        return {"status": "error", "message": "Missing shop domain"}

    logger.info(
        "webhook_received",
        topic="refunds/create",
        shop=shop_domain,
        refund_id=payload.id,
        order_id=payload.order_id,
    )

    try:
        # Load merchant
        result = await db.execute(
            select(Merchant).where(Merchant.shop_domain == shop_domain)
        )
        merchant = result.scalar_one_or_none()

        if not merchant:
            logger.error(
                "webhook_merchant_not_found",
                shop=shop_domain,
            )
            # Return 200 to prevent retry (shop not installed)
            return {"status": "skipped", "reason": "merchant_not_found"}

        await sync_merchant_subscription_from_shopify(db, merchant)
        if not merchant_has_feature_access(merchant):
            logger.info(
                "offer_bypassed",
                shop=shop_domain,
                refund_id=payload.id,
                reason="inactive_subscription",
                subscription_status=merchant.subscription_status.value,
            )
            return {"status": "skipped", "reason": "inactive_subscription"}

        # Parse webhook data
        webhook_data = parse_refund_webhook(payload.model_dump())

        # Shopify refund webhook does not include the full order/customer object.
        # Fetch the order from the Admin API to get customer email, name and GID.
        # Fetch if either the email or the customer GID is missing — the GID is
        # stored on the offer for later lifecycle/intelligence work.
        if not webhook_data.customer_email or not webhook_data.customer_shopify_gid:
            await _fetch_order_into_webhook_data(
                webhook_data, merchant, payload.order_id, db
            )

        # Validate webhook data
        if not webhook_data.is_valid():
            logger.warning(
                "webhook_invalid_data",
                shop=shop_domain,
                refund_id=webhook_data.refund_id,
            )
            return {"status": "skipped", "reason": "invalid_data"}

        # Check skip conditions
        should_skip, skip_reason = should_skip_offer(
            webhook_data,
            merchant.subscription_status,
        )

        if should_skip:
            logger.info(
                "offer_bypassed",
                shop=shop_domain,
                refund_id=webhook_data.refund_id,
                reason=skip_reason,
            )
            return {"status": "skipped", "reason": skip_reason}

        # Calculate bonus
        credit_amount_cents, bonus_applied_cents = calculate_bonus(
            webhook_data.refund_amount_cents,
            merchant.bonus_percentage,
            merchant.bonus_cap_cents,
        )

        # Check if offer already exists (idempotency)
        result = await db.execute(
            select(Offer).where(
                Offer.merchant_id == merchant.id,
                Offer.shopify_refund_id == str(webhook_data.refund_id),
            )
        )
        existing_offer = result.scalar_one_or_none()

        if existing_offer:
            logger.info(
                "offer_already_exists",
                shop=shop_domain,
                refund_id=webhook_data.refund_id,
                offer_id=str(existing_offer.id),
            )
            return {"status": "skipped", "reason": "already_exists"}

        # Create offer record
        offer = Offer(
            merchant_id=merchant.id,
            shopify_refund_id=str(webhook_data.refund_id),
            shopify_order_id=str(webhook_data.order_id),
            order_number=webhook_data.order_name or None,
            customer_email=webhook_data.customer_email,
            customer_first_name=webhook_data.customer_first_name or "Customer",
            customer_shopify_id=webhook_data.customer_shopify_gid,
            refund_amount_cents=webhook_data.refund_amount_cents,
            credit_amount_cents=credit_amount_cents,
            bonus_applied_cents=bonus_applied_cents,
            currency_code=webhook_data.currency_code,
            status=OfferStatus.PENDING,
        )
        db.add(offer)
        await db.flush()  # Get offer ID without committing

        # Create audit event
        event = OfferEvent(
            offer_id=offer.id,
            event_type=EventType.CREATED,
            offer_event_metadata={
                "refund_id": webhook_data.refund_id,
                "order_id": webhook_data.order_id,
                "order_name": webhook_data.order_name,
            },
        )
        db.add(event)

        await db.commit()

        logger.info(
            "offer_created",
            shop=shop_domain,
            offer_id=str(offer.id),
            refund_id=webhook_data.refund_id,
            refund_amount_cents=webhook_data.refund_amount_cents,
            credit_amount_cents=credit_amount_cents,
            bonus_applied_cents=bonus_applied_cents,
        )

        # Enqueue offer email (Celery worker sends it with retry, off the
        # webhook request path).
        from app.tasks.email_tasks import send_offer_email_task

        send_offer_email_task.delay(str(offer.id))

        # Return 200 OK (Shopify requires this within 5 seconds)
        return {
            "status": "success",
            "offer_id": str(offer.id),
        }

    except Exception as e:
        logger.error(
            "webhook_processing_error",
            shop=shop_domain,
            refund_id=payload.id,
            error=str(e),
            exc_info=True,
        )
        # Return 200 to prevent retry on bugs (log to Sentry instead)
        # We don't want Shopify to retry on application errors
        # In production, hide error details; in development, show them
        error_message = (
            str(e) if settings.APP_ENV == "development" else "Internal processing error"
        )
        return {"status": "error", "message": error_message}


@router.post("/app/uninstalled")
async def handle_app_uninstalled(
    request: Request,
    payload: AppUninstalledPayload,
    db: AsyncSession = Depends(get_db),
    _body: bytes = Depends(verify_webhook_signature),
) -> dict[str, str]:
    """
    Handle app/uninstalled webhook from Shopify.

    When merchant uninstalls the app:
    1. Set subscription_status = CANCELLED
    2. Log event

    Note: We don't delete merchant data (may reinstall later)
    """
    # Get shop domain from header
    shop_domain = request.headers.get("x-shopify-shop-domain")
    if not shop_domain:
        logger.error("webhook_missing_shop_domain")
        return {"status": "error", "message": "Missing shop domain"}

    logger.info(
        "webhook_received",
        topic="app/uninstalled",
        shop=shop_domain,
    )

    try:
        # Load merchant
        result = await db.execute(
            select(Merchant).where(Merchant.shop_domain == shop_domain)
        )
        merchant = result.scalar_one_or_none()

        if not merchant:
            logger.warning(
                "webhook_merchant_not_found",
                shop=shop_domain,
            )
            return {"status": "skipped", "reason": "merchant_not_found"}

        # Update subscription status
        merchant.subscription_status = SubscriptionStatus.CANCELLED

        await db.commit()

        # Invalidate the merchant's session so the frontend shows the
        # "not authenticated" state immediately after uninstall.
        await revoke_session_for_shop(shop_domain)

        logger.info(
            "app_uninstalled",
            shop=shop_domain,
            merchant_id=str(merchant.id),
        )

        return {"status": "success"}

    except Exception as e:
        logger.error(
            "webhook_processing_error",
            shop=shop_domain,
            error=str(e),
            exc_info=True,
        )
        error_message = (
            str(e) if settings.APP_ENV == "development" else "Internal processing error"
        )
        return {"status": "error", "message": error_message}


# ── Mandatory compliance webhooks ──────────────────────────────────────────────
# Required by Shopify for any app that stores customer PII.
# Shopify will fail the app review automated check if these are missing.
# Docs: https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance


@router.post("/customers/data_request")
async def handle_customers_data_request(
    request: Request,
    payload: CustomersDataRequestPayload,
    db: AsyncSession = Depends(get_db),
    _body: bytes = Depends(verify_webhook_signature),
) -> dict[str, str]:
    """
    customers/data_request — customer asked what data we hold about them.

    We store: customer_email, customer_first_name in the offers table.
    Acknowledging receipt satisfies Shopify's requirement. The merchant
    is responsible for responding to the customer within 30 days.
    """
    logger.info(
        "compliance_data_request_received",
        shop_domain=payload.shop_domain,
        shop_id=payload.shop_id,
        customer_id=payload.customer.id,
        customer_email=payload.customer.email,
        orders_requested=payload.orders_requested,
    )
    return {"status": "acknowledged"}


@router.post("/customers/redact")
async def handle_customers_redact(
    request: Request,
    payload: CustomersRedactPayload,
    db: AsyncSession = Depends(get_db),
    _body: bytes = Depends(verify_webhook_signature),
) -> dict[str, str]:
    """
    customers/redact — anonymise all PII for this customer in our offers table.

    Keeps financial records (amounts, status, timestamps) intact for merchant
    revenue reporting but scrubs personal identifiers. Must complete within 30 days.
    """
    try:
        from sqlalchemy import update

        customer_email = payload.customer.email
        if not customer_email:
            logger.warning(
                "compliance_redact_no_email",
                shop_domain=payload.shop_domain,
                customer_id=payload.customer.id,
            )
            return {"status": "skipped", "reason": "no_email_provided"}

        redacted_email = f"redacted_{payload.customer.id}@redacted.invalid"
        result = await db.execute(
            update(Offer)
            .where(Offer.customer_email == customer_email)
            .values(
                customer_email=redacted_email,
                customer_first_name="Redacted",
                customer_shopify_id=None,
            )
        )
        await db.commit()

        logger.info(
            "compliance_customer_redacted",
            shop_domain=payload.shop_domain,
            customer_id=payload.customer.id,
            rows_updated=result.rowcount,
        )
        return {"status": "success"}

    except Exception as e:
        logger.error(
            "compliance_redact_error",
            shop_domain=payload.shop_domain,
            error=str(e),
            exc_info=True,
        )
        return {"status": "error", "message": "Internal processing error"}


@router.post("/shop/redact")
async def handle_shop_redact(
    request: Request,
    payload: ShopRedactPayload,
    db: AsyncSession = Depends(get_db),
    _body: bytes = Depends(verify_webhook_signature),
) -> dict[str, str]:
    """
    shop/redact — triggered 48 h after app uninstall.
    Deletes all offers and the merchant row for this shop.
    """
    try:
        from sqlalchemy import delete

        from app.models.offer_event import OfferEvent

        result = await db.execute(
            select(Merchant).where(Merchant.shop_domain == payload.shop_domain)
        )
        merchant = result.scalar_one_or_none()

        if not merchant:
            logger.info(
                "compliance_shop_redact_no_merchant",
                shop_domain=payload.shop_domain,
            )
            return {"status": "skipped", "reason": "merchant_not_found"}

        offer_ids_result = await db.execute(
            select(Offer.id).where(Offer.merchant_id == merchant.id)
        )
        offer_ids = [row[0] for row in offer_ids_result.fetchall()]

        if offer_ids:
            await db.execute(
                delete(OfferEvent).where(OfferEvent.offer_id.in_(offer_ids))
            )
            await db.execute(delete(Offer).where(Offer.merchant_id == merchant.id))

        await db.delete(merchant)
        await db.commit()

        logger.info(
            "compliance_shop_redacted",
            shop_domain=payload.shop_domain,
            shop_id=payload.shop_id,
            offers_deleted=len(offer_ids),
        )
        return {"status": "success"}

    except Exception as e:
        logger.error(
            "compliance_shop_redact_error",
            shop_domain=payload.shop_domain,
            error=str(e),
            exc_info=True,
        )
        return {"status": "error", "message": "Internal processing error"}


# ── Combined compliance endpoint (required by shopify.app.toml compliance_topics) ─
# Shopify sends all three compliance topics to this single URI.
# Dispatches to the individual handlers above based on X-Shopify-Topic header.


@router.post("/compliance")
async def handle_compliance(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _body: bytes = Depends(verify_webhook_signature),
) -> dict[str, str]:
    """
    Combined compliance webhook handler for customers/data_request,
    customers/redact, and shop/redact.

    shopify.app.toml compliance_topics requires a single URI for all three.
    Dispatches based on X-Shopify-Topic header.
    """
    topic = request.headers.get("x-shopify-topic", "")
    body_json = await request.json()

    if topic == "customers/data_request":
        payload = CustomersDataRequestPayload(**body_json)
        logger.info(
            "compliance_data_request_received",
            shop_domain=payload.shop_domain,
            customer_id=payload.customer.id,
        )
        return {"status": "acknowledged"}

    if topic == "customers/redact":
        payload = CustomersRedactPayload(**body_json)
        return await _redact_customer(db, payload)

    if topic == "shop/redact":
        payload = ShopRedactPayload(**body_json)
        return await _redact_shop(db, payload)

    logger.warning("compliance_unknown_topic", topic=topic)
    return {"status": "ignored", "topic": topic}


async def _redact_customer(
    db: AsyncSession, payload: CustomersRedactPayload
) -> dict[str, str]:
    """Shared logic extracted from handle_customers_redact."""
    try:
        from sqlalchemy import update

        customer_email = payload.customer.email
        if not customer_email:
            return {"status": "skipped", "reason": "no_email_provided"}

        redacted_email = f"redacted_{payload.customer.id}@redacted.invalid"
        result = await db.execute(
            update(Offer)
            .where(Offer.customer_email == customer_email)
            .values(
                customer_email=redacted_email,
                customer_first_name="Redacted",
                customer_shopify_id=None,
            )
        )
        await db.commit()
        logger.info(
            "compliance_customer_redacted",
            shop_domain=payload.shop_domain,
            customer_id=payload.customer.id,
            rows_updated=result.rowcount,
        )
        return {"status": "success"}
    except Exception as e:
        logger.error(
            "compliance_redact_error",
            shop_domain=payload.shop_domain,
            error=str(e),
            exc_info=True,
        )
        return {"status": "error", "message": "Internal processing error"}


async def _redact_shop(db: AsyncSession, payload: ShopRedactPayload) -> dict[str, str]:
    """Shared logic extracted from handle_shop_redact."""
    try:
        from sqlalchemy import delete

        result = await db.execute(
            select(Merchant).where(Merchant.shop_domain == payload.shop_domain)
        )
        merchant = result.scalar_one_or_none()

        if not merchant:
            return {"status": "skipped", "reason": "merchant_not_found"}

        offer_ids_result = await db.execute(
            select(Offer.id).where(Offer.merchant_id == merchant.id)
        )
        offer_ids = [row[0] for row in offer_ids_result.fetchall()]

        if offer_ids:
            await db.execute(
                delete(OfferEvent).where(OfferEvent.offer_id.in_(offer_ids))
            )
            await db.execute(delete(Offer).where(Offer.merchant_id == merchant.id))

        await db.delete(merchant)
        await db.commit()

        logger.info(
            "compliance_shop_redacted",
            shop_domain=payload.shop_domain,
            shop_id=payload.shop_id,
            offers_deleted=len(offer_ids),
        )
        return {"status": "success"}
    except Exception as e:
        logger.error(
            "compliance_shop_redact_error",
            shop_domain=payload.shop_domain,
            error=str(e),
            exc_info=True,
        )
        return {"status": "error", "message": "Internal processing error"}


# ── Store Credit webhooks (analytics / intelligence stream) ──────────────────
# Shopify sends these when Store Credit is credited or debited on a customer
# account.  Pleero observes them to track redemption activity and compute
# derived intelligence — Shopify is the authoritative source of truth for
# balances; we store only the event stream.


@router.post("/store_credit/debit")
async def handle_store_credit_debit(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _body: bytes = Depends(verify_webhook_signature),
) -> dict[str, str]:
    """
    Handle store_credit_accounts/debit webhook from Shopify.

    Records the debit transaction so Pleero can track redemption rates,
    outstanding credit, and time-to-redemption analytics.

    Idempotent via the shopify_transaction_id unique constraint.
    """
    shop_domain = request.headers.get("x-shopify-shop-domain")
    if not shop_domain:
        logger.error("sc_webhook_missing_shop_domain")
        return {"status": "error", "message": "Missing shop domain"}

    logger.info(
        "sc_webhook_received", topic="store_credit_accounts/debit", shop=shop_domain
    )

    try:
        body_json = await request.json()
        payload = StoreCreditDebitPayload(**body_json)

        # Load merchant
        result = await db.execute(
            select(Merchant).where(Merchant.shop_domain == shop_domain)
        )
        merchant = result.scalar_one_or_none()
        if not merchant:
            return {"status": "skipped", "reason": "merchant_not_found"}

        # Extract transaction details
        txn = payload.customer_credit_balance_transaction
        if not txn or not txn.id:
            return {"status": "skipped", "reason": "missing_transaction_id"}

        # Extract customer info
        customer_email = None
        customer_id = None
        if txn.credit_balance and txn.credit_balance.customer:
            customer_email = txn.credit_balance.customer.email
            raw_id = txn.credit_balance.customer.id
            customer_id = f"gid://shopify/Customer/{raw_id}" if raw_id else None

        if not customer_email:
            logger.warning(
                "sc_webhook_no_customer_email",
                shop=shop_domain,
                txn_id=txn.id,
            )
            return {"status": "skipped", "reason": "no_customer_email"}

        # Extract amount
        amount_cents = 0
        if txn.amount:
            raw = txn.amount.amount
            amount_val = float(raw) if isinstance(raw, str) else raw
            amount_cents = int(amount_val * 100)

        currency = txn.amount.currency_code if txn.amount else "USD"

        # Persist credit transaction (idempotent via unique constraint)
        from app.models.credit_transaction import (
            CreditTransaction,
            TransactionSource,
            TransactionType,
        )

        ct = CreditTransaction(
            merchant_id=merchant.id,
            customer_email=customer_email,
            customer_shopify_id=customer_id,
            transaction_type=TransactionType.DEBIT,
            amount_cents=amount_cents,
            currency=currency,
            source=TransactionSource.EXTERNAL,
            shopify_transaction_id=txn.id,
            occurred_at=datetime.now(UTC),
        )
        db.add(ct)

        try:
            await db.commit()
        except Exception:
            await db.rollback()
            logger.info(
                "sc_webhook_duplicate_skipped",
                shop=shop_domain,
                txn_id=txn.id,
            )
            return {"status": "skipped", "reason": "duplicate_transaction"}

        logger.info(
            "sc_debit_recorded",
            shop=shop_domain,
            txn_id=txn.id,
            amount_cents=amount_cents,
        )
        return {"status": "success"}

    except Exception as e:
        logger.error(
            "sc_webhook_processing_error",
            shop=shop_domain,
            error=str(e),
            exc_info=True,
        )
        return {"status": "error", "message": "Internal processing error"}


# Matching window for attributing an observed CREDIT transaction back to a
# Refund Recovery offer. Shopify's store_credit_accounts/credit webhook
# fires within seconds of the refundCreate mutation that accept_offer()
# calls, so this is a generous upper bound, not a tight race condition.
_REFUND_RECOVERY_MATCH_WINDOW = timedelta(minutes=30)


async def _match_refund_recovery_offer(
    db: AsyncSession,
    merchant_id,
    customer_email: str,
    amount_cents: int,
) -> Offer | None:
    """
    Best-effort match of an observed Store Credit CREDIT transaction back to
    the Refund Recovery offer that likely caused it.

    Shopify's webhook payload carries no reference to the offer that
    triggered issuance, so this is a heuristic (ATTRIBUTED, not OBSERVED):
    same merchant + customer email + exact credit amount, accepted within
    the match window, and not already linked to another transaction (each
    offer can only be matched once). Returns None if nothing qualifies —
    callers must fall back to TransactionSource.EXTERNAL.
    """
    from app.models.credit_transaction import CreditTransaction

    cutoff = datetime.now(UTC) - _REFUND_RECOVERY_MATCH_WINDOW
    result = await db.execute(
        select(Offer)
        .where(
            Offer.merchant_id == merchant_id,
            Offer.customer_email == customer_email,
            Offer.credit_amount_cents == amount_cents,
            Offer.refund_status == RefundStatus.CREDIT_REFUND_CREATED,
            Offer.accepted_at.isnot(None),
            Offer.accepted_at >= cutoff,
            ~exists().where(CreditTransaction.offer_id == Offer.id),
        )
        .order_by(Offer.accepted_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


@router.post("/store_credit/credit")
async def handle_store_credit_credit(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _body: bytes = Depends(verify_webhook_signature),
) -> dict[str, str]:
    """
    Handle store_credit_accounts/credit webhook from Shopify.

    Records external Store Credit issuance events so Pleero's analytics
    can show issuance from outside sources, not just Pleero's own workflows.
    """
    shop_domain = request.headers.get("x-shopify-shop-domain")
    if not shop_domain:
        logger.error("sc_credit_webhook_missing_shop_domain")
        return {"status": "error", "message": "Missing shop domain"}

    logger.info(
        "sc_webhook_received", topic="store_credit_accounts/credit", shop=shop_domain
    )

    try:
        body_json = await request.json()
        payload = StoreCreditDebitPayload(**body_json)

        result = await db.execute(
            select(Merchant).where(Merchant.shop_domain == shop_domain)
        )
        merchant = result.scalar_one_or_none()
        if not merchant:
            return {"status": "skipped", "reason": "merchant_not_found"}

        txn = payload.customer_credit_balance_transaction
        if not txn or not txn.id:
            return {"status": "skipped", "reason": "missing_transaction_id"}

        customer_email = None
        customer_id = None
        if txn.credit_balance and txn.credit_balance.customer:
            customer_email = txn.credit_balance.customer.email
            raw_id = txn.credit_balance.customer.id
            customer_id = f"gid://shopify/Customer/{raw_id}" if raw_id else None

        if not customer_email:
            return {"status": "skipped", "reason": "no_customer_email"}

        amount_cents = 0
        if txn.amount:
            raw = txn.amount.amount
            amount_val = float(raw) if isinstance(raw, str) else raw
            amount_cents = int(amount_val * 100)

        currency = txn.amount.currency_code if txn.amount else "USD"

        from app.models.credit_transaction import (
            CreditTransaction,
            TransactionSource,
            TransactionType,
        )

        matched_offer = await _match_refund_recovery_offer(
            db, merchant.id, customer_email, amount_cents
        )

        ct = CreditTransaction(
            merchant_id=merchant.id,
            customer_email=customer_email,
            customer_shopify_id=customer_id,
            transaction_type=TransactionType.CREDIT,
            amount_cents=amount_cents,
            currency=currency,
            source=(
                TransactionSource.REFUND_RECOVERY
                if matched_offer
                else TransactionSource.EXTERNAL
            ),
            offer_id=matched_offer.id if matched_offer else None,
            shopify_transaction_id=txn.id,
            occurred_at=datetime.now(UTC),
        )
        db.add(ct)

        try:
            await db.commit()
        except Exception:
            await db.rollback()
            return {"status": "skipped", "reason": "duplicate_transaction"}

        logger.info(
            "sc_credit_recorded",
            shop=shop_domain,
            txn_id=txn.id,
            amount_cents=amount_cents,
        )
        return {"status": "success"}

    except Exception as e:
        logger.error(
            "sc_credit_webhook_processing_error",
            shop=shop_domain,
            error=str(e),
            exc_info=True,
        )
        return {"status": "error", "message": "Internal processing error"}
