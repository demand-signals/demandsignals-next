-- ── 049: drop orphaned portal auth tables ──────────────────────────
-- Spec rev 2026-05-07: portal auth unified onto Supabase Auth via
-- the existing /admin-login Google OAuth flow. The standalone
-- magic-link + DSIG Portal OAuth client + session-mint pipeline
-- shipped in migration 047 is no longer used.
--
-- Tables 047 created:
--   client_portal_sessions          → drop (Supabase Auth replaces)
--   client_portal_login_attempts    → drop (audit feed of dead path)
--
-- 048 tables (project_notes, project_time_entries, portal_digests)
-- are NOT touched — they back the portal pages + daily digest, both
-- of which still ship.

DROP TABLE IF EXISTS client_portal_sessions;
DROP TABLE IF EXISTS client_portal_login_attempts;
