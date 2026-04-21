-- 016a: Extend subscription_plans with retainer-specific columns.
-- Existing subscription_plans rows (if any) get is_retainer=false, tier=null.

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS tier text,
  ADD COLUMN IF NOT EXISTS is_retainer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_tier_check;

ALTER TABLE subscription_plans
  ADD CONSTRAINT subscription_plans_tier_check
  CHECK (tier IS NULL OR tier IN ('essential','growth','full','site_only'));

CREATE INDEX IF NOT EXISTS idx_subscription_plans_retainer
  ON subscription_plans (is_retainer, sort_order)
  WHERE is_retainer = true;
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
-- 016c: Retainer fields on quote_sessions. One retainer per quote session.
-- custom_items is a JSONB diff vs the plan's default items:
--   [{ "service_id": "social-mgmt", "quantity": 2, "included": true }, ...]
-- monthly_cents is computed at save time for SOW stability.

ALTER TABLE quote_sessions
  ADD COLUMN IF NOT EXISTS selected_plan_id uuid REFERENCES subscription_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS retainer_custom_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS retainer_monthly_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retainer_start_date date,
  ADD COLUMN IF NOT EXISTS retainer_activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS retainer_subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS retainer_cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS launched_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_quote_sessions_launched
  ON quote_sessions (launched_at)
  WHERE launched_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quote_sessions_retainer_pending
  ON quote_sessions (selected_plan_id)
  WHERE selected_plan_id IS NOT NULL
    AND retainer_activated_at IS NULL
    AND retainer_cancelled_at IS NULL;
-- 016d: Seed the 4 retainer tiers. Prices are placeholders — Hunter sets
-- final pricing via /admin/retainer-plans after deploy.
-- Tier items reference services_catalog IDs. If a referenced service doesn't
-- exist yet, the INSERT is silently skipped via NOT EXISTS guard.

-- ESSENTIAL tier
INSERT INTO subscription_plans
  (slug, name, description, price_cents, currency, billing_interval, tier, is_retainer, sort_order, active)
VALUES
  ('retainer-essential', 'Essential', 'Hosting, maintenance, and monthly analytics.', 0, 'USD', 'month', 'essential', true, 1, true)
ON CONFLICT (slug) DO UPDATE SET
  tier = EXCLUDED.tier,
  is_retainer = EXCLUDED.is_retainer,
  sort_order = EXCLUDED.sort_order;

-- GROWTH tier
INSERT INTO subscription_plans
  (slug, name, description, price_cents, currency, billing_interval, tier, is_retainer, sort_order, active)
VALUES
  ('retainer-growth', 'Growth', 'Essential plus GBP, review responses, and SEO/LLM monitoring.', 0, 'USD', 'month', 'growth', true, 2, true)
ON CONFLICT (slug) DO UPDATE SET
  tier = EXCLUDED.tier,
  is_retainer = EXCLUDED.is_retainer,
  sort_order = EXCLUDED.sort_order;

-- FULL tier
INSERT INTO subscription_plans
  (slug, name, description, price_cents, currency, billing_interval, tier, is_retainer, sort_order, active)
VALUES
  ('retainer-full', 'Full', 'Complete ongoing management: all services included.', 0, 'USD', 'month', 'full', true, 3, true)
ON CONFLICT (slug) DO UPDATE SET
  tier = EXCLUDED.tier,
  is_retainer = EXCLUDED.is_retainer,
  sort_order = EXCLUDED.sort_order;

-- SITE-ONLY (zero-price sentinel — no subscription created on activation)
INSERT INTO subscription_plans
  (slug, name, description, price_cents, currency, billing_interval, tier, is_retainer, sort_order, active)
VALUES
  ('retainer-site-only', 'Site-only', 'Launch the site, no ongoing management. Add a retainer anytime post-launch.', 0, 'USD', 'month', 'site_only', true, 4, true)
ON CONFLICT (slug) DO UPDATE SET
  tier = EXCLUDED.tier,
  is_retainer = EXCLUDED.is_retainer,
  sort_order = EXCLUDED.sort_order;

-- Seed default included items for Essential / Growth / Full.
-- Uses INSERT SELECT with NOT EXISTS guard so missing services_catalog IDs
-- are silently skipped. Hunter adds items manually via /admin/retainer-plans
-- if services_catalog doesn't yet contain these slugs.

DO $$
DECLARE
  p_essential uuid;
  p_growth uuid;
  p_full uuid;
BEGIN
  SELECT id INTO p_essential FROM subscription_plans WHERE slug = 'retainer-essential';
  SELECT id INTO p_growth FROM subscription_plans WHERE slug = 'retainer-growth';
  SELECT id INTO p_full FROM subscription_plans WHERE slug = 'retainer-full';

  -- CATALOG-VERIFIED SLUGS (monthly/both pricing_type only):
  --   hosting-php / hosting-node / hosting-enterprise  (monthly)
  --   fractional-webmaster, analytics, site-admin      (monthly)
  --   google-admin                                      (monthly — GBP management)
  --   review-responders, review-admin                   (monthly)
  --   social-automation                                  (monthly)
  --   auto-blogging, automated-posts, content-repurposing (monthly)
  --   geo-aeo-llm, local-seo                            (both — has monthly tier)
  -- Default hosting slug for Essential is hosting-php; Hunter swaps to
  -- hosting-node / hosting-enterprise per client via admin UI.

  -- Essential: hosting (php default), fractional webmaster, analytics, site admin
  INSERT INTO subscription_plan_items (plan_id, service_id, quantity)
  SELECT p_essential, id, 1 FROM services_catalog
  WHERE id IN ('hosting-php', 'fractional-webmaster', 'analytics', 'site-admin')
  ON CONFLICT (plan_id, service_id) DO NOTHING;

  -- Growth: Essential items + GBP admin, review responders & admin, SEO/LLM + local SEO monitoring
  INSERT INTO subscription_plan_items (plan_id, service_id, quantity)
  SELECT p_growth, id, 1 FROM services_catalog
  WHERE id IN ('hosting-php', 'fractional-webmaster', 'analytics', 'site-admin',
               'google-admin', 'review-responders', 'review-admin',
               'geo-aeo-llm', 'local-seo')
  ON CONFLICT (plan_id, service_id) DO NOTHING;

  -- Full: Growth items + social automation, auto-blogging, automated posts, content repurposing
  INSERT INTO subscription_plan_items (plan_id, service_id, quantity)
  SELECT p_full, id, 1 FROM services_catalog
  WHERE id IN ('hosting-php', 'fractional-webmaster', 'analytics', 'site-admin',
               'google-admin', 'review-responders', 'review-admin',
               'geo-aeo-llm', 'local-seo',
               'social-automation', 'auto-blogging', 'automated-posts', 'content-repurposing')
  ON CONFLICT (plan_id, service_id) DO NOTHING;
END $$;
