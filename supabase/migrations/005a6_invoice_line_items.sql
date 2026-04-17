CREATE TABLE IF NOT EXISTS invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL,
  subtotal_cents integer NOT NULL DEFAULT 0,
  discount_pct integer NOT NULL DEFAULT 0,
  discount_cents integer NOT NULL DEFAULT 0,
  discount_label text,
  line_total_cents integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoice_line_items DROP CONSTRAINT IF EXISTS invoice_line_items_qty_check;
ALTER TABLE invoice_line_items ADD CONSTRAINT invoice_line_items_qty_check CHECK (quantity > 0);

ALTER TABLE invoice_line_items DROP CONSTRAINT IF EXISTS invoice_line_items_price_check;
ALTER TABLE invoice_line_items ADD CONSTRAINT invoice_line_items_price_check CHECK (unit_price_cents >= 0);

ALTER TABLE invoice_line_items DROP CONSTRAINT IF EXISTS invoice_line_items_disc_pct_check;
ALTER TABLE invoice_line_items ADD CONSTRAINT invoice_line_items_disc_pct_check CHECK (discount_pct BETWEEN 0 AND 100);

ALTER TABLE invoice_line_items DROP CONSTRAINT IF EXISTS invoice_line_items_disc_amt_check;
ALTER TABLE invoice_line_items ADD CONSTRAINT invoice_line_items_disc_amt_check CHECK (discount_cents >= 0);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items (invoice_id, sort_order);

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read invoice_line_items" ON invoice_line_items;
DROP POLICY IF EXISTS "Admins can insert invoice_line_items" ON invoice_line_items;
DROP POLICY IF EXISTS "Admins can update invoice_line_items" ON invoice_line_items;
DROP POLICY IF EXISTS "Admins can delete invoice_line_items" ON invoice_line_items;

CREATE POLICY "Admins can read invoice_line_items" ON invoice_line_items FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert invoice_line_items" ON invoice_line_items FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update invoice_line_items" ON invoice_line_items FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete invoice_line_items" ON invoice_line_items FOR DELETE USING (is_admin());

REVOKE ALL ON invoice_line_items FROM anon;
