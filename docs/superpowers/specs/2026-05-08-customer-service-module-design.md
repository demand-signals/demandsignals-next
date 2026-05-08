# Customer Service / Bug Report Module

**Date:** 2026-05-08
**Status:** v1 DRAFT → awaiting Hunter approval

## Problem

A client called Hunter today with a bug report on their new site. There was no formal intake path — the call was logged ad-hoc as an activity row, the issues had to be triaged in his head, and the work to fix them lived nowhere except his short-term memory. When the work eventually shipped, the client got a verbal "we fixed those" with no formal report and no time-tracked record of what was done.

This isn't sustainable for an agency that bills time + delivers professional artifacts. Bug reports and customer-service work need the same formality the platform already gives to net-new SOW work: structured intake, phased execution, time tracking, and a polished PDF deliverable when the work is done.

The data model already supports this. `projects.type` is a string column, `projects.phases` is jsonb of phases with nested deliverables (per `ProjectPhase` + `ProjectPhaseDeliverable` in `src/lib/invoice-types.ts`). What's missing is:
1. The intake UX — a "Log support contact" entry point on the client view
2. A new `type='customer_service'` convention with sane defaults
3. Phase + deliverable status flow that the /handoff slash command can update
4. A "package + send report to client" action that calls the `dsig-pdf-standards` skill and emails the result

## Goals

1. **Intake from any surface** — admin opens a "Log support contact" form on the client view, picks the contact channel (call, email, portal, in-person), captures the date and the issues raised. One form. One click. Hunter does this while still on the call OR right after.
2. **Project + phase materialize automatically** — submitting the intake creates a `projects` row with `type='customer_service'` AND a phase representing this contact event AND deliverables for each issue. No separate SOW. No quote process. The project just exists.
3. **Subsequent contacts add new phases** — second call about the same incident → admin clicks "Log another contact" on that project → new phase appended. Bug reports often span multiple calls; each call is its own phase with its own deliverables.
4. **Phase + deliverable status updates work the same as SOW projects** — admin checks deliverables off as they're done. The /handoff slash command's existing time-tracking + activity-log behavior writes against this project just like any other.
5. **On approval, package a Customer Service Report** — admin clicks "Send report to client" on the project. Server renders a DSIG-branded PDF (per `dsig-pdf-standards`) summarizing all phases, deliverables, time spent, dates. Client receives an email with the PDF attached. The send is logged to `email_engagement` so it appears in the client's Messages feed (per Round 1 lifecycle work).
6. **Project closes when client confirms** — admin marks the project complete after the client acknowledges. Time-tracking aggregate becomes the bill (free or charged — admin's call per project).
7. **No client portal exposure of in-flight work** — bug reports may include sensitive issues (security flaws, broken integrations). Until the report is sent, the project is admin-only. The client's portal shows the project AFTER the report goes out, not before.

## Non-goals

- **No new ticketing-system mental model.** This is not Zendesk. Issues are deliverables on phases on a project. The same primitives that handle "build a website" handle "fix the website" — different `type`, same shape.
- **No SLA tracking, no auto-routing, no escalation tiers.** Solo agency today. Add SLAs when there's a team.
- **No client-facing bug submission form.** Hunter takes the call, logs the contact himself. A self-serve client form is v2 (lives behind portal auth, posts to the same intake endpoint).
- **No automatic billing.** The CS project's time aggregates show in `/admin/timekeeping` like any other project; admin manually creates an invoice if billable. Bundling time-into-invoice is a separate effort.
- **No reopening closed reports.** A closed CS project stays closed; new reports = new project. Avoids stale-state confusion.

**Locked decisions (per Hunter, 2026-05-08):**
- **Bug report → project (not ticket).** Same primitives as SOW projects; reuses time tracking, /handoff integration, PDF rendering, email pipeline.
- **Call → phase. Issue → deliverable.** Direct mapping. Each call event gets its own phase even if it's a follow-up; we never collapse two contacts into one phase. Forensic clarity wins over compactness.
- **`type='customer_service'`** is the project-type discriminator. Stays as a free-text column value (no migration).
- **Report PDF uses DSIG-PDF-standards skill.** Slate `#3D4566`, teal `#52C9A0`, orange `#F26419`, Helvetica, Legal portrait. Same visual language as SOW/invoice/receipt PDFs.
- **Report is sent via Resend** (per root §2). Email subject: "Service report — {project name} — {date}". Body links back to the client portal where the project is now visible.
- **Project visible to client only after first report send**, then forever. No partial-state portal exposure.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ Intake (admin surface)                                              │
│                                                                     │
│   /admin/clients/[id]                                               │
│     └─ "Log support contact" button (new, in action bar)            │
│             │                                                       │
│             ▼                                                       │
│       ┌──────────────────────────────────────────┐                 │
│       │ Modal: SupportContactIntake             │                 │
│       │ ─ Channel: call / email / portal / IRL  │                 │
│       │ ─ Contact date (default: now PT)        │                 │
│       │ ─ Phase title (default: "Support call   │                 │
│       │   — {date}")                            │                 │
│       │ ─ Issues (dynamic list, free-text):     │                 │
│       │     ▸ Issue 1 …                         │                 │
│       │     ▸ Issue 2 …                         │                 │
│       │     ▸ + Add issue                       │                 │
│       │ ─ Existing project (optional dropdown)  │                 │
│       │   default: create new project           │                 │
│       │   alt: append phase to existing         │                 │
│       │   open project of type='customer_service'│                │
│       └──────────────────────────────────────────┘                 │
│             │                                                       │
│             ▼                                                       │
│   POST /api/admin/customer-service/intake                           │
│     │                                                               │
│     ├─ create new project (or append phase)                         │
│     ├─ append phase with each issue as a deliverable                │
│     ├─ insert prospect_notes row (visibility=internal):             │
│     │     "Logged support contact via {channel}. {N} issue(s)."    │
│     └─ insert activity row (type=call|email|stage_change)           │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Execution (existing primitives)                                     │
│                                                                     │
│   /admin/projects/[id]                                              │
│     ─ Phase / deliverable status flips (existing UI)                │
│     ─ /handoff updates time entries (existing pipeline)             │
│     ─ Notes accumulate as work progresses                           │
│                                                                     │
│   No new code path. Same project detail UI. Same /handoff.          │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Report-out (new)                                                    │
│                                                                     │
│   /admin/projects/[id] → "Send service report" button               │
│     (only enabled when type='customer_service' AND                  │
│      all deliverables are status='delivered')                       │
│             │                                                       │
│             ▼                                                       │
│   POST /api/admin/customer-service/[id]/send-report                 │
│     │                                                               │
│     ├─ render PDF via dsig-pdf-standards:                           │
│     │     ▸ Cover: client name, project name, date range            │
│     │     ▸ Summary: N phases, N deliverables, total hours          │
│     │     ▸ Per phase: title, contact channel, date, issue list     │
│     │       with delivered/pending status + completion date         │
│     │     ▸ Time entries appendix: hunter_minutes / claude_minutes  │
│     ├─ upload PDF to private R2 bucket                              │
│     │     /clients/{client_code}/cs-reports/{project_id}_v{n}.pdf   │
│     ├─ send email via sendEmail() helper:                           │
│     │     to: prospect.owner_email                                  │
│     │     subject: "Service report — {project.name}"                │
│     │     body: link to portal project page + PDF attached          │
│     │     kind: 'service_report' (new EmailKind)                    │
│     │     reply_to: DemandSignals@gmail.com                         │
│     ├─ insert email_engagement row → shows in Messages feed         │
│     ├─ flip prospect_notes visibility on all this project's notes:  │
│     │     internal → client (so client sees them in portal)         │
│     ├─ stamp project: report_sent_at = now()                        │
│     └─ revalidate /admin/clients/[id], /admin/projects/[id],        │
│        /portal/projects/[id]                                         │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Client portal exposure                                              │
│                                                                     │
│   /portal/projects/[id] only renders if                             │
│     project.report_sent_at IS NOT NULL                              │
│   (or always renders if type != 'customer_service')                 │
│                                                                     │
│   Pre-send: client doesn't see the project at all.                  │
│   Post-send: client sees the full project, all phases, all          │
│     deliverables, all client-visible notes.                         │
└─────────────────────────────────────────────────────────────────────┘
```

## Components

### Schema

**Migration 051a_customer_service_module.sql:**

```sql
-- 1. New column on projects: tracks if/when the CS report has been sent.
--    Used to gate client-portal visibility for type='customer_service'.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS report_sent_at timestamptz;

-- 2. New column on projects: the contact channel for the FIRST phase.
--    Subsequent phases store their own channel in the jsonb phase row.
--    First-channel surfaces in admin list views as a quick "how did this
--    bug come in" sort/filter.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS first_contact_channel text;

-- 3. Index for the admin Customer Service queue (project list filtered
--    by type='customer_service' AND report_sent_at IS NULL = open queue).
CREATE INDEX IF NOT EXISTS idx_projects_cs_queue
  ON projects (prospect_id, report_sent_at)
  WHERE type = 'customer_service';

-- 4. NEW EmailKind for engagement logging — purely a column-value
--    convention, no DB enum to update (kind is text on email_engagement).
COMMENT ON COLUMN email_engagement.kind IS
  'EmailKind: invoice_send | sow_send | receipt_send | quote_send | portal_digest | portal_signin | service_report | other';
```

The phase + deliverable jsonb already supports everything else. No new tables.

### TypeScript types

Extend `ProjectPhase` in [src/lib/invoice-types.ts](src/lib/invoice-types.ts) with optional fields the customer-service flow uses:

```ts
export interface ProjectPhase {
  id: string
  name: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  completed_at?: string | null
  deliverables: ProjectPhaseDeliverable[]
  // CS-specific (optional, undefined for non-CS phases)
  contact_channel?: 'call' | 'email' | 'portal' | 'in_person' | null
  contact_at?: string | null
}
```

Add to `EmailKind` enum in [src/lib/constants.ts](src/lib/constants.ts):

```ts
export type EmailKind =
  | 'invoice_send' | 'sow_send' | 'receipt_send' | 'quote_send'
  | 'portal_digest' | 'portal_signin' | 'service_report'  // new
  | 'contact_form' | 'newsletter' | 'system_alert' | 'other'
```

### Intake API

**`POST /api/admin/customer-service/intake`** — accepts:

```ts
{
  prospect_id: string
  channel: 'call' | 'email' | 'portal' | 'in_person'
  contact_at: string                     // ISO; default = now
  phase_title?: string                   // default = "Support contact — {fmt(contact_at)}"
  issues: { name: string; description: string }[]
  existing_project_id?: string | null    // null = create new project
}
```

Validation: at least one issue required, phase_title <= 200 chars, issues capped at 30 per intake.

Behavior:

1. If `existing_project_id` is null → create new `projects` row:
   - `type='customer_service'`, `status='in_progress'`, `name = "{client_name} — Customer Service"`, `start_date = today`, `first_contact_channel = channel`, `phases = [<the new phase>]`
2. If `existing_project_id` is set → fetch project, validate `type='customer_service'` AND `report_sent_at IS NULL`, append the new phase to `phases`. Reject otherwise.
3. New phase shape:
   - `id = crypto.randomUUID()`
   - `name = phase_title`
   - `description = "Contact via {channel} on {fmt(contact_at)}"`
   - `status = 'in_progress'`
   - `contact_channel = channel`
   - `contact_at = contact_at`
   - `deliverables = issues.map(i => ({ id: uuid, name: i.name, description: i.description, cadence: 'one_time', status: 'pending' }))`
4. Insert `prospect_notes` row, visibility=internal:
   `"Logged support contact via {channel}. {issues.length} issue(s) recorded."`
5. Insert `activities` row, type='call' | 'email' | 'note' (mapped from channel; `in_person` → 'note').

Returns `{ project_id, phase_id }`.

### Intake UI

**`<SupportContactIntake>` modal** — new client component at `src/components/admin/customer-service/SupportContactIntake.tsx`. Mounted from the client detail page action bar via a "Log support contact" button (next to View as client).

Modal fields:
- Channel radio: Call · Email · Portal · In person
- Contact date: datetime-local, default now in PT
- Phase title: text, prefilled
- Issues: dynamic list, each with `name` (short) + `description` (textarea), with "+ Add issue" button. At least 1 required.
- Existing project dropdown: shows open CS projects for this prospect; default "Create new project". Hidden if no open CS projects exist.
- Submit → POST → on 200, redirect to `/admin/projects/{project_id}` so admin can immediately work on it.

### Report-out API

**`POST /api/admin/customer-service/[id]/send-report`** — accepts no body.

Validation:
- Project must exist and `type='customer_service'`
- All `phases[*].deliverables[*].status` must be `'delivered'` (refuse send if any deliverable is pending)
- `prospects.owner_email` must be present (refuse send otherwise; surface to admin)

Behavior:

1. Render PDF via `src/lib/pdf/customer-service-report.ts` (new) using the `dsig-pdf-standards` HTML skeleton + Chromium pipeline (per project CLAUDE.md §21):
   - Cover: client business name, project name, date range (`min(phase.contact_at)` → today)
   - Summary block: phases count, deliverables count, total time entries (sum of `hunter_minutes + claude_minutes` for the project)
   - Per-phase section: phase title, contact channel + date, deliverable list with delivered_at dates
   - Footer: DSIG branding, contact info, "Reply to DemandSignals@gmail.com with questions"
2. Upload PDF to private R2: `cs-reports/{prospect.client_code}/{project.id}_v{N}.pdf` where `N = 1 + count of prior reports for this project` (so re-sends get versioned)
3. Generate magic-link signed URL for the PDF (TTL 30 days)
4. Send email via `sendEmail()`:
   - `kind: 'service_report'`
   - `from: 'reports@demandsignals.co'`
   - `reply_to: 'DemandSignals@gmail.com'`
   - Subject: `Service report — {project.name}`
   - Body: short summary + button linking to `/portal/projects/{project.id}` + PDF attachment
5. Insert `email_engagement` row (auto via `sendEmail()` plumbing already in place)
6. Update all `prospect_notes` rows linked to this project's prospect with `source='customer_service' AND visibility='internal'` → flip to `visibility='client'`. (Note: this requires `prospect_notes` to track `project_id` which it doesn't today — see Open Question #2.)
7. Stamp `projects.report_sent_at = now()`
8. Revalidate paths: `/admin/clients/{prospect_id}`, `/admin/projects/{project.id}`, `/portal/projects/{project.id}`

Returns `{ ok: true, pdf_url, email_send_id }`.

### Send report UI

On `/admin/projects/[id]/page.tsx`:
- New "Send service report" button, only visible when `type='customer_service'` AND `report_sent_at IS NULL`
- Disabled with tooltip if any deliverable is `status='pending'` ("Mark all deliverables delivered first.")
- After send: button replaces with green "Report sent {fmt(report_sent_at)}" pill + "Resend" link (which clears `report_sent_at` and re-runs the send — second version of the PDF)

### Client portal visibility gate

`/portal/projects/[id]/page.tsx` — add the gate at top of the server component:

```ts
if (project.type === 'customer_service' && !project.report_sent_at) {
  notFound()  // pre-send, project doesn't exist as far as client is concerned
}
```

Same for the `/portal/projects/page.tsx` list view: filter out CS projects where `report_sent_at IS NULL`.

### /handoff slash command integration

No change required. /handoff already writes time entries against any project_id passed via the CLI endpoint. CS projects are just projects. The CLI flow described in project CLAUDE.md §4 (`DSIG_CLI_TOKEN` → `/api/cli/handoff/project-notes`) writes notes + time entries the same way for CS projects as for SOW projects.

The only thing /handoff doesn't do today: flip phase or deliverable status. That stays a manual admin action on `/admin/projects/[id]`.

### Customer Service queue (admin sidebar)

Add a new sidebar entry under the existing "PROJECTS" group: **"Customer Service"** linking to `/admin/customer-service` (new list page) showing:
- All projects WHERE `type='customer_service'` AND `report_sent_at IS NULL`
- Sorted by oldest-contact-first (so old open issues bubble up)
- Columns: Client, project name, opened, # phases, # pending deliverables, last activity
- Empty state: "No open service issues 🎉"

Closed CS projects (`report_sent_at IS NOT NULL`) appear in the regular `/admin/projects` list and on the per-client `/admin/clients/[id]` Projects panel like any other project.

## Test plan

1. **Intake from admin client view** — log in, navigate to a client, click "Log support contact". Modal opens. Pick "Call", enter 2 issues, submit. Land on `/admin/projects/<new-uuid>`. Project has `type='customer_service'`, status `in_progress`, one phase with two deliverables both `pending`.
2. **Add second contact to same project** — back to client view, click "Log support contact" again. The "Existing project" dropdown shows the open CS project. Pick it. Add a 3rd issue. Submit. Project now has TWO phases, three deliverables total.
3. **Mark deliverables delivered** — on `/admin/projects/[id]`, flip each deliverable to `delivered`. "Send service report" button enables.
4. **Send report** — click button. Modal confirms. POST runs. Email lands in `DemandSignals@gmail.com` (or test alias) with PDF attached. PDF opens, renders DSIG-branded with client name, phase summary, deliverable list, time totals.
5. **Email shows in Messages** — back to `/admin/clients/[id]`. Messages feed shows "Service report — …" with kind badge SERVICE_REPORT and link back to the project.
6. **Client portal sees the project** — sign in as the client (or "view as client" eye icon). `/portal/projects` lists the CS project. `/portal/projects/[id]` shows the project + all phases + all deliverables.
7. **Pre-send invisibility** — create a 2nd CS project for the same client, do NOT send the report. View as client. Project does NOT appear in their portal list. Direct hit on `/portal/projects/<that-uuid>` returns 404.
8. **Resend** — click "Resend" on a sent project. PDF v2 generated. Email sent again. `email_engagement` shows two rows.
9. **CS queue** — `/admin/customer-service` lists open CS projects sorted oldest-first, hides closed ones.
10. **Build clean on Vercel.**

## Migration

`051a_customer_service_module.sql` — adds 2 columns to `projects` + 1 partial index. Idempotent (`IF NOT EXISTS`). No data migration. Apply via Supabase web SQL editor (per project CLAUDE.md §12 — APPLY wrappers must be inlined; this one is small enough to apply as a single block).

## Rollout

Single PR. Merge to master triggers Vercel auto-deploy. Hunter creates one CS project end-to-end on a real client to verify the PDF + email + portal flow, then closes.

## Open questions for Hunter

1. **Time tracking — billable vs courtesy?** Some bug reports are warranty-period free fixes; others are out-of-scope and chargeable. Today's design has no field for this. Options: (a) `billable` boolean on the project, default false, admin toggles per-project; (b) per-deliverable `billable` toggle. (b) is more flexible but more clicks. **My vote: (a) project-level. Simplest.**

2. **`prospect_notes` ↔ project linkage.** The send-report flow wants to flip CS-related notes from internal → client when the report goes out. `prospect_notes` doesn't have a `project_id` column today. Three paths:
   - Add `project_id` to `prospect_notes` (new column, nullable, set during CS-context note creation only)
   - Don't flip notes at all — the PDF report IS the client-facing artifact, internal notes stay internal forever
   - Match notes by content/timestamp range (fragile, don't)
   
   **My vote: middle option** — internal notes stay internal. The PDF is the report. Less complexity, more honest about what notes are.

3. **Client portal entry point.** When the client clicks the email link, where do they land? Options: (a) `/portal/projects/[id]` directly; (b) `/portal` dashboard with a "New service report" highlight banner. (a) is more direct, (b) is more discoverable for future visits. **My vote: (a) primary link, (b) banner on dashboard for next 7 days as a side benefit.**

4. **Phase title default.** I have `"Support contact — {fmt(contact_at)}"`. Could also be `"Call from {client_name}"` or `"Issue #{N} reported"`. Cosmetic; pick whichever you'd want to read in a list six months later.

5. **CS sidebar group placement.** Current proposal: under PROJECTS group. Could also be its own top-level "CUSTOMER SERVICE" group between PROJECTS and FINANCE. Strongly project-management-oriented teams put it under PROJECTS; service-business-oriented teams give it top-level. DSIG is both. **My vote: under PROJECTS. CS work is project work, demoting it to a separate group implies a wall that doesn't exist.**

6. **What if Hunter's on the call but doesn't have a laptop open?** The intake modal works on mobile (responsive). But mobile typing is slow. Could we accept a SMS-based intake too? Out of scope for v1. v2 idea: text DSIG's Twilio number with `BUG <client_code> <description>` and the platform creates a stub project + phase that Hunter completes later. Worth noting; not building.

## What this leans on

- Existing `projects` + `phases` jsonb shape (017a / 018b migrations) — reused as-is
- Existing /handoff CLI bearer-token flow (`DSIG_CLI_TOKEN` → `/api/cli/handoff/project-notes`) — reused
- Existing time-tracking primitives (`project_time_entries`) — reused
- Existing email pipeline (`sendEmail()` + Resend + `email_engagement`) — extended by one `EmailKind` value
- Existing PDF pipeline (`dsig-pdf-standards` + Chromium + `puppeteer-core`) — extended by one new renderer
- Existing R2 storage (private bucket, magic-link URLs) — reused
- Existing client portal (`/portal/projects`) — extended by one visibility gate

This is structurally light. Most of the work is UI (intake modal, send-report button, CS queue list page) plus the PDF renderer template. The data model is already there.

---

**Spec version 1** — 2026-05-08 — Drafted from Hunter's verbal pivot during Round 1 panel work. Customer-service work is project work; bug reports are projects with `type='customer_service'`; calls are phases; issues are deliverables. Reuse all existing primitives (handoff, time tracking, PDF, email, portal) — only build the intake UX, the report-out flow, and the CS queue. Pending Hunter approval on six open questions before implementation plan.
