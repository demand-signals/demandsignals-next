-- ── 054: invoices.project_id ───────────────────────────────────────────────
--
-- Links an invoice back to the project it was generated from. Optional
-- (existing flows don't set it; SOW-driven invoices still carry
-- sow_document_id; subscription-driven invoices still carry
-- subscription_id; etc.). Set ONLY by the new "Generate Invoice from
-- Project" flow on /admin/projects/[id] (see GenerateInvoiceModal).
--
-- ON DELETE SET NULL: documents outlive their source project the same
-- way they outlive their source SOW (per the append-only-once-issued
-- rule established 2026-05-04). Deleting a project does not destroy the
-- invoice; it just severs the back-link.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS project_id uuid
    REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_project_id
  ON invoices (project_id)
  WHERE project_id IS NOT NULL;

-- Verification:
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'invoices' AND column_name = 'project_id';
-- Expected: project_id | uuid | YES
