---
# FILE: docs/07-engineering-principles.md
---

# Engineering Principles

One page. Non-negotiable. Every decision runs through these.

## The 10 rules

**1. Ship the boring path first.**
Webhook in → store credit out. No optimisation, no abstraction, no "future flexibility."
If the boring path works, ship it. Improve it after merchants tell you it's broken.

**2. One service, one database.**
FastAPI + Next.js + Postgres on one DigitalOcean droplet. No microservices. No Redis
until a queue is provably breaking under load. No Kafka. Never.

**3. Shopify is the source of truth.**
Do not duplicate order, customer, or product data in Pleero's database. Pull from
Shopify Admin API on demand. Cache aggressively (5-minute TTL max). Store only
Pleero-specific data: offer events, acceptance/rejection, credit issuance records.

**4. No background jobs except webhook retry.**
If Shopify's webhook fails, retry with exponential backoff (3 attempts: 30s, 5m, 30m).
Everything else is synchronous. No Celery until you have a concrete timeout problem.

**5. Logs beat tests at MVP scale.**
Structured JSON logs with request_id, merchant_id, event_type, outcome on every request.
30-day retention. One E2E integration test (webhook → credit issued). Unit-test the
bonus calculation and the storeCreditAccountCredit mutation builder only.
Total test budget: < 300 lines.

**6. Error handling = log loudly + notify me.**
Every external call (Shopify, Postgres, Resend) wrapped in try/except. On failure:
log with full context, send a Sentry alert, and fall back gracefully. Customer-facing
fallback: "Something went wrong — your refund will proceed as normal." Never show a
stack trace. Never leave a customer in limbo.

**7. Security minimum bar — no shortcuts.**
- Verify Shopify webhook HMAC on every single webhook endpoint. No exceptions.
- Store per-merchant access tokens encrypted at rest (Fernet symmetric encryption, key in env var).
- HTTPS only (Caddy auto-TLS, configured on day 1).
- Never log access tokens, credit card data, or PII beyond first name + hashed email.
- Never expose Postgres or Redis ports outside the Docker network.

**8. No framework debates.**
- Python backend: FastAPI. Not Flask, not Django.
- Frontend: Next.js 14 App Router. Not Remix, not SvelteKit.
- Styling: Tailwind + Shadcn. Not custom CSS, not MUI.
- Database ORM: SQLAlchemy async. Not Tortoise, not raw psycopg2.
- Email: Resend SDK. Not nodemailer, not SMTP directly.

**9. No premature observability.**
Sentry free tier for errors. DigitalOcean dashboard for uptime. Better Stack for
status page (required for App Store). Nothing else until month 3 and > $10K MRR.

**10. Internationalisation from day 1, but cheap.**
Use ICU message format for all customer-facing copy. This is a one-hour setup.
Do not hardcode English strings in component JSX. It makes Phase 3 (EU/multilingual)
cost 2 days instead of 2 weeks.

## Anti-bloat checklist

Before adding any feature, run this check. If any answer is NO, don't build it now.

- [ ] Has at least 3 paying merchants asked for this unprompted?
- [ ] Does it preserve the single-purpose thesis (refund → credit at decision moment)?
- [ ] Does it fit in a single PR under 500 LOC?
- [ ] Does it require zero new dependencies?

If any check fails → add to "v2 someday" list. Do not negotiate.

## Things Claude Code must refuse to build in MVP

- ❌ Storefront widget / theme app extension (offer is a hosted page only)
- ❌ Custom email template editor (one hardcoded template)
- ❌ Real-time WebSocket updates
- ❌ Multi-tenant role/permission system (one merchant = one admin)
- ❌ Analytics dashboard beyond offers shown/accepted/rejected/$ retained
- ❌ Fraud detection or serial-returner blocklists
- ❌ Exchange flow (credit or cash only)
- ❌ Multi-language before EU launch
- ❌ A/B testing infrastructure
- ❌ AI/ML recommendations or personalisation
- ❌ Mobile app
- ❌ Zapier / webhook-out integrations
- ❌ Custom domain for offer pages (use Pleero.app/offers/[token])

## "Done" definition for MVP

Ship only when all of these are true:

- [ ] Merchant installs from an unlisted Shopify App Store link, completes OAuth in < 5 minutes
- [ ] Merchant sets bonus % and cap on a settings page
- [ ] Refund webhook arrives → customer receives offer email in < 60 seconds
- [ ] Customer opens offer page → accepts or declines → outcome is processed correctly
- [ ] Accept → store credit issued via Shopify mutation + refund cancelled
- [ ] Decline → refund proceeds on Shopify's normal timeline without Pleero interference
- [ ] Merchant dashboard shows: offers shown / accepted / rejected / $ retained this month
- [ ] Offer page is branded with merchant logo and colours
- [ ] Full flow tested end-to-end on 2 test stores (one US, one non-US to verify bypass logic)
- [ ] Shopify Billing active ($99/mo recurring charge, 14-day trial)
- [ ] Privacy policy, Terms of Service, and California SB 22 disclosure in place
- [ ] Error monitoring (Sentry) and uptime page (Better Stack) live
- [ ] Zero customer-visible Pleero branding on the offer page

## Code quality minimums

| Area | Requirement |
|---|---|
| Type hints | Python: full type hints on all functions. TypeScript: strict mode. |
| Linting | ruff + black (Python), eslint + prettier (Next.js). Pre-commit hooks. |
| HMAC verification | On every Shopify webhook endpoint. Enforced via FastAPI dependency. |
| DB migrations | Alembic, forward-only (no down migrations in MVP). |
| Async | All FastAPI routes and DB calls must be async. No blocking I/O. Use httpx, not requests. |
| Logging | structlog, JSON output, request_id on every log line. Never use print(). |
| Secrets | All secrets in environment variables. Never in DB. Never in code. Never in logs. |
