-- ── 025b_sow_change_orders.sql ──────────────────────────────────────
-- Adds parent_sow_id to sow_documents for change-order support.
-- A mini-SOW issued mid-engagement carries parent_sow_id pointing
-- at the original. Both SOWs attach to the same project.

ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS parent_sow_id UUID REFERENCES sow_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sow_documents_parent ON sow_documents(parent_sow_id)
  WHERE parent_sow_id IS NOT NULL;
