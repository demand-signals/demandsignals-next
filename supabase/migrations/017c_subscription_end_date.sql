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
