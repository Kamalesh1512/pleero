"""
Simulate a Shopify REFUNDS_CREATE webhook for end-to-end testing.

Sends a correctly-signed payload directly to the local backend.
No tunnel, no Shopify CLI, no protected-customer-data approval needed.

Usage:
    python scripts/test_refund_webhook.py

Override defaults via env vars:
    WEBHOOK_URL      (default: http://localhost:8000/webhooks/refunds/create)
    SHOPIFY_SECRET   (default: read from .env in project root)
    SHOP_DOMAIN      (default: e-comm-dev-store.myshopify.com)
    CUSTOMER_EMAIL   (default: kamalesh97indie@gmail.com)
"""

import asyncio
import hashlib
import hmac
import base64
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx

# ── Load .env from project root if dotenv is available ───────────────────────
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass

# ── Configuration — override via env vars ─────────────────────────────────────
WEBHOOK_URL = os.getenv(
    "WEBHOOK_URL", "http://localhost:8000/webhooks/refunds/create"
)
SHOPIFY_SECRET = os.getenv("SHOPIFY_API_SECRET") or os.getenv("SHOPIFY_SECRET")
if not SHOPIFY_SECRET:
    sys.exit(
        "Error: SHOPIFY_API_SECRET env var is required.\n"
        "  export SHOPIFY_API_SECRET=<value from backend/.env>\n"
        "  or create a .env file at the project root."
    )
SHOP_DOMAIN = os.getenv("SHOP_DOMAIN", "e-comm-dev-store.myshopify.com")

# This email receives the offer — set to your own inbox for screenshot
CUSTOMER_EMAIL = os.getenv("CUSTOMER_EMAIL", "kamalesh97indie@gmail.com")

# Bump this if re-running (idempotency check rejects duplicate refund IDs)
REFUND_ID = int(os.getenv("REFUND_ID", "9000000001"))


# ── Helpers ───────────────────────────────────────────────────────────────────

def generate_hmac(body_bytes: bytes, secret: str) -> str:
    """HMAC must be computed on the exact bytes sent as the request body."""
    return base64.b64encode(
        hmac.new(secret.encode("utf-8"), body_bytes, hashlib.sha256).digest()
    ).decode()


def build_payload() -> dict:
    """
    Realistic REFUNDS_CREATE payload with all fields Pleero needs.

    Key requirements:
      - order.customer.email          → triggers offer
      - order.customer.default_address.country_code = "US"  → passes Phase-1 filter
      - refund_line_items[].subtotal  → must be a STRING (Pydantic schema)
      - refund_line_items[].total_tax → must be a STRING (Pydantic schema)
    """
    now = datetime.now(timezone.utc).isoformat()

    return {
        "id": REFUND_ID,
        "order_id": 9000000002,
        "created_at": now,
        "processed_at": now,
        "note": "Pleero webhook test",
        "user_id": 87654321,
        "restock": True,
        "duties": [],
        "order_adjustments": [],
        # ── Order + customer — required for Pleero to proceed ───────────────
        "order": {
            "id": 9000000002,
            "name": "#TEST-001",
            "customer": {
                "id": 7777000001,
                "email": CUSTOMER_EMAIL,
                "first_name": "Jordan",
                "last_name": "Mitchell",
                "default_address": {
                    "country_code": "US",
                    "country": "United States",
                },
            },
        },
        # ── Line items — subtotal/total_tax MUST be strings per schema ──────
        "refund_line_items": [
            {
                "id": 111111111,
                "line_item_id": 222222222,
                "quantity": 1,
                "subtotal": "89.99",      # string, not float
                "total_tax": "7.20",      # string, not float
            }
        ],
        "transactions": [
            {
                "id": 333333333,
                "order_id": 9000000002,
                "kind": "refund",
                "gateway": "shopify_payments",
                "status": "success",
                "amount": "89.99",
                "currency": "USD",
                "created_at": now,
                "processed_at": now,
            }
        ],
    }


# ── Main ──────────────────────────────────────────────────────────────────────

async def run():
    payload = build_payload()

    # Serialize with compact separators — HMAC is on these exact bytes
    body_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    sig = generate_hmac(body_bytes, SHOPIFY_SECRET)

    headers = {
        "Content-Type": "application/json",
        "X-Shopify-Topic": "refunds/create",
        "X-Shopify-Hmac-SHA256": sig,
        "X-Shopify-Shop-Domain": SHOP_DOMAIN,
        "X-Shopify-API-Version": "2026-04",
        "X-Shopify-Webhook-Id": f"test-{REFUND_ID}",
    }

    print("\n" + "─" * 60)
    print("PLEERO — Refund Webhook Simulator")
    print("─" * 60)
    print(f"  URL:        {WEBHOOK_URL}")
    print(f"  Shop:       {SHOP_DOMAIN}")
    print(f"  Customer:   {CUSTOMER_EMAIL}")
    print(f"  Refund ID:  {REFUND_ID}  (bump REFUND_ID env var to resend)")
    print(f"  Amount:     $89.99  → offer = $89.99 + merchant bonus %")
    print(f"  HMAC:       {sig[:32]}...")
    print("─" * 60)

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(WEBHOOK_URL, headers=headers, content=body_bytes)
        except httpx.ConnectError:
            print("\n✗  Connection refused — is the backend running?")
            print("   docker compose up backend postgres redis")
            sys.exit(1)
        except Exception as exc:
            print(f"\n✗  {exc}")
            sys.exit(1)

    print(f"\n← HTTP {response.status_code}")

    try:
        body = response.json()
    except Exception:
        print(f"   Raw: {response.text[:300]}")
        sys.exit(1)

    print(f"   {body}")

    status = body.get("status")
    reason = body.get("reason", "")

    if status == "success":
        print(f"\n✓  Offer created (ID: {body.get('offer_id')})")
        print(f"   Check {CUSTOMER_EMAIL} for the offer email")

    elif reason == "merchant_not_found":
        print("\n✗  Merchant not found in DB.")
        print("   The shop must be OAuth-installed first so a Merchant row exists.")
        print("   Quick fix — seed a test merchant:")
        print()
        print("   docker exec -it pleero_backend python -c \"")
        print("   import asyncio")
        print("   from app.core.database import AsyncSessionLocal")
        print("   from app.models.merchant import Merchant, SubscriptionStatus")
        print("   from cryptography.fernet import Fernet")
        print("   import os")
        print()
        print("   async def seed():")
        print("       async with AsyncSessionLocal() as db:")
        print("           m = Merchant(")
        print(f"               shop_domain='{SHOP_DOMAIN}',")
        print("               merchant_email='you@example.com',")
        print("               access_token=Fernet(os.environ['ENCRYPTION_KEY'].encode()).encrypt(b'test_token'),")
        print("               subscription_status=SubscriptionStatus.TRIAL,")
        print("               bonus_percentage=20,")
        print("               bonus_cap_cents=5000,")
        print("           )")
        print("           db.add(m)")
        print("           await db.commit()")
        print("   asyncio.run(seed())\"")

    elif reason == "already_exists":
        print("\n→  Offer already created for this refund ID (idempotency check).")
        print(f"   Re-run with a different ID:  REFUND_ID=9000000002 python {__file__}")

    elif reason == "invalid_data":
        print("\n✗  Payload rejected — missing required fields.")
        print("   Check that 'order.customer.email' is present and refund amount > 0")

    elif reason == "no_email":
        print("\n✗  Customer email missing in payload.")

    elif reason == "non_us_customer":
        print("\n✗  Customer country is not US — skipped by Phase-1 filter.")

    elif reason == "inactive_subscription":
        print("\n✗  Merchant subscription is CANCELLED or EXPIRED.")
        print("   Seed the merchant with subscription_status=TRIAL.")

    elif response.status_code == 401:
        print("\n✗  HMAC verification failed.")
        print(f"   SHOPIFY_API_SECRET in the backend must equal: {SHOPIFY_SECRET}")
        print("   Check your backend .env or pass:  SHOPIFY_SECRET=<secret> python ...")

    elif response.status_code == 422:
        print("\n✗  Pydantic validation error — payload schema mismatch.")
        print("   Full error above. Usually a type mismatch (float vs str).")

    else:
        print(f"\n?  Unexpected response. Check backend logs:")
        print("   docker logs pleero_backend --tail 50")


if __name__ == "__main__":
    asyncio.run(run())
