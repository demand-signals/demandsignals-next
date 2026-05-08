# Client Portal v1 Implementation Plan

> **For agentic workers:** Use checkbox (`- [ ]`) syntax to track progress. Steps execute in order. Each task gates the next.

**Goal:** Ship a logged-in client portal at `demandsignals.co/portal` exposing Account, Invoices (with Pay), and Projects (with phases/deliverables/payment-schedule + a notes timeline). Daily 9am PT digest emails + SMS-teases the prior 24h of project notes. `/handoff` slash command auto-writes notes + time-tracking rows on session end.

**Spec:** [`docs/superpowers/specs/2026-05-07-client-portal-v1-design.md`](../specs/2026-05-07-client-portal-v1-design.md) — v1.1 LOCKED.

**Architecture:** Apex path `/portal` with `dsig_portal` cookie scoped `Path=/portal` for browser-enforced isolation from admin/attribution cookies. Magic-link (jose HS256, 15-min TTL, jti consumed in sessions table) AND Google OAuth (new `DSIG Portal` GCP client, dated env vars per §12). Random 32-byte server-side session tokens for instant revocation. Logout revokes ALL active sessions. Notes flow from `/handoff` (primary) and admin manual UI (secondary) into `project_notes`; time-tracking lands in `project_time_entries`. Daily cron at 16:00 UTC pools per-client client-visible notes from prior 24h, fires email (full digest) + SMS (teaser link). Empty pool = silent.

**Tech stack:** Next.js 16 App Router, TypeScript strict, Supabase Postgres + RLS, Resend (email), Twilio (SMS), Vercel Cron, jose HS256 (magic-link tokens). PowerShell tool for npm/tsc per root §13. All build/run on `D:\dev\demandsignals-next\` per §5 — never on Y:.

---

## Pre-flight

- [ ] **Verify worktree state.** Currently on `claude/pensive-gagarin-8785ea` worktree at `Y:\DSIG\demandsignals-next\.claude\worktrees\pensive-gagarin-8785ea`. Confirm clean working tree before starting.
- [ ] **Confirm Hunter has set up the GCP OAuth client `DSIG Portal`** with redirect URI `https://demandsignals.co/api/portal/login/google/callback` and scope `openid email`. Hunter provides the client ID and secret values for env vars.
- [ ] **Confirm Cloudflare Email Routing extended** — `portal@demandsignals.co` → `DemandSignals@gmail.com`.
- [ ] **Confirm Vercel env vars set** before deploy (not before code): `PORTAL_MAGIC_LINK_SECRET` (32-byte hex), `GOOGLE_DSIG_PORTAL_ID_050726`, `GOOGLE_DSIG_PORTAL_SECRET_050726`.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/047_client_portal_auth.sql` | CREATE | `client_portal_sessions` + `client_portal_login_attempts` tables, indexes, RLS |
| `supabase/migrations/048_project_notes_and_time_entries.sql` | CREATE | `project_notes` + `project_time_entries` + `portal_digests` tables, General Support backfill, kill-switch seed |
| `supabase/migrations/APPLY-047-2026-05-07.sql` | CREATE | Web-editor-safe inlined wrapper for migration 047 |
| `supabase/migrations/APPLY-048-2026-05-07.sql` | CREATE | Web-editor-safe inlined wrapper for migration 048 |
| `src/lib/portal-auth.ts` | CREATE | Magic-link sign/verify, session mint/lookup/revoke, rate-limit check, login-attempt log |
| `src/lib/portal-data.ts` | CREATE | Read-only data layer for portal pages: invoices, receipts, projects, notes — all prospect-id scoped |
| `src/lib/portal-digest.ts` | CREATE | Per-client digest builder: pool notes, render email HTML, format SMS body, mark sent, write `portal_digests` row |
| `src/lib/portal-digest-sms.ts` | CREATE | SMS dispatcher with kill switches matching `booking-sms.ts` pattern |
| `src/lib/format-hours.ts` | CREATE | `formatHoursLabel(minutes: number) → "3h 15m" \| "45m" \| "1h"` |
| `src/lib/constants.ts` | MODIFY | Add `portal_signin` + `portal_digest` to `EMAIL_FROM`, `EMAIL_REPLY_TO`, `CLIENT_FACING_KINDS` |
| `src/middleware.ts` | MODIFY | Extend matcher with `/portal/:path*` and `/api/portal/:path*`; enforce session cookie or redirect to `/portal/login`; set request headers `x-dsig-portal-prospect-id` and `x-dsig-portal-session-id`; touch `last_seen_at` |
| `src/app/api/portal/login/magic-link/route.ts` | CREATE | POST email; rate-limit; lookup; sign token; sendEmail; always return 200 |
| `src/app/api/portal/login/magic-link/verify/route.ts` | CREATE | GET token; verify; mint session; set cookie; 302 /portal |
| `src/app/api/portal/login/google/start/route.ts` | CREATE | GET; build Google authorize URL with state cookie; 302 |
| `src/app/api/portal/login/google/callback/route.ts` | CREATE | GET code+state; exchange; extract email; lookup client; mint session; 302 |
| `src/app/api/portal/logout/route.ts` | CREATE | POST; revoke ALL active sessions for prospect; clear cookie; 302 /portal/login |
| `src/app/api/portal/invoices/[number]/pay/route.ts` | CREATE | Authed reverse-proxy: verify invoice belongs to session prospect, then redirect to existing `/api/invoices/public/[number]/pay` logic |
| `src/app/api/admin/project-notes/route.ts` | CREATE | POST + GET; create note + time-entry transactionally; admin-only |
| `src/app/api/admin/project-notes/[id]/route.ts` | CREATE | PATCH + DELETE; reject edits to sent notes |
| `src/app/api/admin/project-notes/[id]/suppress/route.ts` | CREATE | POST; toggle `suppressed` flag |
| `src/app/api/cron/portal-digest/route.ts` | CREATE | Bearer-auth; kill-switch check; per-client loop; race-safe via `portal_digests UNIQUE` |
| `src/app/portal/layout.tsx` | CREATE | Shared chrome — top nav (logo, business name, Sign out), footer |
| `src/app/portal/login/page.tsx` | CREATE | Email field + Continue with Google button + error display |
| `src/app/portal/login/sent/page.tsx` | CREATE | "Check your email — sign-in link sent to <email>" |
| `src/app/portal/page.tsx` | CREATE | Dashboard: welcome strip + outstanding balance + active project + recent invoices |
| `src/app/portal/account/page.tsx` | CREATE | Read-only contact info + "Request a change" mailto |
| `src/app/portal/invoices/page.tsx` | CREATE | List invoices for the session's prospect |
| `src/app/portal/invoices/[number]/page.tsx` | CREATE | Authed invoice detail (line items, total, payment terms, Pay button) |
| `src/app/portal/projects/page.tsx` | CREATE | List projects |
| `src/app/portal/projects/[id]/page.tsx` | CREATE | Project detail: phases, deliverables, payment schedule, notes timeline |
| `src/components/portal/PortalNav.tsx` | CREATE | Top nav for portal layout |
| `src/components/portal/SignOutButton.tsx` | CREATE | POST to /api/portal/logout |
| `src/components/portal/ProjectNotesTimeline.tsx` | CREATE | Renders client-visible notes with markdown body |
| `src/components/admin/ProjectNotesPanel.tsx` | CREATE | Admin-side notes timeline + Add Note modal + suppress/edit/delete actions |
| `src/components/admin/AddProjectNoteModal.tsx` | CREATE | Body textarea + visibility radio + optional phase select |
| `src/app/admin/projects/[id]/page.tsx` | MODIFY | Mount `ProjectNotesPanel` |
| `Y:\.claude\commands\handoff.md` | MODIFY | Step 11 extension: after Hunter approves, POST CLIENT UPDATE + TIME TRACKING to `/api/admin/project-notes`; project resolution from cwd with confirmation prompt |
| `vercel.json` | MODIFY | Add `portal-digest` cron entry: `{ "path": "/api/cron/portal-digest", "schedule": "0 16 * * *" }` |
| `scripts/verify-portal-auth.mjs` | CREATE | E2E verification: rate-limit, magic-link issue + verify + replay defense, OAuth callback happy path, logout-revokes-all, isolation tests |
| `scripts/verify-portal-digest.mjs` | CREATE | E2E verification: seed notes, hit cron, verify email + SMS sent, verify `client_sent_at` flipped, verify dedup |

---

## Task 1: Migration 047 — portal auth tables

**Files:** `supabase/migrations/047_client_portal_auth.sql`, `supabase/migrations/APPLY-047-2026-05-07.sql`

- [ ] **Step 1.1:** Write `047_client_portal_auth.sql` per spec §1 (migration `047_client_portal.sql`). Includes `client_portal_sessions`, `client_portal_login_attempts`, indexes, RLS enabled with no policies (service-role-only access).
- [ ] **Step 1.2:** Write `APPLY-047-2026-05-07.sql` as a fully-inlined web-editor-safe wrapper (per CLAUDE.md §12 lesson — no `\i` or `\echo`).
- [ ] **Step 1.3:** Hunter applies in Supabase web SQL Editor.
- [ ] **Step 1.4:** Verify in `Table Editor` that both tables exist and indexes are in place.

**Gate:** Tables exist; query `SELECT count(*) FROM client_portal_sessions` returns 0 without error.

---

## Task 2: Migration 048 — project notes + time entries + digests

**Files:** `supabase/migrations/048_project_notes_and_time_entries.sql`, `supabase/migrations/APPLY-048-2026-05-07.sql`

- [ ] **Step 2.1:** Write `048_project_notes_and_time_entries.sql` per spec §1 second migration block. Includes `project_notes`, `project_time_entries`, `portal_digests`, default-General-Support backfill, `quote_config` kill-switch seed, RLS.
- [ ] **Step 2.2:** Write `APPLY-048-2026-05-07.sql` web-editor-safe.
- [ ] **Step 2.3:** Hunter applies.
- [ ] **Step 2.4:** Verify backfill: every `prospects WHERE is_client=true` has at least one row in `projects` named `General Support` (or pre-existing project; the INSERT only fires for clients without one). Verify `quote_config.portal_digest_enabled` exists.

**Gate:** Three new tables, backfill correct, kill-switch row present.

---

## Task 3: Email + SMS plumbing

**Files:** `src/lib/constants.ts`, `src/lib/format-hours.ts`, `src/lib/portal-digest-sms.ts`

- [ ] **Step 3.1:** Add `portal_signin` and `portal_digest` to `EMAIL_FROM` (both `Demand Signals <portal@demandsignals.co>`), `EMAIL_REPLY_TO` (both `hunter@demandsignals.co`), and `CLIENT_FACING_KINDS` (both members) in `src/lib/constants.ts`.
- [ ] **Step 3.2:** Create `src/lib/format-hours.ts` exporting `formatHoursLabel(minutes: number): string`. Spec: `0 → "0m"`, `<60 → "{n}m"`, `=60 → "1h"`, `>60 with mins → "{h}h {m}m"`, `>60 whole hour → "{h}h"`. Add unit tests in `__tests__` adjacent.
- [ ] **Step 3.3:** Create `src/lib/portal-digest-sms.ts` mirroring `src/lib/booking-sms.ts` shape. Single export `sendPortalDigestSms({ toPhone, totalMinutes, prospectId })`. Body locked per spec §9. Honors `quote_config.sms_delivery_enabled` AND `quote_config.portal_digest_enabled` kill switches via the JSONB-dual-format read pattern.

**Gate:** TypeScript clean. `formatHoursLabel` tests pass. No actual SMS sent yet (no caller wired).

---

## Task 4: Portal auth library

**Files:** `src/lib/portal-auth.ts`, `src/lib/__tests__/portal-auth.test.ts`

- [ ] **Step 4.1:** Create `src/lib/portal-auth.ts` per spec §2 exports (`signMagicLinkToken`, `verifyMagicLinkToken`, `mintPortalSession`, `getPortalSession`, `revokePortalSession`, `revokeAllSessionsForProspect`, `checkLoginRateLimit`, `recordLoginAttempt`).
- [ ] **Step 4.2:** Use `jose` (already in deps from `attribution-cookie.ts`). HS256 signing key from `PORTAL_MAGIC_LINK_SECRET` env var.
- [ ] **Step 4.3:** Session token = `crypto.randomBytes(32).toString('hex')`. Cookie token never JWT-decoded; lookup is row-equality.
- [ ] **Step 4.4:** Rate limit: count `client_portal_login_attempts WHERE email = lower(?) AND created_at > now() - interval '60 minutes'`. Cap = 5.
- [ ] **Step 4.5:** Replay defense: `mintPortalSession` insert with `jti` triggers `UNIQUE` violation on second attempt; catch and return failure. Test this explicitly.
- [ ] **Step 4.6:** Logout = `revokeAllSessionsForProspect(prospectId, 'logout')` — UPDATE every non-revoked row WHERE prospect_id matches, set `revoked_at = now(), revoked_reason = 'logout'`.
- [ ] **Step 4.7:** Unit tests: sign/verify happy path, expired token rejected, bad-signature token rejected, rate-limit triggers at 6th attempt, jti replay rejected, revoke-all marks every active session.

**Gate:** All unit tests pass. `npm run typecheck` clean.

---

## Task 5: Middleware extension + path isolation

**Files:** `src/middleware.ts`, `src/lib/__tests__/portal-middleware.test.ts`

- [ ] **Step 5.1:** Extend `src/middleware.ts` matcher to include `/portal/:path*` and `/api/portal/:path*` (preserving the existing markdown-discovery behavior).
- [ ] **Step 5.2:** Define `PUBLIC_PORTAL_PATHS = new Set(['/portal/login', '/portal/login/sent'])` and `PUBLIC_PORTAL_API_PATHS` for `/api/portal/login/*` and `/api/portal/logout`.
- [ ] **Step 5.3:** For non-public portal paths: read `dsig_portal` cookie, call `getPortalSession(token)`. If null → 302 to `/portal/login`. If valid → set request headers `x-dsig-portal-prospect-id` and `x-dsig-portal-session-id`, touch `last_seen_at`.
- [ ] **Step 5.4:** Verify in dev that admin cookie (`dsig_admin`) on `/portal/*` does NOT pass middleware (cookie name is different + path scope means browser doesn't even send it).
- [ ] **Step 5.5:** Verify `dsig_portal` on `/admin/*` does NOT authenticate admin routes (admin uses Supabase Auth, never reads `dsig_portal`).

**Gate:** Manual smoke: `curl -b dsig_admin=fake /portal/invoices` → 302 to login. `curl -b dsig_portal=fake /admin` → 401/403 (existing admin guard rejects).

---

## Task 6: Auth API routes

**Files:**
- `src/app/api/portal/login/magic-link/route.ts`
- `src/app/api/portal/login/magic-link/verify/route.ts`
- `src/app/api/portal/login/google/start/route.ts`
- `src/app/api/portal/login/google/callback/route.ts`
- `src/app/api/portal/logout/route.ts`

- [ ] **Step 6.1:** `POST /api/portal/login/magic-link` — accept `{ email }`. Lowercase. Rate-limit check. Lookup `prospects WHERE owner_email=? AND is_client=true`. ALWAYS log attempt. If match: sign token, send email via `sendEmail({ kind: 'portal_signin', ... })`, mark attempt `succeeded=true`. If no match: do nothing else, mark attempt `succeeded=false, failure_reason='email_not_client'`. Always return 200 `{ sent: true }`.
- [ ] **Step 6.2:** `GET /api/portal/login/magic-link/verify?token=<jwt>` — verify token. Insert session with `jti` (UNIQUE catches replay). Set-Cookie with proper attributes (`Path=/portal; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`). 302 to `/portal`. On any failure: log attempt with `failure_reason`, 302 to `/portal/login?error=<reason>`.
- [ ] **Step 6.3:** `GET /api/portal/login/google/start` — generate state nonce, set short-lived state cookie (`Path=/api/portal/login; Max-Age=600`), build authorize URL with `client_id=GOOGLE_DSIG_PORTAL_ID_050726`, scope=`openid email`, redirect_uri=`https://demandsignals.co/api/portal/login/google/callback`. 302 to Google.
- [ ] **Step 6.4:** `GET /api/portal/login/google/callback?code=&state=` — verify state cookie. Exchange code for token. Decode id_token, extract email. Lookup client. On match: mint session (login_method='google_oauth', jti=null). On no match or any error: 302 to `/portal/login?error=not_a_client` (uniform error to prevent enumeration).
- [ ] **Step 6.5:** `POST /api/portal/logout` — read session from cookie, call `revokeAllSessionsForProspect`, clear cookie (`Set-Cookie: dsig_portal=; Path=/portal; Max-Age=0`), 302 to `/portal/login`.

**Gate:** All routes return correct shapes. No env-var values visible in any response. Manual test with curl: rate limit fires after 5 requests, 6th still returns 200 but no email logged.

---

## Task 7: Auth-reverse-proxy for Pay button

**Files:** `src/app/api/portal/invoices/[number]/pay/route.ts`

- [ ] **Step 7.1:** GET handler. Read prospect_id from `x-dsig-portal-prospect-id` header (set by middleware). Lookup invoice by number. Assert `invoice.prospect_id === sessionProspectId`. On mismatch → 403.
- [ ] **Step 7.2:** On match → 302 to `/api/invoices/public/{number}/pay?uuid=<invoice.public_uuid>` (or whatever the existing public route's auth shape is — read [src/app/api/invoices/public/[number]/pay](../../src/app/api/invoices/public/[number]/pay) first to match the contract). The existing route does the actual Stripe Payment Link work; we add only the auth gate.
- [ ] **Step 7.3:** Log the pay-attempt event to existing `email_engagement` or `page_visits` (whichever fits — likely `page_visits` with a synthetic `event='portal_pay_redirect'`).

**Gate:** A logged-in client clicking Pay on their own invoice → reaches Stripe. Same client clicking the URL for a different client's invoice → 403.

---

## Task 8: Portal pages — login + dashboard

**Files:**
- `src/app/portal/layout.tsx`
- `src/components/portal/PortalNav.tsx`
- `src/components/portal/SignOutButton.tsx`
- `src/app/portal/login/page.tsx`
- `src/app/portal/login/sent/page.tsx`
- `src/app/portal/page.tsx`

- [ ] **Step 8.1:** `layout.tsx` — top nav, footer. Server component. Reads `prospect_id` from headers in child pages (not in layout — layout doesn't gate, middleware does).
- [ ] **Step 8.2:** `PortalNav.tsx` — DSIG logo, business name (looked up by prospect_id), Sign Out button, links to Account / Invoices / Projects.
- [ ] **Step 8.3:** `SignOutButton.tsx` — client component, POSTs to `/api/portal/logout` with `Content-Type: application/json` (per CLAUDE.md §12 Chrome-Origin-stripping lesson).
- [ ] **Step 8.4:** `login/page.tsx` — email input form (POST to `/api/portal/login/magic-link`, on success → push to `/portal/login/sent?email=<email>`) + "Continue with Google" anchor → `/api/portal/login/google/start`. Display `?error=` query param translated to friendly message.
- [ ] **Step 8.5:** `login/sent/page.tsx` — confirmation message, no PII echoed beyond what user just typed.
- [ ] **Step 8.6:** `page.tsx` (dashboard) — server component. Read prospect_id from header. Fetch via `portal-data.ts` (Task 9). Render four sections per spec §13: welcome strip, outstanding balance card (with Pay button if > 0), active project + latest update, recent invoices.

**Gate:** Visit `/portal/login` works. Submitting email triggers email send (verify in `email_engagement` table). Clicking Google button reaches Google consent. Clicking link in email lands at `/portal` with welcome strip rendered.

---

## Task 9: Portal data layer + remaining pages

**Files:**
- `src/lib/portal-data.ts`
- `src/app/portal/account/page.tsx`
- `src/app/portal/invoices/page.tsx`
- `src/app/portal/invoices/[number]/page.tsx`
- `src/app/portal/projects/page.tsx`
- `src/app/portal/projects/[id]/page.tsx`
- `src/components/portal/ProjectNotesTimeline.tsx`

- [ ] **Step 9.1:** `portal-data.ts` — every query takes `prospectId` and constrains by it. Exports: `getProspectById`, `getInvoicesForProspect`, `getInvoiceByNumberForProspect`, `getProjectsForProspect`, `getProjectByIdForProspect`, `getNotesForProjectClientVisible`, `getOutstandingBalanceForProspect`. CRITICAL: every query that touches `project_notes` filters `visibility = 'client' AND suppressed = false` at SQL level — no rendering-layer filter.
- [ ] **Step 9.2:** `account/page.tsx` — read-only display of business_name, owner_name, owner_email, owner_phone, business_phone, address, city/state/zip/country, channels (URLs as links). "Request a change" button = `mailto:DemandSignals@gmail.com?subject=Account update request — [client_code]`.
- [ ] **Step 9.3:** `invoices/page.tsx` — table: number, status, amount, issued_at, due_at. Outstanding rows highlighted. Each row → `/portal/invoices/[number]`.
- [ ] **Step 9.4:** `invoices/[number]/page.tsx` — verify ownership in data layer. Render line items, payment terms, total. Pay button → `/api/portal/invoices/[number]/pay` (Task 7). Download PDF link → existing `/api/admin/invoices/[id]/pdf` IF it accepts portal-session auth, OR proxy through similar auth-reverse-proxy. (Decision: proxy. Add `src/app/api/portal/invoices/[number]/pdf/route.ts` mirroring Task 7's pattern.)
- [ ] **Step 9.5:** `projects/page.tsx` — list active + recently completed projects. Status, name, current phase, monthly_value if applicable.
- [ ] **Step 9.6:** `projects/[id]/page.tsx` — phases (with status badges), deliverables (with status), payment schedule (paid vs upcoming installments), notes timeline (`ProjectNotesTimeline`).
- [ ] **Step 9.7:** `ProjectNotesTimeline.tsx` — renders notes newest-first. Markdown body via existing safe renderer. Date label. No author. Empty state: "No updates yet — your team is working on it."

**Gate:** Test client account loads all pages. URL tampering (`/portal/invoices/INV-OTHER-CLIENT-XXX`) returns 404 (looked up by prospect_id, not just number). Markdown XSS test: paste `<img onerror=alert(1)>` into a note via DB, verify renderer escapes it.

---

## Task 10: Admin notes panel + API

**Files:**
- `src/app/api/admin/project-notes/route.ts`
- `src/app/api/admin/project-notes/[id]/route.ts`
- `src/app/api/admin/project-notes/[id]/suppress/route.ts`
- `src/components/admin/ProjectNotesPanel.tsx`
- `src/components/admin/AddProjectNoteModal.tsx`
- `src/app/admin/projects/[id]/page.tsx` (modify)

- [ ] **Step 10.1:** `POST /api/admin/project-notes` — `requireAdmin()`. Body: `{ project_id, body, title?, visibility, source, phase_id?, deliverable_id?, session_started_at?, session_ended_at?, hunter_minutes?, claude_minutes? }`. Look up `prospects.id` from `projects.prospect_id`. Insert `project_notes` row. If `hunter_minutes` or `claude_minutes` provided, insert linked `project_time_entries` row in same transaction.
- [ ] **Step 10.2:** `GET /api/admin/project-notes?project_id=X` — list notes for a project. Admin only.
- [ ] **Step 10.3:** `PATCH /api/admin/project-notes/[id]` — edit body/title/visibility. Reject (409) if `client_sent_at IS NOT NULL`.
- [ ] **Step 10.4:** `DELETE /api/admin/project-notes/[id]` — only if `client_sent_at IS NULL` (audit trail; once sent, cannot vanish).
- [ ] **Step 10.5:** `POST /api/admin/project-notes/[id]/suppress` — `{ suppressed: bool, reason?: string }`.
- [ ] **Step 10.6:** `ProjectNotesPanel.tsx` — server-rendered timeline + client-side action buttons. Reverse chronological, paginated 25/page. Each row shows visibility badge, send-status badge, body, hours summary (admin-only), action buttons. Add Note opens modal.
- [ ] **Step 10.7:** `AddProjectNoteModal.tsx` — body textarea (markdown), visibility radio (Internal / Client), optional phase select. POSTs to `/api/admin/project-notes` with `source='manual'`. Includes the `Content-Type: application/json` header per §12.
- [ ] **Step 10.8:** Mount `ProjectNotesPanel` on `src/app/admin/projects/[id]/page.tsx`.

**Gate:** Admin can add a note, see it in the timeline, edit it, suppress it, delete it. Edit attempt on a note with `client_sent_at` set returns 409 with clear error.

---

## Task 11: `/handoff` slash command extension

**Files:** `Y:\.claude\commands\handoff.md`

- [ ] **Step 11.1:** Open `Y:\.claude\commands\handoff.md`. Add new step 11.D (after 11.C TIME TRACKING) titled "WRITE TO PLATFORM" describing the project resolution + POST flow.
- [ ] **Step 11.2:** Step 11.D logic: (a) infer project from cwd via lookup against `projects.name` and `prospects.client_code` fuzzy match; (b) if cwd is `Y:\DSIG\demandsignals-next` route to a synthetic `DSIG Internal` project on a synthetic `DSIG Internal` prospect (create both if not present — one-time bootstrap); (c) if multiple active projects match, prompt Hunter to pick by number; (d) show resolved project + client name + the artifact body for confirmation; (e) on Hunter "yes": POST to `/api/admin/project-notes` with `source='handoff'`, the CLIENT UPDATE body, `hunter_minutes` and `claude_minutes` calculated per spec time-tracking rule (Hunter = full wall-clock span; Claude = processing time only).
- [ ] **Step 11.3:** Document the time-calculation rule explicitly in the command file. Hunter time = full wall-clock from first user message to last action. Claude time = sum of per-turn processing.
- [ ] **Step 11.4:** Bump command version to `1c` in the changelog footer.

**Gate:** Run `/handoff` in a test session against the demandsignals-next project. Verify a note row appears in `project_notes` with `source='handoff'`, correct project_id (DSIG Internal), and a `project_time_entries` row linked. Hunter's wall-clock minutes are reasonable (not 0, not 9999).

---

## Task 12: Daily digest cron + email template

**Files:**
- `src/lib/portal-digest.ts`
- `src/app/api/cron/portal-digest/route.ts`
- `vercel.json` (modify)
- Email template HTML — embedded in `portal-digest.ts` (matches existing pattern from `src/lib/invoice-email.ts`)

- [ ] **Step 12.1:** `portal-digest.ts` exports `runDigestForProspect(prospectId): Promise<DigestResult>` and `runDigestSweep(): Promise<SweepResult>`.
- [ ] **Step 12.2:** `runDigestForProspect`: select pending notes per spec §8 cron pseudocode. If empty, return `{ skipped: 'no_notes' }`. If non-empty: insert `portal_digests` row FIRST (catch UNIQUE conflict → return `{ skipped: 'already_sent' }`); render email HTML grouped by project name; sum minutes; call `sendEmail({ kind: 'portal_digest', ... })`; call `sendPortalDigestSms({ ... })`; UPDATE `project_notes SET client_sent_at=now(), client_send_id=<email_engagement.id>` for the bundled note ids.
- [ ] **Step 12.3:** `runDigestSweep`: fetch all clients, dispatch per-client (sequential is fine for v1; parallelism is a v2 optimization), accumulate results, return summary.
- [ ] **Step 12.4:** `GET /api/cron/portal-digest`: bearer-auth via `CRON_SECRET`; check `portal_digest_enabled` kill switch via JSONB-dual-format read; call `runDigestSweep()`; return summary as JSON. Always 200 (cron should not retry-on-failure for partial failures).
- [ ] **Step 12.5:** Email template HTML: top header strip with logo + tagline; hours-committed callout ("Demand Signals committed Xh Ym of progress towards your account in the past 24 hours"); per-project sections: H2 project name, then each note rendered with date + title (if present) + markdown body; footer with single CTA to `/portal/projects` and a small "Don't want these? Reply and ask us to pause" line. Plain-text fallback.
- [ ] **Step 12.6:** `vercel.json`: add `{ "path": "/api/cron/portal-digest", "schedule": "0 16 * * *" }` to crons array.

**Gate:** Manually invoke `curl -H "Authorization: Bearer $CRON_SECRET" https://localhost:3000/api/cron/portal-digest` (in dev). With seeded notes, verify email + SMS sent, `client_sent_at` flipped, `portal_digests` row inserted. Run twice and verify the second call returns `skipped: 'already_sent'` for that prospect/period.

---

## Task 13: Verification scripts

**Files:** `scripts/verify-portal-auth.mjs`, `scripts/verify-portal-digest.mjs`

- [ ] **Step 13.1:** `verify-portal-auth.mjs`: scripted scenario covering rate-limit (issue 5, verify 6th silently no-ops), magic-link issue + verify happy path, magic-link replay (use jti twice → second fails), Google OAuth callback simulation with mocked id_token, logout-revokes-all (mint 3 sessions, logout once, verify all 3 are revoked), isolation (admin cookie cannot fetch `/portal/account`).
- [ ] **Step 13.2:** `verify-portal-digest.mjs`: seed 3 notes for a test client (mix of internal + client-visible + suppressed), invoke cron endpoint, assert email sent (check `email_engagement`), assert SMS sent (check Twilio test mode log), assert `client_sent_at` flipped on the 1 client-visible non-suppressed note, assert internal + suppressed notes untouched. Run cron a second time, assert second invocation skips with `already_sent`.
- [ ] **Step 13.3:** Both scripts run via `node scripts/verify-X.mjs` and exit 0 on success, non-zero on failure. They run against the test environment, not production.

**Gate:** Both scripts exit 0 against `D:\dev\demandsignals-next\` running locally with test Supabase project.

---

## Task 14: Build + typecheck on D:\dev

**Files:** none

- [ ] **Step 14.1:** Switch to PowerShell tool (per root §13). `cd D:\dev\demandsignals-next`. Pull latest from the worktree branch via git.
- [ ] **Step 14.2:** `npm install` (in case any new deps were added — none expected; jose is already there).
- [ ] **Step 14.3:** `npx tsc --noEmit` — must be zero errors.
- [ ] **Step 14.4:** `npm run build` — must succeed.
- [ ] **Step 14.5:** `npm run dev` — start dev server, manually walk the login flow end-to-end. Verify magic-link email arrives. Verify Google flow round-trips. Verify the dashboard renders for a real client account.

**Gate:** Build green; manual smoke test passes.

---

## Task 15: Deploy + production smoke

**Files:** none

- [ ] **Step 15.1:** Hunter sets Vercel env vars: `PORTAL_MAGIC_LINK_SECRET`, `GOOGLE_DSIG_PORTAL_ID_050726`, `GOOGLE_DSIG_PORTAL_SECRET_050726`.
- [ ] **Step 15.2:** Hunter confirms Cloudflare Email Routing for `portal@demandsignals.co`.
- [ ] **Step 15.3:** Apply migrations 047 + 048 in production Supabase.
- [ ] **Step 15.4:** `git push origin claude/pensive-gagarin-8785ea` (worktree branch). Open PR to master. Merge after typecheck CI passes.
- [ ] **Step 15.5:** Vercel auto-deploys. Confirm deploy SHA matches commit (per CLAUDE.md §12 deploy-lag lesson) before testing.
- [ ] **Step 15.6:** Hunter signs in to portal as a real test client (or his own admin account flagged is_client temporarily). Walk: login → dashboard → invoices → projects → logout (verify all sessions revoked).
- [ ] **Step 15.7:** Trigger digest manually in production with a freshly seeded note. Verify email and SMS arrive at Hunter's address/phone.

**Gate:** Production smoke passes. Hunter approves go-live.

---

## Task 16: Update MEMORY.md + INDEX.md

**Files:** `MEMORY.md`, `docs/INDEX.md`

- [ ] **Step 16.1:** Add a new SHIPPED entry to `MEMORY.md` under the most recent date.
- [ ] **Step 16.2:** Add migrations 047 + 048 to the migrations-applied table.
- [ ] **Step 16.3:** Update spec status in `docs/INDEX.md` from DRAFT to SHIPPED.
- [ ] **Step 16.4:** Add the plan file to `docs/INDEX.md` plans table.

**Gate:** MEMORY.md reflects shipped state. INDEX.md reflects SHIPPED status. Commit and push.

---

## Risk register

| Risk | Mitigation |
|---|---|
| `/handoff` extension misroutes a DSIG-internal session to a real client project | Confirmation prompt in step 11.D shows resolved project + client BEFORE POST. Hunter approves the destination explicitly. |
| Digest fires with empty content (race between cron and last note insert) | `portal_digests UNIQUE(prospect_id, period_start_at)` prevents double-send. Empty pool returns `skipped: 'no_notes'` without inserting digest row. |
| Twilio SMS spam runaway | Three layers: `sms_delivery_enabled` kill switch, `portal_digest_enabled` kill switch, hard cap 200 digests/day in cron with alarm. |
| Note edit-after-send corrupts client experience | Server rejects edits where `client_sent_at IS NOT NULL` with 409. Admin can only "follow up with a correction note" — original send remains immutable. |
| GCP OAuth client misconfig blocks login | Admin diagnostic endpoint `GET /api/portal/login/google/debug` (admin-gated) shows whether dated env vars are populated and whether redirect URI matches. Modeled on `/api/integrations/google/debug` (CLAUDE.md §12). |
| Path-scoped cookie regression on a future Next.js upgrade | `verify-portal-auth.mjs` includes the isolation test as a permanent regression guard. Run before every release that bumps Next.js. |

---

## Notes for the agentic worker

- Keep PowerShell tool for `npm`, `npx`, `tsc`, `next build` (per root §13). Bash tool for `git`, `gh`, file ops via dedicated tools.
- Build/run only on `D:\dev\demandsignals-next\` — never on Y: (per §5).
- Apply migrations in numerical order. Never skip the APPLY-* wrapper file.
- After each Task's Gate is green, commit with a focused message. Push at end of each block of 2–3 tasks for incremental verification.
- The spec is locked. If something in this plan conflicts with the spec, the spec wins — surface the conflict and ask before deviating.
