-- ── 025c_subscription_caps_and_pause.sql ────────────────────────────
-- Adds cycle_cap (max number of cycles before auto-cancel) and
-- paused_until (date the pause expires) to subscriptions.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cycle_cap INT,
  ADD COLUMN IF NOT EXISTS paused_until DATE;

CREATE INDEX IF NOT EXISTS idx_subscriptions_paused_until ON subscriptions(paused_until)
  WHERE paused_until IS NOT NULL;
