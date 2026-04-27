-- 019a: Trade-in-Kind (TIK) credit ledger.
-- When a SOW or Invoice has a TIK discount, cash owed is reduced by the TIK amount.
-- The TIK amount becomes a CLIENT→DSIG obligation (client owes services/goods to DSIG)
-- tracked here. Admin records draw-downs as the client delivers their trade.

CREATE TABLE IF NOT EXISTS trade_credits (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id            uuid NOT NULL REFERENCES prospects(id) ON DELETE RESTRICT,
  sow_document_id        uuid REFERENCES sow_documents(id) ON DELETE SET NULL,
  invoice_id             uuid REFERENCES invoices(id) ON DELETE SET NULL,
  original_amount_cents  integer NOT NULL CHECK (original_amount_cents >= 0),
  remaining_cents        integer NOT NULL CHECK (remaining_cents >= 0),
  description            text NOT NULL,
  status                 text NOT NULL DEFAULT 'outstanding'
                         CHECK (status IN ('outstanding','partial','fulfilled','written_off')),
  opened_at              timestamptz NOT NULL DEFAULT now(),
  closed_at              timestamptz,
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trade_credits_prospect ON trade_credits (prospect_id, status);
CREATE INDEX IF NOT EXISTS idx_trade_credits_outstanding
  ON trade_credits (prospect_id) WHERE status IN ('outstanding','partial');
CREATE INDEX IF NOT EXISTS idx_trade_credits_sow ON trade_credits (sow_document_id) WHERE sow_document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trade_credits_invoice ON trade_credits (invoice_id) WHERE invoice_id IS NOT NULL;

ALTER TABLE trade_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read trade_credits" ON trade_credits FOR SELECT USING (is_admin());
CREATE POLICY "Admins insert trade_credits" ON trade_credits FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins update trade_credits" ON trade_credits FOR UPDATE USING (is_admin());

REVOKE ALL ON trade_credits FROM anon;

CREATE TRIGGER trade_credits_set_updated_at BEFORE UPDATE ON trade_credits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Draw-downs: each row records a trade delivery from client to DSIG.
CREATE TABLE IF NOT EXISTS trade_credit_drawdowns (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_credit_id  uuid NOT NULL REFERENCES trade_credits(id) ON DELETE CASCADE,
  amount_cents     integer NOT NULL CHECK (amount_cents > 0),
  description      text NOT NULL,
  delivered_on     date NOT NULL DEFAULT CURRENT_DATE,
  recorded_by      uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trade_credit_drawdowns_credit
  ON trade_credit_drawdowns (trade_credit_id, delivered_on DESC);

ALTER TABLE trade_credit_drawdowns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read drawdowns" ON trade_credit_drawdowns FOR SELECT USING (is_admin());
CREATE POLICY "Admins insert drawdowns" ON trade_credit_drawdowns FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins update drawdowns" ON trade_credit_drawdowns FOR UPDATE USING (is_admin());
CREATE POLICY "Admins delete drawdowns" ON trade_credit_drawdowns FOR DELETE USING (is_admin());

REVOKE ALL ON trade_credit_drawdowns FROM anon;

-- TIK fields on SOW + invoice
ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS trade_credit_cents integer NOT NULL DEFAULT 0 CHECK (trade_credit_cents >= 0),
  ADD COLUMN IF NOT EXISTS trade_credit_description text;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS trade_credit_cents integer NOT NULL DEFAULT 0 CHECK (trade_credit_cents >= 0),
  ADD COLUMN IF NOT EXISTS trade_credit_description text,
  ADD COLUMN IF NOT EXISTS trade_credit_id uuid REFERENCES trade_credits(id) ON DELETE SET NULL;
