-- 012c: Subscription instances — one row per active client subscription.
-- Links prospect + plan. Stripe subscription ID + customer ID stored
-- here so we can sync with Stripe on webhook events.

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','trialing','past_due','canceled','paused')),
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  next_invoice_date date NOT NULL,
  canceled_at timestamptz,
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_prospect
  ON subscriptions (prospect_id, status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_next_invoice
  ON subscriptions (next_invoice_date)
  WHERE status IN ('active','trialing');

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe
  ON subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Now that subscriptions exists, add FK on invoices.subscription_id.
-- Wrapped in DO block so re-running doesn't error if the constraint already exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoices_subscription_id_fkey'
      AND table_name = 'invoices'
  ) THEN
    ALTER TABLE invoices
      ADD CONSTRAINT invoices_subscription_id_fkey
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins insert subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins update subscriptions" ON subscriptions;

CREATE POLICY "Admins read subscriptions" ON subscriptions
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins insert subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins update subscriptions" ON subscriptions
  FOR UPDATE USING (is_admin());

REVOKE ALL ON subscriptions FROM anon;
