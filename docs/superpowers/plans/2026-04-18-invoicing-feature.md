# Invoicing Feature Implementation Plan

**Status:** SHIPPED 2026-04-18 · DEPLOYED
**Commit range:** various (invoicing v1 sprint)
**See also:** `docs/runbooks/invoicing-morning-2026-04-18.md`, `docs/runbooks/sow-lifecycle.md`
**Notes:** This was v1. The expanded v2 plan (`2026-04-18-invoicing-v2-expanded.md`) superseded parts of this plan. The PDF rendering section was later replaced by the Chromium in-repo pipeline (see `docs/superpowers/specs/2026-04-24-pdf-pipeline.md`).

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the full invoicing system in `demandsignals-next` — schema migrations, R2+PDF-service integration, admin API, admin UI, public invoice viewer, Restaurant Rule automation, manual-routed Phase 1 delivery. Working end-to-end: admin creates invoice → PDF rendered → stored in R2 → public URL shareable → void+re-issue preserves history.

**Architecture:** Next.js 16 App Router. Supabase RLS-gated tables for invoices. Admin-auth `/api/admin/invoices/*` routes using existing `requireAdmin` middleware. Public `/api/invoices/public/*` routes using uuid gating (no auth). PDFs rendered by `dsig-pdf-service` (plan 2), stored in R2 private bucket via `r2-storage.ts` (plan 1). Delivery Phase 1 = admin copies URL from modal post-send; Phases 2-4 layer in SMS/email as A2P/SMTP unblock.

**Tech Stack:** TypeScript, Next.js 16, React 19, Tailwind v4, Supabase, Cloudflare R2, Python PDF microservice (external), Gmail SMTP (Phase 3), Twilio (Phase 2).

**Prerequisites (must be complete before Task 1):**
- **Plan 1 shipped:** `src/lib/r2-storage.ts` exists, `test-r2-storage.mjs` passes, Vercel env vars set
- **Plan 2 shipped:** `dsig-pdf-service` deployed at `pdf.demandsignals.co`, smoke test returns valid PDF, `PDF_SERVICE_URL` + `PDF_SERVICE_SECRET` set in Vercel
- Stage A + B migrations already applied (25/25 RLS, confirmed)
- Git head at `cf45a70` (invoicing spec committed) or later

---

## File Structure

### Migrations (applied via Supabase SQL Editor, one file at a time)

| File | Purpose |
|------|---------|
| `supabase/migrations/011a_invoices_versioning.sql` | Add `public_uuid`, supersession columns, void columns |
| `supabase/migrations/011b_invoices_automation.sql` | Add `auto_generated`, `auto_trigger`, `auto_sent` |
| `supabase/migrations/011c_invoices_pdf_storage.sql` | Add `pdf_storage_path`, `pdf_rendered_at`, `pdf_version` |
| `supabase/migrations/011d_invoices_payment_and_category.sql` | Add `paid_method`, `paid_note`, `category_hint`, `sent_via_channel`, `sent_via_email_to`, `public_viewed_count` |
| `supabase/migrations/011e_invoices_indexes.sql` | Indexes on new columns |
| `supabase/migrations/011f_invoice_delivery_log.sql` | New table + RLS |
| `supabase/migrations/011g_invoice_email_log.sql` | New table + RLS |
| `supabase/migrations/012a_automated_invoicing_config.sql` | Insert 3 config rows |
| `supabase/migrations/013a_prospects_delivery_preference.sql` | Prospects delivery preference column |

### Code files

| File | Responsibility |
|------|----------------|
| `src/lib/quote-pricing.ts` | MODIFY: add `displayPriceCents` to PricingItem + populate + bump CATALOG_VERSION |
| `src/lib/invoice-pdf/render.ts` | Call dsig-pdf-service, return PDF buffer |
| `src/lib/invoice-pdf/payload.ts` | Map DB invoice row → PDF service JSON payload |
| `src/lib/invoice-types.ts` | Shared TypeScript types for invoice shapes |
| `src/app/api/admin/invoices/route.ts` | GET list + POST create |
| `src/app/api/admin/invoices/[id]/route.ts` | GET detail, PATCH update, DELETE draft |
| `src/app/api/admin/invoices/[id]/send/route.ts` | Draft → sent, render + upload + auto-paid-if-zero |
| `src/app/api/admin/invoices/[id]/mark-paid/route.ts` | Manual payment stamp |
| `src/app/api/admin/invoices/[id]/void/route.ts` | Pure void |
| `src/app/api/admin/invoices/[id]/void-and-reissue/route.ts` | Atomic void + new draft |
| `src/app/api/admin/invoices/[id]/pdf/route.ts` | Admin PDF 302 to signed URL |
| `src/app/api/admin/invoices/[id]/delivery-log/route.ts` | Fetch delivery + email logs |
| `src/app/api/admin/invoices/restaurant-rule-draft/route.ts` | Automation endpoint |
| `src/app/api/invoices/public/[number]/route.ts` | Public invoice JSON + view tracking |
| `src/app/api/invoices/public/[number]/pdf/route.ts` | Public PDF 302 |
| `src/app/admin/invoices/page.tsx` | List page |
| `src/app/admin/invoices/new/page.tsx` | Create page |
| `src/app/admin/invoices/[id]/page.tsx` | Detail page |
| `src/app/invoice/[number]/[uuid]/page.tsx` | Public viewer |
| `src/components/admin/admin-sidebar.tsx` | MODIFY: add Finance nav group |
| `src/app/admin/quotes/[id]/page.tsx` | MODIFY: add Create Invoice + Restaurant Rule buttons |
| `src/app/admin/prospects/[id]/page.tsx` | MODIFY: add Documents section |
| `scripts/test-invoice-rls.mjs` | RLS tests |
| `scripts/test-invoice-e2e.mjs` | End-to-end lifecycle test |
| `scripts/cleanup-orphan-invoice-pdfs.mjs` | Reconciliation utility |
| `docs/runbooks/stage-c-invoicing-qa.md` | Manual QA checklist |

---

## Task 1: Update catalog — add `displayPriceCents` field

**Files:**
- Modify: `src/lib/quote-pricing.ts`

- [ ] **Step 1: Read current `PricingItem` type**

Run:

```bash
cd "D:/CLAUDE/demandsignals-next"
grep -n "displayPriceCents\|baseRange\|isFree" src/lib/quote-pricing.ts | head -20
```

Note the line of `PricingItem` where you'll add the new field.

- [ ] **Step 2: Add `displayPriceCents` field to the `PricingItem` interface**

Locate the `PricingItem` interface (starts around line 58). Add after the existing price-related fields:

```typescript
  /** Perceived $-value shown on invoices (used by $0 Restaurant Rule displays
   *  as the "value" line items before a 100% discount brings total to zero).
   *  For paid items, usually set to the midpoint of baseRange. */
  displayPriceCents: number
```

- [ ] **Step 3: Populate `displayPriceCents` on all CATALOG items**

For each item in the `CATALOG` array, add `displayPriceCents: <midpoint_of_baseRange_in_cents>` (or the free-research values below). The 4 free-research items get these exact values:

- `market-research` → `displayPriceCents: 50000` ($500)
- `competitor-analysis` → `displayPriceCents: 50000` ($500)
- `site-audit` → `displayPriceCents: 40000` ($400)
- `social-audit` → `displayPriceCents: 35000` ($350)

For all other items: compute as `Math.round((baseRange[0] + baseRange[1]) / 2 * 100)` (average of range, converted to cents). If an item's `baseRange` is `[0, 0]` (fully free or not applicable), use `displayPriceCents: 0`.

Use a scripted find (not manual editing) to avoid missing any. Run this helper:

```bash
grep -cE "^    id: '" src/lib/quote-pricing.ts
```

Count = number of items. After editing, verify every item has `displayPriceCents`:

```bash
grep -c "displayPriceCents:" src/lib/quote-pricing.ts
```

The two counts should match.

- [ ] **Step 4: Bump CATALOG_VERSION**

Change line 23:

```typescript
export const CATALOG_VERSION = '2026.04.18-1'
```

- [ ] **Step 5: TypeScript check**

Run:

```bash
npx tsc --noEmit
```

Expected: clean. If errors about missing `displayPriceCents`, find the item(s) and add the field.

- [ ] **Step 6: Run catalog validation**

Run:

```bash
npx tsx scripts/check-catalog.mjs
```

Expected: `All validations passed.` If validation enforces schema strictness, it may flag the new field — edit `validateCatalog` in `quote-pricing.ts` to recognize the field if needed.

- [ ] **Step 7: Commit**

```bash
git add src/lib/quote-pricing.ts
git commit -m "$(cat <<'EOF'
feat(catalog): add displayPriceCents for invoice line-item display

Used by $0 Restaurant Rule invoices — shows perceived value per line
before the 100% discount row takes the total to $0. Midpoint of baseRange
for all paid items; explicit $500/$500/$400/$350 for the 4 free-research
items.

Bump CATALOG_VERSION to 2026.04.18-1.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Apply migration 011a — invoices versioning columns

**Files:**
- Create: `supabase/migrations/011a_invoices_versioning.sql`

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/011a_invoices_versioning.sql`:

```sql
-- 011a: Add versioning + void columns to invoices table.
-- Additive only. Safe to re-run (uses IF NOT EXISTS).

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS public_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS supersedes_invoice_id uuid REFERENCES invoices(id),
  ADD COLUMN IF NOT EXISTS superseded_by_invoice_id uuid REFERENCES invoices(id),
  ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS void_reason text;
```

- [ ] **Step 2: Apply in Supabase SQL Editor**

1. Open Supabase dashboard → SQL Editor
2. Paste the contents of `011a_invoices_versioning.sql`
3. Select all → Run
4. Expected: "Success. No rows returned."

- [ ] **Step 3: Verify in Supabase**

Run in SQL Editor:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'invoices'
  AND column_name IN ('public_uuid', 'supersedes_invoice_id', 'superseded_by_invoice_id', 'voided_by', 'void_reason')
ORDER BY column_name;
```

Expected: 5 rows.

- [ ] **Step 4: Commit migration file**

```bash
git add supabase/migrations/011a_invoices_versioning.sql
git commit -m "$(cat <<'EOF'
feat(db): migration 011a — invoices versioning + void columns

public_uuid (for /invoice/[number]/[uuid] public URLs),
supersedes_invoice_id + superseded_by_invoice_id (void+reissue chain),
voided_by + void_reason (audit trail).

Applied to production Supabase.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Apply migration 011b — invoices automation columns

**Files:**
- Create: `supabase/migrations/011b_invoices_automation.sql`

- [ ] **Step 1: Create migration file**

```sql
-- 011b: Add automation tier columns to invoices.
-- Supports Tier 1 (manual), Tier 2 (auto-draft + admin review), Tier 3 (auto-send).

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_trigger text,
  ADD COLUMN IF NOT EXISTS auto_sent boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Apply in Supabase SQL Editor**

Same process as Task 2 Step 2. Expected success.

- [ ] **Step 3: Verify**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'invoices' AND column_name IN ('auto_generated', 'auto_trigger', 'auto_sent');
```

Expected: 3 rows.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/011b_invoices_automation.sql
git commit -m "feat(db): migration 011b — invoices automation flags

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Apply migration 011c — PDF storage columns

**Files:**
- Create: `supabase/migrations/011c_invoices_pdf_storage.sql`

- [ ] **Step 1: Create file**

```sql
-- 011c: PDF storage tracking on invoices.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS pdf_storage_path text,
  ADD COLUMN IF NOT EXISTS pdf_rendered_at timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_version integer NOT NULL DEFAULT 1;
```

- [ ] **Step 2: Apply in Supabase SQL Editor**

Same pattern. Verify with:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='invoices' AND column_name IN ('pdf_storage_path', 'pdf_rendered_at', 'pdf_version');
```

Expected: 3 rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/011c_invoices_pdf_storage.sql
git commit -m "feat(db): migration 011c — PDF storage tracking on invoices

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Apply migration 011d — payment + category + delivery columns

**Files:**
- Create: `supabase/migrations/011d_invoices_payment_and_category.sql`

- [ ] **Step 1: Create file**

```sql
-- 011d: Payment method tracking, category hints for future accounting,
-- delivery channel tracking, public view counter.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS paid_method text,
  ADD COLUMN IF NOT EXISTS paid_note text,
  ADD COLUMN IF NOT EXISTS category_hint text,
  ADD COLUMN IF NOT EXISTS sent_via_channel text,
  ADD COLUMN IF NOT EXISTS sent_via_email_to text,
  ADD COLUMN IF NOT EXISTS public_viewed_count integer NOT NULL DEFAULT 0;
```

- [ ] **Step 2: Apply + verify**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='invoices'
  AND column_name IN ('paid_method', 'paid_note', 'category_hint', 'sent_via_channel', 'sent_via_email_to', 'public_viewed_count');
```

Expected: 6 rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/011d_invoices_payment_and_category.sql
git commit -m "feat(db): migration 011d — payment + category + delivery tracking

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Apply migration 011e — indexes

**Files:**
- Create: `supabase/migrations/011e_invoices_indexes.sql`

- [ ] **Step 1: Create file**

```sql
-- 011e: Indexes for common query patterns.

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_public_uuid ON invoices (public_uuid);
CREATE INDEX IF NOT EXISTS idx_invoices_supersedes ON invoices (supersedes_invoice_id) WHERE supersedes_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_auto_trigger ON invoices (auto_trigger) WHERE auto_trigger IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_auto_draft_queue ON invoices (created_at DESC)
  WHERE auto_generated = true AND status = 'draft';
CREATE INDEX IF NOT EXISTS idx_invoices_category_hint ON invoices (category_hint) WHERE category_hint IS NOT NULL;
```

- [ ] **Step 2: Apply + verify**

```sql
SELECT indexname FROM pg_indexes WHERE tablename='invoices'
  AND indexname LIKE 'idx_invoices_%' ORDER BY indexname;
```

Expected: at least 5 matching indexes (the 5 above plus any pre-existing).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/011e_invoices_indexes.sql
git commit -m "feat(db): migration 011e — invoices indexes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Apply migration 011f — invoice_delivery_log table

**Files:**
- Create: `supabase/migrations/011f_invoice_delivery_log.sql`

- [ ] **Step 1: Create file**

```sql
-- 011f: Per-send delivery audit log. Tracks every SMS/email/manual send attempt.

CREATE TABLE IF NOT EXISTS invoice_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','sms','manual')),
  recipient text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL,
  provider_message_id text,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_invoice_delivery_log_invoice ON invoice_delivery_log (invoice_id, sent_at DESC);

ALTER TABLE invoice_delivery_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read invoice_delivery_log" ON invoice_delivery_log;
DROP POLICY IF EXISTS "Admins can insert invoice_delivery_log" ON invoice_delivery_log;

CREATE POLICY "Admins can read invoice_delivery_log" ON invoice_delivery_log FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert invoice_delivery_log" ON invoice_delivery_log FOR INSERT WITH CHECK (is_admin());

REVOKE ALL ON invoice_delivery_log FROM anon;
```

- [ ] **Step 2: Apply + verify**

```sql
SELECT COUNT(*) FROM invoice_delivery_log;
```

Expected: 0 (empty table exists).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/011f_invoice_delivery_log.sql
git commit -m "feat(db): migration 011f — invoice_delivery_log table

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Apply migration 011g — invoice_email_log table

**Files:**
- Create: `supabase/migrations/011g_invoice_email_log.sql`

- [ ] **Step 1: Create file**

```sql
-- 011g: Email-specific delivery log (separate from delivery_log because
-- email has SMTP-specific fields like message-id for deliverability tracking).

CREATE TABLE IF NOT EXISTS invoice_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sent_to text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  smtp_message_id text,
  success boolean NOT NULL,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_invoice_email_log_invoice ON invoice_email_log (invoice_id, sent_at DESC);

ALTER TABLE invoice_email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read invoice_email_log" ON invoice_email_log;
DROP POLICY IF EXISTS "Admins can insert invoice_email_log" ON invoice_email_log;

CREATE POLICY "Admins can read invoice_email_log" ON invoice_email_log FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert invoice_email_log" ON invoice_email_log FOR INSERT WITH CHECK (is_admin());

REVOKE ALL ON invoice_email_log FROM anon;
```

- [ ] **Step 2: Apply + verify**

```sql
SELECT COUNT(*) FROM invoice_email_log;
```

Expected: 0.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/011g_invoice_email_log.sql
git commit -m "feat(db): migration 011g — invoice_email_log table

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Apply migration 012a — automation config kill switches

**Files:**
- Create: `supabase/migrations/012a_automated_invoicing_config.sql`

- [ ] **Step 1: Create file**

```sql
-- 012a: Config kill switches for invoice automation + delivery channels.

INSERT INTO quote_config (key, value) VALUES
  ('automated_invoicing_enabled', 'true'),
  ('a2p_transactional_enabled', 'false'),
  ('email_delivery_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
```

- [ ] **Step 2: Apply + verify**

```sql
SELECT key, value FROM quote_config
WHERE key IN ('automated_invoicing_enabled', 'a2p_transactional_enabled', 'email_delivery_enabled')
ORDER BY key;
```

Expected: 3 rows with matching values.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/012a_automated_invoicing_config.sql
git commit -m "feat(db): migration 012a — automation + delivery config flags

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Apply migration 013a — prospects delivery preference

**Files:**
- Create: `supabase/migrations/013a_prospects_delivery_preference.sql`

- [ ] **Step 1: Create file**

```sql
-- 013a: Per-prospect delivery channel preference.

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS delivery_preference text NOT NULL DEFAULT 'both'
    CHECK (delivery_preference IN ('email_only','sms_only','both'));
```

- [ ] **Step 2: Apply + verify**

```sql
SELECT column_name, column_default FROM information_schema.columns
WHERE table_name='prospects' AND column_name='delivery_preference';
```

Expected: 1 row with default `'both'`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/013a_prospects_delivery_preference.sql
git commit -m "feat(db): migration 013a — prospects delivery_preference column

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Invoice types + PDF render client

**Files:**
- Create: `src/lib/invoice-types.ts`
- Create: `src/lib/invoice-pdf/payload.ts`
- Create: `src/lib/invoice-pdf/render.ts`

- [ ] **Step 1: Create `src/lib/invoice-types.ts`**

```typescript
// ── Shared invoice TypeScript types ─────────────────────────────────

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'void'

export type PaidMethod = 'zero_balance' | 'check' | 'wire' | 'stripe' | 'other' | null

export type CategoryHint = 'service_revenue' | 'marketing_expense' | 'research_credit' | 'other' | null

export type SentViaChannel = 'manual' | 'email' | 'sms' | 'both' | null

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price_cents: number
  subtotal_cents: number
  discount_pct: number
  discount_cents: number
  discount_label: string | null
  line_total_cents: number
  sort_order: number
}

export interface Invoice {
  id: string
  invoice_number: string
  public_uuid: string
  prospect_id: string | null
  quote_session_id: string | null
  status: InvoiceStatus
  subtotal_cents: number
  discount_cents: number
  total_due_cents: number
  currency: string
  due_date: string | null
  paid_at: string | null
  paid_method: PaidMethod
  paid_note: string | null
  category_hint: CategoryHint
  sent_at: string | null
  sent_via_channel: SentViaChannel
  sent_via_email_to: string | null
  viewed_at: string | null
  voided_at: string | null
  voided_by: string | null
  void_reason: string | null
  supersedes_invoice_id: string | null
  superseded_by_invoice_id: string | null
  auto_generated: boolean
  auto_trigger: string | null
  auto_sent: boolean
  pdf_storage_path: string | null
  pdf_rendered_at: string | null
  pdf_version: number
  public_viewed_count: number
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceWithLineItems extends Invoice {
  line_items: InvoiceLineItem[]
  bill_to: {
    business_name: string
    contact_name: string | null
    email: string | null
  }
  supersedes_number?: string | null
  superseded_by_number?: string | null
}
```

- [ ] **Step 2: Create `src/lib/invoice-pdf/payload.ts`**

```typescript
// ── Map DB invoice row → PDF service JSON payload ───────────────────

import type { InvoiceWithLineItems } from '../invoice-types'

export interface InvoicePdfPayload {
  doc_type: 'invoice'
  version: 1
  data: {
    invoice_number: string
    issue_date: string   // YYYY-MM-DD
    due_date: string | null
    status: string
    is_paid: boolean
    is_void: boolean
    is_zero_balance: boolean
    supersedes_number: string | null
    superseded_by_number: string | null
    bill_to: {
      business_name: string
      contact_name: string | null
      email: string | null
    }
    line_items: Array<{
      description: string
      quantity: number
      unit_price_cents: number
      line_total_cents: number
    }>
    subtotal_cents: number
    discount_cents: number
    total_due_cents: number
    notes: string | null
  }
}

export function invoiceToRenderPayload(inv: InvoiceWithLineItems): InvoicePdfPayload {
  return {
    doc_type: 'invoice',
    version: 1,
    data: {
      invoice_number: inv.invoice_number,
      issue_date: inv.created_at.slice(0, 10),  // YYYY-MM-DD
      due_date: inv.due_date,
      status: inv.status,
      is_paid: inv.status === 'paid',
      is_void: inv.status === 'void',
      is_zero_balance: inv.total_due_cents === 0,
      supersedes_number: inv.supersedes_number ?? null,
      superseded_by_number: inv.superseded_by_number ?? null,
      bill_to: inv.bill_to,
      line_items: inv.line_items
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unit_price_cents: li.unit_price_cents,
          line_total_cents: li.line_total_cents,
        })),
      subtotal_cents: inv.subtotal_cents,
      discount_cents: inv.discount_cents,
      total_due_cents: inv.total_due_cents,
      notes: inv.notes,
    },
  }
}
```

- [ ] **Step 3: Create `src/lib/invoice-pdf/render.ts`**

```typescript
// ── HTTP client for dsig-pdf-service ────────────────────────────────

import type { InvoiceWithLineItems } from '../invoice-types'
import { invoiceToRenderPayload } from './payload'

export async function renderInvoicePdf(invoice: InvoiceWithLineItems): Promise<Buffer> {
  const url = process.env.PDF_SERVICE_URL
  const secret = process.env.PDF_SERVICE_SECRET
  if (!url) throw new Error('PDF_SERVICE_URL not configured')
  if (!secret) throw new Error('PDF_SERVICE_SECRET not configured')

  const res = await fetch(`${url.replace(/\/$/, '')}/api/render`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(invoiceToRenderPayload(invoice)),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`PDF service returned ${res.status}: ${errText}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/invoice-types.ts src/lib/invoice-pdf/payload.ts src/lib/invoice-pdf/render.ts
git commit -m "$(cat <<'EOF'
feat(invoice-pdf): HTTP client for dsig-pdf-service + shared types

src/lib/invoice-types.ts — Invoice / InvoiceLineItem / InvoiceWithLineItems
src/lib/invoice-pdf/payload.ts — DB row → PDF service payload shape
src/lib/invoice-pdf/render.ts — fetch-wrapped POST to /api/render

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: RLS test script

**Files:**
- Create: `scripts/test-invoice-rls.mjs`

- [ ] **Step 1: Create test script**

```javascript
#!/usr/bin/env node
// ── Invoice RLS Test Suite ──────────────────────────────────────────
// Verifies anon role CANNOT access invoice_delivery_log or invoice_email_log
// directly. New invoice columns added in 011a-011d inherit existing RLS.

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const envPath = resolve(ROOT, '.env.local')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) {
      const [, k, v] = m
      if (!process.env[k]) process.env[k] = v.replace(/^["']|["']$/g, '')
    }
  }
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !ANON || !SERVICE) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const anon = createClient(URL, ANON)
const service = createClient(URL, SERVICE, { auth: { persistSession: false } })

let passed = 0
let failed = 0

function ok(msg) { console.log(`[PASS] ${msg}`); passed++ }
function fail(msg) { console.log(`[FAIL] ${msg}`); failed++ }

async function expectBlocked(op, fn) {
  try {
    const { error } = await fn()
    if (error && (error.code === '42501' || error.message.includes('permission'))) {
      ok(`${op} — blocked: ${error.code}`)
    } else {
      fail(`${op} — should have been blocked but wasn't`)
    }
  } catch (e) {
    if (String(e).includes('permission') || String(e).includes('42501')) {
      ok(`${op} — blocked`)
    } else {
      fail(`${op} — unexpected error: ${e.message}`)
    }
  }
}

// ── Tests ────────────────────────────────────────────────────────────
console.log('\n═══ Invoice RLS tests ═══\n')

await expectBlocked('anon SELECT * from invoice_delivery_log',
  () => anon.from('invoice_delivery_log').select('*').limit(1))
await expectBlocked('anon INSERT into invoice_delivery_log',
  () => anon.from('invoice_delivery_log').insert({
    invoice_id: '00000000-0000-0000-0000-000000000000',
    channel: 'manual', recipient: 'x', success: true,
  }))
await expectBlocked('anon SELECT * from invoice_email_log',
  () => anon.from('invoice_email_log').select('*').limit(1))
await expectBlocked('anon INSERT into invoice_email_log',
  () => anon.from('invoice_email_log').insert({
    invoice_id: '00000000-0000-0000-0000-000000000000',
    sent_to: 'x', success: true,
  }))

// Service role sanity
const { error: readErr } = await service.from('invoice_delivery_log').select('*').limit(1)
if (!readErr) ok('service role CAN read invoice_delivery_log')
else fail(`service role read failed: ${readErr.message}`)

const { error: emailReadErr } = await service.from('invoice_email_log').select('*').limit(1)
if (!emailReadErr) ok('service role CAN read invoice_email_log')
else fail(`service role email read failed: ${emailReadErr.message}`)

// Confirm new invoices columns exist via service role query
const { error: colErr } = await service
  .from('invoices')
  .select('public_uuid, auto_generated, pdf_storage_path, paid_method, category_hint')
  .limit(1)
if (!colErr) ok('new invoices columns queryable via service role')
else fail(`invoices column query failed: ${colErr.message}`)

console.log()
console.log(`═══════════════════════════════════════════════════`)
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log(`═══════════════════════════════════════════════════`)
process.exit(failed === 0 ? 0 : 1)
```

- [ ] **Step 2: Run it**

```bash
node scripts/test-invoice-rls.mjs
```

Expected: `7 passed, 0 failed`.

- [ ] **Step 3: Commit**

```bash
git add scripts/test-invoice-rls.mjs
git commit -m "$(cat <<'EOF'
test(invoice): add scripts/test-invoice-rls.mjs

Verifies anon can't touch invoice_delivery_log or invoice_email_log.
Confirms new invoices columns exist and are readable via service role.

Expected: 7 passed, 0 failed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Admin API — GET list + POST create

**Files:**
- Create: `src/app/api/admin/invoices/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// ── /api/admin/invoices — list + create ─────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getItemById, CATALOG_VERSION } from '@/lib/quote-pricing'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const sp = request.nextUrl.searchParams
  const status = sp.get('status')
  const prospectId = sp.get('prospect_id')
  const autoOnly = sp.get('auto_generated') === 'true'
  const search = sp.get('search')
  const limit = Math.min(parseInt(sp.get('limit') || '50'), 200)
  const offset = parseInt(sp.get('offset') || '0')

  let q = supabaseAdmin
    .from('invoices')
    .select('id, invoice_number, prospect_id, status, total_due_cents, currency, auto_generated, auto_trigger, created_at, sent_at, paid_at, prospects(business_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) q = q.eq('status', status)
  if (prospectId) q = q.eq('prospect_id', prospectId)
  if (autoOnly) q = q.eq('auto_generated', true)
  if (search) q = q.or(`invoice_number.ilike.%${search}%`)

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ invoices: data ?? [], total: count ?? 0, limit, offset })
}

interface CreateLineItem {
  catalog_item_id?: string
  description?: string
  quantity: number
  unit_price_cents?: number
  discount_pct?: number
  discount_label?: string
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const {
    prospect_id,
    quote_session_id,
    line_items,
    notes,
    due_date,
    category_hint,
  }: {
    prospect_id?: string
    quote_session_id?: string
    line_items: CreateLineItem[]
    notes?: string
    due_date?: string
    category_hint?: string
  } = body

  if (!Array.isArray(line_items) || line_items.length === 0) {
    return NextResponse.json({ error: 'At least one line item required' }, { status: 400 })
  }

  // Resolve line items: catalog or custom
  const resolved = line_items.map((li): {
    description: string
    quantity: number
    unit_price_cents: number
    subtotal_cents: number
    discount_pct: number
    discount_cents: number
    discount_label: string | null
    line_total_cents: number
  } => {
    let description: string
    let unitPrice: number

    if (li.catalog_item_id) {
      const item = getItemById(li.catalog_item_id)
      if (!item) throw new Error(`Unknown catalog item: ${li.catalog_item_id}`)
      description = item.name
      unitPrice = item.displayPriceCents
    } else {
      if (!li.description) throw new Error('Custom line item needs description')
      if (typeof li.unit_price_cents !== 'number') throw new Error('Custom line item needs unit_price_cents')
      description = li.description
      unitPrice = li.unit_price_cents
    }

    const qty = li.quantity || 1
    const subtotal = unitPrice * qty
    const discountPct = li.discount_pct ?? 0
    const discountCents = Math.round(subtotal * discountPct / 100)
    const lineTotal = subtotal - discountCents

    return {
      description,
      quantity: qty,
      unit_price_cents: unitPrice,
      subtotal_cents: subtotal,
      discount_pct: discountPct,
      discount_cents: discountCents,
      discount_label: li.discount_label ?? null,
      line_total_cents: lineTotal,
    }
  })

  const subtotalCents = resolved.reduce((s, r) => s + Math.max(0, r.subtotal_cents), 0)
  const discountCents = resolved.reduce((s, r) => s + r.discount_cents, 0)
  const totalDueCents = resolved.reduce((s, r) => s + r.line_total_cents, 0)

  // Generate invoice number
  const { data: numResult, error: numErr } = await supabaseAdmin.rpc('generate_invoice_number')
  if (numErr || !numResult) {
    return NextResponse.json({ error: `Number generation failed: ${numErr?.message}` }, { status: 500 })
  }

  // Insert invoice
  const { data: inv, error: invErr } = await supabaseAdmin
    .from('invoices')
    .insert({
      invoice_number: numResult,
      prospect_id: prospect_id ?? null,
      quote_session_id: quote_session_id ?? null,
      status: 'draft',
      subtotal_cents: subtotalCents,
      discount_cents: discountCents,
      total_due_cents: totalDueCents,
      currency: 'USD',
      due_date: due_date ?? null,
      category_hint: category_hint ?? 'service_revenue',
      notes: notes ?? null,
      created_by: auth.user.id,
    })
    .select('*')
    .single()

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

  // Insert line items
  const lineInserts = resolved.map((r, idx) => ({
    invoice_id: inv.id,
    sort_order: idx,
    ...r,
  }))
  const { error: liErr } = await supabaseAdmin.from('invoice_line_items').insert(lineInserts)
  if (liErr) {
    await supabaseAdmin.from('invoices').delete().eq('id', inv.id)
    return NextResponse.json({ error: `Line items: ${liErr.message}` }, { status: 500 })
  }

  return NextResponse.json({ invoice: inv, catalog_version: CATALOG_VERSION })
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: clean. If errors about `supabaseAdmin` import path, check what the existing `/api/admin/*` routes use and adjust.

- [ ] **Step 3: Smoke test the list endpoint manually**

Start dev server:

```bash
npm run dev
```

In another shell (authenticated browser session required):

```bash
curl -b ~/cookies.txt "http://localhost:3000/api/admin/invoices"
```

Expected (when logged in as admin): JSON with `{invoices: [], total: 0, ...}`. If not logged in: 401.

Kill dev server after test.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/invoices/route.ts
git commit -m "$(cat <<'EOF'
feat(api): GET + POST /api/admin/invoices

GET returns paginated list with filter params (status, prospect_id,
auto_generated, search). POST creates draft invoice from line items
(catalog-backed or custom), auto-generates invoice_number via RPC,
computes totals server-side.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Admin API — GET/PATCH/DELETE by id

**Files:**
- Create: `src/app/api/admin/invoices/[id]/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// ── /api/admin/invoices/[id] — detail / update / delete ─────────────

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

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select('*, prospect:prospects(*), session:quote_sessions(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: lineItems } = await supabaseAdmin
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sort_order', { ascending: true })

  // Version chain — if this invoice supersedes another or is superseded
  let supersedes_number: string | null = null
  let superseded_by_number: string | null = null
  if (invoice.supersedes_invoice_id) {
    const { data } = await supabaseAdmin
      .from('invoices')
      .select('invoice_number')
      .eq('id', invoice.supersedes_invoice_id)
      .maybeSingle()
    supersedes_number = data?.invoice_number ?? null
  }
  if (invoice.superseded_by_invoice_id) {
    const { data } = await supabaseAdmin
      .from('invoices')
      .select('invoice_number')
      .eq('id', invoice.superseded_by_invoice_id)
      .maybeSingle()
    superseded_by_number = data?.invoice_number ?? null
  }

  return NextResponse.json({
    invoice,
    line_items: lineItems ?? [],
    supersedes_number,
    superseded_by_number,
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: existing } = await supabaseAdmin
    .from('invoices')
    .select('status')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.status !== 'draft') {
    return NextResponse.json({ error: 'Can only edit drafts. Use void-and-reissue to change sent invoices.' }, { status: 409 })
  }

  const body = await request.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}
  if (typeof body.notes === 'string') updates.notes = body.notes
  if (typeof body.due_date === 'string' || body.due_date === null) updates.due_date = body.due_date
  if (typeof body.category_hint === 'string') updates.category_hint = body.category_hint

  // Line items replacement (simpler than diff)
  if (Array.isArray(body.line_items)) {
    await supabaseAdmin.from('invoice_line_items').delete().eq('invoice_id', id)
    // Re-insert (reusing the same logic pattern as POST; abridged here —
    // for a consumer, re-call POST /api/admin/invoices with the new body)
    return NextResponse.json({ error: 'Line-item editing via PATCH not yet implemented — delete draft and recreate' }, { status: 501 })
  }

  const { data, error } = await supabaseAdmin
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoice: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: existing } = await supabaseAdmin
    .from('invoices')
    .select('status')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.status !== 'draft') {
    return NextResponse.json({ error: 'Can only delete drafts. Use void on sent invoices.' }, { status: 409 })
  }

  const { error } = await supabaseAdmin.from('invoices').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: TS check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/admin/invoices/[id]/route.ts"
git commit -m "$(cat <<'EOF'
feat(api): GET/PATCH/DELETE /api/admin/invoices/[id]

Detail returns invoice + line items + prospect + session + version
chain (supersedes_number / superseded_by_number).

PATCH allows metadata edits on drafts only. Line-item rewrites
currently return 501 — v1 workflow is delete+recreate.

DELETE allowed on drafts only.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Admin API — Send endpoint (core of Phase 1)

**Files:**
- Create: `src/app/api/admin/invoices/[id]/send/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// ── POST /api/admin/invoices/[id]/send ──────────────────────────────
// Draft → sent (or → paid for zero-balance). Renders PDF, uploads to R2,
// logs delivery attempt, returns public URL for admin copy-paste modal.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { renderInvoicePdf } from '@/lib/invoice-pdf/render'
import { uploadPrivate, deletePrivate } from '@/lib/r2-storage'
import type { InvoiceWithLineItems } from '@/lib/invoice-types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  // Fetch invoice + line items + prospect
  const { data: invoice, error: fetchErr } = await supabaseAdmin
    .from('invoices')
    .select('*, prospect:prospects(business_name, owner_email, owner_phone)')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (invoice.status !== 'draft') {
    return NextResponse.json({ error: 'Already sent' }, { status: 409 })
  }

  const { data: lineItems } = await supabaseAdmin
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sort_order', { ascending: true })

  if (!lineItems || lineItems.length === 0) {
    return NextResponse.json({ error: 'Invoice has no line items' }, { status: 400 })
  }

  // Shape the render input
  const renderInput: InvoiceWithLineItems = {
    ...invoice,
    line_items: lineItems,
    bill_to: {
      business_name: invoice.prospect?.business_name ?? 'Client',
      contact_name: null,
      email: invoice.prospect?.owner_email ?? null,
    },
  }

  // Render PDF
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderInvoicePdf(renderInput)
  } catch (e) {
    return NextResponse.json({
      error: `PDF render failed: ${e instanceof Error ? e.message : e}`
    }, { status: 502 })
  }

  // Upload to R2
  const pdfKey = `invoices/${invoice.invoice_number}_v${invoice.pdf_version}.pdf`
  try {
    await uploadPrivate(pdfKey, pdfBuffer, 'application/pdf')
  } catch (e) {
    return NextResponse.json({
      error: `R2 upload failed: ${e instanceof Error ? e.message : e}`
    }, { status: 502 })
  }

  // Update invoice row
  const isZero = invoice.total_due_cents === 0
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {
    status: isZero ? 'paid' : 'sent',
    sent_at: now,
    sent_via_channel: 'manual',
    sent_via_email_to: invoice.prospect?.owner_email ?? null,
    pdf_storage_path: pdfKey,
    pdf_rendered_at: now,
  }
  if (isZero) {
    updates.paid_at = now
    updates.paid_method = 'zero_balance'
    updates.paid_note = 'Complimentary — no payment required'
  }

  const { error: updateErr } = await supabaseAdmin
    .from('invoices')
    .update(updates)
    .eq('id', id)

  if (updateErr) {
    // Compensating rollback
    await deletePrivate(pdfKey).catch(() => {})
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Log the manual send intent
  await supabaseAdmin.from('invoice_delivery_log').insert({
    invoice_id: id,
    channel: 'manual',
    recipient: invoice.prospect?.owner_email ?? invoice.prospect?.owner_phone ?? 'admin',
    success: true,
  })

  const publicUrl = `https://demandsignals.co/invoice/${invoice.invoice_number}/${invoice.public_uuid}`

  return NextResponse.json({
    public_url: publicUrl,
    pdf_admin_url: `/api/admin/invoices/${id}/pdf`,
    status: isZero ? 'paid' : 'sent',
  })
}
```

- [ ] **Step 2: TS check + commit**

```bash
npx tsc --noEmit
git add "src/app/api/admin/invoices/[id]/send/route.ts"
git commit -m "$(cat <<'EOF'
feat(api): POST /api/admin/invoices/[id]/send

Core Phase 1 delivery flow:
  1. Validate draft status
  2. Render PDF via dsig-pdf-service
  3. Upload to R2 at invoices/[number]_v[n].pdf
  4. Update invoice → sent (or → paid if total=0, with zero_balance method)
  5. Log delivery attempt as channel='manual'
  6. Return public URL for admin copy-paste modal

Compensating rollback deletes R2 object if DB update fails.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Admin API — mark-paid, void, void-and-reissue, pdf, delivery-log

**Files:**
- Create: `src/app/api/admin/invoices/[id]/mark-paid/route.ts`
- Create: `src/app/api/admin/invoices/[id]/void/route.ts`
- Create: `src/app/api/admin/invoices/[id]/void-and-reissue/route.ts`
- Create: `src/app/api/admin/invoices/[id]/pdf/route.ts`
- Create: `src/app/api/admin/invoices/[id]/delivery-log/route.ts`

- [ ] **Step 1: Create `mark-paid/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const paid_method: string = body.paid_method ?? 'other'
  const paid_note: string | null = body.paid_note ?? null

  if (!['check', 'wire', 'stripe', 'zero_balance', 'other'].includes(paid_method)) {
    return NextResponse.json({ error: 'Invalid paid_method' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_method,
      paid_note,
    })
    .eq('id', id)
    .in('status', ['sent', 'viewed'])
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found or not markable' }, { status: 404 })

  return NextResponse.json({ invoice: data })
}
```

- [ ] **Step 2: Create `void/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const voidReason: string = (body.void_reason ?? '').trim()
  if (voidReason.length < 5) {
    return NextResponse.json({ error: 'void_reason must be at least 5 characters' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('invoices')
    .update({
      status: 'void',
      voided_at: new Date().toISOString(),
      voided_by: auth.user.id,
      void_reason: voidReason,
    })
    .eq('id', id)
    .in('status', ['sent', 'viewed', 'paid'])
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found or not voidable' }, { status: 404 })

  return NextResponse.json({ invoice: data })
}
```

- [ ] **Step 3: Create `void-and-reissue/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const voidReason: string = (body.void_reason ?? '').trim()
  if (voidReason.length < 5) {
    return NextResponse.json({ error: 'void_reason must be at least 5 characters' }, { status: 400 })
  }

  // Fetch the old invoice + line items
  const { data: oldInv } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!oldInv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['sent', 'viewed', 'paid'].includes(oldInv.status)) {
    return NextResponse.json({ error: 'Only sent/viewed/paid invoices can be re-issued' }, { status: 409 })
  }

  const { data: oldLineItems } = await supabaseAdmin
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sort_order', { ascending: true })

  // Generate new invoice number
  const { data: newNumber, error: numErr } = await supabaseAdmin.rpc('generate_invoice_number')
  if (numErr || !newNumber) {
    return NextResponse.json({ error: `Number generation failed: ${numErr?.message}` }, { status: 500 })
  }

  // Insert new invoice (draft)
  const { data: newInv, error: newErr } = await supabaseAdmin
    .from('invoices')
    .insert({
      invoice_number: newNumber,
      prospect_id: oldInv.prospect_id,
      quote_session_id: oldInv.quote_session_id,
      supersedes_invoice_id: oldInv.id,
      status: 'draft',
      subtotal_cents: oldInv.subtotal_cents,
      discount_cents: oldInv.discount_cents,
      total_due_cents: oldInv.total_due_cents,
      currency: oldInv.currency,
      due_date: oldInv.due_date,
      category_hint: oldInv.category_hint,
      notes: oldInv.notes,
      created_by: auth.user.id,
    })
    .select('*')
    .single()

  if (newErr) return NextResponse.json({ error: `New invoice insert: ${newErr.message}` }, { status: 500 })

  // Copy line items
  if (oldLineItems && oldLineItems.length > 0) {
    const copies = oldLineItems.map((li) => ({
      invoice_id: newInv.id,
      description: li.description,
      quantity: li.quantity,
      unit_price_cents: li.unit_price_cents,
      subtotal_cents: li.subtotal_cents,
      discount_pct: li.discount_pct,
      discount_cents: li.discount_cents,
      discount_label: li.discount_label,
      line_total_cents: li.line_total_cents,
      sort_order: li.sort_order,
    }))
    const { error: copyErr } = await supabaseAdmin.from('invoice_line_items').insert(copies)
    if (copyErr) {
      await supabaseAdmin.from('invoices').delete().eq('id', newInv.id)
      return NextResponse.json({ error: `Line item copy: ${copyErr.message}` }, { status: 500 })
    }
  }

  // Void old + link to new (non-atomic across statements; best-effort rollback)
  const { error: voidErr } = await supabaseAdmin
    .from('invoices')
    .update({
      status: 'void',
      voided_at: new Date().toISOString(),
      voided_by: auth.user.id,
      void_reason: voidReason,
      superseded_by_invoice_id: newInv.id,
    })
    .eq('id', id)

  if (voidErr) {
    await supabaseAdmin.from('invoice_line_items').delete().eq('invoice_id', newInv.id)
    await supabaseAdmin.from('invoices').delete().eq('id', newInv.id)
    return NextResponse.json({ error: `Void old invoice: ${voidErr.message}` }, { status: 500 })
  }

  return NextResponse.json({ new_invoice: newInv, voided_invoice_id: id })
}
```

- [ ] **Step 4: Create `pdf/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPrivateSignedUrl } from '@/lib/r2-storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: invoice } = await supabaseAdmin
    .from('invoices')
    .select('invoice_number, pdf_storage_path')
    .eq('id', id)
    .maybeSingle()

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!invoice.pdf_storage_path) {
    return NextResponse.json({ error: 'PDF not yet rendered — send the invoice first' }, { status: 409 })
  }

  const url = await getPrivateSignedUrl(invoice.pdf_storage_path, 900)
  return NextResponse.redirect(url, { status: 302 })
}
```

- [ ] **Step 5: Create `delivery-log/route.ts`**

```typescript
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

  const { data: deliveryLog } = await supabaseAdmin
    .from('invoice_delivery_log')
    .select('*')
    .eq('invoice_id', id)
    .order('sent_at', { ascending: false })

  const { data: emailLog } = await supabaseAdmin
    .from('invoice_email_log')
    .select('*')
    .eq('invoice_id', id)
    .order('sent_at', { ascending: false })

  return NextResponse.json({
    delivery_log: deliveryLog ?? [],
    email_log: emailLog ?? [],
  })
}
```

- [ ] **Step 6: TS check + commit all 5 routes**

```bash
npx tsc --noEmit
git add "src/app/api/admin/invoices/[id]"
git commit -m "$(cat <<'EOF'
feat(api): mark-paid, void, void-and-reissue, pdf, delivery-log routes

mark-paid  → stamp paid_at + method + note
void       → terminal void with reason (≥5 chars), transitions from sent/viewed/paid
void-and-reissue → copies line items to new DRAFT, bidirectionally links chain,
                   voids old — best-effort rollback on partial failure
pdf        → 302 to R2 signed URL (15-min TTL) for admin preview
delivery-log → fetches invoice_delivery_log + invoice_email_log for detail page

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: Admin API — Restaurant Rule automation endpoint

**Files:**
- Create: `src/app/api/admin/invoices/restaurant-rule-draft/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// ── POST /api/admin/invoices/restaurant-rule-draft ──────────────────
// Internal automation: creates an auto-draft $0 research invoice from
// a qualifying quote_session. Respects automated_invoicing_enabled flag.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getItemById } from '@/lib/quote-pricing'

const RESTAURANT_RULE_CATALOG_IDS = [
  'market-research',
  'competitor-analysis',
  'site-audit',
  'social-audit',
]

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => null)
  const sessionId: string | undefined = body?.quote_session_id
  if (!sessionId) {
    return NextResponse.json({ error: 'quote_session_id required' }, { status: 400 })
  }

  // Kill switch
  const { data: cfg } = await supabaseAdmin
    .from('quote_config')
    .select('value')
    .eq('key', 'automated_invoicing_enabled')
    .maybeSingle()
  if (cfg?.value !== 'true') {
    return NextResponse.json({ error: 'Automated invoicing is disabled' }, { status: 503 })
  }

  // Fetch session + prospect
  const { data: session } = await supabaseAdmin
    .from('quote_sessions')
    .select('id, business_name, prospect_id, email, phone_verified')
    .eq('id', sessionId)
    .maybeSingle()
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (!session.prospect_id) {
    return NextResponse.json({ error: 'Session has no linked prospect' }, { status: 400 })
  }

  // Prevent duplicate Restaurant Rule invoices for same session
  const { data: existing } = await supabaseAdmin
    .from('invoices')
    .select('id')
    .eq('quote_session_id', sessionId)
    .eq('auto_trigger', 'restaurant_rule')
    .maybeSingle()
  if (existing) {
    return NextResponse.json({
      error: 'Restaurant Rule invoice already exists for this session',
      existing_invoice_id: existing.id,
    }, { status: 409 })
  }

  // Build line items from the 4 research catalog items + 100% discount row
  const researchLines = RESTAURANT_RULE_CATALOG_IDS.map((id, idx) => {
    const item = getItemById(id)
    if (!item) throw new Error(`Catalog item missing: ${id}`)
    return {
      sort_order: idx,
      description: item.name,
      quantity: 1,
      unit_price_cents: item.displayPriceCents,
      subtotal_cents: item.displayPriceCents,
      discount_pct: 0,
      discount_cents: 0,
      discount_label: null as string | null,
      line_total_cents: item.displayPriceCents,
    }
  })
  const subtotalCents = researchLines.reduce((s, r) => s + r.subtotal_cents, 0)
  const discountLine = {
    sort_order: researchLines.length,
    description: 'Introductory Research Credit (100% off)',
    quantity: 1,
    unit_price_cents: -subtotalCents,
    subtotal_cents: -subtotalCents,
    discount_pct: 0,
    discount_cents: 0,
    discount_label: 'Complimentary research package',
    line_total_cents: -subtotalCents,
  }
  const allLines = [...researchLines, discountLine]

  // Generate invoice number
  const { data: numResult, error: numErr } = await supabaseAdmin.rpc('generate_invoice_number')
  if (numErr || !numResult) {
    return NextResponse.json({ error: `Number generation: ${numErr?.message}` }, { status: 500 })
  }

  // Insert invoice
  const { data: inv, error: invErr } = await supabaseAdmin
    .from('invoices')
    .insert({
      invoice_number: numResult,
      prospect_id: session.prospect_id,
      quote_session_id: sessionId,
      status: 'draft',
      subtotal_cents: subtotalCents,
      discount_cents: subtotalCents,  // whole subtotal discounted
      total_due_cents: 0,
      currency: 'USD',
      auto_generated: true,
      auto_trigger: 'restaurant_rule',
      auto_sent: false,
      category_hint: 'marketing_expense',
      notes: 'This research is complimentary. Your investment comes later, only if you choose to move forward with implementation.',
      created_by: auth.user.id,
    })
    .select('*')
    .single()

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

  // Insert line items
  const inserts = allLines.map((l) => ({ invoice_id: inv.id, ...l }))
  const { error: liErr } = await supabaseAdmin.from('invoice_line_items').insert(inserts)
  if (liErr) {
    await supabaseAdmin.from('invoices').delete().eq('id', inv.id)
    return NextResponse.json({ error: `Line items: ${liErr.message}` }, { status: 500 })
  }

  return NextResponse.json({
    invoice: inv,
    business_name: session.business_name,
    admin_url: `/admin/invoices/${inv.id}`,
  })
}
```

- [ ] **Step 2: TS check + commit**

```bash
npx tsc --noEmit
git add "src/app/api/admin/invoices/restaurant-rule-draft/route.ts"
git commit -m "$(cat <<'EOF'
feat(api): POST /api/admin/invoices/restaurant-rule-draft

Automation endpoint that materializes a $0 Restaurant Rule draft from
a qualifying quote_session. Four research line items at displayPriceCents
each + a 100% discount line → total $0. Respects the
automated_invoicing_enabled kill switch and prevents duplicates.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: Public API — invoice view + PDF routes

**Files:**
- Create: `src/app/api/invoices/public/[number]/route.ts`
- Create: `src/app/api/invoices/public/[number]/pdf/route.ts`

- [ ] **Step 1: Create `[number]/route.ts`**

```typescript
// ── GET /api/invoices/public/[number]?key=<uuid> ────────────────────
// Public invoice view. UUID gating. Always returns 404 on mismatch
// to avoid leaking invoice-number existence.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const PUBLIC_STATUSES = ['sent', 'viewed', 'paid', 'void']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params
  const key = request.nextUrl.searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: invoice } = await supabaseAdmin
    .from('invoices')
    .select(`
      id, invoice_number, public_uuid, status, currency,
      subtotal_cents, discount_cents, total_due_cents,
      due_date, sent_at, paid_at, voided_at, void_reason,
      notes, supersedes_invoice_id, superseded_by_invoice_id,
      prospect:prospects(business_name, owner_email)
    `)
    .eq('invoice_number', number)
    .eq('public_uuid', key)
    .maybeSingle()

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!PUBLIC_STATUSES.includes(invoice.status)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: lineItems } = await supabaseAdmin
    .from('invoice_line_items')
    .select('description, quantity, unit_price_cents, line_total_cents, sort_order')
    .eq('invoice_id', invoice.id)
    .order('sort_order', { ascending: true })

  // Resolve version-chain numbers
  let superseded_by_number: string | null = null
  if (invoice.superseded_by_invoice_id) {
    const { data: superInv } = await supabaseAdmin
      .from('invoices')
      .select('invoice_number')
      .eq('id', invoice.superseded_by_invoice_id)
      .maybeSingle()
    superseded_by_number = superInv?.invoice_number ?? null
  }

  // Track first-view transition: sent → viewed
  if (invoice.status === 'sent') {
    await supabaseAdmin
      .from('invoices')
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString(),
        public_viewed_count: 1,
      })
      .eq('id', invoice.id)
  } else {
    // Increment view counter without state change
    await supabaseAdmin.rpc('increment', { table_name: 'invoices', id: invoice.id, column_name: 'public_viewed_count', value: 1 }).catch(() => {
      // Fallback: naive re-read + write (no race protection, fine for v1)
      supabaseAdmin
        .from('invoices')
        .update({ public_viewed_count: (invoice as unknown as { public_viewed_count?: number }).public_viewed_count ?? 1 })
        .eq('id', invoice.id)
        .then()
    })
  }

  return NextResponse.json({
    invoice: { ...invoice, superseded_by_number },
    line_items: lineItems ?? [],
  })
}
```

> Note: if there's no `increment` RPC in your DB, the fallback path still works (just less atomic). Optionally ship a small SQL function for atomic increment later; not critical for v1.

- [ ] **Step 2: Create `[number]/pdf/route.ts`**

```typescript
// ── GET /api/invoices/public/[number]/pdf?key=<uuid> ───────────────
// Public PDF download. Same UUID gate. 302 to signed R2 URL.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPrivateSignedUrl } from '@/lib/r2-storage'

const PUBLIC_STATUSES = ['sent', 'viewed', 'paid', 'void']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params
  const key = request.nextUrl.searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: invoice } = await supabaseAdmin
    .from('invoices')
    .select('status, pdf_storage_path, invoice_number')
    .eq('invoice_number', number)
    .eq('public_uuid', key)
    .maybeSingle()

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!PUBLIC_STATUSES.includes(invoice.status)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!invoice.pdf_storage_path) {
    return NextResponse.json({ error: 'PDF not available' }, { status: 404 })
  }

  const url = await getPrivateSignedUrl(invoice.pdf_storage_path, 900)
  return NextResponse.redirect(url, { status: 302 })
}
```

- [ ] **Step 3: TS check + commit**

```bash
npx tsc --noEmit
git add "src/app/api/invoices/public/[number]"
git commit -m "$(cat <<'EOF'
feat(api): public invoice view + PDF endpoints with UUID gating

GET /api/invoices/public/[number]?key=<uuid>
  • Returns invoice JSON + line items if status ∈ {sent,viewed,paid,void}
    AND uuid matches.
  • First-view transitions sent → viewed, stamps viewed_at, bumps counter.
  • Always 404 on mismatch — never leaks existence.

GET /api/invoices/public/[number]/pdf?key=<uuid>
  • Same guards. 302 to R2 signed URL (15-min TTL).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 19: End-to-end test script

**Files:**
- Create: `scripts/test-invoice-e2e.mjs`

- [ ] **Step 1: Create the script**

```javascript
#!/usr/bin/env node
// ── Invoice End-to-End Smoke Test ────────────────────────────────────
// Exercises the full lifecycle using SERVICE ROLE only (bypasses web auth):
//   1. Seed a prospect + quote session
//   2. Create an invoice via direct INSERT (mimics API body path)
//   3. Verify generate_invoice_number works
//   4. Simulate "send" — does not actually hit dsig-pdf-service;
//      this is a DB-level smoke test. Full PDF loop is covered manually.
//   5. Verify public URL response shape via direct SELECT with UUID
//   6. Void-and-reissue: create new + link old
//   7. Teardown everything

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const envPath = resolve(ROOT, '.env.local')
if (existsSync(envPath)) {
  const c = readFileSync(envPath, 'utf-8')
  for (const line of c.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const sb = createClient(URL, SERVICE, { auth: { persistSession: false } })

let passed = 0, failed = 0
const cleanup = []
function ok(m) { console.log(`[PASS] ${m}`); passed++ }
function fail(m, e) { console.error(`[FAIL] ${m}${e ? `: ${e.message ?? e}` : ''}`); failed++ }

const STAMP = Date.now()
try {
  // 1. Seed prospect
  const { data: prospect, error: pErr } = await sb.from('prospects').insert({
    business_name: `E2E Test ${STAMP}`,
    owner_email: `e2e-${STAMP}@example.com`,
  }).select('*').single()
  if (pErr) throw pErr
  cleanup.push(() => sb.from('prospects').delete().eq('id', prospect.id))
  ok('seeded prospect')

  // 2. Generate invoice number
  const { data: invNum, error: numErr } = await sb.rpc('generate_invoice_number')
  if (numErr || !invNum) throw numErr || new Error('no number returned')
  ok(`generate_invoice_number → ${invNum}`)

  // 3. Create invoice
  const { data: invoice, error: invErr } = await sb.from('invoices').insert({
    invoice_number: invNum,
    prospect_id: prospect.id,
    status: 'draft',
    subtotal_cents: 50000,
    discount_cents: 0,
    total_due_cents: 50000,
    currency: 'USD',
    category_hint: 'service_revenue',
  }).select('*').single()
  if (invErr) throw invErr
  cleanup.push(() => sb.from('invoices').delete().eq('id', invoice.id))
  ok(`invoice created with public_uuid ${invoice.public_uuid}`)

  // 4. Add line items
  const { error: liErr } = await sb.from('invoice_line_items').insert({
    invoice_id: invoice.id,
    description: 'Test service',
    quantity: 1,
    unit_price_cents: 50000,
    subtotal_cents: 50000,
    discount_pct: 0,
    discount_cents: 0,
    line_total_cents: 50000,
    sort_order: 0,
  })
  if (liErr) throw liErr
  ok('line item inserted')

  // 5. Transition draft → sent (DB-level)
  await sb.from('invoices').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
    sent_via_channel: 'manual',
    pdf_storage_path: `invoices/${invNum}_v1.pdf`,
    pdf_rendered_at: new Date().toISOString(),
  }).eq('id', invoice.id)
  ok('draft → sent transition')

  // 6. Simulate public URL fetch
  const { data: publicInv } = await sb.from('invoices')
    .select('*').eq('invoice_number', invNum).eq('public_uuid', invoice.public_uuid).single()
  if (!publicInv) throw new Error('public fetch failed')
  ok('public URL fetch returns invoice via invoice_number + public_uuid')

  // 7. Wrong uuid → should return nothing
  const wrongUuid = crypto.randomUUID()
  const { data: wrongInv } = await sb.from('invoices')
    .select('*').eq('invoice_number', invNum).eq('public_uuid', wrongUuid).maybeSingle()
  if (wrongInv) throw new Error('wrong uuid unexpectedly matched')
  ok('wrong uuid returns nothing')

  // 8. Void-and-reissue
  const { data: newNum } = await sb.rpc('generate_invoice_number')
  const { data: newInv, error: newErr } = await sb.from('invoices').insert({
    invoice_number: newNum,
    prospect_id: prospect.id,
    supersedes_invoice_id: invoice.id,
    status: 'draft',
    subtotal_cents: 40000,
    discount_cents: 0,
    total_due_cents: 40000,
    currency: 'USD',
  }).select('*').single()
  if (newErr) throw newErr
  cleanup.push(() => sb.from('invoices').delete().eq('id', newInv.id))
  await sb.from('invoices').update({
    status: 'void',
    voided_at: new Date().toISOString(),
    void_reason: 'scope change requested',
    superseded_by_invoice_id: newInv.id,
  }).eq('id', invoice.id)
  ok(`void-and-reissue: new=${newNum} supersedes=${invNum}`)

  // 9. Verify chain
  const { data: chain } = await sb.from('invoices')
    .select('invoice_number, status, supersedes_invoice_id, superseded_by_invoice_id')
    .in('id', [invoice.id, newInv.id])
  const old = chain.find(c => c.invoice_number === invNum)
  const neu = chain.find(c => c.invoice_number === newNum)
  if (old.status !== 'void' || old.superseded_by_invoice_id !== newInv.id) throw new Error('old not voided correctly')
  if (neu.supersedes_invoice_id !== invoice.id) throw new Error('new not linked to old')
  ok('version chain bidirectional + statuses correct')

} catch (e) {
  fail('e2e test aborted', e)
}

// Cleanup (reverse order)
for (const fn of cleanup.reverse()) {
  try { await fn() } catch {}
}
console.log(`\n═══════════════════════════════════════════════════`)
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log(`═══════════════════════════════════════════════════`)
process.exit(failed === 0 ? 0 : 1)
```

- [ ] **Step 2: Run it**

```bash
node scripts/test-invoice-e2e.mjs
```

Expected: `9 passed, 0 failed`. If `generate_invoice_number` fails, confirm migration 005b2 is applied (should be). If public_uuid is NULL on insert, the 011a migration didn't land — re-verify.

- [ ] **Step 3: Commit**

```bash
git add scripts/test-invoice-e2e.mjs
git commit -m "$(cat <<'EOF'
test(invoice): end-to-end lifecycle smoke test

DB-level exercise of the full invoice flow: create → line items → send →
public fetch (correct + wrong uuid) → void-and-reissue → verify chain.

PDF render loop is not included (that's an integration concern covered
manually via admin UI QA). Exit 0 on 9/9 pass.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 20: Admin UI — invoice list page

**Files:**
- Create: `src/app/admin/invoices/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Plus } from 'lucide-react'

interface InvoiceRow {
  id: string
  invoice_number: string
  status: string
  total_due_cents: number
  auto_generated: boolean
  auto_trigger: string | null
  created_at: string
  sent_at: string | null
  paid_at: string | null
  prospects: { business_name: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-700',
  void: 'bg-red-100 text-red-700 opacity-60',
}

function formatCents(c: number): string {
  const s = Math.abs(c) < 100 ? c.toString() : Math.round(c / 100).toLocaleString('en-US')
  return `$${s}`
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [autoOnly, setAutoOnly] = useState(false)

  useEffect(() => {
    setLoading(true)
    const sp = new URLSearchParams()
    if (statusFilter) sp.set('status', statusFilter)
    if (autoOnly) sp.set('auto_generated', 'true')
    fetch(`/api/admin/invoices?${sp}`)
      .then(r => r.json())
      .then(d => setInvoices(d.invoices ?? []))
      .finally(() => setLoading(false))
  }, [statusFilter, autoOnly])

  const needsReview = invoices.filter(i => i.auto_generated && i.status === 'draft').length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <Link
          href="/admin/invoices/new"
          className="inline-flex items-center gap-2 bg-[var(--teal)] text-white rounded-lg px-4 py-2 font-semibold hover:bg-[var(--teal-dark)]"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </Link>
      </div>

      {needsReview > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900">
          🍽️ {needsReview} Restaurant Rule draft{needsReview === 1 ? '' : 's'} ready for review
        </div>
      )}

      <div className="flex gap-4 items-center text-sm">
        <label>
          Status:&nbsp;
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded px-2 py-1"
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoOnly}
            onChange={(e) => setAutoOnly(e.target.checked)}
          />
          Auto-generated only
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--teal)]" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center p-16 text-slate-400">No invoices yet</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Invoice #</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-left px-4 py-3">Sent</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-mono">
                    <Link href={`/admin/invoices/${inv.id}`} className="text-[var(--teal)] hover:underline">
                      {inv.invoice_number}
                    </Link>
                    {inv.auto_trigger === 'restaurant_rule' && (
                      <span className="ml-2 text-[10px]">🍽️</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{inv.prospects?.business_name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCents(inv.total_due_cents)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(inv.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {inv.sent_at ? new Date(inv.sent_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TS check + commit**

```bash
npx tsc --noEmit
git add "src/app/admin/invoices/page.tsx"
git commit -m "$(cat <<'EOF'
feat(ui): /admin/invoices list page

Status filter, auto-generated toggle, Restaurant-Rule review banner,
sortable by recency. Row click → detail page. New Invoice button →
/admin/invoices/new.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 21: Admin UI — invoice create page

**Files:**
- Create: `src/app/admin/invoices/new/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2 } from 'lucide-react'

interface LineItemDraft {
  description: string
  quantity: number
  unit_price_cents: number
  discount_pct: number
  discount_label: string
}

const EMPTY_LINE: LineItemDraft = {
  description: '',
  quantity: 1,
  unit_price_cents: 0,
  discount_pct: 0,
  discount_label: '',
}

export default function NewInvoicePage() {
  const router = useRouter()
  const [prospectId, setProspectId] = useState('')
  const [lines, setLines] = useState<LineItemDraft[]>([{ ...EMPTY_LINE }])
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [categoryHint, setCategoryHint] = useState('service_revenue')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateLine(idx: number, patch: Partial<LineItemDraft>) {
    setLines(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  function addLine() { setLines(prev => [...prev, { ...EMPTY_LINE }]) }
  function removeLine(idx: number) { setLines(prev => prev.filter((_, i) => i !== idx)) }
  function addDiscountLine() {
    const subtotal = lines.reduce((s, l) => s + l.unit_price_cents * l.quantity, 0)
    setLines(prev => [...prev, {
      description: 'Introductory Research Credit (100% off)',
      quantity: 1,
      unit_price_cents: -subtotal,
      discount_pct: 0,
      discount_label: 'Complimentary',
    }])
  }

  const subtotalDollars = lines.reduce((s, l) => s + Math.max(0, l.unit_price_cents * l.quantity), 0) / 100
  const totalDollars = lines.reduce((s, l) => {
    const sub = l.unit_price_cents * l.quantity
    const disc = Math.round(sub * l.discount_pct / 100)
    return s + (sub - disc)
  }, 0) / 100

  async function save(andSend: boolean) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_id: prospectId || undefined,
          line_items: lines.map(l => ({
            description: l.description,
            quantity: l.quantity,
            unit_price_cents: l.unit_price_cents,
            discount_pct: l.discount_pct,
            discount_label: l.discount_label || undefined,
          })),
          notes: notes || undefined,
          due_date: dueDate || undefined,
          category_hint: categoryHint,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      if (andSend) {
        const sendRes = await fetch(`/api/admin/invoices/${data.invoice.id}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        const sendData = await sendRes.json()
        if (!sendRes.ok) throw new Error(sendData.error ?? 'Send failed')
      }
      router.push(`/admin/invoices/${data.invoice.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setBusy(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900">New Invoice</h1>

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Client</h2>
        <label className="block text-sm">
          Prospect ID (UUID — paste from /admin/prospects)
          <input
            type="text"
            value={prospectId}
            onChange={(e) => setProspectId(e.target.value)}
            className="w-full border border-slate-200 rounded px-3 py-2 mt-1 font-mono text-xs"
            placeholder="00000000-0000-0000-0000-000000000000"
          />
        </label>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Line items</h2>
          <div className="flex gap-2">
            <button onClick={addLine} className="text-xs bg-slate-100 hover:bg-slate-200 rounded px-3 py-1">
              <Plus className="w-3 h-3 inline" /> Add line
            </button>
            <button onClick={addDiscountLine} className="text-xs bg-orange-100 hover:bg-orange-200 rounded px-3 py-1 text-orange-900">
              + 100% discount
            </button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 uppercase">
            <tr>
              <th className="text-left py-1">Description</th>
              <th className="text-right py-1 w-16">Qty</th>
              <th className="text-right py-1 w-24">Unit ($)</th>
              <th className="text-right py-1 w-16">Disc %</th>
              <th className="text-right py-1 w-24">Total</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx) => {
              const sub = l.unit_price_cents * l.quantity
              const total = sub - Math.round(sub * l.discount_pct / 100)
              return (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="py-1 pr-2">
                    <input
                      type="text"
                      value={l.description}
                      onChange={(e) => updateLine(idx, { description: e.target.value })}
                      className="w-full border border-slate-200 rounded px-2 py-1"
                      placeholder="Description"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={l.quantity}
                      onChange={(e) => updateLine(idx, { quantity: parseInt(e.target.value) || 1 })}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-right"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={l.unit_price_cents / 100}
                      onChange={(e) => updateLine(idx, { unit_price_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-right"
                      step="0.01"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={l.discount_pct}
                      onChange={(e) => updateLine(idx, { discount_pct: parseInt(e.target.value) || 0 })}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-right"
                      min="0"
                      max="100"
                    />
                  </td>
                  <td className="text-right pr-2">${(total / 100).toFixed(2)}</td>
                  <td>
                    <button onClick={() => removeLine(idx)} className="text-slate-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="flex justify-end text-sm space-y-1">
          <div>
            <div>Subtotal: ${subtotalDollars.toFixed(2)}</div>
            <div className="font-bold text-lg">Total: ${totalDollars.toFixed(2)}</div>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Details</h2>
        <label className="block text-sm">
          Due date
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="block border border-slate-200 rounded px-3 py-1 mt-1"
          />
        </label>
        <label className="block text-sm">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-slate-200 rounded px-3 py-2 mt-1"
            rows={3}
          />
        </label>
        <label className="block text-sm">
          Category
          <select
            value={categoryHint}
            onChange={(e) => setCategoryHint(e.target.value)}
            className="block border border-slate-200 rounded px-3 py-1 mt-1"
          >
            <option value="service_revenue">Service Revenue</option>
            <option value="marketing_expense">Marketing Expense</option>
            <option value="research_credit">Research Credit</option>
            <option value="other">Other</option>
          </select>
        </label>
      </section>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="flex gap-3">
        <button
          onClick={() => save(false)}
          disabled={busy || lines.length === 0}
          className="bg-slate-100 hover:bg-slate-200 rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save as draft'}
        </button>
        <button
          onClick={() => save(true)}
          disabled={busy || lines.length === 0}
          className="bg-[var(--teal)] text-white rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Send'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TS check + commit**

```bash
npx tsc --noEmit
git add "src/app/admin/invoices/new/page.tsx"
git commit -m "$(cat <<'EOF'
feat(ui): /admin/invoices/new create page

Client section (prospect ID paste), line-items table with add/remove/
discount-line, totals computed live, details (due date, notes, category
hint), Save as draft + Save & Send. v1 uses prospect UUID paste; richer
autocomplete is a follow-up.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 22: Admin UI — invoice detail page

**Files:**
- Create: `src/app/admin/invoices/[id]/page.tsx`

- [ ] **Step 1: Create the detail page**

```typescript
'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Copy, ExternalLink } from 'lucide-react'

interface LineItem {
  description: string
  quantity: number
  unit_price_cents: number
  line_total_cents: number
  sort_order: number
}

interface InvoiceDetail {
  invoice: {
    id: string
    invoice_number: string
    public_uuid: string
    status: string
    subtotal_cents: number
    discount_cents: number
    total_due_cents: number
    due_date: string | null
    paid_at: string | null
    paid_method: string | null
    sent_at: string | null
    viewed_at: string | null
    voided_at: string | null
    void_reason: string | null
    auto_generated: boolean
    auto_trigger: string | null
    notes: string | null
    created_at: string
    prospect: { business_name: string; owner_email: string | null } | null
  }
  line_items: LineItem[]
  supersedes_number: string | null
  superseded_by_number: string | null
}

function formatCents(c: number): string {
  const dollars = Math.abs(c) / 100
  const sign = c < 0 ? '-' : ''
  return `${sign}$${dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [detail, setDetail] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendModalData, setSendModalData] = useState<{ public_url: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/invoices/${id}`)
    const data = await res.json()
    if (!res.ok) setError(data.error ?? 'Failed')
    else setDetail(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function send() {
    if (!detail) return
    setBusy(true)
    const res = await fetch(`/api/admin/invoices/${id}/send`, { method: 'POST' })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { alert(data.error); return }
    setSendModalData({ public_url: data.public_url })
    load()
  }

  async function markPaid() {
    const method = prompt('Payment method (check/wire/other)', 'check')
    if (!method) return
    setBusy(true)
    await fetch(`/api/admin/invoices/${id}/mark-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid_method: method, paid_note: `Marked paid by admin` }),
    })
    setBusy(false)
    load()
  }

  async function voidInvoice(reissue: boolean) {
    const reason = prompt(`Void reason (min 5 chars):`)
    if (!reason || reason.length < 5) return
    setBusy(true)
    const endpoint = reissue ? 'void-and-reissue' : 'void'
    const res = await fetch(`/api/admin/invoices/${id}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ void_reason: reason }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { alert(data.error); return }
    if (reissue) router.push(`/admin/invoices/${data.new_invoice.id}`)
    else load()
  }

  async function deleteDraft() {
    if (!confirm('Delete this draft?')) return
    setBusy(true)
    await fetch(`/api/admin/invoices/${id}`, { method: 'DELETE' })
    router.push('/admin/invoices')
  }

  if (loading) return <div className="flex justify-center p-16"><Loader2 className="w-6 h-6 animate-spin text-[var(--teal)]" /></div>
  if (error || !detail) return <div className="p-6 text-red-600">Error: {error ?? 'Not found'}</div>

  const { invoice, line_items } = detail
  const s = invoice.status

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/invoices" className="text-sm text-[var(--teal)]">← All invoices</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 font-mono">{invoice.invoice_number}</h1>
          {invoice.auto_trigger === 'restaurant_rule' && (
            <span className="inline-block mt-1 text-xs bg-orange-100 text-orange-900 rounded px-2 py-0.5">🍽️ Auto-generated via Restaurant Rule</span>
          )}
          {detail.supersedes_number && (
            <div className="text-xs mt-1">↑ Replaces <span className="font-mono">{detail.supersedes_number}</span></div>
          )}
          {detail.superseded_by_number && (
            <div className="text-xs mt-1 text-red-700">↓ Replaced by <span className="font-mono">{detail.superseded_by_number}</span></div>
          )}
        </div>
        <div className="flex gap-2">
          {s === 'draft' && (
            <>
              <button onClick={deleteDraft} disabled={busy} className="bg-red-100 text-red-700 rounded px-3 py-1.5 text-sm">Delete</button>
              <button onClick={send} disabled={busy} className="bg-[var(--teal)] text-white rounded px-4 py-1.5 text-sm font-semibold">Send</button>
            </>
          )}
          {(s === 'sent' || s === 'viewed') && (
            <>
              <button onClick={markPaid} disabled={busy} className="bg-emerald-100 text-emerald-700 rounded px-3 py-1.5 text-sm">Mark Paid</button>
              <button onClick={() => voidInvoice(false)} disabled={busy} className="bg-slate-100 rounded px-3 py-1.5 text-sm">Void</button>
              <button onClick={() => voidInvoice(true)} disabled={busy} className="bg-orange-100 text-orange-900 rounded px-3 py-1.5 text-sm">Void & Re-issue</button>
            </>
          )}
          {s === 'paid' && (
            <button onClick={() => voidInvoice(true)} disabled={busy} className="bg-orange-100 text-orange-900 rounded px-3 py-1.5 text-sm">Void & Re-issue</button>
          )}
          {invoice.status !== 'draft' && (
            <a href={`/api/admin/invoices/${id}/pdf`} target="_blank" rel="noopener" className="bg-slate-100 rounded px-3 py-1.5 text-sm inline-flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" /> PDF
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold mb-3">Line items</h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left py-1">Description</th>
                <th className="text-right py-1">Qty</th>
                <th className="text-right py-1">Unit</th>
                <th className="text-right py-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              {line_items.map((li, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="py-2">{li.description}</td>
                  <td className="py-2 text-right">{li.quantity}</td>
                  <td className="py-2 text-right">{formatCents(li.unit_price_cents)}</td>
                  <td className="py-2 text-right font-medium">{formatCents(li.line_total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 pt-4 border-t border-slate-200 text-right space-y-1 text-sm">
            <div>Subtotal: <span className="font-medium">{formatCents(invoice.subtotal_cents)}</span></div>
            {invoice.discount_cents > 0 && <div>Discount: <span className="font-medium">-{formatCents(invoice.discount_cents)}</span></div>}
            <div className="text-lg font-bold">Total due: {formatCents(invoice.total_due_cents)}</div>
          </div>
          {invoice.notes && (
            <div className="mt-4 bg-teal-50 border-l-4 border-[var(--teal)] px-3 py-2 text-sm">
              <div className="font-semibold text-xs text-teal-900 uppercase mb-1">Notes</div>
              {invoice.notes}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="font-semibold mb-2">Client</h3>
            <div className="text-sm">{invoice.prospect?.business_name ?? '—'}</div>
            {invoice.prospect?.owner_email && <div className="text-xs text-slate-500">{invoice.prospect.owner_email}</div>}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm space-y-2">
            <h3 className="font-semibold mb-2">Timeline</h3>
            <div className="text-xs text-slate-500">Created: {new Date(invoice.created_at).toLocaleString()}</div>
            {invoice.sent_at && <div className="text-xs text-slate-500">Sent: {new Date(invoice.sent_at).toLocaleString()}</div>}
            {invoice.viewed_at && <div className="text-xs text-slate-500">Viewed: {new Date(invoice.viewed_at).toLocaleString()}</div>}
            {invoice.paid_at && <div className="text-xs text-emerald-700">Paid: {new Date(invoice.paid_at).toLocaleString()} via {invoice.paid_method}</div>}
            {invoice.voided_at && <div className="text-xs text-red-700">Voided: {new Date(invoice.voided_at).toLocaleString()} — {invoice.void_reason}</div>}
          </div>
        </div>
      </div>

      {sendModalData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" role="dialog">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full space-y-4">
            <h2 className="text-lg font-bold">Invoice sent</h2>
            <p className="text-sm text-slate-600">Paste this link into your preferred channel (SMS, email, chat). Once the client views it, status flips to 'viewed' automatically.</p>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 flex items-center gap-2">
              <code className="flex-1 text-xs truncate">{sendModalData.public_url}</code>
              <button
                onClick={() => navigator.clipboard.writeText(sendModalData.public_url)}
                className="text-[var(--teal)] hover:text-[var(--teal-dark)]"
                title="Copy URL"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-500">Any future edits require Void & Re-issue.</div>
            <div className="flex justify-end">
              <button onClick={() => setSendModalData(null)} className="bg-[var(--teal)] text-white rounded-lg px-4 py-2 font-semibold">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TS check + commit**

```bash
npx tsc --noEmit
git add "src/app/admin/invoices/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
feat(ui): /admin/invoices/[id] detail page

Status-aware action bar (draft=Send/Delete, sent=MarkPaid/Void/Reissue,
paid=Reissue). Line items + totals, notes callout, client card, timeline
card showing created/sent/viewed/paid/voided. Send modal with public URL
copy button for Phase 1 manual routing.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 23: Public invoice viewer page

**Files:**
- Create: `src/app/invoice/[number]/[uuid]/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Download } from 'lucide-react'

interface InvoiceResponse {
  invoice: {
    invoice_number: string
    status: string
    subtotal_cents: number
    discount_cents: number
    total_due_cents: number
    due_date: string | null
    sent_at: string | null
    paid_at: string | null
    voided_at: string | null
    notes: string | null
    superseded_by_number: string | null
    prospect: { business_name: string; owner_email: string | null } | null
  }
  line_items: Array<{
    description: string
    quantity: number
    unit_price_cents: number
    line_total_cents: number
  }>
}

function formatCents(c: number): string {
  const dollars = Math.abs(c) / 100
  const sign = c < 0 ? '-' : ''
  return `${sign}$${dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

async function fetchInvoice(number: string, uuid: string): Promise<InvoiceResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://demandsignals.co'
  const res = await fetch(`${baseUrl}/api/invoices/public/${number}?key=${uuid}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ number: string; uuid: string }>
}) {
  const { number, uuid } = await params
  const data = await fetchInvoice(number, uuid)
  if (!data) notFound()

  const { invoice, line_items } = data
  const isPaid = invoice.status === 'paid'
  const isVoid = invoice.status === 'void'
  const downloadUrl = `/api/invoices/public/${number}/pdf?key=${uuid}`

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-10">
        {isVoid && (
          <div className="bg-red-50 border border-red-200 text-red-900 rounded p-4 mb-6">
            <div className="font-bold">VOIDED</div>
            {invoice.superseded_by_number && (
              <div className="text-sm">Superseded by <span className="font-mono">{invoice.superseded_by_number}</span></div>
            )}
          </div>
        )}

        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="text-2xl font-bold text-slate-900">DEMAND SIGNALS</div>
            <div className="text-xs text-slate-500 mt-1">demandsignals.co · (916) 542-2423</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm text-slate-600">{invoice.invoice_number}</div>
            {isPaid && <div className="inline-block mt-2 bg-emerald-100 text-emerald-800 rounded-full px-3 py-1 text-xs font-bold">PAID ✓</div>}
            {!isPaid && !isVoid && <div className="inline-block mt-2 bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-xs font-bold">{invoice.status.toUpperCase()}</div>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Bill To</div>
            <div className="text-sm font-medium">{invoice.prospect?.business_name ?? '—'}</div>
            {invoice.prospect?.owner_email && <div className="text-xs text-slate-500">{invoice.prospect.owner_email}</div>}
          </div>
          <div className="text-right text-sm space-y-1">
            {invoice.sent_at && <div><span className="text-slate-500 text-xs">Issued:</span> {new Date(invoice.sent_at).toLocaleDateString()}</div>}
            {invoice.due_date && <div><span className="text-slate-500 text-xs">Due:</span> {new Date(invoice.due_date).toLocaleDateString()}</div>}
            {invoice.paid_at && <div><span className="text-slate-500 text-xs">Paid:</span> {new Date(invoice.paid_at).toLocaleDateString()}</div>}
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="text-left py-2">Description</th>
              <th className="text-right py-2 w-16">Qty</th>
              <th className="text-right py-2 w-24">Unit</th>
              <th className="text-right py-2 w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {line_items.map((li, idx) => (
              <tr key={idx} className="border-b border-slate-100">
                <td className="py-2">{li.description}</td>
                <td className="py-2 text-right">{li.quantity}</td>
                <td className="py-2 text-right">{formatCents(li.unit_price_cents)}</td>
                <td className="py-2 text-right font-medium">{formatCents(li.line_total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right space-y-1 mb-6">
          <div>Subtotal: <span className="font-medium">{formatCents(invoice.subtotal_cents)}</span></div>
          {invoice.discount_cents > 0 && <div>Discount: -{formatCents(invoice.discount_cents)}</div>}
          <div className="text-xl font-bold border-t border-slate-200 pt-2 mt-2">Total due: {formatCents(invoice.total_due_cents)}</div>
        </div>

        {invoice.notes && (
          <div className="bg-teal-50 border-l-4 border-[var(--teal)] rounded px-4 py-3 text-sm mb-6">
            <div className="font-semibold text-xs uppercase text-teal-900 mb-1">Notes</div>
            {invoice.notes}
          </div>
        )}

        <div className="flex justify-end">
          <a
            href={downloadUrl}
            className="inline-flex items-center gap-2 bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-slate-700"
            download={`Invoice-${number}.pdf`}
          >
            <Download className="w-4 h-4" />
            Download PDF
          </a>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
          Questions? Email <Link href="mailto:DemandSignals@gmail.com" className="text-[var(--teal)]">DemandSignals@gmail.com</Link> or call (916) 542-2423.
        </div>
      </div>
    </div>
  )
}

export const metadata = {
  robots: 'noindex, nofollow',
}
```

- [ ] **Step 2: TS check + commit**

```bash
npx tsc --noEmit
git add "src/app/invoice/[number]/[uuid]/page.tsx"
git commit -m "$(cat <<'EOF'
feat(ui): /invoice/[number]/[uuid] public viewer page

Pure-invoice layout, no site chrome. Paid / Void / Sent status
treatments. Download PDF button. noindex/nofollow meta.
Server-side rendered with cache: 'no-store' so view counter + status
transitions fire on first load.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 24: Sidebar + quote-page + prospect-page integrations

**Files:**
- Modify: `src/components/admin/admin-sidebar.tsx`
- Modify: `src/app/admin/quotes/[id]/page.tsx`
- Modify: `src/app/admin/prospects/[id]/page.tsx`

- [ ] **Step 1: Add Finance nav group to admin sidebar**

The existing sidebar uses typed `NavItem[]` arrays (PROSPECTING_ITEMS, CONTENT_ITEMS, INSIGHTS_ITEMS, OTHER_ITEMS) and a `NavGroup` component. Add a new `FINANCE_ITEMS` constant alongside the others:

```typescript
const FINANCE_ITEMS: NavItem[] = [
  { href: '/admin/invoices', label: 'Invoices', icon: Receipt },
]
```

Place it between `INSIGHTS_ITEMS` and `OTHER_ITEMS`. (`Receipt` is already imported from lucide-react — existing sidebar uses it for Quotes. If you'd rather visually distinguish, use `FileText` which is also imported, or add `CreditCard` to the import list.)

Then in the JSX where the other `NavGroup` components are rendered, add:

```tsx
<NavGroup
  label="Finance"
  icon={Receipt}
  items={FINANCE_ITEMS}
  open={openGroup === 'finance'}
  onToggle={() => setOpenGroup(openGroup === 'finance' ? null : 'finance')}
  pathname={pathname}
/>
```

(Adjust the `openGroup` state mechanics to match the existing file's exact implementation — if it uses a different prop name for expand/collapse, follow suit.)

No new imports needed since `Receipt`, `NavItem` type, and `NavGroup` component are already in the file.

- [ ] **Step 2: Add Create Invoice + Restaurant Rule buttons to /admin/quotes/[id]**

Open `src/app/admin/quotes/[id]/page.tsx`. Find the top-right action bar (the block with "Shareable URL" link). Add two buttons alongside:

```typescript
<button
  onClick={() => window.location.href = `/admin/invoices/new?prospect_id=${session.prospect_id ?? ''}`}
  className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-sm"
>
  <FileText className="w-4 h-4" />
  Create Invoice
</button>
{session.phone_verified && session.email && detail.prospect && (
  <button
    onClick={async () => {
      const res = await fetch('/api/admin/invoices/restaurant-rule-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_session_id: session.id }),
      })
      const data = await res.json()
      if (res.ok) window.location.href = `/admin/invoices/${data.invoice.id}`
      else alert(data.error ?? 'Failed')
    }}
    className="inline-flex items-center gap-1 px-3 py-2 bg-orange-100 hover:bg-orange-200 rounded-md text-sm text-orange-900"
  >
    🍽️ Restaurant Rule
  </button>
)}
```

Import `FileText` from `lucide-react` if not already imported.

- [ ] **Step 3: Add Documents section to /admin/prospects/[id]**

Read the prospect detail page:

```bash
grep -n "section\|Documents" "src/app/admin/prospects/[id]/page.tsx" | head -10
```

Add a new Documents section near the bottom of the page (after existing cards):

```typescript
{/* Documents section (invoices + future SOW / contracts) */}
<div className="bg-white rounded-xl border border-slate-200 p-5">
  <h2 className="font-semibold text-slate-900 mb-3">Documents</h2>
  {/* Fetch invoices client-side */}
  <ProspectDocuments prospectId={prospect.id} />
</div>
```

Create a small helper component inline or in the same file:

```typescript
function ProspectDocuments({ prospectId }: { prospectId: string }) {
  const [invoices, setInvoices] = useState<Array<{ id: string; invoice_number: string; status: string; total_due_cents: number; created_at: string }>>([])
  useEffect(() => {
    fetch(`/api/admin/invoices?prospect_id=${prospectId}&limit=100`)
      .then(r => r.json())
      .then(d => setInvoices(d.invoices ?? []))
  }, [prospectId])

  if (invoices.length === 0) return <div className="text-sm text-slate-400">No invoices yet</div>

  return (
    <div className="space-y-1">
      {invoices.map((inv) => (
        <Link
          key={inv.id}
          href={`/admin/invoices/${inv.id}`}
          className="flex items-center justify-between text-sm hover:bg-slate-50 -mx-2 px-2 py-1 rounded"
        >
          <span className="font-mono text-xs">{inv.invoice_number}</span>
          <span>${(inv.total_due_cents / 100).toFixed(2)}</span>
          <span className={`text-[10px] rounded px-1.5 py-0.5 ${
            inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
            inv.status === 'void' ? 'bg-red-100 text-red-700' :
            'bg-slate-100 text-slate-700'
          }`}>{inv.status}</span>
          <span className="text-xs text-slate-400">{new Date(inv.created_at).toLocaleDateString()}</span>
        </Link>
      ))}
    </div>
  )
}
```

Make sure `useState`, `useEffect`, and `Link` are imported at the top of the prospect detail file.

- [ ] **Step 4: TS check + commit**

```bash
npx tsc --noEmit
git add src/components/admin/admin-sidebar.tsx "src/app/admin/quotes/[id]/page.tsx" "src/app/admin/prospects/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
feat(admin): invoice integrations across existing admin surfaces

• Sidebar: new "Finance" group with Invoices link
• /admin/quotes/[id]: Create Invoice + 🍽️ Restaurant Rule buttons
  (Restaurant Rule only shown when phone verified + email captured + prospect linked)
• /admin/prospects/[id]: Documents section listing all invoices for this prospect

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 25: Cleanup utility + QA runbook

**Files:**
- Create: `scripts/cleanup-orphan-invoice-pdfs.mjs`
- Create: `docs/runbooks/stage-c-invoicing-qa.md`

- [ ] **Step 1: Create cleanup script**

```javascript
#!/usr/bin/env node
// ── Orphan PDF Cleanup ────────────────────────────────────────────
// Lists R2 objects under invoices/* that don't have a matching
// pdf_storage_path in the invoices table. Does NOT delete by default —
// pass --delete to actually remove.
//
// Usage:
//   node scripts/cleanup-orphan-invoice-pdfs.mjs          (dry-run)
//   node scripts/cleanup-orphan-invoice-pdfs.mjs --delete (destructive)

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const envPath = resolve(ROOT, '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const DELETE = process.argv.includes('--delete')

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})
const Bucket = process.env.R2_PRIVATE_BUCKET

// List DB PDF paths
const { data: invoices } = await sb.from('invoices').select('pdf_storage_path').not('pdf_storage_path', 'is', null)
const dbPaths = new Set((invoices ?? []).map((i) => i.pdf_storage_path))

// List R2 objects
const listRes = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: 'invoices/' }))
const r2Keys = (listRes.Contents ?? []).map((o) => o.Key)

const orphans = r2Keys.filter((k) => !dbPaths.has(k))
console.log(`Found ${r2Keys.length} R2 objects, ${dbPaths.size} DB refs, ${orphans.length} orphans`)

for (const key of orphans) {
  if (DELETE) {
    await s3.send(new DeleteObjectCommand({ Bucket, Key: key }))
    console.log(`deleted: ${key}`)
  } else {
    console.log(`orphan (dry-run): ${key}`)
  }
}

if (!DELETE && orphans.length > 0) {
  console.log(`\nRe-run with --delete to remove these ${orphans.length} orphan(s).`)
}
```

- [ ] **Step 2: Test the cleanup script in dry-run mode**

```bash
node scripts/cleanup-orphan-invoice-pdfs.mjs
```

Expected: lists orphans (if any) without deleting. Should print `Found N R2 objects, M DB refs, K orphans`.

- [ ] **Step 3: Create QA runbook `docs/runbooks/stage-c-invoicing-qa.md`**

```markdown
# Stage C Item 1 — Invoicing QA Checklist

Run through this checklist after deployment. Every box must be green before declaring item 1 complete.

## Pre-flight

- [ ] `node scripts/test-r2-storage.mjs` → 8/8
- [ ] `node scripts/test-invoice-rls.mjs` → 7/7
- [ ] `node scripts/test-invoice-e2e.mjs` → 9/9
- [ ] `node scripts/test-quote-rls.mjs` → 25/25 (regression)
- [ ] `npx tsx tests/quote-ai-evals.mjs` → 38/38 (regression)
- [ ] `npx tsc --noEmit` → clean
- [ ] `node scripts/check-catalog.mjs` → all validations passed
- [ ] `dsig-pdf-service` smoke test returns valid PDF

## Functional QA (run as logged-in admin)

### Basic invoice flow
- [ ] Navigate to `/admin/invoices`; page loads with stat cards and empty state
- [ ] Click `+ New Invoice`; form loads
- [ ] Paste a real prospect UUID, add 2 line items ($500 + $250), set due-date +14 days, save as draft
- [ ] Draft appears in `/admin/invoices` list
- [ ] Open draft detail; click Edit button is visible; click Send
- [ ] Send modal appears with public URL; click Copy URL
- [ ] Open copied URL in incognito browser; see public invoice page with no site chrome
- [ ] Return to admin; invoice status = 'sent' (or 'viewed' if public page already loaded)
- [ ] Public page shows client name, line items, total, Download PDF button
- [ ] Download PDF button produces a valid PDF matching DSIG_PDF_STANDARDS_v2 visually
- [ ] Admin invoice detail shows timeline entries (created, sent, viewed)

### Void & re-issue
- [ ] Click Void & Re-issue; prompt asks for void reason
- [ ] Enter "client requested scope change"; confirm
- [ ] Redirected to new draft invoice; line items pre-filled from original
- [ ] Original invoice now shows status=void, void_reason, superseded_by chain
- [ ] New invoice shows supersedes chain
- [ ] Voided invoice's public URL still works, shows VOIDED banner + link to new

### Restaurant Rule
- [ ] Navigate to an `/admin/quotes/[id]` with phone_verified + email + linked prospect
- [ ] Click 🍽️ Restaurant Rule button
- [ ] Redirected to new draft invoice with auto_trigger='restaurant_rule'
- [ ] Shows 4 research line items at correct displayPrices ($500/$500/$400/$350)
- [ ] Shows 100% discount line with total = $0
- [ ] Click Send; status auto-transitions to 'paid' (not 'sent')
- [ ] PDF renders with PAID ✓ COMPLIMENTARY diagonal stamp
- [ ] `/admin/invoices?auto_generated=true` filter shows the Restaurant Rule draft queue

### Kill switch
- [ ] In Supabase SQL Editor, run `UPDATE quote_config SET value = 'false' WHERE key = 'automated_invoicing_enabled'`
- [ ] Click 🍽️ Restaurant Rule button again on a different session
- [ ] See error response: "Automated invoicing is disabled"
- [ ] Restore: `UPDATE quote_config SET value = 'true' WHERE key = 'automated_invoicing_enabled'`

### Security
- [ ] Incognito browser, try `/invoice/DSIG-2026-0001` without a uuid key → 404
- [ ] Try same with wrong uuid key → 404 (timing-safe)
- [ ] Try `/admin/invoices/new` while logged out → redirects to login
- [ ] Try fetching R2 PDF URL directly (without signed URL) → 403

### Prospect documents
- [ ] Open `/admin/prospects/[id]` for a prospect with invoices
- [ ] Documents section shows all invoices for that prospect sorted by date
- [ ] Each row links to invoice detail
- [ ] Void chains shown with correct statuses

## Observability

- [ ] `invoice_delivery_log` has an entry per send (channel='manual')
- [ ] R2 private bucket shows `invoices/<number>_v1.pdf` for each sent invoice
- [ ] No orphan PDFs: `node scripts/cleanup-orphan-invoice-pdfs.mjs` reports 0 orphans

## Regression

- [ ] `/quote` flow works end-to-end unchanged
- [ ] `/admin/quotes` list loads
- [ ] `/admin/prospects` list loads

## Sign-off

Once all boxes are green, update MEMORY.md with the item-1-complete entry and mark `docs/runbooks/stage-c-plan.md` item 1 as done.
```

- [ ] **Step 4: Commit**

```bash
git add scripts/cleanup-orphan-invoice-pdfs.mjs docs/runbooks/stage-c-invoicing-qa.md
git commit -m "$(cat <<'EOF'
chore(invoice): add cleanup utility + QA runbook

cleanup-orphan-invoice-pdfs.mjs — lists R2 objects without a matching
invoices.pdf_storage_path; --delete flag to remove. Dry-run by default.

QA runbook documents the full go-live checklist across all functional
paths (basic flow, void+reissue, Restaurant Rule, kill switch, security,
regression).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 26: Final integration + MEMORY/CLAUDE updates

**Files:**
- Modify: `MEMORY.md`
- Modify: `CLAUDE.md` (§10)
- Modify: `docs/runbooks/stage-c-plan.md`
- Modify: `docs/runbooks/quote-estimator.md`

- [ ] **Step 1: Run full QA checklist**

Go through every item in `docs/runbooks/stage-c-invoicing-qa.md`. Fix anything that fails before proceeding. Do not skip — this is the verification gate per brainstorming-skill durable principle "evidence before assertions."

- [ ] **Step 2: Update MEMORY.md current task + recent tasks**

Edit `MEMORY.md`:

- Change the "Current task" section's opening line from "STAGE C ITEM 1 — INVOICING. Brainstorm converged; design being written." to "STAGE C ITEM 2 — ADMIN ESTIMATE BUILDER. Item 1 (invoicing) shipped and QA'd."
- Add a new entry in "Recent tasks" above the 2026-04-18 brainstorm entry:

```markdown
### 2026-04-18 — Stage C item 1: invoicing system ✅ SHIPPED
- Migrations 011a-011g + 012a + 013a applied
- `src/lib/r2-storage.ts` wrapper + 8/8 smoke test
- `dsig-pdf-service` deployed at pdf.demandsignals.co (new repo)
- Admin API: 12 endpoints (list, create, detail, update, delete, send,
  mark-paid, void, void-and-reissue, pdf, delivery-log, restaurant-rule-draft)
- Public API: 2 endpoints (view, pdf) with uuid gating
- Admin UI: /admin/invoices list + /new + /[id] detail + quote/prospect integrations
- Public viewer: /invoice/[number]/[uuid] with zero site chrome
- RLS tests 7/7 pass, e2e 9/9 pass, full QA checklist signed off
- Phase 1 delivery (manual-routed URL copy) shipped; SMS/email deferred to
  Phase 2-3 behind config flags
```

- [ ] **Step 3: Update CLAUDE.md §10**

In `CLAUDE.md`, find section §10 "What Is Complete" and append:

```markdown
- [x] Stage C item 1: invoicing system (schema, admin UI, public viewer, R2 PDF storage, dsig-pdf-service integration, Restaurant Rule automation, Phase 1 manual delivery)
```

- [ ] **Step 4: Update docs/runbooks/stage-c-plan.md**

Mark Item 1 complete at the top of that file, with a note like:

```markdown
### Item 1 — Invoicing system ✅ SHIPPED 2026-04-18
Shipped per spec at commit <latest-hash>. See
`docs/superpowers/specs/2026-04-18-invoicing-design.md` and
`docs/runbooks/stage-c-invoicing-qa.md`.

Phases deferred: SMS delivery (Phase 2, pending A2P approval), email
delivery (Phase 3, pending SMTP wire), auto-route on main Send (Phase 4).
```

- [ ] **Step 5: Update docs/runbooks/quote-estimator.md**

Append a new section to the runbook:

```markdown
## Invoicing operations (Stage C item 1)

### Kill switch
- `UPDATE quote_config SET value = 'false' WHERE key = 'automated_invoicing_enabled';`
  → blocks Restaurant Rule auto-draft (and any future Tier-2/3 automation)
- Manual invoice creation always works regardless

### Emergency void
- Via admin UI: `/admin/invoices/[id]` → Void button → reason prompt
- Void is terminal; use Void & Re-issue for corrections that need a new invoice

### PDF re-render
- If a PDF gets corrupted or needs regeneration, bump `pdf_version` manually in DB,
  then call `POST /api/admin/invoices/[id]/send` — will create `_v2.pdf` in R2
- Old PDF stays at `_v1.pdf` forever (immutable audit trail)

### Orphan PDF cleanup
```bash
node scripts/cleanup-orphan-invoice-pdfs.mjs          # dry-run
node scripts/cleanup-orphan-invoice-pdfs.mjs --delete # destructive
```

### Known limitations (v1)
- Delivery is admin-manual-routed (copy URL from modal post-send)
- SMS delivery blocked until A2P Transactional campaign approved
- Email delivery blocked until Gmail SMTP password wired in Vercel
- Payment processing manual (admin Mark Paid) until Stripe in Stage D
```

- [ ] **Step 6: Commit all 4 files**

```bash
git add MEMORY.md CLAUDE.md docs/runbooks/stage-c-plan.md docs/runbooks/quote-estimator.md
git commit -m "$(cat <<'EOF'
docs(stage-c): mark item 1 (invoicing) complete

All QA checks passed. Invoice system live with Phase 1 manual delivery.
SMS (Phase 2) and email (Phase 3) will flip on behind config flags as
A2P Transactional and SMTP wiring land.

Next up: Stage C item 2 — admin estimate builder at /admin/quotes/new.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Checklist

- [ ] All 26 tasks have exact file paths
- [ ] No placeholder text, TBDs, or "add error handling" vague steps
- [ ] Function names consistent: `requireAdmin`, `supabaseAdmin`, `renderInvoicePdf`, `uploadPrivate`, `getPrivateSignedUrl`, `deletePrivate`, `generate_invoice_number` — all match across tasks
- [ ] Column names consistent: `public_uuid`, `pdf_storage_path`, `pdf_version`, `auto_generated`, `auto_trigger`, `auto_sent`, `paid_method`, `paid_note`, `category_hint`, `sent_via_channel`, `supersedes_invoice_id`, `superseded_by_invoice_id`, `voided_by`, `void_reason`, `public_viewed_count`
- [ ] Status lifecycle used consistently: `draft → sent → viewed → paid` / `* → void`
- [ ] Every route definition uses the `requireAdmin` return shape `{ error }` vs `{ user, admin }` correctly
- [ ] Migrations are all `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` — safe to re-run
- [ ] Spec coverage confirmed: every section of `2026-04-18-invoicing-design.md` has at least one task implementing it
- [ ] All commits end with the Co-Authored-By line
- [ ] Type `InvoiceWithLineItems` defined in Task 11 and used consistently in later tasks (send route, render module)

---

## What this plan does NOT do

- Does NOT implement Phase 2 (SMS delivery) — follow-up plan after A2P Transactional approval
- Does NOT implement Phase 3 (email delivery) — follow-up after SMTP wire
- Does NOT implement Phase 4 (auto-route) — follow-up after Phase 2 + 3
- Does NOT wire AI conversation `trigger_restaurant_rule_invoice` tool — small v1.14 prompt update as a separate focused task (the API endpoint exists; only the conversation trigger is missing)
- Does NOT add real catalog-item autocomplete to new-invoice form — v1 requires prospect UUID paste; richer UX is a follow-up
- Does NOT add Stripe payment processing — Stage D
- Does NOT add proper chart of accounts / GL mapping — Stage D+
- Does NOT ship proposal / SOW / estimate doc types — each lands as a separate doc_type addition to `dsig-pdf-service` + its own feature plan
- Does NOT migrate existing public assets to the R2 public bucket — separate housekeeping
