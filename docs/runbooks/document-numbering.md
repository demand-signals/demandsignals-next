# Document Numbering — Operational Runbook

**Owner:** Hunter (DSIG)
**Last updated:** 2026-04-24
**Scope:** Platform-wide document number format, allocation mechanics, client_code management, legacy number preservation, and collision handling.

> **The three things to know at 2am:**
> 1. **Missing `client_code` = no new-format number.** SOW, INV, and RCT creation falls back to legacy sequential numbers (`SOW-YYYY-NNNN`, `DSIG-YYYY-NNNN`) when the prospect has no `client_code`. Set the code first, then create documents.
> 2. **`allocate_document_number()` is atomic.** It row-locks, computes next suffix, inserts into `document_numbers`, and returns in one transaction. Never call it outside a server-side route — it uses service_role only.
> 3. **`document_numbers` is the audit log.** Every issued number is there. If you see a PENDING- invoice, the allocation failed. Fix by running `SELECT generate_invoice_number()` and `UPDATE invoices SET invoice_number = '...'`.

---

## Emergency procedures

### Duplicate-key error on document creation

**Symptom:** 500 on invoice/SOW create with `duplicate key value violates unique constraint`.

1. Check if a number was already allocated:
   ```sql
   SELECT doc_number, doc_type, ref_table, ref_id, created_at
   FROM document_numbers
   WHERE doc_number = '<number in error>';
   ```
2. If the ref_id points to a real row — a previous request partially succeeded. Find the existing row and return it to the admin instead of creating a new one.
3. If ref_id points to a deleted row — stale audit entry. Manually insert the next suffix:
   ```sql
   -- Check what suffix comes next for this date
   SELECT suffix FROM document_numbers
   WHERE doc_type = 'INV' AND client_code = 'HANG' AND date_key = '042326'
   ORDER BY length(suffix) DESC, suffix DESC LIMIT 1;
   -- If last was 'A', next is 'B'. If 'Z', next is 'AA'.
   ```

### PENDING- invoice or SOW in production

A PENDING- prefix means the create route ran but numbering allocation failed after insert.

```sql
-- Find pending rows
SELECT id, invoice_number, created_at FROM invoices WHERE invoice_number LIKE 'PENDING-%';

-- Fix: allocate a legacy number manually
SELECT generate_invoice_number();
-- Returns e.g. 'DSIG-2026-0042'. Then:
UPDATE invoices SET invoice_number = 'DSIG-2026-0042' WHERE id = '<id>';

-- For SOW:
SELECT generate_sow_number();
UPDATE sow_documents SET sow_number = 'SOW-2026-0012' WHERE id = '<id>';
```

---

## Format specification

```
TYPE-CLIENT-MMDDYY{SUFFIX}

Where:
  TYPE      = EST | SOW | INV | RCT
  CLIENT    = 4-letter client_code (uppercase), e.g. HANG, DSIG, CREE
  MMDDYY    = date in Los Angeles timezone (America/Los_Angeles)
  SUFFIX    = sequential letter per (type, client, date): A, B, ..., Z, AA, AB, ...
```

**Examples:**
```
SOW-HANG-042326A    # First SOW for Hangtown prospect on 2026-04-23
INV-HANG-042326A    # First invoice for same prospect same day
INV-HANG-042326B    # Second invoice same prospect same day
EST-CREE-042226A    # Estimate for Creekside Endodontics on 2026-04-22
RCT-DSIG-043026A    # First receipt for DSIG client on 2026-04-30
```

**Notes:**
- Types never share a suffix series. INV-HANG-042326A and SOW-HANG-042326A are both valid (A each, different type series).
- Suffix rolls to two letters after Z: Z → AA → AB → ... → AZ → BA → ... → ZZ → AAA.
- Date is always Los Angeles local time at the moment of allocation.

---

## `document_numbers` table

Migration: `019a_client_code_and_doc_numbering.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `doc_number` | text UNIQUE | The issued number, e.g. INV-HANG-042326A |
| `doc_type` | text | EST / SOW / INV / RCT |
| `client_code` | text | 4-letter code at time of issue |
| `date_key` | text | MMDDYY at LA timezone |
| `suffix` | text | A, B, ..., AA, ... |
| `ref_table` | text | invoices / sow_documents / receipts / quote_sessions |
| `ref_id` | uuid | Row in that table |
| `created_at` | timestamptz | When allocated |

**RLS:** admin read only. All writes go through service_role via `allocate_document_number()` RPC.

---

## `prospects.client_code`

Migration: `019a_client_code_and_doc_numbering.sql`

- 4-letter uppercase code, e.g. `HANG`, `CREE`, `ENDO`
- NULL for prospects without a code (new installs, old imports)
- Unique when set: `CREATE UNIQUE INDEX ux_prospects_client_code ON prospects (client_code) WHERE client_code IS NOT NULL;`
- Auto-suggested by `suggestClientCode()` in `src/lib/doc-numbering.ts`: takes business name, strips noise words, maps digits to letters, truncates/pads to 4 chars, calls `GET /api/admin/config?check_client_code=XXXX` to verify availability
- Admin can override the suggestion
- **Set it before creating any documents for that prospect** — numbering falls back to legacy when NULL

### Setting client_code in bulk via SQL

For the batch import of 142 prospects, set codes via:

```sql
-- Step 1: Tokenize business name + pick first 4 consonant-ish letters
-- (Manual review recommended for the first 50; automate the rest)

-- Pattern for a business: grab first word, take first 4 letters, uppercase
UPDATE prospects
SET client_code = UPPER(SUBSTR(REGEXP_REPLACE(business_name, '[^A-Za-z]', '', 'g'), 1, 4))
WHERE client_code IS NULL
  AND LENGTH(REGEXP_REPLACE(business_name, '[^A-Za-z]', '', 'g')) >= 4;

-- This will fail for some due to collisions. Find them:
WITH generated AS (
  SELECT id, UPPER(SUBSTR(REGEXP_REPLACE(business_name, '[^A-Za-z]', '', 'g'), 1, 4)) AS code
  FROM prospects WHERE client_code IS NULL
)
SELECT code, COUNT(*) FROM generated GROUP BY code HAVING COUNT(*) > 1;

-- For collisions: manually assign codes or append a digit converted to letter
-- (0→A, 1→B, etc. per the slugging convention)
```

**Never backfill `document_numbers` rows** for documents created before numbering landed — those use legacy formats and are preserved as-is.

---

## `allocate_document_number()` RPC

Source: `supabase/migrations/019a_client_code_and_doc_numbering.sql`

```sql
-- Signature (service_role only — anon and authenticated are REVOKED)
SELECT allocate_document_number(
  p_doc_type    text,   -- 'INV', 'SOW', 'RCT', 'EST'
  p_client_code text,   -- must be non-null, non-empty
  p_ref_table   text,   -- 'invoices', 'sow_documents', etc.
  p_ref_id      uuid    -- the new row's id
) RETURNS text;         -- e.g. 'INV-HANG-042326B'
```

**Application wrapper:** `allocateDocNumber()` in `src/lib/doc-numbering.ts`

```typescript
// Looks up client_code from prospect_id, then calls the RPC
await allocateDocNumber({
  doc_type: 'INV',
  prospect_id: prospect.id,   // looked up to get client_code
  ref_table: 'invoices',
  ref_id: invoice.id,
})
```

If `prospect_id` is null or prospect has no `client_code`, the function throws — callers must catch and fall back to legacy RPCs (`generate_invoice_number()`, `generate_sow_number()`).

---

## Document type details

### EST — Estimate

- Stored on `quote_sessions.doc_number`
- **Lazy allocation**: assigned when a quote session is first linked to a prospect (i.e., on `syncProspectFromSession()` when the session gets a `prospect_id`)
- Sessions without a linked prospect stay NULL
- EST numbers appear in the admin quote list as a badge

### SOW — Statement of Work

- Stored on `sow_documents.sow_number`
- Allocated on `POST /api/admin/sow` (create) or `POST /api/admin/quotes/[id]/continue-to-sow`
- Pattern: insert with `PENDING-<uuid>` → allocate → update

### INV — Invoice

- Stored on `invoices.invoice_number`
- Allocated on `POST /api/admin/invoices` (admin-created) and `POST /api/sow/public/[number]/accept` (auto-created deposit)
- Same temp-insert → allocate → update pattern

### RCT — Receipt

- Stored on `receipts.receipt_number`
- Allocated on `POST /api/admin/invoices/[id]/mark-paid`
- Same temp-insert → allocate → update pattern

---

## Legacy numbers

Documents created before migration 019a have numbers in these formats:
```
DSIG-2026-0001    # legacy invoice (generate_invoice_number() RPC)
SOW-2026-0001     # legacy SOW (generate_sow_number() RPC)
```

These are preserved as-is. **No backfill.** The legacy RPC sequences (`invoice_number_seq`, `sow_number_seq`) continue to exist as fallback for edge cases (no client_code).

Do not renumber legacy documents. If a client asks "why do my numbers change format?", the answer is: we upgraded our numbering system in April 2026. Legacy numbers are still valid.

---

## Availability check endpoint

Before the admin assigns a client_code, the UI calls:
```
GET /api/admin/config?check_client_code=HANG
→ { available: true | false }
```

This is a live check against the `prospects` table. The `suggestAvailableClientCode()` function in `src/lib/doc-numbering.ts` auto-increments (HANG → HANB → HANC → ...) until it finds an available code.

---

## Troubleshooting

### "client_code required" on allocation

The `allocateDocNumber()` call got a prospect_id but the prospect has no `client_code`. Solution:
1. Set `client_code` at `/admin/prospects/[id]`
2. Retry the operation

### Column not found on `document_numbers`

Migration 019a not applied. Verify:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'document_numbers';
-- Should return: id, doc_number, doc_type, client_code, date_key, suffix, ref_table, ref_id, created_at
```

If empty: apply `APPLY-019-2026-04-23.sql` via Supabase SQL Editor.

### Suffix jumped (skipped A, started at B)

The `SELECT ... FOR UPDATE` lock in the RPC is row-level. If two concurrent creates race on the same (type, client, date), one will win and the other gets the next suffix. No numbers are lost — they're allocated sequentially within the transaction. A "skipped" suffix means a parallel request won the lock first.

---

## Cross-references

- `sow-lifecycle.md` — how numbering integrates with SOW creation
- `supabase-migrations.md` — how to apply 019a if not yet applied
- `receipts-and-payments.md` — RCT number allocation on mark-paid
