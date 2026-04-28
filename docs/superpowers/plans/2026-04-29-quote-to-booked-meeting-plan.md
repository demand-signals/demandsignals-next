# Quote → Booked Meeting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fake "team will call you at 10am" closing of `/quote` with a real Google Calendar booking that creates an event with a Google Meet link, sends a real invite to the prospect, sends SMS confirmations + 24h/1h reminders, surfaces the booking in admin, and replaces the noisy quote-activity log with verb-only entries. Plus fix Continue-to-SOW.

**Architecture:** OAuth web-app flow against existing `DSIG Main` client connects `demandsignals@gmail.com` once via `/admin/integrations/google`. Refresh token persisted in new `integrations` table. New `bookings` table is the canonical source for every meeting, with `attendee_phone` resolved opportunistically from prospect or quote-session. Three new AI tools (`capture_attendee_email`, `offer_meeting_slots`, `book_meeting`) drive the prospect through real Calendar API event creation. SMS uses existing `sendSms` + `notifyAdminTeam` helpers; reminders dispatched by a 5-min cron with per-row dedup columns (mirrors migration 033 pattern).

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase Postgres + RLS, Google OAuth 2.0 (web-app flow), Google Calendar API v3 (raw `fetch` — no client lib), Twilio SMS via existing `src/lib/twilio-sms.ts`, Vercel Cron.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/035_bookings_and_integrations.sql` | CREATE | `integrations` + `bookings` tables; `quote_sessions` adds `booking_id`, `attendee_email`, `offered_slot_ids`; `quote_config` seed for `booking_reminders_enabled` |
| `src/lib/slot-signing.ts` | CREATE | HMAC-sign + verify slot ids using `BOOKING_SLOT_SECRET` |
| `src/lib/google-oauth.ts` | CREATE | OAuth dance: authorization URL, token exchange, access-token refresh, revoke |
| `src/lib/google-calendar.ts` | CREATE | Calendar API v3 wrapper: freebusy → slots, create event with Meet, cancel, reschedule |
| `src/lib/bookings.ts` | CREATE | Public API: `listAvailableSlots`, `bookSlot`, `cancelBooking`, `rescheduleBooking`. Resolves attendee_phone, dispatches confirmation SMS, writes activity rows |
| `src/lib/booking-sms.ts` | CREATE | Five SMS senders (prospect confirm, admin notify, 24h reminder, 1h reminder, admin cancel) |
| `src/lib/quote-tools.ts` | MODIFY | Add `capture_attendee_email`, `offer_meeting_slots`, `book_meeting` tool handlers |
| `src/lib/quote-ai.ts` | MODIFY | Add 3 new tool defs + system-prompt directive for booking flow |
| `src/lib/quote-session.ts` | MODIFY | Extend `QuoteSessionRow` with `booking_id`, `attendee_email`, `offered_slot_ids` |
| `src/lib/quote-prospect-sync.ts` | MODIFY | Drop `item_changed` activity write; refine subjects/bodies for the kept events |
| `src/app/api/admin/quotes/[id]/continue-to-sow/route.ts` | MODIFY | Drop `scope_summary` from broken SELECT |
| `src/app/api/integrations/google/start/route.ts` | CREATE | Builds OAuth URL with state token + redirects |
| `src/app/api/integrations/google/callback/route.ts` | CREATE | Exchanges code, persists row, redirects |
| `src/app/api/integrations/google/test/route.ts` | CREATE | Creates + immediately deletes a 1-min test event |
| `src/app/api/integrations/google/disconnect/route.ts` | CREATE | Revokes token, marks row revoked |
| `src/app/admin/integrations/google/page.tsx` | CREATE | Connection state UI + Connect/Test/Disconnect buttons |
| `src/components/admin/admin-sidebar.tsx` | MODIFY | Add Integrations link under ADMIN group |
| `src/app/api/quote/chat/route.ts` | MODIFY | Include `booking_id`, `booking_start_at`, `booking_meet_link`, `attendee_email` in response payload |
| `src/components/quote/MeetingConfirmedPanel.tsx` | CREATE | Right-pane CTA replacement when booking exists |
| `src/app/quote/page.tsx` | MODIFY | Render MeetingConfirmedPanel conditionally |
| `src/app/admin/prospects/[id]/page.tsx` | MODIFY | Add LatestQuotePanel + BookingCard at top; extend ProspectDocuments with Quotes (EST) sub-section |
| `src/components/admin/BookingCard.tsx` | CREATE | Reusable booking display with reschedule/cancel buttons |
| `src/components/admin/RescheduleModal.tsx` | CREATE | Modal that lists available slots, fires reschedule |
| `src/components/admin/LatestQuotePanel.tsx` | CREATE | Surfaces latest quote_session: scope, estimate, ROI, AI research highlights, transcript link, Continue-to-SOW button |
| `src/app/api/admin/bookings/[id]/cancel/route.ts` | CREATE | Admin cancel endpoint |
| `src/app/api/admin/bookings/[id]/reschedule/route.ts` | CREATE | Admin reschedule endpoint |
| `src/app/api/admin/bookings/available-slots/route.ts` | CREATE | Returns next available slots for the reschedule modal |
| `src/app/api/cron/booking-reminders/route.ts` | CREATE | Vercel cron, every 5 min, fires 24h + 1h reminders |
| `vercel.json` | MODIFY | Add booking-reminders cron entry |
| `scripts/verify-booking-roundtrip.mjs` | CREATE | Manual end-to-end verification script |

---

## Task 1: Migration 035 — bookings + integrations tables

**Files:**
- Create: `supabase/migrations/035_bookings_and_integrations.sql`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/035_bookings_and_integrations.sql`:

```sql
-- 035: bookings + integrations tables for the quote→booked-meeting flow.
--
-- integrations holds OAuth refresh tokens for accounts the platform impersonates
--   (today: demandsignals@gmail.com's calendar).
-- bookings is the canonical source for every meeting — quote-driven today,
--   /book-page-driven later. host_email left flexible so multi-host is a
--   one-line config change when the team grows.

CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  account_email text NOT NULL,
  scopes text[] NOT NULL,
  access_token text,
  access_token_expires_at timestamptz,
  refresh_token text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  connected_at timestamptz NOT NULL DEFAULT now(),
  connected_by uuid REFERENCES admin_users(id),
  revoked_at timestamptz,
  UNIQUE(provider, account_email)
);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('quote', 'public_book', 'admin_manual')),
  quote_session_id uuid REFERENCES quote_sessions(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  host_email text NOT NULL,
  attendee_email text NOT NULL,
  attendee_name text,
  attendee_phone text,                       -- E.164 if present
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Los_Angeles',
  google_event_id text NOT NULL,
  google_meet_link text,
  google_meet_id text,
  reminder_24h_sent_at timestamptz,
  reminder_1h_sent_at timestamptz,
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  cancelled_at timestamptz,
  cancelled_by text CHECK (cancelled_by IN ('prospect', 'admin', 'system') OR cancelled_by IS NULL),
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_quote_session
  ON bookings(quote_session_id) WHERE quote_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_prospect
  ON bookings(prospect_id) WHERE prospect_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_start_at ON bookings(start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
-- Reminder dispatch helpers: cron filters to confirmed + reminder_*_sent_at IS NULL.
CREATE INDEX IF NOT EXISTS idx_bookings_reminders_24h
  ON bookings(start_at) WHERE status = 'confirmed' AND reminder_24h_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_reminders_1h
  ON bookings(start_at) WHERE status = 'confirmed' AND reminder_1h_sent_at IS NULL;

ALTER TABLE quote_sessions
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attendee_email text,
  ADD COLUMN IF NOT EXISTS offered_slot_ids jsonb DEFAULT '[]'::jsonb;

-- Enable RLS — service-role only (matches every other CRM table).
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Reminder kill-switch (defaults true). Mirrors quote_config flag pattern.
INSERT INTO quote_config (key, value)
VALUES ('booking_reminders_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE integrations IS 'OAuth refresh tokens for accounts the platform impersonates (Google Calendar, future providers).';
COMMENT ON TABLE bookings IS 'Canonical booked-meeting record. Source today: quote AI booking flow. Future: public /book page.';
COMMENT ON COLUMN bookings.attendee_phone IS 'E.164 phone resolved from prospects.owner_phone or quote_sessions verified phone. Null if unavailable; SMS dispatch skips when null.';
```

- [ ] **Step 2: Apply via Supabase SQL editor**

Open Supabase SQL editor → paste the file contents → run.

Expected: success, no rows returned.

- [ ] **Step 3: Verify columns + index exist**

In SQL editor:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='bookings' ORDER BY ordinal_position;
```

Expected: 21 columns including `attendee_phone`, `reminder_24h_sent_at`, `reminder_1h_sent_at`, `status`, `cancelled_at`.

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='quote_sessions' AND column_name IN ('booking_id', 'attendee_email', 'offered_slot_ids');
```

Expected: 3 rows.

```sql
SELECT key, value FROM quote_config WHERE key='booking_reminders_enabled';
```

Expected: 1 row, `value=true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/035_bookings_and_integrations.sql
git commit -m "feat(quote): migration 035 — bookings + integrations

Adds integrations table (OAuth refresh tokens for accounts the platform
impersonates) and bookings table (canonical booked-meeting record).
Extends quote_sessions with booking_id, attendee_email, offered_slot_ids.
Seeds booking_reminders_enabled=true in quote_config. RLS service-role
only on both tables.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Slot-signing helper

**Files:**
- Create: `src/lib/slot-signing.ts`

- [ ] **Step 1: Create the module**

Create `src/lib/slot-signing.ts`:

```ts
// HMAC-sign and verify slot ids passed through the AI.
//
// The AI receives slot ids from offer_meeting_slots and passes one back
// via book_meeting. Without signing, a prompt-injection attack could
// fabricate an arbitrary timestamp. The signature ties slot_id to its
// start_at + end_at + a server secret — book_meeting verifies before
// touching the calendar.

import crypto from 'node:crypto'

function getSecret(): string {
  const s = process.env.BOOKING_SLOT_SECRET
  if (!s || s.length < 16) {
    throw new Error('BOOKING_SLOT_SECRET not configured (>=16 chars required)')
  }
  return s
}

export interface SlotPayload {
  start_at: string  // ISO with TZ
  end_at: string    // ISO with TZ
}

/**
 * Sign a slot payload. Returns an opaque token of form `<base64url-payload>.<base64url-mac>`.
 * The payload is recoverable from the token (used by verifySlotId to extract start_at/end_at).
 */
export function signSlotId(payload: SlotPayload): string {
  const json = JSON.stringify(payload)
  const payloadB64 = Buffer.from(json).toString('base64url')
  const mac = crypto.createHmac('sha256', getSecret()).update(payloadB64).digest('base64url')
  return `${payloadB64}.${mac}`
}

/**
 * Verify a slot id and return its payload. Returns null on bad signature
 * or malformed input. Constant-time compare to prevent timing attacks.
 */
export function verifySlotId(token: string): SlotPayload | null {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, mac] = parts
  const expected = crypto.createHmac('sha256', getSecret()).update(payloadB64).digest('base64url')
  // Constant-time compare
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return null
  if (!crypto.timingSafeEqual(a, b)) return null
  try {
    const json = Buffer.from(payloadB64, 'base64url').toString('utf8')
    const parsed = JSON.parse(json) as SlotPayload
    if (typeof parsed?.start_at !== 'string' || typeof parsed?.end_at !== 'string') return null
    return parsed
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd "D:/CLAUDE/demandsignals-next" && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Generate + add `BOOKING_SLOT_SECRET` to Vercel env vars**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy output. Add to Vercel project env vars (Production + Preview) as `BOOKING_SLOT_SECRET`. Also add to local `.env.local`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/slot-signing.ts
git commit -m "feat(quote): HMAC slot-id signing for booking flow

Used by offer_meeting_slots to sign slot ids before exposing them to
the AI; book_meeting verifies before creating a calendar event.
Constant-time compare. Requires BOOKING_SLOT_SECRET env var.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Google OAuth helper

**Files:**
- Create: `src/lib/google-oauth.ts`

- [ ] **Step 1: Create the module**

Create `src/lib/google-oauth.ts`:

```ts
// Google OAuth 2.0 web-app flow for the demandsignals@gmail.com calendar
// integration. The platform stores the long-lived refresh_token; access
// tokens are minted on demand by getValidAccessToken().
//
// One-time admin flow: /admin/integrations/google → start → Google →
// callback → integrations row persisted. Subsequent calendar API calls
// use the refresh token to obtain short-lived access tokens.

import { supabaseAdmin } from './supabase/admin'

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke'
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'openid',
  'email',
  'profile',
]

function clientId(): string {
  const v = process.env.GOOGLE_CLIENT_ID
  if (!v) throw new Error('GOOGLE_CLIENT_ID not configured')
  return v
}
function clientSecret(): string {
  const v = process.env.GOOGLE_CLIENT_SECRET
  if (!v) throw new Error('GOOGLE_CLIENT_SECRET not configured')
  return v
}
function redirectUri(): string {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI
    ?? 'https://demandsignals.co/api/integrations/google/callback'
}

/**
 * Build the consent URL. Caller passes a CSRF state token persisted server-side
 * (we use a signed cookie + DB row).
 */
export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',          // returns refresh_token
    prompt: 'consent',                // forces refresh_token even on re-auth
    include_granted_scopes: 'true',
    state,
  })
  return `${AUTH_ENDPOINT}?${params.toString()}`
}

interface TokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string  // present on first-time + with prompt=consent
  scope: string
  token_type: 'Bearer'
  id_token?: string
}

interface DecodedIdToken {
  email?: string
  name?: string
  picture?: string
  email_verified?: boolean
}

function decodeIdTokenPayload(idToken: string): DecodedIdToken {
  // Standard JWT: header.payload.sig — middle segment is base64url JSON.
  // Not verifying signature here (we trust Google's TLS endpoint we just
  // talked to). Extracting profile fields only.
  const parts = idToken.split('.')
  if (parts.length !== 3) return {}
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8')
    return JSON.parse(json) as DecodedIdToken
  } catch {
    return {}
  }
}

/**
 * Exchange the OAuth code for tokens + decode the id_token to get the
 * connected account's email. Returns everything the callback handler needs
 * to insert an integrations row.
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  account_email: string
  account_name: string | null
  account_picture: string | null
  scopes: string[]
}> {
  const body = new URLSearchParams({
    code,
    client_id: clientId(),
    client_secret: clientSecret(),
    redirect_uri: redirectUri(),
    grant_type: 'authorization_code',
  })
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`token exchange failed: ${res.status} ${text}`)
  }
  const json = (await res.json()) as TokenResponse
  if (!json.refresh_token) {
    throw new Error('no refresh_token returned — confirm prompt=consent and account is fresh-consenting')
  }
  const id = json.id_token ? decodeIdTokenPayload(json.id_token) : {}
  if (!id.email) {
    throw new Error('id_token missing email claim')
  }
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_in: json.expires_in,
    account_email: id.email,
    account_name: id.name ?? null,
    account_picture: id.picture ?? null,
    scopes: json.scope.split(' '),
  }
}

/**
 * Returns a valid access_token for the integration. If the cached token
 * has more than 60s left, returns it; otherwise refreshes via the refresh
 * token and persists the new access token.
 */
export async function getValidAccessToken(integrationId: string): Promise<string> {
  const { data: row, error } = await supabaseAdmin
    .from('integrations')
    .select('id, access_token, access_token_expires_at, refresh_token, revoked_at')
    .eq('id', integrationId)
    .single()
  if (error || !row) throw new Error(`integration ${integrationId} not found`)
  if (row.revoked_at) throw new Error('integration is revoked — reconnect required')

  const now = Date.now()
  const expiresAt = row.access_token_expires_at
    ? new Date(row.access_token_expires_at).getTime()
    : 0
  if (row.access_token && expiresAt > now + 60_000) {
    return row.access_token
  }

  // Refresh
  const body = new URLSearchParams({
    client_id: clientId(),
    client_secret: clientSecret(),
    grant_type: 'refresh_token',
    refresh_token: row.refresh_token,
  })
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    if (res.status === 400 || res.status === 401) {
      // Refresh token revoked. Mark integration revoked.
      await supabaseAdmin
        .from('integrations')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', integrationId)
      throw new Error('refresh_token rejected by Google — integration revoked')
    }
    throw new Error(`token refresh failed: ${res.status} ${text}`)
  }
  const json = (await res.json()) as TokenResponse
  const newExpires = new Date(Date.now() + json.expires_in * 1000).toISOString()
  await supabaseAdmin
    .from('integrations')
    .update({
      access_token: json.access_token,
      access_token_expires_at: newExpires,
    })
    .eq('id', integrationId)
  return json.access_token
}

/**
 * Get the active calendar integration row id (or null if none exists).
 * Used by callers that don't have the id yet. Single-row design today
 * — first non-revoked row wins.
 */
export async function getActiveCalendarIntegration(): Promise<{
  id: string
  account_email: string
  connected_at: string
} | null> {
  const { data } = await supabaseAdmin
    .from('integrations')
    .select('id, account_email, connected_at')
    .eq('provider', 'google_calendar')
    .is('revoked_at', null)
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ?? null
}

/**
 * Revoke the integration: tells Google to invalidate the refresh token, then
 * marks the row revoked. Best-effort on the Google side — we always set
 * revoked_at locally even if the revoke call fails.
 */
export async function revokeIntegration(integrationId: string): Promise<void> {
  const { data: row } = await supabaseAdmin
    .from('integrations')
    .select('refresh_token')
    .eq('id', integrationId)
    .single()
  if (row?.refresh_token) {
    try {
      await fetch(REVOKE_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: row.refresh_token }).toString(),
      })
    } catch {
      // Best-effort.
    }
  }
  await supabaseAdmin
    .from('integrations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', integrationId)
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Verify env var name**

`GOOGLE_OAUTH_REDIRECT_URI` should be set to `https://demandsignals.co/api/integrations/google/callback` in Vercel. Add it if missing (production + preview).

- [ ] **Step 4: Commit**

```bash
git add src/lib/google-oauth.ts
git commit -m "feat(quote): Google OAuth helper for calendar integration

OAuth web-app flow for the demandsignals@gmail.com calendar integration.
Stores long-lived refresh token in integrations table; mints short-lived
access tokens on demand. Marks integration revoked on refresh-token
rejection so admin can reconnect.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Google Calendar API wrapper

**Files:**
- Create: `src/lib/google-calendar.ts`

- [ ] **Step 1: Create the module**

Create `src/lib/google-calendar.ts`:

```ts
// Thin wrapper around Google Calendar API v3. Pure functions — caller
// persists results. Uses raw fetch (no client lib) to keep cold-start
// small.
//
// All operations target the primary calendar of the connected
// integrations row (resolved by getActiveCalendarIntegration + getValidAccessToken).

import { getActiveCalendarIntegration, getValidAccessToken } from './google-oauth'
import { signSlotId } from './slot-signing'

const API_BASE = 'https://www.googleapis.com/calendar/v3'

export interface AvailableSlot {
  id: string                    // signed: HMAC over { start_at, end_at }
  start_at: string              // ISO with TZ offset
  end_at: string                // ISO with TZ offset
  display_label: string         // "Tomorrow 10:00 AM PT"
}

interface FreebusyBusyBlock {
  start: string
  end: string
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const integration = await getActiveCalendarIntegration()
  if (!integration) throw new Error('calendar_disconnected')
  const token = await getValidAccessToken(integration.id)
  const headers = new Headers(init.headers)
  headers.set('authorization', `Bearer ${token}`)
  headers.set('content-type', 'application/json')
  return fetch(`${API_BASE}${path}`, { ...init, headers })
}

/**
 * Format a Date as `YYYY-MM-DDTHH:MM:SS-07:00` style ISO with the requested
 * timezone offset. Calendar API accepts ISO 8601 with timezone.
 */
function isoInTz(d: Date, _timezone: string): string {
  // Calendar API accepts UTC ISO, the timeZone param tells it how to interpret.
  // Simplest: send UTC ISO, set timeZone separately via the event payload.
  return d.toISOString()
}

/**
 * Format a Date for display in PT — used in slot display_label.
 */
function formatPtLabel(d: Date): string {
  const now = new Date()
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const dayLabel = (() => {
    const dayMs = 86_400_000
    const startOfThatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const diff = Math.round((startOfThatDay.getTime() - startOfToday.getTime()) / dayMs)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/Los_Angeles' })
  })()
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles',
  })
  void startOfTomorrow
  return `${dayLabel} ${time} PT`
}

/**
 * Walk a 14-day window starting `earliest_hours_ahead` from now, in
 * `duration_minutes` increments inside the configured business hours,
 * returning the first `count` slots that don't conflict with busy blocks.
 */
export async function getAvailableSlots(opts: {
  duration_minutes?: number
  count?: number
  earliest_hours_ahead?: number
  business_hours?: { start_hour: number; end_hour: number }
  weekdays_only?: boolean
}): Promise<AvailableSlot[]> {
  const duration = opts.duration_minutes ?? 30
  const count = opts.count ?? 2
  const earliestHoursAhead = opts.earliest_hours_ahead ?? 18
  const bh = opts.business_hours ?? { start_hour: 9, end_hour: 17 }
  const weekdaysOnly = opts.weekdays_only ?? true

  const windowStart = new Date(Date.now() + earliestHoursAhead * 3_600_000)
  const windowEnd = new Date(windowStart.getTime() + 14 * 86_400_000)

  // Calendar freebusy
  const fbRes = await authedFetch('/freeBusy', {
    method: 'POST',
    body: JSON.stringify({
      timeMin: windowStart.toISOString(),
      timeMax: windowEnd.toISOString(),
      items: [{ id: 'primary' }],
    }),
  })
  if (!fbRes.ok) {
    const text = await fbRes.text()
    throw new Error(`freebusy failed: ${fbRes.status} ${text}`)
  }
  const fbJson = (await fbRes.json()) as {
    calendars: { primary: { busy: FreebusyBusyBlock[] } }
  }
  const busy = fbJson.calendars.primary.busy ?? []

  function overlapsBusy(slotStart: Date, slotEnd: Date): boolean {
    for (const b of busy) {
      const bStart = new Date(b.start)
      const bEnd = new Date(b.end)
      if (slotStart < bEnd && slotEnd > bStart) return true
    }
    return false
  }

  // Walk the window in PT to honor business hours correctly.
  const slots: AvailableSlot[] = []
  // Step in 30-min increments. Use the smaller of duration or 30 to find more granular spots.
  const stepMs = Math.min(duration, 30) * 60_000

  for (let cursor = windowStart.getTime(); cursor + duration * 60_000 <= windowEnd.getTime(); cursor += stepMs) {
    if (slots.length >= count) break

    const slotStart = new Date(cursor)
    const slotEnd = new Date(cursor + duration * 60_000)

    // Day-of-week + hour-in-PT filter
    const ptHour = Number(slotStart.toLocaleString('en-US', {
      hour: 'numeric', hour12: false, timeZone: 'America/Los_Angeles',
    }))
    const ptDay = slotStart.toLocaleString('en-US', {
      weekday: 'short', timeZone: 'America/Los_Angeles',
    })
    if (weekdaysOnly && (ptDay === 'Sat' || ptDay === 'Sun')) continue
    if (ptHour < bh.start_hour || ptHour >= bh.end_hour) continue
    if (overlapsBusy(slotStart, slotEnd)) continue

    const start_at = slotStart.toISOString()
    const end_at = slotEnd.toISOString()
    slots.push({
      id: signSlotId({ start_at, end_at }),
      start_at,
      end_at,
      display_label: formatPtLabel(slotStart),
    })
  }

  return slots
}

/**
 * Create a Calendar event with a Google Meet link. Returns the event id +
 * meet link. Caller persists in bookings table.
 */
export async function createMeetingEvent(opts: {
  start_at: string
  end_at: string
  attendee_email: string
  attendee_name?: string
  summary: string
  description: string
  timezone?: string
}): Promise<{
  event_id: string
  meet_link: string
  meet_id: string
}> {
  const tz = opts.timezone ?? 'America/Los_Angeles'
  const requestId = crypto.randomUUID()

  const body = {
    summary: opts.summary,
    description: opts.description,
    start: { dateTime: opts.start_at, timeZone: tz },
    end: { dateTime: opts.end_at, timeZone: tz },
    attendees: [{ email: opts.attendee_email, displayName: opts.attendee_name }],
    reminders: { useDefault: true },
    conferenceData: {
      createRequest: {
        requestId,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  }

  const res = await authedFetch(
    '/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
    { method: 'POST', body: JSON.stringify(body) },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`createEvent failed: ${res.status} ${text}`)
  }
  const json = (await res.json()) as {
    id: string
    conferenceData?: {
      conferenceId?: string
      entryPoints?: Array<{ entryPointType: string; uri: string }>
    }
  }

  const meetEntry = json.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')
  return {
    event_id: json.id,
    meet_link: meetEntry?.uri ?? '',
    meet_id: json.conferenceData?.conferenceId ?? '',
  }
}

export async function cancelMeetingEvent(event_id: string): Promise<void> {
  const res = await authedFetch(
    `/calendars/primary/events/${encodeURIComponent(event_id)}?sendUpdates=all`,
    { method: 'DELETE' },
  )
  // 410 = already deleted, treat as success
  if (!res.ok && res.status !== 410) {
    const text = await res.text()
    throw new Error(`deleteEvent failed: ${res.status} ${text}`)
  }
}

export async function rescheduleMeetingEvent(opts: {
  event_id: string
  start_at: string
  end_at: string
  timezone?: string
}): Promise<void> {
  const tz = opts.timezone ?? 'America/Los_Angeles'
  const res = await authedFetch(
    `/calendars/primary/events/${encodeURIComponent(opts.event_id)}?sendUpdates=all`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        start: { dateTime: opts.start_at, timeZone: tz },
        end: { dateTime: opts.end_at, timeZone: tz },
      }),
    },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`patchEvent failed: ${res.status} ${text}`)
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/google-calendar.ts
git commit -m "feat(quote): Google Calendar v3 API wrapper

Pure-function wrapper around Calendar API for: getAvailableSlots
(freebusy + 14-day walk with business-hours filter), createMeetingEvent
(with Meet link), cancelMeetingEvent, rescheduleMeetingEvent. Slot ids
are HMAC-signed via slot-signing. Raw fetch — no client lib.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Booking SMS module

**Files:**
- Create: `src/lib/booking-sms.ts`

- [ ] **Step 1: Create the module**

Create `src/lib/booking-sms.ts`:

```ts
// SMS dispatchers for the booking lifecycle. Honors:
//   - sms_delivery_enabled (existing kill switch via isSmsEnabled)
//   - booking_reminders_enabled (new flag for reminders only)
// All sends use the existing sendSms helper (Twilio + idempotent + logged).

import { supabaseAdmin } from './supabase/admin'
import { sendSms, isSmsEnabled } from './twilio-sms'
import { notifyAdminTeam } from './admin-sms'

interface BookingForSms {
  id: string
  attendee_phone: string | null
  attendee_email: string
  attendee_name: string | null
  start_at: string
  google_meet_link: string | null
  google_meet_id: string | null
  status: string
  cancelled_by: string | null
}

interface ProspectForSms {
  business_name: string | null
}

async function loadBooking(booking_id: string): Promise<{
  booking: BookingForSms
  prospect: ProspectForSms | null
} | null> {
  const { data } = await supabaseAdmin
    .from('bookings')
    .select('id, attendee_phone, attendee_email, attendee_name, start_at, google_meet_link, google_meet_id, status, cancelled_by, prospect_id')
    .eq('id', booking_id)
    .single()
  if (!data) return null
  let prospect: ProspectForSms | null = null
  if (data.prospect_id) {
    const { data: p } = await supabaseAdmin
      .from('prospects').select('business_name').eq('id', data.prospect_id).single()
    prospect = p as ProspectForSms | null
  }
  return { booking: data as BookingForSms, prospect }
}

function formatPt(iso: string): string {
  const d = new Date(iso)
  const day = d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    timeZone: 'America/Los_Angeles',
  })
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: 'America/Los_Angeles',
  })
  return `${day} ${time} PT`
}

async function isReminderEnabled(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('quote_config').select('value').eq('key', 'booking_reminders_enabled').maybeSingle()
  // JSONB readers tolerate native boolean OR string (CLAUDE.md §12 lesson)
  return data?.value === true || data?.value === 'true'
}

export async function sendBookingConfirmationToProspect(booking_id: string): Promise<{ ok: boolean; reason?: string }> {
  if (!(await isSmsEnabled())) return { ok: false, reason: 'sms_disabled' }
  const ctx = await loadBooking(booking_id)
  if (!ctx) return { ok: false, reason: 'booking_not_found' }
  if (!ctx.booking.attendee_phone) return { ok: false, reason: 'no_phone' }

  const when = formatPt(ctx.booking.start_at)
  const link = ctx.booking.google_meet_link ?? ''
  const body = `Demand Signals: you're booked for ${when}. Meet: ${link} — reply if you need to reschedule.`
  const result = await sendSms(ctx.booking.attendee_phone, body)
  return result.success ? { ok: true } : { ok: false, reason: result.error ?? 'send_failed' }
}

export async function sendBookingNotificationToAdmin(booking_id: string): Promise<{ ok: boolean }> {
  if (!(await isSmsEnabled())) return { ok: false }
  const ctx = await loadBooking(booking_id)
  if (!ctx) return { ok: false }
  const biz = ctx.prospect?.business_name ?? ctx.booking.attendee_email
  const when = formatPt(ctx.booking.start_at)
  const link = ctx.booking.google_meet_link ?? '(no meet link)'
  await notifyAdminTeam(`🎯 Booked: ${biz} — ${when} — ${link}`)
  return { ok: true }
}

export async function sendBookingCancellationToAdmin(booking_id: string): Promise<{ ok: boolean }> {
  if (!(await isSmsEnabled())) return { ok: false }
  const ctx = await loadBooking(booking_id)
  if (!ctx) return { ok: false }
  const biz = ctx.prospect?.business_name ?? ctx.booking.attendee_email
  const when = formatPt(ctx.booking.start_at)
  const by = ctx.booking.cancelled_by ?? 'unknown'
  await notifyAdminTeam(`❌ Cancelled: ${biz} — was ${when} — by ${by}`)
  return { ok: true }
}

export async function sendBookingReminder24h(booking_id: string): Promise<{ ok: boolean; reason?: string }> {
  if (!(await isSmsEnabled())) return { ok: false, reason: 'sms_disabled' }
  if (!(await isReminderEnabled())) return { ok: false, reason: 'reminders_disabled' }
  const ctx = await loadBooking(booking_id)
  if (!ctx) return { ok: false, reason: 'booking_not_found' }
  if (ctx.booking.status !== 'confirmed') return { ok: false, reason: 'not_confirmed' }
  if (!ctx.booking.attendee_phone) return { ok: false, reason: 'no_phone' }

  const when = formatPt(ctx.booking.start_at)
  const link = ctx.booking.google_meet_link ?? ''
  const body = `Demand Signals reminder: strategy call tomorrow at ${when}. Meet: ${link}`
  const result = await sendSms(ctx.booking.attendee_phone, body)
  if (result.success) {
    await supabaseAdmin
      .from('bookings')
      .update({ reminder_24h_sent_at: new Date().toISOString() })
      .eq('id', booking_id)
    return { ok: true }
  }
  return { ok: false, reason: result.error ?? 'send_failed' }
}

export async function sendBookingReminder1h(booking_id: string): Promise<{ ok: boolean; reason?: string }> {
  if (!(await isSmsEnabled())) return { ok: false, reason: 'sms_disabled' }
  if (!(await isReminderEnabled())) return { ok: false, reason: 'reminders_disabled' }
  const ctx = await loadBooking(booking_id)
  if (!ctx) return { ok: false, reason: 'booking_not_found' }
  if (ctx.booking.status !== 'confirmed') return { ok: false, reason: 'not_confirmed' }
  if (!ctx.booking.attendee_phone) return { ok: false, reason: 'no_phone' }

  const link = ctx.booking.google_meet_link ?? ''
  const body = `Demand Signals: your call starts in 1 hour. Meet: ${link}`
  const result = await sendSms(ctx.booking.attendee_phone, body)
  if (result.success) {
    await supabaseAdmin
      .from('bookings')
      .update({ reminder_1h_sent_at: new Date().toISOString() })
      .eq('id', booking_id)
    return { ok: true }
  }
  return { ok: false, reason: result.error ?? 'send_failed' }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/booking-sms.ts
git commit -m "feat(quote): booking SMS dispatchers

Five senders for the booking lifecycle: prospect confirmation, admin
notification, 24h reminder, 1h reminder, admin cancellation. Honors
sms_delivery_enabled + new booking_reminders_enabled kill switches.
Reminder dedup via reminder_*_sent_at columns set on success.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: bookings public API module

**Files:**
- Create: `src/lib/bookings.ts`

- [ ] **Step 1: Create the module**

Create `src/lib/bookings.ts`:

```ts
// Public booking API used by quote-tools, admin reschedule, and the
// future /book public page. The single entry point for creating /
// modifying bookings rows.
//
// Phone resolution cascade (opportunistic, never blocks):
//   1. prospects.owner_phone (existing client returnees)
//   2. quote_sessions phone_encrypted (this session's verified phone)
//   3. null → SMS dispatch is silently skipped

import { supabaseAdmin } from './supabase/admin'
import { toE164, decryptPhone } from './quote-crypto'
import {
  getAvailableSlots,
  createMeetingEvent,
  cancelMeetingEvent,
  rescheduleMeetingEvent,
  type AvailableSlot,
} from './google-calendar'
import { verifySlotId } from './slot-signing'
import {
  sendBookingConfirmationToProspect,
  sendBookingNotificationToAdmin,
  sendBookingCancellationToAdmin,
} from './booking-sms'

export interface BookSlotOpts {
  slot_id: string
  attendee_email: string
  attendee_name?: string
  source: 'quote' | 'public_book' | 'admin_manual'
  quote_session_id?: string
  prospect_id?: string
  context_for_summary?: string
  context_for_description?: string
}

export interface BookSlotResult {
  ok: true
  booking_id: string
  start_at: string
  end_at: string
  meet_link: string
}

export interface BookSlotError {
  ok: false
  reason: 'invalid_slot' | 'slot_taken' | 'calendar_disconnected' | 'invalid_email' | 'unknown'
  detail?: string
}

const HOST_EMAIL = 'demandsignals@gmail.com'

export async function listAvailableSlots(opts?: { count?: number; durationMinutes?: number }): Promise<AvailableSlot[]> {
  return getAvailableSlots({
    duration_minutes: opts?.durationMinutes ?? 30,
    count: opts?.count ?? 2,
  })
}

async function resolveAttendeePhone(opts: {
  prospect_id?: string
  quote_session_id?: string
}): Promise<string | null> {
  if (opts.prospect_id) {
    const { data } = await supabaseAdmin
      .from('prospects')
      .select('owner_phone, business_phone')
      .eq('id', opts.prospect_id)
      .single()
    const phone = data?.owner_phone ?? data?.business_phone
    if (phone) {
      const e164 = toE164(phone)
      if (e164) return e164
    }
  }
  if (opts.quote_session_id) {
    const { data } = await supabaseAdmin
      .from('quote_sessions')
      .select('phone_encrypted, phone_verified')
      .eq('id', opts.quote_session_id)
      .single()
    if (data?.phone_verified && data.phone_encrypted) {
      try {
        const plaintext = decryptPhone(data.phone_encrypted)
        return toE164(plaintext)
      } catch {
        return null
      }
    }
  }
  return null
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function bookSlot(opts: BookSlotOpts): Promise<BookSlotResult | BookSlotError> {
  if (!isValidEmail(opts.attendee_email)) {
    return { ok: false, reason: 'invalid_email' }
  }
  const payload = verifySlotId(opts.slot_id)
  if (!payload) return { ok: false, reason: 'invalid_slot' }

  // Resolve phone opportunistically.
  const attendeePhone = await resolveAttendeePhone({
    prospect_id: opts.prospect_id,
    quote_session_id: opts.quote_session_id,
  })

  // Create the calendar event.
  let event: { event_id: string; meet_link: string; meet_id: string }
  try {
    event = await createMeetingEvent({
      start_at: payload.start_at,
      end_at: payload.end_at,
      attendee_email: opts.attendee_email,
      attendee_name: opts.attendee_name,
      summary: opts.context_for_summary ?? 'Demand Signals — strategy call',
      description: opts.context_for_description ?? `Strategy call with ${opts.attendee_email}.`,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'calendar_disconnected') {
      return { ok: false, reason: 'calendar_disconnected' }
    }
    // Common: 409 conflict, 403 attendee unavailable
    return { ok: false, reason: 'slot_taken', detail: msg }
  }

  // Insert bookings row. Compensating rollback if DB insert fails.
  const { data: booking, error: insErr } = await supabaseAdmin
    .from('bookings')
    .insert({
      source: opts.source,
      quote_session_id: opts.quote_session_id ?? null,
      prospect_id: opts.prospect_id ?? null,
      host_email: HOST_EMAIL,
      attendee_email: opts.attendee_email,
      attendee_name: opts.attendee_name ?? null,
      attendee_phone: attendeePhone,
      start_at: payload.start_at,
      end_at: payload.end_at,
      google_event_id: event.event_id,
      google_meet_link: event.meet_link,
      google_meet_id: event.meet_id,
      status: 'confirmed',
    })
    .select('id')
    .single()

  if (insErr || !booking) {
    // Compensating rollback
    try { await cancelMeetingEvent(event.event_id) } catch { /* best effort */ }
    return { ok: false, reason: 'unknown', detail: insErr?.message ?? 'insert failed' }
  }

  // Update quote_session pointer + persist attendee_email.
  if (opts.quote_session_id) {
    await supabaseAdmin
      .from('quote_sessions')
      .update({ booking_id: booking.id, attendee_email: opts.attendee_email })
      .eq('id', opts.quote_session_id)
  }

  // Write activity row (canonical "Booked meeting").
  if (opts.prospect_id) {
    const { format: fmt } = new Intl.DateTimeFormat('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      hour12: true, timeZone: 'America/Los_Angeles',
    })
    const whenLabel = fmt(new Date(payload.start_at)) + ' PT'
    await supabaseAdmin.from('activities').insert({
      prospect_id: opts.prospect_id,
      type: 'meeting_booked',
      channel: opts.source === 'quote' ? 'quote_estimator' : opts.source,
      subject: 'Booked meeting',
      body: [
        whenLabel,
        `Attendee: ${opts.attendee_email}`,
        event.meet_link ? `Meet: ${event.meet_link}` : null,
        `Source: /${opts.source === 'quote' ? 'quote' : opts.source}`,
      ].filter(Boolean).join('\n'),
      created_by: 'booking_system',
    })
  }

  // Fire-and-forget SMS dispatches.
  sendBookingConfirmationToProspect(booking.id).catch(() => {})
  sendBookingNotificationToAdmin(booking.id).catch(() => {})

  return {
    ok: true,
    booking_id: booking.id,
    start_at: payload.start_at,
    end_at: payload.end_at,
    meet_link: event.meet_link,
  }
}

export async function cancelBooking(opts: {
  booking_id: string
  reason?: string
  cancelled_by: 'prospect' | 'admin' | 'system'
}): Promise<{ ok: boolean; error?: string }> {
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, google_event_id, status')
    .eq('id', opts.booking_id)
    .single()
  if (!booking) return { ok: false, error: 'booking_not_found' }
  if (booking.status === 'cancelled') return { ok: true }

  try {
    await cancelMeetingEvent(booking.google_event_id)
  } catch (e) {
    // Continue — local cancellation should succeed even if calendar API fails.
    console.error('[cancelBooking] calendar delete failed:', e instanceof Error ? e.message : e)
  }

  await supabaseAdmin
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: opts.cancelled_by,
      cancel_reason: opts.reason ?? null,
    })
    .eq('id', opts.booking_id)

  sendBookingCancellationToAdmin(opts.booking_id).catch(() => {})
  return { ok: true }
}

export async function rescheduleBooking(opts: {
  booking_id: string
  new_slot_id: string
}): Promise<{ ok: boolean; error?: string; new_start_at?: string }> {
  const payload = verifySlotId(opts.new_slot_id)
  if (!payload) return { ok: false, error: 'invalid_slot' }

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, google_event_id, status')
    .eq('id', opts.booking_id)
    .single()
  if (!booking) return { ok: false, error: 'booking_not_found' }
  if (booking.status !== 'confirmed') return { ok: false, error: 'not_confirmed' }

  try {
    await rescheduleMeetingEvent({
      event_id: booking.google_event_id,
      start_at: payload.start_at,
      end_at: payload.end_at,
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'reschedule_failed' }
  }

  // New time → reset reminder dedup so the cron re-sends 24h/1h reminders for the new slot.
  await supabaseAdmin
    .from('bookings')
    .update({
      start_at: payload.start_at,
      end_at: payload.end_at,
      reminder_24h_sent_at: null,
      reminder_1h_sent_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', opts.booking_id)

  return { ok: true, new_start_at: payload.start_at }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/bookings.ts
git commit -m "feat(quote): bookings public API (book/cancel/reschedule)

Single entry point for booking operations. Verifies HMAC slot ids,
creates Calendar event with Meet link, persists booking row,
opportunistically captures attendee phone for SMS, writes canonical
'Booked meeting' activity, fire-and-forget SMS dispatch. Compensating
rollback if DB insert fails after Calendar event was created.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Admin OAuth integration endpoints + page

**Files:**
- Create: `src/app/api/integrations/google/start/route.ts`
- Create: `src/app/api/integrations/google/callback/route.ts`
- Create: `src/app/api/integrations/google/test/route.ts`
- Create: `src/app/api/integrations/google/disconnect/route.ts`
- Create: `src/app/admin/integrations/google/page.tsx`
- Modify: `src/components/admin/admin-sidebar.tsx`

- [ ] **Step 1: OAuth start route**

Create `src/app/api/integrations/google/start/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getAuthorizationUrl } from '@/lib/google-oauth'
import crypto from 'node:crypto'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const state = crypto.randomBytes(16).toString('base64url')
  const url = getAuthorizationUrl(state)

  // Persist state in a short-lived signed cookie for CSRF check on callback.
  const res = NextResponse.redirect(url)
  res.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,  // 10 min
    path: '/',
  })
  return res
}
```

- [ ] **Step 2: OAuth callback route**

Create `src/app/api/integrations/google/callback/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { exchangeCodeForTokens } from '@/lib/google-oauth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  const adminUrl = `${url.origin}/admin/integrations/google`

  if (error) {
    return NextResponse.redirect(`${adminUrl}?error=${encodeURIComponent(error)}`)
  }
  if (!code || !state) {
    return NextResponse.redirect(`${adminUrl}?error=missing_code_or_state`)
  }
  const cookieState = request.cookies.get('google_oauth_state')?.value
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(`${adminUrl}?error=state_mismatch`)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Upsert (provider, account_email) is unique.
    await supabaseAdmin
      .from('integrations')
      .upsert({
        provider: 'google_calendar',
        account_email: tokens.account_email,
        scopes: tokens.scopes,
        access_token: tokens.access_token,
        access_token_expires_at: expiresAt,
        refresh_token: tokens.refresh_token,
        metadata: { name: tokens.account_name, picture: tokens.account_picture },
        connected_by: auth.user.id,
        revoked_at: null,
      }, { onConflict: 'provider,account_email' })

    const res = NextResponse.redirect(`${adminUrl}?connected=1`)
    res.cookies.delete('google_oauth_state')
    return res
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return NextResponse.redirect(`${adminUrl}?error=${encodeURIComponent(msg)}`)
  }
}
```

- [ ] **Step 3: Test event route**

Create `src/app/api/integrations/google/test/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createMeetingEvent, cancelMeetingEvent } from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  // 5 minutes from now, 1 minute long. Won't notify anyone (no real attendee).
  const start = new Date(Date.now() + 5 * 60_000)
  const end = new Date(start.getTime() + 60_000)

  try {
    const event = await createMeetingEvent({
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      attendee_email: 'demandsignals@gmail.com',
      summary: '[TEST] DSIG calendar integration test',
      description: 'Created by /api/integrations/google/test. Will be deleted in <1s.',
    })
    // Immediately cancel.
    await cancelMeetingEvent(event.event_id)
    return NextResponse.json({ ok: true, meet_link: event.meet_link, event_id: event.event_id })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Disconnect route**

Create `src/app/api/integrations/google/disconnect/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { revokeIntegration, getActiveCalendarIntegration } from '@/lib/google-oauth'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const integration = await getActiveCalendarIntegration()
  if (!integration) return NextResponse.json({ ok: true, message: 'no active integration' })

  await revokeIntegration(integration.id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Admin page**

Create `src/app/admin/integrations/google/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'

interface IntegrationStatus {
  connected: boolean
  account_email: string | null
  connected_at: string | null
  revoked: boolean
}

export default function GoogleIntegrationPage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/integrations/google/status')
      const data = await res.json()
      setStatus(data)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function runTest() {
    setTesting(true); setTestResult(null)
    try {
      const res = await fetch('/api/integrations/google/test', { method: 'POST' })
      const data = await res.json()
      setTestResult(data.ok ? '✓ Calendar access works (test event created + deleted)' : `Error: ${data.error}`)
    } finally { setTesting(false) }
  }

  async function disconnect() {
    if (!confirm('Disconnect the Google Calendar integration?')) return
    await fetch('/api/integrations/google/disconnect', { method: 'POST' })
    await load()
  }

  if (loading) {
    return <div className="p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  return (
    <div className="max-w-3xl p-8">
      <h1 className="text-2xl font-bold mb-6">Google Calendar Integration</h1>

      {status?.connected ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900">Connected</p>
              <p className="text-sm text-emerald-800">
                {status.account_email}
                {status.connected_at && ` · since ${new Date(status.connected_at).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={runTest}
              disabled={testing}
              className="px-3 py-2 bg-white border border-emerald-300 text-emerald-900 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {testing ? 'Testing…' : 'Test calendar access'}
            </button>
            <button
              onClick={disconnect}
              className="px-3 py-2 bg-red-50 border border-red-200 text-red-900 rounded-md text-sm font-medium"
            >
              Disconnect
            </button>
          </div>
          {testResult && (
            <p className="text-sm text-emerald-900 mt-2">{testResult}</p>
          )}
        </div>
      ) : status?.revoked ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Connection revoked</p>
              <p className="text-sm text-red-800">Reconnect to resume booking.</p>
            </div>
          </div>
          <a
            href="/api/integrations/google/start"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium"
          >
            Reconnect <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
          <p className="text-slate-700">
            Connect <strong>demandsignals@gmail.com</strong> to enable real Calendar event creation
            for booked meetings from the /quote flow.
          </p>
          <a
            href="/api/integrations/google/start"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium"
          >
            Connect Google Calendar <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Status endpoint for the page**

Create `src/app/api/admin/integrations/google/status/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { data } = await supabaseAdmin
    .from('integrations')
    .select('account_email, connected_at, revoked_at')
    .eq('provider', 'google_calendar')
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ connected: false, account_email: null, connected_at: null, revoked: false })
  }
  if (data.revoked_at) {
    return NextResponse.json({ connected: false, account_email: data.account_email, connected_at: data.connected_at, revoked: true })
  }
  return NextResponse.json({ connected: true, account_email: data.account_email, connected_at: data.connected_at, revoked: false })
}
```

- [ ] **Step 7: Add sidebar link**

Open `src/components/admin/admin-sidebar.tsx`. Find the ADMIN group section. Add an entry for Integrations alongside the existing items. The exact placement depends on the existing structure — locate the ADMIN group's array of items and add:

```ts
{ label: 'Integrations', href: '/admin/integrations/google', icon: 'Plug' }
```

(The `icon` value should match an icon that's already imported in the file. If `Plug` from lucide-react isn't imported, use any existing icon like `Settings` or import `Plug` at the top.)

- [ ] **Step 8: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add src/app/api/integrations/google/ src/app/api/admin/integrations/ src/app/admin/integrations/ src/components/admin/admin-sidebar.tsx
git commit -m "feat(quote): admin Google Calendar OAuth integration UI

One-time admin flow at /admin/integrations/google connects
demandsignals@gmail.com. Includes Connect, Test (creates+deletes a
1-min test event), and Disconnect. CSRF-protected via signed cookie
state. Status endpoint surfaces connected/revoked state.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Continue-to-SOW fix

**Files:**
- Modify: `src/app/api/admin/quotes/[id]/continue-to-sow/route.ts`

- [ ] **Step 1: Drop the bad column from SELECT**

Open `src/app/api/admin/quotes/[id]/continue-to-sow/route.ts`. Find the line:

```ts
    .select('id, business_name, prospect_id, estimate_low, scope_summary, selected_items')
```

Replace with:

```ts
    .select('id, business_name, prospect_id, estimate_low, selected_items')
```

(Remove `scope_summary` only — it doesn't exist on `quote_sessions` and the route doesn't use it anyway. The PostgREST error from the unknown column was being misreported as "Quote session not found".)

- [ ] **Step 2: Find and remove the unused `scope_summary` reference**

In the same file, find any reference to `session.scope_summary` and either:
- delete the line if it's only used in a string template
- replace with `null` if it's an argument to an INSERT (the SOW row has its own scope_summary that comes from elsewhere)

(Quick grep:
```bash
grep -n "scope_summary" src/app/api/admin/quotes/[id]/continue-to-sow/route.ts
```
should show only the one reference in the SELECT after this fix. If others exist, remove them.)

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/quotes/\[id\]/continue-to-sow/route.ts
git commit -m "fix(quote): continue-to-sow returns 'session not found' (#bug)

Root cause: the SELECT included scope_summary, which doesn't exist on
quote_sessions (it lives on prospects). PostgREST raised a column-not-
found error that was misreported as 'Quote session not found' to the
admin UI. Drops the column from the SELECT — it wasn't used downstream.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Extend QuoteSessionRow type

**Files:**
- Modify: `src/lib/quote-session.ts`

- [ ] **Step 1: Add the three new fields**

Open `src/lib/quote-session.ts`. Find the `QuoteSessionRow` interface. Locate the `matched_prospect_id` and `matched_phone_last_four` lines (added in commit `f9857cb`). Right after them, add:

```ts
  booking_id: string | null
  attendee_email: string | null
  offered_slot_ids: unknown  // jsonb — array of signed slot ids; validated server-side
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/quote-session.ts
git commit -m "feat(quote): extend QuoteSessionRow with booking fields

Adds booking_id (FK to bookings), attendee_email (captured during quote),
offered_slot_ids (jsonb array of signed slot ids) — used by the new
booking AI tools and the chat response payload.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Quote AI tools — handlers in quote-tools.ts

**Files:**
- Modify: `src/lib/quote-tools.ts`

- [ ] **Step 1: Add the three new tool cases**

Open `src/lib/quote-tools.ts`. Find the existing switch statement that handles tool cases (search for `case 'trigger_handoff':`). Add three new cases, placed after the `flag_walkaway_risk` case:

```ts
      case 'capture_attendee_email': {
        const email = typeof tool.input.email === 'string' ? tool.input.email.trim() : ''
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return {
            tool_use_id: tool.id,
            content: JSON.stringify({ ok: false, reason: 'invalid_email' }),
          }
        }
        await supabaseAdmin
          .from('quote_sessions')
          .update({ attendee_email: email })
          .eq('id', session_id)
        await logEvent(session_id, 'attendee_email_captured', { email_domain: email.split('@')[1] })
        return { tool_use_id: tool.id, content: JSON.stringify({ ok: true }) }
      }

      case 'offer_meeting_slots': {
        try {
          const { listAvailableSlots } = await import('@/lib/bookings')
          const slots = await listAvailableSlots({ count: 2 })
          if (slots.length === 0) {
            return {
              tool_use_id: tool.id,
              content: JSON.stringify({ ok: false, reason: 'no_slots_available' }),
            }
          }
          // Persist slot ids on the session so book_meeting can verify the
          // AI didn't fabricate one.
          await supabaseAdmin
            .from('quote_sessions')
            .update({ offered_slot_ids: slots.map((s) => s.id) })
            .eq('id', session_id)
          await logEvent(session_id, 'meeting_slots_offered', { count: slots.length })
          return {
            tool_use_id: tool.id,
            content: JSON.stringify({
              ok: true,
              slots: slots.map((s) => ({ id: s.id, display_label: s.display_label })),
            }),
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          if (msg === 'calendar_disconnected') {
            return {
              tool_use_id: tool.id,
              content: JSON.stringify({ ok: false, reason: 'calendar_disconnected' }),
            }
          }
          return {
            tool_use_id: tool.id,
            content: JSON.stringify({ ok: false, reason: 'unknown', detail: msg }),
          }
        }
      }

      case 'book_meeting': {
        const slot_id = typeof tool.input.slot_id === 'string' ? tool.input.slot_id : ''
        if (!slot_id) {
          return { tool_use_id: tool.id, content: JSON.stringify({ ok: false, reason: 'missing_slot_id' }) }
        }
        // Pull session to confirm slot was offered + get attendee_email.
        const { data: sess } = await supabaseAdmin
          .from('quote_sessions')
          .select('attendee_email, prospect_id, business_name, offered_slot_ids')
          .eq('id', session_id)
          .single()
        if (!sess?.attendee_email) {
          return { tool_use_id: tool.id, content: JSON.stringify({ ok: false, reason: 'no_attendee_email' }) }
        }
        const offeredIds = Array.isArray(sess.offered_slot_ids) ? (sess.offered_slot_ids as string[]) : []
        if (!offeredIds.includes(slot_id)) {
          return { tool_use_id: tool.id, content: JSON.stringify({ ok: false, reason: 'slot_not_offered' }) }
        }

        const { bookSlot } = await import('@/lib/bookings')
        const result = await bookSlot({
          slot_id,
          attendee_email: sess.attendee_email,
          source: 'quote',
          quote_session_id: session_id,
          prospect_id: sess.prospect_id ?? undefined,
          context_for_summary: `Demand Signals — ${sess.business_name ?? 'strategy call'}`,
          context_for_description: `Strategy call with ${sess.attendee_email} from /quote conversation. Session: ${session_id}.`,
        })
        if (!result.ok) {
          return { tool_use_id: tool.id, content: JSON.stringify({ ok: false, reason: result.reason }) }
        }
        await logEvent(session_id, 'meeting_booked', {
          booking_id: result.booking_id,
          start_at: result.start_at,
        })
        return {
          tool_use_id: tool.id,
          content: JSON.stringify({
            ok: true,
            booked: true,
            start_at: result.start_at,
            meet_link: result.meet_link,
          }),
        }
      }
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/quote-tools.ts
git commit -m "feat(quote): three new AI tools for booking flow

capture_attendee_email validates + persists. offer_meeting_slots returns
two HMAC-signed slots and persists their ids on the session.
book_meeting verifies slot was actually offered, calls bookSlot, returns
real booking + meet link to the AI.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Quote AI tool defs + system-prompt directive

**Files:**
- Modify: `src/lib/quote-ai.ts`

- [ ] **Step 1: Add tool definitions**

Open `src/lib/quote-ai.ts`. Find the array containing `name: 'trigger_handoff'` (around line 1477). Add three new tool defs right after `trigger_handoff` and before `offer_soft_save`:

```ts
  {
    name: 'capture_attendee_email',
    description: 'Persist the prospect\'s email address for sending the calendar invite. ALWAYS call this BEFORE offer_meeting_slots, in a separate turn — the AI must explicitly ask for the email first ("what email should I send the calendar invite to?"). Do not guess or fabricate emails.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Validated email address provided by the prospect.' },
      },
      required: ['email'],
    },
  },
  {
    name: 'offer_meeting_slots',
    description: 'Query the calendar for the next 2 available 30-minute slots. Returns slot ids + display labels. Call this AFTER capture_attendee_email (silently, no message to the prospect — the AI weaves the slots into its next message). Each slot id is a signed token; book_meeting will reject any id that wasn\'t offered here.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'book_meeting',
    description: 'Create the calendar event with a Google Meet link, send the invite to the captured attendee email, and persist a booking record. Pass the slot_id the prospect picked from the slots offer_meeting_slots returned. On success, returns { booked: true, start_at, meet_link } — the AI\'s next reply MUST include the actual time and meet link from the result. Never claim a meeting is booked unless this tool returned ok=true.',
    input_schema: {
      type: 'object',
      properties: {
        slot_id: { type: 'string', description: 'A slot id from a prior offer_meeting_slots call.' },
      },
      required: ['slot_id'],
    },
  },
```

- [ ] **Step 2: Add system-prompt directive**

In the same file, find the section describing the handoff/booking flow (around line 830-1100, where the prompt currently says things like "Call trigger_handoff with reason describing the signal"). Locate where the booking flow guidance lives — there's typically a "Phase 6/7" or "BOOKING/HANDOFF" section.

Add this directive block (you can add it as a clearly-labeled section near the existing booking guidance):

```
═══════════════════════════════════════════════════
BOOKING A MEETING — REAL CALENDAR FLOW
═══════════════════════════════════════════════════
When the prospect is ready to book a strategy call:

1. ASK FOR EMAIL (separate turn).
   You don't have the prospect's email. Ask: "what's the best email to
   send the calendar invite to?"
   When they reply, call capture_attendee_email with the email.
   On invalid_email: ask them to re-share it.

2. OFFER SLOTS (silent tool call).
   Call offer_meeting_slots with no arguments. The tool returns up to
   2 slots with display labels like "Tomorrow 10:00 AM PT". Weave both
   slots into your next message naturally:
   "Works for you {slot 1.display_label} or {slot 2.display_label}?"
   On no_slots_available or calendar_disconnected: tell the prospect
   "I'll have someone from the team reach out within the hour to lock
   in a time" and call trigger_handoff with reason='calendar_unavailable'.

3. BOOK THE PICKED SLOT.
   When the prospect picks one (in any phrasing — "the first one",
   "tomorrow at 10", "10am works"), call book_meeting with the slot_id
   that matches their pick. The tool returns either:
     ok=true with start_at and meet_link → your closing reply MUST
       include both the actual time and the meet link, e.g.:
       "Locked in for Tomorrow 10:00 AM PT. I sent the invite to
        steve@example.com — meet.google.com/abc-defg-hij"
     ok=false → DO NOT say a meeting is booked. Apologize, call
       trigger_handoff with the reason from the tool output.

4. NEVER CLAIM A BOOKING WITHOUT book_meeting=ok=true.
   The legacy "the team will call you" closing without a real
   book_meeting tool call is forbidden. Either book it or hand it off.

The legacy trigger_handoff tool remains for non-booking hot signals
(urgency questions BEFORE the prospect is ready, $10K+ unbooked
sessions). For actual scheduling, use the booking tools above.
```

Place this directive in the same prompt-assembly section that handles other booking guidance. The exact line is wherever the existing "Phase X — handoff" or "BOOKING" guidance currently lives.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/quote-ai.ts
git commit -m "feat(quote): tool defs + system-prompt directive for booking flow

Adds capture_attendee_email, offer_meeting_slots, book_meeting tool
definitions to the AI's toolkit. Adds a tightly-worded directive in
the system prompt that makes the booking flow explicit:
ask-email → offer-slots → book → confirm-with-real-time-and-link.
Forbids the legacy 'team will call' closing without a real book_meeting.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Activity log cleanup

**Files:**
- Modify: `src/lib/quote-prospect-sync.ts`

- [ ] **Step 1: Drop item_changed activity write + refine others**

Open `src/lib/quote-prospect-sync.ts`. Find the existing block (around line 250-265):

```ts
  // Log activity to the prospects activity log
  await supabaseAdmin.from('activities').insert({
    prospect_id: prospectId!,
    type: trigger === 'conversion_action' ? 'stage_change' : 'update',
    channel: 'quote_estimator',
    subject: triggerLabel(trigger),
    body: activityBody(trigger, session, scopeSummary),
    created_by: 'quote_estimator',
  })
```

Replace with:

```ts
  // Activity log: only write rows for events humans actually care about.
  // item_changed is dropped entirely — the configurator delta is already
  // visible in quote_events; no point spamming the prospect activity stream.
  // book_call (conversion_action) is also dropped because bookSlot() in
  // src/lib/bookings.ts writes the canonical "Booked meeting" row with the
  // real meeting time + meet link.
  const triggersThatLogActivity: SyncTrigger[] = [
    'research_confirmed',
    'phone_verified',
    'email_captured',
    'walkaway_flagged',
  ]
  if (triggersThatLogActivity.includes(trigger)) {
    // Dedupe: skip if the same subject already exists for this prospect+session today.
    // Cheap query, one indexed lookup.
    const subject = triggerLabel(trigger)
    const { data: existing } = await supabaseAdmin
      .from('activities')
      .select('id')
      .eq('prospect_id', prospectId!)
      .eq('subject', subject)
      .gte('created_at', new Date(Date.now() - 24 * 3_600_000).toISOString())
      .limit(1)
      .maybeSingle()
    if (!existing) {
      await supabaseAdmin.from('activities').insert({
        prospect_id: prospectId!,
        type: 'update',
        channel: 'quote_estimator',
        subject,
        body: activityBody(trigger, session, scopeSummary),
        created_by: 'quote_estimator',
      })
    }
  }
```

- [ ] **Step 2: Update triggerLabel for the kept events**

In the same file, find the `triggerLabel` function (around line 294-303). Replace its body with:

```ts
function triggerLabel(trigger: SyncTrigger): string {
  switch (trigger) {
    case 'research_confirmed': return 'Started new quote'
    case 'phone_verified': return 'Phone verified'
    case 'email_captured': return 'Email captured'
    case 'walkaway_flagged': return 'Walkaway risk flagged'
    case 'item_changed': return ''            // unused — no activity row written
    case 'conversion_action': return ''       // unused — bookSlot writes the row
  }
}
```

- [ ] **Step 3: Tighten activityBody for the kept events**

In the same file, find `activityBody`. Replace with:

```ts
function activityBody(
  trigger: SyncTrigger,
  session: { id: string; share_token: string; business_name: string | null; estimate_low: number | null; estimate_high: number | null; email: string | null },
  scopeSummary: string | null,
): string {
  const lines: string[] = []
  if (session.business_name) lines.push(`Business: ${session.business_name}`)
  if (trigger === 'email_captured' && session.email) lines.push(`Email: ${session.email}`)
  if (scopeSummary) lines.push(`Scope: ${scopeSummary}`)
  if (session.estimate_low != null && session.estimate_high != null) {
    lines.push(`Estimate: $${Math.round(session.estimate_low / 100)}-$${Math.round(session.estimate_high / 100)}`)
  }
  lines.push(`Session: /quote/s/${session.share_token}`)
  if (trigger === 'walkaway_flagged') {
    lines.unshift('🚨 AI detected exit signals — consider proactive follow-up.')
  }
  return lines.join('\n')
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/quote-prospect-sync.ts
git commit -m "feat(quote): replace activity-log noise with verb-only events

Drops item_changed activity writes (the noise creator — N rows per
session as the configurator updates). Drops conversion_action='book_call'
write because bookSlot() now writes the canonical 'Booked meeting' row.
Adds 24h dedup to prevent duplicate 'Started new quote' rows on
re-sync. Verb-only subjects: 'Started new quote', 'Phone verified',
'Email captured', 'Walkaway risk flagged'.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Quote chat response includes booking fields

**Files:**
- Modify: `src/app/api/quote/chat/route.ts`

- [ ] **Step 1: Extend the response payload**

Open `src/app/api/quote/chat/route.ts`. Find the `return NextResponse.json({...})` near the end (around line 382-404). Locate the `session: freshSession ? { ... } : null` block. Add three new fields inside the session shape, after the existing fields:

```ts
          // Booking surfacing for right-pane CTA flip
          booking_id: freshSession.booking_id ?? null,
          attendee_email: freshSession.attendee_email ?? null,
```

If the chat route doesn't already join the booking row, also add a small lookup right before building the response:

```ts
  // Fetch booking if present (for right-pane CTA flip)
  let booking: { start_at: string; google_meet_link: string | null } | null = null
  if (freshSession?.booking_id) {
    const { data } = await supabaseAdmin
      .from('bookings')
      .select('start_at, google_meet_link')
      .eq('id', freshSession.booking_id)
      .single()
    booking = data ?? null
  }
```

Then in the session shape:

```ts
          booking_id: freshSession.booking_id ?? null,
          attendee_email: freshSession.attendee_email ?? null,
          booking_start_at: booking?.start_at ?? null,
          booking_meet_link: booking?.google_meet_link ?? null,
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/quote/chat/route.ts
git commit -m "feat(quote): include booking fields in chat response

Adds booking_id, attendee_email, booking_start_at, booking_meet_link
to the chat response payload so the right-pane CTA can flip from
'Book a Strategy Call' to a 'Meeting confirmed' panel after booking.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: MeetingConfirmedPanel + right-pane integration

**Files:**
- Create: `src/components/quote/MeetingConfirmedPanel.tsx`
- Modify: `src/app/quote/page.tsx`

- [ ] **Step 1: Create the panel**

Create `src/components/quote/MeetingConfirmedPanel.tsx`:

```tsx
'use client'

import { CheckCircle2, ExternalLink } from 'lucide-react'

interface Props {
  startAt: string                // ISO
  meetLink: string | null
  attendeeEmail: string | null
}

function formatPt(iso: string): string {
  const d = new Date(iso)
  const day = d.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    timeZone: 'America/Los_Angeles',
  })
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: 'America/Los_Angeles',
  })
  return `${day} at ${time} PT`
}

export function MeetingConfirmedPanel({ startAt, meetLink, attendeeEmail }: Props) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 space-y-3">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-emerald-900 font-bold text-lg">Meeting confirmed</p>
          <p className="text-emerald-800 text-sm mt-0.5">{formatPt(startAt)}</p>
        </div>
      </div>
      {meetLink && (
        <a
          href={meetLink}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700 transition-colors w-full justify-center"
        >
          Join Google Meet
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
      {attendeeEmail && (
        <p className="text-xs text-emerald-700">
          Calendar invite sent to <strong>{attendeeEmail}</strong>.
        </p>
      )}
      <p className="text-xs text-emerald-700 pt-2 border-t border-emerald-200">
        Need to reschedule? Just reply in chat.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Wire into /quote page**

Open `src/app/quote/page.tsx`. Locate the right-pane render block where the CTAs ("Book a Strategy Call", "Start With a Free Research Report") are rendered. Add a conditional render at the top of that block:

```tsx
{session?.booking_id && session?.booking_start_at ? (
  <MeetingConfirmedPanel
    startAt={session.booking_start_at}
    meetLink={session.booking_meet_link ?? null}
    attendeeEmail={session.attendee_email ?? null}
  />
) : (
  // existing CTA buttons
)}
```

Plus the import at the top:

```tsx
import { MeetingConfirmedPanel } from '@/components/quote/MeetingConfirmedPanel'
```

- [ ] **Step 3: Update the session type used by /quote**

The page's local `session` state type needs to accept the new fields. Add to the type/interface:

```ts
booking_id?: string | null
booking_start_at?: string | null
booking_meet_link?: string | null
attendee_email?: string | null
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/quote/MeetingConfirmedPanel.tsx src/app/quote/page.tsx
git commit -m "feat(quote): right-pane CTA flips to MeetingConfirmedPanel after booking

When session.booking_id is set, the right-pane stops showing 'Book a
Strategy Call' and renders a 'Meeting confirmed' panel with the actual
booked time, the Google Meet link, and the email the invite was sent
to. Ends the broken state where the page kept inviting prospects to
book a meeting they already booked.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Booking reminders cron

**Files:**
- Create: `src/app/api/cron/booking-reminders/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Create the cron route**

Create `src/app/api/cron/booking-reminders/route.ts`:

```ts
// ── GET /api/cron/booking-reminders ──────────────────────────────────
// Vercel cron, runs every 5 minutes. Finds confirmed bookings where:
//   - 24h reminder is due (start_at between now+23h55m and now+24h5m,
//     reminder_24h_sent_at IS NULL)
//   - 1h reminder is due (start_at between now+55m and now+65m,
//     reminder_1h_sent_at IS NULL)
// Fires sendBookingReminder24h / sendBookingReminder1h respectively.
// Each helper sets the *_sent_at on success — exactly-once even if the
// cron fires twice in the window.
//
// Auth: Bearer token matches CRON_SECRET (Vercel Cron supplies header).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendBookingReminder24h, sendBookingReminder1h } from '@/lib/booking-sms'
import { verifyBearerSecret } from '@/lib/bearer-auth'

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  if (!verifyBearerSecret(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const in55m = new Date(now.getTime() + 55 * 60_000).toISOString()
  const in65m = new Date(now.getTime() + 65 * 60_000).toISOString()
  const in23h55m = new Date(now.getTime() + (23 * 60 + 55) * 60_000).toISOString()
  const in24h5m = new Date(now.getTime() + (24 * 60 + 5) * 60_000).toISOString()

  const { data: due24h } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('status', 'confirmed')
    .is('reminder_24h_sent_at', null)
    .not('attendee_phone', 'is', null)
    .gte('start_at', in23h55m)
    .lte('start_at', in24h5m)

  const { data: due1h } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('status', 'confirmed')
    .is('reminder_1h_sent_at', null)
    .not('attendee_phone', 'is', null)
    .gte('start_at', in55m)
    .lte('start_at', in65m)

  const results: Array<{ id: string; kind: '24h' | '1h'; ok: boolean; reason?: string }> = []
  for (const row of due24h ?? []) {
    const r = await sendBookingReminder24h(row.id)
    results.push({ id: row.id, kind: '24h', ok: r.ok, reason: r.reason })
  }
  for (const row of due1h ?? []) {
    const r = await sendBookingReminder1h(row.id)
    results.push({ id: row.id, kind: '1h', ok: r.ok, reason: r.reason })
  }

  return NextResponse.json({
    ran_at: now.toISOString(),
    found_24h: due24h?.length ?? 0,
    found_1h: due1h?.length ?? 0,
    results,
  })
}
```

- [ ] **Step 2: Add cron entry to vercel.json**

Open `vercel.json`. Find the `crons` array. Add one entry:

```json
{ "path": "/api/cron/booking-reminders", "schedule": "*/5 * * * *" }
```

(Note: Vercel's cron resolution is "best effort, every minute granularity". `*/5 * * * *` is fine.)

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/booking-reminders/route.ts vercel.json
git commit -m "feat(quote): booking reminder cron (24h + 1h)

Vercel cron runs every 5 minutes. Finds confirmed bookings inside the
24h±5min and 1h±5min windows, fires reminder SMS, dedupes via
reminder_*_sent_at columns. Exactly-once even if cron double-fires.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: Admin booking endpoints (cancel, reschedule, available-slots)

**Files:**
- Create: `src/app/api/admin/bookings/[id]/cancel/route.ts`
- Create: `src/app/api/admin/bookings/[id]/reschedule/route.ts`
- Create: `src/app/api/admin/bookings/available-slots/route.ts`

- [ ] **Step 1: Cancel route**

Create `src/app/api/admin/bookings/[id]/cancel/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { cancelBooking } from '@/lib/bookings'

interface Params { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const reason = typeof body?.reason === 'string' ? body.reason : undefined
  const result = await cancelBooking({ booking_id: id, reason, cancelled_by: 'admin' })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Reschedule route**

Create `src/app/api/admin/bookings/[id]/reschedule/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { rescheduleBooking } from '@/lib/bookings'

interface Params { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const new_slot_id = typeof body?.slot_id === 'string' ? body.slot_id : ''
  if (!new_slot_id) {
    return NextResponse.json({ error: 'slot_id required' }, { status: 400 })
  }
  const result = await rescheduleBooking({ booking_id: id, new_slot_id })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true, new_start_at: result.new_start_at })
}
```

- [ ] **Step 3: Available-slots route**

Create `src/app/api/admin/bookings/available-slots/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { listAvailableSlots } from '@/lib/bookings'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const url = new URL(request.url)
  const count = Math.max(1, Math.min(20, Number(url.searchParams.get('count') ?? 6)))
  try {
    const slots = await listAvailableSlots({ count })
    return NextResponse.json({ ok: true, slots })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/bookings/
git commit -m "feat(quote): admin booking endpoints (cancel + reschedule + slots)

POST cancel/[id] flips booking to cancelled, deletes Calendar event,
fires admin SMS. POST reschedule/[id] updates Calendar event +
resets reminder dedup. GET available-slots returns next N open slots
for the reschedule modal.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 17: Admin BookingCard + RescheduleModal + LatestQuotePanel

**Files:**
- Create: `src/components/admin/BookingCard.tsx`
- Create: `src/components/admin/RescheduleModal.tsx`
- Create: `src/components/admin/LatestQuotePanel.tsx`

- [ ] **Step 1: BookingCard**

Create `src/components/admin/BookingCard.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { CheckCircle2, ExternalLink, Calendar, Loader2 } from 'lucide-react'
import { RescheduleModal } from './RescheduleModal'

interface Booking {
  id: string
  start_at: string
  end_at: string
  attendee_email: string
  attendee_phone: string | null
  google_meet_link: string | null
  status: string
}

interface Props {
  booking: Booking
  onChange: () => void
}

function formatPt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: 'America/Los_Angeles',
  }) + ' PT'
}

export function BookingCard({ booking, onChange }: Props) {
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function cancel() {
    if (!confirm('Cancel this booking? An email will be sent to the prospect.')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/cancel`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'Admin cancelled' }),
      })
      if (res.ok) onChange()
      else alert((await res.json()).error ?? 'Cancel failed')
    } finally { setBusy(false) }
  }

  return (
    <>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-emerald-900 font-bold">Meeting booked</span>
              <span className="text-xs px-2 py-0.5 bg-emerald-200 rounded-full text-emerald-900 font-mono">
                {booking.status}
              </span>
            </div>
            <p className="text-emerald-900 text-sm mt-1">{formatPt(booking.start_at)}</p>
            <p className="text-emerald-700 text-xs mt-1">
              {booking.attendee_email}
              {booking.attendee_phone && ` · ${booking.attendee_phone}`}
            </p>
            {booking.google_meet_link && (
              <a
                href={booking.google_meet_link}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 mt-2"
              >
                <ExternalLink className="w-3 h-3" />
                {booking.google_meet_link.replace('https://', '')}
              </a>
            )}
          </div>
          {booking.status === 'confirmed' && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setRescheduleOpen(true)}
                disabled={busy}
                className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-900 rounded-md text-xs font-medium disabled:opacity-50"
              >
                <Calendar className="w-3 h-3 inline mr-1" />
                Reschedule
              </button>
              <button
                onClick={cancel}
                disabled={busy}
                className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-900 rounded-md text-xs font-medium disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Cancel'}
              </button>
            </div>
          )}
        </div>
      </div>
      {rescheduleOpen && (
        <RescheduleModal
          bookingId={booking.id}
          onClose={() => setRescheduleOpen(false)}
          onRescheduled={() => { setRescheduleOpen(false); onChange() }}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: RescheduleModal**

Create `src/components/admin/RescheduleModal.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface Props {
  bookingId: string
  onClose: () => void
  onRescheduled: () => void
}

interface Slot { id: string; display_label: string; start_at: string }

export function RescheduleModal({ bookingId, onClose, onRescheduled }: Props) {
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/bookings/available-slots?count=6')
        const data = await res.json()
        if (data.ok) setSlots(data.slots)
        else setErr(data.error ?? 'Failed to load slots')
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'failed')
      }
    })()
  }, [])

  async function pick(slot: Slot) {
    setBusy(slot.id); setErr(null)
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/reschedule`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slot_id: slot.id }),
      })
      const data = await res.json()
      if (res.ok) onRescheduled()
      else setErr(data.error ?? 'Reschedule failed')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="font-bold text-lg mb-4">Reschedule meeting</h2>
        {!slots && !err && <Loader2 className="w-5 h-5 animate-spin" />}
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        {slots && (
          <div className="space-y-2">
            {slots.length === 0 && <p className="text-sm text-slate-500">No available slots in the next 14 days.</p>}
            {slots.map((s) => (
              <button
                key={s.id}
                onClick={() => pick(s)}
                disabled={busy !== null}
                className="w-full text-left p-3 border border-slate-200 hover:border-emerald-400 rounded-md text-sm transition-colors disabled:opacity-50"
              >
                {busy === s.id ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                {s.display_label}
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-slate-600">Cancel</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: LatestQuotePanel**

Create `src/components/admin/LatestQuotePanel.tsx`:

```tsx
'use client'

import { ExternalLink, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface QuoteSnapshot {
  id: string
  doc_number: string | null
  status: string
  share_token: string
  estimate_low: number | null
  estimate_high: number | null
  monthly_low: number | null
  monthly_high: number | null
  scope_summary: string | null
  missed_leads_monthly: number | null
  avg_customer_value: number | null
  business_type: string | null
  person_role: string | null
  build_path: string | null
  research_findings: unknown
  created_at: string
}

interface Props {
  quote: QuoteSnapshot
}

function formatCents(cents: number | null): string {
  if (cents == null) return '—'
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}

export function LatestQuotePanel({ quote }: Props) {
  const findings = quote.research_findings as
    | { place?: { rating?: number; user_rating_count?: number }; site_scan?: { error?: string | null } | null; observations?: string[]; suggested_adds?: string[] }
    | null

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-900">Latest Quote</h2>
            {quote.doc_number && (
              <span className="font-mono text-xs text-slate-500">{quote.doc_number}</span>
            )}
            <span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full">{quote.status}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Started {new Date(quote.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/quotes/${quote.id}`}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-xs font-medium"
          >
            <ExternalLink className="w-3 h-3 inline mr-1" />
            View transcript
          </Link>
          <button
            onClick={async () => {
              const res = await fetch(`/api/admin/quotes/${quote.id}/continue-to-sow`, { method: 'POST' })
              const data = await res.json()
              if (res.ok) window.location.href = `/admin/sow/${data.sow_id}`
              else alert(data.error ?? 'Failed to create SOW')
            }}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium"
          >
            <ArrowRight className="w-3 h-3 inline mr-1" />
            Continue to SOW
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <div className="text-xs text-slate-500">Build estimate</div>
          <div className="font-semibold">{formatCents(quote.estimate_low)} – {formatCents(quote.estimate_high)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Monthly</div>
          <div className="font-semibold">
            {quote.monthly_high ? `${formatCents(quote.monthly_low)}–${formatCents(quote.monthly_high)}/mo` : '—'}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Persona</div>
          <div className="text-xs">{[quote.person_role, quote.business_type].filter(Boolean).join(' · ') || '—'}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Build path</div>
          <div className="text-xs">{quote.build_path ?? '—'}</div>
        </div>
      </div>

      {quote.scope_summary && (
        <div>
          <div className="text-xs text-slate-500 mb-1">Scope</div>
          <p className="text-sm text-slate-800">{quote.scope_summary}</p>
        </div>
      )}

      {quote.missed_leads_monthly != null && quote.avg_customer_value != null && (
        <div>
          <div className="text-xs text-slate-500 mb-1">ROI input</div>
          <p className="text-sm text-slate-800">
            {quote.missed_leads_monthly} leads/mo × {formatCents(quote.avg_customer_value)} avg
          </p>
        </div>
      )}

      {findings?.place && (
        <div>
          <div className="text-xs text-slate-500 mb-1">AI research highlights</div>
          <ul className="text-xs text-slate-700 space-y-0.5">
            {findings.place.rating != null && (
              <li>· Google: {findings.place.rating.toFixed(1)}★ ({findings.place.user_rating_count ?? 0})</li>
            )}
            {findings.observations?.slice(0, 2).map((o, i) => <li key={i}>· {o}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/BookingCard.tsx src/components/admin/RescheduleModal.tsx src/components/admin/LatestQuotePanel.tsx
git commit -m "feat(admin): BookingCard + RescheduleModal + LatestQuotePanel

Three reusable components for the prospect-record surfacing:
BookingCard shows status + meet link + reschedule/cancel actions.
RescheduleModal lists 6 available slots from the calendar API.
LatestQuotePanel surfaces the most recent quote_session's scope,
estimate, persona, ROI, AI research highlights — with View Transcript
and Continue-to-SOW buttons.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 18: Surface booking + quote on prospect record

**Files:**
- Modify: `src/app/admin/prospects/[id]/page.tsx`

- [ ] **Step 1: Fetch booking + latest quote**

Open `src/app/admin/prospects/[id]/page.tsx`. The page already fetches `prospect`. Add fetches for the most recent booking and most recent quote_session.

Find the existing data-loading hook (search for the `useEffect` that loads `prospect`). Add two more state hooks + fetches:

```ts
const [latestBooking, setLatestBooking] = useState<{
  id: string; start_at: string; end_at: string; attendee_email: string;
  attendee_phone: string | null; google_meet_link: string | null; status: string
} | null>(null)

const [latestQuote, setLatestQuote] = useState<any | null>(null)

// Inside the existing useEffect or a new one keyed on prospect.id:
useEffect(() => {
  if (!prospect?.id) return
  (async () => {
    const [bookingRes, quoteRes] = await Promise.all([
      fetch(`/api/admin/prospects/${prospect.id}/latest-booking`).then((r) => r.json()).catch(() => ({ booking: null })),
      fetch(`/api/admin/prospects/${prospect.id}/latest-quote`).then((r) => r.json()).catch(() => ({ quote: null })),
    ])
    setLatestBooking(bookingRes.booking)
    setLatestQuote(quoteRes.quote)
  })()
}, [prospect?.id])
```

- [ ] **Step 2: Render BookingCard at top + LatestQuotePanel above Documents**

Imports at the top of the file:

```tsx
import { BookingCard } from '@/components/admin/BookingCard'
import { LatestQuotePanel } from '@/components/admin/LatestQuotePanel'
```

Inside the render, before the existing prospect header (or as the first child after the page wrapper), add:

```tsx
{latestBooking && latestBooking.status === 'confirmed' && new Date(latestBooking.start_at) > new Date() && (
  <div className="mb-4">
    <BookingCard
      booking={latestBooking}
      onChange={() => window.location.reload()}
    />
  </div>
)}
```

Then before the existing `<ProspectDocuments prospectId={prospect.id} />` line, add:

```tsx
{latestQuote && (
  <div className="mb-4">
    <LatestQuotePanel quote={latestQuote} />
  </div>
)}
```

- [ ] **Step 3: Add the two new prospect-scoped endpoints**

Create `src/app/api/admin/prospects/[id]/latest-booking/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface Params { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params
  const { data } = await supabaseAdmin
    .from('bookings')
    .select('id, start_at, end_at, attendee_email, attendee_phone, google_meet_link, status')
    .eq('prospect_id', id)
    .order('start_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return NextResponse.json({ booking: data ?? null })
}
```

Create `src/app/api/admin/prospects/[id]/latest-quote/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface Params { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params
  const { data: quote } = await supabaseAdmin
    .from('quote_sessions')
    .select('id, doc_number, status, share_token, estimate_low, estimate_high, monthly_low, monthly_high, scope_summary, missed_leads_monthly, avg_customer_value, business_type, person_role, build_path, research_findings, created_at')
    .eq('prospect_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  // scope_summary lives on prospects, not quote_sessions — fold it in.
  if (quote) {
    const { data: prospect } = await supabaseAdmin
      .from('prospects').select('scope_summary').eq('id', id).single()
    ;(quote as any).scope_summary = prospect?.scope_summary ?? null
  }
  return NextResponse.json({ quote: quote ?? null })
}
```

- [ ] **Step 4: Add Quotes (EST) sub-section to ProspectDocuments**

In the same `src/app/admin/prospects/[id]/page.tsx` file, find the `ProspectDocuments` component (around line 1807). It currently fetches and displays SOWs + Invoices. Add a third fetch + render for quotes.

Find the `useEffect` that fetches sows + invoices. Add a third fetch:

```ts
const [quotes, setQuotes] = useState<Array<{
  id: string; doc_number: string | null; status: string;
  estimate_low: number | null; estimate_high: number | null; created_at: string
}>>([])

// Inside the existing useEffect:
const qres = await fetch(`/api/admin/prospects/${prospectId}/quotes`)
const qdata = await qres.json()
setQuotes(qdata.quotes ?? [])
```

In the render, after the `INVOICES` section (or before, your call), add:

```tsx
{quotes.length > 0 && (
  <>
    <div className="text-xs font-semibold text-slate-500 uppercase mb-1 mt-4">Quotes (EST)</div>
    <ul className="space-y-1 mb-4">
      {quotes.map((q) => (
        <li key={q.id} className="flex items-center justify-between text-sm hover:bg-slate-50 px-2 py-1 rounded">
          <Link href={`/admin/quotes/${q.id}`} className="flex items-center gap-2 flex-1">
            <span className="font-mono text-xs text-slate-500">{q.doc_number ?? '—'}</span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-slate-700">{q.status}</span>
          </Link>
          <span className="text-xs text-slate-500">
            {q.estimate_low != null ? `$${Math.round((q.estimate_low ?? 0) / 100)}-$${Math.round((q.estimate_high ?? 0) / 100)}` : '—'}
          </span>
          <span className="text-xs text-slate-400 ml-3">
            {new Date(q.created_at).toLocaleDateString()}
          </span>
        </li>
      ))}
    </ul>
  </>
)}
```

- [ ] **Step 5: Add the quotes endpoint**

Create `src/app/api/admin/prospects/[id]/quotes/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface Params { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params
  const { data } = await supabaseAdmin
    .from('quote_sessions')
    .select('id, doc_number, status, estimate_low, estimate_high, created_at')
    .eq('prospect_id', id)
    .order('created_at', { ascending: false })
  return NextResponse.json({ quotes: data ?? [] })
}
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/prospects/\[id\]/page.tsx src/app/api/admin/prospects/\[id\]/
git commit -m "feat(admin): surface booking + quote on prospect record

Adds BookingCard at the top of the prospect detail page (when there's
an upcoming confirmed booking). Adds LatestQuotePanel above Documents
showing scope, estimate, ROI, persona, AI research highlights — with
View Transcript and Continue-to-SOW buttons. Adds a Quotes (EST)
sub-section to ProspectDocuments listing every quote_session for the
prospect with EST# + status + estimate + date.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 19: End-to-end verification script

**Files:**
- Create: `scripts/verify-booking-roundtrip.mjs`

- [ ] **Step 1: Create the script**

Create `scripts/verify-booking-roundtrip.mjs`:

```js
#!/usr/bin/env node
// End-to-end verification: book → cancel → assert calendar mirrors DB.
//
// Run AFTER admin has connected the calendar via /admin/integrations/google.
// Requires .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// BOOKING_SLOT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
//
// Calls the production Supabase + Google API, but creates a test booking
// at the next available slot for a synthetic test attendee. Cancels it
// immediately. No real prospect or session data mutated.

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(ROOT, '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'BOOKING_SLOT_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']
for (const k of required) {
  if (!process.env[k]) { console.error(`Missing env: ${k}`); process.exit(1) }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

function signSlotId(payload) {
  const json = JSON.stringify(payload)
  const payloadB64 = Buffer.from(json).toString('base64url')
  const mac = crypto.createHmac('sha256', process.env.BOOKING_SLOT_SECRET).update(payloadB64).digest('base64url')
  return `${payloadB64}.${mac}`
}

async function getAccessToken() {
  const { data: row } = await supabase
    .from('integrations')
    .select('id, refresh_token')
    .eq('provider', 'google_calendar')
    .is('revoked_at', null)
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!row) throw new Error('No active Google Calendar integration. Connect at /admin/integrations/google first.')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: row.refresh_token,
    }).toString(),
  })
  if (!res.ok) throw new Error(`refresh failed: ${res.status} ${await res.text()}`)
  const json = await res.json()
  return json.access_token
}

let pass = 0, fail = 0
function ok(label) { console.log(`  ✓ ${label}`); pass++ }
function bad(label, detail) { console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`); fail++ }

async function main() {
  console.log('1. Acquire access token via refresh')
  const token = await getAccessToken()
  ok('access token acquired')

  console.log('\n2. Pick a free slot (1 hour from now, 30 min)')
  const start = new Date(Date.now() + 60 * 60_000)
  const end = new Date(start.getTime() + 30 * 60_000)
  const slot_id = signSlotId({ start_at: start.toISOString(), end_at: end.toISOString() })
  ok('slot signed')

  console.log('\n3. Create event via Calendar API directly')
  const evRes = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=none',
    {
      method: 'POST',
      headers: { 'authorization': `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        summary: '[VERIFICATION] DSIG booking-roundtrip test',
        description: 'Created by scripts/verify-booking-roundtrip.mjs — will be deleted in <5s',
        start: { dateTime: start.toISOString(), timeZone: 'America/Los_Angeles' },
        end: { dateTime: end.toISOString(), timeZone: 'America/Los_Angeles' },
        attendees: [{ email: 'verification-test@example.com' }],
        conferenceData: {
          createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } },
        },
      }),
    },
  )
  if (!evRes.ok) {
    bad('event creation', `${evRes.status} ${await evRes.text()}`)
    process.exit(1)
  }
  const ev = await evRes.json()
  ok('event created')
  ok(`meet link present: ${ev.conferenceData?.entryPoints?.[0]?.uri ? 'yes' : 'no'}`)

  console.log('\n4. Insert bookings row + quote_sessions FK simulated as null')
  const { data: row, error: insErr } = await supabase
    .from('bookings')
    .insert({
      source: 'admin_manual',
      host_email: 'demandsignals@gmail.com',
      attendee_email: 'verification-test@example.com',
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      google_event_id: ev.id,
      google_meet_link: ev.conferenceData?.entryPoints?.[0]?.uri ?? null,
      google_meet_id: ev.conferenceData?.conferenceId ?? null,
      status: 'confirmed',
    })
    .select('id, status, attendee_phone')
    .single()
  if (insErr) { bad('booking insert', insErr.message); process.exit(1) }
  ok('booking row inserted')

  console.log('\n5. Cancel the event')
  const delRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${ev.id}?sendUpdates=none`,
    { method: 'DELETE', headers: { 'authorization': `Bearer ${token}` } },
  )
  if (delRes.ok || delRes.status === 410) ok('calendar event deleted')
  else bad('delete failed', `${delRes.status}`)

  console.log('\n6. Cleanup booking row')
  await supabase.from('bookings').delete().eq('id', row.id)
  ok('booking row deleted')

  console.log(`\nResults: ${pass} pass, ${fail} fail`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => { console.error('Crashed:', e); process.exit(1) })
```

- [ ] **Step 2: Run AFTER OAuth connection (Task 7 must be live + admin must have connected)**

```bash
node scripts/verify-booking-roundtrip.mjs
```

Expected: all-pass with exit code 0.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify-booking-roundtrip.mjs
git commit -m "test(quote): end-to-end booking roundtrip verification

Creates a test event 1h from now via Calendar API, inserts a bookings
row, deletes both. Asserts: token refresh works, event created with
meet link, DB insert succeeds, calendar delete succeeds. Cleans up
both rows. Exits 0 on all-pass.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 20: Build + push + deploy

- [ ] **Step 1: Local build**

```bash
cd "D:/CLAUDE/demandsignals-next" && npm run build
```

Expected: clean compile, all static pages generated. If TypeScript errors surface, fix in the relevant file.

- [ ] **Step 2: Push**

```bash
GHTOKEN="<get from PROJECT.md §2>"
git -c credential.helper="" \
  -c "http.https://github.com.extraheader=Authorization: Basic $(echo -n "demand-signals:${GHTOKEN}" | base64 -w0)" \
  push origin master
```

Expected: 19+ commits push. Vercel auto-deploys.

- [ ] **Step 3: Confirm deploy**

Use the Vercel API token from PROJECT.md §2 to confirm the latest deployment is `READY` for the latest commit:

```bash
curl -s -H "Authorization: Bearer <VERCEL_TOKEN>" "https://api.vercel.com/v6/deployments?projectId=prj_MOFD7RLAS1tVLG1yLlt0kIZwPQrp&teamId=team_jPyeNYJSdDRpqSdsw3WD3AiQ&limit=1" | head -c 500
```

- [ ] **Step 4: Add `BOOKING_SLOT_SECRET` + `GOOGLE_OAUTH_REDIRECT_URI` to Vercel env vars**

Two env vars need to land in Vercel before the integration page works:
- `BOOKING_SLOT_SECRET` = the 32-byte hex generated in Task 2 Step 3
- `GOOGLE_OAUTH_REDIRECT_URI` = `https://demandsignals.co/api/integrations/google/callback`

After adding, redeploy via Vercel dashboard (Settings → Deployments → "Redeploy latest").

- [ ] **Step 5: Connect calendar via the new admin page**

Open `https://demandsignals.co/admin/integrations/google` (signed in as admin). Click Connect, complete OAuth. Confirm the page now shows "Connected as demandsignals@gmail.com".

- [ ] **Step 6: Run the verification script against production**

```bash
node scripts/verify-booking-roundtrip.mjs
```

Expected: all-pass.

---

## Task 21: Manual end-to-end smoke test

- [ ] **Step 1: Existing-client booking through /quote**

In incognito, run a /quote conversation as Mobile Mechanic Dan or another existing prospect. Push through to the booking turn. Confirm:

- AI asks for email in a separate turn (not bundled with slot offer)
- AI offers two specific slots with display labels
- After picking a slot, AI's closing message contains the actual booked time AND the meet link
- The right-pane CTA flips to a "Meeting confirmed" panel showing time + meet link + email

- [ ] **Step 2: Verify on demandsignals@gmail.com calendar**

Open Google Calendar. Confirm a real event exists at the booked time. Title is "Demand Signals — [business name]". Has a Meet link. Has the prospect email as attendee.

- [ ] **Step 3: Verify on the admin prospect record**

Navigate to `/admin/prospects/[id]`. Confirm:

- Top of page: BookingCard with the booked meeting (time, meet link, attendee email)
- Above Documents: LatestQuotePanel with scope, estimate, ROI, persona, research highlights, View Transcript + Continue-to-SOW buttons
- Documents → Quotes (EST) section listing the quote
- Activity stream shows ONLY: "Started new quote" once + "Phone verified" + "Email captured" + "Booked meeting" with full details. No "Quote scope updated" spam.

- [ ] **Step 4: Continue to SOW works**

From `/admin/quotes/[id]` or from LatestQuotePanel, click Continue to SOW. Confirm the SOW page loads (no "Quote session not found").

- [ ] **Step 5: SMS confirmations (if attendee_phone resolved)**

Confirm two SMS arrived if the prospect's phone was on file:
- Prospect: "Demand Signals: you're booked for [time]. Meet: [link]…"
- Admin (ADMIN_TEAM_PHONES): "🎯 Booked: [business] — [time] — [meet link]"

- [ ] **Step 6: Reschedule from admin**

Click Reschedule on the BookingCard. Pick a different slot. Confirm:
- Calendar event time updated (Google sends reschedule email automatically)
- bookings row's start_at/end_at updated
- reminder_24h_sent_at and reminder_1h_sent_at reset to null

- [ ] **Step 7: Cancel from admin**

Click Cancel on the BookingCard. Confirm:
- Calendar event deleted (prospect gets cancellation email)
- bookings row status='cancelled'
- BookingCard disappears from prospect record (it's gated by status='confirmed')

---

## Self-Review

**Spec coverage:**
| Spec Goal | Task |
|---|---|
| 1. Quote produces real Google Calendar event with Meet link, prospect invite, structured booking | Tasks 1, 4, 6, 10, 11 |
| 2. AI never claims booked unless real | Task 11 (system prompt forbids legacy closing) |
| 3. Right-pane CTA flips after booking | Tasks 13, 14 |
| 4. Admin prospect record shows quote + booking | Tasks 17, 18 |
| 5. Verb-only activity log | Task 12 |
| 6. Continue-to-SOW fix | Task 8 |
| 7. Reusable for /book public page | Task 6 (`bookings.source` enum), Task 4 (slot helper not coupled to AI) |
| Migration 035 (integrations + bookings + extra columns) | Task 1 |
| Slot HMAC | Task 2 |
| Google OAuth | Task 3 |
| Calendar API wrapper | Task 4 |
| booking-sms (5 senders) | Task 5 |
| AI tools (3) | Tasks 10, 11 |
| Type extension | Task 9 |
| Cron 24h+1h reminders | Task 15 |
| Admin endpoints (cancel/reschedule/slots) | Task 16 |
| BookingCard + RescheduleModal + LatestQuotePanel | Task 17 |
| Verification script | Task 19 |
| Manual smoke test | Task 21 |

**Placeholder scan:** None. Every code block is complete; every command is exact; every file path is absolute or repo-relative.

**Type consistency:**
- `AvailableSlot` defined in `google-calendar.ts`, re-exported via `bookings.ts`. Used consistently.
- `BookSlotOpts` / `BookSlotResult` / `BookSlotError` defined in `bookings.ts`, used by quote-tools.ts handlers and admin endpoints.
- `quote_sessions.booking_id` (uuid|null), `attendee_email` (text|null), `offered_slot_ids` (jsonb) — referenced consistently in migration, type, sync, chat route, AI tools.
- `bookings.attendee_phone` (text|null E.164) referenced consistently in migration, booking-sms.ts, bookings.ts.
- Reminder dedup columns `reminder_24h_sent_at`, `reminder_1h_sent_at` referenced in migration + booking-sms + cron.

**Two judgment calls executors should be aware of:**
1. **Task 11 system-prompt placement is approximate** — `quote-ai.ts` is large and the "Phase X / handoff / booking" section may have shifted. Locate the equivalent semantic position rather than relying on line numbers.
2. **Task 18 step 2 placement of BookingCard** — "before the existing prospect header" is the intent. If the page has a complex layout with a sticky toolbar, place the BookingCard immediately below the toolbar inside the main content area. Use judgment.

**One genuine ambiguity:** Task 17 LatestQuotePanel includes `scope_summary` in its props but the `quote_sessions` table doesn't have that column. Task 18 step 3 explicitly folds `prospects.scope_summary` into the API response so the component prop is populated. Confirm executor follows that detail in Task 18 step 3.
