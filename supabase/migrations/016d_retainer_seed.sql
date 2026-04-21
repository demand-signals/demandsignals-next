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
