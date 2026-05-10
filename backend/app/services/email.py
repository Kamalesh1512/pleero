"""
Email service for sending offer emails via Resend.
Hard rule #4: Use httpx (async), never requests (blocking).
"""

from datetime import datetime, UTC
from uuid import UUID

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.logging import get_logger
from app.models.offer import Offer
from app.models.merchant import Merchant
from app.models.offer_event import OfferEvent, EventType

logger = get_logger(__name__)


def format_currency(cents: int) -> str:
    """Format cents as dollars (e.g., 5000 -> $50)."""
    return f"${cents / 100:.0f}"


def build_offer_email_html(
    merchant_logo_url: str | None,
    merchant_brand_color: str,
    merchant_name: str,
    customer_first_name: str,
    credit_amount_cents: int,
    refund_amount_cents: int,
    offer_url: str,
    decline_url: str,
) -> str:
    """
    Build offer email HTML.

    Simple, mobile-first, single-column layout.
    Hard rule #9: No Pleero branding visible to customer.

    Args:
        merchant_logo_url: URL to merchant logo (optional)
        merchant_brand_color: Hex color for CTA button
        merchant_name: Merchant store name
        customer_first_name: Customer's first name
        credit_amount_cents: Credit amount in cents
        refund_amount_cents: Refund amount in cents
        offer_url: URL to accept offer
        decline_url: URL to decline offer

    Returns:
        HTML email content
    """
    credit_amount = format_currency(credit_amount_cents)
    refund_amount = format_currency(refund_amount_cents)

    logo_html = ""
    if merchant_logo_url:
        logo_html = f'''
        <div style="text-align: center; margin-bottom: 32px;">
            <img src="{merchant_logo_url}" alt="{merchant_name}" style="max-width: 200px; height: auto;">
        </div>
        '''

    html = f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your return is approved</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px;">
            {logo_html}

            <h1 style="font-size: 24px; font-weight: 600; color: #111111; margin: 0 0 16px 0;">
                Hi {customer_first_name}, your return is approved.
            </h1>

            <p style="font-size: 16px; color: #333333; line-height: 1.5; margin: 0 0 32px 0;">
                We've got you covered. Instead of waiting 5-7 days for a refund, keep <strong>{credit_amount}</strong> as store credit and shop again instantly.
            </p>

            <!-- Primary CTA -->
            <div style="margin-bottom: 24px;">
                <a href="{offer_url}" style="display: inline-block; background-color: {merchant_brand_color}; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; min-width: 200px; text-align: center;">
                    Take the {credit_amount} credit
                </a>
            </div>

            <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="font-size: 14px; color: #666666; margin: 0;">
                    ✓ Instant – use it right now<br>
                    ✓ No expiry – keep it forever<br>
                    ✓ Easy – just like cash, but better
                </p>
            </div>

            <!-- Secondary link -->
            <p style="font-size: 14px; color: #666666; text-align: center; margin: 0 0 8px 0;">
                <a href="{decline_url}" style="color: #666666; text-decoration: underline;">
                    I still want a cash refund ({refund_amount}, 5-7 days)
                </a>
            </p>

            <!-- Footer -->
            <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e5e5; text-align: center;">
                <p style="font-size: 12px; color: #999999; margin: 0;">
                    Secured by {merchant_name}
                </p>
            </div>
        </div>
    </body>
    </html>
    '''

    return html


async def send_offer_email(
    db: AsyncSession,
    offer_id: UUID,
) -> bool:
    """
    Send offer email to customer via Resend.

    Args:
        db: Database session
        offer_id: Offer ID

    Returns:
        True if email sent successfully, False otherwise

    Note: Wrapped in try/except to never crash webhook handler.
    """
    try:
        # Check if Resend is configured
        if not settings.RESEND_API_KEY:
            logger.warning(
                "resend_not_configured",
                offer_id=str(offer_id),
                message="RESEND_API_KEY not set - email would be sent here in production"
            )
            return True  # Don't fail the workflow

        # Load offer and merchant
        result = await db.execute(
            select(Offer).where(Offer.id == offer_id)
        )
        offer = result.scalar_one_or_none()

        if not offer:
            logger.error("send_offer_email_failed", reason="offer_not_found", offer_id=str(offer_id))
            return False

        result = await db.execute(
            select(Merchant).where(Merchant.id == offer.merchant_id)
        )
        merchant = result.scalar_one_or_none()

        if not merchant:
            logger.error("send_offer_email_failed", reason="merchant_not_found", offer_id=str(offer_id))
            return False

        # Build offer URLs
        offer_url = f"{settings.FRONTEND_URL}/offers/{offer.offer_token}"
        decline_url = f"{settings.FRONTEND_URL}/offers/{offer.offer_token}?action=decline"

        # Extract merchant name from shop domain
        merchant_name = merchant.shop_domain.split('.')[0].replace('-', ' ').title()

        # Build email HTML
        html_content = build_offer_email_html(
            merchant_logo_url=merchant.logo_url,
            merchant_brand_color=merchant.brand_color,
            merchant_name=merchant_name,
            customer_first_name=offer.customer_first_name,
            credit_amount_cents=offer.credit_amount_cents,
            refund_amount_cents=offer.refund_amount_cents,
            offer_url=offer_url,
            decline_url=decline_url,
        )

        # Send via Resend API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": "returns@pleero.app",
                    "to": [offer.customer_email],
                    "reply_to": merchant.merchant_email,
                    "subject": f"{merchant_name} approved your return",
                    "html": html_content,
                },
                timeout=10.0,
            )

            response.raise_for_status()

            # Update offer sent timestamp
            offer.sent_at = datetime.now(UTC)

            # Create sent event
            event = OfferEvent(
                offer_id=offer.id,
                event_type=EventType.SENT,
                metadata={
                    "recipient": offer.customer_email,
                    "resend_response": response.json(),
                },
            )
            db.add(event)

            await db.commit()

            logger.info(
                "offer_email_sent",
                offer_id=str(offer.id),
                customer_email=offer.customer_email,
                merchant_id=str(merchant.id),
            )

            return True

    except httpx.HTTPError as e:
        logger.error(
            "send_offer_email_http_error",
            offer_id=str(offer_id),
            error=str(e),
            exc_info=True,
        )
        return False

    except Exception as e:
        logger.error(
            "send_offer_email_unexpected_error",
            offer_id=str(offer_id),
            error=str(e),
            exc_info=True,
        )
        return False
