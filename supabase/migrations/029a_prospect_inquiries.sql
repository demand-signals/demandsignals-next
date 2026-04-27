-- ── 029a: prospect_inquiries ─────────────────────────────────────
-- Unified inbound table fed by /api/inquiry (quick form), /api/contact
-- (full form), and (Project #3) portal_reply inbound. Every row has a
-- non-null prospect_id; resolution + insert are atomic via RPC (029c).

CREATE TABLE IF NOT EXISTS prospect_inquiries (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id           uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  source                text NOT NULL CHECK (source IN ('quick_form','contact_form','portal_reply')),

  name                  text NOT NULL,
  email                 text NOT NULL,
  phone                 text,
  business              text,
  service_interest      text,
  message               text,

  page_url              text NOT NULL,
  referer               text,
  attribution_source    text NOT NULL CHECK (attribution_source IN ('cookie','email_match','new')),
  page_visit_id         uuid REFERENCES page_visits(id) ON DELETE SET NULL,

  ip                    inet,
  user_agent            text,

  status                text NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new','read','responded','spam','archived')),
  read_at               timestamptz,
  responded_at          timestamptz,

  email_send_id         uuid,
  sms_dispatched        boolean NOT NULL DEFAULT false,
  sms_failure_count     integer NOT NULL DEFAULT 0,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prospect_inquiries_prospect_time
  ON prospect_inquiries (prospect_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospect_inquiries_status_time
  ON prospect_inquiries (status, created_at DESC) WHERE status = 'new';
CREATE INDEX IF NOT EXISTS idx_prospect_inquiries_email_lower
  ON prospect_inquiries (lower(email));

ALTER TABLE prospect_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read inquiries" ON prospect_inquiries;
CREATE POLICY "Admins read inquiries"
  ON prospect_inquiries FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admins update inquiries" ON prospect_inquiries;
CREATE POLICY "Admins update inquiries"
  ON prospect_inquiries FOR UPDATE USING (is_admin());
-- INSERT: service_role only (route uses supabaseAdmin); no admin policy.

DROP TRIGGER IF EXISTS prospect_inquiries_updated_at ON prospect_inquiries;
CREATE TRIGGER prospect_inquiries_updated_at
  BEFORE UPDATE ON prospect_inquiries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
