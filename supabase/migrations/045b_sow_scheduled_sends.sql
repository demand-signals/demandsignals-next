-- ── 045b_sow_scheduled_sends.sql ────────────────────────────────────
-- Mirror of invoice_scheduled_sends for SOW documents. Lets admin queue
-- a draft SOW for issuance + dispatch at a future time, OR queue a
-- resend of an already-issued SOW.
--
-- Status lifecycle and cron semantics mirror invoice_scheduled_sends
-- exactly — see 039a/041a/045a for the rationale.
--
-- 'kind' values for SOW:
--   'send'           — resend an already-issued SOW (status sent/accepted)
--   'issue_and_send' — issue a draft SOW (render PDF, flip draft→sent,
--                      auto-email) at the scheduled time
--
-- Why two tables instead of one: invoice/SOW use different parent-id
-- columns and different dispatch helpers. Sharing the queue would mean
-- a polymorphic discriminator (parent_kind: 'invoice'|'sow') and split
-- branching everywhere downstream. Two parallel tables, one cron that
-- iterates both, is cleaner.

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
