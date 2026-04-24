# Retainer Bundling Implementation Plan

**Status:** SHIPPED 2026-04-21 · DEPLOYED
**Commit range:** various (retainer bundling sprint)
**See also:** `docs/runbooks/retainer-bundling.md`, `docs/superpowers/specs/2026-04-21-retainer-bundling-design.md`
**Notes:** All 4 retainer tiers (Essential/Growth/Full/Site-only) are seeded in `subscription_plans`. The `/quote` retainer step is live. `activateRetainer()` creates subscription rows on Mark Launched. `site_only` is intentionally a no-op for subscription creation.

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a required retainer-selection step to `/quote` so build + retainer are sold on one signature; activate the retainer at project launch.

**Architecture:** Reuse existing `subscription_plans` + `subscriptions` + `services_catalog` tables. Add one new join table (`subscription_plan_items`) and extend `quote_sessions` with retainer columns. Retainer menu items are filtered rows of `services_catalog` with `pricing_type IN ('monthly','both')`. On launch activation, a `subscriptions` row is created from the quote's selected plan + custom items.

**Tech Stack:** Next.js 16 App Router, Supabase/Postgres, React 19, TypeScript, Tailwind CSS v4. Existing patterns: RLS + `is_admin()`, `_cents` money columns, service-role API routes for public reads.

---

## Data Model Summary

| Table | Status | Purpose |
|---|---|---|
| `subscription_plans` | **Extend** (add `tier`, `is_retainer`, `sort_order`) | The 4 retainer tiers: Essential / Growth / Full / Site-only |
| `services_catalog` | **Reuse as-is** | Retainer menu items = rows where `pricing_type IN ('monthly','both')` |
| `subscription_plan_items` | **New** | Join table: which `services_catalog` items are included in each retainer tier |
| `quote_sessions` | **Extend** (retainer fields) | Stores the prospect's picked tier + custom diffs + activation refs |
| `subscriptions` | **Reuse as-is** | Created at launch activation |

---

## File Structure

### New files

- `supabase/migrations/016a_retainer_plans_extend.sql` — extend `subscription_plans`
- `supabase/migrations/016b_subscription_plan_items.sql` — new join table
- `supabase/migrations/016c_quote_sessions_retainer.sql` — extend `quote_sessions`
- `supabase/migrations/016d_retainer_seed.sql` — seed the 4 tiers + default items
- `src/lib/retainer.ts` — server-side helpers: `getRetainerPlans()`, `getRetainerMenu()`, `computeMonthlyTotal()`, `activateRetainer()`
- `src/app/api/quote/retainer/route.ts` — PATCH endpoint: prospect picks tier, saves to `quote_sessions`
- `src/app/api/admin/retainer-plans/route.ts` — admin CRUD for plans
- `src/app/api/admin/retainer-plans/[id]/route.ts` — admin update/delete one plan
- `src/app/api/admin/retainer-plans/[id]/items/route.ts` — admin manage plan↔items join rows
- `src/app/api/admin/quotes/[id]/launch/route.ts` — admin "Mark Launched" → activates retainer
- `src/app/admin/retainer-plans/page.tsx` — admin list + edit UI (4 tiers)
- `src/app/admin/retainer-plans/[id]/page.tsx` — per-plan editor (name, price, included items)
- `src/components/quote/RetainerStep.tsx` — client component: 4 tier cards + customize drawer
- `src/components/quote/RetainerCard.tsx` — individual tier card
- `src/components/quote/RetainerCustomizeDrawer.tsx` — menu toggle UI
- `src/components/admin/RetainerPanel.tsx` — read-only retainer block on `/admin/quotes/[id]`
- `tests/retainer.test.ts` — unit tests for `src/lib/retainer.ts`

### Modified files

- `src/app/quote/QuotePageClient.tsx` — insert `RetainerStep` after build scope, before contact info
- `src/app/admin/quotes/[id]/page.tsx` — add `RetainerPanel` + "Mark Launched" button
- `src/lib/sow.ts` (if exists, else inline SOW generator) — add "Ongoing Services" section
- `src/components/layout/Header.tsx` / admin sidebar — add "Retainer Plans" nav link
- `CLAUDE.md` — document new retainer flow

---

## Task 1: Database — Extend `subscription_plans`

**Files:**
- Create: `supabase/migrations/016a_retainer_plans_extend.sql`

- [ ] **Step 1: Write migration**

```sql
-- 016a: Extend subscription_plans with retainer-specific columns.
-- Existing subscription_plans rows (if any) get is_retainer=false, tier=null.

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS tier text,
  ADD COLUMN IF NOT EXISTS is_retainer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_tier_check;

ALTER TABLE subscription_plans
  ADD CONSTRAINT subscription_plans_tier_check
  CHECK (tier IS NULL OR tier IN ('essential','growth','full','site_only'));

CREATE INDEX IF NOT EXISTS idx_subscription_plans_retainer
  ON subscription_plans (is_retainer, sort_order)
  WHERE is_retainer = true;
```

- [ ] **Step 2: Apply migration**

Run via Supabase SQL Editor (existing project workflow — see APPLY-015-2026-04-21.sql pattern).

Verify:
```sql
\d subscription_plans
```
Expected: 3 new columns visible, constraint present.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/016a_retainer_plans_extend.sql
git commit -m "feat(retainer): extend subscription_plans with tier + is_retainer"
```

---

## Task 2: Database — Create `subscription_plan_items` join table

**Files:**
- Create: `supabase/migrations/016b_subscription_plan_items.sql`

- [ ] **Step 1: Write migration**

```sql
-- 016b: Join table — which services_catalog items are included by default in each subscription plan.
-- Used for retainer tiers. Quantity supports "5 blog posts" style services.

CREATE TABLE IF NOT EXISTS subscription_plan_items (
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  service_id text NOT NULL REFERENCES services_catalog(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_plan_items_plan
  ON subscription_plan_items (plan_id);

ALTER TABLE subscription_plan_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read subscription_plan_items" ON subscription_plan_items;
DROP POLICY IF EXISTS "Admins write subscription_plan_items" ON subscription_plan_items;

CREATE POLICY "Admins read subscription_plan_items" ON subscription_plan_items
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins write subscription_plan_items" ON subscription_plan_items
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

REVOKE ALL ON subscription_plan_items FROM anon;
```

- [ ] **Step 2: Apply migration + verify**

Run via Supabase SQL Editor. Verify:
```sql
SELECT COUNT(*) FROM subscription_plan_items; -- expect 0
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/016b_subscription_plan_items.sql
git commit -m "feat(retainer): subscription_plan_items join table"
```

---

## Task 3: Database — Extend `quote_sessions` with retainer fields

**Files:**
- Create: `supabase/migrations/016c_quote_sessions_retainer.sql`

- [ ] **Step 1: Write migration**

```sql
-- 016c: Retainer fields on quote_sessions. One retainer per quote session.
-- custom_items is a JSONB diff vs the plan's default items:
--   [{ "service_id": "social-mgmt", "quantity": 2, "included": true }, ...]
-- monthly_cents is computed at save time for SOW stability.

ALTER TABLE quote_sessions
  ADD COLUMN IF NOT EXISTS selected_plan_id uuid REFERENCES subscription_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS retainer_custom_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS retainer_monthly_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retainer_start_date date,
  ADD COLUMN IF NOT EXISTS retainer_activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS retainer_subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS retainer_cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS launched_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_quote_sessions_launched
  ON quote_sessions (launched_at)
  WHERE launched_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quote_sessions_retainer_pending
  ON quote_sessions (selected_plan_id)
  WHERE selected_plan_id IS NOT NULL
    AND retainer_activated_at IS NULL
    AND retainer_cancelled_at IS NULL;
```

- [ ] **Step 2: Apply migration + verify**

```sql
\d quote_sessions
```
Expected: 7 new retainer columns visible.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/016c_quote_sessions_retainer.sql
git commit -m "feat(retainer): extend quote_sessions with retainer fields"
```

---

## Task 4: Database — Seed 4 retainer tiers

**Files:**
- Create: `supabase/migrations/016d_retainer_seed.sql`

- [ ] **Step 1: Write seed migration**

Prices are placeholders — Hunter edits via `/admin/retainer-plans` post-deploy. Items reference existing `services_catalog` slugs where they exist; missing slugs produce a TODO note at the end of the migration (no hard FK failure because seeds are conditional).

```sql
-- 016d: Seed the 4 retainer tiers. Prices are placeholders — Hunter sets
-- final pricing via /admin/retainer-plans after deploy.
-- Tier items reference services_catalog IDs. If a referenced service doesn't
-- exist yet, the INSERT is silently skipped via NOT EXISTS guard.

-- ESSENTIAL tier
INSERT INTO subscription_plans
  (slug, name, description, price_cents, currency, billing_interval, tier, is_retainer, sort_order, active)
VALUES
  ('retainer-essential', 'Essential', 'Hosting, maintenance, and monthly analytics.', 0, 'USD', 'month', 'essential', true, 1, true)
ON CONFLICT (slug) DO UPDATE SET
  tier = EXCLUDED.tier,
  is_retainer = EXCLUDED.is_retainer,
  sort_order = EXCLUDED.sort_order;

-- GROWTH tier
INSERT INTO subscription_plans
  (slug, name, description, price_cents, currency, billing_interval, tier, is_retainer, sort_order, active)
VALUES
  ('retainer-growth', 'Growth', 'Essential plus GBP, review responses, and SEO/LLM monitoring.', 0, 'USD', 'month', 'growth', true, 2, true)
ON CONFLICT (slug) DO UPDATE SET
  tier = EXCLUDED.tier,
  is_retainer = EXCLUDED.is_retainer,
  sort_order = EXCLUDED.sort_order;

-- FULL tier
INSERT INTO subscription_plans
  (slug, name, description, price_cents, currency, billing_interval, tier, is_retainer, sort_order, active)
VALUES
  ('retainer-full', 'Full', 'Complete ongoing management: all services included.', 0, 'USD', 'month', 'full', true, 3, true)
ON CONFLICT (slug) DO UPDATE SET
  tier = EXCLUDED.tier,
  is_retainer = EXCLUDED.is_retainer,
  sort_order = EXCLUDED.sort_order;

-- SITE-ONLY (zero-price sentinel — no subscription created on activation)
INSERT INTO subscription_plans
  (slug, name, description, price_cents, currency, billing_interval, tier, is_retainer, sort_order, active)
VALUES
  ('retainer-site-only', 'Site-only', 'Launch the site, no ongoing management. Add a retainer anytime post-launch.', 0, 'USD', 'month', 'site_only', true, 4, true)
ON CONFLICT (slug) DO UPDATE SET
  tier = EXCLUDED.tier,
  is_retainer = EXCLUDED.is_retainer,
  sort_order = EXCLUDED.sort_order;

-- Seed default included items for Essential / Growth / Full.
-- Uses INSERT SELECT with NOT EXISTS guard so missing services_catalog IDs
-- are silently skipped. Hunter adds items manually via /admin/retainer-plans
-- if services_catalog doesn't yet contain these slugs.

DO $$
DECLARE
  p_essential uuid;
  p_growth uuid;
  p_full uuid;
BEGIN
  SELECT id INTO p_essential FROM subscription_plans WHERE slug = 'retainer-essential';
  SELECT id INTO p_growth FROM subscription_plans WHERE slug = 'retainer-growth';
  SELECT id INTO p_full FROM subscription_plans WHERE slug = 'retainer-full';

  -- CATALOG-VERIFIED SLUGS (monthly/both pricing_type only):
  --   hosting-php / hosting-node / hosting-enterprise  (monthly)
  --   fractional-webmaster, analytics, site-admin      (monthly)
  --   google-admin                                      (monthly — GBP management)
  --   review-responders, review-admin                   (monthly)
  --   social-automation                                  (monthly)
  --   auto-blogging, automated-posts, content-repurposing (monthly)
  --   geo-aeo-llm, local-seo                            (both — has monthly tier)
  -- Default hosting slug for Essential is hosting-php; Hunter swaps to
  -- hosting-node / hosting-enterprise per client via admin UI.

  -- Essential: hosting (php default), fractional webmaster, analytics, site admin
  INSERT INTO subscription_plan_items (plan_id, service_id, quantity)
  SELECT p_essential, id, 1 FROM services_catalog
  WHERE id IN ('hosting-php', 'fractional-webmaster', 'analytics', 'site-admin')
  ON CONFLICT (plan_id, service_id) DO NOTHING;

  -- Growth: Essential items + GBP admin, review responders & admin, SEO/LLM + local SEO monitoring
  INSERT INTO subscription_plan_items (plan_id, service_id, quantity)
  SELECT p_growth, id, 1 FROM services_catalog
  WHERE id IN ('hosting-php', 'fractional-webmaster', 'analytics', 'site-admin',
               'google-admin', 'review-responders', 'review-admin',
               'geo-aeo-llm', 'local-seo')
  ON CONFLICT (plan_id, service_id) DO NOTHING;

  -- Full: Growth items + social automation, auto-blogging, automated posts, content repurposing
  INSERT INTO subscription_plan_items (plan_id, service_id, quantity)
  SELECT p_full, id, 1 FROM services_catalog
  WHERE id IN ('hosting-php', 'fractional-webmaster', 'analytics', 'site-admin',
               'google-admin', 'review-responders', 'review-admin',
               'geo-aeo-llm', 'local-seo',
               'social-automation', 'auto-blogging', 'automated-posts', 'content-repurposing')
  ON CONFLICT (plan_id, service_id) DO NOTHING;
END $$;
```

- [ ] **Step 2: Apply + verify**

```sql
SELECT slug, tier, price_cents FROM subscription_plans WHERE is_retainer = true ORDER BY sort_order;
```
Expected: 4 rows.

```sql
SELECT plan_id, COUNT(*) FROM subscription_plan_items GROUP BY plan_id;
```
Expected: 0–3 rows depending on which `services_catalog` slugs exist. Hunter adds manually via admin after deploy if needed.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/016d_retainer_seed.sql
git commit -m "feat(retainer): seed 4 retainer tiers + default items"
```

---

## Task 5: `src/lib/retainer.ts` — server helpers

**Files:**
- Create: `src/lib/retainer.ts`
- Test: `tests/retainer.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/retainer.test.ts
import { describe, it, expect } from 'vitest'
import { computeMonthlyTotal } from '@/lib/retainer'

describe('computeMonthlyTotal', () => {
  it('returns sum of plan default items when no custom overrides', () => {
    const planItems = [
      { service_id: 'a', name: 'Service A', monthly_cents: 10000, quantity: 1 },
      { service_id: 'b', name: 'Service B', monthly_cents: 5000, quantity: 1 },
    ]
    const customItems: Array<{ service_id: string; quantity: number; included: boolean }> = []
    expect(computeMonthlyTotal(planItems, customItems)).toBe(15000)
  })

  it('excludes items when custom override sets included=false', () => {
    const planItems = [
      { service_id: 'a', name: 'Service A', monthly_cents: 10000, quantity: 1 },
      { service_id: 'b', name: 'Service B', monthly_cents: 5000, quantity: 1 },
    ]
    const customItems = [{ service_id: 'b', quantity: 1, included: false }]
    expect(computeMonthlyTotal(planItems, customItems)).toBe(10000)
  })

  it('adds items not in plan when custom override sets included=true', () => {
    const planItems = [{ service_id: 'a', name: 'Service A', monthly_cents: 10000, quantity: 1 }]
    const customItems = [{ service_id: 'c', quantity: 1, included: true, monthly_cents: 7500 }]
    expect(computeMonthlyTotal(planItems, customItems)).toBe(17500)
  })

  it('respects quantity in custom overrides', () => {
    const planItems = [{ service_id: 'a', name: 'Service A', monthly_cents: 10000, quantity: 1 }]
    const customItems = [{ service_id: 'a', quantity: 3, included: true }]
    expect(computeMonthlyTotal(planItems, customItems)).toBe(30000)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/retainer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

```ts
// src/lib/retainer.ts
import { createServiceRoleClient } from '@/lib/supabase-server'

export interface PlanItem {
  service_id: string
  name: string
  monthly_cents: number
  quantity: number
}

export interface CustomItem {
  service_id: string
  quantity: number
  included: boolean
  monthly_cents?: number
}

export interface RetainerPlan {
  id: string
  slug: string
  name: string
  tier: 'essential' | 'growth' | 'full' | 'site_only'
  sort_order: number
  items: PlanItem[]
}

export interface RetainerMenuItem {
  id: string
  category: string
  name: string
  description: string | null
  monthly_cents: number
}

export function computeMonthlyTotal(
  planItems: PlanItem[],
  customItems: CustomItem[]
): number {
  const itemMap = new Map<string, { monthly_cents: number; quantity: number; included: boolean }>()

  for (const pi of planItems) {
    itemMap.set(pi.service_id, {
      monthly_cents: pi.monthly_cents,
      quantity: pi.quantity,
      included: true,
    })
  }

  for (const ci of customItems) {
    const existing = itemMap.get(ci.service_id)
    itemMap.set(ci.service_id, {
      monthly_cents: existing?.monthly_cents ?? ci.monthly_cents ?? 0,
      quantity: ci.quantity,
      included: ci.included,
    })
  }

  let total = 0
  for (const [, v] of itemMap) {
    if (v.included) total += v.monthly_cents * v.quantity
  }
  return total
}

export async function getRetainerPlans(): Promise<RetainerPlan[]> {
  const sb = createServiceRoleClient()
  const { data: plans, error: pErr } = await sb
    .from('subscription_plans')
    .select('id, slug, name, tier, sort_order, description, price_cents')
    .eq('is_retainer', true)
    .eq('active', true)
    .order('sort_order', { ascending: true })
  if (pErr) throw pErr

  const planIds = (plans ?? []).map((p) => p.id)
  const { data: items, error: iErr } = await sb
    .from('subscription_plan_items')
    .select('plan_id, service_id, quantity, services_catalog(name, monthly_range_low_cents)')
    .in('plan_id', planIds)
  if (iErr) throw iErr

  return (plans ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    tier: p.tier,
    sort_order: p.sort_order,
    items: (items ?? [])
      .filter((i) => i.plan_id === p.id)
      .map((i) => ({
        service_id: i.service_id,
        name: (i.services_catalog as any)?.name ?? i.service_id,
        monthly_cents: (i.services_catalog as any)?.monthly_range_low_cents ?? 0,
        quantity: i.quantity,
      })),
  }))
}

export async function getRetainerMenu(): Promise<RetainerMenuItem[]> {
  const sb = createServiceRoleClient()
  const { data, error } = await sb
    .from('services_catalog')
    .select('id, category, name, description, monthly_range_low_cents')
    .in('pricing_type', ['monthly', 'both'])
    .eq('active', true)
    .order('category', { ascending: true })
  if (error) throw error
  return (data ?? []).map((d) => ({
    id: d.id,
    category: d.category,
    name: d.name,
    description: d.description,
    monthly_cents: d.monthly_range_low_cents ?? 0,
  }))
}

export async function activateRetainer(quoteId: string): Promise<{ subscription_id: string | null }> {
  const sb = createServiceRoleClient()

  const { data: q, error: qErr } = await sb
    .from('quote_sessions')
    .select('id, prospect_id, selected_plan_id, retainer_custom_items, retainer_monthly_cents, retainer_activated_at, retainer_cancelled_at')
    .eq('id', quoteId)
    .single()
  if (qErr) throw qErr
  if (!q) throw new Error('Quote not found')
  if (q.retainer_activated_at) throw new Error('Retainer already activated')
  if (q.retainer_cancelled_at) throw new Error('Retainer cancelled')
  if (!q.selected_plan_id) throw new Error('No plan selected')
  if (!q.prospect_id) throw new Error('No prospect linked — cannot activate subscription')

  const { data: plan, error: pErr } = await sb
    .from('subscription_plans')
    .select('id, tier')
    .eq('id', q.selected_plan_id)
    .single()
  if (pErr) throw pErr

  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  if (plan.tier === 'site_only') {
    const { error: uErr } = await sb
      .from('quote_sessions')
      .update({ retainer_activated_at: now.toISOString(), launched_at: now.toISOString() })
      .eq('id', quoteId)
    if (uErr) throw uErr
    return { subscription_id: null }
  }

  const { data: sub, error: sErr } = await sb
    .from('subscriptions')
    .insert({
      prospect_id: q.prospect_id,
      plan_id: q.selected_plan_id,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_invoice_date: periodEnd.toISOString().slice(0, 10),
    })
    .select('id')
    .single()
  if (sErr) throw sErr

  const { error: uErr } = await sb
    .from('quote_sessions')
    .update({
      retainer_activated_at: now.toISOString(),
      launched_at: now.toISOString(),
      retainer_subscription_id: sub.id,
    })
    .eq('id', quoteId)
  if (uErr) throw uErr

  return { subscription_id: sub.id }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/retainer.test.ts`
Expected: 4 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/retainer.ts tests/retainer.test.ts
git commit -m "feat(retainer): server helpers + unit tests"
```

---

## Task 6: Public API — `PATCH /api/quote/retainer`

**Files:**
- Create: `src/app/api/quote/retainer/route.ts`

- [ ] **Step 1: Write route**

```ts
// src/app/api/quote/retainer/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { computeMonthlyTotal, getRetainerPlans } from '@/lib/retainer'

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { session_token, plan_id, custom_items, start_date } = body as {
    session_token?: string
    plan_id?: string
    custom_items?: Array<{ service_id: string; quantity: number; included: boolean }>
    start_date?: string
  }
  if (!session_token || !plan_id) {
    return NextResponse.json({ error: 'session_token and plan_id required' }, { status: 400 })
  }

  const sb = createServiceRoleClient()
  const { data: session, error: sErr } = await sb
    .from('quote_sessions')
    .select('id')
    .eq('session_token', session_token)
    .single()
  if (sErr || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const plans = await getRetainerPlans()
  const plan = plans.find((p) => p.id === plan_id)
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const monthly = computeMonthlyTotal(plan.items, custom_items ?? [])

  const { error: uErr } = await sb
    .from('quote_sessions')
    .update({
      selected_plan_id: plan_id,
      retainer_custom_items: custom_items ?? [],
      retainer_monthly_cents: monthly,
      retainer_start_date: start_date ?? null,
    })
    .eq('id', session.id)
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, monthly_cents: monthly })
}
```

- [ ] **Step 2: Smoke test**

Assume a quote session exists. Run:
```bash
curl -X PATCH http://localhost:3000/api/quote/retainer \
  -H 'Content-Type: application/json' \
  -d '{"session_token":"<real-token>","plan_id":"<real-plan-id>","custom_items":[]}'
```
Expected: `{"ok":true,"monthly_cents":N}` where N matches the plan total.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/quote/retainer/route.ts
git commit -m "feat(retainer): PATCH /api/quote/retainer endpoint"
```

---

## Task 7: Admin API — list/update retainer plans

**Files:**
- Create: `src/app/api/admin/retainer-plans/route.ts`
- Create: `src/app/api/admin/retainer-plans/[id]/route.ts`
- Create: `src/app/api/admin/retainer-plans/[id]/items/route.ts`

- [ ] **Step 1: Write list/create route**

```ts
// src/app/api/admin/retainer-plans/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getRetainerPlans } from '@/lib/retainer'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin
  const plans = await getRetainerPlans()
  return NextResponse.json({ plans })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin
  const body = await req.json()
  const { slug, name, description, price_cents, tier, sort_order } = body
  if (!slug || !name || !tier) {
    return NextResponse.json({ error: 'slug, name, tier required' }, { status: 400 })
  }
  const sb = createServiceRoleClient()
  const { data, error } = await sb
    .from('subscription_plans')
    .insert({
      slug,
      name,
      description,
      price_cents: price_cents ?? 0,
      tier,
      sort_order: sort_order ?? 99,
      is_retainer: true,
      billing_interval: 'month',
      currency: 'USD',
      active: true,
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
```

- [ ] **Step 2: Write per-plan update/delete route**

```ts
// src/app/api/admin/retainer-plans/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin
  const { id } = await ctx.params
  const body = await req.json()
  const allowed = ['name', 'description', 'price_cents', 'tier', 'sort_order', 'active']
  const patch: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) patch[k] = body[k]
  const sb = createServiceRoleClient()
  const { error } = await sb.from('subscription_plans').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin
  const { id } = await ctx.params
  const sb = createServiceRoleClient()
  const { error } = await sb.from('subscription_plans').update({ active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Write plan↔items management route**

```ts
// src/app/api/admin/retainer-plans/[id]/items/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin
  const { id: plan_id } = await ctx.params
  const body = await req.json()
  const items = body.items as Array<{ service_id: string; quantity: number }> | undefined
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'items array required' }, { status: 400 })
  }

  const sb = createServiceRoleClient()
  const { error: delErr } = await sb.from('subscription_plan_items').delete().eq('plan_id', plan_id)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  if (items.length === 0) return NextResponse.json({ ok: true })

  const rows = items.map((i) => ({ plan_id, service_id: i.service_id, quantity: i.quantity ?? 1 }))
  const { error: insErr } = await sb.from('subscription_plan_items').insert(rows)
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Smoke test all three**

```bash
curl -H "Cookie: <admin-session>" http://localhost:3000/api/admin/retainer-plans
curl -X PATCH -H "Cookie: <admin-session>" -H "Content-Type: application/json" \
  -d '{"price_cents":29900}' http://localhost:3000/api/admin/retainer-plans/<id>
curl -X PUT -H "Cookie: <admin-session>" -H "Content-Type: application/json" \
  -d '{"items":[{"service_id":"hosting-maintenance","quantity":1}]}' \
  http://localhost:3000/api/admin/retainer-plans/<id>/items
```
Expected: 200 responses with `ok:true` or plan data.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/retainer-plans/
git commit -m "feat(retainer): admin CRUD APIs for retainer plans"
```

---

## Task 8: Admin UI — `/admin/retainer-plans` list page

**Files:**
- Create: `src/app/admin/retainer-plans/page.tsx`

- [ ] **Step 1: Write page**

```tsx
// src/app/admin/retainer-plans/page.tsx
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import { getRetainerPlans } from '@/lib/retainer'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function RetainerPlansPage() {
  const admin = await requireAdmin()
  if (!admin || 'redirect' in admin) redirect('/admin-login')
  const plans = await getRetainerPlans()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Retainer Plans</h1>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Tier</th>
            <th>Name</th>
            <th>Items</th>
            <th className="text-right">Monthly (min)</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id} className="border-b hover:bg-slate-50">
              <td className="py-3 capitalize">{p.tier}</td>
              <td>
                <Link href={`/admin/retainer-plans/${p.id}`} className="text-blue-600 hover:underline">
                  {p.name}
                </Link>
              </td>
              <td>{p.items.length}</td>
              <td className="text-right">
                ${((p.items.reduce((s, i) => s + i.monthly_cents * i.quantity, 0)) / 100).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Smoke test in browser**

Load `/admin/retainer-plans` after signing in. Expected: table with 4 rows (Essential, Growth, Full, Site-only).

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/retainer-plans/page.tsx
git commit -m "feat(retainer): admin retainer-plans list page"
```

---

## Task 9: Admin UI — `/admin/retainer-plans/[id]` editor

**Files:**
- Create: `src/app/admin/retainer-plans/[id]/page.tsx`
- Create: `src/app/admin/retainer-plans/[id]/EditorClient.tsx`

- [ ] **Step 1: Write server page**

```tsx
// src/app/admin/retainer-plans/[id]/page.tsx
import { requireAdmin } from '@/lib/admin-auth'
import { redirect, notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getRetainerMenu } from '@/lib/retainer'
import EditorClient from './EditorClient'

export const dynamic = 'force-dynamic'

export default async function RetainerPlanEditor({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const admin = await requireAdmin()
  if (!admin || 'redirect' in admin) redirect('/admin-login')
  const { id } = await params
  const sb = createServiceRoleClient()
  const { data: plan } = await sb
    .from('subscription_plans')
    .select('*')
    .eq('id', id)
    .single()
  if (!plan) notFound()
  const { data: items } = await sb
    .from('subscription_plan_items')
    .select('service_id, quantity')
    .eq('plan_id', id)
  const menu = await getRetainerMenu()
  return <EditorClient plan={plan} items={items ?? []} menu={menu} />
}
```

- [ ] **Step 2: Write client editor**

```tsx
// src/app/admin/retainer-plans/[id]/EditorClient.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RetainerMenuItem } from '@/lib/retainer'

interface Plan {
  id: string
  slug: string
  name: string
  description: string | null
  price_cents: number
  tier: string
  sort_order: number
}

interface Item {
  service_id: string
  quantity: number
}

export default function EditorClient({
  plan,
  items: initialItems,
  menu,
}: {
  plan: Plan
  items: Item[]
  menu: RetainerMenuItem[]
}) {
  const router = useRouter()
  const [name, setName] = useState(plan.name)
  const [description, setDescription] = useState(plan.description ?? '')
  const [priceCents, setPriceCents] = useState(plan.price_cents)
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialItems.map((i) => i.service_id))
  )
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await fetch(`/api/admin/retainer-plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, price_cents: priceCents }),
    })
    await fetch(`/api/admin/retainer-plans/${plan.id}/items`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: Array.from(selected).map((service_id) => ({ service_id, quantity: 1 })),
      }),
    })
    setSaving(false)
    router.refresh()
  }

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-4 capitalize">
        {plan.tier} tier — {plan.name}
      </h1>

      <div className="space-y-4 mb-6">
        <label className="block">
          <span className="text-sm font-medium">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full border rounded px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full border rounded px-3 py-2"
            rows={3}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Price (cents)</span>
          <input
            type="number"
            value={priceCents}
            onChange={(e) => setPriceCents(Number(e.target.value))}
            className="mt-1 block w-full border rounded px-3 py-2"
          />
        </label>
      </div>

      <h2 className="font-medium mb-2">Included menu items</h2>
      <div className="border rounded divide-y">
        {menu.map((m) => (
          <label key={m.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer">
            <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} />
            <span className="flex-1">
              <span className="font-medium">{m.name}</span>
              <span className="text-xs text-slate-500 ml-2">[{m.category}]</span>
            </span>
            <span className="text-sm text-slate-600">
              ${(m.monthly_cents / 100).toFixed(0)}/mo
            </span>
          </label>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Smoke test**

Navigate to `/admin/retainer-plans/<id>`, change a field, save, reload. Expected: values persist.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/retainer-plans/\[id\]/
git commit -m "feat(retainer): admin retainer-plan editor UI"
```

---

## Task 10: `/quote` — `RetainerStep` component

**Files:**
- Create: `src/components/quote/RetainerStep.tsx`
- Create: `src/components/quote/RetainerCard.tsx`
- Create: `src/components/quote/RetainerCustomizeDrawer.tsx`

- [ ] **Step 1: Write `RetainerCard.tsx`**

```tsx
// src/components/quote/RetainerCard.tsx
'use client'

import type { RetainerPlan } from '@/lib/retainer'

interface Props {
  plan: RetainerPlan
  selected: boolean
  monthlyCents: number
  onSelect: () => void
  onCustomize: () => void
}

export default function RetainerCard({
  plan,
  selected,
  monthlyCents,
  onSelect,
  onCustomize,
}: Props) {
  const isSiteOnly = plan.tier === 'site_only'
  return (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition ${
        selected ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-300 hover:border-slate-400'
      }`}
      onClick={onSelect}
    >
      <h3 className="font-semibold capitalize">{plan.name}</h3>
      <p className="text-2xl font-bold mt-2">
        {isSiteOnly ? '$0' : `$${(monthlyCents / 100).toFixed(0)}`}
        <span className="text-sm font-normal text-slate-500">/mo</span>
      </p>
      <ul className="mt-3 text-sm space-y-1">
        {plan.items.length === 0 ? (
          <li className="text-slate-500 italic">No ongoing services</li>
        ) : (
          plan.items.slice(0, 6).map((i) => (
            <li key={i.service_id} className="text-slate-700">✓ {i.name}</li>
          ))
        )}
      </ul>
      {!isSiteOnly && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onCustomize()
          }}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          Customize
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write `RetainerCustomizeDrawer.tsx`**

```tsx
// src/components/quote/RetainerCustomizeDrawer.tsx
'use client'

import type { RetainerMenuItem, RetainerPlan } from '@/lib/retainer'

interface Props {
  plan: RetainerPlan
  menu: RetainerMenuItem[]
  customItems: Array<{ service_id: string; quantity: number; included: boolean }>
  onChange: (next: Array<{ service_id: string; quantity: number; included: boolean }>) => void
  onClose: () => void
}

export default function RetainerCustomizeDrawer({
  plan,
  menu,
  customItems,
  onChange,
  onClose,
}: Props) {
  const planItemIds = new Set(plan.items.map((i) => i.service_id))

  function effectiveIncluded(serviceId: string): boolean {
    const override = customItems.find((c) => c.service_id === serviceId)
    if (override) return override.included
    return planItemIds.has(serviceId)
  }

  function toggle(serviceId: string) {
    const currently = effectiveIncluded(serviceId)
    const existing = customItems.find((c) => c.service_id === serviceId)
    if (existing) {
      onChange(customItems.map((c) => (c.service_id === serviceId ? { ...c, included: !currently } : c)))
    } else {
      onChange([...customItems, { service_id: serviceId, quantity: 1, included: !currently }])
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Customize {plan.name}</h3>
          <button onClick={onClose} className="text-slate-500">Done</button>
        </div>
        <div className="divide-y">
          {menu.map((m) => (
            <label key={m.id} className="flex items-center gap-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={effectiveIncluded(m.id)}
                onChange={() => toggle(m.id)}
              />
              <span className="flex-1">
                <span className="font-medium">{m.name}</span>
                <span className="text-xs text-slate-500 ml-2">[{m.category}]</span>
              </span>
              <span className="text-sm">${(m.monthly_cents / 100).toFixed(0)}/mo</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write `RetainerStep.tsx`**

```tsx
// src/components/quote/RetainerStep.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import type { RetainerPlan, RetainerMenuItem } from '@/lib/retainer'
import RetainerCard from './RetainerCard'
import RetainerCustomizeDrawer from './RetainerCustomizeDrawer'

interface Props {
  sessionToken: string
  onContinue: () => void
}

export default function RetainerStep({ sessionToken, onContinue }: Props) {
  const [plans, setPlans] = useState<RetainerPlan[]>([])
  const [menu, setMenu] = useState<RetainerMenuItem[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [customItems, setCustomItems] = useState<
    Array<{ service_id: string; quantity: number; included: boolean }>
  >([])
  const [customizingPlanId, setCustomizingPlanId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [p, m] = await Promise.all([
        fetch('/api/quote/retainer-plans').then((r) => r.json()),
        fetch('/api/quote/retainer-menu').then((r) => r.json()),
      ])
      setPlans(p.plans)
      setMenu(m.menu)
    })()
  }, [])

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null

  function computeMonthlyFor(plan: RetainerPlan): number {
    const customByPlan = plan.id === selectedPlanId ? customItems : []
    const map = new Map<string, { cents: number; qty: number; inc: boolean }>()
    for (const pi of plan.items) {
      map.set(pi.service_id, { cents: pi.monthly_cents, qty: pi.quantity, inc: true })
    }
    for (const ci of customByPlan) {
      const menuItem = menu.find((m) => m.id === ci.service_id)
      const existing = map.get(ci.service_id)
      map.set(ci.service_id, {
        cents: existing?.cents ?? menuItem?.monthly_cents ?? 0,
        qty: ci.quantity,
        inc: ci.included,
      })
    }
    let total = 0
    for (const [, v] of map) if (v.inc) total += v.cents * v.qty
    return total
  }

  async function continueAfterSelect() {
    if (!selectedPlanId) return
    setSaving(true)
    const res = await fetch('/api/quote/retainer', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_token: sessionToken,
        plan_id: selectedPlanId,
        custom_items: customItems,
      }),
    })
    setSaving(false)
    if (res.ok) onContinue()
  }

  return (
    <div className="py-6">
      <h2 className="text-xl font-semibold mb-1">Ongoing management after launch</h2>
      <p className="text-slate-600 mb-4">
        Pick your ongoing service level. Activates on launch day. Change or cancel anytime.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {plans.map((p) => (
          <RetainerCard
            key={p.id}
            plan={p}
            selected={selectedPlanId === p.id}
            monthlyCents={computeMonthlyFor(p)}
            onSelect={() => {
              setSelectedPlanId(p.id)
              if (p.id !== selectedPlanId) setCustomItems([])
            }}
            onCustomize={() => setCustomizingPlanId(p.id)}
          />
        ))}
      </div>

      {customizingPlanId && (
        <RetainerCustomizeDrawer
          plan={plans.find((p) => p.id === customizingPlanId)!}
          menu={menu}
          customItems={customizingPlanId === selectedPlanId ? customItems : []}
          onChange={(next) => {
            setSelectedPlanId(customizingPlanId)
            setCustomItems(next)
          }}
          onClose={() => setCustomizingPlanId(null)}
        />
      )}

      <button
        onClick={continueAfterSelect}
        disabled={!selectedPlanId || saving}
        className="mt-6 px-6 py-3 bg-orange-500 text-white rounded font-medium disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Continue'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Write two public read endpoints for the step**

```ts
// src/app/api/quote/retainer-plans/route.ts
import { NextResponse } from 'next/server'
import { getRetainerPlans } from '@/lib/retainer'

export async function GET() {
  const plans = await getRetainerPlans()
  return NextResponse.json({ plans })
}

// src/app/api/quote/retainer-menu/route.ts
import { NextResponse } from 'next/server'
import { getRetainerMenu } from '@/lib/retainer'

export async function GET() {
  const menu = await getRetainerMenu()
  return NextResponse.json({ menu })
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/quote/ src/app/api/quote/retainer-plans/ src/app/api/quote/retainer-menu/
git commit -m "feat(retainer): RetainerStep + public read endpoints"
```

---

## Task 11: Wire `RetainerStep` into `/quote`

**Files:**
- Modify: `src/app/quote/QuotePageClient.tsx`

- [ ] **Step 1: Locate insertion point**

Read `src/app/quote/QuotePageClient.tsx`. Find where the existing flow transitions from "build scope complete" to "contact info" (likely a state machine or conditional render). Look for patterns like `status === 'review'` or a step variable.

- [ ] **Step 2: Add retainer step state**

Add a new phase between build-complete and contact-capture. Example structural change:

```tsx
// Before the contact phase check, add:
const [retainerComplete, setRetainerComplete] = useState(false)

// In the render, before the contact/review phase:
{session && !retainerComplete && /* build scope is done */ && (
  <RetainerStep
    sessionToken={session.session_token}
    onContinue={() => setRetainerComplete(true)}
  />
)}
```

The exact integration depends on the existing QuotePageClient state shape. Place the `<RetainerStep>` after the user has finalized their build selection and before they're prompted to book a call / share / whatever the current terminal action is.

- [ ] **Step 3: Smoke test full /quote flow**

1. Start a new /quote session
2. Select build items, let AI finish discovery
3. Expect RetainerStep to render before terminal CTA
4. Pick "Essential", click Continue
5. Verify `quote_sessions.selected_plan_id` populated in DB

- [ ] **Step 4: Commit**

```bash
git add src/app/quote/QuotePageClient.tsx
git commit -m "feat(retainer): insert RetainerStep into /quote flow"
```

---

## Task 12: Admin — `RetainerPanel` + "Mark Launched" on `/admin/quotes/[id]`

**Files:**
- Create: `src/components/admin/RetainerPanel.tsx`
- Create: `src/app/api/admin/quotes/[id]/launch/route.ts`
- Modify: `src/app/admin/quotes/[id]/page.tsx`

- [ ] **Step 1: Write launch API route**

```ts
// src/app/api/admin/quotes/[id]/launch/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { activateRetainer } from '@/lib/retainer'

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin
  const { id } = await ctx.params
  try {
    const result = await activateRetainer(id)
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Activation failed' }, { status: 400 })
  }
}
```

- [ ] **Step 2: Write `RetainerPanel.tsx`**

```tsx
// src/components/admin/RetainerPanel.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  quoteId: string
  planName: string | null
  planTier: string | null
  monthlyCents: number
  startDate: string | null
  activatedAt: string | null
  cancelledAt: string | null
  subscriptionId: string | null
  launchedAt: string | null
}

export default function RetainerPanel(props: Props) {
  const router = useRouter()
  const [launching, setLaunching] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const status = props.cancelledAt
    ? 'Cancelled'
    : props.activatedAt
    ? props.planTier === 'site_only'
      ? 'Declined (site-only)'
      : 'Active'
    : 'Pending'

  async function markLaunched() {
    setLaunching(true)
    setErr(null)
    const res = await fetch(`/api/admin/quotes/${props.quoteId}/launch`, { method: 'POST' })
    const data = await res.json()
    setLaunching(false)
    if (!res.ok) setErr(data.error ?? 'Failed')
    else router.refresh()
  }

  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="font-semibold mb-2">Retainer</h3>
      <dl className="text-sm space-y-1">
        <div className="flex justify-between"><dt className="text-slate-500">Plan</dt><dd>{props.planName ?? '—'}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd>{status}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Monthly</dt><dd>${(props.monthlyCents / 100).toFixed(2)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Start</dt><dd>{props.startDate ?? '—'}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Launched</dt><dd>{props.launchedAt?.slice(0,10) ?? '—'}</dd></div>
        {props.subscriptionId && (
          <div className="flex justify-between"><dt className="text-slate-500">Subscription</dt><dd className="font-mono text-xs">{props.subscriptionId.slice(0,8)}…</dd></div>
        )}
      </dl>

      {status === 'Pending' && props.planName && (
        <button
          onClick={markLaunched}
          disabled={launching}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded text-sm disabled:opacity-50"
        >
          {launching ? 'Activating…' : 'Mark Launched & Activate'}
        </button>
      )}
      {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Integrate into quote detail page**

Read `src/app/admin/quotes/[id]/page.tsx`. Add a server-side fetch for the quote's retainer fields + plan name, then render `<RetainerPanel ... />` beside the existing quote details.

Example addition:

```tsx
const { data: retainerRow } = await sb
  .from('quote_sessions')
  .select(`
    selected_plan_id,
    retainer_monthly_cents,
    retainer_start_date,
    retainer_activated_at,
    retainer_cancelled_at,
    retainer_subscription_id,
    launched_at,
    subscription_plans:selected_plan_id ( name, tier )
  `)
  .eq('id', id)
  .single()

// In JSX:
<RetainerPanel
  quoteId={id}
  planName={(retainerRow?.subscription_plans as any)?.name ?? null}
  planTier={(retainerRow?.subscription_plans as any)?.tier ?? null}
  monthlyCents={retainerRow?.retainer_monthly_cents ?? 0}
  startDate={retainerRow?.retainer_start_date ?? null}
  activatedAt={retainerRow?.retainer_activated_at ?? null}
  cancelledAt={retainerRow?.retainer_cancelled_at ?? null}
  subscriptionId={retainerRow?.retainer_subscription_id ?? null}
  launchedAt={retainerRow?.launched_at ?? null}
/>
```

- [ ] **Step 4: Smoke test**

1. Load `/admin/quotes/<id>` for a quote with a selected retainer
2. Verify panel shows Pending + plan name
3. Click "Mark Launched & Activate"
4. Verify: `subscriptions` row exists, `quote_sessions.retainer_activated_at` + `launched_at` set, panel reloads to Active

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/RetainerPanel.tsx src/app/api/admin/quotes/ src/app/admin/quotes/\[id\]/page.tsx
git commit -m "feat(retainer): admin retainer panel + launch activation"
```

---

## Task 13: SOW generation — add "Ongoing Services" section

**Files:**
- Modify: existing SOW generator (location TBD during implementation — likely `src/lib/sow.ts` or `src/app/api/admin/sow/route.ts`). The implementer finds it via `grep -r "SOW\|sow_document" src/`.

- [ ] **Step 1: Locate SOW generator**

```bash
grep -rn "sow_document\|generateSow\|generateSOW" src/ supabase/migrations/
```

Expected: finds either a `src/lib/sow*.ts` file or an API route that emits PDF/markdown.

- [ ] **Step 2: Add ongoing services section**

Inside the SOW output (HTML, markdown, or PDF template), after the build line items section, conditionally emit:

```ts
// Pseudocode — adapt to whatever templating the existing SOW uses.

const hasRetainer = quote.selected_plan_id && plan.tier !== 'site_only'

if (hasRetainer) {
  output += `
## Ongoing Services

Monthly retainer, activating on ${quote.retainer_start_date ?? 'launch date'}.

| Item | Monthly |
|---|---|
${retainerItems.map(i => `| ${i.name} | $${(i.monthly_cents / 100).toFixed(2)} |`).join('\n')}

**Total monthly:** $${(quote.retainer_monthly_cents / 100).toFixed(2)}

First month billed on launch day. Cancel with 30 days notice.
`
}
```

Where `retainerItems` is computed from `subscription_plan_items` joined with `services_catalog` for names, with `retainer_custom_items` applied as a diff.

- [ ] **Step 3: Smoke test SOW**

Generate a SOW for a quote with Essential tier. Expected: both "Build Services" and "Ongoing Services" sections present, with correct items and totals.

Generate a SOW for a site-only quote. Expected: no "Ongoing Services" section.

- [ ] **Step 4: Commit**

```bash
git add <sow-files>
git commit -m "feat(retainer): SOW includes Ongoing Services section"
```

---

## Task 14: Admin sidebar link + CLAUDE.md update

**Files:**
- Modify: admin sidebar (find via `grep -n "admin-sidebar\|AdminSidebar" src/components/admin/`)
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add sidebar link**

Add "Retainer Plans" under the existing "Content" or "Settings" group in the admin sidebar, linking to `/admin/retainer-plans`.

- [ ] **Step 2: Update CLAUDE.md**

Append a new subsection to section 11 (What Is Complete):
```
- [x] Retainer bundling at /quote: required selection step, 4 tiers (Essential/Growth/Full/Site-only),
      one-signature SOW with build + retainer, launch activation creates subscription row
```

And a brief flow note after section 10:
```
### Retainer flow

/quote captures retainer selection at the retainer step (between build scope and contact).
Admin marks quote launched via /admin/quotes/[id] → activates subscription.
Site-only quotes trigger a 30-day follow-up email (if SMTP wired).
```

- [ ] **Step 3: Commit**

```bash
git add <sidebar-file> CLAUDE.md
git commit -m "docs: admin link + CLAUDE.md for retainer bundling"
```

---

## Task 15: Smoke-test script

**Files:**
- Create: `scripts/smoke-retainer.sh`

- [ ] **Step 1: Write script**

```bash
#!/usr/bin/env bash
# scripts/smoke-retainer.sh
# Verifies retainer endpoints return expected status codes.
# Run against local dev server (npm run dev) or a deploy.

BASE="${BASE:-http://localhost:3000}"
pass=0
fail=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "✅ $name ($actual)"
    pass=$((pass+1))
  else
    echo "❌ $name (expected $expected, got $actual)"
    fail=$((fail+1))
  fi
}

# Public retainer reads should 200
check "GET /api/quote/retainer-plans" 200 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/quote/retainer-plans)"
check "GET /api/quote/retainer-menu"  200 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/quote/retainer-menu)"

# Admin routes should 401 without session
check "GET /api/admin/retainer-plans (no auth)" 401 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/admin/retainer-plans)"
check "POST /api/admin/quotes/FAKE/launch (no auth)" 401 "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/api/admin/quotes/FAKE/launch)"

# Retainer PATCH requires body
check "PATCH /api/quote/retainer (no body)" 400 "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH -H 'Content-Type: application/json' -d '{}' $BASE/api/quote/retainer)"

# Admin UI redirects unauthenticated
check "GET /admin/retainer-plans (no auth)" 307 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/admin/retainer-plans)"

echo "---"
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
```

- [ ] **Step 2: Run it**

```bash
chmod +x scripts/smoke-retainer.sh
./scripts/smoke-retainer.sh
```

Expected: all checks green, script exits 0.

- [ ] **Step 3: Commit**

```bash
git add scripts/smoke-retainer.sh
git commit -m "test(retainer): smoke script for all endpoints"
```

---

## Task 16: Align retainer rendering with existing canonical formatters

**Research summary (done before writing this task):**

Prior decisions already locked these in:

- **MEMORY.md** declares `services_catalog` as the SINGLE SOURCE OF TRUTH for quote line items and invoice line items. Retainer line items must use the same source — already wired in Tasks 1–15 via `subscription_plan_items.service_id REFERENCES services_catalog(id)`.
- **`src/lib/quote-engine.ts`** already exports `formatCents(cents)` and `formatRange(lowCents, highCents)`. These are the canonical money formatters for every DSIG surface. Whole-dollar format, `$X,XXX` style.
- **`src/lib/invoice-types.ts`** already defines `InvoiceLineItem` as the canonical line-item shape: `{ description, quantity, unit_price_cents, subtotal_cents, discount_pct, discount_cents, discount_label, line_total_cents, sort_order }`. This is what invoices, SOW PDFs, and retainer rows must all render from.
- **`src/lib/invoice-pdf/payload.ts`** already consumes `InvoiceLineItem[]` sorted by `sort_order` for PDF rendering.

**Goal of this task:** Task 16 is a sweep, not a new module. Fix the drift the retainer UI just introduced, then lock alignment.

**Files:**
- Modify: `src/lib/quote-engine.ts` — add `toInvoiceLineItem()` converter helper alongside existing `formatCents`/`formatRange`
- Modify: `src/components/quote/RetainerCard.tsx` — use `formatCents()` from `quote-engine.ts`, not hand-rolled
- Modify: `src/components/quote/RetainerCustomizeDrawer.tsx` — use `formatCents()`
- Modify: `src/components/admin/RetainerPanel.tsx` — use `formatCents()`
- Modify: `src/app/admin/retainer-plans/[id]/EditorClient.tsx` — use `formatCents()`
- Modify: `src/lib/retainer.ts` — add `retainerToInvoiceLineItems(quoteId)` that materializes the retainer selection as `InvoiceLineItem[]` for SOW/invoice reuse
- Modify: SOW generator (located in Task 13) — render retainer section via existing `InvoiceLineItem` path, not a parallel renderer
- Test: `tests/retainer-line-items.test.ts` — verify retainer → `InvoiceLineItem[]` conversion

- [ ] **Step 1: Add `toInvoiceLineItem()` converter to `quote-engine.ts`**

This is a thin adapter, not a new abstraction. Any caller with `{ service_id, name, quantity, unit_price_cents, discount_pct?, discount_label? }` can produce an `InvoiceLineItem`-shaped row. `invoice_id` is left empty (filled at invoice creation); `id` is generated deterministically from service_id for in-memory rendering before DB persistence.

```ts
// Append to src/lib/quote-engine.ts (keep existing formatCents/formatRange intact)
import type { InvoiceLineItem } from './invoice-types'

export interface LineItemInput {
  service_id: string
  description: string
  quantity: number
  unit_price_cents: number
  discount_pct?: number
  discount_label?: string | null
  sort_order?: number
}

export function toInvoiceLineItem(input: LineItemInput, sortOrder = 0): Omit<InvoiceLineItem, 'id' | 'invoice_id'> {
  const qty = input.quantity
  const unit = input.unit_price_cents
  const subtotal = qty * unit
  const pct = input.discount_pct ?? 0
  const discountCents = Math.round(subtotal * (pct / 100))
  return {
    description: input.description,
    quantity: qty,
    unit_price_cents: unit,
    subtotal_cents: subtotal,
    discount_pct: pct,
    discount_cents: discountCents,
    discount_label: input.discount_label ?? null,
    line_total_cents: subtotal - discountCents,
    sort_order: input.sort_order ?? sortOrder,
  }
}
```

- [ ] **Step 2: Write retainer → `InvoiceLineItem[]` converter in `src/lib/retainer.ts`**

```ts
// Append to src/lib/retainer.ts
import { toInvoiceLineItem } from './quote-engine'
import type { InvoiceLineItem } from './invoice-types'

export async function retainerToInvoiceLineItems(
  quoteId: string
): Promise<Array<Omit<InvoiceLineItem, 'id' | 'invoice_id'>>> {
  const sb = createServiceRoleClient()
  const { data: q } = await sb
    .from('quote_sessions')
    .select('selected_plan_id, retainer_custom_items')
    .eq('id', quoteId)
    .single()
  if (!q?.selected_plan_id) return []

  const { data: planItems } = await sb
    .from('subscription_plan_items')
    .select('service_id, quantity, services_catalog(id, name, monthly_range_low_cents)')
    .eq('plan_id', q.selected_plan_id)

  const custom = (q.retainer_custom_items ?? []) as Array<{
    service_id: string
    quantity: number
    included: boolean
  }>

  const merged = new Map<string, { name: string; qty: number; unit: number; included: boolean }>()
  for (const pi of planItems ?? []) {
    const svc = pi.services_catalog as any
    merged.set(pi.service_id, {
      name: svc?.name ?? pi.service_id,
      qty: pi.quantity,
      unit: svc?.monthly_range_low_cents ?? 0,
      included: true,
    })
  }
  for (const ci of custom) {
    const existing = merged.get(ci.service_id)
    if (existing) {
      merged.set(ci.service_id, { ...existing, qty: ci.quantity, included: ci.included })
    } else if (ci.included) {
      const { data: svc } = await sb
        .from('services_catalog')
        .select('name, monthly_range_low_cents')
        .eq('id', ci.service_id)
        .single()
      merged.set(ci.service_id, {
        name: svc?.name ?? ci.service_id,
        qty: ci.quantity,
        unit: svc?.monthly_range_low_cents ?? 0,
        included: true,
      })
    }
  }

  let sort = 100 // retainer items sort after build items (which typically use 0-99)
  const out: Array<Omit<InvoiceLineItem, 'id' | 'invoice_id'>> = []
  for (const [service_id, v] of merged) {
    if (!v.included) continue
    out.push(
      toInvoiceLineItem(
        {
          service_id,
          description: v.name + ' (monthly)',
          quantity: v.qty,
          unit_price_cents: v.unit,
        },
        sort++
      )
    )
  }
  return out
}
```

- [ ] **Step 3: Write test**

```ts
// tests/retainer-line-items.test.ts
import { describe, it, expect } from 'vitest'
import { toInvoiceLineItem } from '@/lib/quote-engine'

describe('toInvoiceLineItem', () => {
  it('produces canonical InvoiceLineItem shape with no discount', () => {
    const result = toInvoiceLineItem({
      service_id: 'gbp-mgmt',
      description: 'Google Business Profile Management (monthly)',
      quantity: 1,
      unit_price_cents: 29900,
    })
    expect(result).toMatchObject({
      description: 'Google Business Profile Management (monthly)',
      quantity: 1,
      unit_price_cents: 29900,
      subtotal_cents: 29900,
      discount_pct: 0,
      discount_cents: 0,
      discount_label: null,
      line_total_cents: 29900,
    })
  })

  it('applies percent discount correctly', () => {
    const result = toInvoiceLineItem({
      service_id: 'content-pub',
      description: 'AI Blog Posts (monthly, x4)',
      quantity: 4,
      unit_price_cents: 15000,
      discount_pct: 25,
      discount_label: 'Launch promo',
    })
    expect(result.subtotal_cents).toBe(60000)
    expect(result.discount_cents).toBe(15000)
    expect(result.line_total_cents).toBe(45000)
    expect(result.discount_label).toBe('Launch promo')
  })

  it('honors provided sort_order', () => {
    const result = toInvoiceLineItem(
      { service_id: 'x', description: 'X', quantity: 1, unit_price_cents: 100 },
      42
    )
    expect(result.sort_order).toBe(42)
  })
})
```

Run: `npx vitest run tests/retainer-line-items.test.ts`
Expected: 3 passing tests.

- [ ] **Step 4: Sweep retainer components to use `formatCents()`**

In each of these files, replace hand-rolled `$${(n / 100).toFixed(...)}` or `${(n/100)}` with `formatCents(n)` imported from `@/lib/quote-engine`:

- `src/components/quote/RetainerCard.tsx`
- `src/components/quote/RetainerCustomizeDrawer.tsx`
- `src/components/admin/RetainerPanel.tsx`
- `src/app/admin/retainer-plans/page.tsx`
- `src/app/admin/retainer-plans/[id]/EditorClient.tsx`

For each:
```tsx
import { formatCents } from '@/lib/quote-engine'
// then:
<span>{formatCents(monthlyCents)}<span className="text-sm text-slate-500">/mo</span></span>
```

- [ ] **Step 5: Wire SOW Ongoing Services through `retainerToInvoiceLineItems()`**

In Task 13's SOW generator change, replace any ad-hoc retainer formatting with:

```ts
import { retainerToInvoiceLineItems } from '@/lib/retainer'
import { formatCents } from '@/lib/quote-engine'

const retainerLines = await retainerToInvoiceLineItems(quote.id)
if (retainerLines.length > 0) {
  // render retainerLines the SAME WAY existing build line items are rendered
  // (same table component / markdown template / PDF row function)
}
```

This is the alignment enforcement: retainer rows now go through the same rendering path as build rows and invoice rows. If the invoice PDF template changes, SOW + retainer inherit the change for free.

- [ ] **Step 6: Drift audit — grep for any remaining hand-rolled money formatting**

```bash
grep -rn "toFixed(2)\|cents / 100\|cents/100" src/ 2>&1 | grep -v node_modules | grep -v ".test.ts"
```

Each hit that renders money for a user-facing document should use `formatCents()`. Each hit that renders a line item row should go through the `InvoiceLineItem` shape + existing renderer. Fix the retainer hits from Tasks 8–12 inline; flag (don't fix) any other hits — those are follow-up for whoever owns the originating surface.

- [ ] **Step 7: Run full test suite + build**

```bash
npx vitest run
npm run build
```
Expected: all tests pass, zero TS errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/quote-engine.ts src/lib/retainer.ts tests/retainer-line-items.test.ts src/components/quote/ src/components/admin/RetainerPanel.tsx src/app/admin/retainer-plans/
git commit -m "feat(retainer): align with canonical formatters + InvoiceLineItem shape

Retainer rows now materialize as InvoiceLineItem[] via quote-engine.toInvoiceLineItem,
rendered through the same path as build line items and invoice line items. Eliminates
format drift across quote/SOW/invoice/receipt surfaces."
```

---

## Verification & Ship

- [ ] **Run full build:** `npm run build` — zero TS errors.
- [ ] **Run all tests:** `npx vitest run` — all green.
- [ ] **Run smoke:** `./scripts/smoke-retainer.sh` — 7/7 green.
- [ ] **Manual end-to-end:**
  1. Load `/quote`, complete build selection, retainer step appears
  2. Pick "Growth", customize (remove one item), Continue
  3. Verify DB: `quote_sessions.selected_plan_id`, `retainer_monthly_cents`, `retainer_custom_items` populated
  4. Load `/admin/quotes/<id>`, click Mark Launched
  5. Verify: `subscriptions` row created, `retainer_subscription_id` linked, panel shows Active
- [ ] **Push + Vercel deploy check.** Verify `/admin/retainer-plans` loads in prod.
