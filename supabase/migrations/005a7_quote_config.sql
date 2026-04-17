CREATE TABLE IF NOT EXISTS quote_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quote_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read quote_config" ON quote_config;
DROP POLICY IF EXISTS "Admins can insert quote_config" ON quote_config;
DROP POLICY IF EXISTS "Admins can update quote_config" ON quote_config;

CREATE POLICY "Admins can read quote_config" ON quote_config FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert quote_config" ON quote_config FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update quote_config" ON quote_config FOR UPDATE USING (is_admin());

REVOKE ALL ON quote_config FROM anon;

INSERT INTO quote_config (key, value, description) VALUES ('ai_enabled', 'true'::jsonb, 'Master kill switch. False = /quote falls back to manual configurator.') ON CONFLICT (key) DO NOTHING;
INSERT INTO quote_config (key, value, description) VALUES ('team_capacity', '3'::jsonb, 'Admin-set capacity signal 1-5. Referenced by AI for honest urgency.') ON CONFLICT (key) DO NOTHING;
INSERT INTO quote_config (key, value, description) VALUES ('daily_cost_cap_cents', '5000'::jsonb, 'Alert threshold: total AI spend per day in cents ($50 default).') ON CONFLICT (key) DO NOTHING;
INSERT INTO quote_config (key, value, description) VALUES ('session_cost_cap_cents', '200'::jsonb, 'Per-session hard cap in cents ($2 default).') ON CONFLICT (key) DO NOTHING;
INSERT INTO quote_config (key, value, description) VALUES ('catalog_version', '"2026.04.16-1"'::jsonb, 'Current pricing catalog version. Stamped on new sessions.') ON CONFLICT (key) DO NOTHING;
INSERT INTO quote_config (key, value, description) VALUES ('cadence_enabled', 'false'::jsonb, 'Outbound cadence SMS enabled. Requires A2P 10DLC Marketing campaign.') ON CONFLICT (key) DO NOTHING;
