# Trade-in-Kind Accounting — Retrospective Spec

**Date:** 2026-04-24
**Status:** SHIPPED
**Author:** Hunter / Claude (retrospective capture)
**See also:** `docs/runbooks/sow-lifecycle.md` for SOW operations; migration `023a_sow_trade_in_kind.sql`

---

## Problem

Some DSIG clients pay a portion of their project fee in trade — their services or goods delivered to DSIG instead of cash. Examples: a restaurant client might provide catering for a DSIG event in lieu of paying a portion of their website build fee; a photography client might provide headshots for the DSIG team.

Before this change, trade arrangements were tracked informally — a note in the SOW's `guarantees` or `notes` text field, or an informal agreement outside the system. Consequences:

1. **No cash projection.** The total on the SOW looked like a cash total, but the actual cash to collect was lower by the trade amount. Finance tracking was inaccurate.
2. **No audit trail.** Trade arrangements were in free-form text, not a structured field. Querying "how much trade credit is outstanding?" was impossible.
3. **PDF rendering showed the wrong "amount due."** The PDF rendered the full SOW total as cash due, which was incorrect when a trade credit applied.

---

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| **Keep in `notes` / `guarantees` text field** | Zero migration cost | Not queryable; PDF renders wrong amount; no audit trail |
| **Separate `trade_credits` table** | Full ledger with draw-down tracking | Significant complexity for what is currently a simple one-number arrangement per SOW |
| **Line item with negative unit price on SOW** | Reuses existing deliverable mechanism | Confusing in the UI ("what's this negative deliverable?"); deliverables have a different semantic |
| **`trade_credit_cents` + `trade_credit_description` on SOW (chosen)** | Simple, queryable, renders correctly in PDF | Does not support multi-trade ledger (future TODO) |

---

## Chosen approach

Two columns added to `sow_documents`:

```sql
trade_credit_cents integer NOT NULL DEFAULT 0 CHECK (trade_credit_cents >= 0)
trade_credit_description text
```

**Behavior:**
- The cash project total = `pricing.total_cents` − `trade_credit_cents`
- The PDF renders `trade_credit_cents` as a dedicated breakdown line in the pricing section, styled in orange to signal it is non-cash
- `trade_credit_description` is a freeform field ("Catering at DSIG Q2 event — est. value $1,500")
- When `trade_credit_cents = 0` (the default), no trade credit line appears on the SOW or PDF

The deposit calculation is based on the full `pricing.total_cents`, not the net cash total, unless explicitly overridden. The trade credit is applied against the final balance.

---

## Rationale

Trade credit applies to the project total, not to individual deliverables. A single `trade_credit_cents` field on the SOW captures this correctly. The one-to-one relationship (one SOW, one trade credit amount) is accurate for current DSIG deal structures where trade is negotiated as a project-level concession, not per-deliverable.

The separate-table option would be correct for a scenario where a client delivers trade goods incrementally over time and each delivery draws down a credit ledger. That complexity is not warranted until a real use case requires it.

---

## Data model

### Migration 023a (`supabase/migrations/023a_sow_trade_in_kind.sql`)

```sql
ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS trade_credit_cents integer NOT NULL DEFAULT 0
    CHECK (trade_credit_cents >= 0),
  ADD COLUMN IF NOT EXISTS trade_credit_description text;
```

No index on `trade_credit_cents` — range queries on this field are not a current use case. If aggregate TIK reporting is added later, a partial index `WHERE trade_credit_cents > 0` would be appropriate.

### SOW PDF rendering

When `trade_credit_cents > 0`, the PDF pricing table includes a breakdown line:

```
Total:                    $5,000
Trade credit (catering):  -$1,500   ← orange text
Cash total:               $3,500
Deposit (25%):            $1,250
Balance on delivery:      $2,250
```

The rendering is handled in `src/lib/pdf/sow.ts` by checking `sow.trade_credit_cents > 0` before rendering the trade credit row.

### TypeScript type (`src/lib/invoice-types.ts`)

```typescript
interface SowDocument {
  // ... existing fields ...
  trade_credit_cents: number      // 0 when no trade; always present
  trade_credit_description: string | null
}
```

---

## API surface

Trade credit fields are included in the existing SOW CRUD:

- `POST /api/admin/sow` — accepts `trade_credit_cents` and `trade_credit_description` in the request body
- `PATCH /api/admin/sow/[id]` — accepts the same fields for edit-after-create
- Admin SOW create/edit UI includes a "Trade credit" dollar input and description textarea

---

## Rollout notes

- Migration: `supabase/migrations/023a_sow_trade_in_kind.sql`
- Apply: `supabase/migrations/APPLY-023-2026-04-24.sql`
- The admin trade-credits management page at `/admin/trade-credits` shows all SOWs with non-zero trade credit for financial reporting.
- The `src/app/admin/trade-credits/` directory and `src/app/api/admin/trade-credits/` route exist as of 2026-04-24 (see git status).

---

## Open questions

1. **Multi-trade per SOW.** If a client delivers multiple types of trade goods (catering AND photography), the current single `trade_credit_cents` field cannot distinguish them. A future `trade_credit_items jsonb` column or a separate `trade_credits` draw-down table would be needed. Defer until there is a real case requiring this.
2. **TIK delivery tracking.** The SOW records the trade credit amount but not whether the client has actually delivered the trade goods. A "Trade delivered" checkbox or `tik_delivered_at` timestamp on the SOW would close this loop. Currently tracked informally (admin notes).
3. **Impact on deposit calculation.** Current behavior: deposit is 25% of `total_cents` (pre-trade). Some clients may expect the deposit to be on the net cash amount. This is a business decision — add a `deposit_on_net_cash boolean` flag to SOW if this comes up.
4. **Tax treatment of TIK.** Trade-in-kind has specific tax reporting requirements (fair market value = income). This spec does not address tax reporting. If DSIG scales TIK arrangements, consult an accountant.
