# Document Numbering — Retrospective Spec

**Date:** 2026-04-24
**Status:** SHIPPED
**Author:** Hunter / Claude (retrospective capture)
**See also:** `docs/runbooks/document-numbering.md` for operational procedures

---

## Problem

Documents (invoices, SOWs, estimates, receipts) were numbered by a sequential global counter:
`DSIG-2026-0001`, `SOW-2026-0001`. These numbers had several deficiencies:

1. **Not client-scoped.** You couldn't tell from the number alone which client it belonged to. Pulling invoice 0042 from a pile required looking up the record.
2. **Not day-scoped.** If Hunter needed to audit "everything issued Tuesday," there was no way to filter the number itself — only a date column on the row.
3. **Single-sequence collision risk.** A race condition between two simultaneous creates could produce duplicate sequence values before the UNIQUE constraint fires.
4. **No type prefix disambiguation beyond the sequence name.** `DSIG-2026-0042` looked the same whether it was an invoice or an estimate.

---

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Sequential per project (`DSIG-2026-0001`) — legacy | Simple | Not client-scoped, no day audit, hard to file physically |
| Hash-based (`INV-A3F9B2`) | Compact, collision-resistant | Unreadable, no sort order, no temporal signal |
| Timestamp-based (`INV-20260423-143022`) | Precise | Long, awkward for verbal reference, timezone ambiguity |
| YYYY-NNNN sequential (legacy) | Already shipped | Same problems as above but with year reset |
| **TYPE-CLIENT-MMDDYY{SUFFIX} (chosen)** | Client-scoped, day-scoped, short, human-readable, collision-free via row-lock | Requires client_code to be set before creating documents |

---

## Chosen approach

```
TYPE-CLIENT-MMDDYY{SUFFIX}

Where:
  TYPE      = EST | SOW | INV | RCT
  CLIENT    = 4-letter client_code (uppercase), e.g. HANG, DSIG, CREE
  MMDDYY    = date in America/Los_Angeles timezone
  SUFFIX    = sequential letter per (type, client, date): A, B, ..., Z, AA, AB, ...
```

**Examples:**
```
SOW-HANG-042326A    — first SOW for Hangtown prospect on 2026-04-23
INV-HANG-042326A    — first invoice for same prospect same day
INV-HANG-042326B    — second invoice same prospect same day
RCT-DSIG-043026A    — first receipt for DSIG client on 2026-04-30
```

Types never share a suffix series: `INV-HANG-042326A` and `SOW-HANG-042326A` are both valid A's.

---

## Rationale

- **4-letter client code** is short enough for verbal reference ("that's invoice Hang-zero-four-twenty-three-A") and long enough to accommodate ~456,000 unique businesses without collision.
- **MMDDYY date** makes the daily audit trivial: "show me all HANG invoices from the 23rd" is a string prefix search. No date column JOIN needed.
- **Suffix-per-day** means each day resets to A. An invoice numbered B or C on a given day signals "we issued multiple this day" — useful context for review.
- **Suffix rolls past Z to AA, AB, ...** — practically unlimited volume per day per client.

---

## Data model

### `prospects.client_code` (migration 019a)

- `text` column, 4-letter uppercase, UNIQUE when set (`WHERE client_code IS NOT NULL`)
- NULL for prospects without a code — legacy fallback triggers instead
- Set at `/admin/prospects/[id]` before creating any documents

### `document_numbers` audit table (migration 019a)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `doc_number` | text UNIQUE | Issued number, e.g. `INV-HANG-042326A` |
| `doc_type` | text | EST / SOW / INV / RCT |
| `client_code` | text | 4-letter code at issue time |
| `date_key` | text | MMDDYY at LA timezone |
| `suffix` | text | A, B, ..., AA, ... |
| `ref_table` | text | `invoices` / `sow_documents` / `receipts` / `quote_sessions` |
| `ref_id` | uuid | Row in that table |
| `created_at` | timestamptz | When allocated |

**RLS:** admin read only. All writes are service_role only via the `allocate_document_number()` RPC.

---

## API surface

### Supabase RPC

```sql
SELECT allocate_document_number(
  p_doc_type    text,   -- 'INV', 'SOW', 'RCT', 'EST'
  p_client_code text,
  p_ref_table   text,
  p_ref_id      uuid
) RETURNS text;         -- e.g. 'INV-HANG-042326B'
```

The RPC uses `SELECT ... FOR UPDATE` row-locking on the last suffix for that `(type, client, date)` combination. It is atomic — safe to call concurrently.

Granted to `service_role` only. `anon` and `authenticated` are REVOKED.

### TypeScript wrapper (`src/lib/doc-numbering.ts`)

```typescript
// Looks up client_code from prospect_id, calls the RPC
await allocateDocNumber({
  doc_type: 'INV',
  prospect_id: prospect.id,
  ref_table: 'invoices',
  ref_id: invoice.id,
})
```

If `prospect_id` is null or the prospect has no `client_code`, the function throws. Callers catch and fall back to legacy RPCs (`generate_invoice_number()`, `generate_sow_number()`).

### Client code helpers

```typescript
suggestClientCode(businessName: string): string
// Strips noise words, maps digits to letters, truncates/pads to 4 chars

suggestAvailableClientCode(base: string): Promise<string>
// Auto-increments until it finds an available code (HANG → HANB → HANC → ...)
```

### Availability check

```
GET /api/admin/config?check_client_code=HANG
→ { available: true | false }
```

---

## Rollout notes

- **Migration:** `supabase/migrations/019a_client_code_and_doc_numbering.sql`
- **Apply file:** `supabase/migrations/APPLY-019-2026-04-23.sql`
- **Legacy numbers preserved as-is.** Documents created before 019a keep `DSIG-2026-NNNN` / `SOW-YYYY-NNNN` formats. No backfill.
- **Legacy fallback stays.** If a prospect has no `client_code`, all four doc types fall back to the legacy sequential RPCs. This prevents breaking new-document creation on existing prospects.
- **PENDING- prefix signals a failed allocation.** If the create route inserted the row but the allocation RPC failed, the document gets a `PENDING-<uuid>` number. Fix by running the legacy RPC manually and updating the row. See `docs/runbooks/document-numbering.md`.

---

## Open questions

1. **Prospects without client_code that need documents urgently.** Currently the fallback to legacy RPCs handles this silently. A future improvement: block document creation until admin sets a client_code, rather than silently issuing a legacy number.
2. **Multi-client bulk invoicing.** If we ever issue invoices to 50 clients in one batch, the per-row lock may serialize allocation. Likely acceptable; monitor if batch jobs are added.
3. **Receipt numbers on legacy invoices.** An invoice marked-paid that has a legacy `DSIG-2026-NNNN` number will emit a `RCT-CLIENT-MMDDYY{A}` receipt if the prospect now has a client_code. The receipt number format and invoice number format will differ. This is acceptable but should be noted on the receipt PDF.
