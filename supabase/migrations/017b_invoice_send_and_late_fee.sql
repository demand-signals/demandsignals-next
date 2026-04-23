-- 017b: Invoice send-date scheduling + late fee policy.
-- late_fee_cents is a flat one-time fee applied if unpaid past due_date + grace_days.
-- late_fee_applied_at is null until applied (then the fee is added as a new line item via a separate flow — not automated in this migration).

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS send_date date,
  ADD COLUMN IF NOT EXISTS late_fee_cents integer NOT NULL DEFAULT 0 CHECK (late_fee_cents >= 0),
  ADD COLUMN IF NOT EXISTS late_fee_grace_days integer NOT NULL DEFAULT 0 CHECK (late_fee_grace_days >= 0),
  ADD COLUMN IF NOT EXISTS late_fee_applied_at timestamptz;
