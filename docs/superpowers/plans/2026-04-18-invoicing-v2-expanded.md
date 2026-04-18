# Expanded Invoicing System v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a production invoicing system that handles (1) quote-driven invoices, (2) ad-hoc business invoices, (3) recurring subscription invoices, all with Stripe payment collection, branded DSIG PDFs, hosted-by-us invoice pages, SMS + email delivery, and SOW PDF generation for prospect proposals. April 20 deadline. Replaces canceled Bonsai subscription.

**Architecture:**
- DSIG hosts all invoices at `demandsignals.co/invoice/[number]/[uuid]` (our pages, our PDFs).
- Stripe is payment rail only — "Pay Now" button creates a Stripe Payment Link on first click, caches URL, webhook flips invoice to `paid` on success.
- Subscription catalog owned by DSIG (`subscription_plans` table). Each monthly cycle auto-creates an `invoice` row via cron + webhook. Stripe handles recurring charges; we emit the document.
- Invoice kinds: `quote_driven`, `business`, `subscription_cycle`, `restaurant_rule`. One table, discriminator column.
- SOW PDFs ship as a new `sow` doc_type in `dsig-pdf-service`, reusing cover + back cover + components.
- Delivery: Phase 1 manual URL copy, Phase 2a SMS via Twilio in test-allowlist mode, Phase 3 email via SMTP. All persist forever to admin + prospect record.

**Tech Stack:** TypeScript, Next.js 16, React 19, Supabase, Cloudflare R2, Python PDF microservice (live), Stripe Node SDK, Twilio Node SDK, Nodemailer, Tailwind v4.

**Prerequisites (Hunter does in morning, ~20 min):**
- Stripe account signup → Dashboard → Developers → API keys
- Copy `STRIPE_SECRET_KEY` (test: `sk_test_...`), `STRIPE_PUBLISHABLE_KEY` (`pk_test_...`)
- Create test webhook endpoint → copy `STRIPE_WEBHOOK_SECRET`
- Add 3 env vars to Vercel `demandsignals-next` project
- Run `vercel env pull .env.local --environment=production --yes` to sync locally

**Non-prerequisites (already green):**
- R2 integration live (`assets.demandsignals.co`, private bucket working, 9/9 tests)
- PDF service live (`pdf.demandsignals.co`, 24/24 tests, invoice doc_type ready)
- Stage A+B schema applied (25/25 RLS)
- Admin portal with requireAdmin working

**Hard deferrals (post-April-20):**
- Stripe Tax integration
- Multi-currency
- Dunning beyond Stripe defaults
- Refund UI (use Stripe dashboard)
- Proposal doc_type (separate from SOW)
- OAuth Checkpoint 2 / client portal
- SEO audit / master plan doc_types

---

## Rollout strategy

Work in **phases that individually pass tests before moving on**. Each phase ends in a known-green state so we can ship partial scope if needed.

- **Phase A — Schema foundation** (Tasks 1-12): all migrations, Stripe types, no code dependencies beyond them
- **Phase B — Core invoicing backbone** (Tasks 13-22): invoice API + PDF rendering + admin UI basics
- **Phase C — Stripe integration** (Tasks 23-32): Payment Links, webhooks, idempotency
- **Phase D — Subscriptions** (Tasks 33-40): plans catalog, subscription lifecycle, cycle invoice generation
- **Phase E — SOW PDFs** (Tasks 41-45): new doc_type in dsig-pdf-service, admin SOW UI
- **Phase F — SMS + email delivery** (Tasks 46-50): Twilio test-mode, Nodemailer email
- **Phase G — Final polish** (Tasks 51-55): public viewer, prospect Documents section, QA runbook, CLAUDE/MEMORY updates

---

## File Structure

### Supabase migrations (applied via Supabase SQL Editor)

| File | Purpose |
|------|---------|
| `supabase/migrations/011a_invoices_versioning.sql` | public_uuid, supersession, void cols |
| `supabase/migrations/011b_invoices_automation.sql` | auto_generated, auto_trigger, auto_sent |
| `supabase/migrations/011c_invoices_pdf_storage.sql` | pdf_storage_path, pdf_rendered_at, pdf_version |
| `supabase/migrations/011d_invoices_payment_category.sql` | paid_method, paid_note, category_hint, sent_via_channel, sent_via_email_to, public_viewed_count |
| `supabase/migrations/011e_invoices_kind_column.sql` | `kind` enum discriminator |
| `supabase/migrations/011f_invoices_stripe_cols.sql` | stripe_invoice_id, stripe_payment_link_url, stripe_checkout_session_id |
| `supabase/migrations/011g_invoices_indexes.sql` | indexes on new cols |
| `supabase/migrations/011h_invoice_delivery_log.sql` | delivery audit log table |
| `supabase/migrations/011i_invoice_email_log.sql` | email-specific audit log |
| `supabase/migrations/012a_stripe_customers.sql` | stripe_customer_id on prospects, stripe_events table |
| `supabase/migrations/012b_subscription_plans.sql` | DSIG-owned catalog of plans |
| `supabase/migrations/012c_subscriptions.sql` | subscription instances |
| `supabase/migrations/012d_sow_documents.sql` | sow_documents table |
| `supabase/migrations/013a_automation_config.sql` | config kill-switches |
| `supabase/migrations/013b_prospects_delivery_pref.sql` | prospects.delivery_preference |

### Main repo code files

| File | Responsibility |
|------|----------------|
| `src/lib/quote-pricing.ts` | MODIFY: add `displayPriceCents` + bump CATALOG_VERSION |
| `src/lib/invoice-types.ts` | Shared TypeScript types |
| `src/lib/invoice-pdf/payload.ts` | Map invoice DB row → PDF service payload |
| `src/lib/invoice-pdf/render.ts` | HTTP call to dsig-pdf-service |
| `src/lib/sow-pdf/payload.ts` | Map sow_documents row → PDF service payload |
| `src/lib/sow-pdf/render.ts` | HTTP call for SOW rendering |
| `src/lib/stripe-client.ts` | Stripe SDK wrapper, singleton, idempotency helper |
| `src/lib/stripe-sync.ts` | Invoice ↔ Stripe Payment Link / Customer bridge |
| `src/lib/subscription-engine.ts` | Next-cycle invoice generator |
| `src/lib/twilio-sms.ts` | SMS wrapper with test-allowlist gate |
| `src/lib/invoice-email.ts` | Email composition + Nodemailer send |
| `src/app/api/admin/invoices/route.ts` | GET list + POST create |
| `src/app/api/admin/invoices/[id]/route.ts` | GET/PATCH/DELETE |
| `src/app/api/admin/invoices/[id]/send/route.ts` | Draft → sent flow |
| `src/app/api/admin/invoices/[id]/mark-paid/route.ts` | Manual mark-paid |
| `src/app/api/admin/invoices/[id]/void/route.ts` | Pure void |
| `src/app/api/admin/invoices/[id]/void-and-reissue/route.ts` | Void + new draft |
| `src/app/api/admin/invoices/[id]/pdf/route.ts` | Admin signed-URL redirect |
| `src/app/api/admin/invoices/[id]/send-sms/route.ts` | SMS delivery |
| `src/app/api/admin/invoices/[id]/send-email/route.ts` | Email delivery |
| `src/app/api/admin/invoices/[id]/delivery-log/route.ts` | Delivery history fetch |
| `src/app/api/admin/invoices/restaurant-rule-draft/route.ts` | Automation entry |
| `src/app/api/admin/invoices/payment-link/route.ts` | Create Stripe Payment Link on demand |
| `src/app/api/admin/subscriptions/route.ts` | GET list + POST create |
| `src/app/api/admin/subscriptions/[id]/route.ts` | GET/PATCH/DELETE |
| `src/app/api/admin/subscriptions/[id]/cancel/route.ts` | Cancel subscription |
| `src/app/api/admin/subscription-plans/route.ts` | GET catalog + POST create |
| `src/app/api/admin/sow/route.ts` | GET list + POST create |
| `src/app/api/admin/sow/[id]/route.ts` | GET/PATCH/DELETE |
| `src/app/api/admin/sow/[id]/send/route.ts` | Send SOW to prospect |
| `src/app/api/admin/sow/[id]/pdf/route.ts` | Admin SOW PDF |
| `src/app/api/invoices/public/[number]/route.ts` | Public invoice JSON |
| `src/app/api/invoices/public/[number]/pdf/route.ts` | Public PDF redirect |
| `src/app/api/invoices/public/[number]/pay/route.ts` | Create/return Payment Link |
| `src/app/api/sow/public/[number]/route.ts` | Public SOW JSON |
| `src/app/api/sow/public/[number]/pdf/route.ts` | Public SOW PDF |
| `src/app/api/sow/public/[number]/accept/route.ts` | Client-side acceptance |
| `src/app/api/webhooks/stripe/route.ts` | Stripe webhook handler |
| `src/app/api/cron/subscription-cycles/route.ts` | Daily cron: generate cycle invoices |
| `src/app/admin/invoices/page.tsx` | Admin list |
| `src/app/admin/invoices/new/page.tsx` | Admin create |
| `src/app/admin/invoices/[id]/page.tsx` | Admin detail |
| `src/app/admin/subscriptions/page.tsx` | Subscriptions list |
| `src/app/admin/subscriptions/new/page.tsx` | New subscription |
| `src/app/admin/subscriptions/[id]/page.tsx` | Subscription detail |
| `src/app/admin/subscription-plans/page.tsx` | Plans catalog admin |
| `src/app/admin/sow/page.tsx` | SOW list |
| `src/app/admin/sow/new/page.tsx` | New SOW |
| `src/app/admin/sow/[id]/page.tsx` | SOW detail |
| `src/app/invoice/[number]/[uuid]/page.tsx` | Public invoice viewer with Pay button |
| `src/app/sow/[number]/[uuid]/page.tsx` | Public SOW viewer with Accept button |
| `src/components/admin/admin-sidebar.tsx` | MODIFY: add Finance group |
| `src/app/admin/quotes/[id]/page.tsx` | MODIFY: add Create Invoice + Restaurant Rule + Create SOW buttons |
| `src/app/admin/prospects/[id]/page.tsx` | MODIFY: add Documents section |
| `scripts/test-invoice-rls.mjs` | RLS tests |
| `scripts/test-invoice-lifecycle.mjs` | E2E DB lifecycle |
| `scripts/test-stripe-integration.mjs` | Stripe sandbox smoke test |
| `scripts/test-subscription-cycle.mjs` | Subscription cycle generation test |
| `docs/runbooks/invoicing-ops.md` | Operations runbook |
| `docs/runbooks/stripe-setup.md` | Hunter's Stripe setup guide |

### dsig-pdf-service repo additions

| File | Purpose |
|------|---------|
| `dsig_pdf/docs/sow.py` | SOW doc_type |
| `tests/fixtures/sample_sow.json` | Test fixture |
| `tests/test_sow_render.py` | SOW render tests |
| `api/render.py` | MODIFY: register sow renderer in DOC_RENDERERS |

---

## Architectural decisions (locked, do not re-debate)

1. **Our pages are canonical.** `demandsignals.co/invoice/[number]/[uuid]` and `demandsignals.co/sow/[number]/[uuid]` are where clients land. Stripe is only reached via the "Pay Now" button.

2. **Invoice `kind` column is the discriminator.** Values: `quote_driven`, `business`, `subscription_cycle`, `restaurant_rule`. Logic branches off this column.

3. **Stripe is the child.** We create Stripe Customers on-demand when first invoice for a prospect needs payment. We create Stripe Payment Links on-demand when client clicks Pay. We do not mirror Stripe's catalog — our `subscription_plans` is canonical.

4. **Idempotency is non-negotiable.** Every Stripe webhook event goes through `stripe_events` table — we record `event_id` + `processed_at`. Duplicate events = no-op.

5. **Subscription cycle generation is DB-driven + Stripe-confirmed.** Cron creates `invoice` row with `status='sent'` for each active subscription on its due date. Stripe's recurring charge fires a `invoice.paid` webhook → we flip `paid`. If Stripe fails, webhook handler flips `past_due`. We don't rely on Stripe for the document lifecycle, only the money movement.

6. **SMS delivery uses test-allowlist gate.** `SMS_TEST_MODE=true` + `SMS_TEST_ALLOWLIST=<Hunter's cell>` until A2P Transactional approved. Code path is identical; only the allowlist check differs.

7. **SOW acceptance creates the first invoice automatically.** Deposit invoice (25% of total) generated on client click. This is the transition from "prospect" to "client."

8. **Every document (invoice + SOW) has a public UUID.** `/invoice/[number]/[uuid]` and `/sow/[number]/[uuid]` — same pattern.

---

## Task 1: Apply migration 011a — invoices versioning

**Files:**
- Create: `supabase/migrations/011a_invoices_versioning.sql`

- [ ] **Step 1: Create migration file**

```sql
-- 011a: Add versioning + void columns to existing invoices table.
-- Additive, safe to re-run (IF NOT EXISTS).

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS public_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS supersedes_invoice_id uuid REFERENCES invoices(id),
  ADD COLUMN IF NOT EXISTS superseded_by_invoice_id uuid REFERENCES invoices(id),
  ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS void_reason text;
```

- [ ] **Step 2: Apply via Supabase SQL Editor**

Paste content, Run. Expected: "Success. No rows returned."

- [ ] **Step 3: Verify**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'invoices'
  AND column_name IN ('public_uuid', 'supersedes_invoice_id', 'superseded_by_invoice_id', 'voided_by', 'void_reason')
ORDER BY column_name;
```
Expected: 5 rows.

- [ ] **Step 4: Commit migration file**

```bash
cd "D:/CLAUDE/demandsignals-next"
git add supabase/migrations/011a_invoices_versioning.sql
git commit -m "$(cat <<'EOF'
feat(db): migration 011a — invoices versioning + void columns

public_uuid, supersedes/superseded_by, voided_by, void_reason.
Applied to production Supabase.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Apply migration 011b — automation columns

**Files:**
- Create: `supabase/migrations/011b_invoices_automation.sql`

- [ ] **Step 1: Create file**

```sql
-- 011b: Automation tier flags on invoices.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_trigger text,
  ADD COLUMN IF NOT EXISTS auto_sent boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Apply via Supabase SQL Editor**

Run. Expected success.

- [ ] **Step 3: Verify**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='invoices' AND column_name IN ('auto_generated', 'auto_trigger', 'auto_sent');
```
Expected: 3 rows.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/011b_invoices_automation.sql
git commit -m "feat(db): migration 011b — invoices automation flags

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Apply migration 011c — PDF storage columns

**Files:**
- Create: `supabase/migrations/011c_invoices_pdf_storage.sql`

- [ ] **Step 1: Create file**

```sql
-- 011c: PDF storage tracking.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS pdf_storage_path text,
  ADD COLUMN IF NOT EXISTS pdf_rendered_at timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_version integer NOT NULL DEFAULT 1;
```

- [ ] **Step 2: Apply + verify**

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

## Task 4: Apply migration 011d — payment + category + delivery columns

**Files:**
- Create: `supabase/migrations/011d_invoices_payment_category.sql`

- [ ] **Step 1: Create file**

```sql
-- 011d: Payment method, category hints, delivery channel tracking.

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
  AND column_name IN ('paid_method','paid_note','category_hint','sent_via_channel','sent_via_email_to','public_viewed_count');
```
Expected: 6 rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/011d_invoices_payment_category.sql
git commit -m "feat(db): migration 011d — payment + category + delivery tracking

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Apply migration 011e — kind discriminator

**Files:**
- Create: `supabase/migrations/011e_invoices_kind_column.sql`

- [ ] **Step 1: Create file**

```sql
-- 011e: Invoice kind discriminator. Distinguishes quote-driven, ad-hoc business,
-- subscription cycle, and Restaurant Rule invoices so admin UI can branch.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'business'
    CHECK (kind IN ('quote_driven','business','subscription_cycle','restaurant_rule'));

-- Backfill existing rows: if quote_session_id is set, kind='quote_driven'.
UPDATE invoices SET kind = 'quote_driven' WHERE quote_session_id IS NOT NULL;
```

- [ ] **Step 2: Apply + verify**

```sql
SELECT kind, COUNT(*) FROM invoices GROUP BY kind;
```
Expected: at least one row (`business` default or `quote_driven` if any test invoices exist).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/011e_invoices_kind_column.sql
git commit -m "feat(db): migration 011e — invoice kind discriminator

Distinguishes quote_driven / business / subscription_cycle / restaurant_rule.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Apply migration 011f — Stripe columns on invoices

**Files:**
- Create: `supabase/migrations/011f_invoices_stripe_cols.sql`

- [ ] **Step 1: Create file**

```sql
-- 011f: Stripe integration columns.
--
-- stripe_invoice_id: Set ONLY for subscription cycle invoices (Stripe creates those).
-- stripe_payment_link_url: Cached Payment Link URL; generated on demand.
-- stripe_payment_link_id: Stripe's ID for the Payment Link.
-- subscription_id: FK to subscriptions table (added in 012c).

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_link_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_link_url text,
  ADD COLUMN IF NOT EXISTS subscription_id uuid;
```

- [ ] **Step 2: Apply + verify**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='invoices'
  AND column_name IN ('stripe_invoice_id','stripe_payment_link_id','stripe_payment_link_url','subscription_id');
```
Expected: 4 rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/011f_invoices_stripe_cols.sql
git commit -m "feat(db): migration 011f — invoices Stripe columns

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Apply migration 011g — indexes

**Files:**
- Create: `supabase/migrations/011g_invoices_indexes.sql`

- [ ] **Step 1: Create file**

```sql
-- 011g: Indexes for common queries.

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_public_uuid ON invoices (public_uuid);
CREATE INDEX IF NOT EXISTS idx_invoices_supersedes ON invoices (supersedes_invoice_id) WHERE supersedes_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_auto_trigger ON invoices (auto_trigger) WHERE auto_trigger IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_auto_draft_queue ON invoices (created_at DESC)
  WHERE auto_generated = true AND status = 'draft';
CREATE INDEX IF NOT EXISTS idx_invoices_kind ON invoices (kind);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON invoices (stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices (subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_category_hint ON invoices (category_hint) WHERE category_hint IS NOT NULL;
```

- [ ] **Step 2: Apply + verify**

```sql
SELECT indexname FROM pg_indexes WHERE tablename='invoices' AND indexname LIKE 'idx_invoices_%' ORDER BY indexname;
```
Expected: ≥8 matching indexes.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/011g_invoices_indexes.sql
git commit -m "feat(db): migration 011g — invoices indexes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Apply migration 011h — invoice_delivery_log

**Files:**
- Create: `supabase/migrations/011h_invoice_delivery_log.sql`

- [ ] **Step 1: Create file**

```sql
-- 011h: Per-send delivery audit log.

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
Expected: 0.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/011h_invoice_delivery_log.sql
git commit -m "feat(db): migration 011h — invoice_delivery_log table

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Apply migration 011i — invoice_email_log

**Files:**
- Create: `supabase/migrations/011i_invoice_email_log.sql`

- [ ] **Step 1: Create file**

```sql
-- 011i: Email-specific audit log.

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
git add supabase/migrations/011i_invoice_email_log.sql
git commit -m "feat(db): migration 011i — invoice_email_log table

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Apply migration 012a — Stripe customers + events

**Files:**
- Create: `supabase/migrations/012a_stripe_customers.sql`

- [ ] **Step 1: Create file**

```sql
-- 012a: Stripe integration — customer linking + event idempotency.

-- Link Stripe customer to our prospect record. Nullable; created on demand.
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

CREATE INDEX IF NOT EXISTS idx_prospects_stripe_customer_id
  ON prospects (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Webhook event idempotency. Store every processed event ID so duplicates no-op.
CREATE TABLE IF NOT EXISTS stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  processing_result text,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type_time
  ON stripe_events (event_type, processed_at DESC);

ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read stripe_events" ON stripe_events;
CREATE POLICY "Admins read stripe_events" ON stripe_events FOR SELECT USING (is_admin());

REVOKE ALL ON stripe_events FROM anon;
```

- [ ] **Step 2: Apply + verify**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='prospects' AND column_name='stripe_customer_id';
SELECT COUNT(*) FROM stripe_events;
```
Expected: 1 column row, 0 event rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/012a_stripe_customers.sql
git commit -m "feat(db): migration 012a — Stripe customer linking + event idempotency

prospects.stripe_customer_id nullable (created on demand).
stripe_events table: every webhook event stored by stripe_event_id (UNIQUE).
Duplicate deliveries become no-ops.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Apply migration 012b — subscription_plans catalog

**Files:**
- Create: `supabase/migrations/012b_subscription_plans.sql`

- [ ] **Step 1: Create file**

```sql
-- 012b: DSIG-owned catalog of subscription plans.
-- Stripe is the billing engine; we own the catalog (plan names, pricing,
-- included services). Stripe product + price IDs are references only.

CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'USD',
  billing_interval text NOT NULL CHECK (billing_interval IN ('month','quarter','year')),
  trial_days integer NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  stripe_product_id text,
  stripe_price_id text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans (active, created_at DESC);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read subscription_plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins insert subscription_plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins update subscription_plans" ON subscription_plans;

CREATE POLICY "Admins read subscription_plans" ON subscription_plans FOR SELECT USING (is_admin());
CREATE POLICY "Admins insert subscription_plans" ON subscription_plans FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins update subscription_plans" ON subscription_plans FOR UPDATE USING (is_admin());

REVOKE ALL ON subscription_plans FROM anon;
```

- [ ] **Step 2: Apply + verify**

```sql
SELECT COUNT(*) FROM subscription_plans;
```
Expected: 0.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/012b_subscription_plans.sql
git commit -m "feat(db): migration 012b — subscription_plans catalog

DSIG owns the catalog. Stripe product/price IDs stored as references only.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Apply migration 012c — subscriptions instances + 012d SOW documents + 013a+b config/prefs

**Files:**
- Create: `supabase/migrations/012c_subscriptions.sql`
- Create: `supabase/migrations/012d_sow_documents.sql`
- Create: `supabase/migrations/013a_automation_config.sql`
- Create: `supabase/migrations/013b_prospects_delivery_pref.sql`

- [ ] **Step 1: Create `012c_subscriptions.sql`**

```sql
-- 012c: Subscription instances — one row per active client subscription.

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','trialing','past_due','canceled','paused')),
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  next_invoice_date date NOT NULL,
  canceled_at timestamptz,
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_prospect ON subscriptions (prospect_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_invoice ON subscriptions (next_invoice_date)
  WHERE status IN ('active','trialing');
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Now that subscriptions exists, add FK on invoices.subscription_id
ALTER TABLE invoices
  ADD CONSTRAINT invoices_subscription_id_fkey
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL;

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins insert subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins update subscriptions" ON subscriptions;

CREATE POLICY "Admins read subscriptions" ON subscriptions FOR SELECT USING (is_admin());
CREATE POLICY "Admins insert subscriptions" ON subscriptions FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins update subscriptions" ON subscriptions FOR UPDATE USING (is_admin());

REVOKE ALL ON subscriptions FROM anon;
```

- [ ] **Step 2: Create `012d_sow_documents.sql`**

```sql
-- 012d: Statement of Work documents — proposal/scope artifacts.

CREATE SEQUENCE IF NOT EXISTS sow_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_sow_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $func_gen_sow$
DECLARE
  next_num bigint;
  year_part text;
BEGIN
  next_num := nextval('sow_number_seq');
  year_part := to_char(now(), 'YYYY');
  RETURN 'SOW-' || year_part || '-' || lpad(next_num::text, 4, '0');
END;
$func_gen_sow$;

REVOKE EXECUTE ON FUNCTION generate_sow_number FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_sow_number TO service_role;

CREATE TABLE IF NOT EXISTS sow_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sow_number text NOT NULL UNIQUE,
  public_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  quote_session_id uuid REFERENCES quote_sessions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','viewed','accepted','declined','void')),
  title text NOT NULL,
  scope_summary text,
  deliverables jsonb NOT NULL DEFAULT '[]'::jsonb,
  timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  pricing jsonb NOT NULL DEFAULT '{}'::jsonb,
  payment_terms text,
  guarantees text,
  notes text,
  pdf_storage_path text,
  pdf_rendered_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  accepted_signature text,
  accepted_ip text,
  declined_at timestamptz,
  decline_reason text,
  voided_at timestamptz,
  void_reason text,
  deposit_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sow_documents_public_uuid ON sow_documents (public_uuid);
CREATE INDEX IF NOT EXISTS idx_sow_documents_prospect ON sow_documents (prospect_id);
CREATE INDEX IF NOT EXISTS idx_sow_documents_status ON sow_documents (status);

ALTER TABLE sow_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full sow_documents" ON sow_documents;
CREATE POLICY "Admins full sow_documents" ON sow_documents FOR ALL USING (is_admin()) WITH CHECK (is_admin());

REVOKE ALL ON sow_documents FROM anon;
REVOKE ALL ON SEQUENCE sow_number_seq FROM anon;
```

- [ ] **Step 3: Create `013a_automation_config.sql`**

```sql
-- 013a: Kill-switch config rows.

INSERT INTO quote_config (key, value) VALUES
  ('automated_invoicing_enabled', 'true'),
  ('stripe_enabled', 'false'),
  ('sms_delivery_enabled', 'false'),
  ('email_delivery_enabled', 'false'),
  ('subscription_cycle_cron_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
```

- [ ] **Step 4: Create `013b_prospects_delivery_pref.sql`**

```sql
-- 013b: Per-prospect delivery preference.

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS delivery_preference text NOT NULL DEFAULT 'both'
    CHECK (delivery_preference IN ('email_only','sms_only','both'));
```

- [ ] **Step 5: Apply all 4 in Supabase SQL Editor (separate runs)**

- [ ] **Step 6: Verify all**

```sql
SELECT COUNT(*) FROM subscriptions;
SELECT COUNT(*) FROM sow_documents;
SELECT key, value FROM quote_config WHERE key LIKE '%_enabled' ORDER BY key;
SELECT column_default FROM information_schema.columns WHERE table_name='prospects' AND column_name='delivery_preference';
```
Expected: 0, 0, 5+ flag rows, `'both'::text` default.

- [ ] **Step 7: Commit all four files**

```bash
git add supabase/migrations/012c_subscriptions.sql supabase/migrations/012d_sow_documents.sql supabase/migrations/013a_automation_config.sql supabase/migrations/013b_prospects_delivery_pref.sql
git commit -m "$(cat <<'EOF'
feat(db): migrations 012c/012d/013a/013b — subscriptions + SOW + config

subscriptions table (instances linked to subscription_plans),
sow_documents table (with generate_sow_number() function like invoices),
automation/delivery kill-switch config rows,
prospects.delivery_preference column.

All applied to production Supabase.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# END OF PHASE A — Schema foundation complete

At this point: 15 migrations applied, DB schema ready for all 3 invoice kinds + subscriptions + SOW + Stripe integration. No app code yet.

**Verification command before starting Phase B:**

```bash
cd "D:/CLAUDE/demandsignals-next"
node scripts/test-quote-rls.mjs       # expect 25/25
```

Should still pass — nothing we changed should regress existing RLS.

---

## Phase B — Core invoicing backbone (Tasks 13-22)

See separate file `docs/superpowers/plans/2026-04-18-invoicing-v2-expanded-phase-b.md` for tasks 13-22. Split into phase files to keep each file under 1500 lines.

Phase B covers:
- Catalog update: `displayPriceCents` field
- Shared TypeScript types (`invoice-types.ts`)
- PDF render HTTP client
- RLS test script for new tables
- Admin API: list, create, detail, update, delete, send, mark-paid, void, void-and-reissue, pdf, delivery-log, restaurant-rule-draft
- Uses existing `dsig-pdf-service` (already live)

## Phase C — Stripe integration (Tasks 23-32)

See `docs/superpowers/plans/2026-04-18-invoicing-v2-expanded-phase-c.md`.

Phase C covers:
- Install `stripe` npm package
- `src/lib/stripe-client.ts` wrapper (singleton, env-driven, idempotency helper)
- `src/lib/stripe-sync.ts` — create customer, create payment link, map events
- `POST /api/admin/invoices/[id]/payment-link` — generate Stripe Payment Link for an invoice
- `POST /api/webhooks/stripe` — webhook handler with signature verify + idempotency
- Public `GET /api/invoices/public/[number]/pay` — returns cached Payment Link URL or creates one
- Integration tests (Stripe test mode)

## Phase D — Subscriptions (Tasks 33-40)

See `docs/superpowers/plans/2026-04-18-invoicing-v2-expanded-phase-d.md`.

Phase D covers:
- Subscription plan admin UI (`/admin/subscription-plans`)
- Create subscription flow (`/admin/subscriptions/new`) — links prospect + plan, creates Stripe customer + subscription
- Subscription detail page with cancel / update
- Cron endpoint `/api/cron/subscription-cycles` — generates next-cycle invoices
- Webhook handling for subscription events

## Phase E — SOW PDFs (Tasks 41-45)

See `docs/superpowers/plans/2026-04-18-invoicing-v2-expanded-phase-e.md`.

Phase E covers:
- New `sow` doc_type in `dsig-pdf-service` repo
- SOW admin UI (list, create, detail)
- Public SOW page with Accept button
- Accept flow creates deposit invoice automatically

## Phase F — SMS + email delivery (Tasks 46-50)

See `docs/superpowers/plans/2026-04-18-invoicing-v2-expanded-phase-f.md`.

Phase F covers:
- Twilio SMS wrapper with `SMS_TEST_MODE` allowlist gate
- Email composition with Nodemailer
- Send-SMS + send-email admin API routes
- Auto-delivery on send (routes to prospects.delivery_preference)

## Phase G — Final polish (Tasks 51-55)

See `docs/superpowers/plans/2026-04-18-invoicing-v2-expanded-phase-g.md`.

Phase G covers:
- Public invoice viewer with Pay Now button
- Admin sidebar Finance group + subscription nav
- Quote page integrations (Create Invoice + Restaurant Rule + Create SOW buttons)
- Prospect page Documents section
- `docs/runbooks/invoicing-ops.md`
- `docs/runbooks/stripe-setup.md` (for Hunter's morning)
- MEMORY.md + CLAUDE.md updates

---

## Self-Review

- [ ] Tasks 1-12 fully specified with exact SQL, verification, and commit
- [ ] Additive-only, safe to re-run, IF NOT EXISTS everywhere
- [ ] Stripe idempotency built into schema (stripe_events UNIQUE)
- [ ] FK on invoices.subscription_id added AFTER subscriptions table exists
- [ ] generate_sow_number function mirrors generate_invoice_number pattern with named dollar-quotes
- [ ] All new tables have RLS enabled + admin policies + REVOKE from anon
- [ ] Phase structure = each phase is independently testable + committable
- [ ] Phase boundary markers make it clear where to pause and re-run green-state checks

## What this plan does NOT do

- Does NOT include Phase B-G task code — those live in separate phase-specific plan files to keep each file under the context-friendly 1500-line threshold
- Does NOT require Stripe keys for Phase A (pure schema)
- Does NOT commit to live Stripe mode — test mode first, flip to live as final step
