-- 012a: Stripe integration — link Stripe customer to prospect + event idempotency.

-- Stripe customer link on prospects. Nullable; created on demand when
-- first Payment Link for that prospect is generated.
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

CREATE INDEX IF NOT EXISTS idx_prospects_stripe_customer_id
  ON prospects (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Webhook idempotency: every processed event stored with UNIQUE stripe_event_id.
-- Duplicate webhook deliveries become no-ops. Critical for financial correctness.
CREATE TABLE IF NOT EXISTS stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  processing_result text,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type_time
  ON stripe_events (event_type, processed_at DESC);

ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read stripe_events" ON stripe_events;
CREATE POLICY "Admins read stripe_events" ON stripe_events
  FOR SELECT USING (is_admin());

REVOKE ALL ON stripe_events FROM anon;
