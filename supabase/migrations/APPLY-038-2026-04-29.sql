-- ── APPLY-038-2026-04-29: activities IP + user_agent capture ────────
--
-- Paste this WHOLE file into the Supabase SQL Editor and Run.
-- Web editor doesn't support \i / \echo — body inlined.
-- Idempotent: safe to re-run.

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS ip inet,
  ADD COLUMN IF NOT EXISTS user_agent text;

COMMENT ON COLUMN activities.ip IS
  'Source IP of the actor when the activity is a public-surface view event. NULL for admin/agent-driven activities.';
COMMENT ON COLUMN activities.user_agent IS
  'HTTP User-Agent header from the same view event. NULL when not applicable.';

CREATE INDEX IF NOT EXISTS idx_activities_ip ON activities (ip)
  WHERE ip IS NOT NULL;

-- Verify after running:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name='activities' AND column_name IN ('ip','user_agent');
--   -- expect 2 rows.
