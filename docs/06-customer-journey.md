---
# FILE: docs/06-customer-journey.md
---

# Customer Journey

## The canonical flow

```
Customer submits return/refund request
        ↓
[Shopify fires refunds/create webhook OR returns app fires outcome webhook]
        ↓
Pleero receives event → validates merchant is active + plan is paid
        ↓
Is return reason defective/damaged/wrong item?
  YES → Skip. Refund proceeds normally. Log as "bypassed."
  NO  ↓
Is merchant in a Phase 1-only region and customer in EU/UK?
  YES → Skip. Log as "region-blocked."
  NO  ↓
Pleero sends customer branded email with unique offer link (< 60 seconds from event)
        ↓
Customer opens offer page
        ↓
        ├── ACCEPTS CREDIT
        │       ↓
        │   Pleero calls storeCreditAccountCredit mutation
        │   Credit issued (< 30 seconds from click)
        │   Pleero cancels underlying refund via Shopify Admin API
        │   Confirmation email sent ("Your $110 credit is live")
        │   Event logged: accepted, amount retained, customer ID
        │       ↓
        │   +24 hours: "Your $110 is waiting" reminder with product recs
        │   +7 days: second reminder
        │   +30 days: final reminder (80% redemption happens in first 14 days)
        │
        └── DECLINES / NO ACTION
                ↓
            Refund proceeds on Shopify's normal timeline
            Event logged: declined or expired
            No further contact from Pleero
```

## The offer page (exact spec)

This is the most critical UI in the product. Every design decision below is
intentional and backed by the behavioral rationale in 04-bonus-strategy.md.

**Layout (mobile-first, single column):**
```
[Merchant logo — centred, top]

Hi [First Name], your return is approved.

┌─────────────────────────────────────┐
│  KEEP $110 AS STORE CREDIT          │  ← brand colour background
│  Instant. No expiry. Use anytime.   │
│                                     │
│  [Take the $110 credit]  ← large CTA│
└─────────────────────────────────────┘

  or

  I still want a cash refund ($100, 5–7 days)  ← small text link, below fold

[Trust line: "Secured by [Merchant Name] · Questions? [email]"]
```

**Mandatory elements:**
- Merchant logo (pulled from Shopify store settings)
- Customer first name (pulled from order)
- Credit amount in dollars (never just %)
- "No expiry" stated explicitly
- Speed signal ("Instant" or "60 seconds")
- Cash option always visible, always clickable
- Merchant brand colours (pulled from merchant settings in onboarding)

**Forbidden elements:**
- Countdown timer < 24 hours
- "Pleero" branding on the customer-facing page (white-label)
- Any language implying the customer cannot get a cash refund
- Login/account walls before seeing the offer
- More than 2 CTAs (credit accept + cash decline — nothing else)

**Performance requirements:**
- < 100KB initial HTML
- < 1.5s LCP on 4G (Shopify's App Store will test this)
- No tracking pixels on the offer page (GDPR / trust)
- Works without JavaScript (progressive enhancement)

## Post-acceptance follow-up sequence

All emails go through Resend. One hardcoded template per email. No drag-and-drop editor.

| Email | Timing | Subject | Body |
|---|---|---|---|
| Confirmation | Immediate | "Your $[X] credit is live at [Store]" | Credit amount, "shop now" CTA, no-expiry reminder |
| Reminder 1 | +24h | "Your $[X] is still waiting" | 3 product recommendations (top sellers from merchant catalog), credit balance |
| Reminder 2 | +7 days | "Don't forget your $[X] credit" | Same structure, different product picks |
| Reminder 3 | +30 days | "Last nudge: your $[X] credit" | Simpler, text-only feel, credit balance |

After Reminder 3, stop. Do not harass customers who haven't redeemed after 30 days.

**Product recommendations in emails:** Pull 3 bestselling products from Shopify Admin API
(`products` query sorted by `best_selling`). No AI, no personalisation, no collaborative
filtering. Just bestsellers. Ship it.

## Frustration points and how Pleero addresses them

| Customer concern | Pleero's answer |
|---|---|
| "I don't trust this" | Merchant branding only; cash option always visible; no countdown pressure |
| "There's nothing I want right now" | No-expiry credit; product recs in follow-up email (not on offer page) |
| "It'll expire" | "No expiry" stated twice on offer page and in confirmation email |
| "Am I losing my chargeback rights?" | Never mentioned. Customer retains all rights. |
| "This feels like a trap" | Credit issued in < 60 seconds. Balance visible in their account immediately. |
| "The page looks sketchy" | Merchant logo, brand colours, zero "Pleero" branding visible to customer |

## Mobile-first requirements

- 70%+ of return initiations happen on mobile (industry consensus)
- All touch targets minimum 44×44px
- Single-column layout on all viewports
- Sticky "Take the credit" button at bottom on mobile
- No carousels, no modals, no tooltips
- Viewport scaling must not break on older iPhones (test on iPhone SE viewport)
- Apple Pay / Google Pay viewport compatibility (even though Pleero doesn't use payments)

## Architecture decision: intercept before processing, not after

Pleero presents the offer BEFORE the refund is processed (not as a winback email after).

Rationale:
- Loop's own published case studies confirm: the highest-converting moment is between
  return submission and refund processing
- Shopify's refund event fires when the refund is created but before funds are released
  to the customer's payment method — this window is the intercept point
- Post-refund winback emails average ~10% conversion (ConvertCart 2026); at-the-moment
  interception achieves 15–25%+ in best-in-class implementations

**Implementation note:** Shopify's `refunds/create` webhook fires when a refund record
is created. The actual funds transfer to the customer's payment method happens separately.
Pleero uses this gap. The offer must be sent and acted upon before merchant processes the
physical return/restock — in practice this is hours to days of usable window.
