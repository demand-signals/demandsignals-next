-- ── 042a_invoice_payment_plans.sql ─────────────────────────────────
-- Allows payment_schedules to be parented by an invoice (for per-invoice
-- payment plans) rather than only by a SOW. Stripe Plan B (migration
-- 025a) created payment_schedules with sow_document_id NOT NULL;
-- per-invoice splits weren't possible.
--
-- Why this is additive: existing rows all have sow_document_id set
-- (no per-invoice plans existed before this migration). Relaxing the
-- NOT NULL constraint and adding parent_invoice_id is purely
-- additive — no row needs to be backfilled.
--
-- The CHECK constraint enforces that exactly one of sow_document_id
-- or parent_invoice_id is set. Both null = orphan row (rejected).
-- Both non-null = ambiguous parent (rejected).
--
-- firePaymentInstallment in src/lib/payment-plans.ts currently
-- requires a SOW. This migration unblocks the per-invoice path; the
-- runtime code that fires invoice-parented installments lands in a
-- follow-up commit.

ALTER TABLE payment_schedules
  ALTER COLUMN sow_document_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS parent_invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE;

-- Drop any prior version of the constraint before re-adding.
ALTER TABLE payment_schedules
  DROP CONSTRAINT IF EXISTS payment_schedules_parent_xor;

ALTER TABLE payment_schedules
  ADD CONSTRAINT payment_schedules_parent_xor CHECK (
    (sow_document_id IS NOT NULL AND parent_invoice_id IS NULL)
    OR (sow_document_id IS NULL AND parent_invoice_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_payment_schedules_parent_invoice
  ON payment_schedules(parent_invoice_id)
  WHERE parent_invoice_id IS NOT NULL;

COMMENT ON COLUMN payment_schedules.parent_invoice_id IS
  'For per-invoice payment plans: the invoice being split into installments. Mutually exclusive with sow_document_id.';
