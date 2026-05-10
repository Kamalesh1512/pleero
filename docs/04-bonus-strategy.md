---
# FILE: docs/04-bonus-strategy.md
---

# Bonus % Strategy

## The headline finding (read this first)

The single rigorous public A/B test of bonus credit (ReturnLogic, two 6-month
intervals on Shopify merchants) found a flat 10% bonus produced a 0.36% lift —
statistically negligible. Bonus % alone does not drive conversion.

**What actually drives conversion (in order of impact):**
1. Instant credit issuance — visible balance, available in < 60 seconds
2. Credit-first UI default — make credit the path of least resistance visually
3. Proportional/tiered bonus scaled to cart value (JAXXON: 9% → 18% Shop-Now share
   after switching from $20 flat to tiered % model)
4. The bonus % itself — necessary but not sufficient

This means: nail instant issuance and UI framing before tuning the %.

## MVP default: flat 10%, capped at $50

- **Why 10%:** matches Loop's own Help Center guidance ("offer 10% of your AOV for
  best results") and WeSupply Labs' published policy benchmark
- **Why capped at $50:** past $50 absolute, the bonus cost dominates the math.
  A $500 order getting $50 bonus credit is 10%. A $500 order getting $50 cap is
  also fine — the customer doesn't notice the cap until AOV > $500.
- **Why not 5%:** below behavioral salience. A $2.50 bonus on a $50 refund is invisible.
- **Why not 15–20%:** ICONIC (major AU fashion retailer) ran 110% credit and cut
  it back to 100% in September 2023 — the economics didn't pencil at scale.
  Don't anchor on outlier examples.

## Consumer baseline willingness to accept store credit

- 29% of consumers prefer store credit over cash refund at 0% bonus if delivery is
  instant (Narvar Consumer Report)
- 60% of consumers are open to credit/exchanges if the process is quick and convenient
  (Narvar 8th Annual State of Returns, August 2024, n=1,924)
- 62% of male shoppers prefer immediate store credit with no fee (same report)

These are the pre-existing pools. The bonus is the marginal push for undecided customers.

## Dynamic % ranges for v2 (post-MVP)

| Condition | Bonus % | Cap | Rationale |
|---|---|---|---|
| Cart value < $30 | 15% | $5 | Higher % needed for salience on small carts |
| Cart value $30–$200 | 10% | $50 | Sweet spot — default |
| Cart value > $200 | 7% | $50 | Cost dominates above $50 absolute |
| Repeat customer (≥ 2 orders) | base + 2pp | same cap | Already brand-loyal; cheaper convert |
| First-time buyer | base only | same cap | Trust deficit; don't penalise |
| Return reason: wrong size / didn't fit | base + 5pp | same cap | Highly convertible; they want a swap |
| Return reason: defective / damaged | NO offer | — | Legal requirement; always cash |
| Return reason: changed mind | base only | same cap | Genuine refund-seeker; bonus less effective |

Do not build dynamic % in the MVP. Implement after 20+ paying merchants with acceptance
data. The rules above are the v2 roadmap, not MVP scope.

## Offer page copy rules

These are non-negotiable. Do not let Claude Code generate copy that violates them.

**Headline pattern:** Lead with the higher number in dollars, not the percentage.
- ✅ "Keep $55 in store credit — or get $50 refunded."
- ❌ "Get 10% extra as store credit!"

**Primary CTA:** Large, brand-coloured button. Says the dollar amount.
- ✅ "Take the $55 credit"
- ❌ "Accept offer" / "Choose store credit" / "Claim bonus"

**Secondary CTA:** Small, text-only, below the fold visually.
- ✅ "I still want a cash refund ($50, 5–7 business days)"
- Never hide the cash option — it builds trust and paradoxically increases credit acceptance

**Trust elements (mandatory on every offer page):**
- Merchant logo at top
- "No expiry" badge
- "Applied to your account in 60 seconds" or equivalent speed signal
- "Secured by [Merchant Name]" in footer — not "Powered by Pleero" on the customer page

**Countdown timers:** Only allowed if ≥ 24 hours. Never use < 24h timers — they feel
coercive and hurt trust. Narvar data: 60% of consumers want speed and convenience,
not urgency pressure.

**Banned copy patterns:**
- "Limited time offer" without a real limit
- "This offer expires soon"
- Any language that implies the customer cannot get a cash refund
- Any language that implies the credit is a replacement for legal refund rights

## A/B test plan (post-MVP, weeks 8–16)

Run these sequentially, not simultaneously. Minimum 200 conversions per variant,
14-day run minimum.

1. **Bonus %:** 7% vs 10% vs 13% (same UI, same copy)
2. **Copy framing:** "$55 store credit" vs "Save 10% on next order" vs "Keep $50 + $5 here"
3. **Countdown:** with 48h countdown vs no countdown
4. **Tiered vs flat:** dynamic cart-value-based vs flat 10%

Do not run A/B tests before 20 paying merchants. Sample sizes won't be meaningful.

## Behavioral economics basis

**Loss aversion (Kahneman/Tversky):** customers weigh losing cash ~2× the gain of
bonus credit. A 10% bonus alone does not overcome this asymmetry — which is exactly
what ReturnLogic's null A/B result proves.

**Solution:** pair the bonus with instant gratification (credit available in < 60
seconds) to flip the framing from "I'm losing my cash refund" to "I now have $55
in my account." The endowment effect then works in Pleero's favour — once the credit
is "in" the account, customers are less likely to reverse the decision.

**Anchoring:** show $55 first (the credit), $50 second (the refund). Never reverse
this order. The first number anchors the customer's reference point.
