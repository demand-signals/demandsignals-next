-- 023a: Trade-in-Kind fields on SOW documents.
-- Client pays a portion in trade (their services/goods delivered to DSIG)
-- instead of cash. Recorded as a credit until the trade is delivered.

ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS trade_credit_cents integer NOT NULL DEFAULT 0 CHECK (trade_credit_cents >= 0),
  ADD COLUMN IF NOT EXISTS trade_credit_description text;
