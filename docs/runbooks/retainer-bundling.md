# Retainer Bundling — Operational Runbook

**Owner:** Hunter (DSIG)
**Last updated:** 2026-04-24
**Scope:** The `/quote` retainer selection step, the 4 tier definitions, how selections are stored, and how activation creates a subscription row.

> **The three things to know at 2am:**
> 1. **`site_only` does not create a subscription by design.** Site-only is a one-time build, no recurring. `activateRetainer()` is a no-op for site_only — this is intentional.
> 2. **One table, `subscription_plans`, powers everything.** Retainer tiers are rows with `is_retainer = true`. There is no separate retainer_plans table. Admin CRUD is at `/admin/service-plans`.
> 3. **The retainer menu items come from `services_catalog` filtered to `pricing_type IN ('monthly', 'both')`.** If an item isn't showing in the retainer picker, check `pricing_type` on the catalog row.

---

## Emergency procedures

### Retainer tier items not showing in `/quote`

1. Check `subscription_plan_items` for the plan:
   ```sql
   SELECT spi.plan_id, sc.id, sc.name, sc.pricing_type, spi.quantity
   FROM subscription_plan_items spi
   JOIN services_catalog sc ON sc.id = spi.service_id
   WHERE spi.plan_id = (SELECT id FROM subscription_plans WHERE tier = 'growth');
   ```
2. If items exist but `pricing_type` isn't `monthly` or `both`: the filter is excluding them. Fix:
   ```sql
   UPDATE services_catalog SET pricing_type = 'monthly' WHERE id = '<service_id>';
   ```
3. If `subscription_plan_items` is empty for that tier: add items at `/admin/service-plans/[id]`

### Activation fired but no subscription row created

1. Check `quote_sessions.retainer_activated_at` for the session:
   ```sql
   SELECT retainer_activated_at, retainer_subscription_id, selected_plan_id
   FROM quote_sessions WHERE id = '<session_id>';
   ```
2. If `retainer_activated_at` is set but `retainer_subscription_id` is NULL: activation ran but subscription insert failed. Check Vercel logs for `[activateRetainer]` errors.
3. If `selected_plan_id` IS NULL: client never selected a retainer tier (or selected site_only). No subscription is expected.

---

## Retainer tiers

Four tiers seeded in `subscription_plans` by migration 016d:

| Tier slug | Name | `is_retainer` | Notes |
|---|---|---|---|
| `essential` | Essential | true | Entry-level monthly retainer |
| `growth` | Growth | true | Mid-tier |
| `full` | Full | true | Full-service retainer |
| `site_only` | Site Only | true | One-time build, no subscription |

**site_only special behavior:** `activateRetainer()` in `src/lib/retainer.ts` checks `plan.tier === 'site_only'` and returns early without creating a subscription row. The `retainer_activated_at` timestamp is still set on the session to record that activation ran.

---

## How retainer selection is stored

Migration 016c adds to `quote_sessions`:

| Column | Purpose |
|---|---|
| `selected_plan_id` | FK → subscription_plans.id (NULL if none selected) |
| `retainer_custom_items` | JSONB — items added/removed vs plan defaults: `[{ "service_id": "...", "quantity": 2, "included": true }]` |
| `retainer_monthly_cents` | Computed monthly total at save time (for SOW stability — won't drift if catalog prices change later) |
| `retainer_start_date` | When monthly billing begins |
| `retainer_activated_at` | When `activateRetainer()` ran |
| `retainer_subscription_id` | FK → subscriptions.id (set after activation) |
| `retainer_cancelled_at` | If retainer was cancelled post-launch |
| `launched_at` | When admin clicked Mark Launched |

---

## The `/quote` retainer step

In the `/quote` flow (QuotePageClient.tsx), the retainer step appears between `build-scope-done` and the terminal CTA phase. The client sees the 4 tier cards. Selection is saved via:

```
POST /api/quote/session/retainer  (or PATCH session state)
{ selected_plan_id: '<uuid>', retainer_monthly_cents: 80000 }
```

**Non-retainer sessions:** if a client skips the step or closes, `selected_plan_id` stays NULL. These sessions proceed to an SOW without a retainer. `activateRetainer()` is a no-op.

---

## `subscription_plan_items` table

Join table between `subscription_plans` and `services_catalog`. Defines what's included by default in each retainer tier.

Migration: `016b_subscription_plan_items.sql`

```sql
-- See items for all retainer tiers
SELECT sp.tier, sp.name AS plan_name, sc.name AS service_name, spi.quantity
FROM subscription_plan_items spi
JOIN subscription_plans sp ON sp.id = spi.plan_id
JOIN services_catalog sc ON sc.id = spi.service_id
WHERE sp.is_retainer = true
ORDER BY sp.sort_order, sc.name;
```

---

## Activation flow

Trigger: admin clicks **Mark Launched** on `/admin/quotes/[id]`

1. Admin clicks → `POST /api/admin/quotes/[id]/launch`
2. Route calls `activateRetainer(quoteId)` in `src/lib/retainer.ts`
3. `activateRetainer()`:
   - Loads `quote_sessions` row + `selected_plan_id`
   - If no plan or `tier = 'site_only'` → stamps `launched_at`, returns
   - Otherwise: inserts into `subscriptions` with `plan_id`, `prospect_id`, `status = 'active'`, billing interval from plan, `current_period_start = retainer_start_date ?? now()`
   - Updates `quote_sessions.retainer_subscription_id = new_subscription.id`
   - Stamps `retainer_activated_at = now()`

**API route:** `src/app/api/admin/quotes/[id]/launch/route.ts`

**Library:** `src/lib/retainer.ts`

---

## Admin CRUD for retainer plans

Retainer plans are managed at `/admin/service-plans` (this is the current URL — the sidebar shows "Service Plans"). This was previously at `/admin/retainer-plans` before the merge of retainer plans into the main subscription_plans table.

**Creating a new retainer tier:**
1. `/admin/service-plans` → New Plan
2. Set `tier` to one of: `essential` / `growth` / `full` / `site_only`
3. Check the `is_retainer` toggle
4. Add items from the services_catalog picker (filtered to monthly/both pricing types)

**Editing plan items:**
1. `/admin/service-plans/[id]`
2. Add/remove items from the catalog picker
3. Adjust quantities (e.g., 5 blog posts per month)

---

## `SowOngoingServices` in the SOW

When a quote session with a selected retainer flows into an SOW, the SOW includes an `ongoing_services` section showing the retainer tier and its monthly line items.

Type: `SowOngoingServices` in `src/lib/invoice-types.ts`

```typescript
interface SowOngoingServices {
  plan_tier: 'essential' | 'growth' | 'full' | 'site_only'
  plan_name: string
  monthly_total_cents: number
  start_note: string   // e.g. "Activates on launch day"
  items: SowOngoingServiceItem[]
}
```

Builder: `buildSowOngoingServices(quoteId)` in `src/lib/retainer.ts` — populates from `subscription_plan_items` + `retainer_custom_items`.

---

## Troubleshooting

### "site_only doesn't create a subscription" — this is by design

site_only = one-time build, no recurring. `activateRetainer()` returns early. The client is billed via project invoices, not a subscription cycle. See the `tier === 'site_only'` check in `retainer.ts`.

### `retainer_monthly_cents` is stale vs current catalog prices

The `retainer_monthly_cents` on `quote_sessions` is a snapshot taken when the client selected the tier. If catalog prices changed since then, the stored amount reflects the original selection. This is intentional — "SOW stability" means the SOW price doesn't drift after signing.

To re-compute: calculate from current `subscription_plan_items` prices and update:
```sql
-- Get current monthly total for a specific session's selected plan
SELECT SUM(sc.monthly_range_low_cents * spi.quantity) AS recomputed_monthly
FROM subscription_plan_items spi
JOIN services_catalog sc ON sc.id = spi.service_id
WHERE spi.plan_id = (SELECT selected_plan_id FROM quote_sessions WHERE id = '<session_id>');
```

### Migration 016a-d not applied

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'subscription_plans'
  AND column_name = 'is_retainer';
-- If no row: apply APPLY-016-2026-04-21.sql
```

---

## Cross-references

- `services-catalog.md` — how `pricing_type` gates what appears in the retainer picker
- `quote-estimator.md` (existing) — the `/quote` flow where retainer selection happens
- `invoicing-phase4-activation.md` (existing) — activation of the retainer after launch
- `supabase-migrations.md` — how to apply 016a-d if not yet applied
