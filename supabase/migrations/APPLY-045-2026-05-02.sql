-- ── APPLY-045-2026-05-02.sql ───────────────────────────────────────
-- Inlined migration — paste into Supabase web SQL Editor.
--
-- 045a: extend invoice_scheduled_sends.kind to allow 'issue_and_send'
--       so admins can schedule draft invoices for future issuance.
-- 045b: create sow_scheduled_sends table — mirror of invoice queue for
--       SOW documents.
--
-- Per CLAUDE.md §12: this APPLY file inlines the SQL directly (no \i).
-- The web SQL Editor doesn't support psql backslash commands.

-- ── 045a ───────────────────────────────────────────────────────────

ALTER TABLE invoice_scheduled_sends
  DROP CONSTRAINT IF EXISTS invoice_scheduled_sends_kind_check;

ALTER TABLE invoice_scheduled_sends
  ADD CONSTRAINT invoice_scheduled_sends_kind_check
  CHECK (kind IN ('send', 'reminder', 'issue_and_send'));

COMMENT ON COLUMN invoice_scheduled_sends.kind IS
  'Discriminator: ''send'' = resend an already-issued invoice, ''reminder'' = pre/post-due reminder template, ''issue_and_send'' = issue a draft invoice then auto-fire email/SMS at the scheduled time.';

-- ── 045b ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sow_scheduled_sends (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sow_id          uuid NOT NULL REFERENCES sow_documents(id) ON DELETE CASCADE,
  channel         text NOT NULL CHECK (channel IN ('email', 'sms', 'both')),
  send_at         timestamptz NOT NULL,
  kind            text NOT NULL DEFAULT 'send'
                  CHECK (kind IN ('send', 'issue_and_send')),
  status          text NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'fired', 'cancelled', 'failed')),
  fired_at        timestamptz,
  override_email  text,
  override_phone  text,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sow_scheduled_sends_due
  ON sow_scheduled_sends (send_at)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_sow_scheduled_sends_sow
  ON sow_scheduled_sends (sow_id);

ALTER TABLE sow_scheduled_sends ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE sow_scheduled_sends IS
  'Deferred-send queue for SOWs. Cron at /api/cron/scheduled-sends fires due rows every 5 minutes. service_role only.';

COMMENT ON COLUMN sow_scheduled_sends.kind IS
  '''send'' = resend an already-issued SOW. ''issue_and_send'' = issue a draft SOW (render PDF, flip status, auto-email) at the scheduled time.';
