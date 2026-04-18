-- 011e: Invoice kind discriminator. Distinguishes quote-driven, ad-hoc
-- business, subscription cycle, and Restaurant Rule invoices so admin
-- UI + filters can branch on kind.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'business'
    CHECK (kind IN ('quote_driven','business','subscription_cycle','restaurant_rule'));

-- Backfill existing rows: if quote_session_id is set, kind='quote_driven'.
UPDATE invoices SET kind = 'quote_driven'
  WHERE quote_session_id IS NOT NULL AND kind = 'business';
