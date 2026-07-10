-- ─────────────────────────────────────────────────────────────────────
-- Migration 055 — LLM token-based billing
-- ─────────────────────────────────────────────────────────────────────
-- Billing model change (2026-07-08, Hunter directive): human work bills
-- on TIME (unchanged — hunter_minutes → hours × hourly_rate_cents). Claude
-- / LLM usage now bills on TOKENS: per model, per token type, DSIG cost
-- + 50% margin, computed at handoff time by
-- Y:\SKILLS\dsig-handoff\compute-llm-billing.cjs.
--
-- Motivation: time-based Claude/tool billing consistently UNDER-logged
-- real LLM cost — inference time measured by transcript wall-gaps
-- understates token consumption. Tokens are the true cost driver.
--
-- EXPOSURE RULE (load-bearing): we store the CLIENT-BILLABLE amount only
-- (post-margin). DSIG's raw cost basis and the rate table + margin % live
-- ONLY in Y:\SKILLS\dsig-handoff\llm-rates.json (internal, never in the
-- DB, never client-facing). The per-model breakdown stored here is
-- usage (tokens) + billable (USD) — never cost.
--
-- All columns NULLABLE: historical + manual + human-only entries have no
-- LLM billing. NULL = "no LLM usage recorded" not "measured zero."
-- ─────────────────────────────────────────────────────────────────────

BEGIN;

-- The client-billable LLM amount for this entry, in cents, post-margin.
-- This is what flows onto invoices as the "LLM usage" line. It is the
-- sum across all models × token types of (tokens/1e6 × rate × 1.5),
-- computed off-DB and passed in — the DB never sees the rate or cost.
ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS llm_billable_cents integer;

-- Structured per-model breakdown for display + audit. Shape (usage +
-- billable only, NEVER cost/rates):
--   {
--     "claude-opus-4-7": {
--       "display": "Opus 4.7",
--       "usage":    { "input": N, "output": N, "cache_read": N, "cache_create": N, "total": N },
--       "billable": { "input": 1.23, "output": 4.56, "cache_read": ..., "cache_create": ..., "total": ... }
--     }, ...
--   }
-- billable sub-values are USD (post-margin). Emitted verbatim by
-- compute-llm-billing.cjs `by_model`.
ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS llm_billing_by_model jsonb;

-- Which billing model produced the LLM charge on this entry.
--   'token'  — new token-based billing (2026-07-08+)
--   'time'   — legacy: LLM was billed as claude_minutes time (pre-055)
--   NULL     — no LLM component (human-only or historical)
ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS billing_model text
    CHECK (billing_model IS NULL OR billing_model IN ('token', 'time'));

COMMENT ON COLUMN project_time_entries.llm_billable_cents IS
  'Client-billable LLM amount (cents, post-margin). Sum across models/token-types of tokens/1e6 x rate x 1.5. Cost + rate table are internal-only (Y:\SKILLS\dsig-handoff\llm-rates.json); DB stores billable only.';
COMMENT ON COLUMN project_time_entries.llm_billing_by_model IS
  'Per-model usage (tokens) + billable (USD post-margin) breakdown. NEVER contains DSIG cost or rates. From compute-llm-billing.cjs by_model.';
COMMENT ON COLUMN project_time_entries.billing_model IS
  'token = token-based LLM billing (2026-07-08+); time = legacy time-based; NULL = no LLM component.';

COMMIT;

-- ── POST-RUN VERIFICATION ─────────────────────────────────────────────
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'project_time_entries'
--   AND column_name IN ('llm_billable_cents', 'llm_billing_by_model', 'billing_model')
-- ORDER BY column_name;
--
-- Expected: 3 rows, all is_nullable='YES'.
