-- Quote Estimator Part 1 of 3: Tables, Indexes, RLS Policies
-- Run FIRST. Idempotent.

CREATE TABLE IF NOT EXISTS quote_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  session_token text NOT NULL UNIQUE,
  share_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  session_expires_at timestamptz,
  valid_until timestamptz,
  cloned_from_session_id uuid REFERENCES quote_sessions(id) ON DELETE SET NULL,
  catalog_version text,
  phone_encrypted text,
  phone_last_four text,
  phone_e164_hash text,
  phone_verified boolean NOT NULL DEFAULT false,
  phone_is_voip boolean,
  email text,
  email_verified boolean NOT NULL DEFAULT false,
  oauth_provider text,
  oauth_email text,
  oauth_name text,
  oauth_avatar text,
  oauth_at timestamptz,
  business_name text,
  business_type text,
  business_location text,
  location_count integer,
  service_count integer,
  growth_challenge text,
  discovery_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  existing_site_url text,
  build_path text,
  selected_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimate_low integer,
  estimate_high integer,
  monthly_low integer,
  monthly_high integer,
  timeline_weeks_low integer,
  timeline_weeks_high integer,
  payment_preference text,
  accuracy_pct integer NOT NULL DEFAULT 50,
  budget_signal text,
  missed_leads_monthly integer,
  avg_customer_value integer,
  comparison_packages jsonb,
  conversion_action text,
  preferred_channel text NOT NULL DEFAULT 'sms',
  handoff_offered boolean NOT NULL DEFAULT false,
  handoff_accepted boolean NOT NULL DEFAULT false,
  handoff_agent text,
  conversation_summary text,
  summarized_at timestamptz,
  total_tokens_used integer NOT NULL DEFAULT 0,
  total_cost_cents integer NOT NULL DEFAULT 0,
  last_ai_request_at timestamptz,
  ai_model_default text NOT NULL DEFAULT 'claude-sonnet-4-6',
  referrer text,
  referral_source text,
  referral_name text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device text,
  user_agent text,
  ip_address text,
  geolocation jsonb,
  screen_resolution text,
  browser_language text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quote_sessions DROP CONSTRAINT IF EXISTS quote_sessions_status_check;
ALTER TABLE quote_sessions ADD CONSTRAINT quote_sessions_status_check CHECK (status IN ('active','abandoned','converted','expired','blocked'));

ALTER TABLE quote_sessions DROP CONSTRAINT IF EXISTS quote_sessions_build_path_check;
ALTER TABLE quote_sessions ADD CONSTRAINT quote_sessions_build_path_check CHECK (build_path IS NULL OR build_path IN ('new','existing','rebuild'));

ALTER TABLE quote_sessions DROP CONSTRAINT IF EXISTS quote_sessions_payment_pref_check;
ALTER TABLE quote_sessions ADD CONSTRAINT quote_sessions_payment_pref_check CHECK (payment_preference IS NULL OR payment_preference IN ('upfront','monthly','milestone'));

ALTER TABLE quote_sessions DROP CONSTRAINT IF EXISTS quote_sessions_accuracy_check;
ALTER TABLE quote_sessions ADD CONSTRAINT quote_sessions_accuracy_check CHECK (accuracy_pct BETWEEN 0 AND 100);

ALTER TABLE quote_sessions DROP CONSTRAINT IF EXISTS quote_sessions_budget_check;
ALTER TABLE quote_sessions ADD CONSTRAINT quote_sessions_budget_check CHECK (budget_signal IS NULL OR budget_signal IN ('starter','growth','scale','enterprise'));

ALTER TABLE quote_sessions DROP CONSTRAINT IF EXISTS quote_sessions_conversion_check;
ALTER TABLE quote_sessions ADD CONSTRAINT quote_sessions_conversion_check CHECK (conversion_action IS NULL OR conversion_action IN ('booked_call','sent_estimate','lets_go','bought_single','research','bid_submitted','bid_accepted','abandoned'));

ALTER TABLE quote_sessions DROP CONSTRAINT IF EXISTS quote_sessions_channel_check;
ALTER TABLE quote_sessions ADD CONSTRAINT quote_sessions_channel_check CHECK (preferred_channel IN ('sms','email','both'));

ALTER TABLE quote_sessions DROP CONSTRAINT IF EXISTS quote_sessions_device_check;
ALTER TABLE quote_sessions ADD CONSTRAINT quote_sessions_device_check CHECK (device IS NULL OR device IN ('desktop','mobile','tablet'));

CREATE INDEX IF NOT EXISTS idx_quote_sessions_session_token ON quote_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_quote_sessions_share_token ON quote_sessions (share_token);
CREATE INDEX IF NOT EXISTS idx_quote_sessions_prospect_id ON quote_sessions (prospect_id);
CREATE INDEX IF NOT EXISTS idx_quote_sessions_phone_hash ON quote_sessions (phone_e164_hash) WHERE phone_e164_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quote_sessions_oauth_email ON quote_sessions (oauth_email) WHERE oauth_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quote_sessions_status_updated ON quote_sessions (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_sessions_active_updated ON quote_sessions (updated_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_quote_sessions_conversion ON quote_sessions (conversion_action) WHERE conversion_action IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quote_sessions_created_at ON quote_sessions (created_at DESC);

ALTER TABLE quote_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read quote_sessions" ON quote_sessions;
DROP POLICY IF EXISTS "Admins can insert quote_sessions" ON quote_sessions;
DROP POLICY IF EXISTS "Admins can update quote_sessions" ON quote_sessions;
DROP POLICY IF EXISTS "Admins can delete quote_sessions" ON quote_sessions;

CREATE POLICY "Admins can read quote_sessions" ON quote_sessions FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert quote_sessions" ON quote_sessions FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update quote_sessions" ON quote_sessions FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete quote_sessions" ON quote_sessions FOR DELETE USING (is_admin());

REVOKE ALL ON quote_sessions FROM anon;

CREATE TABLE IF NOT EXISTS quote_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES quote_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_events_session_id ON quote_events (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_events_type ON quote_events (event_type);
CREATE INDEX IF NOT EXISTS idx_quote_events_created_at ON quote_events (created_at DESC);

ALTER TABLE quote_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read quote_events" ON quote_events;
DROP POLICY IF EXISTS "Admins can insert quote_events" ON quote_events;

CREATE POLICY "Admins can read quote_events" ON quote_events FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert quote_events" ON quote_events FOR INSERT WITH CHECK (is_admin());

REVOKE ALL ON quote_events FROM anon;

CREATE TABLE IF NOT EXISTS quote_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES quote_sessions(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  channel text NOT NULL DEFAULT 'web',
  agent_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ai_model_used text,
  tokens_input integer,
  tokens_output integer,
  cost_cents integer,
  flagged boolean NOT NULL DEFAULT false,
  flag_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quote_messages DROP CONSTRAINT IF EXISTS quote_messages_role_check;
ALTER TABLE quote_messages ADD CONSTRAINT quote_messages_role_check CHECK (role IN ('ai','user','human_agent','system'));

ALTER TABLE quote_messages DROP CONSTRAINT IF EXISTS quote_messages_channel_check;
ALTER TABLE quote_messages ADD CONSTRAINT quote_messages_channel_check CHECK (channel IN ('web','sms','email'));

CREATE INDEX IF NOT EXISTS idx_quote_messages_session_id ON quote_messages (session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quote_messages_flagged ON quote_messages (flagged) WHERE flagged = true;
CREATE INDEX IF NOT EXISTS idx_quote_messages_agent ON quote_messages (agent_user_id) WHERE agent_user_id IS NOT NULL;

ALTER TABLE quote_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read quote_messages" ON quote_messages;
DROP POLICY IF EXISTS "Admins can insert quote_messages" ON quote_messages;
DROP POLICY IF EXISTS "Admins can update quote_messages" ON quote_messages;

CREATE POLICY "Admins can read quote_messages" ON quote_messages FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert quote_messages" ON quote_messages FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update quote_messages" ON quote_messages FOR UPDATE USING (is_admin());

REVOKE ALL ON quote_messages FROM anon;

CREATE TABLE IF NOT EXISTS quote_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES quote_sessions(id) ON DELETE CASCADE,
  parent_bid_id uuid REFERENCES quote_bids(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  admin_response text,
  counter_items jsonb,
  counter_estimate_low integer,
  counter_estimate_high integer,
  responded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quote_bids DROP CONSTRAINT IF EXISTS quote_bids_amount_check;
ALTER TABLE quote_bids ADD CONSTRAINT quote_bids_amount_check CHECK (amount_cents >= 0);

ALTER TABLE quote_bids DROP CONSTRAINT IF EXISTS quote_bids_status_check;
ALTER TABLE quote_bids ADD CONSTRAINT quote_bids_status_check CHECK (status IN ('pending','accepted','countered','declined','expired'));

CREATE INDEX IF NOT EXISTS idx_quote_bids_session_id ON quote_bids (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_bids_status ON quote_bids (status);
CREATE INDEX IF NOT EXISTS idx_quote_bids_parent ON quote_bids (parent_bid_id) WHERE parent_bid_id IS NOT NULL;

ALTER TABLE quote_bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read quote_bids" ON quote_bids;
DROP POLICY IF EXISTS "Admins can insert quote_bids" ON quote_bids;
DROP POLICY IF EXISTS "Admins can update quote_bids" ON quote_bids;

CREATE POLICY "Admins can read quote_bids" ON quote_bids FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert quote_bids" ON quote_bids FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update quote_bids" ON quote_bids FOR UPDATE USING (is_admin());

REVOKE ALL ON quote_bids FROM anon;

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  quote_session_id uuid REFERENCES quote_sessions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  subtotal_cents integer NOT NULL DEFAULT 0,
  discount_cents integer NOT NULL DEFAULT 0,
  total_due_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  due_date date,
  paid_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  voided_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('draft','sent','viewed','paid','void'));

CREATE INDEX IF NOT EXISTS idx_invoices_prospect_id ON invoices (prospect_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quote_session ON invoices (quote_session_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices (created_at DESC);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can update invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can delete invoices" ON invoices;

CREATE POLICY "Admins can read invoices" ON invoices FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert invoices" ON invoices FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update invoices" ON invoices FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete invoices" ON invoices FOR DELETE USING (is_admin());

REVOKE ALL ON invoices FROM anon;

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL,
  subtotal_cents integer NOT NULL DEFAULT 0,
  discount_pct integer NOT NULL DEFAULT 0,
  discount_cents integer NOT NULL DEFAULT 0,
  discount_label text,
  line_total_cents integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoice_line_items DROP CONSTRAINT IF EXISTS invoice_line_items_qty_check;
ALTER TABLE invoice_line_items ADD CONSTRAINT invoice_line_items_qty_check CHECK (quantity > 0);

ALTER TABLE invoice_line_items DROP CONSTRAINT IF EXISTS invoice_line_items_price_check;
ALTER TABLE invoice_line_items ADD CONSTRAINT invoice_line_items_price_check CHECK (unit_price_cents >= 0);

ALTER TABLE invoice_line_items DROP CONSTRAINT IF EXISTS invoice_line_items_disc_pct_check;
ALTER TABLE invoice_line_items ADD CONSTRAINT invoice_line_items_disc_pct_check CHECK (discount_pct BETWEEN 0 AND 100);

ALTER TABLE invoice_line_items DROP CONSTRAINT IF EXISTS invoice_line_items_disc_amt_check;
ALTER TABLE invoice_line_items ADD CONSTRAINT invoice_line_items_disc_amt_check CHECK (discount_cents >= 0);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items (invoice_id, sort_order);

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read invoice_line_items" ON invoice_line_items;
DROP POLICY IF EXISTS "Admins can insert invoice_line_items" ON invoice_line_items;
DROP POLICY IF EXISTS "Admins can update invoice_line_items" ON invoice_line_items;
DROP POLICY IF EXISTS "Admins can delete invoice_line_items" ON invoice_line_items;

CREATE POLICY "Admins can read invoice_line_items" ON invoice_line_items FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert invoice_line_items" ON invoice_line_items FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update invoice_line_items" ON invoice_line_items FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete invoice_line_items" ON invoice_line_items FOR DELETE USING (is_admin());

REVOKE ALL ON invoice_line_items FROM anon;

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
