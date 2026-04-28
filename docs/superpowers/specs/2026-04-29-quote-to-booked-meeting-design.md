# Quote → Booked Meeting: End-to-End Conversion Flow

**Date:** 2026-04-29
**Status:** Draft → ready for review

## Problem

When a prospect reaches the end of `/quote` and the AI says "the team will call you at 10am," nothing actually happens on the platform. No calendar event, no Google Meet link, no email invite to the prospect, no structured booking record. The admin gets a courtesy email; everything else is manual.

The quote funnel exists to produce booked meetings. Today it produces email notifications and goodwill. Same problem on the prospect side: a returning admin reading the prospect record cannot see the quote conversation, scope, or booking — only flat noisy "Quote scope updated" activity rows.

This design fixes the entire chain in one consolidated build, on a foundation generic enough to also power a public on-site booking page that replaces the Google Appointment Schedules link `[demandsignals.co/book]` will eventually use.

## Goals

1. When a prospect picks a slot in `/quote`, the platform creates a real Google Calendar event on `demandsignals@gmail.com` with a Google Meet link, sends an invite to the prospect's email, and persists a structured booking record.
2. The AI never claims a meeting was booked unless one actually was. The closing message contains the actual booked time and Meet link.
3. The right-pane CTA on `/quote` flips from "Book a Strategy Call" to a "Meeting booked: [time] · [Meet link]" state once a booking exists for the session.
4. The admin prospect record shows the booked meeting prominently (with reschedule/cancel affordance) AND surfaces the quote: scope, estimate, ROI math, AI research highlights, link to the full transcript.
5. Activity log replaces flat enumeration with verb-only rows: "Started new quote", "Phone verified", "Booked meeting at 10am PT 4/29 — meet.google.com/xxx", "Walkaway risk flagged", "Quote abandoned".
6. `Continue to SOW` button stops returning "Quote session not found".
7. The booking primitives (`bookings` table, slot generator, calendar-event helper) are reusable by a future `/book` public page so the Google Appointment Schedules link can be retired.

## Non-goals

- No Google Workspace migration (you confirmed: would lose the Google Voice number, do not pursue).
- No multi-host booking. Every meeting is on `demandsignals@gmail.com`. When you eventually add hosts, the `bookings.host_email` column makes that a one-line change.
- No SMS confirmation in this build (Twilio fan-out for booking SMS is a follow-up — the structured `bookings` row will make adding it trivial later).
- No public `/book` page in this build, but every primitive is designed to be reused. Out-of-scope: the public page UI itself.
- No replacement of `trigger_handoff`. The handoff path stays for non-bookable hot signals (urgency questions, $10K+ unbooked sessions). Booking is a *separate* tool that fires AFTER the AI offers the two slots and the prospect picks one.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│ One-time admin setup (no-op for end users)                           │
│                                                                      │
│  /admin/integrations/google                                          │
│    ↓ "Connect Calendar"                                              │
│  Google OAuth (DSIG Main client) — scope=calendar.events             │
│    ↓ callback                                                        │
│  /api/integrations/google/callback                                   │
│    ↓ stores refresh_token in `integrations.google_calendar`          │
│  Done — admin never logs in again unless token is revoked            │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ Quote booking flow (per prospect)                                    │
│                                                                      │
│  Prospect ready to book                                              │
│    ↓                                                                 │
│  AI: "what's the best email to send the invite to?"  ← NEW STEP     │
│    ↓                                                                 │
│  AI calls offer_meeting_slots() tool                                 │
│    → server queries Calendar freebusy API                            │
│    → returns 2 available slots (tomorrow + day-after, 30-min)        │
│    ↓                                                                 │
│  AI: "works tomorrow at 10am PT or day after at 3pm PT?"            │
│    ↓                                                                 │
│  Prospect picks one in chat                                          │
│    ↓                                                                 │
│  AI calls book_meeting(slot_id, prospect_email)                      │
│    → server creates Calendar event with Meet link                    │
│    → sends invite to prospect_email                                  │
│    → inserts `bookings` row                                          │
│    → updates quote_sessions.booking_id                               │
│    → logs "Booked meeting" activity                                  │
│    ↓                                                                 │
│  AI: "You're locked in for tomorrow 10am PT. I sent the calendar    │
│       invite to steve@... — meet.google.com/abc-defg-hij"           │
│    ↓                                                                 │
│  Right-pane CTA flips to "Meeting booked" state                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Database — migration `035_bookings_and_integrations.sql`

```sql
-- Stores OAuth tokens for service-account-style integrations the platform
-- holds on behalf of demandsignals@gmail.com. Single-row design today
-- (one calendar = the owner's). Extensible to multi-host later via
-- (provider, account_email) compound key.
CREATE TABLE integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,                    -- 'google_calendar' for now
  account_email text NOT NULL,               -- 'demandsignals@gmail.com'
  scopes text[] NOT NULL,                    -- ['https://www.googleapis.com/auth/calendar.events', ...]
  access_token text,                         -- short-lived; refreshed on demand
  access_token_expires_at timestamptz,
  refresh_token text NOT NULL,               -- long-lived; opaque to app
  metadata jsonb DEFAULT '{}'::jsonb,        -- name, picture, etc., from id_token
  connected_at timestamptz NOT NULL DEFAULT now(),
  connected_by uuid REFERENCES admin_users(id),
  revoked_at timestamptz,
  UNIQUE(provider, account_email)
);

-- One row per booked meeting. Reusable by quote flow today and public
-- /book page later. host_email left flexible even though today every
-- row is demandsignals@gmail.com.
CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Source attribution
  source text NOT NULL,                      -- 'quote' | 'public_book' | 'admin_manual'
  quote_session_id uuid REFERENCES quote_sessions(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  -- Calendar state
  host_email text NOT NULL,                  -- 'demandsignals@gmail.com'
  attendee_email text NOT NULL,              -- prospect's email
  attendee_name text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Los_Angeles',
  -- Google Calendar artifacts
  google_event_id text NOT NULL,             -- Calendar API event id
  google_meet_link text,                     -- conferenceData.entryPoints[].uri
  google_meet_id text,                       -- e.g. abc-defg-hij
  -- Lifecycle
  status text NOT NULL DEFAULT 'confirmed',  -- 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  cancelled_at timestamptz,
  cancelled_by text,                         -- 'prospect' | 'admin' | 'system'
  cancel_reason text,
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_quote_session ON bookings(quote_session_id) WHERE quote_session_id IS NOT NULL;
CREATE INDEX idx_bookings_prospect ON bookings(prospect_id) WHERE prospect_id IS NOT NULL;
CREATE INDEX idx_bookings_start_at ON bookings(start_at);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Quick-access pointer from a quote_session to its (single) booking.
ALTER TABLE quote_sessions
  ADD COLUMN booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  ADD COLUMN attendee_email text;            -- captured during quote, used as default
```

### 2. Module — `src/lib/google-oauth.ts`

Owns the OAuth dance + access-token refresh.

```ts
export async function getAuthorizationUrl(state: string): Promise<string>
// Builds the consent URL with scope=https://www.googleapis.com/auth/calendar.events
// + access_type=offline + prompt=consent (forces refresh_token return).

export async function exchangeCodeForTokens(code: string): Promise<TokenSet>
// POST to https://oauth2.googleapis.com/token, returns access_token + refresh_token
// + id_token. Decoded id_token gives us account_email + name + picture.

export async function getValidAccessToken(integrationId: string): Promise<string>
// Reads integrations row. If access_token still valid (>60s remaining), returns it.
// Otherwise POSTs grant_type=refresh_token, updates integrations row, returns new token.
// Caches in-memory per request to avoid DB round-trips.

export async function revokeIntegration(integrationId: string): Promise<void>
// POSTs to https://oauth2.googleapis.com/revoke + sets revoked_at on the row.
// Called by /admin/integrations/google "Disconnect" button.
```

### 3. Module — `src/lib/google-calendar.ts`

Thin wrapper around Calendar API v3. Pure functions, no DB writes — caller persists results.

```ts
export interface AvailableSlot {
  id: string                    // opaque token signed with HMAC; stable across the AI turn
  start_at: string              // ISO with TZ
  end_at: string                // start + duration_minutes
  display_label: string         // "Tomorrow 10:00 AM PT"
}

export async function getAvailableSlots(opts: {
  duration_minutes: number      // 30 default
  timezone: string              // 'America/Los_Angeles'
  count: number                 // 2 default — matches AI's "two-slot" pattern
  earliest_hours_ahead: number  // 18 — don't offer same-day-soon slots
  business_hours: { start: string; end: string } // '09:00' — '17:00' PT
  weekdays_only: boolean        // true
}): Promise<AvailableSlot[]>
// 1. Calls Calendar freebusy API for demandsignals@gmail.com over next 14 days.
// 2. Walks the day-by-day grid with 30-min increments.
// 3. Returns first `count` slots that don't conflict and pass business-hours filter.
// 4. Each slot's id is HMAC(start_at + secret) so book_meeting can verify the
//    AI didn't fabricate a slot.

export async function createMeetingEvent(opts: {
  start_at: string              // ISO
  end_at: string                // ISO
  attendee_email: string
  attendee_name?: string
  summary: string               // "Demand Signals — Steve / Demand Signals — strategy call"
  description: string           // Full quote context: scope, estimate, transcript link
}): Promise<{
  event_id: string
  meet_link: string
  meet_id: string
}>
// POST to /calendar/v3/calendars/primary/events?conferenceDataVersion=1
// with conferenceData.createRequest = { requestId: <uuid>, conferenceSolutionKey: { type: 'hangoutsMeet' } }
// + attendees:[{email}] + sendUpdates='all' (Google emails the invite).

export async function cancelMeetingEvent(event_id: string, reason?: string): Promise<void>
// DELETE /calendar/v3/calendars/primary/events/{event_id}?sendUpdates=all
// Or PATCH status=cancelled if we want to keep the row visible. Use DELETE
// because cancelled events still emit notifications.

export async function rescheduleMeetingEvent(opts: {
  event_id: string
  start_at: string
  end_at: string
}): Promise<void>
// PATCH /calendar/v3/calendars/primary/events/{event_id}?sendUpdates=all
```

### 4. Module — `src/lib/bookings.ts`

The public API used by quote-tools, the future /book page, and admin reschedule.

```ts
export async function listAvailableSlots(opts?: { count?: number; durationMinutes?: number }): Promise<AvailableSlot[]>
// Wrapper around getAvailableSlots with sensible defaults.

export async function bookSlot(opts: {
  slot_id: string
  start_at: string
  end_at: string
  attendee_email: string
  attendee_name?: string
  source: 'quote' | 'public_book' | 'admin_manual'
  quote_session_id?: string
  prospect_id?: string
  context_for_summary?: string  // "Strategy call with Steve / Demand Signals"
  context_for_description?: string
}): Promise<{ booking_id: string; meet_link: string }>
// 1. Verify slot_id HMAC matches start_at — reject if forged.
// 2. Verify slot is still free via getAvailableSlots — race window is small.
// 3. createMeetingEvent → google_event_id + meet_link.
// 4. INSERT bookings row.
// 5. If quote_session_id, UPDATE quote_sessions SET booking_id, attendee_email.
// 6. Return.
//
// On failure between steps 3-5: best-effort rollback (cancelMeetingEvent if the
// event was created but DB insert failed). Logs failures; doesn't throw past
// step 1-2 if Google API is down — returns a typed error so the AI can
// gracefully say "couldn't reach the calendar, please try in a minute."

export async function cancelBooking(opts: {
  booking_id: string
  reason?: string
  cancelled_by: 'prospect' | 'admin' | 'system'
}): Promise<void>

export async function rescheduleBooking(opts: {
  booking_id: string
  new_slot_id: string
  new_start_at: string
  new_end_at: string
}): Promise<void>
```

### 5. Quote AI tools — additions to `src/lib/quote-ai.ts` + `src/lib/quote-tools.ts`

Three new tools added to the AI's toolkit:

```
capture_attendee_email(email: string)
  Validates email format; persists to quote_sessions.attendee_email.
  Returns ok=true on success.
  AI is told: ALWAYS call this before offer_meeting_slots, in a separate turn.

offer_meeting_slots()
  Calls listAvailableSlots(count=2). Persists the returned slot ids on
  quote_sessions.offered_slot_ids (jsonb) so book_meeting can validate
  the picked slot id even if a network blip drops the AI's memory.
  Returns the two slots with display labels for the AI to weave into prose.

book_meeting(slot_id: string)
  Validates slot_id is one of the offered ids. Calls bookSlot() with
  attendee_email from session, source='quote'. On success, returns
  { booked: true, start_at, meet_link }. AI's next reply MUST contain
  the actual time and meet link.
```

System-prompt directives are added in the existing handoff/booking section
of `quote-ai.ts:830-1100` (the section that today says "trigger_handoff with
reason describing the signal"):

> When the prospect is ready to book a strategy call:
>   1. If you don't have their email, ask: "what's the best email to send
>      the calendar invite to?" Call capture_attendee_email when given.
>   2. Call offer_meeting_slots silently (no message to the prospect).
>      The tool returns 2 slots with display labels.
>   3. In your reply, naturally offer both slots: "works for you {slot 1}
>      or {slot 2}?"
>   4. When the prospect picks one, call book_meeting with that slot's id.
>   5. On book_meeting success, your closing message MUST include the
>      booked time and the meet link from the tool result. Never claim a
>      meeting is booked if book_meeting returned an error.
>
> The legacy trigger_handoff tool is still available for non-booking hot
> signals (urgency questions before the prospect is ready to commit, $10K+
> sessions). For actual scheduling, use the booking tools above.

### 6. Admin — `/admin/integrations/google`

New page. Single component. Shows connection state:

- **Not connected** → "Connect demandsignals@gmail.com Calendar" button → starts OAuth
- **Connected** → "Connected as demandsignals@gmail.com since Apr 29, 2026 · Disconnect" + a "Test calendar access" button that creates and immediately deletes a 1-minute test event (proves the token works end-to-end)
- **Token expired or revoked** → red banner + Reconnect button

Wired into the admin sidebar under ADMIN group.

API routes:
- `GET /api/integrations/google/start` — generates OAuth URL with state token, redirects
- `GET /api/integrations/google/callback` — exchanges code, persists row, redirects back to admin page
- `POST /api/integrations/google/test` — calls createMeetingEvent + cancelMeetingEvent on a 1-minute slot 5 minutes from now; returns ok/error
- `POST /api/integrations/google/disconnect` — revokes token + flags row

### 7. Quote `/quote` UI — right-pane CTA state

Today: the right pane shows static CTAs ("Book a Strategy Call", "Start With a Free Research Report").

Change: when `quote_sessions.booking_id` is non-null on the polled-session response, replace the CTA card with a "Meeting confirmed" panel showing:
- Booked time in PT, formatted ("Tomorrow at 10:00 AM PT")
- "Add to calendar" link → uses the meet link
- Attendee email (so prospect knows where the invite was sent)
- Small "Need to reschedule? Reply in chat" hint

This requires:
- Adding `booking_id`, `booking_start_at`, `booking_meet_link` to the chat response payload (in `chat/route.ts` near line 384-402).
- A new client component `MeetingConfirmedPanel.tsx` rendered conditionally in `/quote/page.tsx`.

### 8. Admin prospect record — quote surfacing + booking surfacing

Two additions to `src/app/admin/prospects/[id]/page.tsx`:

**A. New "Latest Quote" panel** — placed between the prospect header and the Documents section. Renders when prospect has any `quote_sessions` row. Shows for the most recent session:

- EST number + status badge
- Estimate range, monthly recurring range
- Scope summary
- ROI inputs (X leads/mo × $Y)
- AI research highlights: site_quality_score, google_rating, top 2 observations, top 2 suggested_adds
- Persona block: business_type, person_role, build_path
- Two buttons: "View full transcript" → /admin/quotes/[session_id], "Continue to SOW" → existing endpoint (after fix)

**B. New "Booked Meeting" inline card** — placed at the very top of the prospect detail layout when `prospects` has any booking row with `status='confirmed'` AND `start_at > now()`. Shows:

- Booked time (full date + time + timezone)
- Meet link (copyable)
- Attendee email
- "Reschedule" → opens modal with available slots
- "Cancel" → confirmation modal, fires `cancelBooking`
- "Mark complete" / "Mark no-show" buttons after start_at passes

**C. Add a `Quotes (EST)` sub-section to the existing `ProspectDocuments` component (line 1807)** — mirrors the SOWs/Invoices pattern. Lists all `quote_sessions` for the prospect with `doc_number` + status + estimate + created_at, click-through to `/admin/quotes/[session_id]`.

### 9. Activity log cleanup — `src/lib/quote-prospect-sync.ts`

Today, `syncProspectFromSession` writes one activity row per call. It's called on every trigger. We change to:

- **research_confirmed** → write activity "Started new quote" — but ONLY if no prior activity row for this session has `subject='Started new quote'`. (Cheap dedupe: SELECT before INSERT.)
- **phone_verified** → write "Phone verified"
- **email_captured** → write "Email captured" (with the email in the body — this IS useful info)
- **walkaway_flagged** → write "Walkaway risk flagged" with the AI's signal text in the body
- **conversion_action='book_call'** → DEPRECATED as an activity-row trigger. The `quote_sessions.conversion_action` column itself is still set (preserved for analytics + the existing prospect.stage='booked' transition), but the activity-row INSERT for this trigger is removed because `bookSlot()` writes the canonical "Booked meeting" activity row directly with the real meeting details (time, meet link). One row per booking, written from the source of truth.
- **item_changed** → DROP. No activity row. The configurator changes are visible in the quote_events log already; they don't belong in the prospect activity stream.

Activity body content: each row contains 1-3 short lines of context the human reading the prospect record cares about. No more 4-line metadata dumps.

`bookSlot()` writes its own activity:
> Subject: "Booked meeting"
> Body:
> ```
> Tomorrow at 10:00 AM PT (Apr 29)
> Attendee: steve@example.com
> Meet: https://meet.google.com/abc-defg-hij
> Source: /quote
> ```

### 10. Continue-to-SOW fix — `src/app/api/admin/quotes/[id]/continue-to-sow/route.ts`

Drop `scope_summary` from the SELECT (it doesn't exist on `quote_sessions`; it's on `prospects`). The route already loads the prospect later — read scope_summary from there if needed. Actually scope_summary isn't even used in the route — pure dead reference. One-line fix.

### 11. Reusability for future `/book` public page

Every primitive in the design is wrapped at the right boundary:

- `bookings.source = 'public_book'` is already a valid value
- `bookSlot()` is the single entry point — public page calls it the same way the quote AI does
- `getAvailableSlots()` is the single source of truth for what's bookable
- `MeetingConfirmedPanel` is reusable for the public flow's confirmation page

What the public page would need on top of this build (not in scope here):
- Public route `/book` (no admin auth)
- A non-AI form UI for slot selection
- CAPTCHA + rate limiting (`/book` is unauthenticated, attack surface bigger than `/quote`)
- A small "what kind of conversation" form to populate `bookings.context_for_summary`

Total new work to add `/book` later: ~half a day, building on this foundation.

## Error handling

| Failure | Behavior |
|---|---|
| Google OAuth disconnected/revoked when AI tries to book | book_meeting tool returns `{ ok:false, reason:'calendar_disconnected' }`. AI says: "I'm having trouble reaching the calendar right now. The team will follow up by email shortly." Admin gets an alert email. |
| Slot becomes unavailable between offer and book (race) | book_meeting calls listAvailableSlots again to confirm; if conflict, returns `{ ok:false, reason:'slot_taken' }`. AI re-fetches and offers two new slots. |
| Calendar API 5xx | bookSlot retries once with 500ms backoff. If still failing, returns error. AI graceful fallback. |
| Calendar event created but DB insert fails | Caught, calendar event deleted (compensating rollback), error returned. |
| Prospect email invalid format | capture_attendee_email returns `{ ok:false, reason:'invalid_email' }` — AI re-asks. |
| Token expired mid-call | getValidAccessToken silently refreshes; transparent to caller. |
| Refresh token revoked | Marks integration as revoked, alerts admin, all subsequent booking attempts return calendar_disconnected. |

## Privacy / security

- **Refresh token at rest:** stored in `integrations.refresh_token` plaintext. Acceptable today (RLS gates the table to service_role only; no anon access). For Stage D, encrypt with `ATTRIBUTION_COOKIE_SECRET` or a dedicated KMS key.
- **Slot id integrity:** AI-supplied slot ids are HMAC-signed against a server secret (`BOOKING_SLOT_SECRET` env var). book_meeting verifies the HMAC before booking — prevents prompt injection from booking arbitrary times.
- **Email validation:** capture_attendee_email runs basic regex + checks for MX record async (best-effort, not blocking). Doesn't expose whether email exists.
- **Calendar API scope:** only `calendar.events` (create/read/update events on primary calendar). NOT `calendar` (full read of all calendars). Minimum viable scope.
- **Rate limiting:** per-session offer_meeting_slots is capped at 6 calls per session (AI shouldn't loop). Per-IP cap on the public `/book` endpoint when that ships — not needed in this build since `/quote` already has session-bound rate limits.
- **Cancellation auth:** prospect-side cancellation isn't built in this round. Cancel/reschedule is admin-only via the prospect-record booking card. The Google invite email contains the standard Google "decline" link which the prospect can use — that updates the event on Google's side but does NOT update our `bookings.status` (no Calendar webhook in this build). Result: a "soft drift" where Google says cancelled but the platform still says confirmed until admin notices. Acceptable for v1 because admin reviews the prospect record before the meeting anyway. Calendar webhook sync is in Out of Scope below.

## Testing

Manual end-to-end test plan (post-deploy):

1. **Connect calendar:** Open `/admin/integrations/google` → click Connect → complete OAuth → confirm "Connected as demandsignals@gmail.com" appears.
2. **Test event:** Click "Test calendar access" → confirm green "ok" → confirm a 1-minute test event briefly appears + disappears in Google Calendar.
3. **Existing-client booking:** From incognito, run a /quote flow as Mobile Mechanic Dan to the booking turn. AI asks for email, then offers two slots, then books. Confirm:
   - Calendar event exists on demandsignals@gmail.com at the picked time
   - Meet link works
   - Prospect email received an invite
   - quote_sessions.booking_id non-null
   - bookings row exists with status='confirmed'
   - Admin prospect record shows the meeting card at the top
   - Activity log shows "Booked meeting" with details, no "Quote scope updated" noise
4. **Continue to SOW:** From `/admin/quotes/[id]`, click Continue to SOW — confirm SOW page loads (no "Quote session not found").
5. **Right-pane CTA flip:** During the booking flow, after book_meeting fires, confirm the right-pane CTA in `/quote` shows the "Meeting confirmed" panel with time + Meet link.
6. **Cancel booking:** From admin prospect record, click Cancel on the booking card → confirm Calendar event deleted, prospect gets cancellation email, status='cancelled'.

Verification script `scripts/verify-booking-roundtrip.mjs` (post-deploy):
- Creates a synthetic test booking via direct `bookSlot()` call (no AI, no quote)
- Asserts row exists, calendar event exists, meet link valid
- Cancels via `cancelBooking()`
- Asserts calendar event deleted
- Cleans up DB row

## Files touched

| File | Change |
|---|---|
| `supabase/migrations/035_bookings_and_integrations.sql` | NEW — integrations + bookings tables |
| `src/lib/google-oauth.ts` | NEW — OAuth dance + token refresh |
| `src/lib/google-calendar.ts` | NEW — Calendar API wrapper |
| `src/lib/bookings.ts` | NEW — public bookSlot/cancel/reschedule API |
| `src/lib/slot-signing.ts` | NEW — HMAC-sign and verify slot ids |
| `src/lib/quote-tools.ts` | Add capture_attendee_email, offer_meeting_slots, book_meeting handlers |
| `src/lib/quote-ai.ts` | Add tool defs + system-prompt directive for booking flow |
| `src/lib/quote-prospect-sync.ts` | Drop item_changed activity write; refine other subjects/bodies |
| `src/lib/quote-session.ts` | Extend QuoteSessionRow with booking_id, attendee_email, offered_slot_ids |
| `src/app/api/integrations/google/start/route.ts` | NEW |
| `src/app/api/integrations/google/callback/route.ts` | NEW |
| `src/app/api/integrations/google/test/route.ts` | NEW |
| `src/app/api/integrations/google/disconnect/route.ts` | NEW |
| `src/app/admin/integrations/google/page.tsx` | NEW — admin connection UI |
| `src/components/admin/admin-sidebar.tsx` | Add Integrations link under ADMIN group |
| `src/app/api/quote/chat/route.ts` | Include booking fields in response payload |
| `src/app/quote/page.tsx` | Render MeetingConfirmedPanel when booking_id present |
| `src/components/quote/MeetingConfirmedPanel.tsx` | NEW |
| `src/app/admin/prospects/[id]/page.tsx` | Add LatestQuotePanel + BookingCard; extend ProspectDocuments with Quotes (EST) section |
| `src/components/admin/BookingCard.tsx` | NEW — reusable booking card with reschedule/cancel |
| `src/components/admin/RescheduleModal.tsx` | NEW |
| `src/components/admin/LatestQuotePanel.tsx` | NEW |
| `src/app/api/admin/bookings/[id]/cancel/route.ts` | NEW |
| `src/app/api/admin/bookings/[id]/reschedule/route.ts` | NEW |
| `src/app/api/admin/quotes/[id]/continue-to-sow/route.ts` | Drop bad column from SELECT |
| `scripts/verify-booking-roundtrip.mjs` | NEW |

Estimated work: 1.5–2 days.

## Required env vars (new)

```bash
GOOGLE_CLIENT_ID=<existing — DSIG Main>
GOOGLE_CLIENT_SECRET=<existing — DSIG Main>
GOOGLE_OAUTH_REDIRECT_URI=https://demandsignals.co/api/integrations/google/callback
BOOKING_SLOT_SECRET=<new random 32-byte hex — for HMAC-signing slot ids>
```

## Required GCP setup

- [x] Authorized redirect URI added: `https://demandsignals.co/api/integrations/google/callback` (you confirmed)
- [ ] Verify Google Calendar API is enabled (29 APIs already enabled — almost certainly yes; confirm during implementation)
- [ ] Verify OAuth consent screen state allows `calendar.events` scope for `demandsignals@gmail.com` self-authorization (test users mode is fine since demandsignals@gmail.com is the only user)

## Out of scope (deferred)

- Public `/book` page replacing the Google Appointment Schedules link. Foundation laid; UI is a separate spec.
- Prospect-facing reschedule/cancel UI. Today, prospects use the standard Google invite "decline" link in the email; admin handles in-platform reschedules. Add prospect-facing reschedule when `/book` page ships.
- SMS confirmation of booked meetings via Twilio. Trivial follow-up once the `bookings` row exists.
- Calendar webhook to sync external changes (prospect declines via Google, admin moves event in Calendar UI). Adds drift detection. Skip until v2.
- Multi-host booking ("book with Hunter or Tiffany"). `bookings.host_email` makes this a one-line addition when the team grows.
- Outlook / Apple Calendar support. Out of scope; we control demandsignals@gmail.com.
