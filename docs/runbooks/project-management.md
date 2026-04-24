# Project Management — Operational Runbook

**Owner:** Hunter (DSIG)
**Last updated:** 2026-04-24
**Scope:** The `projects` table, project creation, phase and deliverable status management, and the admin project UI.

> **The three things to know at 2am:**
> 1. **Projects are auto-created on SOW accept — never manually.** Well, you can create them at `/admin/projects/new`, but the standard path is SOW accept → project auto-materialize. Manual creation is for edge cases (SOW accepted before project management existed, or imported client with no SOW).
> 2. **Phase and deliverable status is admin-updated only — no automation yet.** There is no trigger that fires when a phase completes. The project detail page at `/admin/projects/[id]` has status dropdowns you update manually. Gated subscriptions on phase-complete are TODO.
> 3. **`monthly_value` is a snapshot, not a live calc.** It's computed once at SOW accept from recurring deliverable cents. If you add or change recurring deliverables on the project later, update `monthly_value` manually via SQL or the admin edit form.

---

## Emergency procedures

### Project was not auto-created after SOW accept

This happens when the lifecycle side-effect fails (wrapped in try/catch — silent error).

1. Check the SOW to confirm it was accepted:
   ```sql
   SELECT status, accepted_at, prospect_id, phases
   FROM sow_documents WHERE sow_number = 'SOW-HANG-042326A';
   ```
2. Check if a project exists for this SOW:
   ```sql
   SELECT id, name, status FROM projects
   WHERE sow_document_id = '<sow_id>';
   ```
3. If no project: create manually at `/admin/projects/new` — select the prospect, set the project name from the SOW title, paste the phases JSON from step 1's `phases` column
4. Or via SQL:
   ```sql
   INSERT INTO projects (prospect_id, sow_document_id, name, type, status, start_date, phases, monthly_value, notes)
   SELECT
     '<prospect_id>',
     '<sow_id>',
     '<sow_title>',
     'website',
     'planning',
     CURRENT_DATE,
     '<phases_json_from_sow>',
     NULL,  -- calculate manually
     'Manually created after SOW accept — auto-create failed'
   ;
   ```

### Phase marked complete but subscription hasn't activated

This is expected — phase-complete → activate-gated-subscription wiring is not yet built (as of 2026-04-24). When a deliverable has `start_trigger.type = 'on_phase_complete'`, the subscription was still created at SOW accept (not on phase completion). The current behavior is: all recurring subscriptions start immediately.

**When the wiring is built:** it will query `projects.phases` for phases with `status = 'completed'`, find subscriptions with matching `start_trigger.phase_id`, and activate them. Tracking issue: add to backlog.

---

## `projects` table

Migration: `001_crm_spine.sql` (original), `018b_client_lifecycle.sql` (adds `sow_document_id` + `phases`)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `prospect_id` | uuid | FK → prospects.id |
| `deal_id` | uuid | FK → deals.id (nullable — deals table from CRM spine) |
| `sow_document_id` | uuid | FK → sow_documents.id (set on auto-create; null for manual) |
| `name` | text | Project name (usually SOW title) |
| `type` | text | e.g., `website`, `seo`, `social`, `ai` |
| `status` | text | `planning` / `in_progress` / `completed` |
| `start_date` | date | |
| `target_date` | date | |
| `completed_at` | timestamptz | |
| `monthly_value` | numeric | Monthly recurring value in dollars (snapshot) |
| `notes` | text | |
| `phases` | jsonb DEFAULT '[]' | Phase + deliverable status tracking |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

## Project status lifecycle

```
planning → in_progress → completed
```

Admin updates via `/admin/projects/[id]` → Edit Project form → Status dropdown.

No automated transitions. Admin manually moves a project forward.

---

## Phase status lifecycle

Each phase in the `phases` jsonb array has:
```json
{
  "id": "<uuid>",
  "name": "Phase 1 — Discovery",
  "description": "...",
  "status": "pending",
  "completed_at": null,
  "deliverables": [...]
}
```

Status values: `pending` → `in_progress` → `completed`

**API route for phase update:**
```
PATCH /api/admin/projects/[id]/phases/[phaseId]
Body: { "status": "in_progress" }
      { "status": "completed", "completed_at": "2026-05-01T10:00:00Z" }
```

Source: `src/app/api/admin/projects/[id]/phases/[phaseId]/route.ts`

---

## Deliverable status lifecycle

Each deliverable in a phase has:
```json
{
  "id": "<uuid>",
  "name": "WordPress Website",
  "status": "pending",
  "delivered_at": null,
  "cadence": "one_time"
}
```

Status values: `pending` → `delivered`

**API route for deliverable update:**
```
PATCH /api/admin/projects/[id]/deliverables/[deliverableId]
Body: { "status": "delivered", "delivered_at": "2026-05-01T10:00:00Z" }
```

Source: `src/app/api/admin/projects/[id]/deliverables/[deliverableId]/route.ts`

---

## Admin UI

**Project list:** `/admin/projects`
- Columns: Name, Prospect/Client, Status, Monthly Value, Start Date, Progress summary
- Clicking a row → detail page

**Project detail:** `/admin/projects/[id]`
- Header: project name, prospect name, status badge, monthly value, SOW link
- Phase accordion: each phase with status dropdown + deliverable list
- Deliverable rows: name, cadence, status dropdown + delivered date picker
- Edit button: opens edit form for top-level project fields (name, status, target date, notes)

---

## TypeScript types

All in `src/lib/invoice-types.ts`:

```typescript
interface ProjectPhaseDeliverable {
  id: string
  service_id?: string | null
  name: string
  description: string
  cadence: 'one_time' | 'monthly' | 'quarterly' | 'annual'
  quantity?: number
  hours?: number
  unit_price_cents?: number
  line_total_cents?: number
  status: 'pending' | 'delivered'
  delivered_at?: string | null
}

interface ProjectPhase {
  id: string
  name: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  completed_at?: string | null
  deliverables: ProjectPhaseDeliverable[]
}

interface ProjectRow {
  id: string
  prospect_id: string
  deal_id: string | null
  sow_document_id: string | null
  name: string
  type: string
  status: string
  start_date: string | null
  target_date: string | null
  completed_at: string | null
  monthly_value: number | null
  notes: string | null
  phases: ProjectPhase[]
  created_at: string
  updated_at: string
}
```

---

## Monthly value calculation (reference)

```typescript
// Computed once at SOW accept (in the accept route)
// Stored in projects.monthly_value as dollars (not cents)
let monthlyCents = 0
for (const phase of sow.phases) {
  for (const d of phase.deliverables) {
    const cents = d.line_total_cents ?? 0
    if (d.cadence === 'monthly') monthlyCents += cents
    else if (d.cadence === 'quarterly') monthlyCents += Math.round(cents / 3)
    else if (d.cadence === 'annual') monthlyCents += Math.round(cents / 12)
    // one_time deliverables contribute nothing to monthly_value
  }
}
const monthly_value = monthlyCents > 0 ? monthlyCents / 100 : null
```

To update after adding recurring deliverables:
```sql
UPDATE projects SET monthly_value = 800.00 WHERE id = '<id>';
```

---

## Querying project health

```sql
-- Active projects with their phase progress
SELECT
  p.name AS project,
  pr.business_name AS client,
  p.status,
  p.monthly_value,
  jsonb_array_length(p.phases) AS total_phases,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(p.phases) phase
    WHERE phase->>'status' = 'completed'
  ) AS completed_phases
FROM projects p
JOIN prospects pr ON pr.id = p.prospect_id
WHERE p.status != 'completed'
ORDER BY p.start_date ASC;

-- All deliverables still pending across active projects
SELECT
  p.name AS project,
  d->>'name' AS deliverable,
  d->>'cadence' AS cadence
FROM projects p,
  jsonb_array_elements(p.phases) phase,
  jsonb_array_elements(phase->'deliverables') d
WHERE p.status != 'completed'
  AND d->>'status' = 'pending'
  AND d->>'cadence' = 'one_time'
ORDER BY p.start_date, p.name;
```

---

## Still-TODO items (as of 2026-04-24)

1. **Phase-complete → activate gated subscriptions** — deliverables with `start_trigger.type = 'on_phase_complete'` currently start at SOW accept. Need a trigger that fires when phase status → completed and activates matching subscriptions.

2. **Project expense tracking** — no expense table yet. Would link to `projects.id` and allow recording costs (contractor fees, tool licenses, etc.) against a project.

3. **Timekeeping** — admin sidebar shows "Timekeeping (soon)". Time entries would link to a deliverable and enable project profitability reporting.

4. **Project Dashboard** (`/admin/projects/dashboard`) — flagged as `soon` in sidebar. Would show aggregate metrics: active projects, total MRR, delivery velocity, etc.

---

## Troubleshooting

### `phases` column not found

Migration 018b not applied. Verify:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'phases';
```
If missing: apply `APPLY-018-2026-04-22.sql`. See `supabase-migrations.md`.

### Phase status update returns 404

The phase/deliverable update routes find the phase by ID inside the `phases` jsonb array. The ID is the UUID set when the SOW was accepted. If the project was manually created and phase IDs are missing or wrong:
```sql
SELECT phases FROM projects WHERE id = '<project_id>';
-- Look at the phase IDs in the jsonb array
```

### PROJECT status still "planning" after months

No automation — this is manual. Go to `/admin/projects/[id]` → Edit → change status.

---

## Cross-references

- `client-lifecycle.md` — how projects are auto-created on SOW accept
- `sow-lifecycle.md` — the SOW phases that seed project phases
- `receipts-and-payments.md` — invoices associated with project milestones
