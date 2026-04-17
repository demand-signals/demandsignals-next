CREATE TABLE IF NOT EXISTS quote_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES quote_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_events_session_id ON quote_events (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_events_type ON quote_events (event_type);
CREATE INDEX IF NOT EXISTS idx_quote_events_created_at ON quote_events (created_at DESC);

ALTER TABLE quote_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read quote_events" ON quote_events;
DROP POLICY IF EXISTS "Admins can insert quote_events" ON quote_events;

CREATE POLICY "Admins can read quote_events" ON quote_events FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert quote_events" ON quote_events FOR INSERT WITH CHECK (is_admin());

REVOKE ALL ON quote_events FROM anon;
