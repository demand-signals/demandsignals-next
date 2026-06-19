-- ── APPLY-054 — 2026-06-19 ──
-- Paste into Supabase Studio SQL Editor. Single transaction.
-- Verification SELECT runs at the end and should return exactly one row.
--
-- Source: Y:\DSIG\demandsignals-next\supabase\migrations\054_invoices_project_id.sql

BEGIN;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS project_id uuid
    REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_project_id
  ON invoices (project_id)
  WHERE project_id IS NOT NULL;

COMMIT;

-- ── Verification ──
-- Should return:
--   project_id | uuid | YES
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'invoices' AND column_name = 'project_id';
