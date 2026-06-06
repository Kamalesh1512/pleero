"""
Dashboard API endpoints.
Provides merchant metrics and settings management.
"""

from calendar import monthrange
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.logging import get_logger
from app.models.merchant import Merchant
from app.models.offer import Offer, OfferStatus
from app.schemas.merchant import MerchantResponse, MerchantUpdate
from app.services.billing import sync_merchant_subscription_from_shopify
from app.utils.session_auth import get_current_shop

logger = get_logger(__name__)
router = APIRouter(prefix="/api", tags=["dashboard"])


class OfferListItem(BaseModel):
    """Single offer in the offers list."""

    id: str
    order_number: str
    customer_email: str
    refund_amount_cents: int
    credit_amount_cents: int
    status: OfferStatus
    revenue_retained_cents: int | None
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }


class OfferListResponse(BaseModel):
    """Response for offers list endpoint."""

    offers: list[OfferListItem]
    total: int


class DashboardMetrics(BaseModel):
    """Dashboard metrics for current month."""

    offers_sent: int
    offers_accepted: int
    offers_declined: int
    acceptance_rate: float
    revenue_retained_cents: int


@router.get("/dashboard/metrics")
async def get_dashboard_metrics(
    shop: str = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db),
) -> DashboardMetrics:
    """
    Get dashboard metrics for the current month.

    Requires App Bridge session token authentication.

    Returns:
        - offers_sent: Count of offers sent this month
        - offers_accepted: Count of accepted offers
        - offers_declined: Count of declined offers
        - acceptance_rate: Percentage of offers accepted
        - revenue_retained_cents: Total credit amount issued
    """
    # Load merchant
    result = await db.execute(select(Merchant).where(Merchant.shop_domain == shop))
    merchant = result.scalar_one_or_none()

    if not merchant:
        logger.error("merchant_not_found", shop=shop)
        raise HTTPException(
            status_code=404,
            detail="Merchant not found",
        )

    # Get current month date range
    now = datetime.now(UTC)
    year = now.year
    month = now.month

    # First day of month
    start_date = datetime(year, month, 1, tzinfo=UTC)

    # Last day of month
    _, last_day = monthrange(year, month)
    end_date = datetime(year, month, last_day, 23, 59, 59, tzinfo=UTC)

    # Query offers for this month
    result = await db.execute(
        select(
            func.count(Offer.id).label("total"),
            func.sum(case((Offer.status == OfferStatus.ACCEPTED, 1), else_=0)).label(
                "accepted"
            ),
            func.sum(case((Offer.status == OfferStatus.DECLINED, 1), else_=0)).label(
                "declined"
            ),
            func.sum(
                case(
                    (Offer.status == OfferStatus.ACCEPTED, Offer.credit_amount_cents),
                    else_=0,
                )
            ).label("revenue_retained"),
        ).where(
            Offer.merchant_id == merchant.id,
            Offer.created_at >= start_date,
            Offer.created_at <= end_date,
        )
    )

    row = result.one()

    offers_sent = row.total or 0
    offers_accepted = row.accepted or 0
    offers_declined = row.declined or 0
    revenue_retained_cents = row.revenue_retained or 0

    # Calculate acceptance rate
    if offers_sent > 0:
        acceptance_rate = offers_accepted / offers_sent * 100
    else:
        acceptance_rate = 0.0

    logger.info(
        "dashboard_metrics_fetched",
        shop=shop,
        offers_sent=offers_sent,
        offers_accepted=offers_accepted,
    )

    return DashboardMetrics(
        offers_sent=offers_sent,
        offers_accepted=offers_accepted,
        offers_declined=offers_declined,
        acceptance_rate=round(acceptance_rate, 1),
        revenue_retained_cents=revenue_retained_cents,
    )


@router.get("/merchants/me")
async def get_merchant_settings(
    shop: str = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db),
) -> MerchantResponse:
    """
    Get current merchant settings.

    Requires App Bridge session token authentication.

    Returns:
        Merchant settings (bonus %, cap, branding, etc.)
    """
    # Load merchant
    result = await db.execute(select(Merchant).where(Merchant.shop_domain == shop))
    merchant = result.scalar_one_or_none()

    if not merchant:
        logger.error("merchant_not_found", shop=shop)
        raise HTTPException(
            status_code=404,
            detail="Merchant not found",
        )

    await sync_merchant_subscription_from_shopify(db, merchant)

    logger.info("merchant_settings_fetched", shop=shop, merchant_id=str(merchant.id))

    return MerchantResponse.model_validate(merchant)


@router.patch("/merchants/me")
async def update_merchant_settings(
    data: MerchantUpdate,
    shop: str = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db),
) -> MerchantResponse:
    """
    Update merchant settings.

    Requires App Bridge session token authentication.

    Accepts:
        - bonus_percentage: 5-20%
        - bonus_cap_cents: >= $10 (1000 cents)
        - merchant_email: Contact email
        - brand_color: Hex color code
        - logo_url: Logo URL

    Returns:
        Updated merchant settings
    """
    # Load merchant
    result = await db.execute(select(Merchant).where(Merchant.shop_domain == shop))
    merchant = result.scalar_one_or_none()

    if not merchant:
        logger.error("merchant_not_found", shop=shop)
        raise HTTPException(
            status_code=404,
            detail="Merchant not found",
        )

    # Update fields
    if data.bonus_percentage is not None:
        merchant.bonus_percentage = data.bonus_percentage

    if data.bonus_cap_cents is not None:
        merchant.bonus_cap_cents = data.bonus_cap_cents

    if data.merchant_email is not None:
        merchant.merchant_email = data.merchant_email

    if data.brand_color is not None:
        merchant.brand_color = data.brand_color

    if data.logo_url is not None:
        merchant.logo_url = data.logo_url

    await db.commit()
    await db.refresh(merchant)

    logger.info(
        "merchant_settings_updated",
        shop=shop,
        merchant_id=str(merchant.id),
        updated_fields=data.model_dump(exclude_unset=True),
    )

    return MerchantResponse.model_validate(merchant)


@router.get("/shop/logo")
async def get_shop_logo(
    shop: str = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str | None]:
    """
    Fetch the merchant's store icon from Shopify.

    Uses the publicly available {shop}/icon.png endpoint (no auth needed).
    Returns the URL if the store has an icon uploaded, or null otherwise.

    Returns:
        logo_url: URL of the store icon, or null if not set
    """
    import httpx

    result = await db.execute(select(Merchant).where(Merchant.shop_domain == shop))
    merchant = result.scalar_one_or_none()

    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    icon_url = f"https://{shop}/icon.png"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.head(icon_url, follow_redirects=True)
            if response.status_code == 200:
                logger.info("shop_logo_found", shop=shop, icon_url=icon_url)
                return {"logo_url": icon_url}

            logger.warning(
                "shop_logo_not_found",
                shop=shop,
                status_code=response.status_code,
            )
            return {"logo_url": None}
    except Exception:
        logger.exception("shop_logo_fetch_failed", shop=shop)
        return {"logo_url": None}


@router.get("/offers")
async def get_merchant_offers(
    shop: str = Depends(get_current_shop),
    db: AsyncSession = Depends(get_db),
    limit: int = 100,
    offset: int = 0,
) -> OfferListResponse:
    """
    Get list of all offers for the current merchant.

    Requires App Bridge session token authentication.

    Args:
        limit: Maximum number of offers to return (default 100)
        offset: Number of offers to skip (default 0)

    Returns:
        List of offers with customer and order details
    """
    # Load merchant
    result = await db.execute(select(Merchant).where(Merchant.shop_domain == shop))
    merchant = result.scalar_one_or_none()

    if not merchant:
        logger.error("merchant_not_found", shop=shop)
        raise HTTPException(
            status_code=404,
            detail="Merchant not found",
        )

    # Get total count
    count_result = await db.execute(
        select(func.count(Offer.id)).where(Offer.merchant_id == merchant.id)
    )
    total = count_result.scalar_one()

    # Get offers, ordered by created_at desc (newest first)
    result = await db.execute(
        select(Offer)
        .where(Offer.merchant_id == merchant.id)
        .order_by(Offer.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    offers = result.scalars().all()

    # Convert to response format
    offer_items = []
    for offer in offers:
        # Calculate revenue retained (only for accepted offers)
        revenue_retained_cents = (
            offer.credit_amount_cents if offer.status == OfferStatus.ACCEPTED else None
        )

        offer_items.append(
            OfferListItem(
                id=str(offer.id),
                order_number=offer.order_number or offer.shopify_order_id,
                customer_email=offer.customer_email,
                refund_amount_cents=offer.refund_amount_cents,
                credit_amount_cents=offer.credit_amount_cents,
                status=offer.status,
                revenue_retained_cents=revenue_retained_cents,
                created_at=offer.created_at,
            )
        )

    logger.info(
        "offers_list_fetched",
        shop=shop,
        merchant_id=str(merchant.id),
        total=total,
        returned=len(offer_items),
    )

    return OfferListResponse(
        offers=offer_items,
        total=total,
    )
