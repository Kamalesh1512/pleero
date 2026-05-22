#!/bin/bash

# Test REFUNDS_CREATE webhook with realistic payload
# This simulates what Shopify would send

WEBHOOK_URL="${WEBHOOK_URL:-https://api-dev.pleero.app/webhooks/refunds/create}"
SHOP_DOMAIN="${SHOP_DOMAIN:-e-comm-dev-store.myshopify.com}"
SHOPIFY_SECRET="${SHOPIFY_API_SECRET:?Set SHOPIFY_API_SECRET env var (from backend/.env) before running this script}"

# Create realistic refund payload matching Pydantic schema
PAYLOAD=$(cat <<'EOF'
{
  "id": 2025191904,
  "order_id": 5552025191904,
  "created_at": "2026-05-17T07:00:00Z",
  "note": "Customer requested refund - testing Pleero end-to-end flow",
  "user_id": 87654321,
  "processed_at": "2026-05-17T07:00:00Z",
  "restock": true,
  "refund_line_items": [
    {
      "id": 987654321,
      "line_item_id": 13579246810,
      "quantity": 1,
      "subtotal": "89.99",
      "total_tax": "7.20",
      "return_reason": "Customer changed mind"
    }
  ],
  "transactions": [
    {
      "id": 3025191904,
      "order_id": 5552025191904,
      "kind": "refund",
      "gateway": "shopify_payments",
      "status": "success",
      "amount": "97.19",
      "currency": "USD"
    }
  ],
  "order": {
    "id": 5552025191904,
    "name": "#1010",
    "customer": {
      "id": 24469822407024,
      "email": "kmgowda1512@gmail.com",
      "first_name": "Kamalesh",
      "last_name": "M",
      "default_address": {
        "country_code": "US",
        "country": "United States"
      }
    }
  }
}
EOF
)

# Generate HMAC signature (exactly like Shopify does)
HMAC=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SHOPIFY_SECRET" -binary | base64)

echo "================================================================================"
echo "🧪 TESTING REFUND WEBHOOK - Simulating Shopify REFUNDS_CREATE"
echo "================================================================================"
echo ""
echo "📡 Target URL: $WEBHOOK_URL"
echo "🏪 Shop Domain: $SHOP_DOMAIN"
echo "💰 Refund Amount: \$97.19 (including tax)"
echo "📦 Product: Premium Running Shoes"
echo "🔐 HMAC Signature: ${HMAC:0:40}..."
echo ""
echo "--------------------------------------------------------------------------------"
echo "📤 Sending webhook..."
echo "--------------------------------------------------------------------------------"
echo ""

# Send the webhook with proper Shopify headers
RESPONSE=$(curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: refunds/create" \
  -H "X-Shopify-Hmac-SHA256: $HMAC" \
  -H "X-Shopify-Shop-Domain: $SHOP_DOMAIN" \
  -H "X-Shopify-API-Version: 2026-04" \
  -H "X-Shopify-Webhook-Id: test-webhook-$(date +%s)" \
  -d "$PAYLOAD" \
  -w "\nHTTP_STATUS:%{http_code}" \
  -k \
  --silent)

# Extract HTTP status code
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "✅ Response Status: $HTTP_CODE"
echo "📄 Response Body: $BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "================================================================================"
    echo "🎉 SUCCESS! Webhook processed successfully!"
    echo "================================================================================"
    echo ""
    echo "✅ What just happened:"
    echo "   1. ✓ Webhook sent with valid HMAC signature"
    echo "   2. ✓ Backend received and verified the webhook"
    echo "   3. ✓ Refund processed (\$97.19)"
    echo ""
    echo "📋 Next: Verify the results"
    echo ""
    echo "   A. Check backend logs:"
    echo "      docker logs pleero_backend --tail 50 | grep -E 'refund|email|store_credit'"
    echo ""
    echo "   B. Check if email was sent:"
    echo "      docker logs pleero_backend | grep 'email_sent'"
    echo ""
    echo "   C. Query database for the offer:"
    echo "      docker exec 6def0e401482 python -c \\"
    echo "      import asyncio"
    echo "      from sqlalchemy import select"
    echo "      from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession"
    echo "      from sqlalchemy.orm import sessionmaker"
    echo "      from app.models.offer import Offer"
    echo "      from app.core.config import settings"
    echo ""
    echo "      async def check():"
    echo "          engine = create_async_engine(settings.DATABASE_URL, echo=False)"
    echo "          async_session = sessionmaker(engine, class_=AsyncSession)"
    echo "          async with async_session() as session:"
    echo "              result = await session.execute(select(Offer).order_by(Offer.created_at.desc()).limit(1))"
    echo "              offer = result.scalar_one_or_none()"
    echo "              if offer:"
    echo "                  print(f'Latest offer: {offer.id}')"
    echo "                  print(f'Refund amount: {offer.refund_amount}')"
    echo "                  print(f'Bonus amount: {offer.bonus_amount}')"
    echo "                  print(f'Customer email: {offer.customer_email}')"
    echo ""
    echo "      asyncio.run(check())"
    echo "      \""
    echo ""
else
    echo "================================================================================"
    echo "❌ WEBHOOK FAILED (HTTP $HTTP_CODE)"
    echo "================================================================================"
    echo ""
    echo "🔍 Troubleshooting steps:"
    echo ""
    echo "   1. Check if backend is running:"
    echo "      docker ps | grep pleero_backend"
    echo ""
    echo "   2. Check backend logs for errors:"
    echo "      docker logs pleero_backend --tail 100"
    echo ""
    echo "   3. Check if webhook endpoint exists:"
    echo "      curl -k https://api-dev.pleero.app/health"
    echo ""
    echo "   4. Verify HMAC secret matches .env:"
    echo "      grep SHOPIFY_API_SECRET backend/.env"
    echo ""
fi

echo "================================================================================"
