# Receipts and Payments — Operational Runbook

**Owner:** Hunter (DSIG)
**Last updated:** 2026-04-24
**Scope:** The payment→receipt flow, partial payments, refunds, and how invoice balance is tracked.

> **The three things to know at 2am:**
> 1. **`total_due_cents` on the invoice is immutable after issue.** The balance owed isn't a column you edit. Balance = `invoices.total_due_cents - SUM(receipts.amount_cents WHERE invoice_id = invoice.id)`. If the math looks wrong, it's a receipt issue, not an invoice issue.
> 2. **Partial payments leave the invoice in `sent` status.** Only when `SUM(receipts) >= total_due_cents` does the invoice flip to `paid`. The mark-paid route handles this automatically — you don't need to worry about it.
> 3. **Stripe refunds are manual in the Stripe dashboard.** Our system records the void reason, but it does not push a refund to Stripe. Two separate actions: void in DSIG admin + refund in Stripe.

---

## Emergency procedures

### Invoice shows outstanding but all receipts should cover it

1. Check the sum:
   ```sql
   SELECT
     i.invoice_number,
     i.total_due_cents,
     COALESCE(SUM(r.amount_cents), 0) AS receipts_total,
     i.total_due_cents - COALESCE(SUM(r.amount_cents), 0) AS balance_remaining,
     i.status
   FROM invoices i
   LEFT JOIN receipts r ON r.invoice_id = i.id
   WHERE i.invoice_number = 'INV-HANG-042326A'
   GROUP BY i.id, i.invoice_number, i.total_due_cents, i.status;
   ```
2. If `balance_remaining <= 0` but `status != 'paid'`: the mark-paid auto-flip didn't run. Fix:
   ```sql
   UPDATE invoices SET status = 'paid', paid_at = now(), paid_method = 'check'
   WHERE invoice_number = 'INV-HANG-042326A';
   ```
3. If a receipt was entered with a wrong amount: void the receipt row and create a corrected one. There is no "edit receipt" — receipts are immutable records.
   ```sql
   -- Delete the wrong receipt (exceptional — prefer creating a correcting receipt)
   DELETE FROM receipts WHERE id = '<receipt_id>';
   -- Then re-run mark-paid via admin UI or POST /api/admin/invoices/[id]/mark-paid
   ```

### Client paid via Stripe but invoice still shows `sent`

The Stripe webhook (`/api/webhooks/stripe`) listens for `payment_intent.succeeded`, `invoice.paid`, `checkout.session.completed`. If it didn't fire:

1. Check Stripe dashboard → Developers → Webhooks → Endpoint → recent deliveries
2. If webhook was delivered but returned 500: check Vercel logs for the `/api/webhooks/stripe` route
3. If webhook was never delivered: verify the endpoint URL matches `https://demandsignals.co/api/webhooks/stripe` and `STRIPE_WEBHOOK_SECRET` env var is set in Vercel

Manual fix:
```bash
POST /api/admin/invoices/[id]/mark-paid
{
  "amount_cents": 150000,
  "payment_method": "stripe",
  "payment_reference": "pi_XXXXXXXXXXXX",
  "notes": "Manual mark — Stripe webhook missed"
}
```

---

## `receipts` table

Migration: `019b_receipts.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `receipt_number` | text UNIQUE | RCT-CLIENT-MMDDYY{SUFFIX} |
| `invoice_id` | uuid | FK → invoices.id (ON DELETE RESTRICT) |
| `prospect_id` | uuid | FK → prospects.id (ON DELETE RESTRICT) |
| `amount_cents` | integer CHECK > 0 | Positive only — no negative receipts |
| `currency` | text DEFAULT 'USD' | |
| `payment_method` | text | see enum below |
| `payment_reference` | text | Check #, wire trace, Stripe charge id |
| `paid_at` | timestamptz | |
| `notes` | text | |

**Payment methods:**
| Value | Use case |
|---|---|
| `stripe` | Online card payment via Stripe |
| `check` | Physical check received |
| `wire` | Wire transfer received |
| `cash` | Cash in hand (rare) |
| `other` | Any other method |
| `trade` | Trade-in-Kind drawdown against a trade_credits row |
| `zero_balance` | $0 invoice auto-paid at issue (Restaurant Rule courtesy invoices) |

---

## Mark-paid flow

**Route:** `POST /api/admin/invoices/[id]/mark-paid`

**Request body:**
```json
{
  "amount_cents": 150000,
  "payment_method": "check",
  "payment_reference": "Check #1042",
  "notes": "Received 2026-04-23"
}
```

**What the route does:**
1. Validates `amount_cents > 0` and `payment_method` is in the allowed enum
2. Inserts a `receipts` row with a new RCT- number (via `allocateDocNumber()` or legacy fallback)
3. Computes new balance: `total_due_cents - SUM(all receipts including this new one)`
4. If balance <= 0: flips invoice `status = 'paid'`, stamps `paid_at`, sets `paid_method`
5. If balance > 0: invoice stays `sent` (partial payment recorded, more expected)
6. Returns `{ receipt, balance_remaining_cents, invoice_status }`

---

## Partial payments

Scenario: client owes $10,000. They send $5,000 now, rest at delivery.

1. POST mark-paid for $5,000 → receipt #1 created, invoice stays `sent`, balance = $5,000
2. At delivery: POST mark-paid for $5,000 → receipt #2 created, invoice flips to `paid`, balance = $0

Both receipts are full records. The invoice shows the full amount; the admin receipt tab shows the payment history.

---

## Receipt PDF

**Route:** `GET /api/admin/receipts/[id]/pdf`

Returns a branded PDF receipt via Chromium (same pipeline as SOW/Invoice PDFs). Shows: receipt number, date, invoice reference, amount, payment method, payment reference, prospect name.

Template: `src/lib/pdf/receipt.ts`

See `pdf-pipeline.md` for cold-start behavior.

---

## Refund flow

**Route:** `POST /api/admin/invoices/[id]/refund`

**Request body:**
```json
{
  "reason": "Client cancelled project — full refund"
}
```

**What it does:**
1. Flips invoice `status = 'void'`, stamps `voided_at`, stores `void_reason`
2. Does NOT touch Stripe — you must issue the refund separately in the Stripe dashboard
3. Does NOT create a negative receipt — the invoice is simply voided

**For subscription invoices:** use `POST /api/admin/subscriptions/[id]/refund` which targets the most-recent `paid` invoice for that subscription and voids it with the given reason.

**Stripe refund (manual step):**
1. Stripe Dashboard → Payments → find the charge by `payment_reference` in the receipt
2. Click Refund → enter amount → confirm
3. Add a note in the DSIG admin: `/admin/invoices/[id]` → Notes field → "Stripe refund issued 2026-04-23"

---

## Trade-in-Kind payments

When a prospect pays via trade (they deliver services/goods to DSIG instead of cash):

1. Record the trade_credits row first (auto-created on SOW accept if TIK was in the SOW, or manually at `/admin/trade-credits`)
2. Mark-paid with `payment_method: 'trade'` and `payment_reference: '<trade_credit_id>'`
3. This records the payment event. The trade_credits row drawdown is a separate manual step (marking what portion of the TIK was consumed by this payment).

---

## Zero-balance auto-pay

Invoices created with `total_due_cents = 0` (e.g., Restaurant Rule courtesy invoices) auto-flip to `paid` with `paid_method = 'zero_balance'` on send. No receipt row is created — there is no payment to record.

---

## Balance math explained

```
invoice.total_due_cents
  - SUM(receipts.amount_cents WHERE invoice_id = invoice.id)
  = balance_remaining_cents

If balance_remaining_cents <= 0:
  invoice.status = 'paid'
Else:
  invoice.status = 'sent'   (still outstanding)
```

**What `total_due_cents` includes at issue time:**
- All line item totals
- Minus any discount lines
- Minus any trade_credit_cents on the invoice
- Plus any late fees that have been applied (`late_fee_applied_at IS NOT NULL`)

**What it does NOT include:**
- Future late fees not yet applied
- Future receipts (obviously)

---

## Troubleshooting

### RCT number shows PENDING-

`allocateDocNumber()` failed (probably no `client_code` on the prospect). Fix:
```sql
-- Find the pending receipt
SELECT id, receipt_number FROM receipts WHERE receipt_number LIKE 'PENDING-%' ORDER BY created_at DESC LIMIT 5;

-- Allocate a proper number (via the admin API if you can, or manually):
-- Option A: call the API
PATCH /api/admin/receipts/[id]   { "receipt_number": "RCT-HANG-042326A" }

-- Option B: direct SQL (if you know the next suffix)
SELECT allocate_document_number('RCT', 'HANG', 'receipts', '<receipt_uuid>');
UPDATE receipts SET receipt_number = '<result>' WHERE id = '<receipt_uuid>';
```

### Invoice stuck in `sent` even though fully paid

Run the balance check query above. If balance <= 0 and status = `sent`:
```sql
UPDATE invoices SET status = 'paid', paid_at = now()
WHERE id = '<invoice_id>' AND status = 'sent';
```

### Two receipts reference the same invoice but total > invoice amount

This can happen with manual SQL inserts. The `mark-paid` route doesn't prevent overpayment — it just records receipts. To identify:
```sql
SELECT invoice_id, SUM(amount_cents) AS total_received,
       i.total_due_cents, SUM(amount_cents) - i.total_due_cents AS overpay
FROM receipts r
JOIN invoices i ON i.id = r.invoice_id
GROUP BY invoice_id, i.total_due_cents
HAVING SUM(amount_cents) > i.total_due_cents;
```

Delete the duplicate receipt(s) and re-run mark-paid for the correct amount.

---

## Cross-references

- `sow-lifecycle.md` — deposit invoice created on SOW accept
- `document-numbering.md` — RCT number format
- `invoicing-morning-2026-04-18.md` — original Stripe integration setup (Stripe webhook, STRIPE_WEBHOOK_SECRET)
- `invoicing-phase4-activation.md` — services catalog value stack on deposit invoices
