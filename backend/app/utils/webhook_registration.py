"""
Shopify webhook registration utilities.
Registers webhooks programmatically using GraphQL Admin API.
"""

import httpx
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


async def register_webhooks(shop: str, access_token: str) -> bool:
    """
    Register all required webhooks for the app.

    Args:
        shop: Shop domain (e.g., "store.myshopify.com")
        access_token: Shop access token

    Returns:
        True if all webhooks registered successfully, False otherwise
    """
    webhooks = [
        {
            "topic": "REFUNDS_CREATE",
            "endpoint": f"{settings.API_BASE_URL}/webhooks/refunds/create",
        },
        {
            "topic": "APP_UNINSTALLED",
            "endpoint": f"{settings.API_BASE_URL}/webhooks/app/uninstalled",
        },
    ]

    logger.info(
        "registering_webhooks",
        shop=shop,
        webhook_count=len(webhooks),
        api_base_url=settings.API_BASE_URL,
    )

    success_count = 0

    async with httpx.AsyncClient() as client:
        for webhook in webhooks:
            success = await _register_single_webhook(
                client=client,
                shop=shop,
                access_token=access_token,
                topic=webhook["topic"],
                endpoint=webhook["endpoint"],
            )
            if success:
                success_count += 1

    logger.info(
        "webhooks_registered",
        shop=shop,
        total=len(webhooks),
        successful=success_count,
    )

    return success_count == len(webhooks)


async def _register_single_webhook(
    client: httpx.AsyncClient,
    shop: str,
    access_token: str,
    topic: str,
    endpoint: str,
) -> bool:
    """
    Register a single webhook using GraphQL mutation.

    Args:
        client: HTTP client
        shop: Shop domain
        access_token: Shop access token
        topic: Webhook topic (e.g., "REFUNDS_CREATE")
        endpoint: Webhook endpoint URL

    Returns:
        True if successful, False otherwise
    """
    mutation = """
    mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
        webhookSubscription {
          id
          topic
          endpoint {
            __typename
            ... on WebhookHttpEndpoint {
              callbackUrl
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
    """

    variables = {
        "topic": topic,
        "webhookSubscription": {
            "callbackUrl": endpoint,
            "format": "JSON",
        },
    }

    try:
        response = await client.post(
            f"https://{shop}/admin/api/{settings.SHOPIFY_API_VERSION}/graphql.json",
            headers={
                "X-Shopify-Access-Token": access_token,
                "Content-Type": "application/json",
            },
            json={"query": mutation, "variables": variables},
            timeout=10.0,
        )

        response.raise_for_status()
        result = response.json()

        # Check for GraphQL errors
        if "errors" in result:
            logger.error(
                "webhook_registration_graphql_error",
                shop=shop,
                topic=topic,
                errors=result["errors"],
            )
            return False

        # Check for user errors
        data = result.get("data", {}).get("webhookSubscriptionCreate", {})
        user_errors = data.get("userErrors", [])

        if user_errors:
            logger.error(
                "webhook_registration_user_error",
                shop=shop,
                topic=topic,
                errors=user_errors,
            )
            return False

        # Success
        webhook_id = data.get("webhookSubscription", {}).get("id")
        logger.info(
            "webhook_registered",
            shop=shop,
            topic=topic,
            endpoint=endpoint,
            webhook_id=webhook_id,
        )
        return True

    except httpx.HTTPError as e:
        logger.error(
            "webhook_registration_http_error",
            shop=shop,
            topic=topic,
            error=str(e),
        )
        return False
    except Exception as e:
        logger.error(
            "webhook_registration_unexpected_error",
            shop=shop,
            topic=topic,
            error=str(e),
        )
        return False


async def delete_all_webhooks(shop: str, access_token: str) -> bool:
    """
    Delete all webhooks for a shop (useful for uninstall cleanup).

    Args:
        shop: Shop domain
        access_token: Shop access token

    Returns:
        True if successful, False otherwise
    """
    query = """
    {
      webhookSubscriptions(first: 250) {
        edges {
          node {
            id
          }
        }
      }
    }
    """

    try:
        async with httpx.AsyncClient() as client:
            # Get all webhook IDs
            response = await client.post(
                f"https://{shop}/admin/api/{settings.SHOPIFY_API_VERSION}/graphql.json",
                headers={
                    "X-Shopify-Access-Token": access_token,
                    "Content-Type": "application/json",
                },
                json={"query": query},
                timeout=10.0,
            )

            response.raise_for_status()
            result = response.json()

            webhook_ids = [
                edge["node"]["id"]
                for edge in result.get("data", {})
                .get("webhookSubscriptions", {})
                .get("edges", [])
            ]

            if not webhook_ids:
                logger.info("no_webhooks_to_delete", shop=shop)
                return True

            # Delete each webhook
            for webhook_id in webhook_ids:
                await _delete_single_webhook(client, shop, access_token, webhook_id)

            logger.info(
                "webhooks_deleted",
                shop=shop,
                count=len(webhook_ids),
            )
            return True

    except Exception as e:
        logger.error(
            "webhook_deletion_error",
            shop=shop,
            error=str(e),
        )
        return False


async def _delete_single_webhook(
    client: httpx.AsyncClient,
    shop: str,
    access_token: str,
    webhook_id: str,
) -> bool:
    """Delete a single webhook by ID."""
    mutation = """
    mutation webhookSubscriptionDelete($id: ID!) {
      webhookSubscriptionDelete(id: $id) {
        deletedWebhookSubscriptionId
        userErrors {
          field
          message
        }
      }
    }
    """

    variables = {"id": webhook_id}

    try:
        response = await client.post(
            f"https://{shop}/admin/api/{settings.SHOPIFY_API_VERSION}/graphql.json",
            headers={
                "X-Shopify-Access-Token": access_token,
                "Content-Type": "application/json",
            },
            json={"query": mutation, "variables": variables},
            timeout=10.0,
        )

        response.raise_for_status()
        return True

    except Exception as e:
        logger.warning(
            "webhook_deletion_failed",
            shop=shop,
            webhook_id=webhook_id,
            error=str(e),
        )
        return False
