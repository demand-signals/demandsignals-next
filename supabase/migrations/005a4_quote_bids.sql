CREATE TABLE IF NOT EXISTS quote_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES quote_sessions(id) ON DELETE CASCADE,
  parent_bid_id uuid REFERENCES quote_bids(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  admin_response text,
  counter_items jsonb,
  counter_estimate_low integer,
  counter_estimate_high integer,
  responded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quote_bids DROP CONSTRAINT IF EXISTS quote_bids_amount_check;
ALTER TABLE quote_bids ADD CONSTRAINT quote_bids_amount_check CHECK (amount_cents >= 0);

ALTER TABLE quote_bids DROP CONSTRAINT IF EXISTS quote_bids_status_check;
ALTER TABLE quote_bids ADD CONSTRAINT quote_bids_status_check CHECK (status IN ('pending','accepted','countered','declined','expired'));

CREATE INDEX IF NOT EXISTS idx_quote_bids_session_id ON quote_bids (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_bids_status ON quote_bids (status);
CREATE INDEX IF NOT EXISTS idx_quote_bids_parent ON quote_bids (parent_bid_id) WHERE parent_bid_id IS NOT NULL;

ALTER TABLE quote_bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read quote_bids" ON quote_bids;
DROP POLICY IF EXISTS "Admins can insert quote_bids" ON quote_bids;
DROP POLICY IF EXISTS "Admins can update quote_bids" ON quote_bids;

CREATE POLICY "Admins can read quote_bids" ON quote_bids FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert quote_bids" ON quote_bids FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update quote_bids" ON quote_bids FOR UPDATE USING (is_admin());

REVOKE ALL ON quote_bids FROM anon;
