-- ── 039a_invoice_scheduled_sends.sql ───────────────────────────────
-- Adds the deferred-send queue for invoices. Admin schedules a future
-- send; cron at /api/cron/scheduled-sends fires due rows every 5 min.
--
-- Status lifecycle:
--   scheduled  → admin created the row, send_at not yet reached
--   fired      → cron successfully dispatched (email and/or SMS sent)
--   cancelled  → admin cancelled before fire time
--   failed     → cron tried to dispatch, dispatch returned error
--
-- Idempotency: status flip is the dedup. Two concurrent cron firings
-- race; the loser sees status != 'scheduled' on its second SELECT and
-- skips. Acceptable trade-off — same pattern as booking-reminders.
--
-- The override_email/override_phone columns let admin re-route a
-- specific scheduled send without touching the prospect record.
--
-- created_by is a FK to auth.users so we can attribute scheduling to
-- a specific admin in the timeline. NULL for system-created (none today).

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

-- Cron lookup: due rows that haven't fired yet. Partial index keeps it
-- tiny — fired/cancelled/failed rows don't bloat the cron scan path.
CREATE INDEX IF NOT EXISTS idx_invoice_scheduled_sends_due
  ON invoice_scheduled_sends (send_at)
  WHERE status = 'scheduled';

-- Per-invoice list (admin UI: "show pending scheduled sends for this invoice")
CREATE INDEX IF NOT EXISTS idx_invoice_scheduled_sends_invoice
  ON invoice_scheduled_sends (invoice_id);

ALTER TABLE invoice_scheduled_sends ENABLE ROW LEVEL SECURITY;

-- service_role only. Admin reads/writes via API routes that hit
-- supabaseAdmin (service_role client). No anon access.
COMMENT ON TABLE invoice_scheduled_sends IS
  'Deferred-send queue for invoices. Cron at /api/cron/scheduled-sends fires due rows every 5 minutes. service_role only.';
