-- ── APPLY-047-2026-05-07.sql ───────────────────────────────────────
-- Inlined migration — paste into Supabase web SQL Editor.
--
-- 047: client portal auth tables (client_portal_sessions +
--      client_portal_login_attempts).
-- Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md
-- Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 1

CREATE TABLE IF NOT EXISTS client_portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  cookie_token text NOT NULL UNIQUE,
  jti text UNIQUE,
  login_method text NOT NULL,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_reason text,
  CHECK (login_method IN ('magic_link', 'google_oauth'))
);

CREATE INDEX IF NOT EXISTS idx_cps_lookup
  ON client_portal_sessions(cookie_token)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cps_prospect
  ON client_portal_sessions(prospect_id, expires_at DESC);

COMMENT ON TABLE client_portal_sessions IS
  'Server-side session store for /portal. cookie_token is the value of the dsig_portal cookie; lookup is row-equality (no JWT decode). Logout revokes ALL active sessions for a prospect.';

CREATE TABLE IF NOT EXISTS client_portal_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  matched boolean NOT NULL,
  method text NOT NULL,
  ip inet,
  user_agent text,
  succeeded boolean NOT NULL DEFAULT false,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (method IN ('magic_link_request', 'magic_link_verify', 'google_callback'))
);

CREATE INDEX IF NOT EXISTS idx_cpla_rate_limit
  ON client_portal_login_attempts(email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cpla_audit
  ON client_portal_login_attempts(prospect_id, created_at DESC)
  WHERE prospect_id IS NOT NULL;

COMMENT ON TABLE client_portal_login_attempts IS
  'Audit + rate-limit feed for /portal login. Every request logs a row; 5/hr/email cap drives silent rate-limit denial. succeeded=true means the side-effect happened (email sent / session minted).';

ALTER TABLE client_portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_login_attempts ENABLE ROW LEVEL SECURITY;
