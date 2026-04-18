-- ═══════════════════════════════════════════════════════════════════
-- DSIG INVOICING v2 — COMBINED MIGRATIONS (Phase A)
-- Date: 2026-04-18
-- Apply: Paste this entire file into Supabase SQL Editor → Run
-- Time: ~3 seconds total execution
-- ═══════════════════════════════════════════════════════════════════
--
-- This file combines 15 individual migration files for quick application.
-- Individual files remain in supabase/migrations/ for auditability.
--
-- SAFE TO RE-RUN. Every ADD COLUMN uses IF NOT EXISTS, every CREATE TABLE
-- uses IF NOT EXISTS, every INSERT uses ON CONFLICT DO NOTHING.
--
-- Applied file list (in order):
--   011a_invoices_versioning.sql
--   011b_invoices_automation.sql
--   011c_invoices_pdf_storage.sql
--   011d_invoices_payment_category.sql
--   011e_invoices_kind_column.sql
--   011f_invoices_stripe_cols.sql
--   011g_invoices_indexes.sql
--   011h_invoice_delivery_log.sql
--   011i_invoice_email_log.sql
--   012a_stripe_customers.sql
--   012b_subscription_plans.sql
--   012c_subscriptions.sql
--   012d_sow_documents.sql
--   013a_automation_config.sql
--   013b_prospects_delivery_pref.sql
-- ═══════════════════════════════════════════════════════════════════


-- ─── 011a: Invoices versioning ──────────────────────────────────────

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS public_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS supersedes_invoice_id uuid REFERENCES invoices(id),
  ADD COLUMN IF NOT EXISTS superseded_by_invoice_id uuid REFERENCES invoices(id),
  ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS void_reason text;


-- ─── 011b: Invoices automation flags ────────────────────────────────

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_trigger text,
  ADD COLUMN IF NOT EXISTS auto_sent boolean NOT NULL DEFAULT false;


-- ─── 011c: Invoices PDF storage ─────────────────────────────────────

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS pdf_storage_path text,
  ADD COLUMN IF NOT EXISTS pdf_rendered_at timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_version integer NOT NULL DEFAULT 1;


-- ─── 011d: Invoices payment + category + delivery ───────────────────

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS paid_method text,
  ADD COLUMN IF NOT EXISTS paid_note text,
  ADD COLUMN IF NOT EXISTS category_hint text,
  ADD COLUMN IF NOT EXISTS sent_via_channel text,
  ADD COLUMN IF NOT EXISTS sent_via_email_to text,
  ADD COLUMN IF NOT EXISTS public_viewed_count integer NOT NULL DEFAULT 0;


-- ─── 011e: Invoices kind discriminator ──────────────────────────────

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'business'
    CHECK (kind IN ('quote_driven','business','subscription_cycle','restaurant_rule'));

UPDATE invoices SET kind = 'quote_driven'
  WHERE quote_session_id IS NOT NULL AND kind = 'business';


-- ─── 011f: Invoices Stripe columns ──────────────────────────────────

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_link_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_link_url text,
  ADD COLUMN IF NOT EXISTS subscription_id uuid;


-- ─── 011g: Invoices indexes ─────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_public_uuid ON invoices (public_uuid);
CREATE INDEX IF NOT EXISTS idx_invoices_supersedes ON invoices (supersedes_invoice_id) WHERE supersedes_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_auto_trigger ON invoices (auto_trigger) WHERE auto_trigger IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_auto_draft_queue ON invoices (created_at DESC) WHERE auto_generated = true AND status = 'draft';
CREATE INDEX IF NOT EXISTS idx_invoices_kind ON invoices (kind);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON invoices (stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices (subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_category_hint ON invoices (category_hint) WHERE category_hint IS NOT NULL;


-- ─── 011h: invoice_delivery_log ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoice_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','sms','manual')),
  recipient text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL,
  provider_message_id text,
  error_message text
);
CREATE INDEX IF NOT EXISTS idx_invoice_delivery_log_invoice ON invoice_delivery_log (invoice_id, sent_at DESC);
ALTER TABLE invoice_delivery_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read invoice_delivery_log" ON invoice_delivery_log;
DROP POLICY IF EXISTS "Admins can insert invoice_delivery_log" ON invoice_delivery_log;
CREATE POLICY "Admins can read invoice_delivery_log" ON invoice_delivery_log FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert invoice_delivery_log" ON invoice_delivery_log FOR INSERT WITH CHECK (is_admin());
REVOKE ALL ON invoice_delivery_log FROM anon;


-- ─── 011i: invoice_email_log ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoice_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sent_to text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  smtp_message_id text,
  success boolean NOT NULL,
  error_message text
);
CREATE INDEX IF NOT EXISTS idx_invoice_email_log_invoice ON invoice_email_log (invoice_id, sent_at DESC);
ALTER TABLE invoice_email_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read invoice_email_log" ON invoice_email_log;
DROP POLICY IF EXISTS "Admins can insert invoice_email_log" ON invoice_email_log;
CREATE POLICY "Admins can read invoice_email_log" ON invoice_email_log FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert invoice_email_log" ON invoice_email_log FOR INSERT WITH CHECK (is_admin());
REVOKE ALL ON invoice_email_log FROM anon;


-- ─── 012a: Stripe customers + events ────────────────────────────────

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;
CREATE INDEX IF NOT EXISTS idx_prospects_stripe_customer_id ON prospects (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  processing_result text,
  error_message text
);
CREATE INDEX IF NOT EXISTS idx_stripe_events_type_time ON stripe_events (event_type, processed_at DESC);
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read stripe_events" ON stripe_events;
CREATE POLICY "Admins read stripe_events" ON stripe_events FOR SELECT USING (is_admin());
REVOKE ALL ON stripe_events FROM anon;


-- ─── 012b: subscription_plans ───────────────────────────────────────

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
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans (active, created_at DESC);
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read subscription_plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins insert subscription_plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins update subscription_plans" ON subscription_plans;
CREATE POLICY "Admins read subscription_plans" ON subscription_plans FOR SELECT USING (is_admin());
CREATE POLICY "Admins insert subscription_plans" ON subscription_plans FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins update subscription_plans" ON subscription_plans FOR UPDATE USING (is_admin());
REVOKE ALL ON subscription_plans FROM anon;


-- ─── 012c: subscriptions instances ──────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','trialing','past_due','canceled','paused')),
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
CREATE INDEX IF NOT EXISTS idx_subscriptions_prospect ON subscriptions (prospect_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_invoice ON subscriptions (next_invoice_date) WHERE status IN ('active','trialing');
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

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
CREATE POLICY "Admins read subscriptions" ON subscriptions FOR SELECT USING (is_admin());
CREATE POLICY "Admins insert subscriptions" ON subscriptions FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins update subscriptions" ON subscriptions FOR UPDATE USING (is_admin());
REVOKE ALL ON subscriptions FROM anon;


-- ─── 012d: sow_documents + generate_sow_number() ────────────────────

CREATE SEQUENCE IF NOT EXISTS sow_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_sow_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $func_gen_sow$
DECLARE
  next_num bigint;
  year_part text;
BEGIN
  next_num := nextval('sow_number_seq');
  year_part := to_char(now(), 'YYYY');
  RETURN 'SOW-' || year_part || '-' || lpad(next_num::text, 4, '0');
END;
$func_gen_sow$;

REVOKE EXECUTE ON FUNCTION generate_sow_number FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_sow_number TO service_role;

CREATE TABLE IF NOT EXISTS sow_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sow_number text NOT NULL UNIQUE,
  public_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  quote_session_id uuid REFERENCES quote_sessions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','accepted','declined','void')),
  title text NOT NULL,
  scope_summary text,
  deliverables jsonb NOT NULL DEFAULT '[]'::jsonb,
  timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  pricing jsonb NOT NULL DEFAULT '{}'::jsonb,
  payment_terms text,
  guarantees text,
  notes text,
  pdf_storage_path text,
  pdf_rendered_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  accepted_signature text,
  accepted_ip text,
  declined_at timestamptz,
  decline_reason text,
  voided_at timestamptz,
  void_reason text,
  deposit_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sow_documents_public_uuid ON sow_documents (public_uuid);
CREATE INDEX IF NOT EXISTS idx_sow_documents_prospect ON sow_documents (prospect_id);
CREATE INDEX IF NOT EXISTS idx_sow_documents_status ON sow_documents (status);
ALTER TABLE sow_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins full sow_documents" ON sow_documents;
CREATE POLICY "Admins full sow_documents" ON sow_documents FOR ALL USING (is_admin()) WITH CHECK (is_admin());
REVOKE ALL ON sow_documents FROM anon;
REVOKE ALL ON SEQUENCE sow_number_seq FROM anon;


-- ─── 013a: Config kill-switches ─────────────────────────────────────

INSERT INTO quote_config (key, value) VALUES
  ('automated_invoicing_enabled', 'true'),
  ('stripe_enabled', 'false'),
  ('sms_delivery_enabled', 'false'),
  ('email_delivery_enabled', 'false'),
  ('subscription_cycle_cron_enabled', 'false')
ON CONFLICT (key) DO NOTHING;


-- ─── 013b: Prospects delivery preference ────────────────────────────

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS delivery_preference text NOT NULL DEFAULT 'both'
    CHECK (delivery_preference IN ('email_only','sms_only','both'));


-- ═══════════════════════════════════════════════════════════════════
-- VERIFICATION (run these after applying)
-- ═══════════════════════════════════════════════════════════════════

-- 1. Expect 15 new columns on invoices:
--    SELECT COUNT(*) FROM information_schema.columns WHERE table_name='invoices';
--    (was ~20, now ~34-35)

-- 2. Expect 6 new tables:
--    SELECT table_name FROM information_schema.tables
--    WHERE table_name IN ('invoice_delivery_log','invoice_email_log','stripe_events',
--                         'subscription_plans','subscriptions','sow_documents');
--    -- Expect 6 rows

-- 3. Expect new config rows:
--    SELECT key, value FROM quote_config WHERE key LIKE '%_enabled' ORDER BY key;
--    -- Expect at least 5 rows

-- 4. generate_sow_number() function:
--    SELECT generate_sow_number();
--    -- Expect: SOW-2026-0001

-- 5. Sanity check — existing RLS still works:
--    This is a Node test, not SQL: run `node scripts/test-quote-rls.mjs`
--    from the repo root. Expect 25/25 pass.
