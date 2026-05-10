# Pleero

Shopify app that converts refund requests into store credit at a bonus percentage.

## Project Structure

```
pleero/
├── backend/          # FastAPI backend (Python 3.12)
│   ├── app/
│   │   ├── core/     # Configuration, security, dependencies
│   │   ├── models/   # SQLAlchemy models
│   │   ├── routers/  # FastAPI route handlers
│   │   ├── schemas/  # Pydantic schemas
│   │   ├── services/ # Business logic
│   │   ├── tasks/    # Celery tasks
│   │   └── utils/    # Helper functions
│   ├── alembic/      # Database migrations
│   └── tests/        # Backend tests
├── frontend/         # Next.js 14 frontend (TypeScript)
├── docs/             # Product & engineering documentation
├── docker-compose.yml
└── Caddyfile         # Reverse proxy configuration
```

## Quick Start

### 1. Environment Setup

Copy environment files and fill in credentials:

```bash
# Root environment
cp .env.example .env

# Backend environment
cp .env.example backend/.env

# Frontend environment
cp frontend/.env.local.example frontend/.env.local
```

### 2. Start Development Environment

```bash
# Start all services (Postgres, Redis, Backend, Caddy)
docker-compose up -d

# Backend will be available at http://localhost:8000
```

### 3. Backend Development

```bash
cd backend

# Activate virtual environment
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows

# Run migrations
uv run alembic upgrade head

# Run development server (hot reload)
uv run uvicorn app.main:app --reload

# Run tests
uv run pytest

# Linting & formatting
uv run ruff check .
uv run ruff format .
uv run mypy .
```

### 4. Frontend Development

```bash
cd frontend

# Install dependencies (if not already done)
pnpm install

# Run development server
pnpm dev

# Frontend will be available at http://localhost:3000

# Build for production
pnpm build

# Linting & formatting
pnpm lint
pnpm format
```

## Tech Stack

### Backend
- **Framework:** FastAPI
- **Language:** Python 3.12
- **Package Manager:** uv
- **Database:** PostgreSQL 16 (async via asyncpg)
- **ORM:** SQLAlchemy 2.0 (async)
- **Migrations:** Alembic
- **Cache/Queue:** Redis 7
- **Background Jobs:** Celery
- **Email:** Resend
- **Monitoring:** Sentry

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Package Manager:** pnpm
- **UI Library:** Shopify Polaris
- **Shopify Integration:** App Bridge 3
- **Styling:** Tailwind CSS

### Infrastructure
- **Reverse Proxy:** Caddy (auto-TLS)
- **Container Orchestration:** Docker Compose
- **Deployment:** DigitalOcean VPS (backend), Vercel (frontend)

## Development Workflow

### Day 1 Checklist
- [x] Project scaffold created
- [x] Docker Compose configured
- [x] Backend dependencies installed
- [x] Frontend dependencies installed
- [x] Alembic initialized
- [ ] OAuth flow implementation
- [ ] Basic FastAPI routes setup
- [ ] Shopify app configuration

### Configuration Files

- `shopify.app.toml` - Shopify CLI configuration
- `docker-compose.yml` - Production services
- `docker-compose.override.yml` - Development overrides
- `Caddyfile` - Reverse proxy & TLS
- `backend/alembic.ini` - Database migrations config
- `backend/ruff.toml` - Python linting rules
- `backend/pyproject.toml` - Python dependencies & tools
- `frontend/tailwind.config.ts` - Tailwind configuration
- `frontend/tsconfig.json` - TypeScript configuration

## Documentation

All product and engineering decisions are documented in `/docs`:

- `docs/README.md` - Documentation index
- `docs/01-product-context.md` - Product vision & scope
- `docs/02-market-and-competitive.md` - Market analysis
- `docs/03-icp-and-personas.md` - Target customers
- `docs/04-bonus-strategy.md` - Bonus percentage logic
- `docs/05-global-launch-and-legal.md` - Regional rollout
- `docs/06-customer-journey.md` - User flows
- `docs/07-engineering-principles.md` - Technical guidelines
- `docs/08-pricing-and-monetization.md` - Pricing strategy

## Next Steps

1. Fill in `.env` files with actual credentials
2. Set up Shopify Partner app at https://partners.shopify.com
3. Configure OAuth callback URLs in Shopify Partner Dashboard
4. Implement OAuth flow (Day 1 task)
5. Set up webhook HMAC verification
6. Begin implementing refunds/create webhook handler

## Resources

- [Shopify App Development Docs](https://shopify.dev/docs/apps)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Shopify Polaris](https://polaris.shopify.com/)
