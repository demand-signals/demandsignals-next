-- ── APPLY-039-2026-05-01: invoice_scheduled_sends queue ─────────────
--
-- Paste this WHOLE file into the Supabase SQL Editor and Run.
-- Web editor doesn't support \i / \echo — body inlined.
-- Idempotent: safe to re-run.
--
-- Adds the deferred-send queue used by /api/cron/scheduled-sends
-- (5-min cron) to fire admin-scheduled invoice email/SMS at a future
-- timestamp. See 039a_invoice_scheduled_sends.sql for design notes.

CREATE TABLE IF NOT EXISTS invoice_scheduled_sends (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  channel         text NOT NULL CHECK (channel IN ('email', 'sms', 'both')),
  send_at         timestamptz NOT NULL,
  status          text NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'fired', 'cancelled', 'failed')),
  fired_at        timestamptz,
  override_email  text,
  override_phone  text,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_invoice_scheduled_sends_due
  ON invoice_scheduled_sends (send_at)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_invoice_scheduled_sends_invoice
  ON invoice_scheduled_sends (invoice_id);

ALTER TABLE invoice_scheduled_sends ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE invoice_scheduled_sends IS
  'Deferred-send queue for invoices. Cron at /api/cron/scheduled-sends fires due rows every 5 minutes. service_role only.';

-- Verify after running:
--   SELECT table_name FROM information_schema.tables
--    WHERE table_name = 'invoice_scheduled_sends';
--   -- expect 1 row.
--
--   SELECT indexname FROM pg_indexes
--    WHERE tablename = 'invoice_scheduled_sends';
--   -- expect at least: invoice_scheduled_sends_pkey,
--   --                  idx_invoice_scheduled_sends_due,
--   --                  idx_invoice_scheduled_sends_invoice
