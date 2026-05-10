---
# FILE: docs/02-market-and-competitive.md
---

# Market & Competitive Context

## The problem in numbers

- US retail returns in 2025: $849.9B (NRF + Happy Returns, October 2025)
- Average online return rate 2026: 20.8% (Capital One Shopping / Ringly.io)
- Apparel-specific return rate: 24–30%
- Footwear return rate: 17–35%
- Cost per return to merchant: $25–$30 (shipping + support + product damage) — Narvar 2024
- Contribution margin compression from returns in apparel DTC: 8–15 percentage points
- Loop's own platform benchmark: 60% of returns still resolve as cash refunds

At a $5M GMV apparel brand with 25% return rate and $100 AOV:
- ~12,500 returns/year
- ~7,500 of those become cash refunds (60%)
- Converting 15% of cash-refund-bound returns = ~1,125 retentions × $100 = **$112,500 retained**
- Merchant pays $99/mo = $1,188/year. ROI: ~95× annual subscription cost.

## Competitive landscape

### Loop Returns
- Pricing: $155/mo Essential, $340/mo Advanced (G2, Feb 2025)
- Market position: dominant mid-to-upper-market returns platform
- Weaknesses:
  - Bonus credit (Shop Now) locked to Advanced $340 tier
  - Annual contract required on paid plans
  - Frequent merchant complaints: "took over a month to onboard", "prices exorbitant,
    3× competitors", "shop now bonus credit is hidden on the returns summary page"
  - Peppermayo (App Store review): "all the bells and whistles they sell does NOTHING
    to improve the refund rate"
  - Up-market move in 2025/26 removed $29/mo entry plan — leaves $1M–$10M GMV merchants
    underserved

### ReturnGo
- Pricing: $23–$297/mo
- Better value than Loop for mid-market
- Has store credit offers but no dedicated conversion-moment focus
- Uses Shopify Returns API natively
- Weakness: store credit is one option among many, not optimised

### AfterShip Returns
- Pricing: $11–$239/mo, free plan available
- Strong portal, light incentive features
- Weakness: incentive mechanics are underdeveloped

### Return Prime
- Pricing: $9.99/mo entry
- Popular with smaller stores; not the Pleero ICP

### Shopify Native Returns + Store Credit
- GA since 2024/2025
- `storeCreditAccountCredit` GraphQL mutation is the API Pleero uses
- Gap: native UI does not present a conversion offer at the refund moment;
  it's a merchant-admin tool, not a customer-facing conversion engine

### No direct competitor
No Shopify app in the current App Store is a single-purpose refund-to-credit
conversion interceptor. The closest is Loop's Shop Now feature (buried, Plus-gated)
and WeSupply Labs' 110% policy feature (enterprise, not Shopify-native).

## Why this opportunity exists now

1. Shopify's Store Credit API (2024–2025) made the credit issuance trivial — no
   custom gift-card table, no parallel accounting system.
2. Loop's up-market move opened a clear price gap at $99–$149/mo.
3. Return rate inflation (NRF: up YoY) is making merchants actively search for
   marginal-revenue tools they weren't looking for 24 months ago.
4. California SB 22 (April 2026) is creating compliance awareness — merchants are
   actively reading about store credit rules, which surfaces the opportunity.
5. The Shopify Returns API now allows third-party apps to participate in the native
   refund timeline — this is the technical prerequisite that didn't exist 18 months ago.

## Real merchant pain quotes

> "Returns are the quiet tax on your growth. They hit margin, tie up inventory, spike
> support tickets, and create messy accounting that shows up weeks later."
> — Ecommerce Fastlane, 2026

> "For an apparel brand with $85 AOV and 20% return rate… effective contribution margin
> is 23% lower than gross margin suggests."
> — MHI Growth Engine, Feb 2026

> "We've seen our refunds go from 60% of all our returns down to 40% with Loop."
> — John Maddalone, Baseballism (Loop Series B announcement)
> [Note: this is Loop's own marketing — the 40% floor is still massive revenue leakage]

> "Their prices are exorbitant, 3× their competitors… all the bells and whistles they
> sell does NOTHING to improve the refund rate."
> — Peppermayo, Loop App Store 1-star review
