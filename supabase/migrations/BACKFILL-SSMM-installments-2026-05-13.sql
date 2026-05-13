-- ─────────────────────────────────────────────────────────────────────
-- BACKFILL: SouthSide MMA (SSMM) project payment installments
-- ─────────────────────────────────────────────────────────────────────
-- Context: project a086bffd-1e09-4aa2-8290-86925f436444 was manually
-- created from SOW SOW-SSMM-050426A (eac0e5cb-…). The convertSowToProject
-- flow ran once and created:
--   - project (4 phases)
--   - payment_schedule (573d40dc-…) with total_cents=600000
--   - 2 trialing subscription rows ($80 + $100 monthly, no Stripe linkage)
--   - 1 paid invoice INV-SSMM-051226A ($2,000) with payment_installment_id
--     pointing at e8b5bb2d-22ab-4757-9b1e-5529c151b383
-- BUT the 3 payment_installments rows themselves were never persisted
-- (or were deleted post-hoc). This backfill restores them.
--
-- After this runs:
--   - Installment #1 (id=e8b5bb2d-…, on_acceptance, $2k, status='paid',
--     fired_at=2026-05-12) — matches the dangling FK on INV-SSMM-051226A
--   - Installment #2 ($2k, trigger=milestone, milestone=Phase 2 id,
--     status='pending') — fires when Phase 2 marks complete
--   - Installment #3 ($2k, trigger=milestone, milestone=Phase 3 id,
--     status='pending') — fires when Phase 3 marks complete
--
-- Per project rule §12 — inlined for Supabase web SQL Editor.
--
-- ALSO includes migration 050a (subscriptions.activation_phase_id) inline,
-- because the subscription activation logic depends on this column.
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


-- 1. Insert installment #1 with explicit id to match the orphan FK on INV-SSMM-051226A.
INSERT INTO payment_installments (
  id,
  schedule_id,
  sequence,
  amount_cents,
  amount_paid_cents,
  currency_type,
  expected_payment_method,
  trigger_type,
  trigger_date,
  trigger_milestone_id,
  trigger_payment_id,
  status,
  invoice_id,
  trade_credit_id,
  description,
  fired_at,
  created_at
) VALUES (
  'e8b5bb2d-22ab-4757-9b1e-5529c151b383',
  '573d40dc-4051-4f5e-8694-97ddff4e1cfb',
  1,
  200000,
  200000,
  'cash',
  'check',
  'on_acceptance',
  NULL,
  NULL,
  NULL,
  'paid',
  'da93279f-0b49-4d13-8950-ba536256759f',
  NULL,
  'Phase 1 Deposit',
  '2026-05-12T23:56:03.608339+00:00',
  '2026-05-12T23:56:03.515837+00:00'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert installment #2 (Phase 2 deposit, milestone-triggered on Phase 2).
--    Phase 2 status is 'in_progress' as of this backfill, so it cannot fire
--    automatically — admin will use the "Send invoice now" button to issue it.
INSERT INTO payment_installments (
  schedule_id,
  sequence,
  amount_cents,
  amount_paid_cents,
  currency_type,
  expected_payment_method,
  trigger_type,
  trigger_date,
  trigger_milestone_id,
  trigger_payment_id,
  status,
  invoice_id,
  trade_credit_id,
  description,
  fired_at
) VALUES (
  '573d40dc-4051-4f5e-8694-97ddff4e1cfb',
  2,
  200000,
  0,
  'cash',
  'check',
  'milestone',
  NULL,
  '2e9ba975-3fb9-4fee-ad09-a2b1a146a7a5',  -- Phase 2 id
  NULL,
  'pending',
  NULL,
  NULL,
  'Phase 2 Deposit',
  NULL
);

-- 3. Insert installment #3 (Phase 3 deposit, milestone-triggered on Phase 3).
INSERT INTO payment_installments (
  schedule_id,
  sequence,
  amount_cents,
  amount_paid_cents,
  currency_type,
  expected_payment_method,
  trigger_type,
  trigger_date,
  trigger_milestone_id,
  trigger_payment_id,
  status,
  invoice_id,
  trade_credit_id,
  description,
  fired_at
) VALUES (
  '573d40dc-4051-4f5e-8694-97ddff4e1cfb',
  3,
  200000,
  0,
  'cash',
  'check',
  'milestone',
  NULL,
  'c0684809-454c-43ed-88e5-ba135ddf1c9a',  -- Phase 3 id
  NULL,
  'pending',
  NULL,
  NULL,
  'Phase 3 Deposit',
  NULL
);

-- 4. Fix the two trialing subscriptions:
--    - Set activation_phase_id to Phase 3 — they activate (Stripe sub
--      created, status flips to 'active') when Phase 3 marks complete.
--    - Update notes for visibility.
UPDATE subscriptions
SET
  activation_phase_id = 'c0684809-454c-43ed-88e5-ba135ddf1c9a',  -- Phase 3 id
  notes = 'Auto-created from SOW SOW-SSMM-050426A — DEFERRED activation: Stripe subscription will be created when Phase 3 marks complete (phase id ' ||
    'c0684809-454c-43ed-88e5-ba135ddf1c9a). Start date will be set to phase-3 completion date at activation time.'
WHERE id IN (
  'e5e420eb-b759-4554-a25e-f20abfaa71f5',
  'c2929f9a-efd6-4b8e-a038-7d5ad9390d68'
);

-- 5. Sanity check: schedule total should still equal sum of installment amounts
--    (3 × $2,000 = $6,000 = 600000 cents) — schedule total_cents already 600000.

COMMIT;

-- ── POST-RUN VERIFICATION QUERIES ──────────────────────────────────────
-- Run after commit to confirm state:
--
-- SELECT sequence, amount_cents, trigger_type, trigger_milestone_id,
--        status, fired_at, invoice_id
-- FROM payment_installments
-- WHERE schedule_id = '573d40dc-4051-4f5e-8694-97ddff4e1cfb'
-- ORDER BY sequence;
--
-- SELECT invoice_number, status, payment_installment_id, total_due_cents
-- FROM invoices WHERE invoice_number = 'INV-SSMM-051226A';
--
-- SELECT id, override_monthly_amount_cents, status, stripe_subscription_id, notes
-- FROM subscriptions
-- WHERE prospect_id = '9cd442cb-34a6-43a9-a7f0-f3e06a13ccf9';
