-- 017a: Priced deliverables on SOW.
-- deliverables is existing jsonb; no DDL on its shape (it's flexible jsonb).
-- Add top-level fields for a send date + total computation traceability.

ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS send_date date,
  ADD COLUMN IF NOT EXISTS computed_from_deliverables boolean NOT NULL DEFAULT false;
