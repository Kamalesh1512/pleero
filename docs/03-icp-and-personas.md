---
# FILE: docs/03-icp-and-personas.md
---

# ICP & Personas

## Primary ICP

**Apparel and footwear DTC merchants on Shopify**
- GMV band: $2M–$20M annually
- AOV: $50–$150
- Return rate: 20–30%
- Monthly returns volume: 100–500
- Returns workflow: either using AfterShip/ReturnGo/Return Prime (not Loop Advanced),
  OR using Shopify's native returns with no dedicated app
- Shopify plan: Basic, Grow, or Advanced (not Plus required)
- Geography Phase 1: United States only

**Why this exact band:**

Below $2M GMV: $99/mo app is 0.6% of revenue — still fine mathematically, but these
merchants churn more and demand more support. Not the target.

Above $20M GMV: already on Loop Advanced or building custom solutions. Long sales cycle,
contract-driven. Wrong fit for a solo-dev app.

**Category priority:**
1. Women's apparel (highest return rate, size-driven, most convertible)
2. Footwear (size-driven returns, high AOV)
3. Activewear / sportswear
4. Accessories (handbags, eyewear — lower rate but high AOV)

## Secondary ICPs (Phase 2, months 3–6)

- Beauty DTC — bundle/multi-shade orders with bracketing behaviour
- Men's apparel
- Kidswear (parents bracket extensively)
- Outdoor / sports gear

## Anti-personas — do not target

| Segment | Reason to exclude |
|---|---|
| Electronics / gadgets | Defective-rate returns require cash refunds legally; bonus economics fail |
| Supplements / consumables | Return rates 2–5%; no meaningful TAM |
| Furniture / home goods | Heavy reverse logistics; returns are often defective → cash required |
| Luxury > $500 AOV | Store credit perceived as insulting at this price point |
| Shopify Plus B2B | Different buyer, different sales cycle, different contract |
| EU-only merchants | Phase 1 legal risk; defer to Phase 3 |
| Marketplaces / multi-vendor | Money flow doesn't sit in one Shopify account |
| Merchants using Loop Advanced | Already have bonus credit (Shop Now); wrong wedge |

## Primary persona — "Maya"

**Role:** Founder / Head of Operations
**Brand:** Women's apparel DTC, $4M GMV, 24% return rate
**Team:** 3 people. She handles ops, her co-founder handles product, one CS rep handles Gorgias.
**Tech stack:** Shopify Advanced, Klaviyo, Gorgias, Return Prime, AfterShip tracking
**Pain:** Return Prime processes returns fine but 70% resolve as cash refunds. She knows
this but doesn't have time to negotiate Loop's annual contract or learn a new platform.
**Trigger:** Sees a DTC Twitter thread or r/shopify post about recovering refund revenue,
or gets a cold email/DM with a concrete $ retained example.
**Decision criteria:** Can I install it in under 30 minutes? Does it show ROI in week 1?
Is it under $200/mo so I don't need to justify it to my co-founder?
**Red flags that cause churn:** setup takes > 1 hour, the offer page looks generic/unbranded,
dashboard doesn't show $ retained clearly, billing surprises.

## Secondary persona — "Rajan"

**Role:** E-commerce Manager at a mid-market footwear brand
**Brand:** $12M GMV, $130 AOV, 22% return rate — mostly size issues
**Team:** 8 people; dedicated ops, marketing, and CS teams
**Tech stack:** Shopify Plus, Loop Returns Essential, Klaviyo, Gorgias, Postscript
**Pain:** On Loop Essential but can't justify upgrading to Advanced ($340/mo) just for
the Shop Now bonus credit feature. Wants the conversion mechanic without the price jump.
**Trigger:** Reads Loop's changelog, sees Shop Now is Advanced-only, searches for alternatives.
**Decision criteria:** Works alongside Loop (not a replacement), shows measurable lift,
clean reporting to share with CFO, reliable uptime.
