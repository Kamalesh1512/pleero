"""
Quick script to check existing webhook subscriptions in a Shopify store.
Run this to see if REFUNDS_CREATE webhook is already registered.
"""

import httpx
import asyncio


async def check_webhooks(shop: str, access_token: str):
    """Query all existing webhook subscriptions."""
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

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"https://{shop}/admin/api/2026-04/graphql.json",
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
            print("📭 No webhooks registered")
            return

        print(f"📬 Found {len(webhooks)} webhook(s):\n")
        for edge in webhooks:
            node = edge["node"]
            topic = node["topic"]
            webhook_id = node["id"]
            callback = node.get("endpoint", {}).get("callbackUrl", "N/A")
            print(f"  • {topic}")
            print(f"    ID: {webhook_id}")
            print(f"    URL: {callback}\n")


if __name__ == "__main__":
    # TODO: Replace with your actual shop domain and access token from database
    SHOP = "e-comm-dev-store.myshopify.com"
    ACCESS_TOKEN = "your_access_token_here"  # Get from database

    print(f"Checking webhooks for {SHOP}...\n")
    asyncio.run(check_webhooks(SHOP, ACCESS_TOKEN))
