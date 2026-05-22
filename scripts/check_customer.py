"""
Debug: Check if customer exists in Shopify dev store and test customer lookup query.
Run inside backend container.
"""
import asyncio
import sys
import os

sys.path.insert(0, '/app')

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.merchant import Merchant
from app.core.encryption import decrypt_token
from app.core.config import settings

EMAIL = "kmgowda1512@gmail.com"


async def check_customer():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(
            select(Merchant).where(Merchant.shop_domain == "e-comm-dev-store.myshopify.com")
        )
        merchant = result.scalar_one_or_none()
        access_token = decrypt_token(merchant.access_token_encrypted)

    async with httpx.AsyncClient(
        headers={"X-Shopify-Access-Token": access_token, "Content-Type": "application/json"},
        timeout=30.0,
    ) as client:
        # Test the exact query used in shopify.py
        query = """
        query getCustomer($email: String!) {
            customers(first: 1, query: $email) {
                edges {
                    node {
                        id
                        email
                        firstName
                    }
                }
            }
        }
        """
        variables = {"email": f"email:{EMAIL}"}
        url = f"https://e-comm-dev-store.myshopify.com/admin/api/{settings.SHOPIFY_API_VERSION}/graphql.json"

        print(f"Querying Shopify for customer: {EMAIL}\n")
        response = await client.post(url, json={"query": query, "variables": variables})
        data = response.json()

        print(f"Raw response:\n{data}\n")

        if "errors" in data:
            print(f"❌ GraphQL errors: {data['errors']}")
            return

        gql_data = data.get("data") or {}
        edges = gql_data.get("customers", {}).get("edges", [])

        if not edges:
            print(f"❌ Customer '{EMAIL}' NOT FOUND in Shopify dev store.")
            print("\nPlease create this customer at:")
            print(f"  https://e-comm-dev-store.myshopify.com/admin/customers/new")
            print(f"  Email: {EMAIL}")
        else:
            node = edges[0]["node"]
            print(f"✅ Customer found!")
            print(f"   ID: {node['id']}")
            print(f"   Email: {node['email']}")
            print(f"   Name: {node['firstName']}")


if __name__ == "__main__":
    asyncio.run(check_customer())
