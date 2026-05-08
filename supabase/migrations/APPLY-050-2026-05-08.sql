-- ── APPLY-050-2026-05-08.sql ───────────────────────────────────────
-- Inlined migration — paste into Supabase web SQL Editor.
--
-- 050: cli_tokens + cli_token_audit (CLI bearer tokens for /handoff
--      Step 11.D and similar admin-controlled tooling).
-- Spec: docs/superpowers/specs/2026-05-08-cli-tokens-design.md
-- Plan: docs/superpowers/plans/2026-05-08-cli-tokens-plan.md Task 1

CREATE TABLE IF NOT EXISTS cli_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  prefix text NOT NULL,
  last4 text NOT NULL,
  token_hash text NOT NULL,
  created_by uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
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
  'CLI bearer tokens for /handoff and similar tooling. Plaintext value bcrypt-hashed; only prefix + last4 shown after creation. Shared across admin team — all admins can list, audit, and revoke any token. expires_at is optional; null = never expires.';

CREATE TABLE IF NOT EXISTS cli_token_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cli_token_id uuid REFERENCES cli_tokens(id) ON DELETE SET NULL,
  method text NOT NULL,
  path text NOT NULL,
  status_code integer NOT NULL,
  ip inet,
  user_agent text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cli_token_audit_token
  ON cli_token_audit(cli_token_id, created_at DESC)
  WHERE cli_token_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cli_token_audit_rate_limit
  ON cli_token_audit(cli_token_id, created_at DESC)
  WHERE status_code = 200;

COMMENT ON TABLE cli_token_audit IS
  'Append-only log of CLI bearer-auth attempts. Drives the per-token rate limit (60/hr successful POSTs).';

ALTER TABLE cli_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE cli_token_audit ENABLE ROW LEVEL SECURITY;
