# SOW lockdown after acceptance — deferred

**Status:** DEFERRED — written 2026-05-04, not scheduled
**Trigger to revisit:** second team member onboarded OR Hunter catches himself confused about which doc to edit
**Related:** [`2026-04-24-client-lifecycle.md`](./2026-04-24-client-lifecycle.md) (SHIPPED — what happens at acceptance)

---

## Problem

Once a SOW is `accepted`, the system has materialized:
- A **project** (with phases, deliverables, status)
- A **deposit invoice** (sometimes a payment plan + Stripe subscription)
- A **trade-credits ledger** (when TIK applies)
- A **subscription** (when recurring)
- The prospect is flipped to `is_client = true`
- An R2 PDF of the contract

From that point forward, the prevailing documents for ongoing work are the **project, invoices, TIK ledger, and subscription**. The SOW itself is a historical artifact — the original signed contract.

Today's gap: the SOW edit page lets admins keep editing scope/pricing/phase content after acceptance. Those edits don't propagate to any of the materialized downstream artifacts, so the SOW silently drifts from reality. Team members assume their edits matter; they don't.

## Why deferred

Hunter's question 2026-05-04: "is the juice worth the squeeze here at this time?"

The team confusion cost is **theoretical** at current scale (1 operator). The drift symptom that triggered this discussion ("we changed the SOW but project + TIK titles persist") was solved narrowly with inline-editable names on `/admin/projects/[id]` and `/admin/trade-credits/[id]` — see commit landing 2026-05-04. Those fields can now be edited as live working names, independent of the SOW's snapshot.

The full architectural cleanup is correct but premature.

## Trigger to revisit

Ship this when one of:
- A second team member is onboarded and starts editing SOWs
- Hunter catches himself confused about which doc to edit on a real client
- A client asks for a scope change and the change-order flow doesn't already exist in muscle memory
- Three or more SOWs in a quarter where post-acceptance edits caused observable drift

## Design when revisited

### 1. Lock down the SOW edit page when status=accepted

In `src/app/admin/sow/[id]/page.tsx`:
- All scope/pricing/phase/deliverable inputs become read-only (`disabled` + visual treatment)
- Cover content (eyebrow, tagline) and notes remain editable — they're cosmetic and don't drive any other system
- Banner at top: "This SOW is the original contract. Make changes on the project, invoice, TIK ledger, or via change order."
- Action buttons that DO appear: View Project, View Deposit Invoice, View TIK, View Subscription, **Create Change Order**, Download PDF
- The existing `Edit` / `Save` buttons stay for cosmetic fields only

### 2. Hide accepted SOWs from `/admin/sow` by default

In `src/app/admin/sow/page.tsx`:
- Default status filter: `[draft, sent, viewed]` — the "active work" view
- Toggle pill: "Show accepted (historical)" — surfaces them when needed
- Sidebar SOW count badge counts only active

### 3. Surface accepted SOWs in client-context places

- Project page header: "Source contract: SOW-XXXX-XXXXXX" link
- Prospect detail page: "Documents" section continues to list all SOWs in chronological order with status pills
- Manage Clients menu (per Hunter's note 2026-05-04) gets a "Contracts" view that lists historical SOWs by client

### 4. Wire change orders properly

The `sow_documents.parent_sow_id` column exists (migration 025b). The `Convert SOW to Project` flow already partially uses it.

For change orders specifically:
- New button on accepted SOW: "Create Change Order"
- Routes to `/admin/sow/new?parent=<sow_id>` with phases pre-populated from parent
- On acceptance of the change order:
  - Original SOW marked `status='superseded'` (new enum value) — keep audit trail
  - Project phases updated from new SOW phases (delete-and-recreate by id, preserving execution status where ids match)
  - Deposit invoice for the *delta* only (not full project value)
  - TIK ledger adjusted (new ledger row for added TIK; existing ledger drawn-down adjustment if scope removed)

## Out of scope

- **Live two-way sync** (Path B from the 2026-05-04 conversation) — explicitly rejected. Editing accepted SOWs and cascading to project state is a footgun that creates more bugs than it solves.
- **Auto-merging change orders** — admin always reviews + accepts the new SOW. No silent rewrites.

## Files this would touch

```
src/app/admin/sow/[id]/page.tsx        — lock fields, banner, change-order button
src/app/admin/sow/page.tsx              — default filter, toggle pill
src/app/admin/projects/[id]/page.tsx    — source-contract link
src/components/admin/admin-sidebar.tsx  — count badge logic
src/app/api/admin/sow/[id]/route.ts     — block PATCH on locked fields when accepted
```

Plus a migration adding `'superseded'` to `sow_documents.status` enum if we don't already have it.

## What's already shipped on the path to this

- Migration 025b: `sow_documents.parent_sow_id` column
- Commit landing 2026-05-04: inline-editable name on project + TIK pages (lets admins keep names accurate without touching the SOW)
- Commit `6a07558` (2026-05-04): DELETE `/api/admin/sow/[id]` blocks on accepted/declined/void status — accepted SOWs already append-only at the API level

The remaining work is UI affordances + the change-order flow.
