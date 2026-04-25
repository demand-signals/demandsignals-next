-- ── 025e_receipts_tik_method.sql ────────────────────────────────────
-- Extends receipts.payment_method to allow 'tik' for trade-in-kind
-- service-rendered receipts.
--
-- Drops the existing CHECK constraint (whatever its name) and replaces
-- with the expanded enum.

DO $$
DECLARE
  conname_to_drop TEXT;
BEGIN
  SELECT conname INTO conname_to_drop
  FROM pg_constraint
  WHERE conrelid = 'receipts'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%payment_method%';

  IF conname_to_drop IS NOT NULL THEN
    EXECUTE format('ALTER TABLE receipts DROP CONSTRAINT %I', conname_to_drop);
  END IF;
END $$;

ALTER TABLE receipts
  ADD CONSTRAINT receipts_payment_method_check
  CHECK (payment_method IN (
    'check', 'wire', 'stripe', 'cash', 'trade', 'tik', 'zero_balance', 'ach', 'card', 'manual_card', 'other'
  ));
