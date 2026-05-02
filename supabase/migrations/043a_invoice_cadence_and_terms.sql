-- ── 043a_invoice_cadence_and_terms.sql ─────────────────────────────
-- Cadence on invoice line items + term/subscription metadata on invoices.
--
-- Background: invoices today only carry one-time line items. SOWs have
-- per-deliverable cadence (one_time / monthly / quarterly / annual) so
-- recurring billing flows live there. Hunter, 2026-05-02: invoices
-- need the same primitive + term — and crucially, the policy is "all
-- monthlies on Stripe card subscription, no exceptions; one Send
-- click, card captured once, set and forget."
--
-- Cadence values intentionally narrowed to (one_time / monthly /
-- annual). Quarterly was on the SOW list but not in scope today.
--
-- Term values:
--   - term_months = NULL + until_cancelled = TRUE  → run forever
--   - term_months = 12 / 24 / N + until_cancelled = FALSE → run N cycles
-- A constraint enforces exactly one model.
--
-- subscription_intent:
--   - 'none'        → invoice has no recurring lines (pure one-time)
--   - 'pending'     → invoice has recurring lines; Stripe sub will be
--                     created on Payment Link checkout (set-and-forget)
--   - 'created'     → Stripe sub has been spun up; invoice handles
--                     cycle 1 + the sub handles cycles 2..N
-- The webhook flips 'pending' → 'created' on checkout.session.completed.

ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS cadence text NOT NULL DEFAULT 'one_time'
    CHECK (cadence IN ('one_time', 'monthly', 'annual'));

-- Backfill is a no-op — the DEFAULT covers historical rows. New rows
-- written via PATCH /api/admin/invoices/[id] will pass cadence
-- explicitly once the UI is wired.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS term_months integer
    CHECK (term_months IS NULL OR (term_months > 0 AND term_months <= 120)),
  ADD COLUMN IF NOT EXISTS until_cancelled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_intent text NOT NULL DEFAULT 'none'
    CHECK (subscription_intent IN ('none', 'pending', 'created'));

-- Term invariant: exactly one model. Either:
--   - term_months IS NOT NULL AND until_cancelled = false  (fixed term)
--   - term_months IS NULL AND until_cancelled = true       (run forever)
--   - term_months IS NULL AND until_cancelled = false      (no recurring lines; default)
-- The forbidden combo is term_months IS NOT NULL AND until_cancelled = true.
ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_term_xor;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_term_xor CHECK (
    NOT (term_months IS NOT NULL AND until_cancelled = true)
  );

-- Per-invoice subscription lookup (admin UI: "show me the subscription
-- spun up by this invoice"). Only invoices that triggered a sub will
-- populate this; pure one-time invoices stay subscription_intent='none'.
COMMENT ON COLUMN invoices.term_months IS
  'Number of cycles the recurring portion will run (e.g. 12 = 1 year on monthly). NULL when until_cancelled=true or when invoice has no recurring lines.';
COMMENT ON COLUMN invoices.until_cancelled IS
  'When true, the Stripe subscription runs indefinitely; admin or magic-link prospect can cancel.';
COMMENT ON COLUMN invoices.subscription_intent IS
  'none = pure one-time. pending = sub will be created when Payment Link is paid. created = sub is live.';
COMMENT ON COLUMN invoice_line_items.cadence IS
  'one_time = billed in this invoice only. monthly / annual = first cycle billed in this invoice, subsequent cycles billed by the Stripe subscription created on first payment.';

-- Allow ad-hoc invoice-driven subscriptions (no plan_id) to land in the
-- same admin Subscriptions list as the SOW-driven ones. parent_invoice_id
-- gives webhooks a back-pointer for cycle-N invoice generation.
ALTER TABLE subscriptions
  ALTER COLUMN plan_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS parent_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_parent_invoice
  ON subscriptions(parent_invoice_id)
  WHERE parent_invoice_id IS NOT NULL;

COMMENT ON COLUMN subscriptions.parent_invoice_id IS
  'For invoice-driven subs (migration 043): the original DSIG invoice whose Payment Link captured the card. NULL for SOW-driven subs (those use plan_id + subscription_plans.sow_document_id).';
