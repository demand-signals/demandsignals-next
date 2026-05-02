-- ── 041a_invoice_reminders.sql ─────────────────────────────────────
-- Extends invoice_scheduled_sends with reminder primitives.
--
-- Background: 039a created invoice_scheduled_sends as a deferred-send
-- queue. The cron at /api/cron/scheduled-sends drains it every 5 min.
-- 041a generalizes this queue to also carry REMINDERS — pre-due
-- preemptive reminders and post-due chase reminders.
--
-- A reminder is a scheduled send with kind='reminder' + reminder_label
-- (e.g. "3 days before due", "Past due — 7 days"). The dispatch helpers
-- in invoice-send.ts switch on `kind` to pick a reminder-flavored
-- subject + body template. Same recipient resolution, same delivery
-- log writes, same activity-log writes.
--
-- Why one queue table instead of two: the cron logic is identical for
-- both kinds (find due rows, claim, dispatch, flip status). Splitting
-- into invoice_reminders + invoice_scheduled_sends would mean two
-- crons, two sets of admin UIs, two sets of dedup logic. One queue
-- with a discriminator is cheaper.

ALTER TABLE invoice_scheduled_sends
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'send'
    CHECK (kind IN ('send', 'reminder')),
  ADD COLUMN IF NOT EXISTS reminder_label text;

-- Backfill all existing rows to kind='send' (the only kind that existed
-- before this migration). DEFAULT 'send' on the ADD COLUMN handles new
-- rows; this UPDATE is for the historical ones.
UPDATE invoice_scheduled_sends SET kind = 'send' WHERE kind IS NULL;

-- Per-invoice reminder list lookup (admin UI: "show all reminders for
-- this invoice"). Partial index on kind='reminder' keeps the index
-- small even as fired/cancelled rows accumulate.
CREATE INDEX IF NOT EXISTS idx_invoice_scheduled_sends_reminders
  ON invoice_scheduled_sends (invoice_id, send_at)
  WHERE kind = 'reminder';

COMMENT ON COLUMN invoice_scheduled_sends.kind IS
  'Discriminator: ''send'' = one-time deferred dispatch (default), ''reminder'' = pre/post-due reminder with its own template.';

COMMENT ON COLUMN invoice_scheduled_sends.reminder_label IS
  'Human-readable label for reminder rows (e.g. "3 days before due", "Past due — 7 days"). Populated only when kind=''reminder''.';
