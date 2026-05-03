# International clients — tiered support plan

**Status:** TIER 1 SHIPPED 2026-05-04. TIER 2 + TIER 3 deferred.
**Trigger to revisit:** as needed when a client requirement actually hits the gap.
**Related:** migration 046a, src/lib/countries.ts

---

## Background

DSIG works with clients in Thailand, Australia, Mexico, Canada, and other markets. The original schema assumed US-shaped addresses (state DEFAULT 'CA', no country column at all). When Hunter pointed it out 2026-05-04, we tiered the fix into three levels and shipped Tier 1.

## Tier 1 — SHIPPED (2026-05-04, commits forthcoming)

**Scope:** minimum viable international support so non-US prospects don't get auto-tagged California and the country shows up on docs.

**What landed:**
- Migration 046a: `prospects.country` (ISO 3166-1 alpha-2) added with DEFAULT `'US'`. `state` DEFAULT `'CA'` dropped.
- `src/lib/countries.ts`: country code → name map, priority list (US, CA, MX, TH, AU, GB), `countryName()` resolver, `isInternational()` helper, `countriesForPicker()` ordered list.
- `ProspectContactEditor`: country picker, label switches "State"/"ZIP" → "State / region"/"Postal code" when international.
- `prospect-edit-modal`: same country picker. Drops the `maxLength={2}` cap on the state field for international rows so admins can type "Bangkok" or "Queensland" in full.
- Prospect detail page: country line appended to the InfoRow address when non-US.
- Invoice PDF bill-to block: country on its own line, all-caps, only when non-US.
- Magic-link invoice page: same country line treatment.
- All API SELECTs that pull prospect addresses for PDF render now include `country`.
- Public invoice API + ProspectPicker option types updated.

**What we explicitly did NOT touch in Tier 1:**
- Currency stays USD. Per Hunter directive 2026-05-04, international clients pay USD via Stripe; FX is on their side.
- SOW PDF doesn't render addresses — type accepts `country` for forward compatibility, no display change.
- Receipt PDF doesn't render addresses either — no change.

## Tier 2 — DEFERRED (~half-day)

**Scope:** richer international address shape.

**What it would add:**
- `prospects.address_line_2` column (suite/apt/unit). Useful for US clients too — drop the column on every prospect form between `address` and `city`.
- Per-country form layout polish:
  - UK: labels switch to "Postcode" / "County"
  - Canada: "Province" / "Postal code"
  - Mexico: "Estado" / "CP"
  - International default ("State / region" / "Postal code") covers everything else acceptably.
- Optional: state/region picker dropdowns for US (50 states), Canada (provinces), Mexico (estados), Australia (states/territories). Free text for everywhere else. Reduces typo rate.

**Trigger to ship:** a client gives an apartment-number address that doesn't fit on one line. Or volume of UK/Canadian clients warrants the locale-specific labels.

## Tier 3 — DEFERRED (day+)

**Scope:** full international invoicing.

**What it would add:**
- `prospects.currency` column (ISO 4217: USD, CAD, MXN, THB, AUD, GBP, etc.) — defaults USD.
- Invoice/SOW pricing fields stay in the prospect's currency. PDF + magic-link page show the right symbol + locale formatting (€1.234,56 vs $1,234.56).
- Stripe Payment Links created in the prospect's currency (Stripe supports multi-currency on the same account).
- Receipts denominated in the original payment currency (not always USD).
- Locale-aware date format on docs (DD/MM/YYYY for non-US).
- International phone storage: full E.164 with country code derived from `prospect.country`. Currently we store whatever the admin types.
- VAT/GST/tax-registration number column on prospects (UK VAT, Australian ABN, Mexican RFC, etc.) — these need to appear on invoices for clients to claim deductions.

**Trigger to ship:** the first client who asks to be invoiced in their local currency. Or a UK client who needs their VAT number on the invoice for accounting. Until then, USD-only is fine.

**Risk if shipped prematurely:** currency conversion bugs are silent and expensive. Stripe handles the hard part of multi-currency at checkout, but every invoice/SOW/receipt template, every payment-summary calc, every analytics rollup needs to correctly handle "this row is in CAD." Lots of touchpoints, easy to introduce subtle drift.

## Files touched in Tier 1 (for reference)

```
supabase/migrations/046a_prospects_country.sql        — new
supabase/migrations/APPLY-046-2026-05-04.sql          — new
src/lib/countries.ts                                  — new
src/types/database.ts                                 — Prospect.country
src/components/admin/ProspectContactEditor.tsx        — picker + label switch
src/components/admin/prospect-edit-modal.tsx          — picker + label switch
src/components/admin/prospect-picker.tsx              — option type
src/app/admin/prospects/[id]/page.tsx                 — country in address line
src/app/api/admin/prospects/[id]/route.ts             — PATCH allowlist + zod
src/app/api/invoices/public/[number]/route.ts         — SELECT country
src/app/invoice/[number]/[uuid]/page.tsx              — bill-to country line
src/app/api/admin/invoices/[id]/send/route.ts         — render call passes country
src/lib/invoice-send.ts                               — issueInvoice render call
src/lib/invoice-pdf-regenerate.ts                     — render call
src/lib/pdf/invoice.ts                                — InvoiceProspect.country + bill-to render
src/lib/pdf/sow.ts                                    — SowProspect.country (forward compat only)
docs/superpowers/specs/2026-05-04-international-clients-tiers.md  — this file
```

## What does NOT need migration backfill

Existing rows get `country = 'US'` via the column DEFAULT — Hunter's directive ("yes, default existing → US"). No UPDATE needed; the column default applies to existing rows on schema add per Postgres semantics.

State stays whatever it was. Most rows are 'CA' already; new non-US rows entered after the migration won't auto-tag CA because the DEFAULT was dropped.
