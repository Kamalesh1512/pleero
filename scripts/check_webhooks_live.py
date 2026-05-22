"""
Check what webhooks are currently registered for the dev store.
This will help us understand if TOML webhooks are auto-registered by Shopify CLI.
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.merchant import Merchant
from app.core.encryption import decrypt_token
from app.core.config import settings


async def check_webhooks():
    """Check what webhooks are registered for the dev store."""

    # Create database connection
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Get merchant
        result = await session.execute(
            select(Merchant).where(Merchant.shop_domain == "e-comm-dev-store.myshopify.com")
        )
        merchant = result.scalar_one_or_none()

        if not merchant:
            print("❌ Merchant not found in database")
            return

        print(f"✅ Found merchant: {merchant.shop_domain}")
        print(f"   ID: {merchant.id}")

        # Decrypt access token
        access_token = decrypt_token(merchant.access_token_encrypted)
        print(f"✅ Decrypted access token")

        # Query Shopify for existing webhooks
        query = """
        {
          webhookSubscriptions(first: 50) {
            edges {
              node {
                id
                topic
                endpoint {
                  __typename
                  ... on WebhookHttpEndpoint {
                    callbackUrl
                  }
                }
              }
            }
          }
        }
        """

        print(f"\n📡 Querying Shopify for registered webhooks...\n")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"https://{merchant.shop_domain}/admin/api/{settings.SHOPIFY_API_VERSION}/graphql.json",
                headers={
                    "X-Shopify-Access-Token": access_token,
                    "Content-Type": "application/json",
                },
                json={"query": query},
            )

            result = response.json()

            if "errors" in result:
                print(f"❌ GraphQL errors: {result['errors']}")
                return

            webhooks = result.get("data", {}).get("webhookSubscriptions", {}).get("edges", [])

            if not webhooks:
                print("📭 No webhooks registered!")
                print("\n💡 This means:")
                print("   1. Shopify CLI did NOT auto-register TOML webhooks")
                print("   2. Our programmatic registration failed")
                print("   3. You need to investigate why both methods aren't working")
                return

            print(f"📬 Found {len(webhooks)} webhook(s) registered:\n")

            for edge in webhooks:
                node = edge["node"]
                topic = node["topic"]
                webhook_id = node["id"]
                callback = node.get("endpoint", {}).get("callbackUrl", "N/A")

                status = "✅" if "pleero" in callback.lower() else "⚠️"
                print(f"{status} {topic}")
                print(f"   ID: {webhook_id}")
                print(f"   URL: {callback}\n")

            # Check for REFUNDS_CREATE specifically
            refund_webhook = next(
                (edge["node"] for edge in webhooks if edge["node"]["topic"] == "REFUNDS_CREATE"),
                None
            )

            if refund_webhook:
                print("✅ REFUNDS_CREATE webhook IS registered!")
                print(f"   This means the webhook exists, so our programmatic registration")
                print(f"   was failing because it was trying to create a duplicate.")
                print(f"\n   Action: Remove programmatic registration from auth.py callback")
            else:
                print("❌ REFUNDS_CREATE webhook NOT registered")
                print("   This is the problem - we need to figure out why registration is failing")


if __name__ == "__main__":
    asyncio.run(check_webhooks())
