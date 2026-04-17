# Stage C — Build Plan

**Status:** ready to start
**Last updated:** 2026-04-17 late evening, after v1.13 shipped (commit `3e287b2`)
**Prereq:** all Stage A + Stage B migrations applied. See `MEMORY.md` for list.

> Stage A + Stage B + 13 conversation-tuning passes are DONE. The `/quote`
> flow is live at https://dsig.demandsignals.dev/quote and handling real
> prospects (Creekside Endodontics, Dobler Urbano, McHale Packs, One Body,
> Alpha Athletic, El Dorado Hills Dental, Dynamisoft, Steve's Gardening
> tested with increasingly refined results).
>
> Stage C is the "spine that makes the AI conversations land as closed deals."
> Seven items, ordered by leverage.

---

## Why these items and why this order

The v1.11 testing session surfaced the real gap: we're capturing great
prospects but have no formal way to close them. Hunter gets an email, books
a call manually, writes a scope in a doc somewhere, invoices through QuickBooks
or similar. Stage C eliminates every manual step.

**Highest leverage first = earlier in the list.**

1. **Invoicing + admin UI** — delivers the $0 Restaurant Rule research invoices
   that were central to the spec. Turns "Email Me The Plan" into a real
   PDF invoice, not just a casual email.
2. **Admin estimate builder** — post-call revisions + bidirectional scope
   edits. Lets Hunter refine after a strategy call and resend.
3. **Bid system UI** — depends on (1) + (2). Makes the "Name Your Price"
   day-45 SMS meaningful by giving admin an accept/counter/decline flow.
4. **SOW auto-generation** — the output of accepted estimates. PDF with
   scope, timeline, payment terms, guarantees.
5. **Live-handoff backend** — parallel workstream. Realtime subscriptions
   + 60-second team-ping window. The AI already captures the intent
   (`trigger_handoff`), this completes the loop.
6. **Google Calendar API** — replaces Hunter's manual booking with actual
   API writes. Uses existing `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`
   creds; adds `calendar.events` scope.
7. **OAuth Checkpoint 2** — Google OAuth for prospect-side client portal.
   Lets prospects log back in and see their full project status.
8. **A2P 10DLC Marketing campaign** — unblocks cadence SMS (`cadence_enabled`
   config flag currently `false`). Registration process outside DSIG's
   control; track via Twilio console.

---

## Item 1 — Invoicing system

**Tables already exist** (Stage A migration): `invoices`, `invoice_line_items`.
Both are RLS-gated to admin only.

**What's needed:**

### 1a. Generate invoice from session (admin action)

New endpoint `POST /api/admin/invoices/from-session`:
- Input: `{ quote_session_id, line_items[] }` where line_items can be:
  - `{ catalog_item_id, quantity, discount_pct }` — pulls price from catalog
  - `{ description, unit_price_cents, quantity, discount_pct }` — custom line
- Creates invoice with `generate_invoice_number()` (DSIG-YYYY-NNNN)
- Links `prospect_id` and `quote_session_id`
- Returns new invoice ID

### 1b. $0 research invoices (Restaurant Rule)

Specific flow: prospect clicks "Start With Research" on quote page →
phone verified → email captured → admin clicks "Send research invoice" in
`/admin/quotes/[id]` → system:
- Creates invoice with Market Research / Competitor Analysis / Site & Social
  Audit line items at full price (e.g., $500 "Competitor Analysis")
- Applies 100% discount line
- Total = $0
- Generates PDF
- Emails PDF to prospect (via SMTP)
- Status becomes `sent`

### 1c. Admin UI — `/admin/invoices`

- Table of all invoices: number, client, amount, status, date
- Filter by status, date range, prospect
- Row click → detail page with full line items + send/void/duplicate actions
- Status transitions: draft → sent → viewed → paid → void

### 1d. Client-facing `/invoice/[invoice_number]`

- Public URL (no auth) — only discoverable by exact invoice number
- Or authenticated via magic link emailed at send time
- Shows clean branded PDF-style layout
- "Download PDF" button (client-side PDF gen via `pdf-lib` or `react-pdf`)
- "Questions?" → email form routed to team
- Tracks `viewed_at` on first page load
- Payment integration deferred to Stage D (Stripe)

### 1e. PDF generation

Library options:
- `pdf-lib` — programmatic, small bundle, works in Vercel edge
- `@react-pdf/renderer` — React components → PDF, larger bundle but ergonomic
- HTML + Puppeteer — server-heavy, avoid on Vercel

**Recommendation:** `@react-pdf/renderer` for the receipt PDF since the layout
is static and React-friendly. Output stream on-demand from `GET /api/invoices/[number]/pdf`.

---

## Item 2 — Admin estimate builder

New route: `/admin/quotes/new`.

Same configurator UI as `/quote` but:
- Admin-driven (authenticated via `requireAdmin`)
- Creates `quote_sessions` row with `source='admin_builder'`
- Prospect assignment dropdown — pick existing prospect OR create new
- All the same items, categories, narrowing factors
- "Save as draft" + "Send to prospect" buttons
- On send: generates share URL, emails/texts prospect with the link
- Prospect clicks link → `/quote/s/[token]` (already built — the shareable
  page with 4 CTAs)

Also: `/admin/quotes/[id]/revise` — in-place editor for existing sessions.
Admin edits scope → clicks "Send revised estimate" → prospect gets an
updated share link. Versioning via `quote_events` entries with `event_type`
= `admin_revised`.

---

## Item 3 — Bid system UI

Tables: `quote_bids` (exists, Stage A).

**Admin flow on incoming bid:**
1. Prospect bids via Day 45 "Name Your Price" SMS (Stage C prerequisite:
   A2P Marketing campaign). Until A2P lands, bids arrive via `/admin/quotes/[id]`
   manual entry.
2. Admin sees bid on `/admin/quotes/[id]` — new "Bids" tab shows amount +
   optional notes + timestamp.
3. Three actions:
   - **Accept** — status → `accepted`, auto-texts/emails prospect, triggers
     invoice creation for the bid amount with the original scope.
   - **Counter with reduced scope** — opens scope editor (drag items from
     "Included" to "Phase 2" column), calculates new total, creates new
     bid row with `parent_bid_id` set, sends counter-offer via URL.
   - **Decline** — status → `declined`, AI-suggested alternative ("free
     competitor analysis instead?"), event logged.

### Counter-offer scope adjuster

Two columns:
- Left: "Included in this bid" — items from original scope that remain
- Right: "Phase 2 (not in this bid)" — items moved out to fit the budget

Dragging items between columns recomputes estimated range in real time.
Must honor `requiresBase` + `excludes` rules from catalog (don't let
admin remove website but keep long-tail-pages that depend on it).

---

## Item 4 — SOW auto-generation

Triggers: when an estimate is accepted (CTA click, bid acceptance, or admin
marks it "won").

**SOW is built from:**
- Selected configurator items → Scope & Deliverables section
- Ranges (now narrowed to final agreed numbers) → Pricing
- Timeline estimates → Timeline section
- Payment preference → Payment Terms section
- Risk reversal copy → Satisfaction Guarantee section
- Business name + prospect contact → Client Information section
- JAMS arbitration boilerplate (pulled from `/terms` page)

**Delivery:**
- PDF via same `@react-pdf/renderer` setup
- Client portal (`/portal/[token]` — Stage C item 7) displays it
- First invoice created alongside (Phase 1 deliverables + 25% deposit)

**The SOW IS the first real paid invoice** per spec Section 21.

---

## Item 5 — Live handoff backend

**Current state:** `trigger_handoff` tool logs an event + fires email alert
to Hunter via `alertFromSession()`. Nothing real-time yet.

**What's needed:**

### 5a. Realtime subscription

Supabase Realtime subscription on `quote_sessions` where
`handoff_offered = true` AND `handoff_accepted = false`. Admin dashboard
shows these as a "Live Queue" widget.

### 5b. 60-second team-ping window

When `trigger_handoff` fires:
1. Record `handoff_offered_at = now()`.
2. Email alert includes "REPLY YES TO ACCEPT" link: `/admin/handoff/accept/[session_id]`.
3. Admin clicks link → updates `handoff_accepted = true`, `handoff_agent = <admin_user_id>`.
4. Meanwhile the client polls `/api/quote/session` every 5s (or uses realtime)
   watching for `handoff_accepted` flip.
5. When flipped: AI's next turn gets system context "Admin [name] joined
   live — transition the conversation."
6. AI says "Connecting you with [name] from our team..."
7. From then on, admin types in `/admin/quotes/[id]/chat` → messages
   post as `role='human_agent'` with `agent_user_id` set.
8. Prospect sees messages from admin identified as a real person.

### 5c. Prospect-side unobtrusive poll

Client polls session status every 3-5s while `handoff_offered && !handoff_accepted`.
Stops polling after 60s. If timeout, AI continues as normal — prospect
never knows a ping was sent and nobody grabbed it.

### 5d. Admin "Join Chat" button

On `/admin/quotes/[id]`, if session is active (last 10 min) AND
`handoff_offered`, show a prominent green "Join Chat Live" button.
Click → takes admin into the conversation as a typing human.

---

## Item 6 — Google Calendar API

**Current state:** `trigger_handoff` captures picked slot in `reason` field.
Email to Hunter. Hunter books manually in GCal (~10s).

**Goal:** when prospect picks a Sandler slot, event fires to API automatically.

### Prereqs
- Enable Google Calendar API on existing GCloud project (same project as
  Places API)
- Add `https://www.googleapis.com/auth/calendar.events` scope to existing
  OAuth consent
- One-time Hunter authorization — writes refresh token to Supabase secure storage
- Admin UI for rotating which calendar events get written to

### Flow
1. Prospect picks PRIMARY_SLOT_A ("Monday 10am PT").
2. `trigger_handoff` fires with `picked_slot` field.
3. Post-trigger: backend resolves PRIMARY_SLOT_A text to actual date (next
   Monday 10am in `America/Los_Angeles`).
4. Creates Google Calendar event:
   - Title: "DSIG Strategy Call — [Business Name]"
   - Description: scope summary + share URL + prospect contact
   - Attendees: prospect email (if captured), `DemandSignals@gmail.com`,
     Hunter's email
   - Duration: 30 min
   - Video: auto-generated Google Meet link
5. Invite auto-emails prospect (Calendar API native behavior).
6. AI replies: "Locked in [slot]. Calendar invite on its way."

### Availability check (optional, Stage D)

Query `freebusy.query` on Hunter's calendar for the coming 5 business days.
AI only offers slots that are actually free. Falls back to "or tell me what
works" if no primary slots are available.

---

## Item 7 — OAuth Checkpoint 2 + client portal

**What it is:** prospect signs in with Google at any point (usually during or
after the estimate conversation) → their quote_session links to a persistent
account. Can return to view estimates, invoices, project status, SOW.

### Tables
- `quote_sessions.oauth_provider`, `oauth_email`, `oauth_name`, `oauth_avatar`,
  `oauth_at` already exist (Stage A).
- New: `client_portals` table (or reuse `prospects`) with permission bits.

### Flow
1. Prospect clicks "Save to my account" during or after chat.
2. Redirects to Google OAuth consent.
3. On return: link session's `oauth_email` to the prospect record.
4. If prospect returns later (different device, etc.), `oauth_email` match
   pulls them into their existing prospect/estimates.

### Portal pages
- `/portal` — prospect's home. List of active quotes, invoices, project status.
- `/portal/estimates/[id]` — live estimate (same as `/quote/s/[token]` but
  logged-in version with full edit power).
- `/portal/invoices/[number]` — authenticated version of invoice view.
- `/portal/project` — post-accept project status (milestones, deliverables).

Most of this is Stage D-ish but the OAuth sign-in + estimate linking is
the Stage C piece.

---

## Item 8 — A2P 10DLC Marketing campaign

**Prereq blocker:** Hunter needs to submit Marketing use case to Twilio.
Existing 2FA approval covers phone verification only. Cadence SMS (Day
1/3/7/14/30/45) requires Marketing.

**Timeline:** 1-3 weeks for Twilio approval, sometimes longer.

**Until approved:**
- `quote_config.cadence_enabled = false` (currently).
- Nothing sends outbound marketing SMS.
- Magic link after phone verify is URL-only (no SMS).

**After approved:**
- Flip `cadence_enabled = true`.
- Cron job runs daily, finds sessions that entered each touch window,
  sends the scheduled SMS per spec Section 8.
- Spec templates already defined.

---

## Out-of-scope for Stage C (pushed to D)

- Payment processing (Stripe integration)
- A/B testing framework
- Behavioral analytics layer (scroll depth, hover, heatmaps — spec Section 21)
- Full re-engagement engine (90/180/365 day)
- Quote versioning UI
- Social proof library management
- Competitor site quick-scan (beyond current research subagent)
- Seasonal / contextual nudges
- Referral bonus program

---

## When you start Stage C (next session)

1. Read CLAUDE.md (always)
2. Read this file
3. Read MEMORY.md for current state
4. Read docs/runbooks/quote-estimator.md for operational baseline
5. Verify system is green:
   ```bash
   cd D:/CLAUDE/demandsignals-next
   node scripts/test-quote-rls.mjs     # 25/25
   npx tsx scripts/check-catalog.mjs   # all pass
   npx tsx tests/quote-ai-evals.mjs    # 38/38
   npx tsc --noEmit                    # clean
   ```
6. Confirm with Hunter on Stage C ordering (proposed: items 1-4 first, 5 in
   parallel, 6-8 later).
7. Start with item 1 (invoicing system) unless Hunter says otherwise.

---

## Hand-off notes

- Commit `3e287b2` is the clean head for Stage B + all conversation tuning.
- No known critical bugs.
- Staging deployed and working. Real prospects can use `/quote` today.
- Stage C builds backend spine — prospect-facing flow doesn't break or
  need changes during Stage C work (unless explicitly called out).
- When in doubt, MEMORY.md "Known behaviors" and "Known bugs" sections are
  current.
