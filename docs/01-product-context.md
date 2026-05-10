---
# FILE: docs/01-product-context.md
---

# Product Context

## What Pleero is

A single-purpose Shopify app that intercepts the moment a customer initiates a refund
and presents a branded, one-click offer to take store credit at a 10% bonus instead.
The customer accepts or declines. If they accept, store credit is issued in under 60
seconds and the refund is cancelled. If they decline, the refund proceeds normally.

That is the entire product.

## Core problem

When a refund is processed, the merchant loses 100% of that revenue plus the original
CAC spent acquiring the customer. Apparel/footwear DTC brands at $1M–$20M GMV run
20–30% return rates. At a $100 AOV and 25% return rate, a $5M GMV brand is processing
~$1.25M in refunds per year. Converting even 15–20% of those to store credit retains
$187K–$250K in revenue annually — money that was otherwise gone.

Existing returns apps (Loop, ReturnGo, AfterShip) manage the returns workflow but do
not specialise in the refund-conversion moment. They treat store credit as one option
among many. Pleero makes store credit conversion the entire product.

## What Pleero is NOT

These are hard constraints. Do not build these in the MVP. Do not accept merchant
requests to add them unless the decision framework in 07-engineering-principles.md
is satisfied.

- ❌ A returns management platform (no RMAs, no label generation, no carrier integration)
- ❌ An exchange flow (customer wants credit or cash; that's it)
- ❌ A fraud detection tool (no serial-returner blocklists, no rule engines)
- ❌ A loyalty or cashback platform
- ❌ A storefront widget or PDP integration
- ❌ A multi-warehouse or 3PL integration
- ❌ A returns analytics dashboard beyond the single conversion funnel
- ❌ An email marketing tool (one transactional template, hardcoded)
- ❌ A competitor to Loop or ReturnGo (it complements both; never replace them)

## Solution architecture in plain language

1. Merchant installs Pleero from Shopify App Store, completes OAuth, sets bonus % and cap.
2. Shopify fires `refunds/create` webhook to Pleero when a refund event occurs.
3. Pleero sends the customer a branded email (and optionally SMS) with a unique offer link.
4. Customer opens a hosted offer page: "Take $110 credit now, or receive $100 refund."
5. Accept → Pleero calls `storeCreditAccountCredit` GraphQL mutation → credit issued.
6. Accept → Pleero cancels the underlying refund via Shopify Admin API.
7. Reject → Pleero does nothing; refund proceeds on Shopify's normal timeline.
8. All outcomes are logged to the merchant dashboard.

## Phase 1 scope (MVP, days 1–10)

- US merchants only
- Single bonus tier: flat 10%, capped at $50
- Email offer only (no SMS in MVP)
- Hosted offer page (no storefront widget)
- Single hardcoded email template (merchant colors injected)
- Basic merchant dashboard: offers shown / accepted / rejected / $ retained
- $99/month Shopify Billing, 14-day trial

## Success metrics (60 days post-launch)

| Metric | Floor (stop signal) | Target | Stretch |
|---|---|---|---|
| Offer acceptance rate | < 8% | ≥ 15% | > 25% |
| Paying merchants (day 30) | < 5 | ≥ 15 | > 30 |
| Logo churn (month 2) | > 20% | < 15% | < 8% |
| Avg retained revenue per accepted offer | < $20 | ≥ $40 | > $70 |
| Trial → paid conversion | < 10% | ≥ 20% | > 35% |

If acceptance rate is below 8% at day 30, stop adding features and talk to 20 merchants
before writing more code. The problem is positioning or UX, not functionality.

## What makes this defensible

- Sits at the highest-intent moment in the customer lifecycle (the refund decision)
- Instant credit issuance via Shopify's native Store Credit API creates a trust signal
  competitors can't easily match (they don't own that moment)
- Revenue-retention framing ("you retained $X this month") is stickier than cost framing
- Works as a layer on top of Loop/ReturnGo — doesn't require merchants to switch apps
- Per-merchant conversion data compounds into optimised defaults over time
