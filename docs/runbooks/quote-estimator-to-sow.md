# Quote Estimator → SOW Continuation — Operational Runbook

**Owner:** Hunter (DSIG)
**Last updated:** 2026-04-24
**Scope:** The EST-to-SOW bridge — how an estimate session becomes a Statement of Work, the lazy EST doc number, and the Continue to SOW button.

> **The three things to know at 2am:**
> 1. **EST numbers are allocated lazily.** `quote_sessions.doc_number` stays NULL until the session is linked to a prospect with a `client_code`. The link happens via `syncProspectFromSession()` — triggered by the research confirmation step in `/quote`. If a session has no prospect link, it has no EST number and the Continue to SOW button will use whatever the admin enters manually.
> 2. **"Continue to SOW" creates a single Phase 1** with all selected items dumped into it. Admin always needs to re-group deliverables into proper phases after the fact. The button is a starting point, not a finished SOW.
> 3. **If a SOW is already linked, the button changes to "Open linked SOW →".** The link is stored on `sow_documents.quote_session_id`. One session → at most one linked SOW (enforced by the continue-to-sow route checking for an existing row).

---

## Emergency procedures

### Continue to SOW button is missing

The button only appears when:
1. Session has a linked prospect (`prospect_id` is not null)
2. Session has an EST doc number OR the admin can create without one

If the button doesn't appear at `/admin/quotes/[id]`:
1. Check if the session has `prospect_id` set:
   ```sql
   SELECT id, prospect_id, doc_number FROM quote_sessions WHERE id = '<id>';
   ```
2. If `prospect_id` is null: the session was never linked to a prospect. Either link it manually (update the prospect_id) or create the SOW from scratch at `/admin/sow/new`

### EST number never allocated (session shows no EST badge)

1. Check the session:
   ```sql
   SELECT id, prospect_id, doc_number FROM quote_sessions WHERE id = '<id>';
   ```
2. If `prospect_id` is set but `doc_number` is null: the lazy allocation didn't run (prospect may not have had `client_code` when the link was made)
3. Fix: ensure the prospect has a `client_code`, then trigger allocation manually:
   ```sql
   -- Manually call the allocation (service_role only)
   SELECT allocate_document_number('EST', 'HANG', 'quote_sessions', '<session_uuid>'::uuid);
   -- Then update the session:
   UPDATE quote_sessions SET doc_number = '<result>' WHERE id = '<session_uuid>';
   ```

### SOW created from Continue to SOW has wrong phase items

Expected behavior — "Continue to SOW" maps all selected_items into Phase 1 with a simple pricing_type → cadence mapping. Admin re-groups them at `/admin/sow/[id]` after creation.

If items are missing (some selected items didn't get into Phase 1): check that the session's `selected_items` jsonb is populated:
```sql
SELECT selected_items FROM quote_sessions WHERE id = '<id>';
```

---

## EST doc number — lazy allocation

**Migration:** `021a_quote_session_doc_number.sql`

`quote_sessions.doc_number` column added. Unique when set (`ux_quote_sessions_doc_number` partial index).

**Allocation trigger:** `syncProspectFromSession()` in `src/lib/quote-prospect-sync.ts`

This function is called:
- When the `/quote` flow's research subagent confirms a business (auto-creates/updates prospect record)
- On admin-initiated prospect sync at `/admin/quotes/[id]` → Sync Prospect

What it does:
1. Ensures a prospect row exists (creates or updates from session data)
2. Sets `quote_sessions.prospect_id = prospect.id`
3. If prospect has `client_code` AND session has no `doc_number`: calls `allocateDocNumber({ doc_type: 'EST', prospect_id, ref_table: 'quote_sessions', ref_id: session.id })`
4. Updates `quote_sessions.doc_number` with the result

If the prospect has no `client_code` at sync time: allocation is skipped silently. The session gets an EST number later when `client_code` is added and the admin re-syncs.

**Admin UI:** `/admin/quotes/[id]` shows the EST badge `EST-HANG-042226A` in the header when `doc_number` is set.

---

## Continue to SOW — what happens

**Button:** `/admin/quotes/[id]` → "Continue to SOW"

**API route:** `POST /api/admin/quotes/[id]/continue-to-sow`

Source: `src/app/api/admin/quotes/[id]/continue-to-sow/route.ts`

**Idempotency check:** the route first queries:
```sql
SELECT id FROM sow_documents WHERE quote_session_id = '<session_id>';
```
If a row exists → returns `{ sow_id, sow_number, already_exists: true }` and the button becomes "Open linked SOW →".

**If no SOW exists, it creates one:**

1. Loads the session + its `selected_items` (derived from `quote_events` via `recompute_session_state()`)
2. Maps each selected item to a deliverable using `pricing_type` → `cadence`:
   - `one_time` → `cadence: 'one_time'`
   - `monthly` → `cadence: 'monthly'`
   - `both` → `cadence: 'one_time'` (default; admin can change)
3. Creates a single Phase 1 with all items as deliverables
4. Creates the SOW via `POST /api/admin/sow` (standard SOW creation endpoint, gets a proper SOW number)
5. Sets `sow_documents.quote_session_id = session.id`
6. Returns `{ sow_id, sow_number }` and redirects admin to `/admin/sow/[id]`

**What you do next (always):**
1. Review Phase 1 deliverables — verify names, descriptions, pricing
2. Re-group into proper phases (most projects need 2-4 phases)
3. Add payment_terms, guarantees, scope_summary
4. Add Trade-in-Kind if applicable
5. Preview PDF to verify layout
6. Send to client

---

## How the link is stored

```
sow_documents.quote_session_id   FK → quote_sessions.id
quote_sessions.prospect_id       FK → prospects.id
```

The SOW and the session are permanently linked. When admin views `/admin/quotes/[id]`, if a linked SOW exists, a "View SOW" button appears. When admin views `/admin/sow/[id]`, a "View Source Quote" badge appears (if `quote_session_id` is set).

---

## pricing_type to cadence mapping

`services_catalog.pricing_type` controls how a service appears in the quote vs. retainer:

| pricing_type | Default cadence in Phase 1 | Notes |
|---|---|---|
| `one_time` | `one_time` | Website builds, one-off audits |
| `monthly` | `monthly` | SEO, social management, GBP admin |
| `both` | `one_time` | Admin should change to `monthly` if appropriate |

After the SOW is created, admin changes cadence per deliverable in the SOW editor.

---

## EST → SOW → INV chain

The full lifecycle links:
```
quote_sessions (EST-HANG-042226A)
  ↓ quote_session_id
sow_documents (SOW-HANG-042326A)
  ↓ deposit_invoice_id (on accept)
invoices (INV-HANG-042326A)
  ↓ invoice_id
receipts (RCT-HANG-043026A)
```

Query to see the full chain for a prospect:
```sql
SELECT
  qs.doc_number AS est_number,
  sd.sow_number,
  i.invoice_number AS deposit_invoice,
  i.status AS inv_status,
  r.receipt_number
FROM quote_sessions qs
LEFT JOIN sow_documents sd ON sd.quote_session_id = qs.id
LEFT JOIN invoices i ON i.id = sd.deposit_invoice_id
LEFT JOIN receipts r ON r.invoice_id = i.id
WHERE qs.prospect_id = '<prospect_id>'
ORDER BY qs.created_at DESC;
```

---

## Troubleshooting

### "already_exists: true" but I can't find the linked SOW

```sql
SELECT id, sow_number, status FROM sow_documents
WHERE quote_session_id = '<session_id>';
```

If found but admin can't navigate there: the SOW may have been deleted (status = null means hard delete). In that case, the FK is gone. Re-run the continue-to-sow request — it'll create a new SOW.

### Selected items are empty in Phase 1

`selected_items` on the session is computed from `quote_events` via `recompute_session_state()`. If events are empty (session was admin-created without any prospect interaction):
```sql
SELECT COUNT(*) FROM quote_events WHERE session_id = '<id>' AND event_type LIKE 'item_%';
```
If 0: no items were ever selected. Add them manually after SOW creation.

### Cadence wrong on Phase 1 deliverables

All `monthly` catalog items came through as `one_time` — this means the `pricing_type` on those services_catalog rows isn't `monthly`. Check:
```sql
SELECT id, name, pricing_type FROM services_catalog
WHERE id IN (/* selected item ids from session */);
```

Update pricing_type if wrong, then delete the Phase 1 deliverables and re-run continue-to-sow.

---

## Cross-references

- `sow-lifecycle.md` — full SOW operations after creation
- `document-numbering.md` — EST number allocation mechanics
- `services-catalog.md` — pricing_type values that control cadence mapping
- `quote-estimator.md` (existing) — the `/quote` flow where sessions originate
