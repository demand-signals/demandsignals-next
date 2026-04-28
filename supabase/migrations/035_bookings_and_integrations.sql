-- 035: bookings + integrations tables for the quote→booked-meeting flow.
--
-- integrations holds OAuth refresh tokens for accounts the platform impersonates
--   (today: demandsignals@gmail.com's calendar).
-- bookings is the canonical source for every meeting — quote-driven today,
--   /book-page-driven later. host_email left flexible so multi-host is a
--   one-line config change when the team grows.

CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  account_email text NOT NULL,
  scopes text[] NOT NULL,
  access_token text,
  access_token_expires_at timestamptz,
  refresh_token text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  connected_at timestamptz NOT NULL DEFAULT now(),
  connected_by uuid REFERENCES admin_users(id),
  revoked_at timestamptz,
  UNIQUE(provider, account_email)
);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('quote', 'public_book', 'admin_manual')),
  quote_session_id uuid REFERENCES quote_sessions(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  host_email text NOT NULL,
  attendee_email text NOT NULL,
  attendee_name text,
  attendee_phone text,                       -- E.164 if present
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Los_Angeles',
  google_event_id text NOT NULL,
  google_meet_link text,
  google_meet_id text,
  reminder_24h_sent_at timestamptz,
  reminder_1h_sent_at timestamptz,
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  cancelled_at timestamptz,
  cancelled_by text CHECK (cancelled_by IN ('prospect', 'admin', 'system') OR cancelled_by IS NULL),
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_quote_session
  ON bookings(quote_session_id) WHERE quote_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_prospect
  ON bookings(prospect_id) WHERE prospect_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_start_at ON bookings(start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_reminders_24h
  ON bookings(start_at) WHERE status = 'confirmed' AND reminder_24h_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_reminders_1h
  ON bookings(start_at) WHERE status = 'confirmed' AND reminder_1h_sent_at IS NULL;

ALTER TABLE quote_sessions
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attendee_email text,
  ADD COLUMN IF NOT EXISTS offered_slot_ids jsonb DEFAULT '[]'::jsonb;

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

INSERT INTO quote_config (key, value)
VALUES ('booking_reminders_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE integrations IS 'OAuth refresh tokens for accounts the platform impersonates (Google Calendar, future providers).';
COMMENT ON TABLE bookings IS 'Canonical booked-meeting record. Source today: quote AI booking flow. Future: public /book page.';
COMMENT ON COLUMN bookings.attendee_phone IS 'E.164 phone resolved from prospects.owner_phone or quote_sessions verified phone. Null if unavailable; SMS dispatch skips when null.';
