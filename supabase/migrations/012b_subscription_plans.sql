-- 012b: DSIG-owned catalog of subscription plans.
-- Stripe is the billing engine; we own plan names, pricing, included services.
-- Stripe product + price IDs are references only.

CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'USD',
  billing_interval text NOT NULL CHECK (billing_interval IN ('month','quarter','year')),
  trial_days integer NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  stripe_product_id text,
  stripe_price_id text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_active
  ON subscription_plans (active, created_at DESC);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read subscription_plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins insert subscription_plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins update subscription_plans" ON subscription_plans;

CREATE POLICY "Admins read subscription_plans" ON subscription_plans
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins insert subscription_plans" ON subscription_plans
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins update subscription_plans" ON subscription_plans
  FOR UPDATE USING (is_admin());

REVOKE ALL ON subscription_plans FROM anon;
