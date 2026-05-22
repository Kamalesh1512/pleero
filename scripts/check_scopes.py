"""
Check what scopes the access token actually has.
This will show us if the OAuth flow granted the scopes we requested.
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.merchant import Merchant
from app.core.encryption import decrypt_token
from app.core.config import settings


async def check_scopes():
    """Check what scopes the access token has."""

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(
            select(Merchant).where(Merchant.shop_domain == "e-comm-dev-store.myshopify.com")
        )
        merchant = result.scalar_one_or_none()

        if not merchant:
            print("❌ Merchant not found")
            return

        access_token = decrypt_token(merchant.access_token_encrypted)

        # Query shop info which includes access scopes
        query = """
        {
          shop {
            name
            myshopifyDomain
          }
          appInstallation {
            accessScopes {
              handle
              description
            }
          }
        }
        """

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

            shop = result.get("data", {}).get("shop", {})
            app_installation = result.get("data", {}).get("appInstallation", {})
            scopes = app_installation.get("accessScopes", [])

            print(f"🏪 Shop: {shop.get('name')}")
            print(f"   Domain: {shop.get('myshopifyDomain')}\n")

            if not scopes:
                print("⚠️  No access scopes found (or query failed)")
                return

            print(f"🔑 Granted Access Scopes ({len(scopes)}):\n")

            required_scopes = {
                "write_orders": False,
                "write_customers": False,
                "write_store_credit_account_transactions": False
            }

            for scope in scopes:
                handle = scope.get("handle")
                description = scope.get("description", "")

                # Check if this is a required scope
                if handle in required_scopes:
                    required_scopes[handle] = True
                    print(f"   ✅ {handle}")
                else:
                    print(f"   • {handle}")

                if description:
                    print(f"      {description}")

            print("\n📋 Required Scopes Check:")
            all_granted = True
            for scope_name, granted in required_scopes.items():
                status = "✅" if granted else "❌"
                print(f"   {status} {scope_name}")
                if not granted:
                    all_granted = False

            if all_granted:
                print("\n✅ All required scopes are granted!")
                print("   The scope issue is NOT the problem.")
                print("\n🤔 Next steps:")
                print("   1. REFUNDS_CREATE might be a mandatory webhook (TOML-only)")
                print("   2. Development stores might not support REFUNDS_CREATE programmatically")
                print("   3. API version 2026-04 might have restrictions")
            else:
                print("\n❌ Missing required scopes!")
                print("   This is why REFUNDS_CREATE registration fails.")
                print("   You need to reinstall the app with correct scopes.")


if __name__ == "__main__":
    asyncio.run(check_scopes())
