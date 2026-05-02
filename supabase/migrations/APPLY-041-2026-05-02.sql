-- ── APPLY-041-2026-05-02.sql ───────────────────────────────────────
-- Inlined migration — paste into Supabase web SQL Editor.
--
-- 041a: extend invoice_scheduled_sends with kind + reminder_label for the
--       reminders pipeline (pre-due preemptive + post-due chase).
--
-- Per CLAUDE.md §12: this APPLY file inlines the SQL directly (no \i).
-- The web SQL Editor doesn't support psql backslash commands.

-- ── 041a ───────────────────────────────────────────────────────────

ALTER TABLE invoice_scheduled_sends
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'send'
    CHECK (kind IN ('send', 'reminder')),
  ADD COLUMN IF NOT EXISTS reminder_label text;

UPDATE invoice_scheduled_sends SET kind = 'send' WHERE kind IS NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_scheduled_sends_reminders
  ON invoice_scheduled_sends (invoice_id, send_at)
  WHERE kind = 'reminder';

COMMENT ON COLUMN invoice_scheduled_sends.kind IS
  'Discriminator: ''send'' = one-time deferred dispatch (default), ''reminder'' = pre/post-due reminder with its own template.';

COMMENT ON COLUMN invoice_scheduled_sends.reminder_label IS
  'Human-readable label for reminder rows (e.g. "3 days before due", "Past due — 7 days"). Populated only when kind=''reminder''.';
