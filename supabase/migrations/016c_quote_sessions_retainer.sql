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
