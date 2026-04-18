# Invoicing v2 — Morning Activation Checklist

**Written:** 2026-04-18 pre-dawn while Hunter slept
**For:** Hunter's 5:45am wake-up before client appointment

---

## What shipped overnight

**~60 files, 30+ API routes, 15 migrations, full admin UI, public viewers, Stripe
integration, subscriptions, SOW PDFs, SMS + email delivery — all committed on
master, build passes (905 static pages + all new dynamic routes).**

Commit range since your checkpoint: `9d2a9d7` → current HEAD.

Not pushed yet — waiting for your approval before Vercel auto-deploys.

---

## Your morning checklist (~15 minutes)

### Step 1 — Apply migrations (~3 minutes)

1. Open Supabase dashboard → SQL Editor
2. Open a new query
3. Paste the **entire contents** of
   `supabase/migrations/APPLY-ALL-2026-04-18.sql`
4. Click **Run**
5. Expect: "Success. No rows returned."
6. Verify with these queries (run one at a time, all should show results):

```sql
-- 1. New invoices columns exist (expect 15+ new column rows)
SELECT column_name FROM information_schema.columns
  WHERE table_name='invoices'
    AND column_name IN ('public_uuid','kind','stripe_invoice_id','subscription_id','auto_generated','pdf_storage_path','category_hint');
-- Expect: 7 rows

-- 2. New tables exist (expect 6 rows)
SELECT table_name FROM information_schema.tables
  WHERE table_name IN ('invoice_delivery_log','invoice_email_log','stripe_events','subscription_plans','subscriptions','sow_documents');
-- Expect: 6 rows

-- 3. Config flags
SELECT key, value FROM quote_config WHERE key LIKE '%_enabled' ORDER BY key;
-- Expect: 5+ rows (automated_invoicing=true, stripe=false, sms=false, email=false, cron=false)

-- 4. generate_sow_number works
SELECT generate_sow_number();
-- Expect: 'SOW-2026-0001'
-- IMPORTANT: don't run this multiple times unless you want to burn sequence numbers.
-- Or run it and ROLLBACK; the sequence still advances.

-- 5. Existing RLS still passes (back in your terminal)
-- node scripts/test-quote-rls.mjs   (expect 25/25)
```

### Step 2 — Add the 2 missing Stripe env vars (~5 minutes)

You already have `STRIPE_API_KEY` in Vercel. Two more are needed:

**`STRIPE_WEBHOOK_SECRET`:**
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://demandsignals.co/api/webhooks/stripe`
3. Events to send: select these 6:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Click **Add endpoint**
5. On the endpoint detail page → **Reveal signing secret** (starts `whsec_`)
6. Copy it
7. Vercel → `demandsignals-next` → Settings → Environment Variables → Add:
   - `STRIPE_WEBHOOK_SECRET=<paste>`
   - Environment: all three (Production, Preview, Development)

**`STRIPE_PUBLISHABLE_KEY`:** (optional for v1 — only needed for future client-side Stripe.js flows)
1. Stripe Dashboard → Developers → API keys → **Publishable key** (starts `pk_`)
2. Vercel add env var `STRIPE_PUBLISHABLE_KEY=<paste>`

**Flip stripe_enabled to true:**
Back in Supabase SQL Editor:
```sql
UPDATE quote_config SET value = 'true' WHERE key = 'stripe_enabled';
```

### Step 3 — Push + let Vercel deploy (~3 minutes)

```bash
cd D:/CLAUDE/demandsignals-next
git log --oneline | head -20   # see all new commits
git push origin master
```

Vercel auto-deploys. Watch for green check in Vercel dashboard (~2 min build).

Verify post-deploy:
- `https://demandsignals.co/admin/invoices` → loads, empty list
- `https://demandsignals.co/admin/sow` → loads, empty list
- `https://demandsignals.co/admin/subscription-plans` → loads, empty list

### Step 4 — Smoke test (~5 minutes)

**Test 1: Create an ad-hoc invoice**
1. `/admin/invoices/new`
2. Prospect: pick any existing one
3. Kind: Business
4. Line items: `Consulting services`, qty 1, $500
5. Click **Save & Send**
6. Modal shows public URL → click Copy
7. Paste URL in incognito browser — see branded invoice page
8. Click **Download PDF** — PDF downloads (rendered via `pdf.demandsignals.co` — live)
9. Back in admin, verify status = `sent`

**Test 2: Stripe payment flow**
1. On the test invoice detail page, click **Payment Link**
2. Opens Stripe hosted page with pay form
3. Use Stripe test card: `4242 4242 4242 4242`, any future date, any CVC
4. Complete payment
5. Stripe webhook fires → your webhook handler → invoice flips to `paid`
6. Refresh admin invoice detail — status = `paid`, paid_method = `stripe`

**Test 3: Create + send an SOW**
1. `/admin/sow/new`
2. Prospect, title, scope summary, 1-2 deliverables, 1-2 timeline phases, total $10000, deposit 25%
3. Save & Send
4. Open public URL in incognito
5. Click **Accept & Pay Deposit** → signature modal
6. Type a name, click **Accept & Continue**
7. Redirects to the auto-generated deposit invoice ($2,500 in this case)
8. Back in admin: SOW status=accepted, deposit invoice linked

**Test 4: Restaurant Rule $0 invoice (optional)**
1. Open a quote session on `/admin/quotes/[id]` that has phone_verified + email
2. Click 🍽️ **Restaurant Rule** button
3. Redirected to auto-generated draft with 3 research line items + 100% discount = $0
4. Click **Send** → auto-transitions to `paid` (zero-balance auto-pay rule)

---

## What's deferred / needs Hunter follow-up later

### Phase 2a — SMS delivery (optional, can flip anytime after A2P approval)

**To enable SMS now in test mode (your cell only):**

Vercel env vars:
- `SMS_TEST_MODE=true`
- `SMS_TEST_ALLOWLIST=+19165422423` (your cell)

Then:
```sql
UPDATE quote_config SET value = 'true' WHERE key = 'sms_delivery_enabled';
```

Now the **SMS button** on invoice detail works — but only sends to allowlisted cells.

**To enable SMS production (requires A2P Transactional approval):**
- Submit A2P Transactional campaign in Twilio console
- Wait ~1 week for approval
- Remove `SMS_TEST_MODE` or set to `false`
- Patch `/quote` consent copy (line 1088 in `QuotePageClient.tsx`) to include
  "invoices" and "appointments" explicitly

### Phase 3 — Email delivery (needs SMTP password)

1. Generate Gmail app password for DemandSignals@gmail.com
   - https://myaccount.google.com/apppasswords (requires 2FA enabled)
2. Vercel env var: `SMTP_PASS=<app password>`
   (SMTP_HOST/SMTP_PORT/SMTP_USER/CONTACT_EMAIL already set)
3. Flip config:
   ```sql
   UPDATE quote_config SET value = 'true' WHERE key = 'email_delivery_enabled';
   ```
4. **Email button** on invoice detail now sends branded HTML + PDF attachment,
   BCC'd to DemandSignals@gmail.com.

### Phase 4 — Subscription cycle cron (needs plans + at least one subscription)

1. Create subscription plan(s): `/admin/subscription-plans`
   - Monthly Retainer — Starter: $800/mo
   - Monthly Retainer — Pro: $2000/mo
   - etc.
2. For each plan, create it in **Stripe dashboard** too (Products → Create):
   - Copy the `price_id` (starts `price_`) back into DSIG plan's `stripe_price_id` field
3. Create a subscription: `/admin/subscriptions/new`
   - Pick prospect + plan
   - Check "Also create in Stripe" (requires stripe_price_id on plan)
4. Enable cron:
   ```sql
   UPDATE quote_config SET value = 'true' WHERE key = 'subscription_cycle_cron_enabled';
   ```
5. Add to `vercel.json` (create/modify at repo root):
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/subscription-cycles",
         "schedule": "0 9 * * *"
       }
     ]
   }
   ```
6. Vercel cron needs `CRON_SECRET` env var for auth (you already have it from existing cron routes).
7. Push + deploy. Cron fires daily at 9am UTC (4am PT) — generates cycle invoices
   for every subscription where `next_invoice_date <= today`.

---

## Known limitations / things to watch

1. **Stripe proration** — When a customer upgrades/downgrades mid-cycle, Stripe
   handles proration automatically. Our cycle cron generates a fresh DSIG invoice
   per cycle; it does NOT try to replicate Stripe's proration logic. If this becomes
   an issue, talk to me — we can wire it up.

2. **Refunds** — No UI. Issue refunds in Stripe dashboard. The webhook will fire
   an event we currently don't handle; add `charge.refunded` to the handler if
   you need the DSIG invoice to flip to `void` automatically.

3. **Customer portal** — Stripe has a free hosted portal at
   `billing.stripe.com/p/login/<your-portal-id>`. You can send clients there to
   update cards, view invoices, cancel subscriptions. Not wired into our admin
   UI yet — they access it via link in Stripe's auto-sent payment confirmation
   emails.

4. **PDF render latency** — First render per session cold-starts the Python
   function (~1.5s). Subsequent renders are <500ms. Users see a brief loader.
   Acceptable for v1.

5. **Void + Re-issue on subscription_cycle invoices** — works technically, but
   these invoices are supposed to be immutable records of Stripe charges. Don't
   void them unless you really mean it. The Stripe side isn't affected by our
   void — that requires issuing a refund in Stripe.

6. **Prospect deletion** — If you delete a prospect with outstanding invoices,
   the invoices stay (prospect_id becomes null via ON DELETE SET NULL). They
   still show up in the list under "—" as the client.

---

## File summary

### Migrations (15 files in supabase/migrations/)
011a-011i, 012a-012d, 013a-013b, plus APPLY-ALL combined.

### Libraries (7 files in src/lib/)
- `invoice-types.ts` — shared TS types
- `invoice-pdf/payload.ts` + `render.ts` — invoice → PDF service
- `sow-pdf/payload.ts` + `render.ts` — SOW → PDF service
- `stripe-client.ts` — Stripe SDK singleton + idempotency
- `stripe-sync.ts` — ensureCustomer / ensurePaymentLink / markPaid
- `twilio-sms.ts` — SMS with test-allowlist
- `invoice-email.ts` — Nodemailer + HTML composer

### API routes (30+ in src/app/api/)
- Admin: 13 invoice routes + 4 SOW + 4 subscription + 1 plans
- Public: 3 invoice + 3 SOW
- Webhooks: 1 Stripe
- Cron: 1 subscription-cycles

### Admin UI (10 pages)
- `/admin/invoices/` (list/new/[id])
- `/admin/subscriptions/` (list/new/[id])
- `/admin/subscription-plans/`
- `/admin/sow/` (list/new/[id])

### Public UI (2 pages)
- `/invoice/[number]/[uuid]/page.tsx`
- `/sow/[number]/[uuid]/page.tsx` + SowAcceptClient.tsx

### Sidebar + integrations
- `admin-sidebar.tsx` — new Finance group
- `/admin/quotes/[id]` — Create Invoice + Create SOW + Restaurant Rule buttons
- `/admin/prospects/[id]` — Documents section

### dsig-pdf-service repo
- `dsig_pdf/docs/sow.py` — new doc_type (already deployed to pdf.demandsignals.co,
  commit e354836)

---

## Emergency rollback (if something's on fire)

```bash
cd D:/CLAUDE/demandsignals-next
git log --oneline | head  # find the commit before the bad one
git revert <bad-sha>
git push origin master
```

All migrations are additive with IF NOT EXISTS — no rollback SQL needed; they're
safe-idempotent.

To halt all invoicing automation instantly:
```sql
UPDATE quote_config SET value = 'false'
  WHERE key IN ('automated_invoicing_enabled','stripe_enabled','sms_delivery_enabled','email_delivery_enabled','subscription_cycle_cron_enabled');
```

---

**That's it. Go get 'em.**

— Your sleepy Opus build team
