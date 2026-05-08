# DSIG Next.js — Session Changelog

Append-only log of working sessions. Newest at top.

---

## 2026-05-08 — WS1 (Gaming-PC) — Hunter

- **Client portal v1 PIVOTED mid-session.** The 2026-05-07 build (`1497bf0`) shipped a parallel-auth architecture (magic-link + dedicated DSIG Portal OAuth client + dsig_portal cookie + 2 dedicated session/audit tables). Hunter rejected: "this is a dual login for both admin and client portals" — wanted ONE unified login at the existing `/admin-login`, not a separate one. Tore down the parallel stack, rebuilt unified.
- **Final shipped state:** unified login at `demandsignals.co/login` (renamed from /admin-login) → Supabase Auth Google OAuth → `/auth/callback` resolves role from `admin_users` + `prospects.is_client` → routes to `/admin` (admin), `/portal` (client only), `/admin` (both with header dropdown to switch), `/unauthorized` (neither).
- **Header role-aware:** logged out shows "Client Portal" → `/login`; logged-in admin shows first-name + ▾ dropdown (Admin Portal / Client Portal / Sign out); logged-in client shows first-name → direct `/portal` link.
- **Admin "view as client":** eye icon on `/admin/clients` rows → `dsig_portal_view_as` cookie → portal renders that client's view with amber "Viewing as" banner. "Stop viewing as" link clears.
- **Two real bugs found + fixed:**
  - Auth callback was mutating `NextResponse.redirect`'s location header after construction — silently dropped session cookies on early-return paths. Fix: collect cookies via setAll into local array; build fresh redirect at every return point, write cookies with original options.
  - `<Link href="/auth/signout">` caused Next.js RSC prefetch to silently call `supabase.auth.signOut()` in the background, clearing cookies. Fix: plain `<a>` tag for side-effect routes.
- **Migration 049** dropped the orphan `client_portal_sessions` + `client_portal_login_attempts` tables from migration 047 (no longer needed after auth unified).
- **9 commits pushed** (1497bf0 → 9a90b95).
- **Time:** Hunter 5h 30m + Claude 3h 15m = **8h 45m total billable**.
- **Failures with lessons:**
  - Should have read existing `/admin-login` before designing a parallel auth flow. ~6h wasted.
  - Speculated for hours about wrong-Supabase-project / wrong-OAuth-client / wrong-env-vars when the real bug was in code I wrote. Hunter forced the correction: "STOP TRYING TO BLAME ME, BLAME TOKENS. YOU NEED TO BLAME YOUR CODE." Once I actually read my own callback, the bug surfaced in 10 minutes.
  - Got Hunter time-tracking definition wrong (initially "active engagement only"; should be "full wall-clock span"). Corrected in handoff.md v1c.
  - Used hunter@demandsignals.co as email reply-to without authorization. Corrected to DemandSignals@gmail.com across all client-facing kinds.
  - Worktree path was a no-op again — edits routed through canonical Y: tree, not the worktree. Same pattern as last session.
- **Decisions locked:**
  - One Google OAuth client (`219907120133-...`, Supabase-managed) for portal AND admin login. Don't propose splitting again.
  - Magic-link is for unauthed documents (SOW / invoice / receipt / quote) only. Sign-in is Google OAuth via Supabase.
  - Auth-callback cookie pattern: collect-into-array + fresh-redirect-at-end. Never mutate redirect location after construction.
  - Side-effect GET routes use plain `<a>`, not `<Link>` (RSC-prefetch hazard).
  - `EMAIL_REPLY_TO = DemandSignals@gmail.com` for all client-facing kinds.
- **Next session priority:** find + kill the stale `dsig.demandsignals.dev` redirect that intercepted `/auth/signout?_rsc=...`. Drop orphan Vercel envvars (`PORTAL_MAGIC_LINK_SECRET`, `GOOGLE_PORTAL_*`). Drop unused GCP "DSIG Portal" OAuth client. Smoke-test the 9am PT digest cron firing.
