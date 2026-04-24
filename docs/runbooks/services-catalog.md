# Services Catalog — Operational Runbook

**Owner:** Hunter (DSIG)
**Last updated:** 2026-04-24
**Scope:** The `services_catalog` table — the single source of truth for all line items across EST, SOW, INV, RCT, and retainer plans.

> **The three things to know at 2am:**
> 1. **`services_catalog` is the single source of truth.** The legacy TypeScript `CATALOG` in `quote-pricing.ts` still exists as a fallback but is not authoritative. New code reads from the DB. If a service appears in the TS catalog but not the DB, it won't show in the admin pickers.
> 2. **Soft-delete is safe.** `services_catalog.active = false` hides an item from all pickers but preserves historical references on past invoices and SOWs. Never hard-delete a catalog item that has been used on a real document.
> 3. **`included_with_paid_project = true` is the value-stack flag.** Only 3 items should be flagged: Market Research Report, Competitor Analysis, Comprehensive Project Plan. These auto-populate as 100%-discounted lines on every deposit invoice. Check `SELECT * FROM services_catalog WHERE included_with_paid_project = true` before changing these.

---

## Emergency procedures

### A service item disappeared from the invoice/SOW picker

1. Check if the item is still active:
   ```sql
   SELECT id, name, active, pricing_type FROM services_catalog WHERE name ILIKE '%<search>%';
   ```
2. If `active = false`: re-activate via `/admin/services` → Edit → toggle Active → save
3. If item doesn't exist at all: it was hard-deleted or never seeded. Re-add via `/admin/services` → New Service

### Value-stack items showing on courtesy invoices (shouldn't)

The value stack is for deposit invoices (SOW accept), not courtesy/Restaurant Rule invoices. Check the `auto_trigger` column on the invoice:
```sql
SELECT auto_trigger, kind FROM invoices WHERE invoice_number = 'INV-...';
```
- `auto_trigger = 'sow_deposit'` → value stack is correct behavior
- `auto_trigger = 'courtesy'` → should NOT have value stack items. This is a code bug in the courtesy invoice route. Check `/api/admin/quotes/[id]/courtesy-invoice/route.ts`.

### Wrong price on a service item

```sql
UPDATE services_catalog
SET display_price_cents = 95000   -- $950
WHERE id = 'site-social-audit';
```

Then rebuild the catalog snapshot (if used):
```sql
-- Just verify the change
SELECT id, name, display_price_cents FROM services_catalog WHERE id = 'site-social-audit';
```

The sync bridge (`src/lib/services-catalog-sync.ts`) refreshes on every request — no cache invalidation needed.

---

## `services_catalog` table schema

Migration: `014a_services_catalog.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | slug-style: `wordpress-website`, `local-seo`, etc. |
| `name` | text | Display name: "WordPress Website" |
| `description` | text | One-sentence description |
| `benefit` | text | One-sentence benefit statement |
| `category` | text | e.g., `websites`, `demand-gen`, `content`, `ai-services` |
| `pricing_type` | text | `one_time` / `monthly` / `both` |
| `base_range_low_cents` | integer | Low end of one-time range |
| `base_range_high_cents` | integer | High end of one-time range |
| `monthly_range_low_cents` | integer | Low end of monthly range |
| `monthly_range_high_cents` | integer | High end of monthly range |
| `display_price_cents` | integer | **The authoritative price** for invoices/SOW display |
| `included_with_paid_project` | boolean | Value-stack flag (see below) |
| `active` | boolean DEFAULT true | Soft-delete flag |
| `sort_order` | integer | Display order within category |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

## Seed state (as of 2026-04-21)

```sql
SELECT COUNT(*) FROM services_catalog;
-- Expect: 53 rows (after migration 015a)

SELECT category, COUNT(*) FROM services_catalog WHERE active = true GROUP BY category ORDER BY category;
-- Returns breakdown by category

SELECT id, name, display_price_cents, included_with_paid_project
FROM services_catalog WHERE included_with_paid_project = true;
-- Expect 3 rows:
--   project-plan          175000  ($1,750)
--   market-research        75000  ($750)
--   competitor-analysis    75000  ($750)
```

---

## `pricing_type` values explained

| Value | Meaning | Where it appears |
|---|---|---|
| `one_time` | Project fee, no recurring | Quote engine one-time items, SOW Phase 1 deliverables, Invoice line items |
| `monthly` | Recurring monthly | Retainer picker, SOW recurring deliverables, Subscription cycle items |
| `both` | Can be either | Both pickers; admin chooses cadence when adding to SOW/invoice |

**Retainer filtering:** the retainer plan item picker only shows catalog items with `pricing_type IN ('monthly', 'both')`. If a service should be available as a retainer line item, set `pricing_type = 'monthly'` or `'both'`.

---

## Value-stack items

Three items are flagged `included_with_paid_project = true`:

| id | name | display_price_cents |
|---|---|---|
| `project-plan` | Comprehensive Project Plan | 175000 ($1,750) |
| `market-research` | Market Research Report | 75000 ($750) |
| `competitor-analysis` | Competitor Analysis | 75000 ($750) |

**Total value stack: $3,250**

These auto-populate on every SOW deposit invoice (`auto_trigger = 'sow_deposit'`) as line items at full price followed by a "New Client Appreciation" −$3,250 discount line. This creates the 3.17× perceived-value-at-signing psychology.

**To add a 4th value-stack item:**
```sql
UPDATE services_catalog SET included_with_paid_project = true WHERE id = '<id>';
```

**To remove one:**
```sql
UPDATE services_catalog SET included_with_paid_project = false WHERE id = '<id>';
```

The `getValueStackItems()` function in `src/lib/services-catalog.ts` reads this in real-time.

---

## Courtesy items (for unsigned prospects)

Three items are used for the "Send Courtesy" gift-before-ask flow:

| id | display_price_cents | Use |
|---|---|---|
| `site-social-audit` | 95000 ($950) | Default — diagnostic closes hardest |
| `market-research` | 75000 ($750) | Alternative |
| `competitor-analysis` | 75000 ($750) | Alternative |

Admin picks one from the dropdown at `/admin/quotes/[id]` → "Send Courtesy ▸". A $0 invoice is created with that one item at full price + 100% "New Client Appreciation" discount.

---

## Admin CRUD

**Route:** `/admin/services`

- Full table with search + category filter
- Edit modal: all fields
- Value-stack toggle (emerald highlight when `included_with_paid_project = true`)
- New Service: quick-add modal with required fields (id, name, display_price_cents, pricing_type)
- Soft-delete: toggles `active = false` (item hidden from pickers but preserved in history)

**Bulk import:** `/admin/services` → Import tab
- Accepts CSV or JSON (up to 500 rows)
- UPSERT on `id` — existing items updated, new items created
- Per-row validation with status reporting

**API route:** `POST /api/admin/services-catalog/bulk-import`

---

## Catalog picker in forms

**Invoice builder** (`/admin/invoices/new`): type-ahead search across `name` and `description`. Clicking an item adds a line row with `unit_price_cents = display_price_cents`. Admin can change the price per line.

**SOW builder** (`/admin/sow/new`): same catalog picker for each deliverable in a phase. Also shows `pricing_type` and suggested `cadence`.

**Quote engine** (`/quote`): the prospect-facing quote uses the catalog via `src/lib/services-catalog-sync.ts` which maintains a module-scoped snapshot refreshed at startup. This snapshot syncs from the DB periodically. Admin edits appear in the quote within seconds on the next sync.

---

## `services-catalog-sync.ts` — sync bridge

Source: `src/lib/services-catalog-sync.ts`

The `/quote` engine was built against a TypeScript-static `CATALOG` constant. The DB-backed catalog syncs into a module-level snapshot that the static catalog consumer calls synchronously.

```typescript
// On any async entry point (e.g., /api/quote/prices, executeTool, syncProspectFromSession):
await hydrateCatalogSnapshot()  // one-time refresh at entry
// Subsequent sync calls in the same request:
const service = getServiceSync(id)  // from snapshot
```

**Cold-start safety:** if the DB fetch fails, `getServiceSync()` falls back to the legacy TS `CATALOG` constant. No regression risk.

---

## Known service IDs (representative)

```
wordpress-website, react-webapp, mobile-app, vibe-coded-app, ui-ux-design, hosting
local-seo, llm-optimization, geo-targeting, gbp-admin, demand-gen-systems
ai-content-generation, ai-social-mgmt, ai-review-responders, ai-auto-blogging, ai-content-repurposing
ai-adoption-strategy, ai-workforce-automation, ai-infrastructure, ai-outreach, ai-agent-swarms, private-llms, clawbot-setup
project-plan, market-research, competitor-analysis, site-social-audit
```

To see all:
```sql
SELECT id, name, pricing_type, category, active FROM services_catalog ORDER BY category, sort_order;
```

---

## Troubleshooting

### Catalog item shows in DB but not in admin pickers

Check `active`:
```sql
SELECT active FROM services_catalog WHERE id = '<id>';
```
If `false`: toggle it to `true` at `/admin/services` → Edit.

### "CATALOG_VERSION mismatch" warning in Vercel logs

The `CATALOG_VERSION` constant in `quote-pricing.ts` doesn't match the DB's `quote_config.catalog_version` value. This is an informational warning — it doesn't break anything. Update the version:
```sql
UPDATE quote_config SET value = '"2026.04.23-1"'::jsonb WHERE key = 'catalog_version';
```

Then update the TS constant in `src/lib/quote-pricing.ts` to match.

### SOW deliverable prices don't match catalog

SOW deliverable `unit_price_cents` is set at creation time from the catalog picker's `display_price_cents`. If catalog prices changed after the SOW was created, the SOW retains the original prices. This is correct behavior — "SOW stability."

To apply new prices to a draft SOW: delete and re-add the deliverable from the catalog picker.

---

## Cross-references

- `invoicing-phase4-activation.md` (existing) — value-stack activation instructions
- `retainer-bundling.md` — `pricing_type` filter for retainer plan items
- `sow-lifecycle.md` — deliverable picker in SOW creation
- `quote-estimator.md` (existing) — sync bridge for `/quote` engine
