# Client Portal v1 — Account, Invoices, Projects

**Date:** 2026-05-07
**Status:** v1.1 LOCKED → ready for implementation plan
**Worktree:** `Y:\DSIG\demandsignals-next\.claude\worktrees\pensive-gagarin-8785ea` (branch `claude/pensive-gagarin-8785ea`)

**v1.1 changes:** Logout = revoke ALL sessions. New `portal@demandsignals.co` alias + `portal_signin` EmailKind. Project notes + daily digest scope folded in. Time tracking table (`project_time_entries`) shipped as part of this build. Digest fires at 9am PT, sweeps prior 24h. Empty digest = silent. SMS = teaser link. Email = full digest. Default "General Support" project auto-materialized per client. Backfill of historical notes deferred. Client-side proofing/editing on notes deferred to a future spec.

## Problem

Every artifact a DSIG client cares about — invoices, receipts, SOWs, projects, payment schedules, subscriptions, bookings — already exists in our system. None of it is reachable by the client without a per-document magic-link emailed at dispatch time. There is no "log in and see my account" surface.

Concretely, today a client cannot:
- See a list of their invoices and which are outstanding
- Look up a receipt from three months ago
- See project status, what phase they're in, what's been delivered, what's coming
- See their payment schedule (paid vs upcoming installments)
- Update or correct their own contact info (they email us; we type)

Magic-link pages (`/sow/[number]/[uuid]`, `/invoice/[number]/[uuid]`, `/quote/s/[token]`) are unauthed proof-of-possession URLs. They work for one-off "click to pay" flows but cannot be the primary client-facing surface as the book of business grows. v1 is the cockpit: log in once, see everything.

## Goals

1. A client whose `prospects.is_client = true` can log in at `demandsignals.co/portal/login` via magic-link or Google OAuth and reach a dashboard scoped to their `prospects.id`.
2. The portal exposes Account (read-only contact info), Invoices (list + detail + Pay), and Projects (list + detail with phases, deliverables, payment schedule, **and a project notes timeline showing every client-visible work update**). Nothing else in v1.
3. Every morning at 9:00 AM PT, the platform pools all client-visible project notes from the prior 24 hours per client and dispatches a digest. Email = full digest content. SMS = teaser ("Demand Signals committed Xh Ym of progress towards your account, click this link to read the update."). Empty 24h period = no message — silent.
4. Project notes flow into the system through TWO surfaces: (a) `/handoff` slash command at session end auto-POSTs the CLIENT UPDATE artifact + TIME TRACKING data as a structured note row, and (b) admin can manually log notes from `/admin/projects/[id]`.
5. Time tracking lands in a proper `project_time_entries` table (long-deferred per CLAUDE.md §11), keyed by project + phase/deliverable + Hunter-vs-Claude split. Drives billing audit; never client-visible.
6. Pay flow is unchanged — the portal Pay button hits the existing `/api/invoices/public/[number]/pay` redirect, the same code path the magic-link page uses today. Zero new payment infrastructure.
7. Auth is hardened from day one: rate-limited login attempts, signed magic-link tokens with short TTL, server-side session storage with revocation, audit trail. **Logout revokes ALL active sessions for the prospect (every device).**
8. Cookie scope is strictly isolated from admin and attribution cookies. Compromise of one cannot impersonate the other.
9. Email enumeration is impossible — login attempts for non-client emails behave identically to attempts for client emails.

## Non-goals

- **No messaging.** That's the existing draft spec at [`docs/superpowers/specs/2026-04-28-portal-messaging-design.md`](2026-04-28-portal-messaging-design.md), separate project.
- **No edit-account.** Read-only in v1. A "Request a change" button that emails admin is the v1 escape hatch.
- **No subscriptions management.** v2 work; Stripe Customer Portal handles pause/resume today via admin-issued links.
- **No receipts page.** Data is there; trivial v2 add. Excluded to keep v1 surface area tight.
- **No bookings page.** Same logic. v2.
- **No multi-stakeholder access.** v1 is one email per client (the `prospects.owner_email`). When a client first asks for the bookkeeper to have access too, that's when we add `client_portal_users`.
- **No mobile app.** Web only. The portal is responsive but native apps are not in scope.
- **No Stripe Payment Element.** Existing redirect-to-Payment-Link flow is the contract. We don't change it.
- **No public `/portal` marketing surface.** Logged-out visitors at `/portal/*` redirect to `/portal/login`. There is no portal homepage.
- **No client-side note interaction.** Clients cannot comment, reply, edit, or approve notes in v1. Future work: a "proofing modal" where clients receive drafts (deliverables) for edit/approval. Out of scope here; will get its own spec.
- **No backfill of historical project work into notes.** Existing projects start with empty timelines on v1 launch. Empty state reads "No updates yet."
- **No per-client digest channel preferences in v1.** Both email AND SMS fire by default. Opting out of one requires emailing admin. Self-service preferences = v2 (depends on edit-account being unlocked).
- **No internal-only notes via `/handoff`.** The `/handoff` artifact is always client-framed and always becomes a `visibility='client'` note. Internal-only notes happen ONLY via the manual admin "Add note" UI.

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│ Login flow — magic-link path                                       │
│                                                                    │
│  Client visits /portal/login                                       │
│    ↓ enters email                                                  │
│  POST /api/portal/login/magic-link  { email }                      │
│    ↓                                                               │
│  Rate-limit check (5/hr/email) → silent 200 if exceeded            │
│    ↓                                                               │
│  Lookup prospects WHERE owner_email=? AND is_client=true           │
│    ↓                                                               │
│  Match → sign jose HS256 JWT  { sub: prospect_id, exp: +15m,       │
│                                  jti: uuid, email: lower(email) }  │
│  Insert client_portal_login_attempts row                           │
│  Send email via sendEmail() — link =                               │
│    https://demandsignals.co/api/portal/login/magic-link/verify     │
│      ?token=<jwt>                                                  │
│    No-match → still insert attempt row, do nothing else            │
│    Either way → 200 { sent: true }                                 │
│    ↓                                                               │
│  Client clicks link                                                │
│  GET /api/portal/login/magic-link/verify?token=<jwt>               │
│    ↓                                                               │
│  Verify signature + exp + jti not in client_portal_sessions        │
│    ↓                                                               │
│  Insert client_portal_sessions row { prospect_id, expires_at:+30d, │
│                                       cookie_token: rand32,        │
│                                       jti, ip, ua, login_method }  │
│  Set-Cookie: dsig_portal=<cookie_token>;                           │
│              Path=/portal; HttpOnly; Secure;                       │
│              SameSite=Lax; Max-Age=2592000                         │
│  302 → /portal                                                     │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Login flow — Google OAuth path                                     │
│                                                                    │
│  Client clicks "Continue with Google" at /portal/login             │
│    ↓                                                               │
│  GET /api/portal/login/google/start                                │
│    ↓ state cookie set, redirect to Google                          │
│  Google consent (scope=email)                                      │
│    ↓ callback                                                      │
│  GET /api/portal/login/google/callback?code=…                      │
│    ↓ exchange code → id_token → extract email                      │
│  Lookup prospects WHERE owner_email=? AND is_client=true           │
│    Match → mint session row, set dsig_portal cookie, 302 /portal   │
│    No-match → 302 /portal/login?error=not_a_client                 │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Project notes flow                                                 │
│                                                                    │
│  END OF SESSION                                                    │
│    /handoff                                                        │
│      ↓ generates 3 artifacts (NEXT-PROMPT, CLIENT-UPDATE, TIME)    │
│      ↓ Hunter reviews + approves                                   │
│    /handoff command extension:                                     │
│      POST /api/admin/project-notes  {                              │
│        project_id, body=CLIENT-UPDATE, source='handoff',           │
│        hours_hunter_minutes, hours_claude_minutes,                 │
│        session_started_at, session_ended_at                        │
│      }                                                             │
│      ↓                                                             │
│    INSERT project_notes (visibility='client', client_sent_at=null) │
│    INSERT project_time_entries (FK back to note + project)         │
│      ↓                                                             │
│    Note appears immediately on /admin/projects/[id] timeline       │
│    AND on /portal/projects/[id] timeline (visible to client now)   │
│                                                                    │
│  ── parallel manual path ──                                        │
│  Admin clicks "Add note" on /admin/projects/[id]                   │
│    ↓ pick visibility (internal | client) + body + optional phase   │
│  POST /api/admin/project-notes  { source='manual', visibility }    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Daily digest cron                                                  │
│                                                                    │
│  Vercel cron — schedule="0 16 * * *" (16:00 UTC = 09:00 PT)        │
│    ↓                                                               │
│  GET /api/cron/portal-digest                                       │
│    ↓ kill-switch check: quote_config.portal_digest_enabled         │
│    ↓                                                               │
│  For each prospect WHERE is_client=true:                           │
│    notes = SELECT * FROM project_notes                             │
│      WHERE prospect_id = ? AND visibility='client'                 │
│      AND client_sent_at IS NULL                                    │
│      AND created_at >= now() - interval '24 hours'                 │
│    if notes empty → SKIP (silent, no row written)                  │
│    else:                                                           │
│      sum_minutes = sum(hours_hunter + hours_claude across notes)   │
│      hours_label = formatHours(sum_minutes)  // "3h 15m"           │
│                                                                    │
│      EMAIL via sendEmail({ kind:'portal_digest', from:portal@,     │
│                            to: owner_email,                        │
│                            html: full notes grouped by project })  │
│                                                                    │
│      SMS via sendSms("Demand Signals committed " + hours_label +   │
│                      " of progress towards your account, "         │
│                      "click this link to read the update: " +      │
│                      "demandsignals.co/portal/projects")           │
│                                                                    │
│      INSERT portal_digests (prospect_id, period_start, period_end, │
│                              note_ids, email_send_id, sms_send_id) │
│      UPDATE project_notes SET client_sent_at = now()               │
│        WHERE id = ANY(note_ids)                                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Authed request flow                                                │
│                                                                    │
│  Browser → GET /portal/invoices                                    │
│    ↓ Cookie: dsig_portal=<token>                                   │
│  Middleware (matcher: /portal/:path*)                              │
│    ↓ Lookup client_portal_sessions WHERE cookie_token=?            │
│      AND expires_at > now() AND revoked_at IS NULL                 │
│    No row → 302 /portal/login                                      │
│    Found → set request header x-dsig-portal-prospect-id=<id>       │
│             touch sessions.last_seen_at                            │
│    ↓                                                               │
│  Page server component reads header, calls data layer with         │
│    prospect_id constraint baked in. RLS belt-and-suspenders.       │
└────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Database — migration `047_client_portal.sql`

```sql
-- Server-side session store. Each row is one device/login.
-- 30-day expiry. Multi-device supported (no per-prospect uniqueness).
-- Cookie holds a random 32-byte token; the JWT jti is recorded for
-- magic-link replay defense (jti can only mint a session once).
CREATE TABLE client_portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  cookie_token text NOT NULL UNIQUE,        -- 32 bytes hex, sent in dsig_portal cookie
  jti text UNIQUE,                          -- magic-link JWT jti consumed; null for OAuth sessions
  login_method text NOT NULL,               -- 'magic_link' | 'google_oauth'
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_reason text                       -- 'manual' | 'logout' | 'admin_revoke' | 'rotation'
);
CREATE INDEX idx_cps_lookup ON client_portal_sessions(cookie_token)
  WHERE revoked_at IS NULL;
CREATE INDEX idx_cps_prospect ON client_portal_sessions(prospect_id, expires_at DESC);

-- Login attempt log. Every attempt — match or not — gets a row.
-- Drives the 5/hr/email rate limit. Also serves as an audit trail
-- and a feed for future "suspicious activity" alerting.
CREATE TABLE client_portal_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,                      -- normalized lowercase
  prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  matched boolean NOT NULL,                 -- did email resolve to a client?
  method text NOT NULL,                     -- 'magic_link_request' | 'magic_link_verify' | 'google_callback'
  ip inet,
  user_agent text,
  succeeded boolean NOT NULL DEFAULT false, -- magic_link_request: true if email sent.
                                            -- magic_link_verify: true if session minted.
                                            -- google_callback: true if session minted.
  failure_reason text,                      -- 'rate_limited' | 'invalid_token' | 'token_expired' |
                                            -- 'jti_replay' | 'email_not_client' | 'oauth_error'
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cpla_rate_limit ON client_portal_login_attempts(email, created_at DESC);
CREATE INDEX idx_cpla_audit ON client_portal_login_attempts(prospect_id, created_at DESC)
  WHERE prospect_id IS NOT NULL;

-- RLS — service role only; no direct client access. Portal data
-- access is constrained at the API/middleware layer, not at the row
-- level via auth.uid() (clients aren't Supabase auth users).
ALTER TABLE client_portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_login_attempts ENABLE ROW LEVEL SECURITY;
-- (No policies = service role bypasses RLS via SECURITY DEFINER admin
-- supabase client; anon/authenticated clients have zero access.)
```

`prospects` table requires no schema changes — `owner_email`, `is_client`, `client_code`, all the FK targets already exist.

#### Migration `048_project_notes_and_time_entries.sql`

```sql
-- Project notes — every CLIENT UPDATE artifact from /handoff lands here,
-- plus any manually logged note. Drives the project timeline shown to
-- both admin and (filtered) client. Drives the daily digest pool.
CREATE TABLE project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,  -- denormalized for digest queries
  -- Content
  title text,                              -- optional 80-char headline
  body text NOT NULL,                      -- markdown; the CLIENT UPDATE artifact verbatim
  visibility text NOT NULL DEFAULT 'client',  -- 'internal' | 'client'
  source text NOT NULL,                    -- 'handoff' | 'manual' | 'import'
  -- Scope
  phase_id uuid,                           -- optional: ties to projects.phases jsonb id
  deliverable_id uuid,                     -- optional: ties to a phase's deliverable
  -- Session timing (if from /handoff)
  session_started_at timestamptz,
  session_ended_at timestamptz,
  -- Digest state
  client_sent_at timestamptz,              -- null = pending; set on digest send
  client_send_id uuid REFERENCES email_engagement(id) ON DELETE SET NULL,
  suppressed boolean NOT NULL DEFAULT false,  -- admin "hold out of digest" toggle
  suppressed_reason text,
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES admin_users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (visibility IN ('internal', 'client')),
  CHECK (source IN ('handoff', 'manual', 'import'))
);
CREATE INDEX idx_pn_digest_pool ON project_notes(prospect_id, created_at DESC)
  WHERE visibility = 'client' AND client_sent_at IS NULL AND suppressed = false;
CREATE INDEX idx_pn_project_timeline ON project_notes(project_id, created_at DESC);

-- Project time entries — per-session billable record. Long-deferred per
-- CLAUDE.md §11. Hunter-vs-Claude split is the load-bearing structure
-- (different billing rates, different reporting). FK to project_notes
-- for sessions sourced from /handoff so we can join time-to-content.
CREATE TABLE project_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  project_note_id uuid REFERENCES project_notes(id) ON DELETE SET NULL,  -- joined when source='handoff'
  -- Time split (integer minutes, never floats)
  hunter_minutes integer NOT NULL DEFAULT 0,
  claude_minutes integer NOT NULL DEFAULT 0,
  -- Session window (if known)
  session_started_at timestamptz,
  session_ended_at timestamptz,
  -- Free-form description (mirrors note title for convenience)
  description text,
  -- Audit
  source text NOT NULL,                    -- 'handoff' | 'manual'
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES admin_users(id),
  CHECK (hunter_minutes >= 0),
  CHECK (claude_minutes >= 0),
  CHECK (source IN ('handoff', 'manual'))
);
CREATE INDEX idx_pte_project ON project_time_entries(project_id, session_ended_at DESC);
CREATE INDEX idx_pte_prospect ON project_time_entries(prospect_id, session_ended_at DESC);

-- Daily digest log — one row per digest sent (or skipped with reason).
-- Drives audit ("did we send to ACME on May 8?") and dedup defense
-- (cron crashes mid-run shouldn't double-send).
CREATE TABLE portal_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  period_start_at timestamptz NOT NULL,    -- inclusive
  period_end_at timestamptz NOT NULL,      -- exclusive
  note_ids uuid[] NOT NULL,                -- which notes were bundled
  total_minutes integer NOT NULL,
  email_send_id uuid REFERENCES email_engagement(id) ON DELETE SET NULL,
  sms_send_id uuid,                        -- soft FK to message_log if SMS log table exists
  email_delivered boolean NOT NULL DEFAULT false,
  sms_delivered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(prospect_id, period_start_at)     -- dedup: one digest per (client, period)
);
CREATE INDEX idx_pd_audit ON portal_digests(prospect_id, period_start_at DESC);

-- Default "General Support" project per existing client — auto-materialized
-- so notes have a project to land in even when not tied to a specific
-- engagement. Future clients get one at became_client_at moment via
-- the SOW-accept path or NewClientModal.
INSERT INTO projects (id, prospect_id, name, status, created_at)
SELECT gen_random_uuid(), p.id, 'General Support', 'active', now()
FROM prospects p
WHERE p.is_client = true
  AND NOT EXISTS (
    SELECT 1 FROM projects pr
    WHERE pr.prospect_id = p.id AND pr.name = 'General Support'
  );

-- Kill switch for digest dispatch
INSERT INTO quote_config (key, value)
VALUES ('portal_digest_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_digests ENABLE ROW LEVEL SECURITY;
-- Service-role-only access; portal data layer enforces prospect_id scoping.
```

### 2. Auth lib — `src/lib/portal-auth.ts`

Centralizes every auth primitive. Pattern matches `src/lib/admin-auth.ts` and `src/lib/attribution-cookie.ts`.

Exports:
- `signMagicLinkToken(email: string, prospectId: string): Promise<{ token, jti, exp }>` — jose HS256, 15-min TTL, secret = `PORTAL_MAGIC_LINK_SECRET` env var (32-byte hex)
- `verifyMagicLinkToken(token: string): Promise<{ ok: true, sub, jti, email } | { ok: false, reason }>` — checks signature, expiry, returns structured failure reasons for audit logging
- `mintPortalSession(args: { prospectId, jti?, loginMethod, request }): Promise<{ cookieToken, expiresAt }>` — 32-byte random cookie token, inserts session row with IP+UA from request headers
- `getPortalSession(cookieToken: string): Promise<{ prospectId, sessionId } | null>` — looked up in middleware; touches `last_seen_at`
- `revokePortalSession(sessionId: string, reason: string): Promise<void>`
- `checkLoginRateLimit(email: string): Promise<{ ok: boolean, attemptsRemaining: number, retryAfter: Date | null }>` — counts `client_portal_login_attempts` rows for normalized email in last 60min; cap = 5
- `recordLoginAttempt(args: { email, prospectId?, method, succeeded, failureReason?, request })` — always called, even on rate-limit denial

Token format choice:
- **JWT for magic-link** (jose HS256) because we need the email + jti embedded in the URL itself (server is stateless until the click). 15-min TTL, signed, replay-protected via jti consumed in `client_portal_sessions.jti UNIQUE`.
- **Random 32-byte cookie token for sessions** (not JWT). Shorter on the wire, instant revocation by deleting the row, no decode-then-validate dance per request. The session row IS the truth.

### 3. Middleware — `src/middleware.ts` extension

Existing middleware already handles HTTP Link headers for markdown discovery. Extend the matcher to include `/portal/:path*` and `/api/portal/:path*` (except login routes which must be reachable unauthed).

```ts
// pseudo
if (path.startsWith('/portal') && !PUBLIC_PORTAL_PATHS.has(path)) {
  const token = req.cookies.get('dsig_portal')?.value
  const session = token ? await getPortalSession(token) : null
  if (!session) return NextResponse.redirect(new URL('/portal/login', req.url))
  const res = NextResponse.next()
  res.headers.set('x-dsig-portal-prospect-id', session.prospectId)
  res.headers.set('x-dsig-portal-session-id', session.sessionId)
  return res
}
```

`PUBLIC_PORTAL_PATHS = new Set(['/portal/login', '/portal/login/sent'])`.

API routes under `/api/portal/*` use a `requireClient(req)` helper analogous to `requireAdmin()` — same CSRF tier-2 fallback (`Sec-Fetch-Site: same-origin` when Origin absent, per CLAUDE.md §12 Chrome-Origin-stripping lesson).

**Cookie isolation contract:**
- Admin: `dsig_admin` (Supabase Auth managed) — `Domain=demandsignals.co`, `Path=/`
- Attribution: `dsig_attr` — `Domain=demandsignals.co`, `Path=/`
- **Portal: `dsig_portal` — `Domain=demandsignals.co`, `Path=/portal`**

The `Path=/portal` scope means the browser does not send the portal cookie to admin or marketing routes. An admin signing into the portal would still have both cookies on their machine, but each is only sent on its own path. Cross-cookie request forgery is structurally impossible.

### 4. Pages — `src/app/portal/`

```
src/app/portal/
├── layout.tsx                    — shared chrome (top nav, logo, sign-out, footer)
├── login/
│   ├── page.tsx                  — email field + Continue with Google button
│   └── sent/page.tsx             — "Check your email — we sent a sign-in link to <email>"
├── page.tsx                      — dashboard (welcome + outstanding balance + active project + quick links)
├── account/page.tsx              — read-only contact info + "Request a change" mailto button
├── invoices/
│   ├── page.tsx                  — list (number, status, amount, issued_at, due_at, Pay button)
│   └── [number]/page.tsx         — invoice detail (line items, subtotal, total, payment terms, Pay button, download PDF)
└── projects/
    ├── page.tsx                  — list (name, status, monthly_value, started_at)
    └── [id]/page.tsx             — phases (status), deliverables (status), payment schedule
```

All pages are server components reading the prospect_id header set by middleware. Data layer reuses existing helpers — `getInvoicesForProspect()`, `getProjectsForProspect()`, etc. New helpers added to `src/lib/portal-data.ts` so the data access surface is auditable in one file.

### 5. API routes — `src/app/api/portal/`

```
src/app/api/portal/
├── login/
│   ├── magic-link/route.ts                  — POST { email } → rate-limit, lookup, send email, always 200
│   └── magic-link/verify/route.ts           — GET ?token → verify, mint session, 302 /portal
├── login/google/
│   ├── start/route.ts                       — GET → 302 to Google with state cookie
│   └── callback/route.ts                    — GET ?code&state → mint session, 302 /portal
├── logout/route.ts                          — POST → revoke session, clear cookie, 302 /portal/login
└── invoices/[number]/pay/route.ts           — proxy to /api/invoices/public/[number]/pay
                                                (verifies the invoice belongs to the session's prospect_id
                                                 before redirect — this is the only NEW pay-adjacent code,
                                                 and it adds nothing to the pay flow itself, just the auth gate)
```

`/api/portal/invoices/[number]/pay` exists for one reason: the existing public pay endpoint authenticates via the magic-link UUID embedded in its URL. The portal Pay button doesn't have that UUID handy and shouldn't — magic-link UUIDs are per-document credentials, not for re-use. The portal route resolves the invoice by number, asserts `invoices.prospect_id === session.prospectId`, then internally redirects to the existing public pay route's logic. No new Stripe code; just an auth-shaped reverse proxy.

### 6. Email — new alias + two templates

**New alias `portal@demandsignals.co`**, routed via existing Cloudflare Email Routing back to `DemandSignals@gmail.com`. Two new `EmailKind` values added to `src/lib/constants.ts`:

```ts
// Additions to EMAIL_FROM:
portal_signin:   'Demand Signals <portal@demandsignals.co>',
portal_digest:   'Demand Signals <portal@demandsignals.co>',

// Additions to EMAIL_REPLY_TO:
portal_signin:   'hunter@demandsignals.co',
portal_digest:   'hunter@demandsignals.co',

// Additions to CLIENT_FACING_KINDS:
'portal_signin', 'portal_digest',
```

**Template `portal_signin`:**
- Subject: `Sign in to your Demand Signals portal`
- Body: branded transactional template using BRAND_TOKENS (slate `#3D4566`, teal `#52C9A0`). Single CTA button: `Sign in to portal` → magic-link URL. Plain-text fallback. 15-min expiry callout. Footer: "If you didn't request this, ignore this email — no action needed."

**Template `portal_digest`:**
- Subject: `Today's update on your Demand Signals projects` (or singular project name if only one project has notes)
- Body: branded layout with header, then for each project: project name as H2, each note rendered with date/time, title (if any), markdown body. Footer with single CTA: `View all updates` → `demandsignals.co/portal/projects`. Hours line at top: "Demand Signals committed [Xh Ym] of progress towards your account in the past 24 hours." NO time-tracking breakdown by Hunter/Claude (admin-only data).
- Plain-text fallback that strips markdown.

Both sent via existing `sendEmail()` helper. Logged in `email_engagement` automatically.

### 7. Google OAuth client — new GCP application

- New OAuth 2.0 client in GCP project `demand-signals-489406`, named `DSIG Portal`
- Application type: Web application
- Authorized redirect URI: `https://demandsignals.co/api/portal/login/google/callback`
- Scope: `openid email` (no calendar, no drive — minimum viable)
- Env vars (per CLAUDE.md §12 dated-name convention, no generic `GOOGLE_CLIENT_*`):
  - `GOOGLE_DSIG_PORTAL_ID_050726`
  - `GOOGLE_DSIG_PORTAL_SECRET_050726`
- Code reads ONLY these dated names. Generic env names are NOT consulted (per the §12 collision history).

### 8. Daily digest cron — `src/app/api/cron/portal-digest/route.ts`

- Vercel cron entry in `vercel.json`: `{ "path": "/api/cron/portal-digest", "schedule": "0 16 * * *" }` (16:00 UTC = 09:00 PT year-round; DST-stable because the digest is anchored to the company's operating timezone, not the client's local). All clients receive at the same wall-clock moment in PT.
- Auth: `Authorization: Bearer ${CRON_SECRET}` (existing pattern from booking reminders).
- Kill switch: read `quote_config.portal_digest_enabled` first (the JSONB-boolean dual-format read per CLAUDE.md §12 — `value === true || value === 'true'`). If false, return 200 with `{ skipped: 'kill_switch_off' }`.
- Per-client loop: select all clients (`prospects WHERE is_client=true`), pull pending notes, skip silently when empty, otherwise fire email + SMS, stamp `client_sent_at`, insert `portal_digests` row.
- Race defense: `portal_digests UNIQUE(prospect_id, period_start_at)` prevents double-send if cron is invoked twice. Insert digest row FIRST inside a transaction; on conflict, abort the per-client iteration.
- Failure isolation: a per-client failure logs to `system_notifications` and continues to the next client. One client's send failure does not block others.

### 9. SMS — `src/lib/portal-digest-sms.ts`

Mirrors `src/lib/booking-sms.ts` pattern. Single dispatcher:

```ts
export async function sendPortalDigestSms(args: {
  toPhone: string             // E.164
  totalMinutes: number
  prospectId: string
}): Promise<{ ok: boolean; messageId?: string; error?: string }>
```

Body template (locked):
```
Demand Signals committed {hours_label} of progress towards your account, click this link to read the update: https://demandsignals.co/portal/projects
```

`hours_label` formatted: `3h 15m` (no leading zero on minutes when hours present); `45m` (under an hour); `1h` (whole hour).

Honors kill switches: `quote_config.sms_delivery_enabled` (existing) AND `quote_config.portal_digest_enabled`.

### 10. `/handoff` slash command extension

The command at `Y:\.claude\commands\handoff.md` already produces the CLIENT UPDATE and TIME TRACKING artifacts. v1 extends step 11 to ALSO write the artifacts to the platform:

- After Hunter approves the artifacts (existing review step), the command POSTs to `/api/admin/project-notes` with:
  ```json
  {
    "project_id": "<inferred or asked>",
    "body": "<CLIENT UPDATE artifact body>",
    "title": "<optional headline derived from first bullet>",
    "visibility": "client",
    "source": "handoff",
    "session_started_at": "<ISO from session metadata>",
    "session_ended_at": "<ISO from now>",
    "hunter_minutes": <int from TIME TRACKING>,
    "claude_minutes": <int from TIME TRACKING>
  }
  ```
- Project resolution: command infers from cwd. If cwd matches a `projects.name` lookup OR a `prospects.client_code` (e.g., session in `Y:\PROJECTS\HANG\` resolves to that client's most recently-active project), use it. If ambiguous (multiple active projects for the client) OR the cwd is the DSIG site itself (`Y:\DSIG\demandsignals-next`), prompt Hunter to pick from a list. DSIG-internal sessions write to a project named `DSIG Internal` on a synthetic prospect — this gives time-tracking continuity without leaking to any client.
- Endpoint creates BOTH the `project_notes` row and the linked `project_time_entries` row in one transaction.
- The endpoint requires `requireAdmin()`; the slash command authenticates by reading the active admin session from the workstation's existing Supabase auth state (same pattern as other admin-tooling slash commands).

### 11. Admin UI — `/admin/projects/[id]` notes panel

New section on the project detail page:

- **Notes timeline** — chronological reverse, paginated 25/page. Each row shows:
  - Created at (relative + absolute on hover)
  - Visibility badge (Internal / Client)
  - Send status badge (Pending digest / Sent {date} / Suppressed)
  - Title (if present), then body (rendered markdown)
  - Hours summary (Hunter Xh Ym + Claude Xh Ym) — admin-only, never shown to client
  - Actions: Edit (only if `client_sent_at IS NULL AND suppressed = false`), Suppress, Delete
- **Add note** button → modal with body markdown textarea + visibility radio (Internal / Client) + optional phase select. POSTs to same `/api/admin/project-notes` endpoint with `source='manual'`.
- Edit window enforcement: server rejects edits to notes where `client_sent_at IS NOT NULL`. UI hides the Edit button in that state. To correct a sent note, admin adds a follow-up note explicitly framed as a correction.

### 12. Portal UI — `/portal/projects/[id]` notes timeline

- Renders below the existing phase/deliverable/payment-schedule blocks.
- Shows ONLY notes where `visibility = 'client' AND suppressed = false`. (Pending notes — `client_sent_at IS NULL` — DO render here, even before the digest fires. The portal timeline is real-time; the digest is a daily push.)
- Markdown body is rendered with the existing safe markdown renderer used elsewhere in the app.
- Each note shows date + body. No author attribution to a specific person (DSIG speaks as one voice externally).
- Empty state: "No updates yet — your team is working on it."

### 13. Dashboard composition — `/portal/page.tsx`

Three cards, in order:

1. **Welcome strip** — `Welcome back, [owner_name]` · `[business_name] · client since [became_client_at:short-date]`
2. **Outstanding balance** — sum of unpaid invoices in cents; if > 0 show amount + `Pay now` button → `/portal/invoices` (filtered to outstanding); if 0 show `All paid up. Thanks!` confirmation.
3. **Active project + latest update** — top active project (most recently updated), shows: name, current phase, MOST RECENT client-visible note as preview (truncated to ~280 chars). `→ View project` link.
4. **Recent invoices** — last 3, each shows: number, amount, status badge, issued date. `→ View all` link.

Future cards (deferred per scope cuts above): bookings, subscriptions, document library, activity feed.

### 14. Audit + observability

- Every login attempt → `client_portal_login_attempts` row
- Every session creation → `client_portal_sessions` row
- Every page view in the portal → existing `page_visits` infrastructure with `attribution_source='portal_session'` and `prospect_id` populated from middleware header
- Admin can see active sessions and revoke them on `/admin/prospects/[id]` via a new "Portal access" panel (v1.5 — see Out of scope for cut)

## Required env vars (Vercel)

```
PORTAL_MAGIC_LINK_SECRET=<32-byte hex; rotate by adding new + reading both for grace period>
GOOGLE_DSIG_PORTAL_ID_050726=<DSIG Portal OAuth client ID>
GOOGLE_DSIG_PORTAL_SECRET_050726=<DSIG Portal OAuth client secret>
```

`SITE_URL=https://demandsignals.co`, `CRON_SECRET`, `RESEND_API_KEY`, `TWILIO_*` already set.

Cloudflare Email Routing must be extended: `portal@demandsignals.co` → `DemandSignals@gmail.com`.

## Threat model

| Attack | Mitigation |
|---|---|
| Email enumeration via login form | All requests return 200 regardless of match; rate-limited per email |
| Magic-link token replay | jti is consumed in `client_portal_sessions.jti UNIQUE`; second use of same jti rejected at DB level |
| Magic-link token leakage (forwarded email, screenshot) | 15-min TTL bounds blast radius; HTTPS-only; not in URL parameters of the destination — token is consumed, browser address bar shows `/portal` |
| Session cookie theft | `HttpOnly` blocks JS access; `Secure` requires HTTPS; `SameSite=Lax` blocks cross-site CSRF on state-changing requests. `Path=/portal` prevents leakage to admin or marketing routes |
| Brute-force magic-link issuance | `client_portal_login_attempts` rate limit, 5/hr/email |
| Cross-cookie auth confusion (admin cookie used to authenticate portal request, or vice-versa) | Distinct cookie names, distinct path scopes — browser will not submit them to each other's routes. Server-side `requireClient()` only reads `dsig_portal`, never `dsig_admin` |
| Session compromise after employee turnover at client business | Manual revocation via `/admin/prospects/[id]` (v1.5); 30-day max session lifetime |
| Google OAuth spoofing (attacker controls a Google account matching a client owner_email) | Documented residual risk. Mitigation v2: 2FA via SMS to `prospects.owner_phone` on Google login if `last_login_method != 'google_oauth'` |
| Email-not-client error leaks existence | Google OAuth callback also normalizes — `?error=not_a_client` is shown for ALL non-success paths (network failure, invalid state, email mismatch). No differentiation. |
| Digest SMS spam → Twilio cost runaway | `portal_digest_enabled` kill switch + `sms_delivery_enabled` kill switch + per-client dedup via `portal_digests UNIQUE(prospect_id, period_start_at)` + empty-pool silence. Cap defense: hard limit of 200 client digests/day in cron (current client count is well under 50; alarms if approached). |
| Note exfiltration via leaked portal session | Notes with `visibility='internal'` are NEVER served to the portal data layer — enforced at the SQL query level, not just at the rendering layer. Audited via test that asserts `getProjectNotesForPortal()` cannot return internal-visibility rows even when called with malicious input. |
| `/handoff` writes leak DSIG-internal time/notes to a real client project by misrouted `project_id` | Handoff command's project resolution shows confirmation prompt with project name + client name BEFORE POSTing. Hunter approves the destination, not just the artifact content. |

## Build sequence (proposed)

1. **Migration 047** (auth tables) — `APPLY-047-2026-05-07.sql` web-editor-safe inlined
2. **Migration 048** (notes + time entries + digests + General Support backfill) — `APPLY-048-2026-05-07.sql`
3. **`src/lib/portal-auth.ts`** + unit tests for sign/verify/rate-limit/logout-revokes-all
4. **Middleware extension** + integration test for path isolation (admin cookie cannot authenticate `/portal/*`; portal cookie cannot authenticate `/admin/*`)
5. **Auth API routes** — magic-link issuance + verify, Google OAuth start/callback, logout (revokes ALL sessions for prospect)
6. **Notes API + admin UI** — `/api/admin/project-notes` POST/PATCH/DELETE, notes panel on `/admin/projects/[id]`
7. **`/handoff` slash command extension** — POST artifacts after Hunter approval; project resolution + confirmation prompt
8. **Pages** — login, dashboard, account, invoices list, invoices detail, projects list, projects detail (with notes timeline)
9. **`portal@` alias setup** + email templates (signin + digest) + new EmailKind values in `constants.ts`
10. **Daily digest cron** — `/api/cron/portal-digest` + SMS dispatcher + kill-switch wiring + `vercel.json` cron entry
11. **GCP client + Vercel env vars** (Hunter step; spec gives exact values to enter)
12. **End-to-end test** on `D:\dev\demandsignals-next\`: sign in both paths, verify isolation, pay an invoice, log out (verify all sessions revoked), trigger digest manually with seeded notes, verify email + SMS received, verify notes flip to `client_sent_at`
13. **Deploy** — `git push origin master`
14. **Smoke test in production** with Hunter's own client_code on a real (test) client record

## Decisions locked (do not re-debate)

- **Apex path `demandsignals.co/portal`, not subdomain.** Decided 2026-05-07. Cookie `Path=/portal` is the isolation mechanism.
- **Magic-link AND Google OAuth, both paths land on the same `dsig_portal` cookie + session row.** Login method recorded for audit; user experience is uniform.
- **`prospects.owner_email` is the v1 identity.** No `client_portal_users` table until first multi-stakeholder request lands.
- **Pay flow is unchanged.** Portal Pay button proxies to existing `/api/invoices/public/[number]/pay`. No new Stripe code.
- **Read-only v1.** "Edit your info" is a `mailto:` until v2.
- **New GCP OAuth client `DSIG Portal`, dated env vars per §12.** No reuse of `DSIG Main` (which is Calendar's).
- **Server-side session storage.** JWT only used for the magic-link URL itself; sessions are random opaque tokens looked up server-side, allowing instant revocation.
- **Out-of-scope: messaging, edit-account, receipts, subscriptions, bookings, mobile app, multi-stakeholder, Stripe Payment Element, client-side note interaction (proofing modal — separate spec).** Each gets its own v2 spec when prioritized.
- **Logout revokes ALL active sessions** for the prospect (every device).
- **Digest fires at 9:00 AM PT daily**, anchored to DSIG operating timezone, not per-client local. Empty 24h pool = silent (no message).
- **SMS = teaser**, email = full content. SMS body: `Demand Signals committed {hours_label} of progress towards your account, click this link to read the update: https://demandsignals.co/portal/projects`
- **Project notes flow from `/handoff`** as the primary surface. Manual admin "Add note" exists but is the secondary path.
- **`project_time_entries` table is the single source of truth for billable time.** `project_notes.hunter_minutes/claude_minutes` are denormalized for display; the entries table is canonical.
- **Default "General Support" project per client** auto-materialized on `is_client=true` transition (and backfilled in migration 048).
- **Hours data is admin-only.** Never appears on the portal or in client emails. Email digest shows aggregate hours phrased as "committed Xh Ym of progress" but never the Hunter/Claude split.

## Open questions (resolved 2026-05-07)

1. **`Sec-Fetch-Site` fallback in `requireClient()`** — match `requireAdmin()` exactly (Origin-or-Sec-Fetch-Site).
2. **Project resolution at `/handoff` time** — no `projects.is_default` flag. Pick by most-recently-updated active project for the client; Hunter confirms before POST.
3. **Backfill** — none. No "Welcome to your new portal" seed note. System is silent until real work is logged. Day-one portal shows projects, services, subscriptions, invoices — note timeline is empty until `/handoff` writes the first row.

## Time tracking calculation (locked)

For every `/handoff` POST and any future time-tracking automation:

- **Hunter minutes (`hunter_minutes`) = full wall-clock span of the session.** From the first user message to the last action of the handoff itself. Includes Hunter's prompt-typing time AND the time Claude spends processing — Hunter is "on the clock" the entire time the session is active. Excludes only multi-hour gaps where Hunter was clearly away (>30 min between any two consecutive Hunter messages).
- **Claude minutes (`claude_minutes`) = sum of Claude's processing time only.** Per-turn approximation: tool-heavy turns ≈ 60s, reply-only turns ≈ 10s, plus explicit minutes for long-running tool calls (builds, agent runs, large searches).
- Both stored as integer minutes.
- The `/handoff` slash command calculates these and includes them in the POST. The `project_time_entries` row is the canonical record.
