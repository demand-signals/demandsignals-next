# DSIG Next.js — Session Changelog

Append-only log of working sessions. Newest at top.

---

## 2026-05-08 (late) — WS1 (Gaming-PC) — Hunter — CLI tokens

- **CLI bearer-token auth shipped end-to-end** for `/handoff` Step 11.D platform writes. Spec → plan → build executed cleanly in one pass.
- **Migration 050** — `cli_tokens` (bcrypt cost 10, prefix + last4 display, optional `expires_at`, `created_by` audit) + `cli_token_audit` (every bearer-auth attempt logged, drives 60/hr rate limit). Both RLS-locked to service-role.
- **Token format `dsigcli_<43-char-base64url>`** — 256-bit entropy, fixed prefix for visual identification + env-file regex matching.
- **`src/lib/cli-auth.ts`** — `generateCliToken()`, `authenticateCliRequest()` (extract Bearer → prefix lookup → bcrypt-compare → expiry → rate-limit → ALWAYS audit), `checkCliRateLimit()`. Edge-runtime safe.
- **`src/lib/notes-and-time.ts`** — extracted shared `createNoteAndTimeEntry()` so the existing admin route + new CLI route write through identical code paths. `client_code` resolution to most-recently-updated active project. Hours-mirror logic preserved.
- **`/api/cli/handoff/project-notes`** — Bearer-authed; only CLI route in v1 (default-deny on the surface).
- **Admin UI at `/admin/account/cli-tokens`** — list (multi-admin shared visibility — every admin sees + revokes every token), generate modal (one-time plaintext display with copy + paste-into-dsig.env instructions, optional auto-expiry), per-token audit page.
- **`/handoff` v1f** — Step 11.D reads `process.env.DSIG_CLI_TOKEN`, POSTs with Bearer header. 401 / 429 / 404 each have specific recovery paths; all non-200 fall back to display-artifacts-for-paste at `/admin/timekeeping`.
- **Hunter generated "DSIG shared CLI" token** at `/admin/account/cli-tokens` (no expiry) and stored value in `Y:\.credentials\dsig.env` as `DSIG_CLI_TOKEN`. Live and ready for next /handoff.
- **Project CLAUDE.md §4** documents the new envvar.
- **Build:** clean. tsc clean. 9/9 cli-auth tests pass.
- **Commit `5228afc`** on master.
- **Decisions locked:** one CLI route in v1 (default-deny); multi-admin shared visibility (matches dsig.env shared-NAS reality); bcrypt cost 10; plaintext shown ONCE; auto-expiry opt-in.
- **Time:** Hunter ~2h + Claude ~1h = 180m total billable.
- **Next session priority:** smoke-test /handoff Step 11.D from a real session and confirm the "Note written" message replaces the paste-fallback. Drop the now-truly-orphan envvars from earlier today (PORTAL_MAGIC_LINK_SECRET, GOOGLE_PORTAL_*).

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
