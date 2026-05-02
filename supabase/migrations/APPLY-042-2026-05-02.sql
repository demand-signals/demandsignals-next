-- ── APPLY-042-2026-05-02.sql ───────────────────────────────────────
-- Inlined migration — paste into Supabase web SQL Editor.
--
-- 042a: per-invoice payment plans. Relax payment_schedules.sow_document_id
--       to nullable + add parent_invoice_id + XOR CHECK constraint.

ALTER TABLE payment_schedules
  ALTER COLUMN sow_document_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS parent_invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE;

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
