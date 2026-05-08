-- ── 047: client portal auth tables ─────────────────────────────────
-- Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §1
-- Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 1

-- Server-side session store. Each row is one device/login.
-- 30-day expiry. Multi-device supported (no per-prospect uniqueness).
-- Cookie holds a random 32-byte token; the JWT jti is recorded for
-- magic-link replay defense (jti can only mint a session once).
CREATE TABLE IF NOT EXISTS client_portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  cookie_token text NOT NULL UNIQUE,        -- 32 bytes hex, sent in dsig_portal cookie
  jti text UNIQUE,                          -- magic-link JWT jti consumed; null for OAuth sessions
  login_method text NOT NULL,               -- 'magic_link' | 'google_oauth'
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_reason text,                      -- 'manual' | 'logout' | 'admin_revoke' | 'rotation'
  CHECK (login_method IN ('magic_link', 'google_oauth'))
);

CREATE INDEX IF NOT EXISTS idx_cps_lookup
  ON client_portal_sessions(cookie_token)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cps_prospect
  ON client_portal_sessions(prospect_id, expires_at DESC);

COMMENT ON TABLE client_portal_sessions IS
  'Server-side session store for /portal. cookie_token is the value of the dsig_portal cookie; lookup is row-equality (no JWT decode). Logout revokes ALL active sessions for a prospect.';

-- Login attempt log. Every attempt — match or not — gets a row.
-- Drives the 5/hr/email rate limit. Also serves as an audit trail
-- and a feed for future "suspicious activity" alerting.
CREATE TABLE IF NOT EXISTS client_portal_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,                      -- normalized lowercase
  prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  matched boolean NOT NULL,                 -- did email resolve to a client?
  method text NOT NULL,                     -- 'magic_link_request' | 'magic_link_verify' | 'google_callback'
  ip inet,
  user_agent text,
  succeeded boolean NOT NULL DEFAULT false,
  failure_reason text,                      -- 'rate_limited' | 'invalid_token' | 'token_expired' |
                                            -- 'jti_replay' | 'email_not_client' | 'oauth_error' | 'oauth_state_invalid'
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

-- RLS — service role only; no direct client access. Portal data
-- access is constrained at the API/middleware layer, not at the row
-- level via auth.uid() (clients aren't Supabase auth users).
ALTER TABLE client_portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_login_attempts ENABLE ROW LEVEL SECURITY;
-- (No policies = service role bypasses RLS via SECURITY DEFINER admin
-- supabase client; anon/authenticated clients have zero access.)
