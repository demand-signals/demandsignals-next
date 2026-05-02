-- ── APPLY-043-2026-05-02.sql ───────────────────────────────────────
-- Inlined migration — paste into Supabase web SQL Editor.
--
-- 043a: cadence on invoice line items + term/subscription metadata on
--       invoices. Enables "all monthlies on Stripe card subscription,
--       one Send click, set and forget."

ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS cadence text NOT NULL DEFAULT 'one_time'
    CHECK (cadence IN ('one_time', 'monthly', 'annual'));

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS term_months integer
    CHECK (term_months IS NULL OR (term_months > 0 AND term_months <= 120)),
  ADD COLUMN IF NOT EXISTS until_cancelled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_intent text NOT NULL DEFAULT 'none'
    CHECK (subscription_intent IN ('none', 'pending', 'created'));

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_term_xor;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_term_xor CHECK (
    NOT (term_months IS NOT NULL AND until_cancelled = true)
  );

COMMENT ON COLUMN invoices.term_months IS
  'Number of cycles the recurring portion will run (e.g. 12 = 1 year on monthly). NULL when until_cancelled=true or when invoice has no recurring lines.';
COMMENT ON COLUMN invoices.until_cancelled IS
  'When true, the Stripe subscription runs indefinitely; admin or magic-link prospect can cancel.';
COMMENT ON COLUMN invoices.subscription_intent IS
  'none = pure one-time. pending = sub will be created when Payment Link is paid. created = sub is live.';
COMMENT ON COLUMN invoice_line_items.cadence IS
  'one_time = billed in this invoice only. monthly / annual = first cycle billed in this invoice, subsequent cycles billed by the Stripe subscription created on first payment.';

ALTER TABLE subscriptions
  ALTER COLUMN plan_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS parent_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_parent_invoice
  ON subscriptions(parent_invoice_id)
  WHERE parent_invoice_id IS NOT NULL;

COMMENT ON COLUMN subscriptions.parent_invoice_id IS
  'For invoice-driven subs (migration 043): the original DSIG invoice whose Payment Link captured the card. NULL for SOW-driven subs.';
