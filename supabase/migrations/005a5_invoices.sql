CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  quote_session_id uuid REFERENCES quote_sessions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  subtotal_cents integer NOT NULL DEFAULT 0,
  discount_cents integer NOT NULL DEFAULT 0,
  total_due_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  due_date date,
  paid_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  voided_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('draft','sent','viewed','paid','void'));

CREATE INDEX IF NOT EXISTS idx_invoices_prospect_id ON invoices (prospect_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quote_session ON invoices (quote_session_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices (created_at DESC);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can update invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can delete invoices" ON invoices;

CREATE POLICY "Admins can read invoices" ON invoices FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert invoices" ON invoices FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update invoices" ON invoices FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete invoices" ON invoices FOR DELETE USING (is_admin());

REVOKE ALL ON invoices FROM anon;
