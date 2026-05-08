# CLI Tokens Implementation Plan

> **For agentic workers:** Use checkbox (`- [ ]`) syntax to track progress. Steps execute in order. Each task gates the next.

**Goal:** Ship CLI bearer-token auth for `/handoff` Step 11.D so it can POST CLIENT UPDATE + TIME TRACKING artifacts to the platform from any admin workstation reading `Y:\.credentials\dsig.env`. Tokens are bcrypt-hashed, opt-in expiring, revocable, audit-logged, rate-limited 60/hr/token.

**Spec:** [`docs/superpowers/specs/2026-05-08-cli-tokens-design.md`](../specs/2026-05-08-cli-tokens-design.md) — v1.1 LOCKED.

**Architecture:** Two new tables (`cli_tokens` + `cli_token_audit`). New scoped endpoint `POST /api/cli/handoff/project-notes` with Bearer-auth gate. Admin UI at `/admin/account/cli-tokens` for issue/list/audit/revoke. `/handoff` Step 11.D reads `process.env.DSIG_CLI_TOKEN` and POSTs. Existing `/api/admin/project-notes` create logic extracted to a shared helper so both routes write notes + time entries identically.

**Tech stack:** Next.js 16 App Router, TypeScript strict, Supabase Postgres + RLS service-role-only, `bcryptjs` for hashing (pure-JS, no native bindings), Web Crypto API for token generation. PowerShell for npm/tsc per root §13. All build/run on `D:\dev\demandsignals-next\` per §5.

---

## Pre-flight

- [ ] **Verify clean working tree.** `git status` should be clean on master after the spec commit (`29d4761`).
- [ ] **Confirm `bcryptjs` is fine to add as a dep.** It's pure-JS, ~30KB, stable. No native modules. Edge-runtime safe.
- [ ] **Confirm migration 049 was applied** (last shipped DB change before this work) so 050 numbering is correct.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/050_cli_tokens.sql` | CREATE | `cli_tokens` + `cli_token_audit` tables, indexes, RLS |
| `supabase/migrations/APPLY-050-2026-05-08.sql` | CREATE | Web-editor-safe inlined wrapper for migration 050 |
| `package.json` | MODIFY | Add `bcryptjs` (+ `@types/bcryptjs`) |
| `src/lib/cli-auth.ts` | CREATE | `generateCliToken()`, `authenticateCliRequest()`, audit-row writer, rate-limit check |
| `src/lib/notes-and-time.ts` | CREATE | Extract shared `createNoteAndTimeEntry()` helper from existing `/api/admin/project-notes` POST so both that route AND the new CLI endpoint share one code path |
| `src/app/api/admin/project-notes/route.ts` | MODIFY | POST handler delegates to `createNoteAndTimeEntry()` |
| `src/app/api/cli/handoff/project-notes/route.ts` | CREATE | Bearer-auth + delegate to shared helper; `client_code` resolution as alt to `project_id` |
| `src/app/api/admin/cli-tokens/route.ts` | CREATE | POST create (returns plaintext once), GET list (all admins see all) |
| `src/app/api/admin/cli-tokens/[id]/route.ts` | CREATE | GET token detail (no plaintext) |
| `src/app/api/admin/cli-tokens/[id]/audit/route.ts` | CREATE | GET paginated audit log for one token |
| `src/app/api/admin/cli-tokens/[id]/revoke/route.ts` | CREATE | POST revoke |
| `src/app/admin/account/cli-tokens/page.tsx` | CREATE | List view + "Generate" button + per-row revoke action |
| `src/app/admin/account/cli-tokens/CreateTokenModal.tsx` | CREATE | Modal asks name + expiry; on submit shows full token ONCE with copy button + paste-into-dsig.env instructions |
| `src/app/admin/account/cli-tokens/[id]/page.tsx` | CREATE | Per-token audit log view |
| `src/components/admin/admin-sidebar.tsx` | MODIFY | Add "CLI Tokens" link under ADMIN nav group |
| `Y:\.claude\commands\handoff.md` | MODIFY | Step 11.D: read `process.env.DSIG_CLI_TOKEN`, POST with Bearer header, fall back to paste-instructions on missing/rejected token. Bump to v1f. |
| `Y:\DSIG\demandsignals-next\CLAUDE.md` | MODIFY | §4 credentials section adds `DSIG_CLI_TOKEN` to the env-vars list (Tier 2a) |
| `docs/INDEX.md` | MODIFY | Update spec status DRAFT → CODE SHIPPED; add plan entry |
| `MEMORY.md` | MODIFY | New SHIPPED entry |

---

## Task 1: Migration 050 — cli_tokens + cli_token_audit

**Files:** `supabase/migrations/050_cli_tokens.sql`, `supabase/migrations/APPLY-050-2026-05-08.sql`

- [ ] **Step 1.1:** Write `050_cli_tokens.sql` per spec §1 migration block. Includes both tables, all indexes (`idx_cli_tokens_active`, `idx_cli_tokens_expiry_sweep`, `idx_cli_token_audit_token`, `idx_cli_token_audit_rate_limit`), RLS enabled with no policies (service-role only).
- [ ] **Step 1.2:** Write `APPLY-050-2026-05-08.sql` as fully inlined web-editor-safe wrapper (per CLAUDE.md §12 lesson).
- [ ] **Step 1.3:** Hunter applies via Supabase web SQL Editor.
- [ ] **Step 1.4:** Verify in Table Editor that both tables exist; query `SELECT count(*) FROM cli_tokens` and `cli_token_audit` return 0 without error.

**Gate:** Tables exist; rls enabled.

---

## Task 2: Add bcryptjs dependency

**Files:** `package.json`, `package-lock.json`

- [ ] **Step 2.1:** From PowerShell at `D:\dev\demandsignals-next\`: `npm install bcryptjs && npm install -D @types/bcryptjs`
- [ ] **Step 2.2:** Sync `package.json` + `package-lock.json` back to `Y:\DSIG\demandsignals-next\`.
- [ ] **Step 2.3:** Run `npm run build` to confirm no edge-runtime issues with the import.

**Gate:** Build passes; bcryptjs imported in a test file resolves.

---

## Task 3: CLI auth library + token generator

**Files:** `src/lib/cli-auth.ts`, `tests/cli-auth.test.ts`

- [ ] **Step 3.1:** Create `src/lib/cli-auth.ts` exporting:
  - `generateCliToken(): { plaintext, prefix, last4, hash }` — generates `dsigcli_<43-char-base64url>` via `crypto.getRandomValues(new Uint8Array(32))`, computes prefix (first 12 chars) + last4, bcrypt-hashes (cost 10).
  - `authenticateCliRequest(request, options): Promise<CliAuthResult>` — extracts Bearer, looks up by prefix, bcrypt-compares, checks `revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())`, runs rate-limit check, ALWAYS writes an audit row.
  - `recordCliAudit(args)` — internal helper for audit insertion.
  - `checkCliRateLimit(tokenId): Promise<{ ok, attemptsInWindow, retryAfter }>` — counts `cli_token_audit` rows where `cli_token_id=? AND status_code=200 AND created_at > now() - interval '60 minutes'`. Cap = 60.
  - Type `CliAuthResult = { ok: true, tokenId, createdBy } | { ok: false, reason: 'no_token' | 'invalid_token' | 'revoked_token' | 'token_expired' | 'rate_limited' | 'env_misconfig' }`.
- [ ] **Step 3.2:** Update `last_used_at` on success (best-effort, non-blocking promise).
- [ ] **Step 3.3:** Bcrypt cost 10 (~50ms) is acceptable; do NOT compromise on cost.
- [ ] **Step 3.4:** Unit tests in `tests/cli-auth.test.ts`:
  - generateCliToken returns plaintext with `dsigcli_` prefix and 51 total chars
  - prefix is 12 chars, last4 is 4 chars
  - bcrypt hash verifies against the plaintext but NOT against any wrong value
  - Token format regex: `/^dsigcli_[A-Za-z0-9_-]{43}$/`
- [ ] **Step 3.5:** Mock supabaseAdmin via `vi.mock` (matches existing test pattern from `portal-auth.test.ts` we deleted earlier — copy the pattern).

**Gate:** All unit tests pass; `npm run typecheck` clean.

---

## Task 4: Extract shared notes-and-time helper

**Files:** `src/lib/notes-and-time.ts`, `src/app/api/admin/project-notes/route.ts` (modify)

- [ ] **Step 4.1:** Create `src/lib/notes-and-time.ts` exporting `createNoteAndTimeEntry(input, audit)` where:
  - `input` matches the existing zod schema in `/api/admin/project-notes` (project_id OR client_code, body, title?, visibility?, source, hunter_minutes?, claude_minutes?, session_started_at?, session_ended_at?, phase_id?, deliverable_id?)
  - `audit` is `{ source: 'admin' | 'cli', actor_id: string, actor_label: string }` — drives `created_by` (uuid for admin path, null for CLI) AND `logged_by` text (admin email vs `cli:<token-name>`)
  - Returns `{ note, time_entry }`
- [ ] **Step 4.2:** Move the SQL inserts from `/api/admin/project-notes/route.ts` into the helper. Keep the hours-mirror logic (`hours = (hunter+claude)/60`).
- [ ] **Step 4.3:** Resolve `client_code` → `project_id` inside the helper (most-recently-updated active project for the matched client; error if zero or ambiguous).
- [ ] **Step 4.4:** Update `/api/admin/project-notes/route.ts` POST to delegate to the helper, passing `audit: { source: 'admin', actor_id: auth.admin.id, actor_label: auth.user?.email ?? 'admin' }`.
- [ ] **Step 4.5:** Existing tests + paste-handoff flows must continue working — manual smoke after this step.

**Gate:** Existing admin paste-handoff flow at `/admin/timekeeping` and `/admin/projects/[id]` still creates note + time entry correctly. Typecheck clean.

---

## Task 5: CLI endpoint

**Files:** `src/app/api/cli/handoff/project-notes/route.ts`

- [ ] **Step 5.1:** POST handler:
  - Calls `authenticateCliRequest(request, { method: 'POST', path: '/api/cli/handoff/project-notes' })`
  - On `!ok`: return 401 (or 429 for rate-limited) with `{ error, reason }`
  - On `ok`: parse body via the same zod schema as the admin route
  - Look up token name for `actor_label` ("cli:<name>")
  - Delegate to `createNoteAndTimeEntry(input, { source: 'cli', actor_id: createdBy, actor_label: 'cli:<name>' })`
  - Return `{ note, time_entry, audit_id }`
- [ ] **Step 5.2:** `created_by` on the note row = NULL for CLI source (no admin_users.id directly tied; the CLI token's creator is recorded on the audit row but not on the note itself per spec §4).
- [ ] **Step 5.3:** Reject any request whose body has `visibility: 'internal'` — CLI is only for client-visible notes (handoff source).
- [ ] **Step 5.4:** No CSRF check (Bearer auth is the gate; no cookie-based attacks possible).

**Gate:** A `curl -X POST` with a valid Bearer token + JSON body creates the note + time entry; with invalid token returns 401; with too many rapid valid calls returns 429.

---

## Task 6: Admin API routes for token management

**Files:**
- `src/app/api/admin/cli-tokens/route.ts`
- `src/app/api/admin/cli-tokens/[id]/route.ts`
- `src/app/api/admin/cli-tokens/[id]/audit/route.ts`
- `src/app/api/admin/cli-tokens/[id]/revoke/route.ts`

- [ ] **Step 6.1:** `POST /api/admin/cli-tokens` — `requireAdmin()`. Body: `{ name, expires_at? }`. Calls `generateCliToken()`, inserts row with `created_by = auth.admin.id`. Returns `{ token, prefix, last4, expires_at, plaintext }` ONCE — `plaintext` is the only path it's ever returned.
- [ ] **Step 6.2:** `GET /api/admin/cli-tokens` — `requireAdmin()`. Returns all rows in the table ordered by `created_at DESC`. Includes prefix, last4, name, created_at, expires_at, last_used_at, revoked_at, revoked_by, revoked_reason, created_by (joined to admin_users for display). NO plaintext, NO hash.
- [ ] **Step 6.3:** `GET /api/admin/cli-tokens/[id]` — single token detail (same fields as list, no plaintext).
- [ ] **Step 6.4:** `GET /api/admin/cli-tokens/[id]/audit?limit=50&offset=0` — paginated `cli_token_audit` rows for that token.
- [ ] **Step 6.5:** `POST /api/admin/cli-tokens/[id]/revoke` — sets `revoked_at = now(), revoked_by = auth.admin.id, revoked_reason = 'manual'`. Idempotent (revoking an already-revoked token returns 200 with current state).
- [ ] **Step 6.6:** All four routes use `requireAdmin()` — the standard CSRF + Origin checks apply.

**Gate:** Each endpoint exercised manually with curl + admin cookie produces expected output. List endpoint returns ALL rows regardless of which admin called it (multi-admin visibility per spec).

---

## Task 7: Admin UI — list, create modal, audit log

**Files:**
- `src/app/admin/account/cli-tokens/page.tsx`
- `src/app/admin/account/cli-tokens/CreateTokenModal.tsx`
- `src/app/admin/account/cli-tokens/[id]/page.tsx`
- `src/components/admin/admin-sidebar.tsx` (modify — add link)

- [ ] **Step 7.1:** Sidebar link "CLI Tokens" under ADMIN nav group; lucide icon `Key`.
- [ ] **Step 7.2:** List page: table of all tokens (active, expired, revoked) with columns Name, Prefix, Last4, Created, Expires, Last used, Created by (admin name), Status, Actions. Top-right "Generate new token" button. Status badges: ACTIVE (emerald), EXPIRES SOON (amber if `expires_at < now() + 7d`), EXPIRED (slate), REVOKED (slate-with-strike).
- [ ] **Step 7.3:** Each row's actions: View audit log link → `[id]` page; Revoke button (active rows only) with confirmation dialog.
- [ ] **Step 7.4:** `CreateTokenModal`: fields `name` (required, max 100 chars), `expires_at` (dropdown: Never / 7 days / 30 days / 90 days / Custom — Custom shows date input). On submit, POST to `/api/admin/cli-tokens`, swap modal content to display the plaintext token in a copy-to-clipboard card with prominent "**This is your only chance**" instructions and the `Y:\.credentials\dsig.env` paste path. Single "I've copied it — close" button.
- [ ] **Step 7.5:** Audit-log detail page: header with token info; table of audit rows (created_at desc, paginated 50/page). Columns: Time, Method, Path, Status, IP, Failure reason. Status badge tint by code (200=emerald, 401=red, 429=amber).

**Gate:** Full UI flow works end-to-end. Generate token → see it once → close → row appears in list with prefix/last4/never-used. Click revoke → row marked revoked → no longer usable. Click View audit → see attempts.

---

## Task 8: `/handoff` Step 11.D wired to the CLI endpoint

**Files:** `Y:\.claude\commands\handoff.md`

- [ ] **Step 8.1:** Step 11.D reads `process.env.DSIG_CLI_TOKEN`. If absent OR empty, surface to Hunter: "DSIG_CLI_TOKEN not set in dsig.env — falling back to paste-handoff at /admin/timekeeping. (Generate a token at /admin/account/cli-tokens to enable auto-write.)" and continue with the existing artifact display.
- [ ] **Step 8.2:** If present, after Hunter's confirmation, POST to `https://demandsignals.co/api/cli/handoff/project-notes` with:
  - `Authorization: Bearer ${process.env.DSIG_CLI_TOKEN}`
  - `Content-Type: application/json`
  - Body: `{ project_id (or client_code), title, body (CLIENT UPDATE artifact), source: 'handoff', session_started_at, session_ended_at, hunter_minutes, claude_minutes }`
- [ ] **Step 8.3:** On 200: confirm `Note written → /admin/projects/<id> · time entry created · audit ${audit_id} · digest fires <next 9am PT>`.
- [ ] **Step 8.4:** On 401: surface "CLI token rejected — check `Y:\.credentials\dsig.env` or generate a new token at /admin/account/cli-tokens." Keep artifacts displayed for paste fallback.
- [ ] **Step 8.5:** On 429: surface "Rate limit hit (60/hr) — wait or generate a fresh token." Keep artifacts displayed for paste fallback.
- [ ] **Step 8.6:** On any other non-200: surface error + status code + paste-fallback instructions.
- [ ] **Step 8.7:** Bump command version to v1f. Add changelog entry documenting the env-var read + endpoint URL.

**Gate:** Run `/handoff` against the demandsignals-next project with a valid token in `dsig.env` → row appears in `project_notes` + `project_time_entries` + `cli_token_audit`. Run with `dsig.env` value blanked → fallback message displays.

---

## Task 9: CLAUDE.md credentials update

**Files:** `Y:\DSIG\demandsignals-next\CLAUDE.md` (project-level; root CLAUDE.md unchanged)

- [ ] **Step 9.1:** §4 credentials table adds row for `DSIG_CLI_TOKEN` describing what it's for ("CLI bearer token for /handoff platform writes").
- [ ] **Step 9.2:** Brief note: token issued at `/admin/account/cli-tokens`, pasted once into `dsig.env`, shared across admin team via the NAS-shared credentials file.

**Gate:** Read-through confirms the new env var is documented in the same place as the others.

---

## Task 10: Build + manual smoke

**Files:** none

- [ ] **Step 10.1:** From PowerShell at `D:\dev\demandsignals-next\`: `git pull` to grab latest from master.
- [ ] **Step 10.2:** `npm install` (picks up bcryptjs).
- [ ] **Step 10.3:** `npx tsc --noEmit` — must be zero errors.
- [ ] **Step 10.4:** `npm run build` — must succeed.
- [ ] **Step 10.5:** Local `npm run dev` smoke: sign in as admin, navigate to `/admin/account/cli-tokens`, generate a test token, copy it, store in a temp `.env.local` as `DSIG_CLI_TOKEN`, hit `/api/cli/handoff/project-notes` with `curl` from a different shell, verify 200 + row created. Revoke the test token, retry the curl, verify 401.

**Gate:** Build green; manual smoke passes.

---

## Task 11: Deploy + production smoke

**Files:** none

- [ ] **Step 11.1:** Apply migration 050 in production Supabase via web SQL Editor (Hunter step).
- [ ] **Step 11.2:** `git push origin master` (Vercel auto-deploys).
- [ ] **Step 11.3:** Confirm deploy SHA matches the commit (per CLAUDE.md §12 deploy-lag lesson) before testing.
- [ ] **Step 11.4:** Sign in to production admin portal, navigate `/admin/account/cli-tokens`, generate a real token (name: "DSIG shared CLI", expiry: Never).
- [ ] **Step 11.5:** Hunter pastes the token value into `Y:\.credentials\dsig.env` as `DSIG_CLI_TOKEN=...`. Save.
- [ ] **Step 11.6:** Run `/handoff` against demandsignals-next. Verify the platform-write step succeeds. Check `/admin/account/cli-tokens/[id]` audit log shows the call.

**Gate:** Production end-to-end passes. Token in dsig.env. /handoff Step 11.D auto-writes.

---

## Task 12: Update MEMORY.md + INDEX.md

**Files:** `MEMORY.md`, `docs/INDEX.md`

- [ ] **Step 12.1:** Add SHIPPED entry to `MEMORY.md` for cli-tokens build with commit range and architectural decisions locked.
- [ ] **Step 12.2:** Update spec status in `docs/INDEX.md` from DRAFT to SHIPPED.
- [ ] **Step 12.3:** Add this plan file to `docs/INDEX.md` plans table.

**Gate:** Memory + INDEX reflect shipped state. Final commit + push.

---

## Risk register

| Risk | Mitigation |
|---|---|
| Bcrypt slow on Vercel cold start | Cost-10 is ~50ms; acceptable. Lookup uses `prefix` index first to find the candidate row, THEN bcrypt-compares. Single bcrypt call per request. |
| Token leaked in `dsig.env` (file-copy, screenshot, etc.) | Any active admin can revoke instantly via UI. Generate new token + update dsig.env. The token is one of many secrets in the file — treat the whole file per CLAUDE.md §4. |
| CLI endpoint scope creep | Spec §components-default-deny rule. New CLI endpoints require spec amendment. The bearer auth helper does NOT itself authorize paths — each CLI route opts in. |
| Rate-limit too aggressive (legitimate retry storms denied) | 60 successful POSTs/hr/token. A normal /handoff session writes 1 row. If we hit 60, something's broken — backpressure is correct. |
| Multi-admin race on token generation | Each token has its own UUID; multiple admins generating simultaneously each get a different row. No collision possible. |
| `created_by` admin gets deactivated mid-token-life | Token still works (token_hash + revoked_at gate, not admin_users state). v2 could add admin-deactivation cleanup that revokes their tokens. v1: not in scope. |
| Audit table grows unboundedly | Append-only; one row per CLI auth attempt. At expected volume (~1 row per /handoff session, plus failed attempts) it's tiny. Add a 90-day pruning cron in v2 if the table ever exceeds 100k rows. |

---

## Notes for the agentic worker

- PowerShell tool for npm/npx/tsc/next-build (per root §13). Bash for git/gh/dedicated-tool ops.
- Build/run only on `D:\dev\demandsignals-next\` — never on Y: (per §5).
- Apply migrations in numerical order. Never skip the APPLY-* wrapper file.
- After each Task's Gate is green, commit with a focused message. Push at end of each block of 2–3 tasks for incremental verification.
- The spec is locked. If something in this plan conflicts with the spec, the spec wins — surface the conflict and ask before deviating.
- **Default-deny on the CLI endpoint surface.** Adding any new `/api/cli/*` route requires a spec amendment, not a code patch.
