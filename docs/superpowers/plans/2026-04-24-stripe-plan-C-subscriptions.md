# Plan C — Stripe subscriptions + caps + pause

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SOW conversion creates real Stripe subscriptions (not just DSIG rows). Subscriptions support future start dates (trial_end), cycle caps (cancel_at), and pause/resume that pushes end_date forward. Card collection magic link is sent to clients for subscriptions starting in the future. Webhook handles subscription lifecycle events.

**Architecture:** Add `cycle_cap` + `paused_until` to `subscriptions` table (migration 025c). Extend `convertSowToProject` to actually create Stripe subscriptions via new helpers in `stripe-sync.ts`. Add admin pause/resume endpoints. Extend webhook for `customer.subscription.paused` and `customer.subscription.resumed`. Add card-collection link via Stripe Customer Portal. Extend ConvertModal with subscription rows.

**Tech Stack:** Same as Plans A and B.

**Spec:** `docs/superpowers/specs/2026-04-24-stripe-payment-plans-design.md`

**Depends on:** Plan A and Plan B complete.

---

## File Structure

**New SQL migration files:**
- `supabase/migrations/025c_subscription_caps_and_pause.sql` — `subscriptions.cycle_cap` + `paused_until`
- `supabase/migrations/APPLY-025c-2026-04-24.sql` — apply file (small, single migration)

**New TypeScript files:**
- `src/lib/stripe-subscriptions.ts` — Stripe subscription helpers (create, pause, resume, cancel)
- `src/app/api/admin/subscriptions/[id]/pause/route.ts` — POST pause endpoint
- `src/app/api/admin/subscriptions/[id]/resume/route.ts` — POST resume endpoint
- `src/app/api/admin/subscriptions/[id]/customer-portal/route.ts` — POST creates Stripe Customer Portal link for adding payment method

**Modified TypeScript files:**
- `src/lib/payment-plans.ts` — wire subscription creation into `convertSowToProject` (replaces the no-op stub from Plan B)
- `src/app/api/webhooks/stripe/route.ts` — add `customer.subscription.paused` / `resumed` handlers
- `src/app/admin/sow/[id]/ConvertModal.tsx` — add subscription rows section
- `src/app/admin/subscriptions/[id]/page.tsx` — add Pause/Resume + cycle remaining display + card-collection-link button

---

## Task 1: Read prerequisites

- [ ] **Step 1: Read the spec sections relevant to Plan C**

In `docs/superpowers/specs/2026-04-24-stripe-payment-plans-design.md`, focus on:
- §3 (locked decisions for subscription pause + cap)
- §8 (Stripe wiring — future start, capped term, pause/resume sections)
- §11 (test plan — steps 7, 10, 11 cover Plan C)

- [ ] **Step 2: Read existing subscription code**

Read in full:
- `src/app/admin/subscriptions/[id]/page.tsx`
- `src/app/api/admin/subscriptions/[id]/cancel/route.ts`
- `src/app/api/admin/subscriptions/route.ts`
- `src/lib/retainer.ts` — `activateRetainer` (will keep existing path; add Stripe layer beneath)

- [ ] **Step 3: Confirm Plans A and B are deployed**

```bash
git log --oneline | head -20
```
Verify Plan A + Plan B commits are present and pushed.

---

## Task 2: Create migration 025c — cycle_cap + paused_until

**Files:**
- Create: `supabase/migrations/025c_subscription_caps_and_pause.sql`
- Create: `supabase/migrations/APPLY-025c-2026-04-24.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/025c_subscription_caps_and_pause.sql`:
```sql
-- ── 025c_subscription_caps_and_pause.sql ────────────────────────────
-- Adds cycle_cap (max number of cycles before auto-cancel) and
-- paused_until (date the pause expires) to subscriptions.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cycle_cap INT,
  ADD COLUMN IF NOT EXISTS paused_until DATE;

CREATE INDEX IF NOT EXISTS idx_subscriptions_paused_until ON subscriptions(paused_until)
  WHERE paused_until IS NOT NULL;
```

- [ ] **Step 2: Create the apply file**

Create `supabase/migrations/APPLY-025c-2026-04-24.sql`:
```sql
-- ════════════════════════════════════════════════════════════════════
-- APPLY-025c-2026-04-24.sql
-- Adds subscription cycle_cap + paused_until.
-- Idempotent.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cycle_cap INT,
  ADD COLUMN IF NOT EXISTS paused_until DATE;

CREATE INDEX IF NOT EXISTS idx_subscriptions_paused_until ON subscriptions(paused_until)
  WHERE paused_until IS NOT NULL;
```

- [ ] **Step 3: Apply via Supabase SQL Editor**

Open Supabase SQL Editor for project `uoekjqkawssbskfkziwz`. Paste contents of `APPLY-025c-2026-04-24.sql` and execute. Expected: success.

- [ ] **Step 4: Verify columns exist**

In SQL Editor:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'subscriptions'
  AND column_name IN ('cycle_cap', 'paused_until');
```
Expected: 2 rows.

- [ ] **Step 5: Wait 30 seconds (PostgREST cache)**

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/025c_subscription_caps_and_pause.sql supabase/migrations/APPLY-025c-2026-04-24.sql
git commit -m "feat(db): migration 025c — subscription cycle_cap + paused_until"
```

---

## Task 3: Update Subscription type

**Files:**
- Modify: `src/lib/invoice-types.ts`

- [ ] **Step 1: Add the new fields to Subscription interface**

In `src/lib/invoice-types.ts`, find the `interface Subscription` block. Replace it with (preserving existing fields):
```ts
export interface Subscription {
  id: string
  prospect_id: string
  plan_id: string
  status: SubscriptionStatus
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  current_period_start: string
  current_period_end: string
  next_invoice_date: string
  canceled_at: string | null
  cancel_reason: string | null
  end_date: string | null
  notes: string | null
  override_monthly_amount_cents: number | null
  cycle_cap: number | null
  paused_until: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/invoice-types.ts
git commit -m "feat(types): Subscription gains cycle_cap + paused_until"
```

---

## Task 4: Create stripe-subscriptions.ts helpers

**Files:**
- Create: `src/lib/stripe-subscriptions.ts`

- [ ] **Step 1: Create the file**

Create `src/lib/stripe-subscriptions.ts`:
```ts
// ── stripe-subscriptions.ts ─────────────────────────────────────────
// Stripe subscription lifecycle helpers.
// Pairs with src/lib/stripe-sync.ts (which handles one-off invoice payments).

import type Stripe from 'stripe'
import { stripe, idempotencyKey } from './stripe-client'
import { ensureStripeCustomer } from './stripe-sync'
import { supabaseAdmin } from '@/lib/supabase/admin'

// ── Map DSIG billing interval to Stripe price recurring spec ───────
function intervalToStripeRecurring(
  interval: 'month' | 'quarter' | 'year',
): { interval: 'month' | 'year'; interval_count: number } {
  switch (interval) {
    case 'month':
      return { interval: 'month', interval_count: 1 }
    case 'quarter':
      return { interval: 'month', interval_count: 3 }
    case 'year':
      return { interval: 'year', interval_count: 1 }
  }
}

/**
 * Compute end_date given a start date, interval, and cycle_cap.
 * Returns null if cycle_cap is undefined (open-ended subscription).
 */
export function computeEndDate(
  startISO: string,
  interval: 'month' | 'quarter' | 'year',
  cycleCap: number | undefined,
): string | null {
  if (!cycleCap || cycleCap <= 0) return null
  const start = new Date(startISO)
  const end = new Date(start)
  if (interval === 'month') end.setMonth(end.getMonth() + cycleCap)
  else if (interval === 'quarter') end.setMonth(end.getMonth() + cycleCap * 3)
  else if (interval === 'year') end.setFullYear(end.getFullYear() + cycleCap)
  return end.toISOString()
}

/**
 * Create a Stripe Subscription for a DSIG subscription row.
 *
 * Behavior:
 *   - Creates a one-off Stripe Product + Price for this subscription
 *     (we don't reuse Stripe products across DSIG subscriptions because
 *     each may have a custom amount via override_monthly_amount_cents).
 *   - If startDate > today, sets trial_end = startDate (no proration; first
 *     charge fires at startDate).
 *   - If cycleCap is set, computes cancel_at = startDate + (cycleCap * interval).
 *   - collection_method = 'charge_automatically' (assumes a saved card on
 *     the customer; card collection is handled separately via Customer Portal).
 *
 * Returns the Stripe Subscription object.
 *
 * The caller is responsible for storing stripe_subscription_id +
 * stripe_customer_id back on the DSIG subscriptions row.
 */
export async function createStripeSubscription(args: {
  dsigSubscriptionId: string
  prospectId: string
  amountCents: number
  interval: 'month' | 'quarter' | 'year'
  startDateISO: string
  cycleCap?: number
  productName: string
}): Promise<{ subscription: Stripe.Subscription; customerId: string; endDate: string | null }> {
  const customerId = await ensureStripeCustomer(args.prospectId)
  const s = stripe()

  // Create a unique Product + Price for this subscription.
  const product = await s.products.create(
    {
      name: args.productName,
      metadata: {
        dsig_subscription_id: args.dsigSubscriptionId,
      },
    },
    { idempotencyKey: idempotencyKey('product_for_sub', args.dsigSubscriptionId) },
  )

  const recurring = intervalToStripeRecurring(args.interval)
  const price = await s.prices.create(
    {
      product: product.id,
      unit_amount: args.amountCents,
      currency: 'usd',
      recurring,
    },
    { idempotencyKey: idempotencyKey('price_for_sub', args.dsigSubscriptionId) },
  )

  const startUnix = Math.floor(new Date(args.startDateISO).getTime() / 1000)
  const nowUnix = Math.floor(Date.now() / 1000)
  const isFutureStart = startUnix > nowUnix + 60  // 1-min buffer for clock skew

  const endDate = computeEndDate(args.startDateISO, args.interval, args.cycleCap)
  const cancelAtUnix = endDate ? Math.floor(new Date(endDate).getTime() / 1000) : undefined

  const subscriptionParams: Stripe.SubscriptionCreateParams = {
    customer: customerId,
    items: [{ price: price.id }],
    collection_method: 'charge_automatically',
    metadata: {
      dsig_subscription_id: args.dsigSubscriptionId,
    },
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
  }

  if (isFutureStart) {
    subscriptionParams.trial_end = startUnix
    subscriptionParams.proration_behavior = 'none'
  }

  if (cancelAtUnix) {
    subscriptionParams.cancel_at = cancelAtUnix
  }

  const subscription = await s.subscriptions.create(subscriptionParams, {
    idempotencyKey: idempotencyKey('subscription', args.dsigSubscriptionId),
  })

  return { subscription, customerId, endDate }
}

/**
 * Pause a Stripe subscription's collection.
 * `behavior: 'void'` = no invoices are generated during pause; existing draft
 * invoices are voided. After resume, billing resumes from the next normal
 * cycle (unless we adjust cycle anchor).
 */
export async function pauseStripeSubscription(stripeSubscriptionId: string): Promise<void> {
  const s = stripe()
  await s.subscriptions.update(
    stripeSubscriptionId,
    { pause_collection: { behavior: 'void' } },
    { idempotencyKey: idempotencyKey('pause', stripeSubscriptionId + '_' + new Date().toISOString().slice(0, 10)) },
  )
}

/**
 * Resume a paused subscription. Optionally update cancel_at to push out
 * the end-date by the pause duration.
 */
export async function resumeStripeSubscription(
  stripeSubscriptionId: string,
  newCancelAtISO: string | null,
): Promise<void> {
  const s = stripe()
  const params: Stripe.SubscriptionUpdateParams = {
    pause_collection: '' as unknown as Stripe.SubscriptionUpdateParams['pause_collection'],
  }
  if (newCancelAtISO) {
    params.cancel_at = Math.floor(new Date(newCancelAtISO).getTime() / 1000)
  }
  await s.subscriptions.update(stripeSubscriptionId, params, {
    idempotencyKey: idempotencyKey('resume', stripeSubscriptionId + '_' + new Date().toISOString().slice(0, 10)),
  })
}

/**
 * Generate a Stripe Customer Portal session URL for the prospect.
 * Used to send a magic-link "Add payment method" email when a subscription
 * has a future start and the customer has no saved card yet.
 */
export async function createCustomerPortalSession(
  prospectId: string,
  returnUrl: string,
): Promise<string> {
  const customerId = await ensureStripeCustomer(prospectId)
  const s = stripe()
  const session = await s.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
  return session.url
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/stripe-subscriptions.ts
git commit -m "feat(stripe): subscription helpers (create, pause, resume, customer portal)"
```

---

## Task 5: Wire Stripe subscription creation into convertSowToProject

**Files:**
- Modify: `src/lib/payment-plans.ts`

- [ ] **Step 1: Replace the subscription stub with real Stripe creation**

In `src/lib/payment-plans.ts`, find the section labeled `// ── 11. Subscriptions are handled by Plan C ──`. Replace the entire block (the `console.log` no-op) with:
```ts
  // ── 11. Subscriptions ────────────────────────────────────────────
  const subscriptionResults: Array<{
    id: string
    stripe_subscription_id: string | null
    status: string
  }> = []

  for (const subSpec of body.subscriptions) {
    if (subSpec.already_activated) {
      // Backfill: insert DSIG row only, no Stripe call.
      const endDate = subSpec.cycle_cap
        ? (await import('./stripe-subscriptions')).computeEndDate(
            subSpec.start_date,
            subSpec.interval,
            subSpec.cycle_cap,
          )
        : null

      // Find or create matching plan row.
      const planId = await findOrCreatePlanForSubscription(subSpec, sow)

      const periodStart = new Date(subSpec.start_date)
      const periodEnd = computeNextPeriodEnd(periodStart, subSpec.interval)

      const { data: subRow } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          prospect_id: sow.prospect_id,
          plan_id: planId,
          status: 'active',
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          next_invoice_date: periodEnd.toISOString().slice(0, 10),
          override_monthly_amount_cents: subSpec.amount_cents,
          cycle_cap: subSpec.cycle_cap ?? null,
          end_date: endDate,
          notes: `Backfilled — already activated, no Stripe linkage`,
        })
        .select('id, stripe_subscription_id, status')
        .single()

      if (subRow) subscriptionResults.push(subRow as any)
      continue
    }

    // Real Stripe subscription creation.
    const planId = await findOrCreatePlanForSubscription(subSpec, sow)
    const periodStart = new Date(subSpec.start_date)
    const periodEnd = computeNextPeriodEnd(periodStart, subSpec.interval)

    // Insert DSIG subscription row first (need the id for Stripe metadata).
    const { data: subRow, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        prospect_id: sow.prospect_id,
        plan_id: planId,
        status: 'trialing',  // updated to 'active' once first charge succeeds
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        next_invoice_date: periodEnd.toISOString().slice(0, 10),
        override_monthly_amount_cents: subSpec.amount_cents,
        cycle_cap: subSpec.cycle_cap ?? null,
        notes: `Auto-created from SOW ${sow.sow_number} via convertSowToProject`,
      })
      .select('id')
      .single()

    if (subErr || !subRow) {
      console.error('[convertSowToProject] subscription DSIG insert failed:', subErr?.message)
      continue
    }

    try {
      const { createStripeSubscription } = await import('./stripe-subscriptions')
      const productName = `${sow.title} — recurring (SOW ${sow.sow_number})`
      const result = await createStripeSubscription({
        dsigSubscriptionId: subRow.id,
        prospectId: sow.prospect_id,
        amountCents: subSpec.amount_cents,
        interval: subSpec.interval,
        startDateISO: subSpec.start_date,
        cycleCap: subSpec.cycle_cap,
        productName,
      })

      await supabaseAdmin
        .from('subscriptions')
        .update({
          stripe_subscription_id: result.subscription.id,
          stripe_customer_id: result.customerId,
          end_date: result.endDate,
        })
        .eq('id', subRow.id)

      subscriptionResults.push({
        id: subRow.id,
        stripe_subscription_id: result.subscription.id,
        status: 'trialing',
      })
    } catch (stripeErr) {
      console.error('[convertSowToProject] Stripe subscription create failed:', stripeErr)
      // Compensating rollback: leave the DSIG row but mark with error note.
      await supabaseAdmin
        .from('subscriptions')
        .update({
          notes: `STRIPE ERROR: ${stripeErr instanceof Error ? stripeErr.message : String(stripeErr)}`,
        })
        .eq('id', subRow.id)
      subscriptionResults.push({
        id: subRow.id,
        stripe_subscription_id: null,
        status: 'error',
      })
    }
  }
```

- [ ] **Step 2: Add helpers findOrCreatePlanForSubscription + computeNextPeriodEnd**

Append to `src/lib/payment-plans.ts`:
```ts
// ── Subscription helpers (used by convertSowToProject) ─────────────

import type { ConvertSowSubscriptionSpec } from './payment-plan-types'

async function findOrCreatePlanForSubscription(
  spec: ConvertSowSubscriptionSpec,
  sow: any,
): Promise<string> {
  // Look for an existing throwaway plan for this exact deliverable.
  const expectedSlug = `sow-${sow.sow_number}-deliv-${spec.deliverable_id.slice(0, 8)}`
  const { data: existing } = await supabaseAdmin
    .from('subscription_plans')
    .select('id')
    .eq('slug', expectedSlug)
    .maybeSingle()

  if (existing) return existing.id

  const intervalMap: Record<string, string> = {
    month: 'month',
    quarter: 'quarter',
    year: 'year',
  }

  const { data: newPlan, error } = await supabaseAdmin
    .from('subscription_plans')
    .insert({
      slug: expectedSlug,
      name: `${sow.title} — recurring`,
      description: `Auto-created from SOW ${sow.sow_number} via convertSowToProject`,
      price_cents: spec.amount_cents,
      billing_interval: intervalMap[spec.interval] ?? 'month',
      active: true,
    })
    .select('id')
    .single()

  if (error || !newPlan) {
    throw new Error(`Plan creation failed: ${error?.message}`)
  }
  return newPlan.id
}

function computeNextPeriodEnd(start: Date, interval: 'month' | 'quarter' | 'year'): Date {
  const end = new Date(start)
  if (interval === 'month') end.setMonth(end.getMonth() + 1)
  else if (interval === 'quarter') end.setMonth(end.getMonth() + 3)
  else if (interval === 'year') end.setFullYear(end.getFullYear() + 1)
  return end
}
```

- [ ] **Step 3: Update buildConversionResult to include subscriptions**

Find `buildConversionResult` in `src/lib/payment-plans.ts`. Update it to actually return the subscription results that were just created:
```ts
async function buildConversionResult(
  scheduleId: string,
  projectId: string | null,
): Promise<ConvertSowResult> {
  const { data: schedule } = await supabaseAdmin
    .from('payment_schedules')
    .select('id, project_id, sow_document_id')
    .eq('id', scheduleId)
    .single()

  const { data: installments } = await supabaseAdmin
    .from('payment_installments')
    .select('id, sequence, status, invoice_id, invoice:invoices!payment_installments_invoice_id_fkey(invoice_number, public_uuid)')
    .eq('schedule_id', scheduleId)
    .order('sequence', { ascending: true })

  // Subscriptions linked to this SOW's prospect
  let subs: Array<{ id: string; stripe_subscription_id: string | null; status: string }> = []
  let tradeCreditId: string | null = null
  if (schedule?.sow_document_id) {
    const { data: sowRow } = await supabaseAdmin
      .from('sow_documents')
      .select('prospect_id')
      .eq('id', schedule.sow_document_id)
      .single()

    const { data: tc } = await supabaseAdmin
      .from('trade_credits')
      .select('id')
      .eq('sow_document_id', schedule.sow_document_id)
      .limit(1)
    tradeCreditId = tc?.[0]?.id ?? null

    if (sowRow?.prospect_id) {
      const { data: subRows } = await supabaseAdmin
        .from('subscriptions')
        .select('id, stripe_subscription_id, status')
        .eq('prospect_id', sowRow.prospect_id)
        .order('created_at', { ascending: false })
        .limit(20)
      subs = subRows ?? []
    }
  }

  return {
    project_id: schedule?.project_id ?? projectId ?? '',
    payment_schedule_id: scheduleId,
    installments: (installments ?? []).map((row: any) => ({
      id: row.id,
      sequence: row.sequence,
      status: row.status,
      invoice_id: row.invoice_id,
      invoice_number: row.invoice?.invoice_number ?? null,
      public_url: row.invoice?.invoice_number && row.invoice?.public_uuid
        ? `https://demandsignals.co/invoice/${row.invoice.invoice_number}/${row.invoice.public_uuid}`
        : null,
    })),
    subscriptions: subs,
    trade_credit_id: tradeCreditId,
  }
}
```

- [ ] **Step 4: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/payment-plans.ts
git commit -m "feat(payment-plans): wire real Stripe subscription creation into convertSowToProject"
```

---

## Task 6: Add subscription rows to ConvertModal

**Files:**
- Modify: `src/app/admin/sow/[id]/ConvertModal.tsx`

- [ ] **Step 1: Extend the ConvertModal Props with deliverable hints**

In `src/app/admin/sow/[id]/ConvertModal.tsx`, extend `SowSummary`:
```ts
interface SowSummary {
  id: string
  sow_number: string
  title: string
  status: string
  total_cents: number
  trade_credit_cents: number
  trade_credit_description: string | null
  phases: Array<{ id: string; name: string }>
  recurring_deliverables: Array<{
    id: string
    name: string
    monthly_cents: number
    cadence: 'monthly' | 'quarterly' | 'annual'
  }>
}
```

- [ ] **Step 2: Add subscription state + section to the modal**

Add after the TIK fieldset, before the Payment Plan fieldset:
```tsx
import type { ConvertSowSubscriptionSpec } from '@/lib/payment-plan-types'

// (in component body, near other useState calls)
const [subscriptions, setSubscriptions] = useState<ConvertSowSubscriptionSpec[]>(
  sow.recurring_deliverables.map((d) => ({
    deliverable_id: d.id,
    amount_cents: d.monthly_cents,
    interval: d.cadence === 'monthly' ? 'month' : d.cadence === 'quarterly' ? 'quarter' : 'year',
    start_date: today,
    cycle_cap: undefined,
  })),
)

function updateSub(idx: number, patch: Partial<ConvertSowSubscriptionSpec>) {
  setSubscriptions((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
}
function addSub() {
  setSubscriptions((prev) => [
    ...prev,
    {
      deliverable_id: `manual-${Date.now()}`,
      amount_cents: 0,
      interval: 'month',
      start_date: today,
      cycle_cap: undefined,
    },
  ])
}
function removeSub(idx: number) {
  setSubscriptions((prev) => prev.filter((_, i) => i !== idx))
}
```

In the JSX, between the TIK fieldset and the Payment Plan fieldset, add:
```tsx
{/* Recurring Subscriptions */}
<fieldset style={{ marginBottom: 24, border: '1px solid #e2e8f0', padding: 16, borderRadius: 8 }}>
  <legend style={{ fontWeight: 600, padding: '0 8px' }}>Recurring subscriptions (Stripe)</legend>
  {subscriptions.length === 0 && (
    <p style={{ fontSize: 13, color: '#5d6780', marginBottom: 12 }}>
      No recurring services. Click below to add one.
    </p>
  )}
  {subscriptions.map((sub, idx) => (
    <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <strong style={{ fontSize: 13 }}>Subscription {idx + 1}</strong>
        <button type="button" onClick={() => removeSub(idx)} style={{ marginLeft: 'auto', padding: '4px 10px', background: '#fee', border: '1px solid #fcc', borderRadius: 4, fontSize: 12, color: '#c00' }}>Remove</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#5d6780', marginBottom: 2 }}>Amount per cycle ($)</label>
          <input type="number" step="0.01" value={(sub.amount_cents / 100).toFixed(2)}
            onChange={(e) => updateSub(idx, { amount_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
            style={{ width: '100%', padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#5d6780', marginBottom: 2 }}>Interval</label>
          <select value={sub.interval}
            onChange={(e) => updateSub(idx, { interval: e.target.value as any })}
            style={{ width: '100%', padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 }}
          >
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="year">Annually</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#5d6780', marginBottom: 2 }}>Start date</label>
          <input type="date" value={sub.start_date}
            onChange={(e) => updateSub(idx, { start_date: e.target.value })}
            style={{ width: '100%', padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <label style={{ fontSize: 12 }}>
          <input type="checkbox"
            checked={sub.cycle_cap !== undefined}
            onChange={(e) => updateSub(idx, { cycle_cap: e.target.checked ? 12 : undefined })}
          />
          {' '}Cap at N cycles (then auto-cancel)
        </label>
        {sub.cycle_cap !== undefined && (
          <input type="number" min="1" value={sub.cycle_cap}
            onChange={(e) => updateSub(idx, { cycle_cap: parseInt(e.target.value, 10) || 1 })}
            style={{ width: 80, padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 }}
          />
        )}
        <label style={{ fontSize: 12, marginLeft: 'auto' }}>
          <input type="checkbox"
            checked={!!sub.already_activated}
            onChange={(e) => updateSub(idx, { already_activated: e.target.checked })}
          />
          {' '}Already activated externally (backfill)
        </label>
      </div>
    </div>
  ))}
  <button type="button" onClick={addSub} style={{ padding: '8px 14px', background: '#68c5ad', color: '#fff', border: 0, borderRadius: 6, fontSize: 13, fontWeight: 600 }}>+ Add subscription</button>
</fieldset>
```

- [ ] **Step 3: Pass subscriptions in submit body**

In the `submit` function, change `subscriptions: []` to `subscriptions: subscriptions`:
```ts
const body: ConvertSowRequest = {
  acceptance: {
    signed_by: signedBy,
    accepted_at: acceptedAt,
    method,
  },
  payment_plan: installments,
  subscriptions: subscriptions,
  tik,
  send_invoices: sendInvoices,
}
```

- [ ] **Step 4: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/sow/[id]/ConvertModal.tsx
git commit -m "feat(admin): subscription rows in Convert modal"
```

---

## Task 7: Update ConvertButton to pass recurring deliverables

**Files:**
- Modify: `src/app/admin/sow/[id]/ConvertButton.tsx`
- Modify: `src/app/admin/sow/[id]/page.tsx`

- [ ] **Step 1: Extend ConvertButton's SowSummary type**

In `src/app/admin/sow/[id]/ConvertButton.tsx`, mirror the type extension from Task 6:
```ts
interface SowSummary {
  id: string
  sow_number: string
  title: string
  status: string
  total_cents: number
  trade_credit_cents: number
  trade_credit_description: string | null
  phases: Array<{ id: string; name: string }>
  recurring_deliverables: Array<{
    id: string
    name: string
    monthly_cents: number
    cadence: 'monthly' | 'quarterly' | 'annual'
  }>
}
```

- [ ] **Step 2: Compute recurring_deliverables on the SOW page**

In `src/app/admin/sow/[id]/page.tsx`, when constructing the prop for ConvertButton, add the `recurring_deliverables` derivation:
```tsx
recurring_deliverables: (sow.phases ?? []).flatMap((p: any) =>
  (p.deliverables ?? [])
    .filter((d: any) => ['monthly', 'quarterly', 'annual'].includes(d.cadence))
    .map((d: any) => ({
      id: d.id,
      name: d.name,
      monthly_cents: d.line_total_cents ?? d.unit_price_cents ?? 0,
      cadence: d.cadence,
    })),
),
```

- [ ] **Step 3: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/sow/[id]/ConvertButton.tsx src/app/admin/sow/[id]/page.tsx
git commit -m "feat(admin): pass recurring deliverables from SOW page to Convert modal"
```

---

## Task 8: Pause / Resume endpoints

**Files:**
- Create: `src/app/api/admin/subscriptions/[id]/pause/route.ts`
- Create: `src/app/api/admin/subscriptions/[id]/resume/route.ts`

- [ ] **Step 1: Create pause endpoint**

Create `src/app/api/admin/subscriptions/[id]/pause/route.ts`:
```ts
// ── POST /api/admin/subscriptions/[id]/pause ────────────────────────
// Pauses a subscription's collection in Stripe AND pushes its end_date
// out by the pause duration (preserves total contract value).
// Body: { duration_days: number, reason?: string }

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { pauseStripeSubscription } from '@/lib/stripe-subscriptions'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const duration_days = typeof body.duration_days === 'number' ? body.duration_days : 30
  const reason = typeof body.reason === 'string' ? body.reason : null

  if (duration_days <= 0 || duration_days > 365) {
    return NextResponse.json({ error: 'duration_days must be between 1 and 365' }, { status: 400 })
  }

  const { data: sub, error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .select('id, status, stripe_subscription_id, end_date, paused_until')
    .eq('id', id)
    .single()

  if (subErr || !sub) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  }

  if (sub.status === 'canceled' || sub.status === 'paused') {
    return NextResponse.json(
      { error: `Subscription is ${sub.status} — cannot pause` },
      { status: 409 },
    )
  }

  // Compute new end_date (push out by duration_days).
  let newEndDateISO: string | null = null
  if (sub.end_date) {
    const end = new Date(sub.end_date)
    end.setDate(end.getDate() + duration_days)
    newEndDateISO = end.toISOString()
  }

  // Compute paused_until (today + duration_days).
  const pausedUntil = new Date()
  pausedUntil.setDate(pausedUntil.getDate() + duration_days)
  const pausedUntilDate = pausedUntil.toISOString().slice(0, 10)

  // Stripe: pause collection + push cancel_at if applicable.
  if (sub.stripe_subscription_id) {
    try {
      await pauseStripeSubscription(sub.stripe_subscription_id)

      if (newEndDateISO) {
        const { stripe } = await import('@/lib/stripe-client')
        const cancelAtUnix = Math.floor(new Date(newEndDateISO).getTime() / 1000)
        await stripe().subscriptions.update(sub.stripe_subscription_id, {
          cancel_at: cancelAtUnix,
        })
      }
    } catch (e) {
      return NextResponse.json(
        { error: `Stripe pause failed: ${e instanceof Error ? e.message : e}` },
        { status: 502 },
      )
    }
  }

  // DSIG: update status + paused_until + end_date.
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'paused',
      paused_until: pausedUntilDate,
      end_date: newEndDateISO,
      notes: reason ? `Paused: ${reason}` : 'Paused',
    })
    .eq('id', id)

  return NextResponse.json({
    ok: true,
    paused_until: pausedUntilDate,
    new_end_date: newEndDateISO,
  })
}
```

- [ ] **Step 2: Create resume endpoint**

Create `src/app/api/admin/subscriptions/[id]/resume/route.ts`:
```ts
// ── POST /api/admin/subscriptions/[id]/resume ───────────────────────
// Resumes a paused subscription. Clears pause_collection in Stripe and
// paused_until in DSIG. Does not touch end_date (already pushed forward
// when paused).

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resumeStripeSubscription } from '@/lib/stripe-subscriptions'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: sub, error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .select('id, status, stripe_subscription_id, end_date')
    .eq('id', id)
    .single()

  if (subErr || !sub) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  }

  if (sub.status !== 'paused') {
    return NextResponse.json(
      { error: `Subscription is ${sub.status}, not paused — cannot resume` },
      { status: 409 },
    )
  }

  if (sub.stripe_subscription_id) {
    try {
      await resumeStripeSubscription(sub.stripe_subscription_id, sub.end_date)
    } catch (e) {
      return NextResponse.json(
        { error: `Stripe resume failed: ${e instanceof Error ? e.message : e}` },
        { status: 502 },
      )
    }
  }

  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'active',
      paused_until: null,
    })
    .eq('id', id)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/subscriptions/[id]/pause/route.ts src/app/api/admin/subscriptions/[id]/resume/route.ts
git commit -m "feat(api): subscription pause/resume endpoints"
```

---

## Task 9: Customer Portal endpoint for card collection

**Files:**
- Create: `src/app/api/admin/subscriptions/[id]/customer-portal/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/admin/subscriptions/[id]/customer-portal/route.ts`:
```ts
// ── POST /api/admin/subscriptions/[id]/customer-portal ──────────────
// Generates a Stripe Customer Portal session URL for adding/updating
// payment methods. Used to send a magic link to the client when a
// subscription has a future start date and no card on file yet.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createCustomerPortalSession } from '@/lib/stripe-subscriptions'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('id, prospect_id, stripe_subscription_id')
    .eq('id', id)
    .single()

  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })

  try {
    const url = await createCustomerPortalSession(
      sub.prospect_id,
      `https://demandsignals.co/admin/subscriptions/${id}`,
    )
    return NextResponse.json({ url })
  } catch (e) {
    return NextResponse.json(
      { error: `Portal session failed: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    )
  }
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/subscriptions/[id]/customer-portal/route.ts
git commit -m "feat(api): subscription customer-portal endpoint for card collection"
```

---

## Task 10: Webhook handlers for subscription pause/resume

**Files:**
- Modify: `src/app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Add pause/resume cases**

In `src/app/api/webhooks/stripe/route.ts`, find the `handleEvent` switch. Add two new cases (after `customer.subscription.deleted`):
```ts
    case 'customer.subscription.paused': {
      const sub = event.data.object as Stripe.Subscription
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'paused' })
        .eq('stripe_subscription_id', sub.id)
      return
    }

    case 'customer.subscription.resumed': {
      const sub = event.data.object as Stripe.Subscription
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'active', paused_until: null })
        .eq('stripe_subscription_id', sub.id)
      return
    }
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/webhooks/stripe/route.ts
git commit -m "feat(stripe): webhook handles subscription paused/resumed events"
```

---

## Task 11: Add Pause/Resume + cycle remaining + portal-link to subscription detail page

**Files:**
- Modify: `src/app/admin/subscriptions/[id]/page.tsx`

- [ ] **Step 1: Read the current page**

Read `src/app/admin/subscriptions/[id]/page.tsx` to understand its structure (server vs client component).

- [ ] **Step 2: Add a client-side action panel**

If the page is a server component, create a client subcomponent. Create `src/app/admin/subscriptions/[id]/SubscriptionActionPanel.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  subscription: {
    id: string
    status: string
    stripe_subscription_id: string | null
    cycle_cap: number | null
    end_date: string | null
    paused_until: string | null
  }
}

export function SubscriptionActionPanel({ subscription }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [pauseDays, setPauseDays] = useState(30)
  const [pauseReason, setPauseReason] = useState('')

  async function handlePause() {
    if (!confirm(`Pause for ${pauseDays} days?`)) return
    setBusy(true)
    const res = await fetch(`/api/admin/subscriptions/${subscription.id}/pause`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ duration_days: pauseDays, reason: pauseReason }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) return alert(`Failed: ${data.error}`)
    alert(`Paused. New end date: ${data.new_end_date ?? '(open-ended)'}`)
    router.refresh()
  }

  async function handleResume() {
    if (!confirm('Resume subscription?')) return
    setBusy(true)
    const res = await fetch(`/api/admin/subscriptions/${subscription.id}/resume`, { method: 'POST' })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) return alert(`Failed: ${data.error}`)
    alert('Resumed.')
    router.refresh()
  }

  async function handlePortalLink() {
    setBusy(true)
    const res = await fetch(`/api/admin/subscriptions/${subscription.id}/customer-portal`, { method: 'POST' })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) return alert(`Failed: ${data.error}`)
    await navigator.clipboard.writeText(data.url)
    alert(`Customer portal link copied to clipboard:\n${data.url}\n\nSend to client to add a payment method.`)
  }

  const isPaused = subscription.status === 'paused'
  const isCanceled = subscription.status === 'canceled'

  return (
    <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fafbfc' }}>
      <h3 style={{ margin: 0, marginBottom: 12, fontSize: 14, fontWeight: 700 }}>Actions</h3>

      {/* Cycle cap display */}
      {subscription.cycle_cap !== null && (
        <p style={{ fontSize: 13, color: '#5d6780', marginBottom: 12 }}>
          Capped at {subscription.cycle_cap} cycles. End date: {subscription.end_date ? new Date(subscription.end_date).toLocaleDateString() : '—'}
        </p>
      )}

      {/* Paused indicator */}
      {isPaused && subscription.paused_until && (
        <p style={{ fontSize: 13, color: '#f28500', marginBottom: 12 }}>
          ⏸ Paused until {new Date(subscription.paused_until).toLocaleDateString()}
        </p>
      )}

      {/* Pause/Resume */}
      {!isCanceled && (
        <div style={{ marginBottom: 12 }}>
          {isPaused ? (
            <button onClick={handleResume} disabled={busy}
              style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 0, borderRadius: 6, fontSize: 13, fontWeight: 600 }}
            >Resume Subscription</button>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12 }}>Pause for</label>
                <input type="number" min="1" max="365" value={pauseDays}
                  onChange={(e) => setPauseDays(parseInt(e.target.value, 10) || 30)}
                  style={{ width: 70, padding: 4, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
                />
                <label style={{ fontSize: 12 }}>days</label>
                <input value={pauseReason} placeholder="Reason (optional)"
                  onChange={(e) => setPauseReason(e.target.value)}
                  style={{ flex: 1, padding: 4, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
                />
              </div>
              <button onClick={handlePause} disabled={busy}
                style={{ padding: '8px 16px', background: '#f28500', color: '#fff', border: 0, borderRadius: 6, fontSize: 13, fontWeight: 600 }}
              >Pause Subscription</button>
            </div>
          )}
        </div>
      )}

      {/* Customer portal link */}
      {subscription.stripe_subscription_id && !isCanceled && (
        <button onClick={handlePortalLink} disabled={busy}
          style={{ padding: '8px 16px', background: '#68c5ad', color: '#fff', border: 0, borderRadius: 6, fontSize: 13, fontWeight: 600 }}
        >Generate "Add Payment Method" link</button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Embed the panel in the subscription detail page**

In `src/app/admin/subscriptions/[id]/page.tsx`, import and render the panel:
```tsx
import { SubscriptionActionPanel } from './SubscriptionActionPanel'

// In JSX, add somewhere appropriate (e.g. sidebar or footer area):
<SubscriptionActionPanel subscription={{
  id: sub.id,
  status: sub.status,
  stripe_subscription_id: sub.stripe_subscription_id,
  cycle_cap: sub.cycle_cap,
  end_date: sub.end_date,
  paused_until: sub.paused_until,
}} />
```

- [ ] **Step 4: Build to verify**

Run: `npm run build`
Expected: zero errors. If page already had its own action panel, integrate carefully — don't duplicate Cancel button.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/subscriptions/[id]/SubscriptionActionPanel.tsx src/app/admin/subscriptions/[id]/page.tsx
git commit -m "feat(admin): subscription detail Pause/Resume + cycle remaining + customer portal link"
```

---

## Task 12: End-to-end test — SOW-MOME with Stripe subscription

**Files:**
- No code changes. Manual test.

This re-tests the SOW-MOME case with the Stripe subscription wired in.

- [ ] **Step 1: Push all Plan C commits**

```bash
git push origin master
```

Wait for Vercel deploy.

- [ ] **Step 2: If SOW-MOME was already converted in Plan B, void & re-create**

Easiest path: in the database, set the SOW back to `sent` and delete the existing payment_schedule + project + invoices + trade_credits + subscriptions for that SOW. Or use a different test SOW.

Alternatively: open a NEW SOW for testing (any prospect with a client_code).

- [ ] **Step 3: Convert with subscription this time**

Open the SOW. Click Convert. Configure modal:
- TIK: as before
- Subscriptions section: should auto-populate from any monthly/quarterly/annual deliverables in SOW phases. If empty, click "+ Add subscription" and configure: $20.00, monthly, start date = first of next month, cycle cap = 24
- Payment plan: 2× $250 cash split over 30 days
- Send invoices: ✓
- Click Convert

- [ ] **Step 4: Verify Stripe-side state**

In Stripe dashboard:
- Customers → find the test customer → confirm subscription exists with status `trialing` (if start date is in the future) or `active`
- Subscriptions → confirm `cancel_at` is set to start_date + 24 months
- Subscriptions → confirm trial_end matches the start date

In DSIG:
- `/admin/subscriptions/[id]` — `stripe_subscription_id` populated, status `trialing`, `cycle_cap=24`, `end_date` populated

- [ ] **Step 5: Test pause/resume**

On `/admin/subscriptions/[id]`:
- Click "Pause Subscription" with 30 days reason "Testing"
- Verify Stripe subscription `pause_collection.behavior = 'void'`
- Verify DSIG `paused_until` is today+30, `end_date` pushed +30 days
- Click "Resume Subscription"
- Verify Stripe pause cleared
- Verify DSIG `paused_until=null`, status back to `active`

- [ ] **Step 6: Test customer portal link**

On `/admin/subscriptions/[id]`, click "Generate Add Payment Method link". Verify URL appears in alert. Open it in incognito → verify Stripe Customer Portal renders.

- [ ] **Step 7: Test webhook for subscription paused/resumed**

Use Stripe dashboard → click into subscription → Pause via Stripe UI directly (not via DSIG).
Verify `customer.subscription.paused` event lands; check `stripe_events` table; check DSIG subscription status went to `paused`.

Same for Resume via Stripe UI.

---

## Task 13: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Append to §10 What Is Complete**

```markdown
- [x] Stripe Plan C (subscriptions + caps + pause): subscriptions.cycle_cap + paused_until added; convertSowToProject creates real Stripe subscriptions with trial_end (future starts) + cancel_at (capped terms); admin Pause/Resume endpoints push end_date forward to preserve total contract value; Customer Portal magic link for card collection; webhook handles customer.subscription.paused/resumed; ConvertModal supports subscription rows with cycle cap + already_activated backfill.
```

- [ ] **Step 2: Update §11 Open Work — remove items now done**

Find and delete (or mark with strikethrough):
> "Subscription billing through Stripe — extend beyond what's there so recurring retainers (Essential/Growth/Full tiers) are billed by Stripe directly..."

(This was option C from the original brainstorm; it's done now.)

- [ ] **Step 3: Commit + push**

```bash
git add CLAUDE.md
git commit -m "docs: mark Plan C complete (Stripe subscriptions live)"
git push origin master
```

---

## Plan C complete — all three plans shipped

After this plan:
- `convertSowToProject` creates real Stripe subscriptions for recurring deliverables
- Subscriptions support future start dates (Stripe `trial_end`)
- Subscriptions support capped terms (Stripe `cancel_at`)
- Admin can pause/resume from `/admin/subscriptions/[id]`
- Pause pushes end_date forward, preserving total contract value
- Customer Portal magic link allows clients to add payment methods
- Webhook fully syncs subscription lifecycle events

Combined with Plans A and B:
- Every outstanding cash invoice is payable via magic link
- SOW-MOME-042426A end-to-end works with split deposit + TIK + Stripe subscription
- Hangtown end-to-end works with milestone triggers + cascade TIK + hosting subscription
- Receipts auto-issue on every payment event
- Time-triggered installments fire via daily cron
- Phase completion fires milestone-triggered installments
- Cash payment cascade fires `on_completion_of_payment` triggers (TIK or other cash)
