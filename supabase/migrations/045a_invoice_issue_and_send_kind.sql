-- ── 045a_invoice_issue_and_send_kind.sql ────────────────────────────
-- Extends invoice_scheduled_sends.kind to allow scheduling a draft
-- invoice for issue-then-send at a future timestamp. Lets admin compose
-- at midnight and have the invoice issue + auto-fire email/SMS in the
-- morning.
--
-- 'issue_and_send' semantics (cron handler):
--   1. Fetch the invoice; if status != 'draft', mark schedule failed
--      with error 'invoice_not_draft' and skip.
--   2. Run the issuance helper: render PDF, upload to R2, flip status
--      draft → sent (or paid for $0), then dispatch the channel-aware
--      email/SMS the same way the synchronous /send route does.
--   3. Mark schedule fired on success.
--
-- Why one queue table not two: identical cron, identical activity log
-- writes, identical race-guard pattern. The `kind` discriminator is
-- already the model for 'send' vs 'reminder' (added in 041a).

ALTER TABLE invoice_scheduled_sends
  DROP CONSTRAINT IF EXISTS invoice_scheduled_sends_kind_check;

ALTER TABLE invoice_scheduled_sends
  ADD CONSTRAINT invoice_scheduled_sends_kind_check
  CHECK (kind IN ('send', 'reminder', 'issue_and_send'));

COMMENT ON COLUMN invoice_scheduled_sends.kind IS
  'Discriminator: ''send'' = resend an already-issued invoice, ''reminder'' = pre/post-due reminder template, ''issue_and_send'' = issue a draft invoice then auto-fire email/SMS at the scheduled time.';
