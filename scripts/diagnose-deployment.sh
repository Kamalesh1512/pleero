#!/bin/bash
# Pleero Deployment Diagnostic Script
# Run this on your DigitalOcean VPS to diagnose deployment issues

set -e

echo "🔍 Pleero Deployment Diagnostics"
echo "================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "docker-compose.production.yml" ]; then
    echo -e "${RED}❌ Error: docker-compose.production.yml not found${NC}"
    echo "Please run this script from /home/pleero/app"
    exit 1
fi

echo "📋 Container Status:"
echo "-------------------"
docker compose -f docker-compose.production.yml ps
echo ""

echo "🏃 Running Containers:"
echo "--------------------"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "🔍 Checking Backend:"
echo "------------------"
if docker ps | grep -q "pleero_backend_prod"; then
    echo -e "${GREEN}✅ Backend container is running${NC}"

    # Check backend health internally
    if docker exec pleero_backend_prod curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend health check passes internally${NC}"
    else
        echo -e "${RED}❌ Backend health check fails internally${NC}"
        echo "Last 20 lines of backend logs:"
        docker logs pleero_backend_prod --tail=20
    fi
else
    echo -e "${RED}❌ Backend container is NOT running${NC}"
    echo "Last 20 lines of backend logs:"
    docker logs pleero_backend_prod --tail=20 2>/dev/null || echo "No logs available"
fi
echo ""

echo "🔍 Checking Caddy:"
echo "----------------"
if docker ps | grep -q "pleero_caddy_prod"; then
    echo -e "${GREEN}✅ Caddy container is running${NC}"

    # Check if Caddy can reach backend
    if docker exec pleero_caddy_prod wget -q -O- http://backend:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Caddy can reach backend${NC}"
    else
        echo -e "${RED}❌ Caddy cannot reach backend${NC}"
    fi
else
    echo -e "${RED}❌ Caddy container is NOT running${NC}"
    echo "Last 20 lines of caddy logs:"
    docker logs pleero_caddy_prod --tail=20 2>/dev/null || echo "No logs available"
fi
echo ""

echo "🔍 Checking PostgreSQL:"
echo "---------------------"
if docker ps | grep -q "pleero_postgres_prod"; then
    echo -e "${GREEN}✅ PostgreSQL container is running${NC}"

    # Check if healthy
    if docker compose -f docker-compose.production.yml ps postgres | grep -q "healthy"; then
        echo -e "${GREEN}✅ PostgreSQL is healthy${NC}"
    else
        echo -e "${YELLOW}⚠️  PostgreSQL may not be healthy yet${NC}"
    fi
else
    echo -e "${RED}❌ PostgreSQL container is NOT running${NC}"
fi
echo ""

echo "🔍 Checking Redis:"
echo "----------------"
if docker ps | grep -q "pleero_redis_prod"; then
    echo -e "${GREEN}✅ Redis container is running${NC}"

    # Check if healthy
    if docker compose -f docker-compose.production.yml ps redis | grep -q "healthy"; then
        echo -e "${GREEN}✅ Redis is healthy${NC}"
    else
        echo -e "${YELLOW}⚠️  Redis may not be healthy yet${NC}"
    fi
else
    echo -e "${RED}❌ Redis container is NOT running${NC}"
fi
echo ""

echo "🌐 Network Tests:"
echo "----------------"

# Test backend directly
if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend responds on localhost:8000${NC}"
else
    echo -e "${RED}❌ Backend does not respond on localhost:8000${NC}"
fi

# Test via Caddy HTTPS
if curl -sf https://api.pleero.app/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend accessible via https://api.pleero.app${NC}"
else
    echo -e "${RED}❌ Backend NOT accessible via https://api.pleero.app${NC}"
    echo "This could be due to:"
    echo "  - Caddy not running"
    echo "  - SSL certificate issues"
    echo "  - DNS not configured"
    echo "  - Cloudflare not proxying correctly"
fi
echo ""

echo "🔍 Environment Variables:"
echo "-----------------------"
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    echo "Variables defined:"
    grep -v "PASSWORD\|SECRET\|KEY" .env | cut -d= -f1 || echo "  (all variables contain secrets)"
else
    echo -e "${RED}❌ .env file missing${NC}"
fi
echo ""

echo "🔍 SSL Certificates (for Caddy):"
echo "-------------------------------"
if [ -d "caddy_data_prod/_data" ]; then
    if [ -f "caddy_data_prod/_data/origin-cert.pem" ] && [ -f "caddy_data_prod/_data/origin-key.pem" ]; then
        echo -e "${GREEN}✅ Cloudflare origin certificates found${NC}"
    else
        echo -e "${YELLOW}⚠️  Cloudflare origin certificates NOT found${NC}"
        echo "Caddy will try to use Let's Encrypt (may not work with Cloudflare Full Strict)"
    fi
else
    echo -e "${YELLOW}⚠️  Caddy data directory not found${NC}"
fi
echo ""

echo "📊 Resource Usage:"
echo "-----------------"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
echo ""

echo "🔧 Quick Fixes:"
echo "--------------"
echo "If containers are not running, try:"
echo "  cd /home/pleero/app"
echo "  docker compose -f docker-compose.production.yml up -d"
echo ""
echo "To view live logs:"
echo "  docker compose -f docker-compose.production.yml logs -f"
echo ""
echo "To restart all services:"
echo "  docker compose -f docker-compose.production.yml restart"
echo ""
echo "To rebuild and restart:"
echo "  docker compose -f docker-compose.production.yml pull"
echo "  docker compose -f docker-compose.production.yml up -d --force-recreate"
echo ""

echo "✅ Diagnostic complete!"
