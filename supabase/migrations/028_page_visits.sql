-- ── 028_page_visits.sql ─────────────────────────────────────────────
-- Logs every magic-link page visit on DSIG-domain pages. Three-layer
-- attribution: UUID > cookie > IP+UA. See spec §5.3.

CREATE TABLE IF NOT EXISTS page_visits (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url                 TEXT NOT NULL,
  page_type                TEXT NOT NULL CHECK (page_type IN (
    'invoice','sow','quote','receipt','marketing','admin','other'
  )),
  -- Direct document linkage (one of, may be null for marketing visits)
  invoice_id               UUID REFERENCES invoices(id) ON DELETE SET NULL,
  sow_document_id          UUID REFERENCES sow_documents(id) ON DELETE SET NULL,
  receipt_id               UUID REFERENCES receipts(id) ON DELETE SET NULL,
  quote_session_id         UUID REFERENCES quote_sessions(id) ON DELETE SET NULL,
  -- Attribution
  prospect_id              UUID REFERENCES prospects(id) ON DELETE SET NULL,
  attribution_source       TEXT CHECK (attribution_source IN ('uuid','cookie','none')),
  -- Tracking context
  email_send_id            UUID,                                  -- from ?e= query param
  ip                       INET,
  user_agent               TEXT,
  referer                  TEXT,
  -- Future enrichment columns (populated by Project #1.5)
  ip_country               TEXT,
  ip_region                TEXT,
  ip_city                  TEXT,
  occurred_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-prospect timeline lookup (most common query)
CREATE INDEX IF NOT EXISTS idx_page_visits_prospect_time
  ON page_visits (prospect_id, occurred_at DESC) WHERE prospect_id IS NOT NULL;

-- Per-document timeline lookups
CREATE INDEX IF NOT EXISTS idx_page_visits_invoice
  ON page_visits (invoice_id, occurred_at DESC) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_visits_sow
  ON page_visits (sow_document_id, occurred_at DESC) WHERE sow_document_id IS NOT NULL;

-- IP-based grouping (e.g. office IP showing multiple prospects)
CREATE INDEX IF NOT EXISTS idx_page_visits_ip_time
  ON page_visits (ip, occurred_at DESC);

-- Send-correlation lookups
CREATE INDEX IF NOT EXISTS idx_page_visits_send
  ON page_visits (email_send_id) WHERE email_send_id IS NOT NULL;

ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;
-- service_role only; admin RLS policy added when UI surface lands.
