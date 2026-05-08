# CLI Tokens for /handoff Platform Writes

**Date:** 2026-05-08
**Status:** v1.1 LOCKED → ready for implementation plan

## Problem

The `/handoff` slash command's Step 11.D wants to POST CLIENT UPDATE + TIME TRACKING artifacts directly to `https://demandsignals.co/api/admin/project-notes` so notes timeline + project_time_entries get populated automatically at session end. Today this fails because the endpoint is gated by `requireAdmin()` which checks for a Supabase Auth browser session cookie. Claude Code sessions running from Hunter's workstation have no such cookie, so the POST returns 401. Net result: Step 11.D is a no-op, and Hunter must manually paste the artifacts into `/admin/timekeeping` or `/admin/projects/[id]` (the paste-handoff fallback shipped in commit `4da29b2`).

We want a clean automated path with strong security properties: revocable, scoped, rate-limited, audited.

## Goals

1. `/handoff` Step 11.D POSTs to a CLI endpoint without manual paste.
2. Authentication is via a long-lived bearer token Hunter generates in the admin UI and pastes into `Y:\.credentials\dsig.env` as `DSIG_CLI_TOKEN=...`.
3. Tokens are revocable instantly from the admin UI; revoked tokens 401 immediately.
4. Tokens are scoped — they can only hit a known allowlist of endpoints (notes + time entries today). They cannot delete data, manage clients, change settings, etc.
5. Every CLI write is rate-limited (per token) and audited (every call logs a row).
6. Token values appear in chat ONCE at creation. After that the value is hashed in the DB; admin only sees a prefix and last-4.
7. Token rotation is graceful — admin generates a new token, updates `dsig.env`, then revokes the old.

## Non-goals

- **No SSO replacement.** Admins still sign into the browser portal via Supabase Google OAuth. CLI tokens are an additional credential, not a substitute.
- **No general-purpose API.** This is not a public API; it's a CLI-side bearer specifically for `/handoff` and similar Hunter-controlled tooling.
- **No scope drift.** All tokens have the same scope (the CLI allowlist below). Per-scope tokens can come in v2 if the surface grows.
- **No auto-rotation.** Admin manually rotates if they think a token is compromised. (No clean way to deliver a rotated token back to `dsig.env` without manual intervention anyway.)
- **No browser-session bridging.** This token does NOT impersonate the admin's browser session. CLI calls authenticate as `cli:<token-name>`; the audit log shows that, not the admin's email.

**Locked decisions (per Hunter, 2026-05-08):**
- **Tokens are shared across the admin team.** Y: is a multi-workstation NAS. `Y:\.credentials\dsig.env` is shared, so any admin running `/handoff` from any workstation reads the same `DSIG_CLI_TOKEN`. Per-creator visibility filtering would create a false ownership model. **All admins see ALL tokens** in `/admin/account/cli-tokens`. Anyone can revoke any token.
- **Auto-expiry is opt-in.** New optional `expires_at` field at token creation (nullable timestamptz). Default = no expiry. Admin can choose 7 / 30 / 90 days / custom date if they want a self-destructing token.
- **Token-per-workstation is a non-issue.** The shared `dsig.env` means a single token serves every workstation. The `name` field is purely descriptive ("DSIG shared CLI", "CI runner", etc.) — does not gate visibility or routing.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ Token issuance (one-time per token, browser-only)                │
│                                                                  │
│  Hunter signs into /admin (Google OAuth → Supabase session)      │
│    ↓                                                             │
│  /admin/account/cli-tokens → "Generate token"                    │
│    ↓ POST /api/admin/cli-tokens (requireAdmin)                   │
│  Server generates 32-byte random token (display once)            │
│  Stores bcrypt hash in cli_tokens (token_hash)                   │
│    ↓                                                             │
│  UI shows the token value ONCE in a copy-to-clipboard card       │
│  Hunter pastes into Y:\.credentials\dsig.env                     │
│  After page reload, only the prefix + last-4 are shown           │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ /handoff Step 11.D — token-auth POST                             │
│                                                                  │
│  /handoff command runs at session end                            │
│    ↓ Hunter approves the three artifacts                         │
│  Read process.env.DSIG_CLI_TOKEN                                 │
│    ↓                                                             │
│  POST /api/cli/handoff/project-notes                             │
│    Authorization: Bearer dsigcli_<token>                         │
│    Content-Type: application/json                                │
│    Body: { project_id, body, hunter_minutes, ... }               │
│    ↓                                                             │
│  Server: extract bearer → bcrypt-compare against active rows     │
│    ↓ found → resolve cli_tokens.id + admin_user_id (creator)     │
│    ↓ rate-limit check (60/hr/token, see §rate-limit)             │
│    ↓ insert cli_token_audit row (always, success or failure)     │
│    ↓ delegate to existing project-notes create logic             │
│  Returns 200 { note: {...}, time_entry: {...} }                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ Revocation                                                       │
│                                                                  │
│  /admin/account/cli-tokens → click "Revoke" on a token row       │
│    ↓ POST /api/admin/cli-tokens/[id]/revoke                      │
│  Server sets revoked_at = now(), revoked_by = admin_user_id      │
│    ↓                                                             │
│  Next CLI request with that token: bcrypt match still finds it,  │
│  but revoked_at filter rejects, returns 401, audit row written   │
│    ↓                                                             │
│  Token effectively dead within seconds (no caching)              │
└──────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Database — migration `050_cli_tokens.sql`

```sql
-- CLI tokens table. One row per issued token. Token value is bcrypt-
-- hashed; the plaintext value is shown to the admin once at creation
-- and never stored.
CREATE TABLE IF NOT EXISTS cli_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Display fields
  name text NOT NULL,                       -- admin-chosen, e.g. "DSIG shared CLI"
  prefix text NOT NULL,                     -- first 12 chars of token, for display
  last4 text NOT NULL,                      -- last 4 chars, for display
  -- Auth
  token_hash text NOT NULL,                 -- bcrypt(token), cost=10
  -- Who created it (audit only — does NOT gate visibility, all admins see all tokens)
  created_by uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  -- State
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,                   -- optional auto-expiry; null = never expires
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES admin_users(id),
  revoked_reason text
);

CREATE INDEX IF NOT EXISTS idx_cli_tokens_active
  ON cli_tokens(prefix)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cli_tokens_expiry_sweep
  ON cli_tokens(expires_at)
  WHERE expires_at IS NOT NULL AND revoked_at IS NULL;

COMMENT ON TABLE cli_tokens IS
  'CLI bearer tokens for /handoff and similar tooling. Plaintext value bcrypt-hashed; only prefix + last4 shown after creation. Shared across admin team — all admins can list, audit, and revoke any token (matches Y:\.credentials\dsig.env shared-across-workstations model). expires_at is optional; null = never expires.';

-- Audit log. Every CLI bearer-auth attempt logs a row, success or
-- failure. Drives rate limiting + suspicious-activity tracking.
CREATE TABLE IF NOT EXISTS cli_token_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cli_token_id uuid REFERENCES cli_tokens(id) ON DELETE SET NULL,
  -- What the request was
  method text NOT NULL,                     -- 'POST' | 'GET'
  path text NOT NULL,                       -- '/api/cli/handoff/project-notes'
  status_code integer NOT NULL,             -- HTTP status returned
  -- Request metadata
  ip inet,
  user_agent text,
  -- Failure reason if status >= 400
  failure_reason text,                      -- 'invalid_token' | 'revoked_token' | 'rate_limited' | 'scope_denied' | etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cli_token_audit_token
  ON cli_token_audit(cli_token_id, created_at DESC)
  WHERE cli_token_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cli_token_audit_rate_limit
  ON cli_token_audit(cli_token_id, created_at DESC)
  WHERE status_code = 200;

COMMENT ON TABLE cli_token_audit IS
  'Append-only log of CLI bearer-auth attempts. Drives the per-token rate limit (60/hr) and is the audit feed for /admin/account/cli-tokens detail views.';

-- RLS — service role only. No direct anon/authenticated access.
ALTER TABLE cli_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE cli_token_audit ENABLE ROW LEVEL SECURITY;
```

### 2. Token format

`dsigcli_<32-byte-random-base64url>`

- Fixed `dsigcli_` prefix → easy visual identification, easy regex match in env files
- 32 random bytes encoded base64url (43 chars) → 256 bits of entropy
- Total length: 51 characters
- `prefix` field stores `dsigcli_<first-4-chars>` (12 total)
- `last4` field stores last 4 chars

### 3. Auth helper — `src/lib/cli-auth.ts`

```ts
export interface CliAuthResult {
  ok: boolean
  tokenId?: string
  createdBy?: string  // admin_users.id
  reason?: 'no_token' | 'invalid_token' | 'revoked_token' | 'rate_limited' | 'env_misconfig'
}

// Verifies the bearer token, checks rate limit, logs audit row.
// Returns ok:true with tokenId + createdBy when valid, otherwise
// returns ok:false with a structured reason. ALWAYS writes an audit
// row (one per call) regardless of outcome.
export async function authenticateCliRequest(
  request: NextRequest,
  options: { method: string; path: string },
): Promise<CliAuthResult>
```

Implementation notes:
- Bearer token extracted from `Authorization: Bearer <token>` header
- Look up by `prefix` (first 12 chars of presented token = `dsigcli_<4>`) — indexed query, fast
- bcrypt-compare presented full token against stored `token_hash`
- If match: check `revoked_at IS NULL`
- Rate limit: count `cli_token_audit` rows for this token in last 60 min where `status_code = 200`. If ≥ 60, deny with `rate_limited`.
- Audit row always written, with the actual status returned (200 if everything green, 401 if not, 429 if rate-limited).
- bcrypt cost factor 10 (~50ms per check) — acceptable for our throughput.

### 4. CLI endpoint — `src/app/api/cli/handoff/project-notes/route.ts`

```ts
POST /api/cli/handoff/project-notes
Authorization: Bearer dsigcli_...
Content-Type: application/json

{
  "project_id": "<uuid>",                  // required (or "client_code" alt — see below)
  "client_code": "DSIG",                   // alt to project_id; resolved to most-recent active project
  "body": "...",                           // required, the CLIENT UPDATE artifact body
  "title": "...",                          // optional 200-char headline
  "visibility": "client",                  // default 'client'; only 'client' allowed via CLI
  "session_started_at": "<ISO>",           // optional
  "session_ended_at": "<ISO>",             // optional, defaults to now()
  "hunter_minutes": 330,                   // integer
  "claude_minutes": 195                    // integer
}
```

Behavior:
- Calls `authenticateCliRequest()`. On failure returns 401 (or 429 for rate-limited).
- If `client_code` provided instead of `project_id`, resolve to the prospect's most-recently-updated active project.
- Delegates to the existing `createNoteAndTimeEntry` helper (extract from `/api/admin/project-notes` POST handler so both routes share logic).
- Sets `created_by` on the project_notes row to NULL (CLI doesn't have an admin_users.id directly — uses `cli_token.created_by` for audit, but the note isn't "by" that admin).
- Sets the time-entry's `logged_by` to `cli:<token-name>` so admins can tell at a glance these were CLI-sourced.
- Returns `{ note, time_entry, audit_id }`.

**Scope:** This is the ONLY CLI endpoint in v1. No `/api/cli/anything-else`. Adding more endpoints requires explicit spec amendment. Default-deny is the rule.

### 5. Admin UI — `/admin/account/cli-tokens`

Lives under a new `/admin/account/*` segment for "things admins manage about themselves" (also a future home for personal preferences, etc.).

#### List view: `/admin/account/cli-tokens/page.tsx`

```
┌────────────────────────────────────────────────────────────────┐
│ CLI Tokens                              [Generate new token]   │
├────────────────────────────────────────────────────────────────┤
│  Name              Prefix     Last4  Created    Last used  ▾  │
├────────────────────────────────────────────────────────────────┤
│  Hunter's WS1     dsigcli_xK  ...A8  May 8     2 min ago   ⋮  │
│  CI runner        dsigcli_pQ  ...K2  May 1     —           ⋮  │
│  Old laptop       dsigcli_zL  ...M9  Apr 14    —    REVOKED ⋮  │
└────────────────────────────────────────────────────────────────┘
```

Each row's ⋮ menu: View audit log · Revoke (active rows only).

#### Create flow

Click "Generate new token" → modal asks for:
- `name` (required, e.g. "DSIG shared CLI" or "Token rotation 2026-Q3")
- `expires_at` (optional dropdown: Never · 7 days · 30 days · 90 days · Custom date)

→ POST `/api/admin/cli-tokens` → modal swaps to display the FULL token in a copy-button card with bold instructions:

> **This is your only chance to copy this token.** Paste it into `Y:\.credentials\dsig.env` as `DSIG_CLI_TOKEN=<paste-here>`. The token is shared across all admin workstations via the NAS — all admins can use it; all admins can revoke it. After you close this dialog, only the prefix + last-4 will be visible.

Single "I've copied it" confirmation button to dismiss.

#### Audit-log detail view: `/admin/account/cli-tokens/[id]`

Per-token timeline of `cli_token_audit` rows: time, method, path, status code, IP, failure reason. Paginated 50 per page. Read-only.

#### Revoke

Click "Revoke" → confirm dialog ("Are you sure? This token will be denied immediately. You'll need to generate a new one and update `dsig.env` if anything was using it.") → POST `/api/admin/cli-tokens/[id]/revoke` → row sets `revoked_at + revoked_by + revoked_reason='manual'` → next CLI call with that token returns 401.

### 6. Admin API routes — `src/app/api/admin/cli-tokens/`

```
POST   /api/admin/cli-tokens              — create new (returns plaintext once)
GET    /api/admin/cli-tokens              — list ALL tokens across the admin team
GET    /api/admin/cli-tokens/[id]/audit   — paginated audit log for one token
POST   /api/admin/cli-tokens/[id]/revoke  — mark revoked (any active admin)
```

Token visibility: ALL active admins see ALL tokens. Matches the shared-`dsig.env` reality — no false ownership model. The `created_by` field is preserved for audit ("who issued this") but does not gate any read or write.

### 7. `/handoff` Step 11.D update

Read `process.env.DSIG_CLI_TOKEN`. If absent, fall back to the paste-fallback message ("paste your handoff into /admin/timekeeping"). If present, POST to `/api/cli/handoff/project-notes` with Bearer header. On 401: surface "CLI token rejected — generate a new one at /admin/account/cli-tokens." On 429: surface "Rate limit hit — try again in ~1 hour or revoke and re-generate."

The /handoff command file itself updated to v1f documenting the env var requirement and the new endpoint URL.

### 8. Rate limit details

- 60 successful POSTs per hour per token
- Counted from `cli_token_audit` rows where `status_code = 200` for that `cli_token_id` in the last 60 min
- Failed attempts (401, 400, etc.) do NOT count against the rate limit — only successful writes do
- Exceeding the limit returns 429 with `Retry-After` header
- Rationale: a normal /handoff session writes 1 row. 60/hr is way more than humanly plausible from a single workstation. If we ever hit it, something's wrong (loop bug, accidental retry storm) — backpressure is the right response.

## Required env vars

```
DSIG_CLI_TOKEN=dsigcli_<43-char-base64url>   # in Y:\.credentials\dsig.env
```

Vercel does NOT need this set — the Vercel runtime is the SERVER side, it verifies tokens against the DB. The token only needs to live where the CLI runs (Hunter's workstation env via `dsig.env`).

## Threat model

| Attack | Mitigation |
|---|---|
| Token leaked in a screenshot, blog post, or chat | Admin revokes via `/admin/account/cli-tokens` — instant. Generate a new one + update `dsig.env`. |
| Token brute-forced from prefix | 256 bits of entropy + bcrypt cost-10 — infeasible. Lookup is by prefix (cheap) but verification is by full bcrypt-compare (slow). |
| Audit log spam (attacker fires 1000s of bad-token requests) | Each call writes one audit row — if abuse, audit table grows. Mitigation: per-IP rate limit on `/api/cli/*` at the CDN layer (Cloudflare) before token lookup. v1 ships without; revisit if abuse appears. |
| Stolen `dsig.env` | Hunter's responsibility per CLAUDE.md §4. The token is one of many secrets in that file; treat the whole file as a secret. Revoke all CLI tokens on file-leak detection. |
| CLI write to wrong project | The endpoint trusts `project_id` from the request body. /handoff's project-resolution step happens BEFORE the POST and shows the resolved project to Hunter for confirmation. The server doesn't second-guess. |
| Token used after admin who created it leaves the team | Admin's `is_active=false` does NOT auto-revoke their CLI tokens (separate concern). v2 could add a cleanup job. v1: deactivating an admin should also walk their `cli_tokens` and revoke them — add to the admin-deactivation flow. |
| CLI endpoint scope creep | Default-deny rule above. Adding endpoints requires spec amendment. The bearer auth middleware should refuse paths not on the explicit allowlist (`/api/cli/handoff/project-notes` is the only one in v1). |

## Build sequence

1. **Migration 050** — `cli_tokens` + `cli_token_audit` tables, indexes, RLS
2. **Auth lib** — `src/lib/cli-auth.ts` with `authenticateCliRequest()` + bcrypt verify + rate-limit check + audit-row write
3. **Add `bcryptjs` dep** — pure-JS bcrypt; works in Node + Edge if needed
4. **Extract `createNoteAndTimeEntry` helper** from existing `/api/admin/project-notes` POST so the CLI endpoint can reuse it without code duplication
5. **CLI endpoint** — `src/app/api/cli/handoff/project-notes/route.ts`
6. **Admin API routes** — POST create, GET list, GET audit, POST revoke under `/api/admin/cli-tokens/`
7. **Admin pages** — `/admin/account/cli-tokens/page.tsx` + `[id]/page.tsx` + create modal + revoke confirm
8. **`/handoff` command update to v1f** — read env, POST, error handling, fallback message
9. **Test flow** — generate token in admin UI, paste into local `dsig.env`, run `/handoff` against demandsignals-next project, verify row appears in `project_notes` + `project_time_entries` + `cli_token_audit`
10. **Update CLAUDE.md §4** — document the new env var DSIG_CLI_TOKEN and the credential surface

## Open questions (resolved 2026-05-08)

1. **Multi-admin visibility:** ALL admins see ALL tokens. Matches the shared-`dsig.env` reality.
2. **Auto-expiry:** Optional opt-in field at creation; default = never expires. Choices in UI: Never / 7d / 30d / 90d / Custom.
3. **Token-per-workstation:** Moot — single shared token via `dsig.env` works for every admin on every workstation. The `name` field is purely descriptive.
4. **Token VALUE in audit log:** Never logged. Only `cli_token_id` for back-reference to display fields.

## Expiry enforcement

The auth helper (`authenticateCliRequest`) checks both `revoked_at IS NULL` AND `(expires_at IS NULL OR expires_at > now())`. Expired tokens 401 with `failure_reason='token_expired'`. A small daily cron (or just lazy enforcement on next use) can also auto-set `revoked_at = expires_at` and `revoked_reason = 'auto_expired'` for cleaner reporting — that's a small follow-up after v1 ships.
