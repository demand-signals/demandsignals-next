-- 011h: Per-send delivery audit log. One row per SMS/email/manual send
-- attempt. Used by admin detail page "Delivery history" section.

CREATE TABLE IF NOT EXISTS invoice_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','sms','manual')),
  recipient text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL,
  provider_message_id text,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_invoice_delivery_log_invoice
  ON invoice_delivery_log (invoice_id, sent_at DESC);

ALTER TABLE invoice_delivery_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read invoice_delivery_log" ON invoice_delivery_log;
DROP POLICY IF EXISTS "Admins can insert invoice_delivery_log" ON invoice_delivery_log;

CREATE POLICY "Admins can read invoice_delivery_log" ON invoice_delivery_log
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert invoice_delivery_log" ON invoice_delivery_log
  FOR INSERT WITH CHECK (is_admin());

REVOKE ALL ON invoice_delivery_log FROM anon;
