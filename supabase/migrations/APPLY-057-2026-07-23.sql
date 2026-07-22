-- APPLY 057 — run in Supabase SQL Editor, project uoekjqkawssbskfkziwz (platform / demand-signals)
-- Adds the time-entry approval state machine. Additive + backfill. Safe to re-run.

ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'captured'
    CHECK (approval_status IN ('captured', 'approved'));

ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES admin_users(id);

ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS retainer_debit_id uuid;

CREATE INDEX IF NOT EXISTS idx_pte_approval
  ON project_time_entries (project_id, approval_status);

-- Backfill: already-invoiced or already-manually-logged entries are implicitly approved.
UPDATE project_time_entries
SET approval_status = 'approved',
    approved_at = COALESCE(approved_at, created_at)
WHERE covered_by_invoice_id IS NOT NULL
   OR (source = 'manual' AND hours IS NOT NULL AND hours > 0);

-- Verify:
SELECT
  count(*) FILTER (WHERE approval_status = 'captured') AS captured,
  count(*) FILTER (WHERE approval_status = 'approved') AS approved
FROM project_time_entries;
