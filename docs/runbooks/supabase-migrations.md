# Supabase Migrations — Operational Runbook

**Owner:** Hunter (DSIG)
**Last updated:** 2026-04-24
**Scope:** How migrations are structured, how to apply them, how to verify they landed, and the full inventory of all bundles applied to date.

> **The three things to know at 2am:**
> 1. **Always paste the APPLY-NNN bundle, not individual files.** The bundle concatenates the individual files in the right order and is tested as a unit. Individual files may have dependencies that fail if run out of order.
> 2. **PostgREST schema cache takes ~30 seconds to refresh after a migration.** If your API returns "column X does not exist" immediately after applying, wait 30 seconds and reload the Supabase SQL Editor tab. The Next.js API routes do not need to redeploy — they read the schema at request time.
> 3. **Never backfill document number columns.** After applying 019a, do not try to generate `TYPE-CLIENT-MMDDYY{SUFFIX}` numbers for old invoices/SOWs. They keep their legacy format forever. Only new documents get the new format.

---

## Emergency procedures

### API returns "column X does not exist" after a migration you just applied

**Most common cause:** PostgREST schema cache has not refreshed yet.

1. Wait 30 seconds
2. Try the API call again
3. If still failing after 60 seconds: verify the migration actually landed:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = '<table>' AND column_name = '<column>';
   ```
4. If no row returned: the migration did not apply. Re-paste the APPLY bundle and run again. All bundles use `IF NOT EXISTS` — they are safe to re-run.

### Migration applied but function not working

Supabase SQL Editor sometimes silently truncates very long files or fails to parse dollar-quoted function bodies.

Fix:
1. Open the individual migration file (not the bundle)
2. Select all → Run in a fresh SQL Editor tab
3. Verify the function was created:
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_schema = 'public' AND routine_name = '<function_name>';
   ```

### Migration dependency failure (022 needed 020 first)

Some migrations reference columns or tables from prior migrations. If you apply them out of order you'll see FK errors or "relation X does not exist."

**Apply in numeric order.** The APPLY bundles enforce this — use them.

---

## How to apply a migration

1. Open Supabase Dashboard → your project → **SQL Editor**
2. Click **New query**
3. Open the APPLY bundle file from `supabase/migrations/APPLY-NNN-YYYY-MM-DD.sql`
4. Select all → paste into the query editor
5. **Press Ctrl+A inside the editor to make sure everything is selected**
6. Click **Run**
7. Expect: "Success. No rows returned." (or "X rows returned" for migrations that do data transforms)
8. Run verification queries (see each bundle section below)

**Important:** The Supabase SQL Editor has parsing issues with dollar-quoted function bodies using `$$ ... $$`. All DSIG migrations use named dollar quotes like `$func$ ... $func$` which survive the parser reliably. If you write custom SQL, use named dollar quotes.

---

## Migration inventory (016 through 024)

### APPLY-016-2026-04-21 — Retainer bundling

Individual files: `016a_retainer_plans_extend.sql`, `016b_subscription_plan_items.sql`, `016c_quote_sessions_retainer.sql`, `016d_retainer_seed.sql`

**What it adds:**
- `subscription_plans.is_retainer`, `.tier` (essential/growth/full/site_only), `.sort_order`
- `subscription_plan_items` join table (plan → services_catalog items with quantity)
- `quote_sessions.selected_plan_id`, `.retainer_custom_items`, `.retainer_monthly_cents`, `.launched_at`
- Seeds 4 retainer tiers into `subscription_plans`

**Verification:**
```sql
SELECT tier, name, is_retainer FROM subscription_plans WHERE is_retainer = true ORDER BY sort_order;
-- Expect: 4 rows (essential, growth, full, site_only)

SELECT COUNT(*) FROM subscription_plan_items;
-- Expect: > 0 (pre-seeded items per tier)
```

---

### APPLY-017-2026-04-22 — SOW phases + priced deliverables

Individual files: `017a_sow_priced_deliverables.sql`, `017b_invoice_send_and_late_fee.sql`, `017c_subscription_end_date.sql`

**What it adds:**
- `sow_documents.phases jsonb` — the new phase model (replaces flat `deliverables` + `timeline`)
- `invoices.late_fee_cents`, `.late_fee_grace_days`, `.late_fee_applied_at`
- `invoices.send_date`
- `subscriptions.end_date`

**Verification:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sow_documents'
  AND column_name = 'phases';
-- Expect: 1 row

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'invoices'
  AND column_name IN ('late_fee_cents','send_date');
-- Expect: 2 rows
```

---

### APPLY-018-2026-04-22 — Phase hierarchy + client lifecycle

Individual files: `018a_sow_phases_and_cadence.sql`, `018b_client_lifecycle.sql`

**What it adds:**
- `sow_documents`: further phase model enhancements (cadence, start_trigger on deliverables)
- `prospects.is_client boolean`, `.became_client_at`
- `projects.sow_document_id`, `projects.phases jsonb`

**Verification:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'prospects'
  AND column_name IN ('is_client', 'became_client_at');
-- Expect: 2 rows

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'projects'
  AND column_name IN ('sow_document_id', 'phases');
-- Expect: 2 rows
```

---

### APPLY-019-2026-04-23 — Client code + document numbering + receipts

Individual files: `019a_client_code_and_doc_numbering.sql`, `019b_receipts.sql`

**What it adds:**
- `prospects.client_code text` (unique partial index when set)
- `document_numbers` table (audit log of every issued TYPE-CLIENT-MMDDYY{SUFFIX} number)
- `allocate_document_number()` RPC (SECURITY DEFINER, service_role only)
- `receipts` table with `receipt_number` (RCT-CLIENT-MMDDYY{SUFFIX} format)

**Verification:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'prospects'
  AND column_name = 'client_code';
-- Expect: 1 row

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('document_numbers', 'receipts');
-- Expect: 2 rows

SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'allocate_document_number';
-- Expect: 1 row
```

**Note:** there is also a `019a_trade_credits.sql` file in the directory — this was the original 019a before it was superseded by the numbering file. The trade-credits table is created in the 019a_trade_credits.sql file. Both files are included in the APPLY bundle.

---

### APPLY-020-2026-04-23 — Prospect channels + notes

Individual files: `020a_prospect_channels_and_notes.sql`

**What it adds:**
- `prospects.channels jsonb` (7 review channels + 7 simple channels — all in one blob)
- `prospect_notes` table (append-only activity timeline)

**Verification:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'prospects'
  AND column_name = 'channels';
-- Expect: 1 row

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'prospect_notes';
-- Expect: 1 row
```

---

### APPLY-021-2026-04-23 — EST doc number on quote_sessions

Individual files: `021a_quote_session_doc_number.sql`

**What it adds:**
- `quote_sessions.doc_number text` (unique when set; lazy-allocated on prospect-link)

**Verification:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'quote_sessions'
  AND column_name = 'doc_number';
-- Expect: 1 row
```

---

### APPLY-022-2026-04-23 — Channels backfill

Individual files: `022a_channels_backfill_from_legacy.sql`

**What it does:** data migration — backfills `prospects.channels` from legacy `website_url`, `google_rating`, `google_review_count`, `yelp_rating`, `yelp_review_count` columns. Idempotent (only fills when target is empty).

**Verification:**
```sql
-- Count prospects with channels.google_business set
SELECT COUNT(*) FROM prospects
WHERE channels->>'google_business' IS NOT NULL
  AND jsonb_typeof(channels->'google_business') = 'object';
-- Should be > 0 if any prospects had google_rating
```

**Note:** 022a requires 020a to be applied first (needs `channels` column to exist). The APPLY bundle enforces the order.

---

### APPLY-023-2026-04-24 — SOW Trade-in-Kind

Individual files: `023a_sow_trade_in_kind.sql`

**What it adds:**
- `sow_documents.trade_credit_cents integer NOT NULL DEFAULT 0`
- `sow_documents.trade_credit_description text`

**Verification:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sow_documents'
  AND column_name IN ('trade_credit_cents', 'trade_credit_description');
-- Expect: 2 rows
```

---

### APPLY-024-2026-04-24 — Security hardening

Individual files: `024a_security_hardening.sql`

**What it does:**
- Converts `pipeline_summary` and `recent_activities` views to `security_invoker = true` (closes privilege escalation hole)
- Sets `search_path = public, pg_temp` on 9 SECURITY DEFINER / RLS-used functions (closes schema search path hijack vector)
- Drops 5 "always true" RLS policies on campaign tables (they were `USING(true)` — effectively bypassed RLS)
- Enables leaked password protection (dashboard toggle — must be done manually in Auth settings)

**Verification:**
```sql
-- Check views have security_invoker
SELECT relname, reloptions FROM pg_class
WHERE relname IN ('pipeline_summary', 'recent_activities')
  AND reloptions::text LIKE '%security_invoker=true%';
-- Expect: 2 rows

-- Check the bad policies are gone
SELECT COUNT(*) FROM pg_policies
WHERE policyname = 'Service role full access'
  AND tablename IN ('campaigns','campaign_assets','campaign_posts');
-- Expect: 0
```

---

## Applying from scratch (fresh Supabase project)

Apply in this strict order:

1. Early Stage A migrations (001–009)
2. APPLY-ALL-2026-04-18 (migrations 011a–013b + services catalog 014a-b)
3. APPLY-015-2026-04-21
4. APPLY-016-2026-04-21
5. APPLY-017-2026-04-22
6. APPLY-018-2026-04-22
7. APPLY-019-2026-04-23
8. APPLY-020-2026-04-23
9. APPLY-021-2026-04-23
10. APPLY-022-2026-04-23 (requires 020)
11. APPLY-023-2026-04-24
12. APPLY-024-2026-04-24

Then run `node scripts/test-quote-rls.mjs` — expect 25/25.

---

## Troubleshooting

### "relation does not exist" error during migration

A table referenced in the migration hasn't been created yet. Apply the prior bundle first.

### "duplicate column" error

Migration was partially applied before. All DDL uses `IF NOT EXISTS` / `IF EXISTS` — the error means a custom column was manually added with the same name. Check the column, then either drop it if unused or skip that specific `ALTER TABLE` statement.

### Function body truncated (partial apply)

Symptom: function exists in `information_schema.routines` but calling it returns wrong results or syntax errors. Root cause: large function body pasted improperly.

Fix:
1. Open the individual `.sql` file (not the bundle)
2. Copy only the `CREATE OR REPLACE FUNCTION ... $func$ ... $func$;` block
3. Paste into a fresh SQL Editor tab
4. Ctrl+A → Run

---

## Cross-references

- `document-numbering.md` — 019a specifics
- `client-lifecycle.md` — 018b specifics
- `security-and-rls.md` — 024a specifics
- `channels-and-research.md` — 020a and 022a specifics
