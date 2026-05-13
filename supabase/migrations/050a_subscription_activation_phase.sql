-- ─────────────────────────────────────────────────────────────────────
-- Migration 050a — subscriptions.activation_phase_id
-- ─────────────────────────────────────────────────────────────────────
-- Lets a subscription be tied to a specific project phase such that
-- the subscription activates (Stripe subscription created, status flips
-- from 'trialing' to 'active') the moment that phase marks complete.
--
-- Use case: deferred subscription start. A SOW's recurring deliverables
-- shouldn't start billing on SOW acceptance — they should start when
-- the build phase ends and the client transitions to ongoing service.
-- For SSMM (May 2026), monthly subscriptions activate when Phase 3
-- (the launch phase) marks complete.
--
-- Nullable: subscriptions without this set still activate immediately
-- via the existing convertSowToProject path (Stripe Plan C unchanged).
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS activation_phase_id uuid;

-- Index for the phase-complete handler's lookup.
CREATE INDEX IF NOT EXISTS idx_subscriptions_activation_phase
  ON subscriptions(activation_phase_id)
  WHERE activation_phase_id IS NOT NULL;

COMMENT ON COLUMN subscriptions.activation_phase_id IS
  'When set, this subscription is in deferred-start mode and will be activated (Stripe subscription created) when the named project phase marks complete. Use with status=''trialing'' and stripe_subscription_id IS NULL.';
