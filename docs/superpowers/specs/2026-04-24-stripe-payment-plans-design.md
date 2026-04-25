# Stripe Payment Plans + SOW-to-Project Conversion — Design

**Status:** approved (brainstorm) — pending implementation plan
**Date:** 2026-04-24
**Author:** brainstorm session with Hunter
**Reference cases:** SOW-MOME-042426A (face-to-face acceptance), Hangtown (3× $2K cash + $2K TIK + $50/mo hosting), $10K hypothetical (25/25/25/25)

---

## 1. Problem

Today, the Stripe gateway is ~85% scaffolded but has gaps that block real use:

1. The Pay button on the magic-link invoice page (`/invoice/[number]/[uuid]`) only renders if `stripe_payment_link_url` is already cached on the invoice row. That URL is only created by the admin clicking a button or by a redirect endpoint being hit — never during page render. So clients arriving at the magic link see "Pay by check" instead of a Pay button.

2. SOW acceptance is automated only when a client clicks Accept on the public SOW page. Real deals close face-to-face, by phone, by email — none of which trigger the lifecycle (project creation, deposit invoice, subscription materialization, TIK ledger).

3. The deposit invoice generated on accept is a single $X invoice for the entire deposit. There is no support for split installments, milestone-triggered installments, or any payment plan more complex than "one shot."

4. Recurring subscriptions are inserted as DSIG `subscriptions` rows but never created in Stripe. Nothing actually charges the client's card on a cycle.

5. Trade-in-Kind obligations are recorded but their lifecycle (when they open, when they're drawn down, when receipts fire) isn't fully wired through the lifecycle.

This spec defines the model and endpoints that make all three flows — one-time invoice payment, deferred recurring subscription, milestone-driven payment plans — work end-to-end.

---

## 2. Reference cases

### Case 1 — SOW-MOME-042426A (locked example)
- Approved face-to-face today (2026-04-24)
- $500 build, split into 2× $250 cash installments 30 days apart
- $1,275 TIK opens at acceptance
- $20/mo hosting starts May 1, 2026, runs 24 cycles, then auto-cancels

### Case 2 — Hangtown (existing client to be backfilled)
- $6,000 build = 3× $2,000 cash, milestone-triggered
- $2,000 TIK that opens **when the third $2K cash payment is received** (cascade)
- $50/mo hosting starts May 1, open-ended
- Separately: $400/mo social media engagement = its own SOW + own project + own payment plan

### Case 3 — $10K hypothetical (typical web dev)
- 25% on acceptance, 25% on milestone 1, 25% on milestone 2, 25% TIK on acceptance
- Total: $7,500 cash + $2,500 TIK = $10,000

---

## 3. Locked design decisions

The following were decided during brainstorm and are non-negotiable for v1:

| Decision | Choice |
|---|---|
| Magic-link Pay button gating | Drop precondition; render whenever invoice is outstanding cash. Pay button points at `/api/invoices/public/[number]/pay` redirect endpoint that lazily creates Payment Link and 302s to Stripe. |
| TIK model | Keep as designed: parallel ledger via `trade_credits` table. Opens on trigger. Drawn down by admin marking services delivered, which issues a receipt. Not collapsed into payment_installments. |
| Deposit splits | Two independent invoices, NOT a 2-cycle Stripe subscription. Each invoice is a standalone Payment Link. Stripe saves the card on first payment via `setup_future_usage='off_session'` so installment 2 can offer "use saved card." |
| "Convert SOW to Project" visibility | Always visible to admins once SOW is saved (any status). Button label/confirmation strength varies by status: `draft/sent/viewed` → "Convert SOW to Project"; `accepted` → "Re-run Project Setup" (idempotent); `declined/void` → "Force Convert (override)" with red warning. |
| Backfill historical clients | "Already paid externally" checkbox per row at conversion time. Skips invoice generation, jumps to receipt creation with admin-supplied paid_date + paid_method + reference. |
| Change orders | Inline edit if no payment received yet (locked once first invoice is paid). Otherwise mini-SOW with `parent_sow_id` pointing at original; mini-SOW gets its own payment plan, attaches to same project. |
| Refunds | Manual amount + reason. No cascade. Admin enters refund $ on a receipt; system processes Stripe refund of exact amount, creates refund record. Nothing else happens automatically. |
| Partial payments | Installment status `partially_paid` + `amount_paid_cents` field. Multiple receipts per invoice. `on_completion_of_payment` cascade fires only when status reaches `paid` (full). |
| Overages on TIK | Per-event admin choice. When admin marks services delivered worth $X > remaining $Y, prompt: "Overage of $Z — bill as new cash invoice or open new TIK ledger?" |
| Subscription pause | Pushes `end_date` out by pause duration. Total contract value preserved. Stripe `pause_collection` + push `cancel_at`. |
| Trigger types (full set) | `on_acceptance`, `time` (date), `milestone` (project phase), `on_completion_of_payment` (cascade from another row). |

### Edge cases explicitly DEFERRED to v1.1

These need product decisions but won't be designed now. The data model accommodates them; behavior will be specified when first encountered:
- Compound triggers ("on date X OR milestone Y, whichever first")
- Refund cascades (auto-cancel TIK when triggering payment refunded)
- TIK overflow policy when over-delivered without admin marking each event
- Subscription mid-cycle plan change

---

## 4. User flow — "Convert SOW to Project"

**Admin POV:**

1. Open `/admin/sow/[id]` for any saved SOW.
2. Click "Convert SOW to Project" (always visible; label varies by status).
3. Modal opens with editable sections, pre-filled from SOW data:

   **Acceptance section:**
   - Signed by (text — defaults "Hunter [Last] (admin, on behalf of [client business])")
   - Accepted at (date picker — defaults today)
   - Method (dropdown: in_person / phone / email / magic_link — for audit only)

   **Build payment plan section:**
   - Total to allocate: $X (from SOW pricing.total_cents minus TIK if applicable)
   - Preset dropdown (Single / 2 installments / 3 installments / Milestone-based / Custom)
   - Row builder with add/remove. Each row:
     - Amount ($ or "remaining balance" toggle)
     - Currency (Cash | TIK)
     - Trigger (On acceptance | On date → date picker | On milestone → phase dropdown | On completion of payment → other-row dropdown)
     - "Already paid externally" checkbox (only enabled at conversion time, never editable after) → if checked, exposes paid_date + paid_method + reference fields
   - Live sum check banner. Red until allocation matches SOW total exactly.

   **Recurring subscriptions section:**
   - One row per recurring deliverable from SOW phases
   - Amount, billing interval, start date (date picker), cap (open-ended OR N cycles)
   - For deferred starts (start date > today): card collection link will be sent to client
   - "Already activated externally" checkbox for backfill

   **Trade-in-Kind section** (visible if SOW has trade_credit_cents > 0):
   - Amount + description (editable)
   - Trigger (On acceptance | On milestone | On completion of payment)

   **Send invoices toggle:**
   - ☑ Send magic-link emails for fired invoices immediately (default)
   - ☐ Hold invoices for admin review (admin manually clicks Send later)

4. Click "Convert & Generate." Server runs the lifecycle (see §6).

5. Success toast lists: project ID, all generated invoice numbers + magic links, subscription IDs, TIK ledger if opened.

**Client POV (case-by-case):**

- **SOW-MOME case:** receives email today with magic link to INV-MOME-042426A ($250). Clicks Pay → Stripe Checkout → enters card → card saved to customer. 30 days later, receives email with magic link to INV-MOME-052426A ($250). Clicks Pay → Stripe offers saved card. May 1: card auto-charged $20, receipt emailed. Repeats monthly. After cycle 24, Stripe auto-cancels. No client action ever needed for hosting.

- **Hangtown case:** receives email for INV-HANG-…A ($2,000). Pays. Receipt fires. Admin marks Phase 1 complete → next $2K invoice fires automatically. Repeat. When third $2K is paid, Stripe webhook cascades → TIK ledger opens → admin notified by email.

---

## 5. Data model

### New tables

```sql
CREATE TABLE payment_schedules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sow_document_id  UUID NOT NULL REFERENCES sow_documents(id) ON DELETE CASCADE,
  project_id       UUID REFERENCES projects(id) ON DELETE SET NULL,
  total_cents      INT NOT NULL,
  locked_at        TIMESTAMPTZ,  -- set when first installment moves to paid; blocks edits
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_installments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id              UUID NOT NULL REFERENCES payment_schedules(id) ON DELETE CASCADE,
  sequence                 INT NOT NULL,
  amount_cents             INT NOT NULL,
  amount_paid_cents        INT NOT NULL DEFAULT 0,
  currency_type            TEXT NOT NULL CHECK (currency_type IN ('cash','tik')),
  expected_payment_method  TEXT CHECK (expected_payment_method IN ('card','check','wire','ach','unspecified')),
  trigger_type             TEXT NOT NULL CHECK (trigger_type IN ('on_acceptance','time','milestone','on_completion_of_payment')),
  trigger_date             DATE,
  trigger_milestone_id     UUID,  -- references project_phases.id (no FK; phases are JSONB)
  trigger_payment_id       UUID REFERENCES payment_installments(id) ON DELETE SET NULL,
  status                   TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','invoice_issued','partially_paid','paid','tik_open','cancelled')),
  invoice_id               UUID REFERENCES invoices(id) ON DELETE SET NULL,
  trade_credit_id          UUID REFERENCES trade_credits(id) ON DELETE SET NULL,
  description              TEXT,
  fired_at                 TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, sequence)
);

CREATE INDEX idx_payment_installments_schedule ON payment_installments(schedule_id);
CREATE INDEX idx_payment_installments_status ON payment_installments(status);
CREATE INDEX idx_payment_installments_trigger_time ON payment_installments(trigger_type, trigger_date) WHERE status = 'pending';
CREATE INDEX idx_payment_installments_trigger_milestone ON payment_installments(trigger_milestone_id) WHERE trigger_type = 'milestone' AND status = 'pending';
CREATE INDEX idx_payment_installments_trigger_payment ON payment_installments(trigger_payment_id) WHERE trigger_type = 'on_completion_of_payment' AND status = 'pending';
```

### Modified tables

- `sow_documents`: add `parent_sow_id UUID REFERENCES sow_documents(id)` for change orders.
- `subscriptions`: add `cycle_cap INT` (nullable; e.g. 24 = end after 24 cycles), `paused_until DATE` (nullable). `end_date` already exists.
- `invoices`: add `payment_installment_id UUID REFERENCES payment_installments(id)` so generated invoices link back to the row that fired them.
- `receipts`: extend `payment_method` CHECK constraint to include `'tik'`.

### Migration list

- `025a_payment_schedules.sql` — new tables + indexes
- `025b_sow_change_orders.sql` — `sow_documents.parent_sow_id`
- `025c_subscription_caps_and_pause.sql` — `cycle_cap`, `paused_until`
- `025d_invoice_installment_link.sql` — `invoices.payment_installment_id`
- `025e_receipts_tik_method.sql` — extend payment_method
- `APPLY-025-2026-04-24.sql` — bundled apply file (per CLAUDE.md convention)

---

## 6. API endpoints

### New admin endpoints

**`POST /api/admin/sow/[id]/convert`**
Body:
```ts
{
  acceptance: { signed_by: string, accepted_at: string, method: 'in_person'|'phone'|'email'|'magic_link' },
  payment_plan: Array<{
    sequence: number,
    amount_cents: number,
    currency_type: 'cash'|'tik',
    expected_payment_method?: 'card'|'check'|'wire'|'ach'|'unspecified',
    trigger_type: 'on_acceptance'|'time'|'milestone'|'on_completion_of_payment',
    trigger_date?: string,
    trigger_milestone_id?: string,
    trigger_payment_sequence?: number,  // resolved server-side to id after insert
    description?: string,
    already_paid?: { paid_date: string, paid_method: string, reference?: string },
  }>,
  subscriptions: Array<{
    deliverable_id: string,
    amount_cents: number,
    interval: 'month'|'quarter'|'year',
    start_date: string,
    cycle_cap?: number,  // null = open-ended
    already_activated?: boolean,
  }>,
  tik?: { amount_cents: number, description: string, trigger_type: 'on_acceptance'|'milestone'|'on_completion_of_payment', trigger_milestone_id?: string, trigger_payment_sequence?: number },
  send_invoices: boolean,
}
```
Server flow: see §7. Idempotent on already-converted SOWs (skips done steps). Returns conversion summary with all generated IDs.

**`PATCH /api/admin/payment-schedules/[id]`** — edit unpaid plan. Returns 409 if `locked_at` is set.

**`POST /api/admin/sow/[id]/change-order`** — body `{ title, scope_summary, payment_plan, ... }`. Creates new SOW with `parent_sow_id`; admin then converts via normal flow.

**`POST /api/admin/projects/[id]/phases/[phaseId]/complete`** — extends existing endpoint. After marking phase complete, scans `payment_installments` where `trigger_type='milestone' AND trigger_milestone_id=phaseId AND status='pending'` and fires each.

**`POST /api/admin/subscriptions/[id]/pause`** — body `{ duration_days, reason }`. Stripe `pause_collection` + push `end_date`.

**`POST /api/admin/subscriptions/[id]/resume`** — clears pause.

**`POST /api/admin/trade-credits/[id]/drawdown`** — body `{ amount_cents, description, delivered_on }`. Decrements `remaining_cents`, creates RCT receipt with `payment_method='tik'`. If overage, returns 409 with prompt; admin re-submits with `{ overage_action: 'cash_invoice'|'new_tik_ledger' }`.

### Modified endpoints

**`/invoice/[number]/[uuid]` (page)** — Pay button gating changed to `total_due_cents > 0 && status in ('sent','viewed') && stripe_enabled`. Drop the `stripe_payment_link_url` precondition. Button href points at `/api/invoices/public/[number]/pay?key=<uuid>`.

**`/api/invoices/public/[number]/pay` (existing)** — no code change; already lazy-creates Payment Link.

**`/api/admin/invoices/[id]/refund` (existing)** — verify partial-amount support. Update to never cascade to other plan rows or TIK.

### New cron

**`/api/cron/payment-triggers`** — runs daily at configured hour. Finds installments where `trigger_type='time' AND trigger_date<=today AND status='pending'`. Fires each via shared handler.

### Webhook event additions

`/api/webhooks/stripe` adds:
- `payment_intent.succeeded` / `checkout.session.completed`: after existing mark-paid, look up `payment_installments WHERE invoice_id=<paid invoice id>`. Update its status (`paid` if fully paid, `partially_paid` if not). If status reaches `paid`, find dependents (`trigger_payment_id=<this row id> AND status='pending'`) and fire them.
- `invoice.paid` (subscription cycles): existing handler. Add: ensure receipt is auto-created.
- `charge.refunded`: new handler. Update receipt totals, log refund row, no cascade.
- `customer.subscription.paused` / `resumed`: sync `paused_until`.

### New shared service module

`src/lib/payment-plans.ts` — keeps API routes thin. Exports:
- `convertSowToProject(sowId, body)` — orchestrator
- `firePaymentInstallment(installmentId, options)` — creates invoice or opens TIK ledger
- `generateInvoiceFromInstallment(installment, sow)` — invoice insert + line items + Stripe Payment Link if cash
- `cascadeOnPayment(installmentId)` — finds dependents, fires them
- `markInstallmentPaid(installmentId, amountPaidCents)` — updates row, returns new status

---

## 7. Server flow — `convertSowToProject`

1. Validate SOW exists. If status is `accepted`, run in idempotent mode (skip duplicates by checking what's already done). If `declined`/`void`, require `force=true` flag; log warning.
2. Validate `payment_plan` sum == SOW total cents (minus TIK if separate). 400 if mismatch.
3. Validate `tik.amount_cents` matches `sow.trade_credit_cents` (warn if drift; admin can override).
4. Begin transactional block (Supabase doesn't have true tx for multi-table writes; use compensating rollback per CLAUDE.md §19 pattern):
   1. Update SOW: `status='accepted'`, `accepted_at`, `accepted_signature`, `accepted_ip`.
   2. Insert `payment_schedules` row.
   3. Insert all `payment_installments` rows. Resolve `trigger_payment_sequence` → `trigger_payment_id` after insert.
   4. Mark prospect: `is_client=true`, `became_client_at=now()`.
   5. Insert `projects` row from SOW phases.
   6. For each subscription spec: ensure Stripe customer → create Stripe subscription with `trial_end` (for future starts) + `cancel_at` (for capped) → insert DSIG `subscriptions` row with stripe IDs.
   7. For each TIK spec with trigger `on_acceptance`: open `trade_credits` row immediately. Otherwise leave for later cascade.
   8. For each `payment_installments` row with `trigger_type='on_acceptance' AND NOT already_paid`: fire it (create invoice, Stripe Payment Link, optionally send magic-link email).
   9. For each `already_paid` installment: create invoice + immediately mark paid + create receipt (no Stripe interaction).
5. On any step failure: roll back DB inserts (delete by id), best-effort cleanup of any Stripe objects created (log if cleanup fails), return 500 with diagnostic.
6. Return summary: `{ project_id, payment_schedule_id, installments: [...], subscriptions: [...], trade_credit_ids: [...], invoices_sent: [...] }`.

---

## 8. Stripe wiring

### Setup (one-time)

1. Add env vars to Vercel: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`.
2. Stripe Dashboard → Webhooks → add endpoint `https://demandsignals.co/api/webhooks/stripe`. Subscribe events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `charge.refunded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.paused`
   - `customer.subscription.resumed`
3. Copy signing secret → set as `STRIPE_WEBHOOK_SECRET`.
4. In Supabase: insert `quote_config` row `(key='stripe_enabled', value='true')`.
5. Test mode rollout: complete §11 test plan, then swap to live keys.

### One-off invoice payment

- `ensurePaymentLink()` (existing) modified to set `payment_intent_data.setup_future_usage='off_session'` so card is saved on customer for reuse.
- Magic-link page: drop precondition; render Pay button always when invoice is outstanding cash and Stripe is enabled. Button href → `/api/invoices/public/[number]/pay?key=<uuid>` (existing redirect endpoint).

### Future-start subscription (e.g. May 1 hosting)

- `stripe.subscriptions.create({ customer, items, trial_end: <unix May 1>, proration_behavior: 'none' })`. Trial bridges from today to start; first charge fires May 1.
- For card collection: at conversion time, if subscription has future start AND no card on customer, generate Stripe Customer Portal session URL and email magic link to client: "Add payment method for [client] hosting subscription starting May 1."

### Capped-term subscription

- `stripe.subscriptions.create({ ..., cancel_at: <unix end_date> })`. Stripe auto-cancels.
- Compute `end_date = start + (cycle_cap × interval)` server-side. Store both `cycle_cap` and `end_date` on DSIG row.

### Pause / resume

- Pause: `stripe.subscriptions.update({ pause_collection: { behavior: 'void' } })`. Set DSIG `paused_until`. Push `end_date` forward by pause duration. Push `cancel_at` correspondingly.
- Resume: `stripe.subscriptions.update({ pause_collection: '' })`. Clear `paused_until`.

### Receipt auto-issuance

- Existing `markInvoicePaidFromStripe()` already triggers RCT creation via mark-paid path (CLAUDE.md §20). Verify end-to-end during test; add receipt insert if missing.
- TIK drawdowns issue receipts via `/api/admin/trade-credits/[id]/drawdown` with `payment_method='tik'`.

### Idempotency keys

Existing pattern (`dsig_<scope>_<id>_v1`) extended:
- Customer: `dsig_customer_<prospect_id>_v1`
- Payment Link: `dsig_payment_link_for_invoice_<invoice_id>_v1`
- Subscription: `dsig_subscription_<dsig_subscription_id>_v1` (NEW)
- Refund: `dsig_refund_<receipt_id>_<amount_cents>_v1` (NEW; amount in key so partial refunds get distinct keys)

### Cascade implementation (Hangtown trigger)

On `payment_intent.succeeded` or `checkout.session.completed`:
1. `markInvoicePaidFromStripe()` — existing.
2. Look up `payment_installments WHERE invoice_id=<paid invoice id>`.
3. Update installment: `amount_paid_cents += payment_amount`, status accordingly (`paid` if `amount_paid_cents >= amount_cents`, else `partially_paid`).
4. If status reached `paid`: find dependents (`trigger_payment_id=<this row id> AND status='pending'`), fire each.
5. Send admin notification email summarizing the cascade ("Cash payment received from [client], TIK ledger of $X opened").

### Failure handling

- All Stripe API calls in try/catch. On failure, DSIG record stays in `pending` with `error_message`, surfaced in admin UI with "Retry Stripe" button.
- Webhook handler returns 200 even on internal error (Stripe retries are noisy). Errors logged to `stripe_events.error_message`.

---

## 9. Admin UI changes

### `/admin/sow/[id]`
- Always-visible "Convert SOW to Project" button (label varies by status, see §3).
- Clicking opens conversion modal (see §4).

### `/admin/projects/[id]`
- "Outstanding Obligations" panel: shows TIK ledger remaining + each pending payment installment with trigger description.
- "Mark Phase Complete" already exists; behavior extended to fire milestone-triggered installments. UI shows "This will fire $X invoice for [client]" preview before confirming.

### `/admin/subscriptions/[id]`
- Pause/Resume buttons.
- Display `cycle_cap` + `end_date` + cycles remaining if capped.

### `/admin/trade-credits/[id]`
- Drawdown form. Auto-issues receipt. Overage handling per §3.

### `/admin/payment-schedules/[id]` (new page)
- View installments, edit if not locked, see fire history.

### Magic-link `/invoice/[number]/[uuid]`
- Pay button always renders for outstanding cash invoices (when Stripe enabled).

---

## 10. Migration of existing code

- `src/lib/stripe-sync.ts` — add `setup_future_usage` to Payment Link creation. Add helpers for subscription create with trial_end + cancel_at.
- `src/app/api/sow/public/[number]/accept/route.ts` — refactor to call shared `convertSowToProject()` with synthesized payment plan (single installment for full deposit) so the public Accept button and admin Convert button share the same code path. This avoids two implementations of the lifecycle drifting.
- `src/lib/retainer.ts` — `activateRetainer()` continues to work for the /quote flow; it becomes a thin wrapper that builds the subscription spec and hands off to the shared subscription-creation helper.
- Existing `subscriptions` table columns already include `stripe_subscription_id`, `stripe_customer_id` — no schema changes for Stripe linkage.

---

## 11. Test plan

In Stripe test mode:

1. Create test prospect with `client_code='TEST'`, name "Test Client LLC".
2. Create test SOW: 2 phases, $500 build, $20/mo × 24 hosting starting +7 days, $100 TIK with trigger `on_completion_of_payment(installment 2)`.
3. Convert SOW with payment plan: 2× $250 cash, installment 1 = on_acceptance, installment 2 = on date (+30d).
   - Expect: 2 cash installments inserted; 1 invoice fired (sequence 1); 1 invoice pending (sequence 2); 1 Stripe subscription created with `trial_end=+7d` and `cancel_at=trial_end+24mo`; TIK row in `pending`; project created; prospect marked client.
4. Pay installment 1 with Stripe test card 4242 4242 4242 4242.
   - Expect: webhook fires; invoice marked paid; receipt RCT-TEST-…A issued; installment status → paid; card saved to customer.
5. Use Stripe test clock to advance 30 days. Run `/api/cron/payment-triggers`.
   - Expect: installment 2 fires; invoice INV-TEST-…B created; magic-link email sent.
6. Pay installment 2.
   - Expect: webhook fires; cascade — TIK ledger opens for $100; admin notified.
7. Advance test clock to subscription start + 1 cycle.
   - Expect: Stripe charges $20 automatically; webhook fires; receipt issued.
8. Admin marks $50 of TIK delivered.
   - Expect: drawdown recorded; receipt RCT-TEST-…D issued with `payment_method='tik'`; TIK remaining = $50.
9. Admin refunds $200 of installment 1.
   - Expect: Stripe refund processed; refund record created; no cascade; TIK ledger unchanged; subscription unchanged.
10. Admin pauses subscription for 30 days.
    - Expect: Stripe `pause_collection` set; `paused_until` updated; `end_date` pushed +30d; `cancel_at` pushed +30d.
11. Resume subscription.
    - Expect: pause cleared; subscription resumes next cycle.
12. Admin completes Phase 2 of project.
    - Expect: any milestone-triggered installments fire (none in this test scenario, but log message confirms scan ran).
13. Issue change order: $200 additional scope, single cash payment on completion of phase 2.
    - Expect: mini-SOW created with `parent_sow_id`; convert mini-SOW → new payment installment attached to same project; total project value updated.

All 13 steps must pass before flipping live mode.

---

## 12. Out of scope for v1

Explicitly deferred (per §3):
- Compound triggers (date OR milestone)
- Refund cascades
- TIK over-delivery without per-event admin marking
- Subscription mid-cycle plan change

Also deferred:
- ACH / bank transfer Stripe payment methods (card only for v1; Stripe Payment Link can be configured to accept ACH later)
- Invoice late-fee Stripe automation (existing late_fee fields stay manual)
- Stripe Tax (no tax collected for now; agency services exempt in California)
- Multi-currency (USD only)
- Partial refund vs full refund UX distinction (single Refund button + amount field handles both)

---

## 13. Risks

- **Stripe API version drift.** SDK pinned in package.json; appInfo set; we don't pass `apiVersion` to constructor (lets SDK use its pinned default). Per CLAUDE.md §12 lessons.
- **Card-not-on-file at deferred subscription start.** Mitigation: send "add payment method" magic link at conversion time; cron checks 3 days before trial_end and re-sends if no payment method attached.
- **Webhook delivery delays.** Stripe events can arrive out of order. The cascade logic is idempotent (checks status before firing); duplicate events caught by `stripe_events` UNIQUE constraint.
- **Compensating rollback gaps.** Stripe object cleanup on conversion failure is best-effort. Some orphan Stripe customers/products may accumulate; manual cleanup periodically. Acceptable.
- **Schema cache.** Per CLAUDE.md §12, after migration apply, wait 30s before testing.
- **Backfill correctness.** Historical clients (Hangtown) entered via "already paid externally" must be entered carefully. Mistakes are recoverable but messy. Consider building a backfill UI wizard separately if many historical clients need entry.

---

## 14. Success criteria

The design is shipped when:
- SOW-MOME-042426A can be converted by Hunter clicking one button, generating both installment invoices, sending the first one, scheduling the second, creating the Stripe subscription with May 1 start + 24-cycle cap, and opening the $1,275 TIK.
- Hangtown can be backfilled via the same flow with installments 1 and 2 marked already-paid, installment 3 pending, TIK row pending its cascade trigger, and the May 1 hosting subscription created.
- A client receiving any magic-link cash invoice can click Pay, enter card on Stripe, and have their card saved for future use.
- Stripe webhooks correctly mark invoices paid, issue receipts, and fire cascade triggers without admin intervention.
- All 13 test plan steps pass in Stripe test mode.
