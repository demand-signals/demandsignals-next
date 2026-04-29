-- ── 037_security_hardening.sql ────────────────────────────────────
-- Address Supabase Security Advisor warnings (2026-04-29):
--
--   1. Revoke EXECUTE from anon/authenticated on SECURITY DEFINER
--      functions that are internal-only ops. Keep auth on the few
--      that need it (is_admin for authenticated callers checking
--      their own role; handle_inquiry_submission for the anon-facing
--      quick-inquiry form). Service_role always retains EXECUTE
--      because it bypasses GRANTs on functions like everything else.
--
--   2. Add explicit deny-all RLS policies on tables that have RLS
--      enabled but no policies. Functionally these are already
--      deny-all (RLS on + no policy = deny non-service-role) but
--      Supabase advisor flags missing policies as a config smell.
--      Adding a deny-all policy with a name+comment makes the intent
--      auditable.
--
--   3. Auth leaked-password protection — toggled in the Supabase
--      dashboard (Authentication → Providers → Settings →
--      "Check passwords against compromised database"). Cannot be
--      set via SQL. Hunter must flip it manually.

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

-- ── PART 2: Deny-all RLS policies on tables with RLS enabled but
--           no policies (functionally deny-all already, but advisor
--           flags missing policies). All 14 of these are
--           service-role-only by design. ──────────────────────────

-- Helper: idempotent policy creation. Drop existing same-named
-- policy if any, then add the deny-all.
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
    -- Verify table exists (don't fail the whole migration if a
    -- table got renamed or dropped between migrations).
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

-- ── PART 3: Reminder — Auth leaked-password protection ───────────
-- Cannot be enabled via SQL. After applying this migration:
--   1. Open Supabase dashboard
--   2. Authentication → Providers → Settings
--   3. Toggle "Check passwords against compromised database" ON
--   4. Save
-- Re-run the security advisor to confirm the warning clears.
