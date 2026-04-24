-- 024a: Security hardening — Supabase linter fixes (2 errors + 14 warnings)
--
-- Category 1: SECURITY DEFINER views → recreate with security_invoker=true
-- Category 2: Functions with mutable search_path → ALTER SET search_path
-- Category 3: "Always true" RLS policies on campaign tables → drop them
--   (service role bypasses RLS automatically; policy is unnecessary and flagged permissive)
--
-- Not addressed here (requires dashboard action):
--   * Leaked password protection — toggle in Supabase Dashboard → Auth settings

-- ────────────────────────────────────────────────────────────────────
-- SECTION 1: Views → security_invoker (Postgres 15+)
-- ────────────────────────────────────────────────────────────────────
-- The view will now honor the CALLING user's RLS on underlying tables
-- instead of the creator's. Since the only callers are admins (via
-- is_admin() policies on prospects/activities/demos/deals) or service
-- role (bypasses RLS), this is functionally unchanged for legitimate
-- access but closes the privilege-escalation hole.

ALTER VIEW IF EXISTS public.pipeline_summary SET (security_invoker = true);
ALTER VIEW IF EXISTS public.recent_activities SET (security_invoker = true);


-- ────────────────────────────────────────────────────────────────────
-- SECTION 2: Function search_path hardening
-- ────────────────────────────────────────────────────────────────────
-- All these are SECURITY DEFINER or called from RLS expressions.
-- Without an explicit search_path, an attacker who can create objects
-- in any schema on the resolution path can hijack function calls.
-- Locking to `public, pg_temp` eliminates the vector.

ALTER FUNCTION public.is_admin()                                   SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at()                             SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at()                          SET search_path = public, pg_temp;
ALTER FUNCTION public.auto_enable_rls()                            SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_sow_number()                        SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_invoice_number()                    SET search_path = public, pg_temp;
ALTER FUNCTION public.allocate_document_number(text, text, text, uuid)
                                                                   SET search_path = public, pg_temp;
ALTER FUNCTION public.recompute_session_state(uuid)                SET search_path = public, pg_temp;
ALTER FUNCTION public.expire_stale_sessions()                      SET search_path = public, pg_temp;


-- ────────────────────────────────────────────────────────────────────
-- SECTION 3: Drop permissive "always true" RLS policies on campaign tables
-- ────────────────────────────────────────────────────────────────────
-- These policies were USING(true) WITH CHECK(true) FOR ALL TO public,
-- which effectively removes RLS enforcement. The service role bypasses
-- RLS by default — these policies add no value and open a security hole.
-- After drop, the tables still have RLS enabled but no write policies;
-- only service-role access remains (admin API routes).

DROP POLICY IF EXISTS "Service role full access" ON public.campaigns;
DROP POLICY IF EXISTS "Service role full access" ON public.campaign_assets;
DROP POLICY IF EXISTS "Service role full access" ON public.campaign_posts;
DROP POLICY IF EXISTS "Service role full access" ON public.campaign_scripts;
DROP POLICY IF EXISTS "Service role full access" ON public.platform_connections;

-- If your admin UI needs SELECT access to these tables via the authenticated
-- role (not service role), add explicit is_admin() policies. Example:
-- CREATE POLICY "Admins read campaigns" ON public.campaigns FOR SELECT USING (is_admin());
-- Uncomment + extend only if you find admin-UI reads broken after applying.


-- ────────────────────────────────────────────────────────────────────
-- SECTION 4 (INFO-only, no action required, documented for posterity)
-- ────────────────────────────────────────────────────────────────────
-- `changelog_sources` and `quote_sessions` have RLS enabled but no policies.
-- This is INTENTIONAL:
--   * quote_sessions — accessed only via server-side routes using service role,
--     authenticated by session_token. No user-facing SELECT needed.
--   * changelog_sources — admin-only reference data.
-- Adding an explicit deny policy for clarity would change nothing behaviorally.
-- No action needed.
