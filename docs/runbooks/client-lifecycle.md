# Client Lifecycle — Operational Runbook

**Owner:** Hunter (DSIG)
**Last updated:** 2026-04-24
**Scope:** The prospect → client transition triggered by SOW acceptance, project materialization from SOW phases, and ongoing project management.

> **The three things to know at 2am:**
> 1. **The flip is idempotent.** SOW accept sets `is_client = true` with `.eq('is_client', false)` guard. Double-clicking accept on the client side cannot double-create the project — the SOW status check (`if !['sent','viewed'].includes(status) → 409`) prevents re-entry at the route level.
> 2. **Project creation is wrapped in try/catch.** If the project INSERT fails, the deposit invoice and subscriptions are already committed. The prospect gets their invoice even if project setup fails. Check `[accept] Project creation failed:` in Vercel logs and create the project manually via `/admin/projects/new`.
> 3. **`monthly_value` on the project is a snapshot.** It's computed at accept time from the SOW phases' recurring deliverable cents. It does not auto-update if you later edit the project. Re-compute it manually in SQL if needed.

---

## Emergency procedures

### Client shows as prospect (is_client not flipped)

**Symptom:** SOW shows `accepted` but prospect detail still shows no CLIENT badge.

1. Check the prospect:
   ```sql
   SELECT id, business_name, is_client, became_client_at
   FROM prospects WHERE id = '<prospect_id>';
   ```
2. If `is_client = false`: the lifecycle side-effect failed silently. Fix manually:
   ```sql
   UPDATE prospects
   SET is_client = true, became_client_at = now()
   WHERE id = '<prospect_id>';
   ```

### Project not created after SOW accept

1. Check logs in Vercel dashboard for `[accept] Project creation failed:`
2. Check the SOW was accepted (not just viewed):
   ```sql
   SELECT id, status, accepted_at, prospect_id
   FROM sow_documents WHERE sow_number = 'SOW-HANG-042326A';
   ```
3. Check if a project already exists for this SOW:
   ```sql
   SELECT id, name, status, sow_document_id FROM projects
   WHERE sow_document_id = '<sow_id>';
   ```
4. If no project exists — create one manually at `/admin/projects/new`. Select the prospect, enter the name, paste the phases JSON from the SOW.

### Need to un-flip a prospect back to prospect status

Edge case: test SOW accidentally accepted, or SOW voided after client backed out.

```sql
UPDATE prospects
SET is_client = false, became_client_at = NULL
WHERE id = '<prospect_id>';
```

Also update the project status to `planning` (or delete if it was just the test):
```sql
UPDATE projects SET status = 'planning' WHERE sow_document_id = '<sow_id>';
-- Or delete if it was a test:
DELETE FROM projects WHERE sow_document_id = '<sow_id>';
```

---

## Migration 018b — what it added

File: `supabase/migrations/018b_client_lifecycle.sql`

**On `prospects`:**
- `is_client boolean NOT NULL DEFAULT false` — set to true on SOW accept
- `became_client_at timestamptz` — timestamp of the flip
- Index: `idx_prospects_is_client ON prospects (is_client, became_client_at DESC) WHERE is_client = true`

**On `projects`:**
- `sow_document_id uuid REFERENCES sow_documents(id) ON DELETE SET NULL` — FK back to the SOW that created the project
- `phases jsonb NOT NULL DEFAULT '[]'` — the phases array copied from the SOW at accept time

Verify it's applied:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'prospects'
  AND column_name IN ('is_client', 'became_client_at');
-- Expect: 2 rows

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'projects'
  AND column_name IN ('sow_document_id', 'phases');
-- Expect: 2 rows
```

---

## What SOW accept does to the project

Source: `src/app/api/sow/public/[number]/accept/route.ts` (lines 296–353)

### Phase structure copied to `projects.phases`

Each SOW phase becomes a project phase with added `status` and `completed_at` fields. Each deliverable gets `status: 'pending'` and `delivered_at: null`.

**Project phase shape (jsonb):**
```json
[
  {
    "id": "<same uuid as SOW phase>",
    "name": "Phase 1 — Discovery",
    "description": "...",
    "status": "pending",
    "completed_at": null,
    "deliverables": [
      {
        "id": "<same uuid as SOW deliverable>",
        "service_id": "wordpress-website",
        "name": "WordPress Website",
        "description": "5-page responsive site",
        "cadence": "one_time",
        "quantity": 1,
        "hours": null,
        "unit_price_cents": 500000,
        "line_total_cents": 500000,
        "status": "pending",
        "delivered_at": null
      }
    ]
  }
]
```

### `monthly_value` computation

```typescript
// Monthly + quarterly/3 + annual/12 of all recurring deliverables
let monthlyCents = 0
for (const phase of sow.phases) {
  for (const d of phase.deliverables) {
    if (d.cadence === 'monthly') monthlyCents += d.line_total_cents
    else if (d.cadence === 'quarterly') monthlyCents += Math.round(d.line_total_cents / 3)
    else if (d.cadence === 'annual') monthlyCents += Math.round(d.line_total_cents / 12)
  }
}
// Stored as dollars (cents / 100) in projects.monthly_value
```

---

## Admin UI

### Prospects list (`/admin/prospects`)

Rows with `is_client = true` show a **CLIENT** emerald badge in the status column.

### Project list (`/admin/projects`)

Shows all projects. Columns: Name, Prospect, Status, Monthly Value, Start Date, SOW link.

### Project detail (`/admin/projects/[id]`)

Shows the full phase/deliverable breakdown with status dropdowns:
- Phase status: `pending` / `in_progress` / `completed`
- Deliverable status: `pending` / `delivered` + `delivered_at` date picker

**API routes for status updates:**
```
PATCH /api/admin/projects/[id]/phases/[phaseId]
  { status: 'in_progress' | 'completed', completed_at?: string }

PATCH /api/admin/projects/[id]/deliverables/[deliverableId]
  { status: 'delivered', delivered_at?: string }
```

---

## Phase and deliverable status workflow

Typical progression:
```
Project: planning → in_progress → completed
Phase:   pending  → in_progress → completed (with completed_at timestamp)
Deliverable: pending → delivered (with delivered_at timestamp)
```

There is no automated transition rule yet — status changes are admin-initiated via the project detail page.

**Still-TODO wiring (as of 2026-04-24):**
- Phase-complete events triggering gated subscriptions (deliverables with `start_trigger.type = 'on_phase_complete'` currently start immediately on SOW accept, not when the referenced phase actually completes)
- Project expense tracking
- Project time tracking / timekeeping integration

---

## TypeScript types

All types in `src/lib/invoice-types.ts`:

```typescript
interface ProjectPhaseDeliverable {
  id: string; service_id?: string | null; name: string; description: string
  cadence: 'one_time' | 'monthly' | 'quarterly' | 'annual'
  quantity?: number; hours?: number; unit_price_cents?: number; line_total_cents?: number
  status: 'pending' | 'delivered'; delivered_at?: string | null
}

interface ProjectPhase {
  id: string; name: string; description: string
  status: 'pending' | 'in_progress' | 'completed'; completed_at?: string | null
  deliverables: ProjectPhaseDeliverable[]
}

interface ProjectRow {
  id: string; prospect_id: string; deal_id: string | null; sow_document_id: string | null
  name: string; type: string; status: string
  start_date: string | null; target_date: string | null; completed_at: string | null
  monthly_value: number | null; notes: string | null; phases: ProjectPhase[]
  created_at: string; updated_at: string
}
```

---

## Querying client statistics

```sql
-- How many clients total
SELECT COUNT(*) FROM prospects WHERE is_client = true;

-- Clients in the last 30 days
SELECT business_name, became_client_at
FROM prospects WHERE is_client = true
  AND became_client_at > now() - interval '30 days'
ORDER BY became_client_at DESC;

-- Total monthly recurring value across all active projects
SELECT SUM(monthly_value) AS total_mrr
FROM projects
WHERE status != 'completed'
  AND monthly_value IS NOT NULL;

-- Projects with no phases (bare project, manually created)
SELECT id, name, prospect_id FROM projects
WHERE jsonb_array_length(phases) = 0;
```

---

## Troubleshooting

### `phases` column not found on projects

Migration 018b not applied. Apply `APPLY-018-2026-04-22.sql` via Supabase SQL Editor. See `supabase-migrations.md`.

### Project phases show empty deliverables

The SOW phases at accept time had no deliverables. Edit the project manually in admin to add deliverables, or recreate the project from the SOW by:
1. Getting the SOW phases JSON: `SELECT phases FROM sow_documents WHERE id = '<sow_id>'`
2. Updating the project: `UPDATE projects SET phases = '<sow_phases_json>' WHERE id = '<project_id>'`

### `monthly_value` shows NULL

Either:
- All SOW deliverables were `one_time` (no recurring) — NULL is correct
- The calculation code had no phases to iterate — check `sow.phases` was populated at accept time

To fix after the fact:
```sql
-- Manually set a known monthly value
UPDATE projects SET monthly_value = 800.00 WHERE id = '<id>';
```

---

## Cross-references

- `sow-lifecycle.md` — the accept route that triggers the lifecycle flip
- `project-management.md` — full project operations runbook
- `receipts-and-payments.md` — the deposit invoice created simultaneously with project
- `supabase-migrations.md` — how to apply 018b if not yet applied
