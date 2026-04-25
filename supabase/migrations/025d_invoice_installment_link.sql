-- ── 025d_invoice_installment_link.sql ──────────────────────────────
-- Adds payment_installment_id to invoices so generated invoices link
-- back to the installment row that fired them. Used by webhook cascade
-- to find the installment when a Stripe payment completes.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_installment_id UUID
    REFERENCES payment_installments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_payment_installment ON invoices(payment_installment_id)
  WHERE payment_installment_id IS NOT NULL;
