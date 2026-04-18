-- 011i: Email-specific audit log. Separate from delivery_log because
-- email has SMTP-specific fields (message-id for deliverability tracking).

CREATE TABLE IF NOT EXISTS invoice_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sent_to text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  smtp_message_id text,
  success boolean NOT NULL,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_invoice_email_log_invoice
  ON invoice_email_log (invoice_id, sent_at DESC);

ALTER TABLE invoice_email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read invoice_email_log" ON invoice_email_log;
DROP POLICY IF EXISTS "Admins can insert invoice_email_log" ON invoice_email_log;

CREATE POLICY "Admins can read invoice_email_log" ON invoice_email_log
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert invoice_email_log" ON invoice_email_log
  FOR INSERT WITH CHECK (is_admin());

REVOKE ALL ON invoice_email_log FROM anon;
