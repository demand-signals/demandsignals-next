-- ════════════════════════════════════════════════════════════════════
-- APPLY-026-027-028-2026-04-27.sql
-- Run in Supabase SQL Editor (web) to apply migrations 026, 027, 028.
-- Idempotent: each block uses IF NOT EXISTS guards.
--
-- Adds:
--   • system_notifications table (subsystem failure log)
--   • email_engagement table (every send + Resend webhook event + page visit cross-ref)
--   • page_visits table (DSIG-domain magic-link page tracking with 3-layer attribution)
-- ════════════════════════════════════════════════════════════════════

-- ── 026: system_notifications ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity         TEXT NOT NULL CHECK (severity IN ('info','warning','error','critical')),
  source           TEXT NOT NULL,
  title            TEXT NOT NULL,
  body             TEXT,
  context          JSONB NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_at  TIMESTAMPTZ,
  acknowledged_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  emailed_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_system_notifications_unread
  ON system_notifications (severity, created_at DESC)
  WHERE acknowledged_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_system_notifications_source
  ON system_notifications (source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_notifications_throttle
  ON system_notifications (source, (context->>'error_code'), emailed_at)
  WHERE emailed_at IS NOT NULL;
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;

-- ── 027: email_engagement ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_engagement (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id              UUID NOT NULL,
  resend_message_id    TEXT,
  kind                 TEXT NOT NULL,
  event_type           TEXT NOT NULL CHECK (event_type IN (
    'sent','delivered','opened','clicked','bounced','complained','delivery_delayed','page_visit','failed'
  )),
  to_address           TEXT,
  subject              TEXT,
  invoice_id           UUID REFERENCES invoices(id) ON DELETE SET NULL,
  sow_document_id      UUID REFERENCES sow_documents(id) ON DELETE SET NULL,
  receipt_id           UUID REFERENCES receipts(id) ON DELETE SET NULL,
  prospect_id          UUID REFERENCES prospects(id) ON DELETE SET NULL,
  event_data           JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_email_engagement_resend_event
  ON email_engagement (resend_message_id, event_type, occurred_at)
  WHERE resend_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_engagement_invoice
  ON email_engagement (invoice_id, occurred_at DESC) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_engagement_sow
  ON email_engagement (sow_document_id, occurred_at DESC) WHERE sow_document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_engagement_prospect
  ON email_engagement (prospect_id, occurred_at DESC) WHERE prospect_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_engagement_send_id
  ON email_engagement (send_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_engagement_kind_event_time
  ON email_engagement (kind, event_type, occurred_at DESC);
ALTER TABLE email_engagement ENABLE ROW LEVEL SECURITY;

-- ── 028: page_visits ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_visits (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url                 TEXT NOT NULL,
  page_type                TEXT NOT NULL CHECK (page_type IN (
    'invoice','sow','quote','receipt','marketing','admin','other'
  )),
  invoice_id               UUID REFERENCES invoices(id) ON DELETE SET NULL,
  sow_document_id          UUID REFERENCES sow_documents(id) ON DELETE SET NULL,
  receipt_id               UUID REFERENCES receipts(id) ON DELETE SET NULL,
  quote_session_id         UUID REFERENCES quote_sessions(id) ON DELETE SET NULL,
  prospect_id              UUID REFERENCES prospects(id) ON DELETE SET NULL,
  attribution_source       TEXT CHECK (attribution_source IN ('uuid','cookie','none')),
  email_send_id            UUID,
  ip                       INET,
  user_agent               TEXT,
  referer                  TEXT,
  ip_country               TEXT,
  ip_region                TEXT,
  ip_city                  TEXT,
  occurred_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_page_visits_prospect_time
  ON page_visits (prospect_id, occurred_at DESC) WHERE prospect_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_visits_invoice
  ON page_visits (invoice_id, occurred_at DESC) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_visits_sow
  ON page_visits (sow_document_id, occurred_at DESC) WHERE sow_document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_visits_ip_time
  ON page_visits (ip, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_send
  ON page_visits (email_send_id) WHERE email_send_id IS NOT NULL;
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;
