-- 011a: Add versioning + void columns to existing invoices table.
-- Additive, safe to re-run (IF NOT EXISTS).

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS public_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS supersedes_invoice_id uuid REFERENCES invoices(id),
  ADD COLUMN IF NOT EXISTS superseded_by_invoice_id uuid REFERENCES invoices(id),
  ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS void_reason text;
