#!/bin/bash

# Bulk webhook simulation for all 6 test customers
# Fires REFUNDS_CREATE for each customer, then prints all offer tokens for screenshot capture

WEBHOOK_URL="${WEBHOOK_URL:-https://api-dev.pleero.app/webhooks/refunds/create}"
SHOP_DOMAIN="${SHOP_DOMAIN:-e-comm-dev-store.myshopify.com}"
SHOPIFY_SECRET="${SHOPIFY_API_SECRET:?Set SHOPIFY_API_SECRET env var (from backend/.env) before running this script}"

send_webhook() {
  local CUSTOMER_NAME="$1"
  local REFUND_ID="$2"
  local ORDER_ID="$3"
  local ORDER_NAME="$4"
  local CUSTOMER_ID="$5"
  local EMAIL="$6"
  local FIRST_NAME="$7"
  local LAST_NAME="$8"
  local SUBTOTAL="$9"

  PAYLOAD=$(cat <<EOF
{
  "id": $REFUND_ID,
  "order_id": $ORDER_ID,
  "created_at": "2026-05-20T08:00:00Z",
  "note": "Customer requested refund",
  "user_id": 87654321,
  "processed_at": "2026-05-20T08:00:00Z",
  "restock": true,
  "refund_line_items": [
    {
      "id": ${REFUND_ID}01,
      "line_item_id": ${ORDER_ID}01,
      "quantity": 1,
      "subtotal": "$SUBTOTAL",
      "total_tax": "0.00",
      "return_reason": "Customer changed mind"
    }
  ],
  "transactions": [
    {
      "id": ${REFUND_ID}99,
      "order_id": $ORDER_ID,
      "kind": "refund",
      "gateway": "shopify_payments",
      "status": "success",
      "amount": "$SUBTOTAL",
      "currency": "USD"
    }
  ],
  "order": {
    "id": $ORDER_ID,
    "name": "$ORDER_NAME",
    "customer": {
      "id": $CUSTOMER_ID,
      "email": "$EMAIL",
      "first_name": "$FIRST_NAME",
      "last_name": "$LAST_NAME",
      "default_address": {
        "country_code": "US",
        "country": "United States"
      }
    }
  }
}
EOF
)

  HMAC=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SHOPIFY_SECRET" -binary | base64)

  RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -H "X-Shopify-Topic: refunds/create" \
    -H "X-Shopify-Hmac-SHA256: $HMAC" \
    -H "X-Shopify-Shop-Domain: $SHOP_DOMAIN" \
    -H "X-Shopify-API-Version: 2026-04" \
    -H "X-Shopify-Webhook-Id: test-$(date +%s)-$REFUND_ID" \
    -d "$PAYLOAD" \
    -w "\n__STATUS__:%{http_code}" \
    -k)

  HTTP_CODE=$(echo "$RESPONSE" | grep "__STATUS__" | cut -d':' -f2)
  BODY=$(echo "$RESPONSE" | sed '/__STATUS__/d')

  if [ "$HTTP_CODE" = "200" ]; then
    echo "  ✓ $CUSTOMER_NAME — HTTP $HTTP_CODE — $BODY"
  else
    echo "  ✗ $CUSTOMER_NAME — HTTP $HTTP_CODE — $BODY"
  fi
}

echo "========================================================"
echo "  Pleero — Bulk Webhook Simulation (6 customers)"
echo "========================================================"
echo ""
echo "Sending REFUNDS_CREATE webhooks..."
echo ""

# Customer 1: Karthik Raj — $120.00
send_webhook "Karthik Raj"       3026000001 55203026001 "#2001" 24474675478896 "kamalesh97indie@gmail.com"       "Karthik"      "Raj"      "120.00"

# Customer 2: Mahadevappa Kamalesh — $85.00
send_webhook "Mahadevappa K"     3026000002 55203026002 "#2002" 24474681573744 "kamalesh151297@gmail.com"        "Mahadevappa"  "Kamalesh" "85.00"

# Customer 3: Kamalesh M — $95.00
send_webhook "Kamalesh M"        3026000003 55203026003 "#2003" 24469822407024 "kmgowda1512@gmail.com"           "Kamalesh"     "M"        "95.00"

# Customer 4: Karine Ruby — $150.00
send_webhook "Karine Ruby"       3026000004 55203026004 "#2004" 23793523261808 "bootstraphubworkspace@gmail.com" "Karine"       "Ruby"     "150.00"

# Customer 5: Russell Winfield — $75.00 (example.com — offer created, email not delivered)
send_webhook "Russell Winfield"  3026000005 55203026005 "#2005" 23793523294576 "Russel.winfield@example.com"     "Russell"      "Winfield" "75.00"

# Customer 6: Padma N S — $110.00
send_webhook "Padma N S"         3026000006 55203026006 "#2006" 23793523327344 "nspadma750@gmail.com"            "Padma"        "N S"      "110.00"

echo ""
echo "========================================================"
echo "  Fetching offer tokens from database..."
echo "========================================================"
echo ""

# Print all new offer tokens created from this batch
docker exec pleero_postgres psql -U pleero_user -d pleero -c \
  "SELECT customer_first_name || ' ' || SUBSTRING(customer_email FROM 1 FOR 20) AS customer,
          offer_token,
          credit_amount_cents / 100.0 AS credit_usd,
          status
   FROM offers
   WHERE shopify_refund_id IN ('3026000001','3026000002','3026000003','3026000004','3026000005','3026000006')
   ORDER BY created_at ASC;" 2>/dev/null

echo ""
echo "========================================================"
echo "  Offer page URLs (open each in browser — mobile 375×667)"
echo "========================================================"
echo ""

docker exec pleero_postgres psql -t -A -U pleero_user -d pleero -c \
  "SELECT 'https://pleero.app/offers/' || offer_token || '  (' || customer_first_name || ')'
   FROM offers
   WHERE shopify_refund_id IN ('3026000001','3026000002','3026000003','3026000004','3026000005','3026000006')
   ORDER BY created_at ASC;" 2>/dev/null

echo ""
echo "Note: Russell Winfield (example.com) will have an offer but no email delivered."
echo "      Accept 4-5 offers to get realistic dashboard data for screenshots."
echo "========================================================"
