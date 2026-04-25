# Plan B — Payment plans + SOW conversion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin can convert any saved SOW into a project + payment plan + invoices via one button. Payment plans support multi-installment cash + TIK with triggers (on_acceptance, time, milestone, on_completion_of_payment). Public SOW Accept route refactored to share the same orchestrator. Cron fires time-triggered installments. Phase completion fires milestone-triggered installments. Webhook fires payment-completion cascades. Backfill mode supports historical clients (Hangtown).

**Architecture:** Two new tables (`payment_schedules`, `payment_installments`). One new orchestrator module (`src/lib/payment-plans.ts`) called from both the new admin convert endpoint and the existing public SOW accept endpoint. New admin convert modal. Webhook handler extended to fire payment-completion cascades. New daily cron for time-triggered installments. Phase-complete endpoint extended to fire milestone-triggered installments.

**Tech Stack:** Same as Plan A. Adds Vercel cron via `vercel.json`.

**Spec:** `docs/superpowers/specs/2026-04-24-stripe-payment-plans-design.md`

**Depends on:** Plan A complete (Stripe activation done; receipts auto-issue).

---

## File Structure

**New SQL migration files:**
- `supabase/migrations/025a_payment_schedules.sql` — `payment_schedules` + `payment_installments` tables + indexes
- `supabase/migrations/025b_sow_change_orders.sql` — `sow_documents.parent_sow_id`
- `supabase/migrations/025d_invoice_installment_link.sql` — `invoices.payment_installment_id`
- `supabase/migrations/025e_receipts_tik_method.sql` — extend `receipts.payment_method` enum
- `supabase/migrations/APPLY-025-2026-04-24.sql` — bundled apply file

(025c is reserved for Plan C — `subscriptions` cycle_cap + paused_until.)

**New TypeScript files:**
- `src/lib/payment-plan-types.ts` — TS types for payment plans (separate from `invoice-types.ts` to keep file sizes manageable)
- `src/lib/payment-plans.ts` — orchestrator: `convertSowToProject`, `firePaymentInstallment`, `cascadeOnPayment`, `markInstallmentPaid`
- `src/app/api/admin/sow/[id]/convert/route.ts` — POST endpoint that calls `convertSowToProject`
- `src/app/api/admin/payment-schedules/[id]/route.ts` — GET/PATCH for editing unpaid plans
- `src/app/api/admin/sow/[id]/change-order/route.ts` — POST creates mini-SOW with `parent_sow_id`
- `src/app/api/admin/trade-credits/[id]/drawdown/route.ts` — POST for TIK drawdowns + RCT receipt
- `src/app/api/cron/payment-triggers/route.ts` — daily cron handler
- `src/app/admin/sow/[id]/ConvertModal.tsx` — client component for the convert modal
- `src/app/admin/payment-schedules/[id]/page.tsx` — admin view of a payment schedule

**Modified TypeScript files:**
- `src/lib/invoice-types.ts` — re-export from new `payment-plan-types.ts` for convenience
- `src/lib/stripe-sync.ts` — `markInvoicePaidFromStripe` already updated in Plan A; add `findInstallmentForInvoice()` helper
- `src/app/api/sow/public/[number]/accept/route.ts` — refactor to call `convertSowToProject` with synthesized single-installment plan
- `src/app/api/admin/projects/[id]/phases/[phaseId]/route.ts` — fire milestone-triggered installments after phase completion
- `src/app/api/webhooks/stripe/route.ts` — call `cascadeOnPayment` after `markInvoicePaidFromStripe` for cash payments
- `src/app/admin/sow/[id]/page.tsx` — add "Convert SOW to Project" button (always visible)
- `vercel.json` — add cron config for `/api/cron/payment-triggers`

---

## Task 1: Read prerequisites

- [ ] **Step 1: Read the spec sections relevant to Plan B**

Read in `docs/superpowers/specs/2026-04-24-stripe-payment-plans-design.md`:
- §3 (locked decisions)
- §4 (user flow)
- §5 (data model)
- §6 (API endpoints)
- §7 (server flow — `convertSowToProject`)
- §10 (migration of existing code)

- [ ] **Step 2: Read existing code that Plan B touches**

Read in full:
- `src/app/api/sow/public/[number]/accept/route.ts` — the current accept lifecycle (will be refactored)
- `src/lib/invoice-types.ts` — type conventions
- `src/lib/doc-numbering.ts` — `allocateDocNumber()` API
- `src/lib/stripe-sync.ts` — Stripe helpers (post-Plan-A state)
- `src/app/api/admin/projects/[id]/phases/[phaseId]/route.ts` — phase-complete endpoint
- `supabase/migrations/APPLY-024-2026-04-24.sql` — most recent applied migration to see conventions

- [ ] **Step 3: Confirm Plan A is committed and Stripe is activated**

Check:
```bash
git log --oneline | head -10
```
Expected: see Plan A commits ("feat(stripe): save card on Payment Link payment", "feat(stripe): auto-issue RCT receipts", "fix(invoice): always render Pay button"). If absent, STOP and run Plan A first.

```bash
curl -s https://demandsignals.co/admin/settings 2>&1 | head -5
```
(This won't work without auth — instead just confirm via your knowledge that Plan A finished.)

---

## Task 2: Create migration 025a — payment_schedules + payment_installments

**Files:**
- Create: `supabase/migrations/025a_payment_schedules.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/025a_payment_schedules.sql` with content:
```sql
-- ── 025a_payment_schedules.sql ─────────────────────────────────────
-- Adds payment_schedules + payment_installments tables.
-- See docs/superpowers/specs/2026-04-24-stripe-payment-plans-design.md §5.
--
-- A payment_schedule belongs to one SOW + (optionally) one project.
-- It owns N payment_installments, each with its own currency, trigger,
-- amount, and status. Sum of installment amounts must match schedule
-- total_cents (enforced in app code, not DB).

CREATE TABLE IF NOT EXISTS payment_schedules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sow_document_id  UUID NOT NULL REFERENCES sow_documents(id) ON DELETE CASCADE,
  project_id       UUID REFERENCES projects(id) ON DELETE SET NULL,
  total_cents      INT NOT NULL CHECK (total_cents >= 0),
  locked_at        TIMESTAMPTZ,  -- set when first installment moves to 'paid'; blocks edits
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_schedules_sow ON payment_schedules(sow_document_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_project ON payment_schedules(project_id);

CREATE TABLE IF NOT EXISTS payment_installments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id              UUID NOT NULL REFERENCES payment_schedules(id) ON DELETE CASCADE,
  sequence                 INT NOT NULL,
  amount_cents             INT NOT NULL CHECK (amount_cents > 0),
  amount_paid_cents        INT NOT NULL DEFAULT 0 CHECK (amount_paid_cents >= 0),
  currency_type            TEXT NOT NULL CHECK (currency_type IN ('cash','tik')),
  expected_payment_method  TEXT CHECK (
    expected_payment_method IS NULL
    OR expected_payment_method IN ('card','check','wire','ach','unspecified')
  ),
  trigger_type             TEXT NOT NULL CHECK (
    trigger_type IN ('on_acceptance','time','milestone','on_completion_of_payment')
  ),
  trigger_date             DATE,
  trigger_milestone_id     UUID,  -- references project_phases.id (no FK; phases stored as JSONB on projects)
  trigger_payment_id       UUID REFERENCES payment_installments(id) ON DELETE SET NULL,
  status                   TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending','invoice_issued','partially_paid','paid','tik_open','cancelled')
  ),
  invoice_id               UUID REFERENCES invoices(id) ON DELETE SET NULL,
  trade_credit_id          UUID REFERENCES trade_credits(id) ON DELETE SET NULL,
  description              TEXT,
  fired_at                 TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_payment_installments_schedule
  ON payment_installments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_payment_installments_status
  ON payment_installments(status);
CREATE INDEX IF NOT EXISTS idx_payment_installments_trigger_time
  ON payment_installments(trigger_type, trigger_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_installments_trigger_milestone
  ON payment_installments(trigger_milestone_id) WHERE trigger_type = 'milestone' AND status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_installments_trigger_payment
  ON payment_installments(trigger_payment_id) WHERE trigger_type = 'on_completion_of_payment' AND status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_installments_invoice
  ON payment_installments(invoice_id) WHERE invoice_id IS NOT NULL;

-- RLS: service_role only (matches existing payment-touching tables like invoices)
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Verify file syntax**

Read the file you just wrote to confirm no typos.

- [ ] **Step 3: Commit (do not apply yet — apply happens in bundled APPLY file later)**

```bash
git add supabase/migrations/025a_payment_schedules.sql
git commit -m "feat(db): migration 025a — payment_schedules + payment_installments"
```

---

## Task 3: Create migration 025b — sow_documents.parent_sow_id

**Files:**
- Create: `supabase/migrations/025b_sow_change_orders.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/025b_sow_change_orders.sql`:
```sql
-- ── 025b_sow_change_orders.sql ──────────────────────────────────────
-- Adds parent_sow_id to sow_documents for change-order support.
-- A mini-SOW issued mid-engagement carries parent_sow_id pointing
-- at the original. Both SOWs attach to the same project.

ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS parent_sow_id UUID REFERENCES sow_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sow_documents_parent ON sow_documents(parent_sow_id)
  WHERE parent_sow_id IS NOT NULL;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/025b_sow_change_orders.sql
git commit -m "feat(db): migration 025b — sow_documents.parent_sow_id for change orders"
```

---

## Task 4: Create migration 025d — invoices.payment_installment_id

**Files:**
- Create: `supabase/migrations/025d_invoice_installment_link.sql`

(025c reserved for Plan C — leaving the slot to keep migrations grouped logically.)

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/025d_invoice_installment_link.sql`:
```sql
-- ── 025d_invoice_installment_link.sql ──────────────────────────────
-- Adds payment_installment_id to invoices so generated invoices link
-- back to the installment row that fired them. Used by webhook cascade
-- to find the installment when a Stripe payment completes.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_installment_id UUID
    REFERENCES payment_installments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_payment_installment ON invoices(payment_installment_id)
  WHERE payment_installment_id IS NOT NULL;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/025d_invoice_installment_link.sql
git commit -m "feat(db): migration 025d — invoices.payment_installment_id"
```

---

## Task 5: Create migration 025e — receipts.payment_method extension

**Files:**
- Create: `supabase/migrations/025e_receipts_tik_method.sql`

- [ ] **Step 1: Find the current CHECK constraint on receipts.payment_method**

Run via Supabase SQL Editor:
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'receipts'::regclass
  AND contype = 'c';
```
Note the constraint name and current allowed values.

(If receipts table has no CHECK constraint on payment_method — i.e., it's a free-form TEXT — skip the constraint replacement and just document in this migration that 'tik' is now an allowed value by convention.)

- [ ] **Step 2: Create the migration file**

Create `supabase/migrations/025e_receipts_tik_method.sql` with:
```sql
-- ── 025e_receipts_tik_method.sql ────────────────────────────────────
-- Extends receipts.payment_method to allow 'tik' for trade-in-kind
-- service-rendered receipts.
--
-- If receipts has a CHECK constraint on payment_method, replace it.
-- If not, this migration is a no-op documentation marker.

DO $$
DECLARE
  conname_to_drop TEXT;
BEGIN
  SELECT conname INTO conname_to_drop
  FROM pg_constraint
  WHERE conrelid = 'receipts'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%payment_method%';

  IF conname_to_drop IS NOT NULL THEN
    EXECUTE format('ALTER TABLE receipts DROP CONSTRAINT %I', conname_to_drop);
  END IF;
END $$;

ALTER TABLE receipts
  ADD CONSTRAINT receipts_payment_method_check
  CHECK (payment_method IN (
    'check', 'wire', 'stripe', 'cash', 'trade', 'tik', 'zero_balance', 'ach', 'card', 'manual_card', 'other'
  ));
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/025e_receipts_tik_method.sql
git commit -m "feat(db): migration 025e — extend receipts.payment_method to include 'tik'"
```

---

## Task 6: Create the bundled APPLY-025 file

**Files:**
- Create: `supabase/migrations/APPLY-025-2026-04-24.sql`

Per CLAUDE.md convention, the APPLY file concatenates the individual migrations for one-shot apply via Supabase SQL Editor.

- [ ] **Step 1: Create the bundle**

Create `supabase/migrations/APPLY-025-2026-04-24.sql`:
```sql
-- ════════════════════════════════════════════════════════════════════
-- APPLY-025-2026-04-24.sql
-- Run this in Supabase SQL Editor to apply migrations 025a–025e in order.
-- Idempotent: each migration uses IF NOT EXISTS / IF NOT NULL guards.
--
-- Adds: payment_schedules + payment_installments tables, sow_documents.
-- parent_sow_id, invoices.payment_installment_id, receipts.payment_method
-- extended to include 'tik'.
-- ════════════════════════════════════════════════════════════════════

\i 025a_payment_schedules.sql
\i 025b_sow_change_orders.sql
\i 025d_invoice_installment_link.sql
\i 025e_receipts_tik_method.sql
```

(Note: backslash-i is a psql command. If running in Supabase web SQL Editor instead of psql, you must paste the contents of each file in order. Document this in the file header.)

Replace the file with the actual concatenated SQL for Supabase web-editor compatibility:
```sql
-- ════════════════════════════════════════════════════════════════════
-- APPLY-025-2026-04-24.sql
-- Run this in Supabase SQL Editor (web) to apply migrations 025a–025e.
-- Idempotent: each block uses IF NOT EXISTS guards.
-- ════════════════════════════════════════════════════════════════════

-- ── 025a_payment_schedules.sql ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_schedules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sow_document_id  UUID NOT NULL REFERENCES sow_documents(id) ON DELETE CASCADE,
  project_id       UUID REFERENCES projects(id) ON DELETE SET NULL,
  total_cents      INT NOT NULL CHECK (total_cents >= 0),
  locked_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_sow ON payment_schedules(sow_document_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_project ON payment_schedules(project_id);

CREATE TABLE IF NOT EXISTS payment_installments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id              UUID NOT NULL REFERENCES payment_schedules(id) ON DELETE CASCADE,
  sequence                 INT NOT NULL,
  amount_cents             INT NOT NULL CHECK (amount_cents > 0),
  amount_paid_cents        INT NOT NULL DEFAULT 0 CHECK (amount_paid_cents >= 0),
  currency_type            TEXT NOT NULL CHECK (currency_type IN ('cash','tik')),
  expected_payment_method  TEXT CHECK (
    expected_payment_method IS NULL
    OR expected_payment_method IN ('card','check','wire','ach','unspecified')
  ),
  trigger_type             TEXT NOT NULL CHECK (
    trigger_type IN ('on_acceptance','time','milestone','on_completion_of_payment')
  ),
  trigger_date             DATE,
  trigger_milestone_id     UUID,
  trigger_payment_id       UUID REFERENCES payment_installments(id) ON DELETE SET NULL,
  status                   TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending','invoice_issued','partially_paid','paid','tik_open','cancelled')
  ),
  invoice_id               UUID REFERENCES invoices(id) ON DELETE SET NULL,
  trade_credit_id          UUID REFERENCES trade_credits(id) ON DELETE SET NULL,
  description              TEXT,
  fired_at                 TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, sequence)
);
CREATE INDEX IF NOT EXISTS idx_payment_installments_schedule ON payment_installments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_payment_installments_status ON payment_installments(status);
CREATE INDEX IF NOT EXISTS idx_payment_installments_trigger_time ON payment_installments(trigger_type, trigger_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_installments_trigger_milestone ON payment_installments(trigger_milestone_id) WHERE trigger_type = 'milestone' AND status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_installments_trigger_payment ON payment_installments(trigger_payment_id) WHERE trigger_type = 'on_completion_of_payment' AND status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_installments_invoice ON payment_installments(invoice_id) WHERE invoice_id IS NOT NULL;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;

-- ── 025b_sow_change_orders.sql ──────────────────────────────────────
ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS parent_sow_id UUID REFERENCES sow_documents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sow_documents_parent ON sow_documents(parent_sow_id) WHERE parent_sow_id IS NOT NULL;

-- ── 025d_invoice_installment_link.sql ──────────────────────────────
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_installment_id UUID REFERENCES payment_installments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_payment_installment ON invoices(payment_installment_id) WHERE payment_installment_id IS NOT NULL;

-- ── 025e_receipts_tik_method.sql ────────────────────────────────────
DO $$
DECLARE
  conname_to_drop TEXT;
BEGIN
  SELECT conname INTO conname_to_drop
  FROM pg_constraint
  WHERE conrelid = 'receipts'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%payment_method%';
  IF conname_to_drop IS NOT NULL THEN
    EXECUTE format('ALTER TABLE receipts DROP CONSTRAINT %I', conname_to_drop);
  END IF;
END $$;
ALTER TABLE receipts
  ADD CONSTRAINT receipts_payment_method_check
  CHECK (payment_method IN (
    'check', 'wire', 'stripe', 'cash', 'trade', 'tik', 'zero_balance', 'ach', 'card', 'manual_card', 'other'
  ));
```

- [ ] **Step 2: Apply the migration in Supabase**

Open Supabase SQL Editor for project `uoekjqkawssbskfkziwz`. Copy the entire contents of `APPLY-025-2026-04-24.sql` and execute. Expected: success, no errors.

If any error: STOP. Read the error. Common causes:
- Constraint already exists with conflicting definition → manually drop first, then re-run
- FK target table doesn't exist → check that `sow_documents`, `projects`, `invoices`, `trade_credits` all exist (they should, per existing migrations)

- [ ] **Step 3: Verify tables exist**

In SQL Editor, run:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('payment_schedules', 'payment_installments')
ORDER BY table_name;
```
Expected: both rows returned.

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'sow_documents' AND column_name = 'parent_sow_id';
```
Expected: one row.

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'invoices' AND column_name = 'payment_installment_id';
```
Expected: one row.

- [ ] **Step 4: Wait 30 seconds for PostgREST schema cache refresh**

Per CLAUDE.md §12, after applying a migration the PostgREST schema cache needs ~30 seconds to pick up the new columns. Wait before running app-level queries.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/APPLY-025-2026-04-24.sql
git commit -m "feat(db): bundled APPLY-025 migration (payment plans)"
```

---

## Task 7: Create payment-plan-types.ts

**Files:**
- Create: `src/lib/payment-plan-types.ts`

Separating these from `invoice-types.ts` keeps both files manageable and groups payment-plan concepts together.

- [ ] **Step 1: Create the file**

Create `src/lib/payment-plan-types.ts`:
```ts
// ── Payment plan TypeScript types ───────────────────────────────────
// Mirror of payment_schedules + payment_installments DB tables.
// See docs/superpowers/specs/2026-04-24-stripe-payment-plans-design.md §5.

export type CurrencyType = 'cash' | 'tik'

export type ExpectedPaymentMethod =
  | 'card'
  | 'check'
  | 'wire'
  | 'ach'
  | 'unspecified'

export type TriggerType =
  | 'on_acceptance'
  | 'time'
  | 'milestone'
  | 'on_completion_of_payment'

export type InstallmentStatus =
  | 'pending'
  | 'invoice_issued'
  | 'partially_paid'
  | 'paid'
  | 'tik_open'
  | 'cancelled'

export interface PaymentSchedule {
  id: string
  sow_document_id: string
  project_id: string | null
  total_cents: number
  locked_at: string | null
  created_at: string
}

export interface PaymentInstallment {
  id: string
  schedule_id: string
  sequence: number
  amount_cents: number
  amount_paid_cents: number
  currency_type: CurrencyType
  expected_payment_method: ExpectedPaymentMethod | null
  trigger_type: TriggerType
  trigger_date: string | null
  trigger_milestone_id: string | null
  trigger_payment_id: string | null
  status: InstallmentStatus
  invoice_id: string | null
  trade_credit_id: string | null
  description: string | null
  fired_at: string | null
  created_at: string
}

// ── Conversion request body types ──────────────────────────────────

export interface ConvertSowAcceptance {
  signed_by: string
  accepted_at: string  // ISO date or full timestamp
  method: 'in_person' | 'phone' | 'email' | 'magic_link'
}

export interface ConvertSowAlreadyPaid {
  paid_date: string  // ISO date
  paid_method: 'check' | 'wire' | 'cash' | 'card' | 'ach' | 'other'
  reference?: string
}

export interface ConvertSowPaymentInstallmentSpec {
  sequence: number
  amount_cents: number
  currency_type: CurrencyType
  expected_payment_method?: ExpectedPaymentMethod
  trigger_type: TriggerType
  trigger_date?: string             // for trigger_type='time'
  trigger_milestone_id?: string     // for trigger_type='milestone'
  trigger_payment_sequence?: number // for trigger_type='on_completion_of_payment'; resolved server-side to ID
  description?: string
  already_paid?: ConvertSowAlreadyPaid
}

export interface ConvertSowSubscriptionSpec {
  deliverable_id: string  // refers to a SowPhaseDeliverable.id
  amount_cents: number
  interval: 'month' | 'quarter' | 'year'
  start_date: string      // ISO date
  cycle_cap?: number      // null/undefined = open-ended (Plan C)
  already_activated?: boolean
}

export interface ConvertSowTikSpec {
  amount_cents: number
  description: string
  trigger_type: 'on_acceptance' | 'milestone' | 'on_completion_of_payment'
  trigger_milestone_id?: string
  trigger_payment_sequence?: number
}

export interface ConvertSowRequest {
  acceptance: ConvertSowAcceptance
  payment_plan: ConvertSowPaymentInstallmentSpec[]
  subscriptions: ConvertSowSubscriptionSpec[]
  tik?: ConvertSowTikSpec
  send_invoices: boolean
  force?: boolean  // required when SOW status is declined/void
}

// ── Conversion response ────────────────────────────────────────────

export interface ConvertSowResult {
  project_id: string
  payment_schedule_id: string
  installments: Array<{
    id: string
    sequence: number
    status: InstallmentStatus
    invoice_id: string | null
    invoice_number: string | null
    public_url: string | null
  }>
  subscriptions: Array<{
    id: string
    stripe_subscription_id: string | null
    status: string
  }>
  trade_credit_id: string | null
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/payment-plan-types.ts
git commit -m "feat(types): payment-plan-types module with all conversion request/response types"
```

---

## Task 8: Create payment-plans.ts orchestrator (skeleton + helpers)

**Files:**
- Create: `src/lib/payment-plans.ts`

This module owns the entire SOW conversion flow. It's the only place that mutates `payment_schedules`, `payment_installments`, and orchestrates downstream invoice/subscription/TIK creation.

The full module is large; we'll build it in pieces across several tasks.

- [ ] **Step 1: Create the file with imports + the validate function**

Create `src/lib/payment-plans.ts`:
```ts
// ── payment-plans.ts ────────────────────────────────────────────────
// SOW → Project conversion orchestrator + payment-plan lifecycle.
// See docs/superpowers/specs/2026-04-24-stripe-payment-plans-design.md §7.
//
// Public API:
//   convertSowToProject(sowId, body) — orchestrator (Task 9)
//   firePaymentInstallment(installmentId, options?) — fires one row (Task 10)
//   cascadeOnPayment(installmentId) — fires dependent rows (Task 11)
//   markInstallmentPaid(installmentId, amountCents) — updates status (Task 11)
//   findInstallmentForInvoice(invoiceId) — webhook helper (Task 11)

import { supabaseAdmin } from '@/lib/supabase/admin'
import { allocateDocNumber } from '@/lib/doc-numbering'
import type {
  ConvertSowRequest,
  ConvertSowResult,
  ConvertSowPaymentInstallmentSpec,
  PaymentInstallment,
} from './payment-plan-types'
import type { SowDocument, SowPhase, SowPricing } from './invoice-types'

// ── Validation ──────────────────────────────────────────────────────

export class PaymentPlanValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PaymentPlanValidationError'
  }
}

/**
 * Validates that the payment plan is internally consistent.
 * Returns nothing on success; throws PaymentPlanValidationError on failure.
 *
 * Checks:
 *   - sequences are unique and 1-indexed
 *   - sum of cash amounts == expected cash total
 *   - trigger_payment_sequence references a sequence that exists in the same plan
 *   - trigger_milestone_id references a phase id that exists on the SOW
 *   - on_completion_of_payment cannot reference a higher sequence number (no cycles)
 *   - time triggers have a trigger_date
 *   - milestone triggers have a trigger_milestone_id
 *   - on_completion_of_payment triggers have a trigger_payment_sequence
 */
export function validatePaymentPlan(
  plan: ConvertSowPaymentInstallmentSpec[],
  expectedCashTotalCents: number,
  sowPhases: SowPhase[],
): void {
  if (plan.length === 0) {
    throw new PaymentPlanValidationError('Payment plan must have at least one installment')
  }

  const sequences = plan.map((p) => p.sequence)
  const uniqueSeqs = new Set(sequences)
  if (uniqueSeqs.size !== sequences.length) {
    throw new PaymentPlanValidationError('Installment sequences must be unique')
  }

  const phaseIds = new Set<string>()
  for (const phase of sowPhases) phaseIds.add(phase.id)

  let cashSum = 0
  for (const p of plan) {
    if (p.amount_cents <= 0) {
      throw new PaymentPlanValidationError(`Installment ${p.sequence}: amount must be positive`)
    }
    if (p.currency_type === 'cash') cashSum += p.amount_cents

    switch (p.trigger_type) {
      case 'on_acceptance':
        // No additional fields required.
        break
      case 'time':
        if (!p.trigger_date) {
          throw new PaymentPlanValidationError(
            `Installment ${p.sequence}: time trigger requires trigger_date`,
          )
        }
        break
      case 'milestone':
        if (!p.trigger_milestone_id) {
          throw new PaymentPlanValidationError(
            `Installment ${p.sequence}: milestone trigger requires trigger_milestone_id`,
          )
        }
        if (!phaseIds.has(p.trigger_milestone_id)) {
          throw new PaymentPlanValidationError(
            `Installment ${p.sequence}: trigger_milestone_id "${p.trigger_milestone_id}" not found in SOW phases`,
          )
        }
        break
      case 'on_completion_of_payment':
        if (typeof p.trigger_payment_sequence !== 'number') {
          throw new PaymentPlanValidationError(
            `Installment ${p.sequence}: on_completion_of_payment trigger requires trigger_payment_sequence`,
          )
        }
        if (!uniqueSeqs.has(p.trigger_payment_sequence)) {
          throw new PaymentPlanValidationError(
            `Installment ${p.sequence}: trigger_payment_sequence ${p.trigger_payment_sequence} not found in plan`,
          )
        }
        if (p.trigger_payment_sequence >= p.sequence) {
          throw new PaymentPlanValidationError(
            `Installment ${p.sequence}: trigger_payment_sequence must reference an earlier sequence`,
          )
        }
        break
    }
  }

  if (cashSum !== expectedCashTotalCents) {
    throw new PaymentPlanValidationError(
      `Cash total mismatch: plan sums to $${(cashSum / 100).toFixed(2)} but expected $${(expectedCashTotalCents / 100).toFixed(2)}`,
    )
  }
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/payment-plans.ts
git commit -m "feat(payment-plans): module skeleton + validatePaymentPlan"
```

---

## Task 9: Add convertSowToProject orchestrator

**Files:**
- Modify: `src/lib/payment-plans.ts` (append)

This is the main entry point. It runs the full SOW-accept lifecycle from admin context (or refactored public-Accept context).

- [ ] **Step 1: Append convertSowToProject + helpers to payment-plans.ts**

Append to `src/lib/payment-plans.ts`:
```ts
// ── Orchestrator: convertSowToProject ────────────────────────────────
// Idempotent on already-converted SOWs (skips done steps via existence checks).
// On any failure during conversion, performs compensating rollback of DB
// inserts (no transactional safety across multi-table writes in Supabase
// JS client — we accept best-effort cleanup).

import { ensureStripeCustomer } from './stripe-sync'
import { getValueStackItems } from './services-catalog'

export async function convertSowToProject(
  sowId: string,
  body: ConvertSowRequest,
): Promise<ConvertSowResult> {
  // ── 1. Load SOW + prospect ────────────────────────────────────────
  const { data: sow, error: sowErr } = await supabaseAdmin
    .from('sow_documents')
    .select('*, prospect:prospects(id, business_name, owner_email, owner_phone, client_code, is_client)')
    .eq('id', sowId)
    .single()

  if (sowErr || !sow) {
    throw new Error(`SOW ${sowId} not found: ${sowErr?.message}`)
  }
  if (!sow.prospect_id) {
    throw new Error('SOW has no prospect — cannot convert')
  }

  const isForceMode = body.force === true
  if (['declined', 'void'].includes(sow.status) && !isForceMode) {
    throw new Error(`SOW status is "${sow.status}" — pass force:true to override`)
  }

  // ── 2. Validate the payment plan ─────────────────────────────────
  const pricing = sow.pricing as SowPricing
  const phases = (sow.phases ?? []) as SowPhase[]
  const tikCents = body.tik?.amount_cents ?? 0
  const expectedCashTotal = pricing.total_cents - tikCents

  validatePaymentPlan(body.payment_plan, expectedCashTotal, phases)

  // ── 3. Idempotency check: existing schedule? ─────────────────────
  const { data: existingSchedule } = await supabaseAdmin
    .from('payment_schedules')
    .select('id, project_id')
    .eq('sow_document_id', sowId)
    .maybeSingle()

  if (existingSchedule && !isForceMode && sow.status === 'accepted') {
    // Already converted — return summary of existing state.
    return await buildConversionResult(existingSchedule.id, existingSchedule.project_id)
  }

  // ── 4. Stamp SOW as accepted ─────────────────────────────────────
  await supabaseAdmin
    .from('sow_documents')
    .update({
      status: 'accepted',
      accepted_at: body.acceptance.accepted_at,
      accepted_signature: body.acceptance.signed_by,
      accepted_ip: null,  // admin-converted — no client IP to record
    })
    .eq('id', sowId)

  // ── 5. Mark prospect as client ───────────────────────────────────
  if (!sow.prospect.is_client) {
    await supabaseAdmin
      .from('prospects')
      .update({ is_client: true, became_client_at: new Date().toISOString() })
      .eq('id', sow.prospect_id)
  }

  // ── 6. Create project ────────────────────────────────────────────
  let projectId: string
  const { data: existingProject } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('sow_document_id', sowId)
    .maybeSingle()

  if (existingProject) {
    projectId = existingProject.id
  } else {
    const projectPhases = phases.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: 'pending',
      completed_at: null,
      deliverables: (p.deliverables ?? []).map((d) => ({
        id: d.id,
        service_id: d.service_id ?? null,
        name: d.name,
        description: d.description,
        cadence: d.cadence ?? 'one_time',
        quantity: d.quantity,
        hours: d.hours,
        unit_price_cents: d.unit_price_cents,
        line_total_cents: d.line_total_cents,
        status: 'pending',
        delivered_at: null,
      })),
    }))

    let monthlyCents = 0
    for (const phase of phases) {
      for (const d of phase.deliverables ?? []) {
        const cents = d.line_total_cents ?? 0
        if (d.cadence === 'monthly') monthlyCents += cents
        else if (d.cadence === 'quarterly') monthlyCents += Math.round(cents / 3)
        else if (d.cadence === 'annual') monthlyCents += Math.round(cents / 12)
      }
    }

    const { data: newProject, error: projErr } = await supabaseAdmin
      .from('projects')
      .insert({
        prospect_id: sow.prospect_id,
        sow_document_id: sowId,
        name: sow.title,
        type: 'website',
        status: 'planning',
        start_date: new Date().toISOString().slice(0, 10),
        target_date: null,
        phases: projectPhases,
        monthly_value: monthlyCents > 0 ? monthlyCents / 100 : null,
        notes: `Auto-created from SOW ${sow.sow_number} via convertSowToProject`,
      })
      .select('id')
      .single()

    if (projErr || !newProject) {
      throw new Error(`Project creation failed: ${projErr?.message}`)
    }
    projectId = newProject.id
  }

  // ── 7. Create payment_schedule ───────────────────────────────────
  let scheduleId: string
  if (existingSchedule) {
    scheduleId = existingSchedule.id
    // Link to project if it wasn't linked
    if (!existingSchedule.project_id) {
      await supabaseAdmin
        .from('payment_schedules')
        .update({ project_id: projectId })
        .eq('id', scheduleId)
    }
  } else {
    const { data: newSchedule, error: schedErr } = await supabaseAdmin
      .from('payment_schedules')
      .insert({
        sow_document_id: sowId,
        project_id: projectId,
        total_cents: pricing.total_cents,
      })
      .select('id')
      .single()

    if (schedErr || !newSchedule) {
      throw new Error(`Payment schedule creation failed: ${schedErr?.message}`)
    }
    scheduleId = newSchedule.id

    // ── 8. Insert payment_installments ─────────────────────────────
    // First pass: insert all rows with NULL trigger_payment_id.
    // Second pass: UPDATE to resolve sequence → id mapping.
    const installmentsToInsert = body.payment_plan.map((p) => ({
      schedule_id: scheduleId,
      sequence: p.sequence,
      amount_cents: p.amount_cents,
      currency_type: p.currency_type,
      expected_payment_method: p.expected_payment_method ?? null,
      trigger_type: p.trigger_type,
      trigger_date: p.trigger_type === 'time' ? p.trigger_date ?? null : null,
      trigger_milestone_id:
        p.trigger_type === 'milestone' ? p.trigger_milestone_id ?? null : null,
      trigger_payment_id: null,  // resolved below
      description: p.description ?? null,
      status: 'pending' as const,
    }))

    const { data: insertedRows, error: insErr } = await supabaseAdmin
      .from('payment_installments')
      .insert(installmentsToInsert)
      .select('id, sequence')

    if (insErr || !insertedRows) {
      throw new Error(`Installment insert failed: ${insErr?.message}`)
    }

    // Build sequence → id map
    const seqToId = new Map<number, string>()
    for (const row of insertedRows) {
      seqToId.set(row.sequence, row.id)
    }

    // Resolve trigger_payment_id for on_completion_of_payment rows
    for (const p of body.payment_plan) {
      if (p.trigger_type === 'on_completion_of_payment' && typeof p.trigger_payment_sequence === 'number') {
        const triggerId = seqToId.get(p.trigger_payment_sequence)
        if (!triggerId) continue  // shouldn't happen due to validation
        const rowId = seqToId.get(p.sequence)
        if (!rowId) continue
        await supabaseAdmin
          .from('payment_installments')
          .update({ trigger_payment_id: triggerId })
          .eq('id', rowId)
      }
    }
  }

  // ── 9. Process TIK if specified at on_acceptance ─────────────────
  let tradeCreditId: string | null = null
  if (body.tik && body.tik.trigger_type === 'on_acceptance' && body.tik.amount_cents > 0) {
    const { data: existingTC } = await supabaseAdmin
      .from('trade_credits')
      .select('id')
      .eq('sow_document_id', sowId)
      .maybeSingle()

    if (existingTC) {
      tradeCreditId = existingTC.id
    } else {
      const { data: newTC, error: tcErr } = await supabaseAdmin
        .from('trade_credits')
        .insert({
          prospect_id: sow.prospect_id,
          sow_document_id: sowId,
          original_amount_cents: body.tik.amount_cents,
          remaining_cents: body.tik.amount_cents,
          description: body.tik.description,
          status: 'outstanding',
        })
        .select('id')
        .single()

      if (!tcErr && newTC) {
        tradeCreditId = newTC.id
      } else {
        console.error('[convertSowToProject] TIK ledger insert failed:', tcErr?.message)
      }
    }
  }

  // ── 10. Fire on_acceptance installments ──────────────────────────
  // Re-fetch installments now that trigger_payment_id is resolved.
  const { data: allInstallments } = await supabaseAdmin
    .from('payment_installments')
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('sequence', { ascending: true })

  for (const installment of (allInstallments ?? []) as PaymentInstallment[]) {
    if (installment.status !== 'pending') continue

    const spec = body.payment_plan.find((p) => p.sequence === installment.sequence)

    if (spec?.already_paid) {
      // Backfill: create invoice + immediately mark paid + create receipt.
      await fireBackfilledInstallment(installment, spec, sow)
      continue
    }

    if (installment.trigger_type === 'on_acceptance') {
      await firePaymentInstallment(installment.id, { sow, sendInvoice: body.send_invoices })
    }
  }

  // ── 11. Subscriptions are handled by Plan C ──────────────────────
  // For Plan B, we just record what was requested in notes for visibility.
  // Plan C will replace this no-op with real Stripe subscription creation.
  if (body.subscriptions.length > 0) {
    console.log(
      `[convertSowToProject] ${body.subscriptions.length} subscriptions specified — Plan C will handle creation`,
    )
  }

  return await buildConversionResult(scheduleId, projectId)
}

// ── Backfill: pre-paid installment ─────────────────────────────────
// Used when admin marks an installment as already-paid externally.
// Creates invoice + marks paid + creates receipt in one shot, no Stripe.
async function fireBackfilledInstallment(
  installment: PaymentInstallment,
  spec: ConvertSowPaymentInstallmentSpec,
  sow: any,
): Promise<void> {
  if (!spec.already_paid) return

  // Generate invoice for this row.
  const { invoice } = await generateInvoiceFromInstallment(installment, sow, {
    autoSent: true,
  })

  // Mark paid + create receipt.
  await supabaseAdmin
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: spec.already_paid.paid_date,
      paid_method: spec.already_paid.paid_method,
      paid_note: spec.already_paid.reference ?? `Backfilled at conversion`,
    })
    .eq('id', invoice.id)

  await supabaseAdmin
    .from('payment_installments')
    .update({
      status: 'paid',
      amount_paid_cents: installment.amount_cents,
      fired_at: new Date().toISOString(),
      invoice_id: invoice.id,
    })
    .eq('id', installment.id)

  // Create RCT receipt for this backfilled payment.
  if (sow.prospect_id) {
    const { createReceiptForInvoice } = await import('./stripe-sync')
    await createReceiptForInvoice({
      invoiceId: invoice.id,
      prospectId: sow.prospect_id,
      amountCents: installment.amount_cents,
      paymentMethod: spec.already_paid.paid_method,
      paymentReference: spec.already_paid.reference ?? null,
      notes: `Backfilled — paid externally on ${spec.already_paid.paid_date}`,
    })
  }
}

// ── buildConversionResult ─────────────────────────────────────────
async function buildConversionResult(
  scheduleId: string,
  projectId: string | null,
): Promise<ConvertSowResult> {
  const { data: schedule } = await supabaseAdmin
    .from('payment_schedules')
    .select('id, project_id')
    .eq('id', scheduleId)
    .single()

  const { data: installments } = await supabaseAdmin
    .from('payment_installments')
    .select('id, sequence, status, invoice_id, invoice:invoices!payment_installments_invoice_id_fkey(invoice_number, public_uuid)')
    .eq('schedule_id', scheduleId)
    .order('sequence', { ascending: true })

  const { data: tradeCredits } = await supabaseAdmin
    .from('trade_credits')
    .select('id')
    .eq('sow_document_id',
      (await supabaseAdmin.from('payment_schedules').select('sow_document_id').eq('id', scheduleId).single()).data?.sow_document_id,
    )
    .limit(1)

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
    subscriptions: [],  // populated by Plan C
    trade_credit_id: tradeCredits?.[0]?.id ?? null,
  }
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: errors about `firePaymentInstallment` and `generateInvoiceFromInstallment` being undefined — these are added in Task 10. Build will fail. That's expected for this checkpoint; do NOT commit yet.

If you see other unrelated errors, fix them before proceeding.

---

## Task 10: Add firePaymentInstallment + generateInvoiceFromInstallment

**Files:**
- Modify: `src/lib/payment-plans.ts` (append more functions)

- [ ] **Step 1: Append fire/generate functions to payment-plans.ts**

Append to `src/lib/payment-plans.ts`:
```ts
// ── firePaymentInstallment ─────────────────────────────────────────
// Transitions a pending installment into invoice_issued (cash) or
// tik_open (TIK). For cash, creates the invoice + Stripe Payment Link.
// For TIK, opens a trade_credits ledger row.
//
// Idempotent: if status is no longer 'pending', no-op.
export async function firePaymentInstallment(
  installmentId: string,
  options: { sow?: any; sendInvoice?: boolean } = {},
): Promise<void> {
  const { data: installment } = await supabaseAdmin
    .from('payment_installments')
    .select('*, schedule:payment_schedules(sow_document_id, project_id)')
    .eq('id', installmentId)
    .single()

  if (!installment || installment.status !== 'pending') return

  // Fetch SOW if not provided
  let sow = options.sow
  if (!sow) {
    const sowId = installment.schedule?.sow_document_id
    if (!sowId) throw new Error(`Installment ${installmentId} has no SOW link`)
    const { data: sowRow } = await supabaseAdmin
      .from('sow_documents')
      .select('*, prospect:prospects(*)')
      .eq('id', sowId)
      .single()
    sow = sowRow
  }

  if (installment.currency_type === 'cash') {
    const { invoice } = await generateInvoiceFromInstallment(installment, sow, {
      autoSent: options.sendInvoice ?? false,
    })

    await supabaseAdmin
      .from('payment_installments')
      .update({
        status: 'invoice_issued',
        invoice_id: invoice.id,
        fired_at: new Date().toISOString(),
      })
      .eq('id', installmentId)
  } else if (installment.currency_type === 'tik') {
    // Open a trade_credits ledger row.
    const { data: tc } = await supabaseAdmin
      .from('trade_credits')
      .insert({
        prospect_id: sow.prospect_id,
        sow_document_id: sow.id,
        original_amount_cents: installment.amount_cents,
        remaining_cents: installment.amount_cents,
        description: installment.description ?? `TIK installment ${installment.sequence} from SOW ${sow.sow_number}`,
        status: 'outstanding',
      })
      .select('id')
      .single()

    await supabaseAdmin
      .from('payment_installments')
      .update({
        status: 'tik_open',
        trade_credit_id: tc?.id ?? null,
        fired_at: new Date().toISOString(),
      })
      .eq('id', installmentId)
  }
}

// ── generateInvoiceFromInstallment ─────────────────────────────────
// Creates an invoice + line items for one installment.
// Mirrors the structure of /api/sow/public/[number]/accept invoice creation
// but is parameterized by installment instead of always being "the deposit."
export async function generateInvoiceFromInstallment(
  installment: PaymentInstallment,
  sow: any,
  options: { autoSent?: boolean } = {},
): Promise<{ invoice: any }> {
  const now = new Date().toISOString()

  // Insert invoice with placeholder number.
  const tempInvNumber = `PENDING-${crypto.randomUUID()}`
  const { data: invoice, error: invErr } = await supabaseAdmin
    .from('invoices')
    .insert({
      invoice_number: tempInvNumber,
      kind: 'business',
      prospect_id: sow.prospect_id,
      quote_session_id: sow.quote_session_id,
      payment_installment_id: installment.id,
      status: 'sent',
      sent_at: options.autoSent ? now : null,
      sent_via_channel: options.autoSent ? 'manual' : null,
      subtotal_cents: installment.amount_cents,
      discount_cents: 0,
      total_due_cents: installment.amount_cents,
      currency: 'USD',
      auto_generated: true,
      auto_trigger: `installment_${installment.trigger_type}`,
      auto_sent: options.autoSent ?? false,
      category_hint: 'service_revenue',
      notes: `${installment.description ?? `Payment ${installment.sequence}`} for SOW ${sow.sow_number} — ${sow.title}`,
    })
    .select('*')
    .single()

  if (invErr || !invoice) {
    throw new Error(`Invoice insert failed: ${invErr?.message}`)
  }

  // Allocate INV-… number.
  if (sow.prospect_id) {
    try {
      const invNumber = await allocateDocNumber({
        doc_type: 'INV',
        prospect_id: sow.prospect_id,
        ref_table: 'invoices',
        ref_id: invoice.id,
      })
      await supabaseAdmin
        .from('invoices')
        .update({ invoice_number: invNumber })
        .eq('id', invoice.id)
      invoice.invoice_number = invNumber
    } catch (numErr) {
      console.warn('[generateInvoiceFromInstallment] number allocation failed:', numErr)
    }
  }

  // Single line item for this installment.
  const lineItem = {
    invoice_id: invoice.id,
    description: installment.description ?? `Payment ${installment.sequence} for ${sow.title}`,
    quantity: 1,
    unit_price_cents: installment.amount_cents,
    subtotal_cents: installment.amount_cents,
    discount_pct: 0,
    discount_cents: 0,
    line_total_cents: installment.amount_cents,
    sort_order: 0,
  }

  const { error: liErr } = await supabaseAdmin.from('invoice_line_items').insert(lineItem)
  if (liErr) {
    await supabaseAdmin.from('invoices').delete().eq('id', invoice.id)
    throw new Error(`Line item insert failed: ${liErr.message}`)
  }

  return { invoice }
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: zero errors now.

- [ ] **Step 3: Commit**

```bash
git add src/lib/payment-plans.ts
git commit -m "feat(payment-plans): convertSowToProject + firePaymentInstallment + generateInvoiceFromInstallment"
```

---

## Task 11: Add cascadeOnPayment + markInstallmentPaid + findInstallmentForInvoice

**Files:**
- Modify: `src/lib/payment-plans.ts` (append)

These are called by the webhook handler when a Stripe payment lands.

- [ ] **Step 1: Append cascade helpers to payment-plans.ts**

Append:
```ts
// ── findInstallmentForInvoice ──────────────────────────────────────
// Webhook helper. Returns the installment row id linked to a paid invoice.
export async function findInstallmentForInvoice(
  invoiceId: string,
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('payment_installments')
    .select('id')
    .eq('invoice_id', invoiceId)
    .maybeSingle()
  return data?.id ?? null
}

// ── markInstallmentPaid ────────────────────────────────────────────
// Updates installment after a payment lands. Sets status to 'paid' if the
// new total covers amount_cents; otherwise 'partially_paid'.
// Returns the new status so the caller knows whether to cascade.
export async function markInstallmentPaid(
  installmentId: string,
  amountReceivedCents: number,
): Promise<{ newStatus: 'paid' | 'partially_paid' | 'invoice_issued'; cascadeFired: boolean }> {
  const { data: row } = await supabaseAdmin
    .from('payment_installments')
    .select('id, amount_cents, amount_paid_cents, status, schedule_id')
    .eq('id', installmentId)
    .single()

  if (!row) return { newStatus: 'invoice_issued', cascadeFired: false }
  if (row.status === 'paid') return { newStatus: 'paid', cascadeFired: false }

  const newPaidTotal = row.amount_paid_cents + amountReceivedCents
  const newStatus: 'paid' | 'partially_paid' =
    newPaidTotal >= row.amount_cents ? 'paid' : 'partially_paid'

  await supabaseAdmin
    .from('payment_installments')
    .update({ amount_paid_cents: newPaidTotal, status: newStatus })
    .eq('id', installmentId)

  // Lock the schedule on first paid installment (blocks further plan edits).
  if (newStatus === 'paid') {
    await supabaseAdmin
      .from('payment_schedules')
      .update({ locked_at: new Date().toISOString() })
      .eq('id', row.schedule_id)
      .is('locked_at', null)
  }

  let cascadeFired = false
  if (newStatus === 'paid') {
    cascadeFired = await cascadeOnPayment(installmentId)
  }

  return { newStatus, cascadeFired }
}

// ── cascadeOnPayment ────────────────────────────────────────────────
// Finds installments with trigger_type='on_completion_of_payment' AND
// trigger_payment_id=installmentId AND status='pending', and fires each.
// Returns true if at least one row was fired.
export async function cascadeOnPayment(triggerInstallmentId: string): Promise<boolean> {
  const { data: dependents } = await supabaseAdmin
    .from('payment_installments')
    .select('id')
    .eq('trigger_payment_id', triggerInstallmentId)
    .eq('status', 'pending')

  if (!dependents || dependents.length === 0) return false

  for (const dep of dependents) {
    try {
      await firePaymentInstallment(dep.id, { sendInvoice: true })
    } catch (e) {
      console.error('[cascadeOnPayment] failed to fire dependent', dep.id, e)
    }
  }
  return true
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/payment-plans.ts
git commit -m "feat(payment-plans): cascade + mark-paid helpers for webhook integration"
```

---

## Task 12: Wire webhook to call markInstallmentPaid

**Files:**
- Modify: `src/app/api/webhooks/stripe/route.ts`

When a Stripe payment lands, look up the installment and call markInstallmentPaid (which fires cascades automatically).

- [ ] **Step 1: Update the webhook handler**

In `src/app/api/webhooks/stripe/route.ts`, find the `handleEvent` switch. Modify the `checkout.session.completed` / `payment_intent.succeeded` case (which Plan A modified):
```ts
    case 'checkout.session.completed':
    case 'payment_intent.succeeded': {
      const invoiceId = await findInvoiceForStripeEvent(event)
      if (invoiceId) {
        const obj = event.data.object as unknown as Record<string, unknown>
        const amountCents =
          (obj.amount_total as number | undefined) ??
          (obj.amount_received as number | undefined) ??
          undefined
        const reference = (obj.id as string | undefined) ?? null

        await markInvoicePaidFromStripe(invoiceId, {
          paymentMethod: 'stripe',
          amountCents,
          paymentReference: reference,
          note: `Stripe ${event.type} ${event.id}`,
        })

        // Plan B cascade: if this invoice is linked to an installment,
        // mark the installment paid → fires any on_completion_of_payment dependents.
        const { findInstallmentForInvoice, markInstallmentPaid } = await import('@/lib/payment-plans')
        const installmentId = await findInstallmentForInvoice(invoiceId)
        if (installmentId && amountCents) {
          await markInstallmentPaid(installmentId, amountCents)
        }
      }
      return
    }
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/webhooks/stripe/route.ts
git commit -m "feat(stripe): webhook fires payment-plan cascade on cash payment"
```

---

## Task 13: Create POST /api/admin/sow/[id]/convert endpoint

**Files:**
- Create: `src/app/api/admin/sow/[id]/convert/route.ts`

- [ ] **Step 1: Create the route file**

Create `src/app/api/admin/sow/[id]/convert/route.ts`:
```ts
// ── POST /api/admin/sow/[id]/convert ────────────────────────────────
// Admin-initiated SOW → Project conversion.
// Body: ConvertSowRequest (see payment-plan-types.ts).
// Returns: ConvertSowResult.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  convertSowToProject,
  PaymentPlanValidationError,
} from '@/lib/payment-plans'
import type { ConvertSowRequest } from '@/lib/payment-plan-types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = (await request.json().catch(() => null)) as ConvertSowRequest | null
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Minimal request shape validation.
  if (!body.acceptance?.signed_by || !body.acceptance?.accepted_at) {
    return NextResponse.json(
      { error: 'acceptance.signed_by and acceptance.accepted_at are required' },
      { status: 400 },
    )
  }
  if (!Array.isArray(body.payment_plan)) {
    return NextResponse.json({ error: 'payment_plan must be an array' }, { status: 400 })
  }
  if (!Array.isArray(body.subscriptions)) {
    return NextResponse.json({ error: 'subscriptions must be an array' }, { status: 400 })
  }

  try {
    const result = await convertSowToProject(id, body)
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof PaymentPlanValidationError) {
      return NextResponse.json({ error: e.message, kind: 'validation' }, { status: 400 })
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e), kind: 'internal' },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/sow/[id]/convert/route.ts
git commit -m "feat(api): POST /api/admin/sow/[id]/convert"
```

---

## Task 14: Refactor public Accept route to share orchestrator

**Files:**
- Modify: `src/app/api/sow/public/[number]/accept/route.ts`

The public Accept route currently has its own (large) lifecycle implementation. Refactor it to call `convertSowToProject` with a synthesized single-installment plan equal to the SOW's deposit_cents. This guarantees both code paths stay in sync.

- [ ] **Step 1: Read the current accept route in full**

Already read in Task 1. Note: it uses value stack discount on the deposit invoice. We need to preserve this behavior on the public flow but NOT in the admin flow.

For Plan B v1, we keep the value stack ONLY when the public Accept flow is used (not admin convert). This means the orchestrator needs an option flag.

- [ ] **Step 2: Add includeValueStack option to convertSowToProject**

In `src/lib/payment-plans.ts`, modify the function signature:
```ts
export async function convertSowToProject(
  sowId: string,
  body: ConvertSowRequest,
  options: { includeValueStack?: boolean } = {},
): Promise<ConvertSowResult> {
```

In the function, after generating each on_acceptance cash invoice, if `options.includeValueStack === true`, augment the invoice with value-stack lines. **For Plan B simplicity, we punt this**: keep the value stack only on the public Accept flow's "single deposit installment" case, and implement that behavior in the public route itself by passing a custom callback OR by simply not refactoring the value-stack add-on into the orchestrator.

**Decision: don't refactor the public Accept route in Plan B.** The admin convert path uses the new orchestrator. The public Accept path keeps its existing implementation (which was working). This avoids regression risk on the public path. Future tech debt: unify them in a v2.

- [ ] **Step 3: Add a comment to the public Accept route noting the divergence**

In `src/app/api/sow/public/[number]/accept/route.ts`, at the top of the file (after the existing header comment), add:
```ts
// NOTE (Plan B): This route runs the simple "single deposit installment"
// lifecycle. The admin /api/admin/sow/[id]/convert route uses the unified
// payment-plans orchestrator (src/lib/payment-plans.ts) which supports
// multi-installment + TIK + cascade triggers. Both paths converge on the
// same downstream side effects (project + prospect.is_client + subscriptions
// + trade_credits). Keep them in sync if you change one.
```

- [ ] **Step 4: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/sow/public/[number]/accept/route.ts src/lib/payment-plans.ts
git commit -m "docs(sow-accept): note divergence between public Accept and admin Convert paths"
```

---

## Task 15: Wire phase-completion endpoint to fire milestone installments

**Files:**
- Modify: `src/app/api/admin/projects/[id]/phases/[phaseId]/route.ts`

- [ ] **Step 1: Update the route**

Replace the contents of `src/app/api/admin/projects/[id]/phases/[phaseId]/route.ts` with:
```ts
// PATCH /api/admin/projects/[id]/phases/[phaseId]
// Update a phase's status (and set completed_at) in the phases jsonb array.
// When status becomes 'completed', fire any payment_installments whose
// trigger_type='milestone' AND trigger_milestone_id=phaseId.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { firePaymentInstallment } from '@/lib/payment-plans'
import type { ProjectPhase } from '@/lib/invoice-types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; phaseId: string }> },
) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  const { id, phaseId } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { status } = body as { status: ProjectPhase['status'] }
  if (!['pending', 'in_progress', 'completed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { data: project, error: fetchErr } = await supabaseAdmin
    .from('projects')
    .select('phases')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const phases = (project.phases ?? []) as ProjectPhase[]
  const phaseIdx = phases.findIndex((p) => p.id === phaseId)
  if (phaseIdx === -1) return NextResponse.json({ error: 'Phase not found' }, { status: 404 })

  const wasCompleted = phases[phaseIdx].status === 'completed'

  const updatedPhases = phases.map((p, i) => {
    if (i !== phaseIdx) return p
    return {
      ...p,
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : p.completed_at ?? null,
    }
  })

  const { error: updateErr } = await supabaseAdmin
    .from('projects')
    .update({ phases: updatedPhases, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // ── Fire milestone-triggered installments ──────────────────────────
  // Only when transitioning into 'completed' (avoids re-firing on idempotent re-PATCH).
  const firedInstallments: string[] = []
  if (status === 'completed' && !wasCompleted) {
    const { data: pendingInstallments } = await supabaseAdmin
      .from('payment_installments')
      .select('id')
      .eq('trigger_type', 'milestone')
      .eq('trigger_milestone_id', phaseId)
      .eq('status', 'pending')

    for (const inst of pendingInstallments ?? []) {
      try {
        await firePaymentInstallment(inst.id, { sendInvoice: true })
        firedInstallments.push(inst.id)
      } catch (e) {
        console.error('[phase-complete] fire installment failed', inst.id, e)
      }
    }
  }

  return NextResponse.json({ ok: true, fired_installments: firedInstallments })
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/projects/[id]/phases/[phaseId]/route.ts
git commit -m "feat(projects): phase-complete fires milestone-triggered payment installments"
```

---

## Task 16: Create cron endpoint for time-triggered installments

**Files:**
- Create: `src/app/api/cron/payment-triggers/route.ts`
- Modify: `vercel.json` (add cron entry)

- [ ] **Step 1: Read existing cron pattern**

Read `src/app/api/cron/subscription-cycles/route.ts` (or whichever cron exists) to see the auth + execution pattern.

- [ ] **Step 2: Create the cron route**

Create `src/app/api/cron/payment-triggers/route.ts`:
```ts
// ── GET /api/cron/payment-triggers ──────────────────────────────────
// Daily cron. Finds payment_installments with trigger_type='time' AND
// trigger_date <= today AND status='pending', and fires each.
//
// Auth: Bearer token matches CRON_SECRET. Vercel Cron supplies this header.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { firePaymentInstallment } from '@/lib/payment-plans'

export async function GET(request: NextRequest) {
  // Auth check.
  const authHeader = request.headers.get('authorization') ?? ''
  const expectedToken = process.env.CRON_SECRET
  if (!expectedToken) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)

  const { data: due, error } = await supabaseAdmin
    .from('payment_installments')
    .select('id, sequence, amount_cents, trigger_date')
    .eq('trigger_type', 'time')
    .eq('status', 'pending')
    .lte('trigger_date', today)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const fired: Array<{ id: string; result: 'fired' | 'error'; message?: string }> = []
  for (const row of due ?? []) {
    try {
      await firePaymentInstallment(row.id, { sendInvoice: true })
      fired.push({ id: row.id, result: 'fired' })
    } catch (e) {
      fired.push({
        id: row.id,
        result: 'error',
        message: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return NextResponse.json({
    ran_at: new Date().toISOString(),
    today,
    found: due?.length ?? 0,
    fired,
  })
}
```

- [ ] **Step 3: Add vercel.json cron entry**

Read current `vercel.json`. Find the `crons` array (or create one if missing).

If `vercel.json` has no crons key, add:
```json
{
  "crons": [
    {
      "path": "/api/cron/payment-triggers",
      "schedule": "0 13 * * *"
    }
  ]
}
```
(13:00 UTC = 6 AM PST in standard time. Adjust per preference.)

If crons already exists, append a new entry to the array:
```json
{
  "path": "/api/cron/payment-triggers",
  "schedule": "0 13 * * *"
}
```

- [ ] **Step 4: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/payment-triggers/route.ts vercel.json
git commit -m "feat(cron): daily payment-triggers cron fires time-based installments"
```

---

## Task 17: Create TIK drawdown endpoint

**Files:**
- Create: `src/app/api/admin/trade-credits/[id]/drawdown/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/admin/trade-credits/[id]/drawdown/route.ts`:
```ts
// ── POST /api/admin/trade-credits/[id]/drawdown ─────────────────────
// Records a drawdown against a TIK ledger. Decrements remaining_cents,
// inserts a trade_credit_drawdowns row, and issues an RCT receipt with
// payment_method='tik'.
//
// Body:
//   { amount_cents: number, description: string, delivered_on: string,
//     overage_action?: 'cash_invoice' | 'new_tik_ledger' }
//
// If amount_cents > remaining_cents and overage_action is not provided,
// returns 409 with the overage amount so admin can re-submit with a choice.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { allocateDocNumber } from '@/lib/doc-numbering'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { amount_cents, description, delivered_on, overage_action } = body as {
    amount_cents: number
    description: string
    delivered_on: string
    overage_action?: 'cash_invoice' | 'new_tik_ledger'
  }

  if (typeof amount_cents !== 'number' || amount_cents <= 0) {
    return NextResponse.json({ error: 'amount_cents must be positive' }, { status: 400 })
  }
  if (!description || typeof description !== 'string') {
    return NextResponse.json({ error: 'description required' }, { status: 400 })
  }
  if (!delivered_on) {
    return NextResponse.json({ error: 'delivered_on required (ISO date)' }, { status: 400 })
  }

  // Load trade credit + prospect.
  const { data: tc, error: tcErr } = await supabaseAdmin
    .from('trade_credits')
    .select('*, prospect:prospects(id, business_name)')
    .eq('id', id)
    .single()

  if (tcErr || !tc) {
    return NextResponse.json({ error: 'Trade credit not found' }, { status: 404 })
  }

  if (tc.status !== 'outstanding' && tc.status !== 'partial') {
    return NextResponse.json(
      { error: `Trade credit status is ${tc.status} — cannot draw down` },
      { status: 409 },
    )
  }

  const remaining = tc.remaining_cents
  const isOverage = amount_cents > remaining
  const overageCents = isOverage ? amount_cents - remaining : 0

  if (isOverage && !overage_action) {
    return NextResponse.json(
      {
        error: 'Overage detected',
        kind: 'overage',
        remaining_cents: remaining,
        overage_cents: overageCents,
        message: `Service value exceeds remaining TIK by $${(overageCents / 100).toFixed(2)}. Re-submit with overage_action: 'cash_invoice' or 'new_tik_ledger'.`,
      },
      { status: 409 },
    )
  }

  // ── Apply drawdown to existing TIK ─────────────────────────────────
  const drawdownAmount = isOverage ? remaining : amount_cents
  const newRemaining = Math.max(0, remaining - drawdownAmount)
  const newStatus = newRemaining === 0 ? 'fulfilled' : 'partial'
  const closedAt = newRemaining === 0 ? new Date().toISOString() : null

  // Insert drawdown record.
  const { error: ddErr } = await supabaseAdmin.from('trade_credit_drawdowns').insert({
    trade_credit_id: id,
    amount_cents: drawdownAmount,
    description,
    delivered_on,
  })
  if (ddErr) {
    return NextResponse.json({ error: `Drawdown insert: ${ddErr.message}` }, { status: 500 })
  }

  // Decrement remaining + status.
  await supabaseAdmin
    .from('trade_credits')
    .update({
      remaining_cents: newRemaining,
      status: newStatus,
      closed_at: closedAt,
    })
    .eq('id', id)

  // Issue RCT receipt for services rendered.
  let receipt: any = null
  if (tc.prospect_id) {
    const tempRct = `PENDING-${crypto.randomUUID()}`
    const { data: rct } = await supabaseAdmin
      .from('receipts')
      .insert({
        receipt_number: tempRct,
        invoice_id: null,
        prospect_id: tc.prospect_id,
        amount_cents: drawdownAmount,
        currency: 'USD',
        payment_method: 'tik',
        payment_reference: `TIK-${id.slice(0, 8)}`,
        paid_at: delivered_on,
        notes: `Services rendered: ${description}`,
      })
      .select('*')
      .single()

    if (rct) {
      try {
        const rctNumber = await allocateDocNumber({
          doc_type: 'RCT',
          prospect_id: tc.prospect_id,
          ref_table: 'receipts',
          ref_id: rct.id,
        })
        await supabaseAdmin.from('receipts').update({ receipt_number: rctNumber }).eq('id', rct.id)
        rct.receipt_number = rctNumber
      } catch (numErr) {
        console.error('[tik-drawdown] receipt numbering failed:', numErr)
      }
      receipt = rct
    }
  }

  // ── Handle overage if requested ────────────────────────────────────
  let overageResult: any = null
  if (isOverage && overage_action) {
    if (overage_action === 'new_tik_ledger') {
      const { data: newTC } = await supabaseAdmin
        .from('trade_credits')
        .insert({
          prospect_id: tc.prospect_id,
          sow_document_id: tc.sow_document_id,
          original_amount_cents: overageCents,
          remaining_cents: overageCents,
          description: `Overage from TIK ${id.slice(0, 8)}: ${description}`,
          status: 'outstanding',
        })
        .select('id, remaining_cents')
        .single()
      overageResult = { kind: 'new_tik_ledger', trade_credit_id: newTC?.id, amount_cents: overageCents }
    } else if (overage_action === 'cash_invoice') {
      // Stub: create a one-line cash invoice for the overage. Same number-allocation pattern.
      const tempInvNum = `PENDING-${crypto.randomUUID()}`
      const { data: inv } = await supabaseAdmin
        .from('invoices')
        .insert({
          invoice_number: tempInvNum,
          kind: 'business',
          prospect_id: tc.prospect_id,
          status: 'sent',
          subtotal_cents: overageCents,
          discount_cents: 0,
          total_due_cents: overageCents,
          currency: 'USD',
          auto_generated: true,
          auto_trigger: 'tik_overage',
          notes: `Overage on TIK service delivery: ${description}`,
        })
        .select('*')
        .single()
      if (inv) {
        try {
          const invNum = await allocateDocNumber({
            doc_type: 'INV',
            prospect_id: tc.prospect_id,
            ref_table: 'invoices',
            ref_id: inv.id,
          })
          await supabaseAdmin.from('invoices').update({ invoice_number: invNum }).eq('id', inv.id)
          inv.invoice_number = invNum
        } catch (e) {
          console.error('[tik-overage] invoice numbering failed:', e)
        }
        await supabaseAdmin.from('invoice_line_items').insert({
          invoice_id: inv.id,
          description: `TIK overage: ${description}`,
          quantity: 1,
          unit_price_cents: overageCents,
          subtotal_cents: overageCents,
          discount_pct: 0,
          discount_cents: 0,
          line_total_cents: overageCents,
          sort_order: 0,
        })
        overageResult = { kind: 'cash_invoice', invoice_id: inv.id, invoice_number: inv.invoice_number, amount_cents: overageCents }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    trade_credit: { id, remaining_cents: newRemaining, status: newStatus },
    drawdown: { amount_cents: drawdownAmount, description, delivered_on },
    receipt,
    overage: overageResult,
  })
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/trade-credits/[id]/drawdown/route.ts
git commit -m "feat(api): TIK drawdown endpoint with overage handling + RCT receipt"
```

---

## Task 18: Create Convert SOW modal client component

**Files:**
- Create: `src/app/admin/sow/[id]/ConvertModal.tsx`

This is a substantial UI component. To keep this task manageable, we build the **minimum viable modal** for SOW-MOME's case (single + 2-installment cash plans, optional TIK on_acceptance, no subscriptions in Plan B). Plan C extends with subscription-spec rows.

- [ ] **Step 1: Create the modal**

Create `src/app/admin/sow/[id]/ConvertModal.tsx`:
```tsx
'use client'

import { useState } from 'react'
import type {
  ConvertSowRequest,
  ConvertSowResult,
  ConvertSowPaymentInstallmentSpec,
  ConvertSowTikSpec,
  TriggerType,
} from '@/lib/payment-plan-types'

interface SowSummary {
  id: string
  sow_number: string
  title: string
  status: string
  total_cents: number
  trade_credit_cents: number
  trade_credit_description: string | null
  phases: Array<{ id: string; name: string }>
}

interface Props {
  sow: SowSummary
  onClose: () => void
  onConverted: (result: ConvertSowResult) => void
}

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`

export function ConvertModal({ sow, onClose, onConverted }: Props) {
  const tikInitial = sow.trade_credit_cents > 0
  const cashTotalCents = sow.total_cents - (tikInitial ? sow.trade_credit_cents : 0)
  const today = new Date().toISOString().slice(0, 10)

  const [signedBy, setSignedBy] = useState(`Hunter (admin, on behalf of client)`)
  const [acceptedAt, setAcceptedAt] = useState(today)
  const [method, setMethod] = useState<'in_person' | 'phone' | 'email' | 'magic_link'>('in_person')
  const [sendInvoices, setSendInvoices] = useState(true)
  const [includeTik, setIncludeTik] = useState(tikInitial)
  const [tikDesc, setTikDesc] = useState(sow.trade_credit_description ?? '')
  const [tikAmount, setTikAmount] = useState((sow.trade_credit_cents / 100).toFixed(2))
  const [tikTrigger, setTikTrigger] = useState<'on_acceptance' | 'milestone' | 'on_completion_of_payment'>('on_acceptance')
  const [installments, setInstallments] = useState<ConvertSowPaymentInstallmentSpec[]>([
    {
      sequence: 1,
      amount_cents: cashTotalCents,
      currency_type: 'cash',
      expected_payment_method: 'card',
      trigger_type: 'on_acceptance',
      description: 'Full payment',
    },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allocatedCents = installments
    .filter((i) => i.currency_type === 'cash')
    .reduce((s, i) => s + i.amount_cents, 0)
  const tikAmountCents = includeTik ? Math.round(parseFloat(tikAmount || '0') * 100) : 0
  const expectedCash = sow.total_cents - tikAmountCents
  const sumOk = allocatedCents === expectedCash

  function applyPreset(preset: 'single' | 'two_installments' | 'three_installments') {
    if (preset === 'single') {
      setInstallments([
        {
          sequence: 1,
          amount_cents: expectedCash,
          currency_type: 'cash',
          expected_payment_method: 'card',
          trigger_type: 'on_acceptance',
          description: 'Full payment',
        },
      ])
    } else if (preset === 'two_installments') {
      const half = Math.floor(expectedCash / 2)
      const otherHalf = expectedCash - half
      const due = new Date()
      due.setDate(due.getDate() + 30)
      setInstallments([
        {
          sequence: 1,
          amount_cents: half,
          currency_type: 'cash',
          expected_payment_method: 'card',
          trigger_type: 'on_acceptance',
          description: 'Installment 1 of 2',
        },
        {
          sequence: 2,
          amount_cents: otherHalf,
          currency_type: 'cash',
          expected_payment_method: 'card',
          trigger_type: 'time',
          trigger_date: due.toISOString().slice(0, 10),
          description: 'Installment 2 of 2',
        },
      ])
    } else if (preset === 'three_installments') {
      const third = Math.floor(expectedCash / 3)
      const remainder = expectedCash - third * 2
      const due30 = new Date()
      due30.setDate(due30.getDate() + 30)
      const due60 = new Date()
      due60.setDate(due60.getDate() + 60)
      setInstallments([
        {
          sequence: 1,
          amount_cents: third,
          currency_type: 'cash',
          expected_payment_method: 'card',
          trigger_type: 'on_acceptance',
          description: 'Installment 1 of 3',
        },
        {
          sequence: 2,
          amount_cents: third,
          currency_type: 'cash',
          expected_payment_method: 'card',
          trigger_type: 'time',
          trigger_date: due30.toISOString().slice(0, 10),
          description: 'Installment 2 of 3',
        },
        {
          sequence: 3,
          amount_cents: remainder,
          currency_type: 'cash',
          expected_payment_method: 'card',
          trigger_type: 'time',
          trigger_date: due60.toISOString().slice(0, 10),
          description: 'Installment 3 of 3',
        },
      ])
    }
  }

  function updateInstallment(idx: number, patch: Partial<ConvertSowPaymentInstallmentSpec>) {
    setInstallments((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    )
  }

  function addInstallment() {
    setInstallments((prev) => [
      ...prev,
      {
        sequence: prev.length + 1,
        amount_cents: 0,
        currency_type: 'cash',
        expected_payment_method: 'card',
        trigger_type: 'on_acceptance',
        description: `Installment ${prev.length + 1}`,
      },
    ])
  }

  function removeInstallment(idx: number) {
    setInstallments((prev) => prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, sequence: i + 1 })))
  }

  async function submit() {
    setSubmitting(true)
    setError(null)

    const tik: ConvertSowTikSpec | undefined = includeTik && tikAmountCents > 0
      ? {
          amount_cents: tikAmountCents,
          description: tikDesc,
          trigger_type: tikTrigger,
        }
      : undefined

    const body: ConvertSowRequest = {
      acceptance: {
        signed_by: signedBy,
        accepted_at: acceptedAt,
        method,
      },
      payment_plan: installments,
      subscriptions: [],  // Plan C wires this
      tik,
      send_invoices: sendInvoices,
    }

    try {
      const res = await fetch(`/api/admin/sow/${sow.id}/convert`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Conversion failed')
        setSubmitting(false)
        return
      }
      onConverted(data as ConvertSowResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSubmitting(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 12, padding: 32,
          maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          Convert SOW {sow.sow_number} to Project
        </h2>
        <p style={{ color: '#5d6780', marginBottom: 24, fontSize: 14 }}>
          {sow.title} · Total: {fmt(sow.total_cents)}
        </p>

        {/* Acceptance */}
        <fieldset style={{ marginBottom: 24, border: '1px solid #e2e8f0', padding: 16, borderRadius: 8 }}>
          <legend style={{ fontWeight: 600, padding: '0 8px' }}>Acceptance</legend>
          <label style={{ display: 'block', fontSize: 12, color: '#5d6780', marginBottom: 4 }}>Signed by</label>
          <input
            value={signedBy} onChange={(e) => setSignedBy(e.target.value)}
            style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 12, marginBottom: 0 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#5d6780', marginBottom: 4 }}>Accepted at</label>
              <input
                type="date" value={acceptedAt} onChange={(e) => setAcceptedAt(e.target.value)}
                style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#5d6780', marginBottom: 4 }}>Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value as any)}
                style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}
              >
                <option value="in_person">In person</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="magic_link">Magic link</option>
              </select>
            </div>
          </div>
        </fieldset>

        {/* TIK */}
        <fieldset style={{ marginBottom: 24, border: '1px solid #e2e8f0', padding: 16, borderRadius: 8 }}>
          <legend style={{ fontWeight: 600, padding: '0 8px' }}>
            <label>
              <input type="checkbox" checked={includeTik} onChange={(e) => setIncludeTik(e.target.checked)} />
              {' '}Trade-in-Kind (services owed by client)
            </label>
          </legend>
          {includeTik && (
            <>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#5d6780', marginBottom: 4 }}>TIK amount ($)</label>
                  <input
                    type="number" step="0.01" value={tikAmount} onChange={(e) => setTikAmount(e.target.value)}
                    style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#5d6780', marginBottom: 4 }}>Trigger</label>
                  <select value={tikTrigger} onChange={(e) => setTikTrigger(e.target.value as any)}
                    style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}
                  >
                    <option value="on_acceptance">On acceptance (today)</option>
                    <option value="milestone">On a milestone</option>
                    <option value="on_completion_of_payment">When a cash payment is received</option>
                  </select>
                </div>
              </div>
              <label style={{ display: 'block', fontSize: 12, color: '#5d6780', marginBottom: 4 }}>Description</label>
              <textarea value={tikDesc} onChange={(e) => setTikDesc(e.target.value)}
                style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, minHeight: 60 }}
              />
            </>
          )}
        </fieldset>

        {/* Payment Plan */}
        <fieldset style={{ marginBottom: 24, border: '1px solid #e2e8f0', padding: 16, borderRadius: 8 }}>
          <legend style={{ fontWeight: 600, padding: '0 8px' }}>
            Build payment plan · cash to allocate: {fmt(expectedCash)}
          </legend>
          <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => applyPreset('single')} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#f4f6f9' }}>Single payment</button>
            <button type="button" onClick={() => applyPreset('two_installments')} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#f4f6f9' }}>2 installments (30d)</button>
            <button type="button" onClick={() => applyPreset('three_installments')} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#f4f6f9' }}>3 installments (30d/60d)</button>
          </div>

          {installments.map((inst, idx) => (
            <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>Payment {inst.sequence}</strong>
                <button type="button" onClick={() => removeInstallment(idx)} style={{ marginLeft: 'auto', padding: '4px 10px', background: '#fee', border: '1px solid #fcc', borderRadius: 4, fontSize: 12, color: '#c00' }}>Remove</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#5d6780', marginBottom: 2 }}>Amount ($)</label>
                  <input
                    type="number" step="0.01"
                    value={(inst.amount_cents / 100).toFixed(2)}
                    onChange={(e) => updateInstallment(idx, { amount_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                    style={{ width: '100%', padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#5d6780', marginBottom: 2 }}>Currency</label>
                  <select value={inst.currency_type}
                    onChange={(e) => updateInstallment(idx, { currency_type: e.target.value as 'cash' | 'tik' })}
                    style={{ width: '100%', padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 }}
                  >
                    <option value="cash">Cash</option>
                    <option value="tik">TIK</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#5d6780', marginBottom: 2 }}>Trigger</label>
                  <select value={inst.trigger_type}
                    onChange={(e) => updateInstallment(idx, { trigger_type: e.target.value as TriggerType })}
                    style={{ width: '100%', padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 }}
                  >
                    <option value="on_acceptance">On acceptance</option>
                    <option value="time">On a date</option>
                    <option value="milestone">On milestone</option>
                    <option value="on_completion_of_payment">On payment received</option>
                  </select>
                </div>
              </div>
              {inst.trigger_type === 'time' && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#5d6780', marginBottom: 2 }}>Trigger date</label>
                  <input type="date"
                    value={inst.trigger_date ?? ''}
                    onChange={(e) => updateInstallment(idx, { trigger_date: e.target.value })}
                    style={{ width: '100%', padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 }}
                  />
                </div>
              )}
              {inst.trigger_type === 'milestone' && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#5d6780', marginBottom: 2 }}>Milestone (phase)</label>
                  <select
                    value={inst.trigger_milestone_id ?? ''}
                    onChange={(e) => updateInstallment(idx, { trigger_milestone_id: e.target.value })}
                    style={{ width: '100%', padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 }}
                  >
                    <option value="">Select…</option>
                    {sow.phases.map((ph) => (
                      <option key={ph.id} value={ph.id}>{ph.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {inst.trigger_type === 'on_completion_of_payment' && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#5d6780', marginBottom: 2 }}>Triggered by payment #</label>
                  <select
                    value={inst.trigger_payment_sequence ?? ''}
                    onChange={(e) => updateInstallment(idx, { trigger_payment_sequence: parseInt(e.target.value, 10) })}
                    style={{ width: '100%', padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 }}
                  >
                    <option value="">Select…</option>
                    {installments.filter((p) => p.sequence < inst.sequence).map((p) => (
                      <option key={p.sequence} value={p.sequence}>Payment {p.sequence} ({fmt(p.amount_cents)})</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#5d6780', marginBottom: 2 }}>Description</label>
                <input
                  value={inst.description ?? ''}
                  onChange={(e) => updateInstallment(idx, { description: e.target.value })}
                  style={{ width: '100%', padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 }}
                />
              </div>
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={!!inst.already_paid}
                    onChange={(e) => updateInstallment(idx, {
                      already_paid: e.target.checked
                        ? { paid_date: today, paid_method: 'check' }
                        : undefined,
                    })}
                  />
                  {' '}Already paid externally (backfill)
                </label>
                {inst.already_paid && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <input type="date" value={inst.already_paid.paid_date}
                      onChange={(e) => updateInstallment(idx, { already_paid: { ...inst.already_paid!, paid_date: e.target.value } })}
                      style={{ flex: 1, padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
                    />
                    <select value={inst.already_paid.paid_method}
                      onChange={(e) => updateInstallment(idx, { already_paid: { ...inst.already_paid!, paid_method: e.target.value as any } })}
                      style={{ flex: 1, padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
                    >
                      <option value="check">Check</option>
                      <option value="wire">Wire</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="ach">ACH</option>
                      <option value="other">Other</option>
                    </select>
                    <input placeholder="Reference"
                      value={inst.already_paid.reference ?? ''}
                      onChange={(e) => updateInstallment(idx, { already_paid: { ...inst.already_paid!, reference: e.target.value } })}
                      style={{ flex: 1, padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          <button type="button" onClick={addInstallment} style={{ padding: '8px 14px', background: '#68c5ad', color: '#fff', border: 0, borderRadius: 6, fontSize: 13, fontWeight: 600 }}>+ Add payment</button>

          <div style={{ marginTop: 12, padding: 10, borderRadius: 6, background: sumOk ? '#f0fdf4' : '#fef2f2', color: sumOk ? '#16a34a' : '#dc2626', fontSize: 13, fontWeight: 600 }}>
            {sumOk ? '✓' : '✗'} Allocated {fmt(allocatedCents)} of {fmt(expectedCash)} cash
            {!sumOk && ` — diff ${fmt(expectedCash - allocatedCents)}`}
          </div>
        </fieldset>

        {/* Send invoices */}
        <fieldset style={{ marginBottom: 24, border: '1px solid #e2e8f0', padding: 16, borderRadius: 8 }}>
          <legend style={{ fontWeight: 600, padding: '0 8px' }}>Delivery</legend>
          <label style={{ fontSize: 13 }}>
            <input type="checkbox" checked={sendInvoices} onChange={(e) => setSendInvoices(e.target.checked)} />
            {' '}Send magic-link emails for fired invoices immediately
          </label>
        </fieldset>

        {error && (
          <div style={{ padding: 12, background: '#fef2f2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={submitting}
            style={{ padding: '10px 20px', background: '#f4f6f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }}
          >Cancel</button>
          <button onClick={submit} disabled={submitting || !sumOk}
            style={{ padding: '10px 20px', background: sumOk ? '#FF6B2B' : '#cbd5e1', color: '#fff', border: 0, borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: sumOk ? 'pointer' : 'not-allowed' }}
          >
            {submitting ? 'Converting…' : 'Convert & Generate'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/sow/[id]/ConvertModal.tsx
git commit -m "feat(admin): SOW Convert modal with payment-plan builder + TIK + backfill"
```

---

## Task 19: Wire Convert button into SOW detail page

**Files:**
- Modify: `src/app/admin/sow/[id]/page.tsx`

- [ ] **Step 1: Read the current SOW detail page**

Read `src/app/admin/sow/[id]/page.tsx` end-to-end to understand its structure.

- [ ] **Step 2: Add the Convert button + modal**

The page is likely a server component that hydrates a client subtree. Find the existing buttons area in the rendered SOW header. Add (above or beside the Send/Edit buttons):

For server-component pages, you'll need a tiny client wrapper. If the page already has a client subtree, add the button there. Otherwise create a small inline client component.

Add to the page (adapt to the actual structure):
```tsx
{/* Add at top of file imports */}
import { ConvertButton } from './ConvertButton'

{/* In the render, near other action buttons */}
<ConvertButton sow={{
  id: sow.id,
  sow_number: sow.sow_number,
  title: sow.title,
  status: sow.status,
  total_cents: sow.pricing.total_cents,
  trade_credit_cents: sow.trade_credit_cents ?? 0,
  trade_credit_description: sow.trade_credit_description,
  phases: (sow.phases ?? []).map((p: any) => ({ id: p.id, name: p.name })),
}} />
```

- [ ] **Step 3: Create the ConvertButton client wrapper**

Create `src/app/admin/sow/[id]/ConvertButton.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConvertModal } from './ConvertModal'

interface SowSummary {
  id: string
  sow_number: string
  title: string
  status: string
  total_cents: number
  trade_credit_cents: number
  trade_credit_description: string | null
  phases: Array<{ id: string; name: string }>
}

const labelByStatus: Record<string, { label: string; color: string }> = {
  draft:    { label: 'Convert SOW to Project',     color: '#FF6B2B' },
  sent:     { label: 'Convert SOW to Project',     color: '#FF6B2B' },
  viewed:   { label: 'Convert SOW to Project',     color: '#FF6B2B' },
  accepted: { label: 'Re-run Project Setup',       color: '#68c5ad' },
  declined: { label: 'Force Convert (override)',   color: '#dc2626' },
  void:     { label: 'Force Convert (override)',   color: '#dc2626' },
}

export function ConvertButton({ sow }: { sow: SowSummary }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const meta = labelByStatus[sow.status] ?? labelByStatus.draft

  function handleClick() {
    if (sow.status === 'declined' || sow.status === 'void') {
      if (!confirm(`SOW status is ${sow.status}. Are you sure you want to force-convert?`)) return
    }
    setOpen(true)
  }

  return (
    <>
      <button onClick={handleClick}
        style={{
          padding: '8px 16px',
          background: meta.color,
          color: '#fff',
          border: 0,
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {meta.label}
      </button>
      {open && (
        <ConvertModal
          sow={sow}
          onClose={() => setOpen(false)}
          onConverted={(result) => {
            setOpen(false)
            alert(`Project created: ${result.project_id}\nInvoices: ${result.installments.filter((i) => i.invoice_number).map((i) => i.invoice_number).join(', ') || '(none yet)'}\nReloading…`)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
```

- [ ] **Step 4: Build to verify**

Run: `npm run build`
Expected: zero errors. If errors about prop type mismatch with the page, adjust the page-side prop construction.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/sow/[id]/page.tsx src/app/admin/sow/[id]/ConvertButton.tsx
git commit -m "feat(admin): always-visible Convert button on SOW detail page"
```

---

## Task 20: End-to-end test — SOW-MOME conversion

**Files:**
- No code changes. Manual test against real data.

- [ ] **Step 1: Push all Plan B commits**

```bash
git push origin master
```

Wait for Vercel deploy.

- [ ] **Step 2: Open SOW-MOME-042426A in admin**

Navigate to `https://demandsignals.co/admin/sow/...` (find the SOW by number in `/admin/sow`).

- [ ] **Step 3: Click "Convert SOW to Project"**

Click the orange Convert button. Modal opens.

- [ ] **Step 4: Configure for SOW-MOME's plan**

In the modal:
- Acceptance: keep defaults, "in_person", today's date
- TIK: should auto-populate from SOW's `trade_credit_cents`. If the SOW doesn't have a TIK amount set, manually check the box and enter `1275.00` with description "Marketing services owed by client" and trigger `on_acceptance`
- Payment plan: click "2 installments (30d)" preset
  - Installment 1: $250.00, on_acceptance, "Installment 1 of 2"
  - Installment 2: $250.00, time, +30 days, "Installment 2 of 2"
- Sum check should show ✓ green ($500.00 of $500.00 cash allocated; $1,275 TIK separate)
- Send invoices: ✓ checked

- [ ] **Step 5: Click "Convert & Generate"**

Expected: alert pops up showing project ID and invoice numbers (INV-MOME-042426A allocated). Modal closes. Page refreshes.

- [ ] **Step 6: Verify state**

Check:
- `/admin/sow/[id]` — SOW status now `accepted`
- `/admin/projects` — new project appears
- `/admin/invoices` — INV-MOME-042426A in `sent` status, $250
- `/admin/trade-credits` — TIK ledger row with $1,275 outstanding (or check via SQL if no admin page exists yet)
- `/admin/payment-schedules/[id]` — payment schedule shows 2 installments, #1 status `invoice_issued`, #2 status `pending` with trigger_date in 30 days
- Email: confirm magic-link email was sent (depends on email config — Plan A didn't wire email send; this may not happen automatically)

- [ ] **Step 7: Click magic link, verify Pay button**

Open the public invoice URL `https://demandsignals.co/invoice/INV-MOME-042426A/<uuid>`. Verify Pay button renders. Optionally pay with test card 4242…

- [ ] **Step 8: After successful pay, verify cascade**

Pay installment 1. Verify:
- Invoice status → paid
- Receipt RCT-MOME-042426A issued
- payment_installments row #1 → status `paid`
- payment_schedules.locked_at set
- Stripe customer has saved card

(Cascade triggers will only fire if installment 1 has dependents — for SOW-MOME it doesn't. The cascade test runs against Hangtown later.)

---

## Task 21a: Payment-schedule view page + edit endpoint

**Files:**
- Create: `src/app/api/admin/payment-schedules/[id]/route.ts`
- Create: `src/app/admin/payment-schedules/[id]/page.tsx`

- [ ] **Step 1: Create the GET/PATCH API route**

Create `src/app/api/admin/payment-schedules/[id]/route.ts`:
```ts
// ── GET / PATCH /api/admin/payment-schedules/[id] ───────────────────
// GET returns schedule + installments. PATCH allows editing pending
// installments only when the schedule is not locked (locked_at is null).

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: schedule, error: schedErr } = await supabaseAdmin
    .from('payment_schedules')
    .select('*, sow:sow_documents(sow_number, title), project:projects(name)')
    .eq('id', id)
    .single()

  if (schedErr || !schedule) {
    return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
  }

  const { data: installments } = await supabaseAdmin
    .from('payment_installments')
    .select('*, invoice:invoices!payment_installments_invoice_id_fkey(invoice_number, status, public_uuid, total_due_cents)')
    .eq('schedule_id', id)
    .order('sequence', { ascending: true })

  return NextResponse.json({ schedule, installments: installments ?? [] })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: schedule } = await supabaseAdmin
    .from('payment_schedules')
    .select('id, locked_at')
    .eq('id', id)
    .single()

  if (!schedule) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (schedule.locked_at) {
    return NextResponse.json(
      { error: 'Schedule is locked (a payment has been received). Issue a change-order SOW for further changes.' },
      { status: 409 },
    )
  }

  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.installments)) {
    return NextResponse.json({ error: 'Body must include installments[]' }, { status: 400 })
  }

  // Apply per-installment patches by id. Only allow editing pending installments.
  for (const patch of body.installments as Array<{ id: string; amount_cents?: number; trigger_date?: string; description?: string }>) {
    const { data: row } = await supabaseAdmin
      .from('payment_installments')
      .select('status')
      .eq('id', patch.id)
      .single()
    if (!row || row.status !== 'pending') continue

    const updates: Record<string, unknown> = {}
    if (typeof patch.amount_cents === 'number') updates.amount_cents = patch.amount_cents
    if (patch.trigger_date !== undefined) updates.trigger_date = patch.trigger_date
    if (patch.description !== undefined) updates.description = patch.description

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin.from('payment_installments').update(updates).eq('id', patch.id)
    }
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Create the admin view page**

Create `src/app/admin/payment-schedules/[id]/page.tsx`:
```tsx
// ── /admin/payment-schedules/[id] ──────────────────────────────────
// Read-only view of a payment schedule + installments.
// Edit-in-place when locked_at is null (future enhancement).

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { formatCents } from '@/lib/format'

export default async function PaymentSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: schedule } = await supabaseAdmin
    .from('payment_schedules')
    .select('*, sow:sow_documents(sow_number, title), project:projects(id, name)')
    .eq('id', id)
    .single()

  if (!schedule) notFound()

  const { data: installments } = await supabaseAdmin
    .from('payment_installments')
    .select('*, invoice:invoices!payment_installments_invoice_id_fkey(invoice_number, status, public_uuid, total_due_cents)')
    .eq('schedule_id', id)
    .order('sequence', { ascending: true })

  const sow = schedule.sow as { sow_number: string; title: string } | null
  const project = schedule.project as { id: string; name: string } | null

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Payment Schedule</h1>
      <p style={{ color: '#5d6780', marginBottom: 16 }}>
        {sow && <span>SOW <Link href={`/admin/sow`}>{sow.sow_number}</Link> — {sow.title}. </span>}
        {project && <span>Project: <Link href={`/admin/projects/${project.id}`}>{project.name}</Link>. </span>}
        Total: {formatCents(schedule.total_cents)}.
        {schedule.locked_at && <span style={{ color: '#dc2626' }}> 🔒 Locked (payment received)</span>}
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 16 }}>
        <thead>
          <tr style={{ background: '#f4f6f9', textAlign: 'left' }}>
            <th style={{ padding: 10 }}>#</th>
            <th style={{ padding: 10 }}>Amount</th>
            <th style={{ padding: 10 }}>Currency</th>
            <th style={{ padding: 10 }}>Trigger</th>
            <th style={{ padding: 10 }}>Status</th>
            <th style={{ padding: 10 }}>Invoice</th>
            <th style={{ padding: 10 }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {(installments ?? []).map((inst: any) => (
            <tr key={inst.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: 10 }}>{inst.sequence}</td>
              <td style={{ padding: 10 }}>
                {formatCents(inst.amount_cents)}
                {inst.amount_paid_cents > 0 && inst.amount_paid_cents < inst.amount_cents && (
                  <span style={{ color: '#f28500', fontSize: 11, display: 'block' }}>
                    ({formatCents(inst.amount_paid_cents)} paid)
                  </span>
                )}
              </td>
              <td style={{ padding: 10 }}>{inst.currency_type}</td>
              <td style={{ padding: 10 }}>
                {inst.trigger_type}
                {inst.trigger_date && <div style={{ fontSize: 11, color: '#5d6780' }}>{inst.trigger_date}</div>}
              </td>
              <td style={{ padding: 10 }}>{inst.status}</td>
              <td style={{ padding: 10 }}>
                {inst.invoice ? (
                  <Link href={`/invoice/${inst.invoice.invoice_number}/${inst.invoice.public_uuid}`} target="_blank">
                    {inst.invoice.invoice_number}
                  </Link>
                ) : '—'}
              </td>
              <td style={{ padding: 10 }}>{inst.description ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/payment-schedules/[id]/route.ts src/app/admin/payment-schedules/[id]/page.tsx
git commit -m "feat(admin): payment-schedule view page + edit API"
```

---

## Task 21b: Change-order endpoint

**Files:**
- Create: `src/app/api/admin/sow/[id]/change-order/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/admin/sow/[id]/change-order/route.ts`:
```ts
// ── POST /api/admin/sow/[id]/change-order ───────────────────────────
// Creates a mini-SOW with parent_sow_id pointing at the original.
// Admin then converts the mini-SOW via the normal /convert endpoint.
//
// Body: { title: string, scope_summary: string, total_cents: number,
//         deliverables?: SowDeliverable[] }

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { allocateDocNumber } from '@/lib/doc-numbering'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => null)
  if (!body || !body.title || typeof body.total_cents !== 'number') {
    return NextResponse.json({ error: 'title and total_cents required' }, { status: 400 })
  }

  const { data: parent } = await supabaseAdmin
    .from('sow_documents')
    .select('*')
    .eq('id', id)
    .single()

  if (!parent) return NextResponse.json({ error: 'Parent SOW not found' }, { status: 404 })

  // Insert child SOW with placeholder number.
  const tempNum = `PENDING-CO-${crypto.randomUUID()}`
  const { data: child, error: insErr } = await supabaseAdmin
    .from('sow_documents')
    .insert({
      sow_number: tempNum,
      parent_sow_id: parent.id,
      prospect_id: parent.prospect_id,
      quote_session_id: parent.quote_session_id,
      status: 'draft',
      title: body.title,
      scope_summary: body.scope_summary ?? null,
      phases: [],  // change orders default to flat structure; admin can add phases later
      deliverables: body.deliverables ?? [],
      timeline: [],
      pricing: {
        total_cents: body.total_cents,
        deposit_cents: body.total_cents,
        deposit_pct: 100,
      },
    })
    .select('*')
    .single()

  if (insErr || !child) {
    return NextResponse.json({ error: `Insert failed: ${insErr?.message}` }, { status: 500 })
  }

  // Allocate SOW number.
  if (parent.prospect_id) {
    try {
      const sowNumber = await allocateDocNumber({
        doc_type: 'SOW',
        prospect_id: parent.prospect_id,
        ref_table: 'sow_documents',
        ref_id: child.id,
      })
      await supabaseAdmin.from('sow_documents').update({ sow_number: sowNumber }).eq('id', child.id)
      child.sow_number = sowNumber
    } catch (e) {
      console.error('[change-order] number allocation failed:', e)
    }
  }

  return NextResponse.json({
    sow: child,
    message: `Change-order SOW ${child.sow_number} created. Open it in /admin/sow and click Convert to issue installments.`,
  })
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/app/api/admin/sow/[id]/change-order/route.ts
git commit -m "feat(api): SOW change-order endpoint"
```

---

## Task 21c: Project Outstanding Obligations panel

**Files:**
- Modify: `src/app/admin/projects/[id]/page.tsx`

- [ ] **Step 1: Read current project page**

Read `src/app/admin/projects/[id]/page.tsx` to see structure.

- [ ] **Step 2: Add data fetch for installments + trade credits**

In the page's data-loading section, after fetching the project, also fetch:
```tsx
const { data: schedule } = await supabaseAdmin
  .from('payment_schedules')
  .select('id, locked_at, total_cents')
  .eq('project_id', project.id)
  .maybeSingle()

const { data: installments } = schedule
  ? await supabaseAdmin
      .from('payment_installments')
      .select('*, invoice:invoices!payment_installments_invoice_id_fkey(invoice_number, public_uuid, status)')
      .eq('schedule_id', schedule.id)
      .order('sequence')
  : { data: [] }

const { data: tradeCredits } = await supabaseAdmin
  .from('trade_credits')
  .select('id, original_amount_cents, remaining_cents, description, status')
  .eq('prospect_id', project.prospect_id)
  .in('status', ['outstanding', 'partial'])
```

- [ ] **Step 3: Render the panel**

Add to the page JSX (above or below existing content):
```tsx
<section style={{ margin: '24px 0', padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fafbfc' }}>
  <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Outstanding Obligations</h2>

  {/* Cash installments */}
  {(installments ?? []).filter((i: any) => i.currency_type === 'cash' && i.status !== 'paid' && i.status !== 'cancelled').length > 0 && (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Pending cash payments</h3>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
        {(installments ?? []).filter((i: any) => i.currency_type === 'cash' && i.status !== 'paid' && i.status !== 'cancelled').map((i: any) => (
          <li key={i.id} style={{ marginBottom: 4 }}>
            #{i.sequence} — ${(i.amount_cents / 100).toFixed(2)} ·
            {i.trigger_type === 'time' && ` due ${i.trigger_date}`}
            {i.trigger_type === 'milestone' && ` on milestone`}
            {i.trigger_type === 'on_completion_of_payment' && ` after another payment`}
            {i.trigger_type === 'on_acceptance' && ` on acceptance`}
            {' · '}status: {i.status}
            {i.invoice && (
              <> · <a href={`/invoice/${i.invoice.invoice_number}/${i.invoice.public_uuid}`} target="_blank">{i.invoice.invoice_number}</a></>
            )}
          </li>
        ))}
      </ul>
    </div>
  )}

  {/* TIK ledgers */}
  {(tradeCredits ?? []).length > 0 && (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Trade-in-Kind ledgers (services owed by client)</h3>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
        {(tradeCredits ?? []).map((tc: any) => (
          <li key={tc.id} style={{ marginBottom: 4 }}>
            ${(tc.remaining_cents / 100).toFixed(2)} remaining of ${(tc.original_amount_cents / 100).toFixed(2)} · {tc.description}
          </li>
        ))}
      </ul>
    </div>
  )}

  {((installments ?? []).filter((i: any) => i.currency_type === 'cash' && i.status !== 'paid' && i.status !== 'cancelled').length === 0 && (tradeCredits ?? []).length === 0) && (
    <p style={{ fontSize: 13, color: '#5d6780', margin: 0 }}>No outstanding obligations.</p>
  )}
</section>
```

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add src/app/admin/projects/[id]/page.tsx
git commit -m "feat(admin): project page Outstanding Obligations panel"
```

---

## Task 21d: Trade-credit detail page with drawdown form

**Files:**
- Create: `src/app/admin/trade-credits/[id]/page.tsx`
- Create: `src/app/admin/trade-credits/[id]/DrawdownForm.tsx`

- [ ] **Step 1: Create the page**

Create `src/app/admin/trade-credits/[id]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { formatCents } from '@/lib/format'
import { DrawdownForm } from './DrawdownForm'

export default async function TradeCreditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: tc } = await supabaseAdmin
    .from('trade_credits')
    .select('*, prospect:prospects(business_name), sow:sow_documents(sow_number, title)')
    .eq('id', id)
    .single()

  if (!tc) notFound()

  const { data: drawdowns } = await supabaseAdmin
    .from('trade_credit_drawdowns')
    .select('*')
    .eq('trade_credit_id', id)
    .order('delivered_on', { ascending: false })

  const prospect = tc.prospect as { business_name: string } | null
  const sow = tc.sow as { sow_number: string; title: string } | null

  return (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Trade-in-Kind Ledger</h1>
      <p style={{ color: '#5d6780', marginBottom: 16 }}>
        {prospect && <span>{prospect.business_name} · </span>}
        {sow && <span>SOW {sow.sow_number} — {sow.title}</span>}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 16, background: '#f4f6f9', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#5d6780', textTransform: 'uppercase' }}>Description</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>{tc.description}</div>
        </div>
        <div style={{ padding: 16, background: '#f4f6f9', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#5d6780', textTransform: 'uppercase' }}>Original</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{formatCents(tc.original_amount_cents)}</div>
        </div>
        <div style={{ padding: 16, background: tc.remaining_cents > 0 ? '#fef3c7' : '#dcfce7', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#5d6780', textTransform: 'uppercase' }}>Remaining</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{formatCents(tc.remaining_cents)}</div>
          <div style={{ fontSize: 11, marginTop: 4, color: '#5d6780' }}>Status: {tc.status}</div>
        </div>
      </div>

      {tc.status !== 'fulfilled' && tc.status !== 'written_off' && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Mark Services Delivered</h2>
          <DrawdownForm tradeCreditId={tc.id} remainingCents={tc.remaining_cents} />
        </section>
      )}

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Drawdown History</h2>
        {(drawdowns ?? []).length === 0 ? (
          <p style={{ color: '#5d6780' }}>No drawdowns yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f4f6f9', textAlign: 'left' }}>
                <th style={{ padding: 10 }}>Delivered</th>
                <th style={{ padding: 10 }}>Amount</th>
                <th style={{ padding: 10 }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {(drawdowns ?? []).map((d: any) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: 10 }}>{d.delivered_on}</td>
                  <td style={{ padding: 10 }}>{formatCents(d.amount_cents)}</td>
                  <td style={{ padding: 10 }}>{d.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Create the DrawdownForm client component**

Create `src/app/admin/trade-credits/[id]/DrawdownForm.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  tradeCreditId: string
  remainingCents: number
}

export function DrawdownForm({ tradeCreditId, remainingCents }: Props) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [deliveredOn, setDeliveredOn] = useState(today)
  const [busy, setBusy] = useState(false)
  const [overage, setOverage] = useState<{ overage_cents: number } | null>(null)

  async function submit(overage_action?: 'cash_invoice' | 'new_tik_ledger') {
    setBusy(true)
    const amountCents = Math.round(parseFloat(amount || '0') * 100)
    const res = await fetch(`/api/admin/trade-credits/${tradeCreditId}/drawdown`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        amount_cents: amountCents,
        description,
        delivered_on: deliveredOn,
        overage_action,
      }),
    })
    const data = await res.json()
    setBusy(false)
    if (res.status === 409 && data.kind === 'overage') {
      setOverage(data)
      return
    }
    if (!res.ok) {
      alert(`Failed: ${data.error}`)
      return
    }
    alert(`Drawdown recorded. Receipt ${data.receipt?.receipt_number ?? '(pending)'} issued.`)
    setOverage(null)
    setAmount(''); setDescription('')
    router.refresh()
  }

  return (
    <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#5d6780', marginBottom: 4 }}>Service value ($)</label>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
            style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#5d6780', marginBottom: 4 }}>Delivered on</label>
          <input type="date" value={deliveredOn} onChange={(e) => setDeliveredOn(e.target.value)}
            style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}
          />
        </div>
      </div>
      <label style={{ display: 'block', fontSize: 12, color: '#5d6780', marginBottom: 4 }}>Description (what was delivered)</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)}
        style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, minHeight: 60, marginBottom: 12 }}
      />

      {overage ? (
        <div style={{ padding: 12, background: '#fef3c7', borderRadius: 6, marginBottom: 12 }}>
          <p style={{ marginBottom: 8, fontSize: 13 }}>
            ⚠ Service value exceeds remaining TIK by ${(overage.overage_cents / 100).toFixed(2)}.
            How should the overage be handled?
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => submit('cash_invoice')} disabled={busy}
              style={{ padding: '8px 14px', background: '#FF6B2B', color: '#fff', border: 0, borderRadius: 6, fontSize: 13 }}
            >Bill overage as cash invoice</button>
            <button onClick={() => submit('new_tik_ledger')} disabled={busy}
              style={{ padding: '8px 14px', background: '#68c5ad', color: '#fff', border: 0, borderRadius: 6, fontSize: 13 }}
            >Open new TIK ledger for overage</button>
            <button onClick={() => setOverage(null)} disabled={busy}
              style={{ padding: '8px 14px', background: '#e2e8f0', border: 0, borderRadius: 6, fontSize: 13 }}
            >Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => submit()} disabled={busy || !amount || !description}
          style={{ padding: '10px 20px', background: '#16a34a', color: '#fff', border: 0, borderRadius: 6, fontSize: 14, fontWeight: 600 }}
        >Record Drawdown + Issue Receipt</button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/app/admin/trade-credits/[id]/page.tsx src/app/admin/trade-credits/[id]/DrawdownForm.tsx
git commit -m "feat(admin): trade-credit detail page with drawdown form + overage UX"
```

---

## Task 22: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` §10 (What Is Complete), §6 (file structure for new files), §11 (mark items done)

- [ ] **Step 1: Append to §10 What Is Complete**

```markdown
- [x] Stripe Plan B (payment plans + SOW conversion): payment_schedules + payment_installments tables; convertSowToProject orchestrator (src/lib/payment-plans.ts) called from new POST /api/admin/sow/[id]/convert + ConvertModal; multi-installment cash + TIK with triggers (on_acceptance/time/milestone/on_completion_of_payment); backfill mode for historical clients; phase-completion fires milestone-triggered installments; webhook fires on_completion_of_payment cascades; daily cron at /api/cron/payment-triggers fires time-triggered installments; TIK drawdown endpoint with overage handling at POST /api/admin/trade-credits/[id]/drawdown.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark Plan B complete (payment plans + SOW conversion live)"
git push origin master
```

---

## Plan B complete

After this plan:
- Any saved SOW can be converted via admin button into a project + payment plan + invoices.
- SOW-MOME-042426A end-to-end works.
- Hangtown can be backfilled.
- TIK ledger opens at acceptance OR cascades from cash payment.
- Milestone phase completion fires the right invoices.
- Time-triggered installments fire automatically via daily cron.
- Webhook handles cash payment cascade for `on_completion_of_payment` triggers.

**Subscriptions are still managed only in DSIG (no Stripe-side subscriptions yet).** Plan C wires those.
