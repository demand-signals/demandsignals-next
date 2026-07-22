-- 057: time-entry approval state machine (2026-07-23)
--
-- New billing model (Hunter, locked 2026-07-23):
--   Handoff CAPTURES a time entry (approval_status='captured'). No money moves.
--   A human reviews + edits hours/role/rate/tokens in-project and clicks ONE
--   "Approve" button. On approve, the system AUTO-FORKS by retainer status:
--     - client HAS a retainer ledger  -> create the retainer DEBIT now (verified numbers)
--     - client has NO ledger           -> mark approved+billable; flows into New Invoice
--
--   Gate: BOTH money surfaces (retainer debit AND invoice-seed) include ONLY
--   entries with approval_status='approved'. Captured entries are invisible to
--   billing and surface in a "N pending approval — $X not yet billable" banner.
--
-- Replaces the old auto-accrue-at-handoff behavior (removed from
-- createNoteAndTimeEntry same day) which mis-debited retainers using raw,
-- often-wrong hunter_minutes.
--
-- Spec: Y:\SKILLS\dsig-handoff\specs\2026-07-23-handoff-rewrite-plan-v2a-amended.md

ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'captured'
    CHECK (approval_status IN ('captured', 'approved'));

ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES admin_users(id);

-- Set when an approval created a retainer debit, linking the entry to its
-- ledger transaction (idempotency: a second approve is a no-op if this is set).
ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS retainer_debit_id uuid;

CREATE INDEX IF NOT EXISTS idx_pte_approval
  ON project_time_entries (project_id, approval_status);

-- Backfill: entries already covered by an invoice are implicitly approved
-- (they already billed). Everything else defaults to 'captured' (pending
-- review). Manual/older entries that were already billed via the legacy
-- timekeeping UI (hours set, source='manual') are also treated as approved
-- so they don't suddenly disappear from invoices as "pending".
UPDATE project_time_entries
SET approval_status = 'approved',
    approved_at = COALESCE(approved_at, created_at)
WHERE covered_by_invoice_id IS NOT NULL
   OR (source = 'manual' AND hours IS NOT NULL AND hours > 0);
