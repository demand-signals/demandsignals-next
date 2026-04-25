# READY-TO-APPLY checklist — Stripe Plans A + B + C

All code is implemented and committed locally on `master` (commits `12c7dca` through `f65ed4a`). **Not yet pushed.** Do these steps to deploy.

---

## 1. Apply the Supabase migration

Open Supabase SQL Editor for project `uoekjqkawssbskfkziwz`. Open the file:
```
supabase/migrations/APPLY-025-2026-04-24.sql
```
Paste the entire contents into the SQL Editor and click Run.

**What it does:**
- Creates `payment_schedules` + `payment_installments` tables (Plan B foundation)
- Adds `sow_documents.parent_sow_id` (change orders)
- Adds `invoices.payment_installment_id` (webhook cascade)
- Adds `subscriptions.cycle_cap` + `paused_until` (Plan C)
- Extends `receipts.payment_method` enum to include `'tik'`

**Idempotent** — safe to re-run.

**Verify:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('payment_schedules', 'payment_installments');
-- Expected: 2 rows

SELECT column_name FROM information_schema.columns
WHERE table_name = 'subscriptions'
  AND column_name IN ('cycle_cap', 'paused_until');
-- Expected: 2 rows
```

**Wait 30 seconds after applying** for the PostgREST schema cache to refresh (per CLAUDE.md §12).

---

## 2. Set the Stripe kill-switch flag

In Supabase SQL Editor:
```sql
INSERT INTO quote_config (key, value) VALUES ('stripe_enabled', 'true')
ON CONFLICT (key) DO UPDATE SET value = 'true';
```

Verify:
```sql
SELECT key, value FROM quote_config WHERE key = 'stripe_enabled';
-- Expected: one row, value = 'true'
```

---

## 3. Verify Vercel env vars

You confirmed the following are already set:
- `STRIPE_SECRET_KEY` ✓
- `STRIPE_PUBLISHABLE_KEY` ✓
- `STRIPE_SNAPSHOT_SIGNING_SECRET` (or `STRIPE_WEBHOOK_SECRET`) ✓
- `STRIPE_THIN_SIGNING_SECRET` ✓
- `STRIPE_SNAPSHOT_PAYLOAD` (env var name only, not used by code today)

The webhook handler reads `STRIPE_SNAPSHOT_SIGNING_SECRET` first, falling back to `STRIPE_WEBHOOK_SECRET`. Both names work.

Also need: `CRON_SECRET` (any random string) for the new payment-triggers cron. Verify it's set; if not, add it.

---

## 4. Configure Stripe webhook endpoint

In Stripe Dashboard → Developers → Webhooks:

If an endpoint at `https://demandsignals.co/api/webhooks/stripe` already exists, **update** it. Otherwise **add** it.

**URL:** `https://demandsignals.co/api/webhooks/stripe`

**Events to listen for** (select these explicitly):
- `checkout.session.completed`
- `payment_intent.succeeded`
- `invoice.paid`
- `invoice.payment_failed`
- `charge.refunded`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`
- `customer.subscription.resumed`

**Payload type:** Snapshot (the default). Code expects snapshot payloads.

Copy the signing secret if it's a new endpoint and confirm it matches what's in `STRIPE_SNAPSHOT_SIGNING_SECRET` in Vercel.

---

## 5. Push the code

```bash
cd "D:\CLAUDE\demandsignals-next"
git push origin master
```

Use the OAuth token method per CLAUDE.md §4 if needed. Vercel auto-deploys on push.

After deploy completes, watch Vercel logs for errors and check:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://demandsignals.co
# Expected: 200
```

---

## 6. Smoke test — end-to-end

### Test A — Magic-link Pay button (Plan A)

1. Find any existing invoice in `/admin/invoices` with status `sent` or `viewed` and total > $0.
2. Open the magic-link URL `https://demandsignals.co/invoice/INV-…/<uuid>` in incognito.
3. Verify orange **Pay $X.XX →** button renders (in both the payment card section AND the action row).
4. (Optional) Click → should 302 to a Stripe-hosted Payment Link page (`buy.stripe.com/...`).
5. (Optional) Pay with test card `4242 4242 4242 4242`. After redirect:
   - Invoice status → `paid` ✓
   - Receipt `RCT-…` appears in `/admin/receipts` ✓
   - Stripe customer in dashboard shows saved card ✓

### Test B — SOW conversion (Plans B + C)

1. Open `/admin/sow` and pick a saved SOW for a prospect with a `client_code` (e.g. SOW-MOME-042426A).
2. On the SOW detail page (`/admin/sow/[id]`) click the orange **"Convert SOW to Project"** button in the sticky header.
3. In the modal:
   - **Acceptance**: defaults are fine (in-person, today)
   - **TIK**: if SOW has trade_credit_cents, it auto-populates. For SOW-MOME, set $1,275.00 with description "Marketing services owed by client", trigger `on_acceptance`
   - **Subscriptions**: auto-populated from any monthly/quarterly/annual deliverables. For SOW-MOME, add manually if needed: $20.00, monthly, start date = May 1 2026, ☑ Cap at 24 cycles
   - **Payment plan**: click "2 installments (30d)" preset → $250 today + $250 in 30 days
   - Sum check should be ✓ green
   - ☑ Send invoices
4. Click **Convert & Generate**. Alert pops up listing project ID, invoice numbers, subscriptions, TIK ledger.

### Test C — Verify side effects

After conversion:
- `/admin/sow/[id]` → status now `accepted`
- `/admin/projects` → new project row, click in
- `/admin/projects/[id]` → "Outstanding Obligations" panel shows pending installments + TIK ledger
- `/admin/invoices` → `INV-MOME-042426A` in `sent` status, $250
- `/admin/payment-schedules/[id]` (find via Outstanding Obligations) → 2 installments, #1 `invoice_issued`, #2 `pending` with trigger_date in 30 days
- `/admin/subscriptions` → new subscription, status `trialing`, `cycle_cap=24`
- Stripe dashboard → customer has subscription with `trial_end` = May 1 2026 and `cancel_at` = May 1 2028
- For TIK row: pre-existing `/admin/trade-credits/[id]` page (or query via SQL) shows `outstanding`, $1,275

### Test D — Pay installment 1 + cascade

1. Open `https://demandsignals.co/invoice/INV-MOME-042426A/<uuid>` (find UUID via admin invoice detail)
2. Click Pay → Stripe → pay with test card
3. After redirect:
   - Invoice paid ✓
   - Receipt issued ✓
   - `payment_installments` row #1 → `paid`
   - `payment_schedules.locked_at` set
   - For SOW-MOME, no on_completion_of_payment dependents, so no cascade. To test cascade: set up a TIK row with trigger_payment_sequence pointing at a cash row, then pay that cash row.

### Test E — Pause/Resume

On `/admin/subscriptions/[id]`:
1. Set "Pause for [30] days, reason 'Testing'", click Pause Subscription
2. Verify Stripe subscription has `pause_collection.behavior='void'`
3. Verify DSIG `paused_until` populated, `end_date` pushed +30 days
4. Click Resume Subscription
5. Verify Stripe pause cleared, DSIG `paused_until=null`, status back to `active`

### Test F — Customer Portal magic link

On `/admin/subscriptions/[id]`, click "Generate Add Payment Method link". URL appears in alert + copied to clipboard. Open in incognito → verify Stripe Customer Portal renders.

---

## 7. If something goes wrong

### Build fails on Vercel
- Check Vercel deploy logs
- Most likely: a TypeScript or runtime config issue I missed locally (Windows TS check passed but Linux Vercel build differs)
- Roll back: `git revert <commit-sha>` and push

### Webhook signature fails
- Check `STRIPE_SNAPSHOT_SIGNING_SECRET` matches the secret in the Stripe webhook config
- Stripe Dashboard → Webhooks → click endpoint → "Reveal signing secret"

### Receipt not auto-created on payment
- Check `stripe_events` table for the event row
- Look at `processing_result` and `error_message` columns
- Most likely cause: prospect has no `client_code` set, so `allocateDocNumber` failed and receipt has `PENDING-…` number

### TIK overage prompt loops
- The `/api/admin/trade-credits/[id]/drawdown` endpoint requires re-submission with `overage_action` field. The pre-existing `/admin/trade-credits/[id]/page.tsx` may not handle this — if so, use the alternative endpoint `/drawdowns` (plural) for non-overage drawdowns until UI is updated.

### Schema cache stale
- Wait 60 seconds and retry
- Or hard-refresh Supabase SQL Editor tab

---

## 8. Post-deployment cleanup

- [ ] Update Hangtown's existing engagement using "Re-run Project Setup" on its SOW (SOW-HANG-…) with already_paid checkboxes for the first two $2K installments
- [ ] Schedule a real client to be the first live test (NOT the SOW-MOME test data) and walk through the flow
- [ ] Watch Stripe events log for the first 24 hours after first real payment

---

## Summary of code commits delivered

```
f65ed4a feat(subscriptions): pause/resume/customer-portal endpoints + action panel
8cd711a feat(admin): payment-schedule view + change-order endpoint + project Outstanding Obligations
183b775 feat(admin): SOW Convert modal + always-visible Convert button
7abdd8a feat(api): payment-triggers cron + TIK drawdown endpoint
cd337ca feat(api): convert endpoint + webhook cascade + phase-complete fires installments
72fb97b feat(payment-plans): orchestrator + types + Stripe subscription helpers
03629d9 feat(db): migrations 025a/b/d/e + bundled APPLY-025 (payment plans)
ea323b0 feat(stripe): auto-issue RCT receipts on Stripe payment webhooks
efe4741 feat(stripe): save card on Payment Link payment for future use
126a82c fix(invoice): always render Pay button for outstanding cash invoices
12c7dca feat(invoice): expose stripe_enabled flag in public invoice API
0c7b13a docs(stripe): spec + 3 implementation plans for Stripe payment integration
```

12 commits. ~6,000 lines added across migrations, libs, endpoints, UI components, and docs.

All TypeScript builds clean (`npx tsc --noEmit` passes).
