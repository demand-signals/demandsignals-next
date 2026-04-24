# Security and RLS — Operational Runbook

**Owner:** Hunter (DSIG)
**Last updated:** 2026-04-24
**Scope:** Supabase Row Level Security policies, SECURITY DEFINER function hardening, API-layer protections, and the admin auth model.

> **The three things to know at 2am:**
> 1. **Supabase linter was clean as of migration 024a.** If you see new warnings in the Supabase linter after adding a table or function: run 024a patterns against the new objects (security_invoker for views, search_path lock for SECURITY DEFINER functions, no permissive USING(true) policies).
> 2. **Admin API routes use service_role; public quote routes use anon.** Never return `SUPABASE_SERVICE_ROLE_KEY` to the browser. Admin routes are gated by `requireAdmin()` before any DB call.
> 3. **The `/quote` session token is a bearer secret, not a user identity.** It authorizes reading/writing a specific session. It does not identify a human user. RLS on `quote_sessions` has no policies — only service_role (used by server-side API routes) can read/write it.

---

## Emergency procedures

### Suspected data breach (anon user reading admin data)

1. Immediately check Supabase Advisors → Security warnings for new "Policy is always true" or missing RLS flags
2. Run the RLS test suite:
   ```bash
   cd D:/CLAUDE/demandsignals-next
   node scripts/test-quote-rls.mjs
   # Must show 25/25
   ```
3. Check recent Vercel logs for any admin API route returning data to unauthenticated requests (look for 200s on `/api/admin/*` without an Authorization header)
4. If a policy is found to be wrong: fix it in SQL Editor, re-run test suite

### `is_admin()` function returning wrong result

```sql
-- Check the function definition
SELECT prosrc FROM pg_proc WHERE proname = 'is_admin';
```

The function should query `admin_users` for the current `auth.uid()`. If it's returning `true` for everyone or `false` for admins:
1. Check `admin_users` table has the correct email:
   ```sql
   SELECT * FROM admin_users;
   ```
2. Check the function implementation matches what's in `supabase/migrations/001_crm_spine.sql` (or wherever it was defined)
3. Re-create if needed:
   ```sql
   CREATE OR REPLACE FUNCTION is_admin()
   RETURNS boolean
   LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public, pg_temp
   AS $is_admin$
   BEGIN
     RETURN EXISTS (
       SELECT 1 FROM admin_users
       WHERE email = auth.jwt() ->> 'email'
     );
   END;
   $is_admin$;
   ```

---

## RLS architecture

### Two access patterns

**Pattern 1 — Admin portal APIs (service_role)**
All `/api/admin/*` routes use `supabaseAdmin` (service_role). Service_role bypasses RLS entirely. The security layer is `requireAdmin()` in application code — it validates the JWT and checks `admin_users` before any DB call.

**Pattern 2 — Public routes (anon/authenticated, RLS enforced)**
The `/quote` flow's server-side routes use service_role (called from Next.js server with `session_token` header auth). The Supabase client used by the browser side of quote (for real-time subscriptions if any) uses anon role with RLS.

### Core `is_admin()` function

```sql
-- Returns true if the current JWT's email is in admin_users
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $is_admin$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = auth.jwt() ->> 'email'
  );
END;
$is_admin$;
```

This function is used in all per-table RLS policies:
```sql
-- Typical pattern (prospects, invoices, sow_documents, etc.)
CREATE POLICY "Admins read X" ON X FOR SELECT USING (is_admin());
CREATE POLICY "Admins write X" ON X FOR ALL USING (is_admin()) WITH CHECK (is_admin());
```

---

## Security hardening — migration 024a summary

Applied 2026-04-24. See `supabase/migrations/024a_security_hardening.sql` for full SQL.

### Category 1 — Views with security_invoker

**Problem:** `SECURITY DEFINER` views run as the view creator, bypassing RLS on underlying tables for anyone who can SELECT the view.

**Fix:**
```sql
ALTER VIEW public.pipeline_summary SET (security_invoker = true);
ALTER VIEW public.recent_activities SET (security_invoker = true);
```

Now these views honor the calling user's RLS on the underlying tables.

### Category 2 — Function search_path

**Problem:** SECURITY DEFINER functions without an explicit `search_path` can be hijacked if an attacker creates a malicious function in a schema that appears earlier in the default search path.

**Fix:** 9 functions had `SET search_path = public, pg_temp` added:
- `is_admin()`
- `set_updated_at()`
- `update_updated_at()`
- `auto_enable_rls()`
- `generate_sow_number()`
- `generate_invoice_number()`
- `allocate_document_number(text, text, text, uuid)`
- `recompute_session_state(uuid)`
- `expire_stale_sessions()`

### Category 3 — Permissive policies dropped

**Problem:** Campaign tables had `USING(true) WITH CHECK(true) FOR ALL TO public` policies — effectively disabling RLS enforcement.

**Fix:** Those 5 policies were dropped:
- `campaigns`: "Service role full access"
- `campaign_assets`: "Service role full access"
- `campaign_posts`: "Service role full access"
- `campaign_scripts`: "Service role full access"
- `platform_connections`: "Service role full access"

Service_role still bypasses RLS natively — these policies added nothing but opened a hole. If admin UI needs to SELECT these tables, add explicit `is_admin()` policies.

### Category 4 — Tables with RLS but no policies (intentional)

Two tables have RLS enabled but zero policies — this is intentional:
- `quote_sessions` — accessed only via service_role from server-side routes
- `changelog_sources` — admin-only reference data

With no policies, only service_role can access these. This is the correct security posture.

---

## Leaked password protection

**Status:** enabled (manual toggle in Supabase Auth settings)

**Where:** Supabase Dashboard → Project → Authentication → Sign In / Up → "Leaked password protection: Enabled"

This checks new and changed passwords against the HaveIBeenPwned database. Prevents common breached passwords from being used in any Supabase auth flows (not relevant for Google OAuth but good hygiene if email/password auth is ever added).

---

## API security layers (app-level)

### `requireAdmin()` — `src/lib/admin-auth.ts`

Used by every `/api/admin/*` route. Two-stage check:
1. `supabase.auth.getUser()` — validates the session cookie's JWT against Supabase Auth
2. `SELECT FROM admin_users WHERE email = user.email` — ensures the user is a registered admin

Returns `{ user }` on success, `{ error: NextResponse(401) }` on failure.

### Input validation — Zod

Every POST/PATCH admin route parses the request body with a Zod schema. Invalid shapes return 400 with a human-readable error message listing each failing field. Example from `/api/admin/sow` POST:
```typescript
const parsed = postBodySchema.parse(await request.json())
// ZodError caught and re-thrown as:
// "phases.0.deliverables.0.cadence: Invalid enum value"
```

### Rate limiting — `src/lib/api-security.ts`

Applied to public-facing routes (`/api/quote/*`, `/api/contact`). Admin routes are not rate-limited (authenticated already).

### CSP header

Configured in `next.config.ts` headers. Restricts script-src, frame-src, etc. Check next.config.ts if you add a new third-party embed that gets blocked by CSP.

---

## `/quote` session_token model

Quote sessions authenticate with a `session_token` bearer token, not a user identity. The flow:

1. Browser calls `/api/quote/session` → `POST` creates a session, returns `session_token`
2. All subsequent `/api/quote/*` calls include `{ session_token }` in the request body
3. Server-side: verifies `session_token` matches an existing `quote_sessions` row before any read/write
4. This is not a standard auth token — it's a per-session secret. Treat as confidential but it's not a user credential.

Why not use Supabase auth for `/quote`? Prospects are anonymous. Requiring them to create an account before getting a quote estimate is friction that kills conversions.

---

## Admin cookie scope requirements (CLAUDE.md §18)

Per the domain architecture decision:
- Admin cookies MUST scope `Domain=demandsignals.co` (exact, no leading dot) + `SameSite=Strict` + `HttpOnly` + `Secure`
- Demo site cookies MUST scope to `Domain=demos.demandsignals.co` (not the apex)
- Never share auth scope between admin and demo/staging subdomains

Supabase auth cookies are set by the Supabase SDK using the `NEXT_PUBLIC_SUPABASE_URL` domain automatically. Verify the cookie scope in browser DevTools → Application → Cookies after login.

---

## Troubleshooting

### RLS test shows < 25/25

```bash
node scripts/test-quote-rls.mjs
```

The script seeds test data as service_role, then asserts every anon operation fails, then cleans up. A failure output names the failing policy.

Fix:
1. Re-apply the relevant migration file individually (not the bundle) via SQL Editor
2. Re-run the test — must be 25/25 before any deploy

### Admin API returning data without authentication (403/401 not firing)

1. Check `requireAdmin()` is called at the top of the route (before any DB query)
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel — without it, `supabaseAdmin` creation fails silently and falls back to anon
3. Check `src/lib/supabase/admin.ts` creates the client with the service role key

### `is_admin()` called from anon context returns false unexpectedly

`auth.jwt()` returns null when called outside a Supabase auth session. If you're calling it from a public route or a service_role route without a JWT, `is_admin()` will return false. Service-role routes bypass RLS entirely — `is_admin()` is only relevant for authenticated (non-service-role) calls.

### Supabase linter showing new warnings

After adding a new table or function, open Supabase Dashboard → Database → Database Linter. Common patterns to fix:

- **"view is security definer"** → `ALTER VIEW <name> SET (security_invoker = true);`
- **"function has mutable search path"** → `ALTER FUNCTION <name>() SET search_path = public, pg_temp;`
- **"policy is always true"** → Drop the policy; service_role doesn't need it
- **"table has no RLS"** → `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;` + add appropriate policies

---

## Cross-references

- `supabase-migrations.md` — how to apply 024a
- `admin-portal.md` — the `requireAdmin()` usage in every admin route
- `quote-estimator.md` (existing) — session_token auth model for `/quote`
- `environment-and-deploy.md` — `SUPABASE_SERVICE_ROLE_KEY` and other required vars
