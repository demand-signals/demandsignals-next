-- ── 038_activities_ip_ua.sql ──────────────────────────────────────
-- Adds source IP + user-agent capture to the activities timeline so
-- view-events on public surfaces (SOW magic links, invoice magic
-- links, quote shares) show WHO viewed (by IP) + WHAT browser.
--
-- Hunter directive 2026-04-29: ensure every public view writes an
-- activities row, with IP for extra audit signal.
--
-- Design notes:
--   - ip uses the inet type so Postgres can index range/CIDR queries
--     later if we ever need them (rate-limit lookups, abuse audit).
--   - user_agent capped at text — UA strings are bounded in practice
--     (~512 chars); no length cap means future bot UAs won't truncate
--     interesting bits.
--   - Both nullable because admin-action activities (notes, calls,
--     manual entries) won't have an IP/UA and shouldn't be forced
--     to fabricate one.
--   - Idempotent: ADD COLUMN IF NOT EXISTS — safe to re-run.

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS ip inet,
  ADD COLUMN IF NOT EXISTS user_agent text;

COMMENT ON COLUMN activities.ip IS
  'Source IP of the actor when the activity is a public-surface view event. NULL for admin/agent-driven activities.';
COMMENT ON COLUMN activities.user_agent IS
  'HTTP User-Agent header from the same view event. NULL when not applicable.';

-- IP index — helps "show me every prospect this IP has touched"
-- queries which are useful when investigating attribution or abuse.
CREATE INDEX IF NOT EXISTS idx_activities_ip ON activities (ip)
  WHERE ip IS NOT NULL;
