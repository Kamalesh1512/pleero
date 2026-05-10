---
# FILE: docs/05-global-launch-and-legal.md
---

# Global Launch Strategy & Legal Blockers

## Phased rollout

| Phase | Timing | Markets | Primary reason |
|---|---|---|---|
| Phase 1 | Launch → month 2 | USA only | No federal cash-refund mandate for change-of-mind; Store Credit API native; legal simplest |
| Phase 2 | Month 2–4 | + Australia, Canada, India | Similar legal posture; opt-in design sufficient; English-default |
| Phase 3 | Month 4–6 | + UK, EU (DE, FR, ES, IT min) | Requires EU-Compliant Mode: cash-default UI, multi-language, GDPR sub-processors |
| Phase 4 | Month 6+ | APAC ex-India, LATAM | Evaluate by inbound demand |

Do not rush Phase 3. The EU changes are not difficult but they take real scope to do
correctly. Building them before product-market fit is confirmed is premature.

## Legal rules per region

### United States 🇺🇸

**Federal:** No general right-to-cash-refund for change-of-mind returns. Pleero's
offer is legally straightforward.

**California (highest risk state):**
- Civil Code § 1749.5 as amended by SB 22 (effective April 1, 2026): store credit
  balances below $15 are redeemable in cash on demand.
- Chipotle paid $246K in penalties for violating this in October 2025 (Sonoma/LA/
  Ventura/Shasta DA offices). This statute is actively enforced.
- Pleero's terms must disclose the $15 cash-out right for California customers.
- Implementation: if issued credit < $15, add a "Cash out this credit" link in the
  confirmation email for CA-shipping addresses. This is a template change, not an API change.

**Other states with specific rules:** VT, RI ($0.99 floor), MA, NJ, NY — handle
in merchant-facing terms of service, not application logic.

**Sales tax:** Issuing store credit is not a taxable event. Tax applies when credit
is redeemed against a taxable purchase. Shopify handles this natively. No new nexus.

### European Union 🇪🇺 — PHASE 3 ONLY

- Consumer Rights Directive 2011/83/EU, Article 13(1): trader must refund using the
  same payment method unless the consumer **expressly agrees otherwise**.
- 14-day cooling-off period: cash refund is the legal default. Store credit is opt-in only.
- Refund timeline: within 14 days of customer notification.
- **Pleero EU-Compliant Mode requirements:**
  - Cash refund must be the visually equivalent or larger option (not buried)
  - Consent for store credit must be active (explicit checkbox or button, not pre-selected)
  - The choice must be revocable until credit is redeemed
  - Multi-language offer page (minimum DE, FR, ES, IT)
  - GDPR privacy notice in offer page footer
  - DPA template available for merchant to countersign

Do not ship to EU merchants in Phase 1 or Phase 2.

### United Kingdom 🇬🇧 — PHASE 3 ONLY

- Consumer Rights Act 2015, §20(16): same rule as EU — same payment method unless
  consumer expressly agrees otherwise.
- Consumer Contracts Regulations 2013: 14-day cancellation window.
- Same Phase 3 treatment as EU.

### Australia 🇦🇺 — PHASE 2 OK

- ACCC: store credit as refund is allowed only with agreement from both parties.
- For defective products: consumer chooses refund or replacement — credit cannot be imposed.
- For change-of-mind: no statutory refund right; merchant policy governs.
- Pleero's opt-in design (customer always sees cash option and chooses) satisfies AU law.
- Action required: add "You can still receive a cash refund" to the offer page copy
  (already required by Pleero's copy rules — no extra work).

### Canada 🇨🇦 — PHASE 2 OK

- Provincial consumer protection (Quebec, Ontario, BC) follows voluntary-acceptance
  rules similar to Australia.
- Same opt-in design satisfies requirements.
- French-language requirement for Quebec merchants: add `fr-CA` locale in Phase 2.
  Use ICU message format from day 1 (see engineering principles).

### India 🇮🇳 — PHASE 2 OK

- Consumer Protection (E-Commerce) Rules 2020, Rule 6(3): refunds must be processed
  within 15 days of cancellation/return, credited to the same payment method.
- This applies to defective/non-conforming goods. For change-of-mind, merchant policy governs.
- Pleero must add a "Defective?" detection step — if merchant or customer marks the
  return as defective, suppress the Pleero offer entirely and let the refund process normally.
- GST: issuing store credit is not a taxable supply. GST applies at redemption.

## Cross-cutting compliance rules (apply to all phases)

These are hard rules. Claude Code must enforce them in every build.

1. **Always-cash for defective/damaged returns.** Detect via return reason field.
   If reason is defective/damaged/wrong item sent, show NO offer. Proceed directly
   to standard refund.

2. **Always show the cash option.** Never hide it. Never make it harder to click
   than the credit option (equal tap-target size minimum).

3. **Active consent only.** No pre-selected radio buttons or checkboxes for credit.
   The customer must take an affirmative action to accept credit.

4. **No expiry < 12 months.** Default: no expiry. Expose expiry as a merchant setting
   in v2 with a minimum 12-month floor.

5. **Refund timing fallback.** If the customer rejects the offer, the underlying refund
   must complete on Shopify's normal timeline. Pleero must never delay a refund.

6. **No claims about chargeback rights.** Do not state or imply the customer waives
   chargeback rights by accepting credit. They retain all rights.

## Currency / Shopify Markets

Shopify's `storeCreditAccountCredit` mutation creates currency-specific accounts per
customer. A single customer can hold USD and AUD credit simultaneously.

**Phase 1 simplification:** Pleero operates only on orders where order currency equals
the store's default currency. Skip multi-currency orders entirely (log them, take no action).

**Phase 2:** Read order currency from webhook payload, issue credit in that currency.
Test on AU and CA stores specifically.

## Localization architecture

Use ICU message format from day 1. This is a one-hour setup that makes Phase 3
translation trivially cheap instead of expensive.

- Phase 1: `en-US` only
- Phase 2: `en-AU`, `en-CA`, `en-IN` (minimal copy differences; same template)
- Phase 3: `de-DE`, `fr-FR`, `es-ES`, `it-IT` minimum (real translation work — budget 2 weeks)
