-- ── APPLY-049-2026-05-07.sql ───────────────────────────────────────
-- Inlined migration — paste into Supabase web SQL Editor.
--
-- 049: drop client_portal_sessions + client_portal_login_attempts.
-- Portal auth unified onto Supabase Auth (admin's existing flow).
-- Spec rev: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md

DROP TABLE IF EXISTS client_portal_sessions;
DROP TABLE IF EXISTS client_portal_login_attempts;
