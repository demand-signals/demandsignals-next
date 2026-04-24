# When Something Breaks — Emergency Index

**Owner:** Hunter (DSIG)
**Last updated:** 2026-04-24
**Scope:** Quick-reference index for emergencies. Start here, then jump to the relevant runbook.

> **The one thing to know first:**
> `git log --oneline -20` + `MEMORY.md` shipping log. Most 2am crises are caused by something that shipped in the last few hours. Read the recent commits before doing anything else.

---

## Before anything else

```bash
cd D:/CLAUDE/demandsignals-next

# 1. What shipped recently?
git log --oneline -20

# 2. Is the site actually down (not just one route)?
curl -s -o /dev/null -w "%{http_code}" https://demandsignals.co
# 200 = site up. 5xx or timeout = site down.

# 3. What's Vercel showing?
# → https://vercel.com/demand-signals/demandsignals-next/deployments
# Check the most recent deployment for build errors or function logs.
```

---

## Symptom → runbook index

### Site returning 5xx or not loading

1. Check Vercel build logs — may be a build error from the last push
2. Check Supabase status — https://status.supabase.com
3. Check Vercel status — https://vercel-status.com
4. If build failed: fix the TypeScript/Next.js error, `npm run build` locally, push
5. If build succeeded but runtime 500s: check Vercel function logs for the specific route
6. **Rollback:** `git revert HEAD` + push (never force-push master)
7. Runbook: `environment-and-deploy.md`

---

### `/admin` redirects to login when I'm signed in

1. Check `admin_users` table has your email:
   ```sql
   SELECT email FROM admin_users;
   ```
2. If empty: first-time setup — insert your email. See `admin-portal.md` → "First sign-in procedure"
3. If email exists but still failing: check Supabase Auth settings, OAuth callback URL, and `NEXT_PUBLIC_SUPABASE_URL`
4. Runbook: `admin-portal.md`

---

### PDF route returns 500

**Triage order:**
1. Is it a cold-start timeout (check if it works on retry ~10 seconds later)? → If yes, Vercel function timeout; consider Pro plan or `maxDuration = 60`
2. Is `serverExternalPackages` intact in `next.config.ts`? → must include `puppeteer-core` and `@sparticuz/chromium`
3. Is the GitHub binary URL reachable? `curl -I https://github.com/Sparticuz/chromium/releases/download/v147.0.2/chromium-v147.0.2-pack.x64.tar`
4. If binary URL down: upload to R2 and update `src/lib/pdf/chromium.ts` — see R2 fallback plan
5. Runbook: `pdf-pipeline.md`

---

### "column X does not exist" from an API route

A migration was not applied to the Supabase project.

1. Check which column is missing from the error message
2. Find which migration file adds it (search `supabase/migrations/`)
3. Apply the APPLY bundle that contains that migration
4. Wait 30 seconds for PostgREST schema cache to refresh
5. Runbook: `supabase-migrations.md`

---

### Duplicate-key error on invoice/SOW/receipt creation

`document_numbers` has a collision — very rare.

1. Check: `SELECT * FROM document_numbers WHERE doc_number = '<number_in_error>';`
2. If the ref_id points to a deleted row: stale entry. Compute the next suffix manually
3. Runbook: `document-numbering.md` → "Emergency procedures"

---

### Invoice shows PENDING- in the admin list

`allocateDocNumber()` failed mid-create. The invoice exists but has a temporary PENDING- number.

```sql
SELECT id, invoice_number FROM invoices WHERE invoice_number LIKE 'PENDING-%' ORDER BY created_at DESC;
SELECT generate_invoice_number();  -- get a legacy number
UPDATE invoices SET invoice_number = '<result>' WHERE id = '<id>';
```

Runbook: `document-numbering.md`

---

### Client can't accept their SOW

1. Check SOW status: `SELECT status FROM sow_documents WHERE sow_number = '...'`
2. If `draft` → admin forgot to send. Click Send first
3. If `accepted` → already accepted. Find deposit invoice URL and send to client
4. If UUID mismatch → client has wrong link. Re-copy from admin UI
5. Runbook: `sow-lifecycle.md` → "Emergency procedures"

---

### Deposit invoice not created after SOW accept

Accept route wraps invoice creation in compensating rollback. If it rolled back:
- SOW status will be `sent` (not `accepted`) — retry accept from client
- If SOW is `accepted` but `deposit_invoice_id` is null — partial commit, create invoice manually

Runbook: `sow-lifecycle.md` → "Accept returned 500"

---

### Stripe payment completed but invoice still shows `sent`

Stripe webhook didn't fire or fired with an error.

1. Check Stripe Dashboard → Developers → Webhooks → recent deliveries
2. Look for the `payment_intent.succeeded` event and its response
3. If 500: check Vercel logs for `/api/webhooks/stripe`
4. Manual fix: `POST /api/admin/invoices/[id]/mark-paid` with the Stripe charge ID
5. Runbook: `receipts-and-payments.md`; also `invoicing-morning-2026-04-18.md` → Stripe webhook setup

---

### Invoice balance math is wrong

Canonical formula: `total_due_cents - SUM(receipts.amount_cents)`.

```sql
SELECT i.invoice_number, i.total_due_cents,
  COALESCE(SUM(r.amount_cents),0) AS paid,
  i.total_due_cents - COALESCE(SUM(r.amount_cents),0) AS outstanding
FROM invoices i
LEFT JOIN receipts r ON r.invoice_id = i.id
WHERE i.invoice_number = '...'
GROUP BY i.id;
```

Runbook: `receipts-and-payments.md` → "Invoice shows outstanding but all receipts should cover it"

---

### `/quote` AI is saying something wrong

Kill switch first:
```sql
UPDATE quote_config SET value = 'false'::jsonb WHERE key = 'ai_enabled';
```
Then diagnose. Runbook: `quote-estimator.md` (existing) → "Emergency procedures"

---

### Costs spiking on Anthropic API

Check top-spending sessions, tighten cap, or flip kill switch.
Runbook: `quote-estimator.md` (existing) → "Costs are spiking"

---

### AI quote output scanner failing

```bash
node scripts/test-quote-rls.mjs     # Must be 25/25
npx tsx tests/quote-ai-evals.mjs    # Must be 38/38
```
Runbook: `quote-estimator.md` (existing) → "Supabase RLS regression"

---

### Retainer tier not activating subscription

1. Check `quote_sessions.selected_plan_id` — is a plan selected?
2. Check `subscription_plans.tier` for that plan — is it `site_only`? (No subscription by design)
3. Check `quote_sessions.retainer_activated_at` — did activation run?
4. Runbook: `retainer-bundling.md` → "Emergency procedures"

---

### Prospect not showing CLIENT badge after SOW accept

The `is_client` flip failed silently. Fix:
```sql
UPDATE prospects SET is_client = true, became_client_at = now() WHERE id = '<id>';
```
Runbook: `client-lifecycle.md` → "Emergency procedures"

---

### Project not created after SOW accept

Accept route wraps project creation in try/catch. Create manually.
Runbook: `client-lifecycle.md` → "Project not created after SOW accept"

---

### Channel data wrong or stale for a prospect

Admin edits win — clear the channel field, then "Run Research."
Runbook: `channels-and-research.md` → "Emergency procedures"

---

### /admin/settings shows all env vars as "not configured"

`GET /api/admin/config` is failing. Common cause: `SUPABASE_SERVICE_ROLE_KEY` missing in Vercel.

```bash
# Verify the env var is in Vercel
# Vercel Dashboard → Settings → Environment Variables → search SUPABASE_SERVICE_ROLE_KEY
```

Runbook: `environment-and-deploy.md` → "Required env vars"

---

## Rollback procedure

**CRITICAL: Never force-push master.**

Always roll forward with `git revert`:

```bash
# Revert the most recent commit
git revert HEAD
git push origin master
# OR revert a specific commit:
git revert <bad-sha>
git push origin master
```

Vercel auto-deploys the revert commit. The bad commit stays in history (safe, auditable).

**If the bug is deep (multiple commits):** revert each commit in reverse order, or do a forward-fix instead (preferred — less risky than multiple reverts that may conflict).

---

## Quick SQL health checks

Run these any time you're unsure of system state:

```sql
-- Quote AI status
SELECT key, value FROM quote_config WHERE key IN ('ai_enabled','stripe_enabled','email_delivery_enabled','sms_delivery_enabled') ORDER BY key;

-- Recent invoices (last 10)
SELECT invoice_number, status, total_due_cents, created_at FROM invoices ORDER BY created_at DESC LIMIT 10;

-- Active clients
SELECT COUNT(*) FROM prospects WHERE is_client = true;

-- Active projects
SELECT COUNT(*) FROM projects WHERE status != 'completed';

-- Pending document numbers (should be 0)
SELECT COUNT(*) FROM invoices WHERE invoice_number LIKE 'PENDING-%';
SELECT COUNT(*) FROM sow_documents WHERE sow_number LIKE 'PENDING-%';

-- Recent SOWs
SELECT sow_number, status, created_at FROM sow_documents ORDER BY created_at DESC LIMIT 5;
```

---

## Escalation path

1. Check this runbook index
2. Go to the specific runbook for the affected system
3. Check MEMORY.md shipping log for recent changes
4. Check Vercel build + function logs
5. Check Supabase Dashboard → Logs → API logs for the failing request

If none of that surfaces the problem: ask Opus to investigate with `git log --oneline -30` and the error message. **Never guess and push to fix a 2am issue without a build check.**

---

## All runbooks in this directory

| File | System |
|---|---|
| `sow-lifecycle.md` | SOW create/send/accept |
| `document-numbering.md` | TYPE-CLIENT-MMDDYY numbering |
| `pdf-pipeline.md` | Chromium HTML→PDF |
| `client-lifecycle.md` | Prospect → client transition |
| `supabase-migrations.md` | DB migration ops |
| `receipts-and-payments.md` | Payment → receipt flow |
| `retainer-bundling.md` | /quote retainer tiers + activation |
| `channels-and-research.md` | Prospect channels jsonb + research |
| `admin-portal.md` | Sidebar + auth + dashboard |
| `quote-estimator-to-sow.md` | EST → SOW continuation |
| `magic-link-public-pages.md` | /sow, /invoice, /quote/s pages |
| `security-and-rls.md` | RLS + function hardening |
| `environment-and-deploy.md` | Env vars + git push + Vercel |
| `services-catalog.md` | services_catalog table + value stack |
| `project-management.md` | projects table + phase tracking |
| `when-something-breaks.md` | This file |
| `quote-estimator.md` | (existing) /quote AI operations |
| `invoicing-morning-2026-04-18.md` | (existing) Phase 1-3 activation |
| `invoicing-phase4-activation.md` | (existing) Services catalog + value stack activation |
| `stage-c-plan.md` | (existing) Stage C build plan |
