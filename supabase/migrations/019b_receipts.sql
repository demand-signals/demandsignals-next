-- 019b: Receipts. One receipt per payment event against an invoice.
-- A partially-paid invoice accumulates multiple receipts. Full payment
-- can be a single receipt or the sum of several.

CREATE TABLE IF NOT EXISTS receipts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number     text NOT NULL UNIQUE,  -- RCT-HANG-042326A
  invoice_id         uuid NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  prospect_id        uuid NOT NULL REFERENCES prospects(id) ON DELETE RESTRICT,
  amount_cents       integer NOT NULL CHECK (amount_cents > 0),
  currency           text NOT NULL DEFAULT 'USD',
  payment_method     text NOT NULL CHECK (payment_method IN ('stripe','check','wire','cash','other','trade','zero_balance')),
  payment_reference  text,  -- check #, wire trace, stripe charge id, etc.
  paid_at            timestamptz NOT NULL DEFAULT now(),
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_invoice_id ON receipts (invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_prospect_id ON receipts (prospect_id);
CREATE INDEX IF NOT EXISTS idx_receipts_paid_at ON receipts (paid_at DESC);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read receipts" ON receipts;
DROP POLICY IF EXISTS "Admins write receipts" ON receipts;
CREATE POLICY "Admins read receipts" ON receipts FOR SELECT USING (is_admin());
CREATE POLICY "Admins write receipts" ON receipts FOR ALL USING (is_admin()) WITH CHECK (is_admin());

REVOKE ALL ON receipts FROM anon, authenticated;
