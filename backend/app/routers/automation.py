"""
Automation API endpoints — Store Credit Automation.

Merchants can:
- Configure workflow settings (enable/disable, timing)
- Issue manual goodwill Store Credit
- View win-back candidates
- Trigger a reminder sweep
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.logging import get_logger
from app.models.automation import AutomationWorkflow
from app.models.merchant import Merchant
from app.schemas.automation import (
    AutomationConfigItem,
    AutomationConfigResponse,
    AutomationConfigUpdate,
    GoodwillRequest,
    GoodwillResponse,
    ReminderTriggerResponse,
    WinbackCandidate,
    WinbackCandidatesResponse,
    WinbackIssueRequest,
    WinbackIssueResponse,
)
from app.services.automation import (
    ensure_automation_configs,
    find_winback_candidates,
    issue_goodwill_credit,
    issue_winback_credit,
    run_reminder_sweep,
)
from app.services.billing import (
    merchant_has_feature_access,
    sync_merchant_subscription_from_shopify,
)
from app.utils.session_auth import get_current_shop

logger = get_logger(__name__)
router = APIRouter(prefix="/api/automation", tags=["automation"])


async def _load_merchant(shop: str, db: AsyncSession) -> Merchant:
    """Load merchant or raise 404."""
    result = await db.execute(select(Merchant).where(Merchant.shop_domain == shop))
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return merchant


def _check_feature_access(merchant: Merchant) -> None:
    """Raise 403 if merchant lacks feature access."""
    if not merchant_has_feature_access(merchant):
        logger.warning(
            "automation_access_denied",
            merchant_id=str(merchant.id),
            status=merchant.subscription_status.value,
        )
        raise HTTPException(
            status_code=403,
            detail="Merchant subscription is inactive",
        )


# ─── Settings ──────────────────────────────────────────────────────────────────


@router.get("/settings", response_model=AutomationConfigResponse)
async def get_automation_settings(
    shop: str = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db),
) -> AutomationConfigResponse:
    """Get all automation workflow configurations for this merchant."""
    merchant = await _load_merchant(shop, db)
    await sync_merchant_subscription_from_shopify(db, merchant)
    _check_feature_access(merchant)

    configs = await ensure_automation_configs(merchant.id, db)
    return AutomationConfigResponse(
        workflows=[
            AutomationConfigItem(
                workflow=c.workflow.value,
                enabled=c.enabled,
                min_days_before_action=c.min_days_before_action,
                max_actions_per_customer=c.max_actions_per_customer,
            )
            for c in configs.values()
        ]
    )


@router.patch("/settings/{workflow}", response_model=AutomationConfigItem)
async def update_automation_settings(
    workflow: str,
    data: AutomationConfigUpdate,
    shop: str = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db),
) -> AutomationConfigItem:
    """Update one workflow's automation configuration."""
    merchant = await _load_merchant(shop, db)
    await sync_merchant_subscription_from_shopify(db, merchant)
    _check_feature_access(merchant)

    # Validate workflow name
    try:
        wf = AutomationWorkflow(workflow)
    except ValueError:
        raise HTTPException(
            status_code=400, detail=f"Unknown workflow: {workflow}"
        ) from None

    # Load or create config
    configs = await ensure_automation_configs(merchant.id, db)
    cfg = configs.get(wf.value)
    if not cfg:
        raise HTTPException(status_code=404, detail="Workflow config not found")

    if data.enabled is not None:
        cfg.enabled = data.enabled
    if data.min_days_before_action is not None:
        cfg.min_days_before_action = data.min_days_before_action
    if data.max_actions_per_customer is not None:
        cfg.max_actions_per_customer = data.max_actions_per_customer

    await db.commit()
    await db.refresh(cfg)

    logger.info(
        "automation_settings_updated",
        merchant_id=str(merchant.id),
        workflow=workflow,
        enabled=cfg.enabled,
    )

    return AutomationConfigItem(
        workflow=cfg.workflow.value,
        enabled=cfg.enabled,
        min_days_before_action=cfg.min_days_before_action,
        max_actions_per_customer=cfg.max_actions_per_customer,
    )


# ─── Goodwill ──────────────────────────────────────────────────────────────────


@router.post("/goodwill", response_model=GoodwillResponse)
async def goodwill_credit(
    data: GoodwillRequest,
    shop: str = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db),
) -> GoodwillResponse:
    """Issue manual goodwill Store Credit to a customer."""
    merchant = await _load_merchant(shop, db)
    await sync_merchant_subscription_from_shopify(db, merchant)
    _check_feature_access(merchant)

    success, message = await issue_goodwill_credit(
        db=db,
        merchant=merchant,
        customer_email=data.customer_email,
        customer_first_name=data.customer_first_name,
        amount_cents=data.amount_cents,
        currency=data.currency,
        note=data.note,
    )

    return GoodwillResponse(success=success, message=message)


# ─── Win-back ──────────────────────────────────────────────────────────────────


@router.get("/winback", response_model=WinbackCandidatesResponse)
async def winback_candidates(
    shop: str = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db),
) -> WinbackCandidatesResponse:
    """Get win-back candidates — customers inactive for 90+ days."""
    merchant = await _load_merchant(shop, db)
    await sync_merchant_subscription_from_shopify(db, merchant)
    _check_feature_access(merchant)

    candidates = await find_winback_candidates(merchant.id, db)
    return WinbackCandidatesResponse(
        candidates=[WinbackCandidate(**c) for c in candidates],
        count=len(candidates),
    )


@router.post("/winback/issue", response_model=WinbackIssueResponse)
async def winback_issue(
    data: WinbackIssueRequest,
    shop: str = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db),
) -> WinbackIssueResponse:
    """Issue win-back Store Credit to a customer (merchant-initiated, after reviewing candidates)."""
    merchant = await _load_merchant(shop, db)
    await sync_merchant_subscription_from_shopify(db, merchant)
    _check_feature_access(merchant)

    success, message = await issue_winback_credit(
        db=db,
        merchant=merchant,
        customer_email=data.customer_email,
        customer_first_name=data.customer_first_name,
        amount_cents=data.amount_cents,
        currency=data.currency,
        note=data.note,
        customer_shopify_id=data.customer_shopify_id,
    )

    return WinbackIssueResponse(success=success, message=message)


# ─── Reminder trigger ──────────────────────────────────────────────────────────


@router.post("/reminders/trigger", response_model=ReminderTriggerResponse)
async def trigger_reminder_sweep(
    shop: str = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db),
) -> ReminderTriggerResponse:
    """Manually trigger the redemption reminder sweep for this merchant."""
    merchant = await _load_merchant(shop, db)
    await sync_merchant_subscription_from_shopify(db, merchant)
    _check_feature_access(merchant)

    sent = await run_reminder_sweep(merchant.id, db)
    return ReminderTriggerResponse(reminders_sent=sent)
