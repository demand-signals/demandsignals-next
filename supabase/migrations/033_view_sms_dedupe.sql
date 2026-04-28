-- 033: Per-doc view-SMS dedupe.
-- Track when the admin team received the "client viewed your <doc>" SMS
-- alert. Set on first successful view-SMS dispatch; checked on subsequent
-- views to avoid re-spamming on refresh.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS view_sms_sent_at timestamptz;

ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS view_sms_sent_at timestamptz;
