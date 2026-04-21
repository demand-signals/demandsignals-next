-- 016b: Join table — which services_catalog items are included by default in each subscription plan.
-- Used for retainer tiers. Quantity supports "5 blog posts" style services.

CREATE TABLE IF NOT EXISTS subscription_plan_items (
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  service_id text NOT NULL REFERENCES services_catalog(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_plan_items_plan
  ON subscription_plan_items (plan_id);

ALTER TABLE subscription_plan_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read subscription_plan_items" ON subscription_plan_items;
DROP POLICY IF EXISTS "Admins write subscription_plan_items" ON subscription_plan_items;

CREATE POLICY "Admins read subscription_plan_items" ON subscription_plan_items
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins write subscription_plan_items" ON subscription_plan_items
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

REVOKE ALL ON subscription_plan_items FROM anon;
