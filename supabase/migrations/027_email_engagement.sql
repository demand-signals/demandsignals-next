-- ── 027_email_engagement.sql ────────────────────────────────────────
-- Tracks every email send + every Resend webhook event + every
-- magic-link page click. Per-document timeline queries via FK indexes.
-- See spec §5.2.

CREATE TABLE IF NOT EXISTS email_engagement (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id              UUID NOT NULL,                 -- groups all events for one send
  resend_message_id    TEXT,                          -- Resend's id; NULL for SMTP-fallback sends
  kind                 TEXT NOT NULL,                 -- EmailKind: invoice, contact_form, etc.
  event_type           TEXT NOT NULL CHECK (event_type IN (
    'sent','delivered','opened','clicked','bounced','complained','delivery_delayed','page_visit','failed'
  )),
  to_address           TEXT,                          -- primary recipient (lowercased)
  subject              TEXT,                          -- snapshot at send time
  -- Optional FK to source documents. Exactly one of these is typically set.
  invoice_id           UUID REFERENCES invoices(id) ON DELETE SET NULL,
  sow_document_id      UUID REFERENCES sow_documents(id) ON DELETE SET NULL,
  receipt_id           UUID REFERENCES receipts(id) ON DELETE SET NULL,
  prospect_id          UUID REFERENCES prospects(id) ON DELETE SET NULL,
  -- Event-specific data (clicked_url, bounce_reason, ip, user_agent, etc.)
  event_data           JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency: same Resend webhook event delivered twice → no duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_email_engagement_resend_event
  ON email_engagement (resend_message_id, event_type, occurred_at)
  WHERE resend_message_id IS NOT NULL;

-- Per-document timeline lookups
CREATE INDEX IF NOT EXISTS idx_email_engagement_invoice
  ON email_engagement (invoice_id, occurred_at DESC) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_engagement_sow
  ON email_engagement (sow_document_id, occurred_at DESC) WHERE sow_document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_engagement_prospect
  ON email_engagement (prospect_id, occurred_at DESC) WHERE prospect_id IS NOT NULL;

-- Send-grouping lookup
CREATE INDEX IF NOT EXISTS idx_email_engagement_send_id
  ON email_engagement (send_id, occurred_at DESC);

-- Future alerting queries (e.g. "invoices sent but never opened in 7d")
CREATE INDEX IF NOT EXISTS idx_email_engagement_kind_event_time
  ON email_engagement (kind, event_type, occurred_at DESC);

ALTER TABLE email_engagement ENABLE ROW LEVEL SECURITY;
-- service_role only; admin RLS policy added when UI surface lands.
