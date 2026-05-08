# Prospect/Client Lifecycle Views

**Date:** 2026-05-08
**Status:** v1 LOCKED → ready for implementation

## Problem

`prospects` is the canonical entity from zero-day forward. Every quote, booking, SOW, project, invoice, subscription, page visit, email engagement event, and activity row keys off `prospects.id`. When a prospect closes, `is_client` flips to `true` and `became_client_at` stamps. Same row, lifecycle stage advanced.

The data model is correct. The admin UI does not reflect it.

Today on `demandsignals.co/admin`:
- The "Manage Clients" sidebar entry filters `is_client = true` and lists clients — but every row links to `/admin/prospects/<id>`.
- The detail page at `/admin/prospects/<id>` renders identical chrome regardless of stage: "Back to Prospects" header, prospect-tier scoring badge, prospect-emphasized panels (research, channels, scoring) above the document section.
- There is no `/admin/clients/<id>` route.
- No client-emphasized panel (active projects, MRR/subscriptions, outstanding invoices, recent receipts) exists; clients see the prospect view with quote/SOW/invoice tables glued on the bottom.
- The Promote/Demote button exists at parity with Edit/Profile.md in the action bar — visually invisible.
- Nav, breadcrumbs, and headers all collapse the lifecycle distinction the data model maintains.

We want partitioned views — same database, same row, same FKs — with a routing/header/panel-set that reflects which stage we're in.

## Goals

1. **`/admin/clients/<id>` exists as a real route**, redirecting to `/admin/prospects/<id>` if `is_client = false`. `/admin/prospects/<id>` redirects to `/admin/clients/<id>` if `is_client = true`. URL = current lifecycle stage. No bookmarks break (cross-redirects handle them).
2. **The detail page reads `is_client` once and switches presentation** — back link, header chip, action bar, panel order, sidebar context — without duplicating data fetches, edit forms, or component internals.
3. **The client view emphasizes operating data** (active projects, subscriptions/MRR, outstanding invoices, recent receipts, upcoming bookings) above acquisition data (research, scoring, channels) which collapses below as "Acquisition history."
4. **The prospect view is unchanged** in panel order. Only chrome (header chip, action bar) confirms it's the prospect stage.
5. **Conversion is more discoverable.** Promote becomes a primary action when `is_client = false`; Demote becomes a tertiary "..." menu action when `is_client = true` (rare, deliberate).
6. **Magic-link surfaces are not touched.** Document URLs, email sends, webhooks, Stripe pay flow, portal — all FK-driven, all unaffected.

## Non-goals

- **No new tables, no schema migration.** `prospects.is_client` + `became_client_at` already exist (project CLAUDE.md §10).
- **No client-portal change.** `/portal/*` is independent — already gates on `is_client = true` in the auth callback role resolver.
- **No data movement on conversion.** The Promote button continues to do `UPDATE prospects SET is_client=true, became_client_at=now() WHERE id=…` and that's it. SOW accept's automatic conversion path (project CLAUDE.md §10) is unchanged.
- **No demotion semantics changes.** Demote stays available, stays rare, stays manual. `became_client_at` is preserved on demote (audit trail).
- **No activity timeline rework in this spec.** The current activity-timeline component is acknowledged as "cryptic" but is its own focused project; this spec does not bundle it. The client view will show the existing component; the timeline rework is a separate spec.
- **No map fix in this spec.** Geocoding cache is its own focused project; same logic.
- **No PDF/email/webhook touches.** Magic-link infrastructure is keyed off `prospects.id` + document UUIDs, not `is_client` — verified by tracing the document email + webhook + Stripe paths during spec design.

**Locked decisions (per Hunter, 2026-05-08):**
- **One entity, lifecycle-stamped.** No `clients` table. No data duplication. `is_client` is a stage gate, mutually exclusive in *presentation*, not in storage.
- **Real `/admin/clients/<id>` route, not conditional UI on the prospect route.** URL semantics matter. The user noticed the URL specifically. We honor that.
- **Client view's panel order:** Status header → Active projects → Active subscriptions/MRR → Outstanding invoices + recent receipts → Upcoming booking → Documents (SOWs, invoices, EST archive) → Communications/activity timeline → Acquisition history (research/channels/ratings, collapsed). Demote action lives in a "..." menu, not the action bar.
- **Activity timeline rework is OUT of scope** for this spec. Bundled originally; pulled back to keep the change cohesive. Separate spec to follow.
- **Map cache is OUT of scope.** Same reason.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ Routing layer                                                       │
│                                                                     │
│   /admin/prospects/[id]  ──┐                                        │
│                            ├──► fetches prospect row                │
│   /admin/clients/[id]    ──┘    │                                   │
│                                 │                                   │
│                                 ▼                                   │
│                       ┌────────────────────────┐                    │
│                       │ if (is_client)         │                    │
│                       │   route is /clients?   │                    │
│                       │     render in place    │                    │
│                       │   route is /prospects? │                    │
│                       │     redirect /clients  │                    │
│                       │ else                   │                    │
│                       │   route is /prospects? │                    │
│                       │     render in place    │                    │
│                       │   route is /clients?   │                    │
│                       │     redirect /prospects│                    │
│                       └────────────────────────┘                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Layout layer (single shared shell)                                  │
│                                                                     │
│   <ProspectClientShell prospect={…} isClient={boolean}>             │
│     <Header>                                                        │
│       backLink  = isClient ? '/admin/clients' : '/admin/prospects'  │
│       backText  = isClient ? 'Back to Clients' : 'Back to Prospects'│
│       chip      = isClient ? <ClientStatusChip/> : <TierBadge/>     │
│       actions   = isClient ? <ClientActions/>   : <ProspectActions/>│
│     </Header>                                                       │
│                                                                     │
│     {isClient ? <ClientPanels/> : <ProspectPanels/>}                │
│                                                                     │
│     <SharedPanels>                                                  │
│       Contact, Channels, Documents, Activity, Notes                 │
│     </SharedPanels>                                                 │
│   </ProspectClientShell>                                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Data layer (UNCHANGED)                                              │
│                                                                     │
│   Same SELECT prospects.*                                           │
│   Same JOINs to projects, subscriptions, invoices, receipts,        │
│        sow_documents, quote_sessions, bookings, activities,         │
│        prospect_notes, page_visits, email_engagement                │
│   Same FK relationships                                             │
│   Same RLS                                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Components

### Routing

**`/admin/clients/[id]/page.tsx`** — new route file. Reads prospect row by id. If `is_client = false`, server-side redirect to `/admin/prospects/[id]`. Otherwise renders `<ProspectClientShell prospect={…} isClient={true}/>`.

**`/admin/prospects/[id]/page.tsx`** — existing route. Add the inverse redirect: if `is_client = true`, server-side redirect to `/admin/clients/[id]`. Render path otherwise unchanged in this commit; refactor to call `<ProspectClientShell prospect={…} isClient={false}/>` after extraction (see below).

**`/admin/clients/page.tsx`** — existing list page. Update row links to point at `/admin/clients/[id]` (not `/admin/prospects/[id]`).

**`/admin/portal-view-as/[id]`** (eye icon) — update target to `/admin/clients/[id]`. One-line edit. Behavior unchanged.

### Layout shell

**`src/components/admin/prospect-client-shell.tsx`** — new file. Pure presentation. Receives `{ prospect, isClient, ...allTheData }` and switches:
- Back link href + text
- Header chip component (`<TierBadge>` vs. `<ClientStatusChip>`)
- Action bar component (`<ProspectActionBar>` vs. `<ClientActionBar>`)
- Primary panel set component (`<ProspectPrimaryPanels>` vs. `<ClientPrimaryPanels>`)

Shared panels (Contact, Channels, Documents list, Communications/activity, Notes timeline, Map) render in both views. Position differs.

The existing `/admin/prospects/[id]/page.tsx` body is extracted into the shell; the route file becomes ~30 lines (auth + fetch + shell render).

### Header chip components

**`<TierBadge prospect={…}/>`** — already exists as `prospect-score-badge.tsx`. Diamond/Gold/Silver/Bronze tier. Used for prospects.

**`<ClientStatusChip prospect={…}/>`** — new. Shows: `CLIENT · since {fmt(became_client_at)} · {activeProjectsCount} active project(s) · ${MRR}/mo`. One line, read-only, slate background, teal accent.

### Action bars

**`<ProspectActionBar prospect={…}/>`** — wraps the existing button group. Promote becomes the visually-primary action (orange CTA-style), Research/Edit/Profile.md secondary. Demote is hidden when `is_client = false`.

**`<ClientActionBar prospect={…}/>`** — new arrangement:
- Primary (orange): **New SOW** (links to `/admin/sow/new?prospect_id=…`)
- Secondary: **New Invoice** (`/admin/invoices/new?prospect_id=…`)
- Secondary: **New Project** (`/admin/projects/new?prospect_id=…`)
- Secondary: **Open Portal as client** (sets `dsig_portal_view_as` cookie, opens `/portal`)
- Tertiary "..." menu: **Edit**, **Profile.md**, **Demote to prospect**

### Primary panel sets

**`<ProspectPrimaryPanels prospect={…}/>`** — preserves current order:
- Contact
- Channels
- Intelligence (scoring breakdown)
- (then shared panels — Map, Documents, Communications, Notes — at current positions)

**`<ClientPrimaryPanels prospect={…} relationships={…}/>`** — new order:
1. **Status header strip** — small numeric tiles: active projects, MRR (sum of `subscriptions.amount_cents` where `status='active'`), outstanding invoice balance (sum of `invoices.total_due_cents - paid_cents` where `status IN ('sent','partial')`), last contact (latest activity timestamp), upcoming meeting (if any).
2. **`<ActiveProjectsPanel>`** — list of `projects WHERE prospect_id = ? AND status = 'active'`. Each row: project name, current phase (with phase progress chip), monthly_value, deliverables-pending count. Click → `/admin/projects/[id]`.
3. **`<ActiveSubscriptionsPanel>`** — list of `subscriptions WHERE prospect_id = ? AND status IN ('active', 'paused')`. Each row: subscription name, amount/cycle, started_at, paused_until (if paused), end_date, MRR contribution. Click → `/admin/subscriptions/[id]`.
4. **`<OutstandingFinancePanel>`** — split into Outstanding (top — invoices with balance) and Recent receipts (bottom — last 5 RCT rows). Each row links to its detail page.
5. **`<UpcomingBookingPanel>`** — only renders if a future `bookings` row exists with `status='confirmed'`. Reuses existing `BookingCard` component. Hidden otherwise.
6. **Communications / activity timeline** — existing component, unchanged in this spec.
7. **Documents** — existing `<ProspectDocuments>` (quotes, SOWs, invoices) unchanged.
8. **Acquisition history** (collapsed by default, click to expand) — Channels, Intelligence/scoring, raw research notes, Map. The data the prospect view emphasizes is preserved but de-prioritized.

Collapsed-by-default uses `<details>` element, no JS state. Server-rendered.

### Data layer additions

The shell fetches the same prospect row plus, when `isClient = true`, these new SELECTs (parallel, in `Promise.all`):

```ts
// Active projects
supabase.from('projects')
  .select('id, name, status, phases, monthly_value_cents, updated_at')
  .eq('prospect_id', id)
  .eq('status', 'active')
  .order('updated_at', { ascending: false })

// Active/paused subscriptions
supabase.from('subscriptions')
  .select('id, name, amount_cents, cycle, status, started_at, paused_until, end_date')
  .eq('prospect_id', id)
  .in('status', ['active', 'paused'])

// Outstanding invoices + last 5 receipts
supabase.from('invoices')
  .select('id, invoice_number, total_due_cents, paid_cents, status, due_at')
  .eq('prospect_id', id)
  .in('status', ['sent', 'partial'])

supabase.from('receipts')
  .select('id, receipt_number, amount_cents, payment_method, paid_at, invoice_id')
  .eq('prospect_id', id)
  .order('paid_at', { ascending: false })
  .limit(5)

// Upcoming booking
supabase.from('bookings')
  .select('id, scheduled_for, attendee_email, google_meet_link, status')
  .eq('prospect_id', id)
  .eq('status', 'confirmed')
  .gte('scheduled_for', new Date().toISOString())
  .order('scheduled_for', { ascending: true })
  .limit(1)
  .maybeSingle()
```

These run in parallel, server-side, in the same request. No client-side fetching for the initial render. No new indexes needed (`prospect_id` is FK-indexed on every table).

### MRR computation

`MRR = sum of subscriptions.amount_cents WHERE status='active' AND cycle='monthly'`, plus annualized contributions from quarterly/annual at /3 and /12 respectively. Pure server-side compute on the fetched subscription rows. Display: `$X,XXX/mo`.

### Sidebar grouping

Already correct: "Manage Clients" lives under the CLIENTS group; "Prospects" lives under PROSPECTING. No sidebar restructure required. The sidebar context naturally matches the URL.

## Edge cases

1. **Prospect with `is_client=true` but no active projects** — Status header tiles show 0/0/$0; ActiveProjectsPanel renders an empty state ("No active projects. Create one with the New Project button above."). Same for subscriptions, finance.
2. **Demoted client (`is_client=false` after `became_client_at` was once set)** — `/admin/prospects/[id]` renders the prospect view normally. `became_client_at` is retained for audit. The client-stage data (orphan projects, expired subscriptions) remains in the DB but is not surfaced in the prospect view.
3. **Direct hit on `/admin/clients/[id]` for a never-was-client prospect** — server-side redirect to `/admin/prospects/[id]`. The reverse for `/admin/prospects/[id]` of an already-converted client.
4. **Race on conversion** — admin clicks Promote, page does optimistic refresh, redirect kicks in. URL changes from `/admin/prospects/[id]` to `/admin/clients/[id]`. Already handled by the redirect logic; no new race window.
5. **`page_visits`, `email_engagement`, `prospect_notes` rows from the prospect stage** — preserved and accessible through Acquisition history (collapsed). Nothing is hidden, only de-emphasized.

## Test plan

1. **Routing** — visit `/admin/prospects/<active-client-id>` → redirected to `/admin/clients/<id>`. Visit `/admin/clients/<prospect-id>` → redirected to `/admin/prospects/<id>`. Same-stage URLs render in place.
2. **Promote flow** — on a prospect, click Promote (now visually-primary). Confirm `is_client=true`, `became_client_at` set, URL changes to `/admin/clients/<id>` post-redirect. Page renders with ClientPanels (active projects shows 0, MRR $0 if no subscriptions yet). Demote button now in "..." menu.
3. **Demote flow** — on a client (with active projects), open "..." menu, click Demote. Confirm dialog shows project/subscription count to remind admin of consequences. Confirm `is_client=false`, `became_client_at` preserved, URL flips to `/admin/prospects/<id>`.
4. **Active client landing** — visit `/admin/clients/<id>` for a real client (has projects, subs, open invoices). Status header tiles populate. ActiveProjectsPanel lists projects. ActiveSubscriptionsPanel lists subs. OutstandingFinancePanel shows balances. UpcomingBookingPanel hidden if no upcoming meeting. Acquisition history collapsed.
5. **Eye icon view-as-client** — `/admin/clients` row eye icon → cookie set → `/portal` renders with amber banner. Confirm cookie targets new route.
6. **Magic-link parity check** — for a client whose URL was promoted: open their existing magic-link `/invoice/<num>/<uuid>` in incognito. Confirm: page renders, Pay button works, email send still works, webhook still marks paid. (Covered by FK-driven design; this is the verify step.)
7. **Sidebar nav** — clicking "Manage Clients" → list at `/admin/clients` → row click → `/admin/clients/[id]`. Clicking "Prospects" → list filters `is_client=false` → row click → `/admin/prospects/[id]`. Both flows stable.
8. **Build clean** — `npm run build` passes with zero TS errors.

## Migration

None. No schema change. No data movement. Code-only deploy.

## Rollout

Single PR. Merge to master triggers Vercel auto-deploy. Hunter smoke-tests the four scenarios above on production, reports back. If the client view feels wrong, panel order is one component swap to revisit.

## Open follow-ups (separate specs)

- **Activity timeline rework** — verb-only rows, merged `prospect_notes` + `activities` stream, collapsed-by-default detail. Mentioned in original convo, deferred from this spec.
- **Geocoding cache** — `prospects.geo_lat/geo_lng/geocoded_at`, geocode-on-save, persist for renders. Mentioned in original convo, deferred from this spec.
- **Status header tile customization** — admin pref for which tiles surface (e.g., LTV, churn date, last invoice age). v2.

---

**Spec version 1** — 2026-05-08 — Hunter approved direction: one entity, lifecycle-stamped, partitioned at the view layer. Real `/admin/clients/[id]` route. Client view's panel order locked. Activity timeline + map cache pulled to separate specs to keep this change cohesive. Magic-link surfaces verified untouched.
