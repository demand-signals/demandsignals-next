-- ── APPLY-055 — 2026-07-08 ──
-- Paste into Supabase Studio SQL Editor. Single transaction.
-- Verification SELECT runs at the end and should return exactly 3 rows.
--
-- Source: Y:\DSIG\demandsignals-next\supabase\migrations\055_llm_token_billing.sql
--
-- LLM token-based billing: adds llm_billable_cents (post-margin client
-- amount), llm_billing_by_model (usage+billable jsonb, NO cost/rates),
-- billing_model. All nullable. Cost basis stays in llm-rates.json (internal).

BEGIN;

ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS llm_billable_cents integer;

ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS llm_billing_by_model jsonb;

ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS billing_model text
    CHECK (billing_model IS NULL OR billing_model IN ('token', 'time'));

COMMENT ON COLUMN project_time_entries.llm_billable_cents IS
  'Client-billable LLM amount (cents, post-margin). Cost + rates are internal-only; DB stores billable only.';
COMMENT ON COLUMN project_time_entries.llm_billing_by_model IS
  'Per-model usage (tokens) + billable (USD post-margin). NEVER contains DSIG cost or rates.';
COMMENT ON COLUMN project_time_entries.billing_model IS
  'token = token-based (2026-07-08+); time = legacy; NULL = no LLM component.';

COMMIT;

-- Verification (expect exactly 3 rows, all is_nullable='YES'):
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'project_time_entries'
  AND column_name IN ('llm_billable_cents', 'llm_billing_by_model', 'billing_model')
ORDER BY column_name;
