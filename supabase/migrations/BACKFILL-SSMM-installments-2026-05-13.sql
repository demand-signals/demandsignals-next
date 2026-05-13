-- ─────────────────────────────────────────────────────────────────────
-- BACKFILL: SouthSide MMA (SSMM) project payment installments — V2
-- ─────────────────────────────────────────────────────────────────────
-- REVISED 2026-05-13 after re-querying: the three installments DO exist
-- on schedule 573d40dc-4051-4f5e-8694-97ddff4e1cfb. My earlier diagnostic
-- query used an ambiguous PostgREST join that silently errored, returning
-- (none). The actual state is:
--   #1 ($2,000, on_acceptance, status=paid, fired_at=2026-05-12)    — correct
--   #2 ($2,000, trigger_type=time, trigger_date=NULL, status=pending) — WRONG: needs to become milestone → Phase 2
--   #3 ($2,000, trigger_type=time, trigger_date=NULL, status=pending) — WRONG: needs to become milestone → Phase 3
--
-- "time with NULL date" is harmless (cron WHERE trigger_date <= today
-- never matches NULL), but it's also non-firing — that's why Phase 2
-- couldn't generate its deposit invoice. This backfill flips them to
-- milestone triggers tied to the correct phase ids.
--
-- ROOT CAUSE in the platform: the convert flow that built this schedule
-- created time triggers with NULL date instead of milestone triggers.
-- That bug needs a separate follow-up — see ConvertForm.tsx + payment-plans.ts
-- for the path that built this. Today's fix is data-level; the UI fix
-- will land in a follow-up commit.
--
-- ALSO includes migration 050a (subscriptions.activation_phase_id) inline,
-- because the subscription activation logic depends on this column.
--
-- Per project rule §12 — inlined for Supabase web SQL Editor.
-- ─────────────────────────────────────────────────────────────────────

BEGIN;

-- ── Migration 050a — subscriptions.activation_phase_id ─────────────────
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS activation_phase_id uuid;

CREATE INDEX IF NOT EXISTS idx_subscriptions_activation_phase
  ON subscriptions(activation_phase_id)
  WHERE activation_phase_id IS NOT NULL;

COMMENT ON COLUMN subscriptions.activation_phase_id IS
  'When set, this subscription is in deferred-start mode and will be activated (Stripe subscription created) when the named project phase marks complete. Use with status=trialing and stripe_subscription_id IS NULL.';

-- ── Flip installment #2: time→milestone (Phase 2) ──────────────────────
UPDATE payment_installments
SET
  trigger_type = 'milestone',
  trigger_date = NULL,
  trigger_milestone_id = '2e9ba975-3fb9-4fee-ad09-a2b1a146a7a5',  -- Phase 2 id
  description = COALESCE(description, 'Phase 2 Deposit')
WHERE schedule_id = '573d40dc-4051-4f5e-8694-97ddff4e1cfb'
  AND sequence = 2
  AND status = 'pending';

-- ── Flip installment #3: time→milestone (Phase 3) ──────────────────────
UPDATE payment_installments
SET
  trigger_type = 'milestone',
  trigger_date = NULL,
  trigger_milestone_id = 'c0684809-454c-43ed-88e5-ba135ddf1c9a',  -- Phase 3 id
  description = COALESCE(description, 'Phase 3 Deposit')
WHERE schedule_id = '573d40dc-4051-4f5e-8694-97ddff4e1cfb'
  AND sequence = 3
  AND status = 'pending';

-- ── Tie the two trialing subscriptions to Phase 3 activation ───────────
UPDATE subscriptions
SET
  activation_phase_id = 'c0684809-454c-43ed-88e5-ba135ddf1c9a',  -- Phase 3 id
  notes = 'Auto-created from SOW SOW-SSMM-050426A — DEFERRED activation: Stripe subscription will be created when Phase 3 marks complete (phase id c0684809-454c-43ed-88e5-ba135ddf1c9a). Start date will be set to phase-3 completion date at activation time.'
WHERE id IN (
  'e5e420eb-b759-4554-a25e-f20abfaa71f5',
  'c2929f9a-efd6-4b8e-a038-7d5ad9390d68'
);

COMMIT;

-- ── POST-RUN VERIFICATION ──────────────────────────────────────────────
-- Run after commit to confirm:
--
-- SELECT sequence, amount_cents, trigger_type, trigger_milestone_id,
--        status, fired_at, invoice_id, description
-- FROM payment_installments
-- WHERE schedule_id = '573d40dc-4051-4f5e-8694-97ddff4e1cfb'
-- ORDER BY sequence;
--
-- Expected:
--   #1 — $2,000  on_acceptance  status=paid           (Phase 1 Deposit)
--   #2 — $2,000  milestone      status=pending        (Phase 2 Deposit) → trigger_milestone_id=2e9ba975-…
--   #3 — $2,000  milestone      status=pending        (Phase 3 Deposit) → trigger_milestone_id=c0684809-…
--
-- SELECT id, override_monthly_amount_cents, status, stripe_subscription_id, activation_phase_id, notes
-- FROM subscriptions
-- WHERE prospect_id = '9cd442cb-34a6-43a9-a7f0-f3e06a13ccf9';
