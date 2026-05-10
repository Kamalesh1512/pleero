---
# FILE: docs/README.md
---

# Pleero — Docs Index

This folder is the single source of truth for what we are building, why, and how.
Claude Code must consult the relevant doc before making any architectural, feature, or
scope decision. When in doubt, check here first. When the answer is not here, ask.

## How to use these docs

| If you are deciding about...            | Read this file                    |
|-----------------------------------------|-----------------------------------|
| What the app does / doesn't do          | 01-product-context.md             |
| Who we are building for                 | 03-icp-and-personas.md            |
| Bonus %, copy, offer mechanics          | 04-bonus-strategy.md              |
| A new feature request                   | 01-product-context.md + 07-engineering-principles.md |
| Legal / compliance / region support     | 05-global-launch-and-legal.md     |
| The customer-facing flow / UX           | 06-customer-journey.md            |
| Pricing, plans, billing                 | 08-pricing-and-monetization.md    |
| Competitors / market context            | 02-market-and-competitive.md      |
| Whether to build something              | 07-engineering-principles.md      |

## File list

```
docs/
├── README.md                     ← this file
├── 01-product-context.md         ← vision, scope, anti-features, success metrics
├── 02-market-and-competitive.md  ← TAM, competitors, pain quotes, why now
├── 03-icp-and-personas.md        ← ICP, anti-personas, merchant persona
├── 04-bonus-strategy.md          ← 10%/$50 logic, behavioral rationale, copy rules
├── 05-global-launch-and-legal.md ← phased rollout, per-region legal blockers
├── 06-customer-journey.md        ← flow, trust elements, UX rules
├── 07-engineering-principles.md  ← lean rules, anti-bloat, done definition
└── 08-pricing-and-monetization.md← $99 flat, tier roadmap, churn thresholds
```

## App name
**Pleero** (working name, from Greek πληρώ — "to fulfill / to pay")
Domain: Pleero.app (verify and register before building)

## One-line description
Pleero intercepts Shopify refund events and converts them to store credit at a bonus,
retaining revenue that would otherwise leave the merchant's account permanently.

## Tech stack (non-negotiable)
- **Backend:** Python 3.12 · FastAPI · SQLAlchemy async · Alembic · Celery · uv
- **Frontend:** Next.js 14 App Router · TypeScript · Tailwind · Shopify Polaris + App Bridge 3
- **Database:** PostgreSQL 16 (Docker container, self-hosted)
- **Cache/Queue:** Redis 7 (Docker container, self-hosted)
- **Reverse proxy:** Caddy (auto HTTPS)
- **VPS:** DigitalOcean (all backend services via Docker Compose)
- **Frontend hosting:** Vercel free hobby tier
- **Email:** Resend (transactional)
- **Shopify API version:** 2025-01
- **No:** Supabase, Upstash, Render, Railway, managed DBs of any kind

