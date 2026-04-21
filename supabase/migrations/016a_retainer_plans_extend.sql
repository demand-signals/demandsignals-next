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
