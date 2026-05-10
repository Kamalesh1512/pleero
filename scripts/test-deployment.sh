#!/bin/bash
# Quick deployment test script
# Run this after starting services to verify everything works

set -e

echo "🧪 Testing Pleero Deployment"
echo "============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0

echo "1️⃣  Checking if all containers are running..."
EXPECTED_CONTAINERS=("pleero_backend_prod" "pleero_caddy_prod" "pleero_postgres_prod" "pleero_redis_prod")
RUNNING_CONTAINERS=$(docker ps --format '{{.Names}}')

for container in "${EXPECTED_CONTAINERS[@]}"; do
    if echo "$RUNNING_CONTAINERS" | grep -q "$container"; then
        echo -e "   ${GREEN}✅ $container is running${NC}"
    else
        echo -e "   ${RED}❌ $container is NOT running${NC}"
        FAILED=1
    fi
done
echo ""

echo "2️⃣  Testing backend health (internal)..."
if docker exec pleero_backend_prod curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Backend responds on http://localhost:8000/health${NC}"
    docker exec pleero_backend_prod curl -s http://localhost:8000/health
else
    echo -e "   ${RED}❌ Backend does not respond${NC}"
    FAILED=1
fi
echo ""

echo "3️⃣  Testing Caddy can reach backend..."
if docker exec pleero_caddy_prod wget -q -O- http://backend:8000/health > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Caddy can reach backend${NC}"
else
    echo -e "   ${RED}❌ Caddy cannot reach backend${NC}"
    FAILED=1
fi
echo ""

echo "4️⃣  Testing external HTTPS access..."
if curl -sf https://api.pleero.app/health > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Backend accessible via https://api.pleero.app/health${NC}"
    curl -s https://api.pleero.app/health
else
    echo -e "   ${RED}❌ Backend NOT accessible via HTTPS${NC}"
    echo -e "   ${YELLOW}   This might be due to:${NC}"
    echo "      - DNS not propagated yet"
    echo "      - Cloudflare not configured"
    echo "      - SSL certificate issue"
    FAILED=1
fi
echo ""

echo "5️⃣  Checking SSL certificates..."
if docker exec pleero_caddy_prod ls /data/origin-cert.pem /data/origin-key.pem > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ SSL certificates mounted correctly${NC}"
else
    echo -e "   ${RED}❌ SSL certificates not found in container${NC}"
    FAILED=1
fi
echo ""

echo "6️⃣  Checking database connectivity..."
if docker exec pleero_backend_prod python -c "import asyncio; from sqlalchemy.ext.asyncio import create_async_engine; from app.core.config import settings; asyncio.run(create_async_engine(settings.DATABASE_URL).connect())" 2>/dev/null; then
    echo -e "   ${GREEN}✅ Backend can connect to database${NC}"
else
    echo -e "   ${YELLOW}⚠️  Could not verify database connection (might be normal)${NC}"
fi
echo ""

echo "7️⃣  Checking Redis connectivity..."
if docker exec pleero_redis_prod redis-cli ping > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Redis is responding${NC}"
else
    echo -e "   ${RED}❌ Redis is not responding${NC}"
    FAILED=1
fi
echo ""

echo "=============================="
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! Deployment is working correctly.${NC}"
    echo ""
    echo "🎉 Your backend is live at: https://api.pleero.app"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some tests failed. See errors above.${NC}"
    echo ""
    echo "📋 Troubleshooting:"
    echo "  - Check logs: docker compose -f docker-compose.production.yml logs"
    echo "  - Run diagnostic: ./scripts/diagnose-deployment.sh"
    echo "  - See DEPLOYMENT_FIXES.md for detailed help"
    echo ""
    exit 1
fi
