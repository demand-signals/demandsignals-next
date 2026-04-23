-- 017a: Priced deliverables on SOW.
-- deliverables is existing jsonb; no DDL on its shape (it's flexible jsonb).
-- Add top-level fields for a send date + total computation traceability.

ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS send_date date,
  ADD COLUMN IF NOT EXISTS computed_from_deliverables boolean NOT NULL DEFAULT false;
-- 017b: Invoice send-date scheduling + late fee policy.
-- late_fee_cents is a flat one-time fee applied if unpaid past due_date + grace_days.
-- late_fee_applied_at is null until applied (then the fee is added as a new line item via a separate flow — not automated in this migration).

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS send_date date,
  ADD COLUMN IF NOT EXISTS late_fee_cents integer NOT NULL DEFAULT 0 CHECK (late_fee_cents >= 0),
  ADD COLUMN IF NOT EXISTS late_fee_grace_days integer NOT NULL DEFAULT 0 CHECK (late_fee_grace_days >= 0),
  ADD COLUMN IF NOT EXISTS late_fee_applied_at timestamptz;
-- 017c: Subscription end date + admin notes.
-- end_date is inclusive last-billing-cycle end. null = open-ended.
-- override_monthly_amount_cents lets admin charge a different amount than plan.price_cents without creating a new plan.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS override_monthly_amount_cents integer CHECK (override_monthly_amount_cents IS NULL OR override_monthly_amount_cents >= 0);

CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date
  ON subscriptions (end_date)
  WHERE end_date IS NOT NULL;
