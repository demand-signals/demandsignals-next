-- ============================================================
-- Syndication — Blog Cross-Posting + OAuth Token Storage
-- Migration: 003_syndication_log.sql
-- ============================================================

-- ── Syndication log (tracks what was posted where) ──────────

CREATE TABLE IF NOT EXISTS syndication_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL,
  platform      text NOT NULL CHECK (platform IN ('blogger', 'tumblr')),
  platform_url  text,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message text,
  posted_by     uuid REFERENCES admin_users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, platform)
);

CREATE INDEX IF NOT EXISTS idx_syndication_slug ON syndication_log (slug);
CREATE INDEX IF NOT EXISTS idx_syndication_platform ON syndication_log (platform);

ALTER TABLE syndication_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on syndication_log"
  ON syndication_log FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── OAuth tokens (stores access/refresh tokens for platforms) ──

CREATE TABLE IF NOT EXISTS oauth_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform        text NOT NULL UNIQUE CHECK (platform IN ('blogger', 'tumblr')),
  access_token    text NOT NULL,
  refresh_token   text,
  token_type      text DEFAULT 'Bearer',
  expires_at      timestamptz,
  scope           text,
  raw_response    jsonb,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on oauth_tokens"
  ON oauth_tokens FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
