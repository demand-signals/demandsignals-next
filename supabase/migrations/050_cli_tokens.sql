-- ── 050: cli_tokens + cli_token_audit ──────────────────────────────
-- Spec: docs/superpowers/specs/2026-05-08-cli-tokens-design.md
-- Plan: docs/superpowers/plans/2026-05-08-cli-tokens-plan.md Task 1
--
-- Adds a bearer-token credential surface for /handoff Step 11.D and
-- similar admin-controlled CLI tooling. Tokens are bcrypt-hashed;
-- plaintext shown ONCE at creation. Shared across the admin team via
-- Y:\.credentials\dsig.env (multi-workstation NAS).

CREATE TABLE IF NOT EXISTS cli_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Display fields
  name text NOT NULL,                       -- admin-chosen, e.g. "DSIG shared CLI"
  prefix text NOT NULL,                     -- first 12 chars of token, for display + index lookup
  last4 text NOT NULL,                      -- last 4 chars, for display
  -- Auth
  token_hash text NOT NULL,                 -- bcrypt(token), cost=10
  -- Who created it (audit only — does NOT gate visibility, all admins see all tokens)
  created_by uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  -- State
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,                   -- optional auto-expiry; null = never expires
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES admin_users(id),
  revoked_reason text
);

CREATE INDEX IF NOT EXISTS idx_cli_tokens_active
  ON cli_tokens(prefix)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cli_tokens_expiry_sweep
  ON cli_tokens(expires_at)
  WHERE expires_at IS NOT NULL AND revoked_at IS NULL;

COMMENT ON TABLE cli_tokens IS
  'CLI bearer tokens for /handoff and similar tooling. Plaintext value bcrypt-hashed; only prefix + last4 shown after creation. Shared across admin team — all admins can list, audit, and revoke any token (matches Y:\.credentials\dsig.env shared-across-workstations model). expires_at is optional; null = never expires.';

-- Append-only audit log. Every CLI bearer-auth attempt logs a row,
-- success or failure. Drives rate limiting + suspicious-activity tracking.
CREATE TABLE IF NOT EXISTS cli_token_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cli_token_id uuid REFERENCES cli_tokens(id) ON DELETE SET NULL,
  -- What the request was
  method text NOT NULL,                     -- 'POST' | 'GET'
  path text NOT NULL,                       -- '/api/cli/handoff/project-notes'
  status_code integer NOT NULL,             -- HTTP status returned
  -- Request metadata
  ip inet,
  user_agent text,
  -- Failure reason if status >= 400
  failure_reason text,                      -- 'invalid_token' | 'revoked_token' | 'token_expired' |
                                            -- 'rate_limited' | 'scope_denied' | 'no_token' | 'env_misconfig'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cli_token_audit_token
  ON cli_token_audit(cli_token_id, created_at DESC)
  WHERE cli_token_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cli_token_audit_rate_limit
  ON cli_token_audit(cli_token_id, created_at DESC)
  WHERE status_code = 200;

COMMENT ON TABLE cli_token_audit IS
  'Append-only log of CLI bearer-auth attempts. Drives the per-token rate limit (60/hr successful POSTs) and is the audit feed for /admin/account/cli-tokens detail views. Token VALUE is never logged here — only cli_token_id back-reference.';

ALTER TABLE cli_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE cli_token_audit ENABLE ROW LEVEL SECURITY;
-- Service-role only; admin API routes write via supabaseAdmin.
