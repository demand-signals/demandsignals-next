# SOW Lifecycle — Operational Runbook

**Owner:** Hunter (DSIG)
**Last updated:** 2026-04-24
**Scope:** End-to-end Statement of Work operations — creation, editing, sending, client acceptance, and all downstream side-effects triggered on accept.

> **The three things to know at 2am:**
> 1. **Accept is idempotent only on `is_client`.** If accept runs twice (double-click, retry), the second call returns 409 because SOW status is already `accepted`. The deposit invoice, project, and subscriptions are created once and once only.
> 2. **Missing `client_code` blocks new-format numbering.** If the prospect has no `client_code`, the SOW gets a legacy `SOW-YYYY-NNNN` number. Set the client_code at `/admin/prospects/[id]` first, then create the SOW.
> 3. **Phases = new model; `deliverables` flat array = legacy.** The UI writes phases. The PDF renderer and accept route both detect which shape is present via `sow.phases.length > 0`. Don't mix them on one document.

---

## Emergency procedures

### SOW stuck in `sent` — client can't accept

**Symptoms:** client complains the accept button errors; admin sees status = `sent`.

1. Check the UUID in the URL matches `public_uuid` in the DB:
   ```sql
   SELECT id, sow_number, status, public_uuid
   FROM sow_documents WHERE sow_number = 'SOW-HANG-042326A';
   ```
2. If UUID mismatch — client may have an old link. Re-send via `/admin/sow/[id]` → Send button.
3. If status is already `accepted` (double-click race): the deposit invoice was auto-created. Find it:
   ```sql
   SELECT invoice_number, total_due_cents, status
   FROM invoices WHERE id = (SELECT deposit_invoice_id FROM sow_documents WHERE sow_number = 'SOW-...');
   ```
4. If status is `void` — the SOW was voided by admin. Create a new SOW or un-void via direct SQL (exceptional — prefer new doc).

### Force-edit a non-draft SOW

Admin changed their mind after sending. The PATCH route rejects edits to non-draft status by default.

```bash
# PATCH /api/admin/sow/[id] with force_edit: true in body
# This allows editing sent/viewed SOWs. Accepted/void/declined are still protected.
```

Via UI: the SOW detail page shows a "Force Edit" warning toggle when status ≠ draft. Toggle it on, make changes, save.

**Important:** force-editing a `sent` SOW does NOT re-send it. After editing, use Send to deliver the updated version. The client's existing link will show updated content immediately (it reads from DB, not a cached PDF).

### Accept returned 500 — deposit invoice failed to create

```sql
-- Find the SOW that just failed:
SELECT id, sow_number, status, deposit_invoice_id FROM sow_documents
ORDER BY updated_at DESC LIMIT 5;

-- If deposit_invoice_id IS NULL and status IS NOT 'accepted':
-- The insert rolled back cleanly. Re-attempt accept from client side.
-- If deposit_invoice_id IS NULL but status IS 'accepted':
-- Partial commit. Create the invoice manually at /admin/invoices/new,
-- then link it:
UPDATE sow_documents SET deposit_invoice_id = '<invoice_id>'
WHERE id = '<sow_id>';
```

---

## Creation paths

### Path A — from scratch

1. Navigate to `/admin/sow/new`
2. Required: Title, Prospect (pick from dropdown), at least one Phase with at least one Deliverable, Pricing (total_cents + deposit%)
3. Prospect must have `client_code` set for new-format SOW numbering. If not, you'll get a legacy `SOW-YYYY-NNNN` number.
4. Default payment terms pre-populate: "Net 30. 25% deposit on acceptance; remainder on delivery."
5. Click Save → status = `draft`, SOW number allocated.

### Path B — from an Estimate (Continue to SOW)

1. Go to `/admin/quotes/[id]` for a quote session with an EST doc number
2. Click **Continue to SOW** button → calls `POST /api/admin/quotes/[id]/continue-to-sow`
3. A single Phase 1 is generated from the session's `selected_items`, mapping `pricing_type` to cadence (`one_time` / `monthly`)
4. You land on `/admin/sow/[id]` in edit mode — re-group deliverables into multiple phases as needed
5. If a SOW is already linked to this quote session, the button changes to "Open linked SOW →"

**API route:** `src/app/api/admin/quotes/[id]/continue-to-sow/route.ts`

---

## Phase hierarchy

A SOW contains one or more **Phases**. Each Phase contains one or more **Deliverables**.

```
SOW
  └── Phase (id, name, description)
        └── Deliverable (id, service_id?, name, description, cadence, quantity?, hours?, unit_price_cents?, line_total_cents?, start_trigger?)
```

**Cadence options per deliverable:**
| Value | Meaning | Affects |
|---|---|---|
| `one_time` | Single charge, included in project total | One-time total on SOW + deposit calc |
| `monthly` | Recurring monthly | Subscription created on accept; monthly_value on project |
| `quarterly` | Recurring quarterly | Subscription created on accept; annualized /12 for monthly_value |
| `annual` | Recurring annual | Subscription created on accept; annualized /12 for monthly_value |

**Start trigger (per deliverable):**
```json
{ "type": "on_phase_complete", "phase_id": "<id_of_prior_phase>" }
{ "type": "date", "date": "2026-06-01" }
```
If no start_trigger, recurring deliverables begin at SOW accept (now). The project `monthly_value` field uses these same phase-complete triggers to activate gated subscriptions — that wiring is still TODO as of 2026-04-24.

**TypeScript type:** `SowPhase` / `SowPhaseDeliverable` in `src/lib/invoice-types.ts`

---

## Preview PDF before sending

The admin SOW detail page has a **Preview PDF** button. This calls:
```
GET /api/admin/sow/[id]/pdf
```
Which renders the HTML template via Chromium and returns `Content-Type: application/pdf`. First call per cold serverless instance takes 4–6 seconds while the 60 MB Chromium binary downloads to `/tmp`. Subsequent calls on the same instance are fast.

The HTML preview (fast, no Chromium, no binary) is available inline in the admin detail page — it uses `src/lib/doc-preview.ts` `renderSowHtml()` directly.

See `pdf-pipeline.md` for PDF rendering internals.

---

## Send flow

1. On SOW detail: click **Send**
2. Status transitions: `draft` → `sent`
3. `sent_at` stamped; `send_date` set to today if blank
4. Client magic link URL: `https://demandsignals.co/sow/[sow_number]/[public_uuid]`
5. URL is shown in admin UI for copying. Email/SMS delivery is manual today — paste the URL.

**API route:** `PATCH /api/admin/sow/[id]` with `{ status: 'sent' }`

---

## Client acceptance — what happens on POST /api/sow/public/[number]/accept

Source: `src/app/api/sow/public/[number]/accept/route.ts`

The client POSTs `{ key: public_uuid, signature: "Typed Full Name" }`. In order:

1. **SOW status** → `accepted`; stamps `accepted_at`, `accepted_signature`, `accepted_ip`
2. **Deposit invoice created** with status `sent`:
   - Line 0: Deposit (e.g., $1,500 for 25% of $6,000)
   - Lines 1–N: New Client Appreciation value-stack items at full price ($3,250 total)
   - Line N+1: "New Client Appreciation" −$3,250 discount
   - `total_due_cents` = deposit amount only
   - INV- number allocated via `allocateDocNumber()` or legacy fallback
3. **Subscriptions materialized** for every monthly/quarterly/annual deliverable in phases
4. **Trade credit row created** if `sow.trade_credit_cents > 0`
5. **Prospect flipped to client**: `prospects.is_client = true`, `became_client_at = now()` (idempotent — only if `is_client = false`)
6. **Project row created** with phases copied from SOW, all statuses = `pending`

Response returns `{ accepted: true, deposit_invoice: { number, amount_cents, public_url, pay_url } }`.

Client is redirected to the deposit invoice pay page.

---

## Trade-in-Kind (TIK) on SOW

Field: `sow_documents.trade_credit_cents` (migration 023a)

When set, the SOW pricing section shows:
```
One-time project total:    $10,000
Trade-in-Kind credit:     −$2,000   (e.g., "Website design provided by client")
Cash project total:         $8,000
Deposit (25%):              $2,000
Balance on delivery:        $6,000
```

On accept, a `trade_credits` row is created with `status = 'outstanding'` and `remaining_cents = trade_credit_cents`. Admin tracks drawdowns at `/admin/trade-credits` (soon).

---

## Deleting a SOW

Only `draft` status SOWs can be deleted via the admin UI. Attempting to delete a non-draft SOW returns 409.

Direct SQL delete is possible for testing/cleanup only:
```sql
-- CAUTION: Only for dev/test cleanup. Production non-draft SOWs are records.
DELETE FROM sow_documents WHERE id = '<id>' AND status = 'draft';
```

If you need to cancel a sent SOW: use Void (status → `void`) instead of delete.

---

## Troubleshooting

### "client_code required" error on SOW creation

The prospect has no `client_code`. Fix:
1. Go to `/admin/prospects/[id]`
2. Set a 4-letter client code (auto-suggested; must be unique)
3. Save
4. Retry SOW creation

See `document-numbering.md` for client_code conventions.

### 409 on PATCH (force_edit required)

Status is not `draft`. Use force_edit flag (UI toggle or add `"force_edit": true` to PATCH body).

### Legacy vs phase-model SOW

SOWs created before migration 018a use `deliverables[]` flat array and `timeline[]`. Newer SOWs use `phases[]`. The HTML renderer (`doc-preview.ts`) detects via `sow.phases.length > 0`. The PDF renderer (`src/lib/pdf/sow.ts`) does the same. Don't add `phases` to a legacy SOW or mix both shapes — pick one.

To check which model a SOW uses:
```sql
SELECT sow_number,
  jsonb_array_length(phases) AS phase_count,
  jsonb_array_length(deliverables) AS deliverable_count
FROM sow_documents WHERE sow_number = 'SOW-...';
```

### Deposit invoice shows PENDING- number

Numbering allocation failed mid-create (prospect likely had no `client_code` at that moment AND the legacy `generate_invoice_number()` RPC also failed). Fix:
```sql
-- Get the invoice row
SELECT id, invoice_number FROM invoices WHERE invoice_number LIKE 'PENDING-%' ORDER BY created_at DESC LIMIT 5;

-- Allocate a legacy number manually
SELECT generate_invoice_number();
-- Then update:
UPDATE invoices SET invoice_number = '<result>' WHERE id = '<invoice_id>';
-- Also log in document_numbers if you want audit trail:
-- INSERT INTO document_numbers (...) VALUES (...);
```

---

## Cross-references

- `document-numbering.md` — numbering format and allocation mechanics
- `pdf-pipeline.md` — Chromium PDF rendering
- `client-lifecycle.md` — is_client flip + project creation on accept
- `receipts-and-payments.md` — marking the deposit invoice paid
- `magic-link-public-pages.md` — the `/sow/[number]/[uuid]` microsite client sees
