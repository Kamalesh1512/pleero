---
# FILE: docs/08-pricing-and-monetization.md
---

# Pricing & Monetization

## MVP pricing

**$99/month flat. 14-day free trial. No credit card required for trial.**

Single tier only at MVP. Do not add complexity before 20 paying merchants.

## Why flat rate, not rev-share

Rev-share creates three problems for a solo developer at MVP stage:

1. **Accounting complexity:** tracking every store-credit redemption back to the
   originating Pleero conversion event requires a join across multiple webhook timelines.
   That's a feature project, not infrastructure.

2. **Chargeback exposure:** if a customer disputes the original order, the rev-share
   earned must be clawed back. Shopify's Billing API does not support automatic
   clawback on chargeback events. Manual reconciliation is expensive.

3. **Merchant psychology:** mid-market DTC merchants run monthly app cost reviews.
   A predictable $99/mo line item passes review. A variable $99 + 5% of $X usage
   triggers a finance question every month.

Rev-share can be reintroduced at the Scale tier (month 6+) as a hybrid option for
merchants who want a pure pay-for-performance model and are willing to accept usage
metering.

## Why $99, not $49 or $249

**Not $49:** Loop's removal of their $29 entry plan and move to $155 minimum repositions
the market. $49 reads as "cheap tool" in a category where Loop charges $155+.
Mid-market merchants don't evaluate apps by price; they evaluate by ROI clarity.

**Not $249:** closes off the $1M–$5M GMV merchants who are the best early adopters
(less legal scrutiny, faster decision, forgiving of early bugs). Loop's $155 is the
ceiling reference. Stay meaningfully below it.

**$99:** the "I'll install it without a meeting" price point. Klaviyo, Recharge,
Tapcart, Postscript all have entry plans in this range. It's the DTC app ecosystem
sweet spot for a single-purpose tool.

## Tier roadmap

Build tiers in this sequence. Do not build ahead.

| Tier | Price | Offer cap | Add-on features | Build when |
|---|---|---|---|---|
| Starter | $99/mo | 200 offers/mo | Flat 10% bonus, default copy, basic dashboard | MVP launch |
| Pro | $249/mo | 1,000 offers/mo | Tiered % rules, A/B variant, custom copy, SMS, advanced dashboard | Month 2, ≥ 10 paying |
| Scale | $499/mo | 5,000 offers/mo | Multi-store, multi-currency, EU-compliant mode, priority support | Month 4 |
| Enterprise | Custom | Unlimited | Dedicated success manager, custom integrations, SLA | Month 6+, inbound only |

## Annual plan

Introduce at month 3, only after 60-day retention data exists.
Discount: 17% (equivalent to 2 months free). Present as "$990/year" not "$82.50/mo."

## Multi-store pricing

Default: 50% per additional store, capped at 3× single-store price.
Example: 1 store = $99, 2 stores = $148, 3+ stores = $198 (Scale tier kicks in).
Do not build multi-store before month 4.

## Shopify Billing API implementation notes

- Use `AppSubscriptionCreate` GraphQL mutation with `EVERY_30_DAYS` interval
- Always set `trialDays: 14` on initial subscription creation
- Always redirect to the `confirmationUrl` — never skip the billing approval step
- Store the `subscriptionId` against the shop record after confirmation
- Check subscription status on every app load; redirect to billing if status is not ACTIVE
- Per Shopify's revenue share policy (effective Jan 1, 2025): 100% of first $1M gross
  app revenue, 85% above. Don't model this into pricing until it's relevant.

## Churn thresholds and pricing signals

| Signal | Action |
|---|---|
| Trial → paid conversion < 10% | Problem is product or positioning, not price. Talk to churned trials before changing price. |
| Trial → paid conversion > 35% | Possibly underpriced. Test $129 for new signups after month 3. |
| Monthly logo churn > 15% | Retention problem. Fix before adding tiers. |
| Avg retained revenue per merchant ≥ 10× MRR | Strong signal to raise price on new customers. |
| Merchant asks "can I pay annually?" | Trigger to add annual plan (do this by month 3 regardless). |
| > 3 merchants ask for a feature not on the roadmap | Log it. Build it only if the decision framework in 07-engineering-principles.md is satisfied. |

## Free tier decision

No free plan. A free plan:
- Attracts merchants too small for Pleero's ICP
- Creates support burden with zero revenue
- Trains the market to expect free, which complicates the eventual price

The 14-day trial is the acquisition mechanism. Free is not.

## Pain threshold reference

Mid-market DTC merchants start scrutinising their app stack when total monthly app
cost exceeds ~1.5–2% of GMV. At $5M GMV, that's $75K–$100K/year across all apps.
Pleero at $99/mo = $1,188/year — well inside tolerance even for a $1M GMV merchant.