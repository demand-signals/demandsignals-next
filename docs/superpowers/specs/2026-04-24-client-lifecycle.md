# Client Lifecycle — Retrospective Spec

**Date:** 2026-04-24
**Status:** SHIPPED
**Author:** Hunter / Claude (retrospective capture)
**See also:** `docs/runbooks/client-lifecycle.md` for operational procedures

---

## Problem

The CRM had prospects and deals but no formal "this prospect is now a client" state transition. Consequences:

1. **No clean audit trail.** After a SOW was accepted, there was no way to query "give me all clients" vs "give me all prospects." The admin had to infer status from SOW acceptance dates.
2. **No project tracking after close.** The SOW was the last structured artifact. Work began in some other system (Notion, Asana, spreadsheet), disconnected from the CRM.
3. **Phases on SOW had no lifecycle of their own.** SOW phases were documents — they didn't track whether phase work had started, who was blocked, or when deliverables were handed off.
4. **Monthly recurring value was unknown.** The CRM had no MRR metric because there was no field tracking how much recurring revenue each active client represented.

---

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| **Separate `clients` table** | Clean separation; no nullable columns on prospects | Requires JOIN everywhere; syncing prospect data (name, address, etc.) to a parallel table is fragile |
| **`prospects.is_client boolean` + `became_client_at` (chosen)** | Prospect data doesn't change shape on conversion; simple boolean filter for "clients" view | Mixes two concerns (lead + client) in one table; requires index for efficient filtering |
| **CRM stage column (e.g., 'prospect', 'client', 'former_client')** | More expressive than boolean | Enums grow; boolean is sufficient for current needs |

---

## Chosen approach

Extend the `prospects` table in place with two columns:

```sql
is_client boolean NOT NULL DEFAULT false
became_client_at timestamptz
```

No separate clients table. Prospect data (name, contacts, address, channels) does not change shape when a prospect becomes a client. The admin UI surfaces a **CLIENT** badge when `is_client = true`.

---

## Rationale

Prospect data doesn't change shape when they become a client. Duplicating it into a `clients` table creates a sync problem (two sources of truth for address, phone, etc.) with no compensating benefit. A partial index on `(is_client, became_client_at DESC) WHERE is_client = true` makes client-only queries as fast as a separate table.

---

## Auto-creation cascade on SOW accept

When a client signs the SOW at `/sow/[number]/[uuid]`, the accept route (`src/app/api/sow/public/[number]/accept/route.ts`) executes a cascade in this order:

1. **Validate.** SOW must be in `sent` or `viewed` status. Any other status → 409.
2. **Record acceptance.** Set `accepted_at`, `accepted_signature`, `accepted_ip` on the SOW.
3. **Create deposit invoice.** 25% of SOW total, auto-issued. Number allocated via `allocateDocNumber()`.
4. **Create subscriptions.** For each recurring deliverable in the SOW phases, insert a `subscriptions` row.
5. **Create project.** Insert into `projects` with phases copied from the SOW (see Phase structure below).
6. **Flip prospect.** Set `is_client = true`, `became_client_at = now()`.

Steps 4–6 are wrapped in `try/catch`. If project creation fails, the deposit invoice and subscriptions are already committed. The accept route still returns 200 — the client gets their confirmation. A Vercel log entry `[accept] Project creation failed:` signals the need for manual project creation.

The accept route is idempotent at the SOW status level: once a SOW is `accepted`, re-submission returns 409 before any side effects run.

---

## Data model

### Migration 018b (`supabase/migrations/018b_client_lifecycle.sql`)

**On `prospects`:**

| Column | Type | Notes |
|---|---|---|
| `is_client` | `boolean NOT NULL DEFAULT false` | Flipped to true on SOW accept |
| `became_client_at` | `timestamptz` | Timestamp of the flip |

Index: `idx_prospects_is_client ON prospects (is_client, became_client_at DESC) WHERE is_client = true`

**On `projects`:**

| Column | Type | Notes |
|---|---|---|
| `sow_document_id` | `uuid REFERENCES sow_documents(id) ON DELETE SET NULL` | FK back to originating SOW |
| `phases` | `jsonb NOT NULL DEFAULT '[]'` | Phases array copied from SOW at accept time |

### Project phase structure (jsonb)

Each SOW phase becomes a project phase with `status` and `completed_at` fields. Each deliverable gains `status: 'pending'` and `delivered_at: null`.

```json
[
  {
    "id": "<phase uuid>",
    "name": "Phase 1 — Discovery",
    "description": "...",
    "status": "pending",
    "completed_at": null,
    "deliverables": [
      {
        "id": "<deliverable uuid>",
        "name": "WordPress Website",
        "description": "5-page responsive site",
        "cadence": "one_time",
        "quantity": 1,
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
let monthlyCents = 0
for (const phase of sow.phases) {
  for (const d of phase.deliverables) {
    if (d.cadence === 'monthly') monthlyCents += d.line_total_cents
    else if (d.cadence === 'quarterly') monthlyCents += Math.round(d.line_total_cents / 3)
    else if (d.cadence === 'annual') monthlyCents += Math.round(d.line_total_cents / 12)
  }
}
// Stored as dollars in projects.monthly_value (cents / 100)
```

This is a snapshot taken at accept time. It does not auto-update if the project is later edited.

---

## TypeScript types (`src/lib/invoice-types.ts`)

```typescript
interface ProjectPhaseDeliverable {
  id: string; name: string; description: string
  cadence: 'one_time' | 'monthly' | 'quarterly' | 'annual'
  quantity?: number; hours?: number
  unit_price_cents?: number; line_total_cents?: number
  status: 'pending' | 'delivered'; delivered_at?: string | null
}

interface ProjectPhase {
  id: string; name: string; description: string
  status: 'pending' | 'in_progress' | 'completed'
  completed_at?: string | null
  deliverables: ProjectPhaseDeliverable[]
}

interface ProjectRow {
  id: string; prospect_id: string; sow_document_id: string | null
  name: string; status: string
  monthly_value: number | null
  phases: ProjectPhase[]
}
```

---

## API surface

| Route | Purpose |
|---|---|
| `GET /api/admin/projects` | List all projects |
| `GET /api/admin/projects/[id]` | Project detail with phases |
| `PATCH /api/admin/projects/[id]/phases/[phaseId]` | Update phase status |
| `PATCH /api/admin/projects/[id]/deliverables/[deliverableId]` | Mark deliverable delivered |

Admin pages: `/admin/projects` (list) + `/admin/projects/[id]` (detail with phase/deliverable management).

---

## Rollout notes

- Migration: `supabase/migrations/018b_client_lifecycle.sql`
- Apply: `supabase/migrations/APPLY-018-2026-04-22.sql`
- The prospect detail page at `/admin/prospects/[id]` shows a CLIENT emerald badge when `is_client = true`.
- The projects list at `/admin/projects` shows all projects with SOW links.

---

## Open questions

1. **Reverse transition (client → former client).** Not defined. If a client churns, there is no `is_former_client` flag or `churned_at` timestamp. The current approach would be to manually set `is_client = false` in SQL. A future enhancement: add a `churned_at` column and surface a "Mark as churned" action in the admin.
2. **`cancel_reason` on project.** If a project is abandoned after SOW acceptance, the project status can be set to `completed` with a note — but there is no first-class `cancelled` status. A `cancel_reason` field would make this cleaner.
3. **Phase-gated subscription start.** SOW deliverables with `start_trigger.type = 'on_phase_complete'` currently start subscriptions immediately on SOW accept, not when the referenced phase completes. Fixing this requires the project management system to emit events when a phase is marked completed, then trigger subscription activation. Not implemented as of 2026-04-24.
