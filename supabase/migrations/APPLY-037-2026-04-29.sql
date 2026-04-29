-- ── APPLY-037-2026-04-29: Security Advisor hardening ────────────────
--
-- Paste this WHOLE file into the Supabase SQL Editor and Run.
-- Web editor does NOT support psql meta-commands (\echo, \i) — so
-- the migration body is inlined here. Idempotent, safe to re-run.
--
-- This addresses the 12 WARNINGs Hunter pulled from Security Advisor
-- 2026-04-29:
--   - 6× anon/authenticated SECURITY DEFINER function exposure
--   - 14× RLS-enabled-no-policy tables (well, the warnings are at
--     INFO level for these, but rolling them in as part of the
--     hardening pass)
-- The 12th warning (Auth leaked-password protection) is dashboard-only
-- — see PART 3 at the bottom for instructions.

-- ── PART 1: Function EXECUTE grants ───────────────────────────────

-- auto_enable_rls(): internal admin ops. Never user-callable.
REVOKE EXECUTE ON FUNCTION public.auto_enable_rls() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_enable_rls() TO service_role;

-- rls_auto_enable(): same — internal ops.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;

-- expire_stale_sessions(): cron / admin ops. Never user-callable.
REVOKE EXECUTE ON FUNCTION public.expire_stale_sessions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_sessions() TO service_role;

-- generate_invoice_number(): server-side only via service_role.
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO service_role;

-- recompute_session_state(uuid): server-side via service_role.
REVOKE EXECUTE ON FUNCTION public.recompute_session_state(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_session_state(uuid) TO service_role;

-- is_admin(): authenticated callers can ask "am I admin?" — the
-- answer doesn't leak data, just confirms their own role. Anon
-- never benefits from calling, so revoke that.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- handle_inquiry_submission(...): the anon-facing quick-inquiry
-- form RPC. Anon access is INTENTIONAL — anon submits the form.
-- Authenticated callers don't need it. Revoke authenticated, keep
-- anon. The function itself validates inputs internally.
REVOKE EXECUTE ON FUNCTION public.handle_inquiry_submission(
  uuid, text, text, text, text, text, text, text, text, text, inet, text
) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_inquiry_submission(
  uuid, text, text, text, text, text, text, text, text, text, inet, text
) TO anon, service_role;

-- ── PART 2: Deny-all RLS policies on tables with RLS-enabled-no-policy.
-- All 14 of these are service-role-only by design. The deny-all policy
-- documents that intent and clears the advisor warning. Service_role
-- bypasses RLS so server-side API routes still work normally.

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'bookings',
    'campaign_assets',
    'campaign_posts',
    'campaign_scripts',
    'campaigns',
    'changelog_sources',
    'email_engagement',
    'integrations',
    'page_visits',
    'payment_installments',
    'payment_schedules',
    'platform_connections',
    'quote_sessions',
    'system_notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format(
        'DROP POLICY IF EXISTS "service_role_only_deny_others" ON public.%I',
        tbl
      );
      EXECUTE format(
        'CREATE POLICY "service_role_only_deny_others" ON public.%I '
        'FOR ALL TO public USING (false) WITH CHECK (false)',
        tbl
      );
      EXECUTE format(
        'COMMENT ON POLICY "service_role_only_deny_others" ON public.%I IS '
        '%L',
        tbl,
        'Deny-all to anon + authenticated. Service_role bypasses RLS — '
        'all access flows through service-role API routes by design. '
        'Migration 037 (2026-04-29).'
      );
    END IF;
  END LOOP;
END $$;

-- ── Verify after running ──────────────────────────────────────────
-- SELECT proname, p.proacl FROM pg_proc p
--   WHERE proname IN ('auto_enable_rls','rls_auto_enable','is_admin',
--     'handle_inquiry_submission','expire_stale_sessions',
--     'generate_invoice_number','recompute_session_state');
-- -- expect proacl entries showing only service_role (+ anon for
-- --   handle_inquiry_submission, +authenticated for is_admin).
--
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname='public'
--   AND policyname='service_role_only_deny_others';
-- -- expect 14 rows.

-- ── PART 3: Auth leaked-password protection (dashboard-only) ──────
-- After applying this migration, do one more thing in the Supabase UI:
--   1. Authentication → Providers → Settings
--   2. Find "Check passwords against compromised database"
--   3. Toggle ON, Save
--   4. Re-run Security Advisor to confirm all warnings clear.
