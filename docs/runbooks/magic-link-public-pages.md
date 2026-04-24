# Magic-Link Public Pages — Operational Runbook

**Owner:** Hunter (DSIG)
**Last updated:** 2026-04-24
**Scope:** The three public-facing document pages that clients access via magic links: SOW accept microsite, invoice view, and EST share page.

> **The three things to know at 2am:**
> 1. **No auth tokens, no cookies — auth is the UUID itself.** The `public_uuid` on SOW and invoice rows is a database-generated UUID that acts as an unguessable bearer secret. Anyone with the URL can view the document. Keep URLs out of public spaces; they're not secret but they are not discoverable either.
> 2. **The SOW accept route is idempotent on the second call — it returns 409.** If a client accidentally submits the accept form twice, the second call sees status = `accepted` and returns a 409 with the existing deposit invoice URL. No double-invoice.
> 3. **`/quote/s/[token]` uses the `session_token` field, not a UUID.** Quote sessions have a separate `session_token` that's emailed/texted to the prospect. This is different from the SOW/invoice `public_uuid`. The token is created in `quote_sessions.session_token` at session creation.

---

## Emergency procedures

### Client says "Page not found" on their SOW link

1. Verify the link format: `https://demandsignals.co/sow/[sow_number]/[public_uuid]`
2. Check the SOW exists with that exact number and UUID:
   ```sql
   SELECT id, sow_number, public_uuid, status
   FROM sow_documents WHERE sow_number = 'SOW-HANG-042326A';
   ```
3. If the UUID in the URL doesn't match `public_uuid` in DB: the client has an old/modified link. Re-send from `/admin/sow/[id]`
4. If status = `void`: SOW was voided. The public page shows a "This document has been voided" message. Create a new SOW or un-void via SQL.

### Client submitted signature but got an error

1. Check the `/api/sow/public/[number]/accept` route logs in Vercel
2. Check SOW status:
   ```sql
   SELECT status, accepted_at, deposit_invoice_id FROM sow_documents
   WHERE sow_number = 'SOW-HANG-042326A';
   ```
3. If `status = 'accepted'` and `deposit_invoice_id` is set: accept succeeded. Client should be on the deposit invoice page. Re-send them the deposit invoice URL:
   ```sql
   SELECT invoice_number, public_uuid FROM invoices
   WHERE id = (SELECT deposit_invoice_id FROM sow_documents WHERE sow_number = 'SOW-HANG-042326A');
   -- URL: https://demandsignals.co/invoice/[invoice_number]/[public_uuid]
   ```
4. If `status` is still `sent` or `viewed`: the accept route failed before committing. Check Vercel error logs for the accept route.

### Invoice pay button doesn't work

The Pay button on `/invoice/[number]/[uuid]` uses `stripe_payment_link_url` from the invoice row. If blank:
```sql
SELECT stripe_payment_link_url FROM invoices WHERE invoice_number = 'INV-HANG-042326A';
```
If null: the Stripe payment link wasn't generated. Create one manually in the Stripe dashboard → Payment Links → Create → add the product/amount → copy URL → update:
```sql
UPDATE invoices SET stripe_payment_link_url = 'https://buy.stripe.com/...'
WHERE invoice_number = 'INV-HANG-042326A';
```

---

## `/sow/[number]/[uuid]` — SOW accept microsite

**File:** `src/app/sow/[number]/[uuid]/page.tsx` + `SowAcceptClient.tsx`

**Auth:** UUID in URL is validated against `sow_documents.public_uuid`. If no match → 404.

**What the page shows:**
- SOW title and prospect name (from linked prospect)
- Full scope summary
- Phase breakdown with deliverables, cadences, pricing
- Payment terms and guarantees
- Total project cost + deposit amount
- Retainer summary if `ongoing_services` is set
- **Accept button** (only shown when status = `sent` or `viewed`)
- Signature input modal on Accept click
- After acceptance: redirected to deposit invoice pay page

**Status transitions the page triggers:**
- Page load (first view): `viewed_at` stamped via `PATCH /api/sow/public/[number]` with `{ action: 'view', key: uuid }`
- Accept click: `POST /api/sow/public/[number]/accept` with `{ key: uuid, signature: "..." }`

**Accept side-effects** (see `sow-lifecycle.md` for full list):
1. SOW status → `accepted`
2. Deposit invoice auto-created
3. Subscriptions materialized
4. Trade credit row created (if TIK)
5. Prospect → `is_client = true`
6. Project created with phases

After accept, the page redirects to:
```
https://demandsignals.co/invoice/[deposit_invoice_number]/[deposit_invoice_uuid]
```

---

## `/invoice/[number]/[uuid]` — Invoice view

**File:** `src/app/invoice/[number]/[uuid]/page.tsx`

**Auth:** UUID validated against `invoices.public_uuid`. If no match → 404.

**First load:** stamps `invoices.viewed_at` if not already set.

**What the page shows:**
- Invoice number, issue date, due date
- Bill-to block (prospect business name, contact info)
- Line items table with discounts and totals
- Total due + any late fee note
- Status badge (draft/sent/paid/void)
- **Download PDF** button → `GET /api/invoice-pdf/[number]/[uuid]` (or `/api/admin/invoices/[id]/pdf` — check current route)
- **Pay button** → opens `stripe_payment_link_url` in new tab (hidden if null or if invoice is paid)

**For zero-balance invoices:** the page shows the "New Client Appreciation" value stack but no Pay button (total due = $0, already `paid`).

---

## `/quote/s/[token]` — EST share page

**File:** `src/app/quote/s/[token]/page.tsx`

**Auth:** `session_token` field on `quote_sessions` (different from public_uuid). Validated server-side.

**What the page shows:**
- Estimate summary: business name, selected services with pricing
- Estimated range (low/high) based on selected items
- Four CTAs:
  1. **Resume Conversation** → redirects to `/quote` with session pre-loaded
  2. **Book a Strategy Call** → Google Calendar booking URL
  3. **Accept & Continue** → if admin has marked this session as won, shows SOW link
  4. **Ask a Question** → contact form pre-filled with business name

**When to use:** after a `/quote` session completes, admin shares this URL with the prospect. The prospect bookmarks it; returns to review the estimate later.

**Session token:** created in `quote_sessions.session_token` when the session is first created. It's used in the Twilio SMS and email magic links sent to prospects. The admin can see and copy the share URL from `/admin/quotes/[id]`.

---

## URL construction patterns

```
SOW:     https://demandsignals.co/sow/[sow_number]/[public_uuid]
Invoice: https://demandsignals.co/invoice/[invoice_number]/[public_uuid]
EST:     https://demandsignals.co/quote/s/[session_token]
```

**Getting a URL for an existing document:**

```sql
-- SOW magic link
SELECT 'https://demandsignals.co/sow/' || sow_number || '/' || public_uuid AS url
FROM sow_documents WHERE sow_number = 'SOW-HANG-042326A';

-- Invoice magic link
SELECT 'https://demandsignals.co/invoice/' || invoice_number || '/' || public_uuid AS url
FROM invoices WHERE invoice_number = 'INV-HANG-042326A';

-- EST share link
SELECT 'https://demandsignals.co/quote/s/' || session_token AS url
FROM quote_sessions WHERE id = '<session_id>';
```

---

## Brand and design

All three pages match the PDF v2 design spec (DSIG_PDF_STANDARDS_v2.md):
- Header: gradient bar + logo row
- Colors: `#3D4566` slate, `#52C9A0` teal, `#F26419` orange
- Typography: system sans-serif (Inter/system-ui, not embedded Helvetica)
- Mobile-responsive

The admin HTML preview (in SOW/Invoice detail pages) uses `src/lib/doc-preview.ts` which has a slightly simpler CSS-only version of the same design for inline rendering.

---

## Troubleshooting

### TypeScript error "Property X does not exist on type SowDocument"

A migration added a new column (e.g., `trade_credit_cents`) but the TypeScript type in `src/lib/invoice-types.ts` wasn't updated, or the Supabase client type cache is stale.

Fix:
1. Check `src/lib/invoice-types.ts` → `SowDocument` interface — add the field
2. Run `npm run build` to verify no remaining TS errors
3. If the field exists in the type but the page 500s: the Supabase PostgREST cache may be stale — wait 30 seconds

### Public page shows old data after an admin edit

The public pages read directly from Supabase on every request with no caching. If a client sees stale data:
1. Verify the edit was saved (check DB directly)
2. Hard reload the page (Ctrl+Shift+R) — there is no client-side cache on these pages
3. If still stale: the Next.js page may have a stale RSC (React Server Component) fetch cache. Check if `cache: 'no-store'` is set on the Supabase fetch in the page component.

### SOW accept returns 409 on first attempt

Status is not `sent` or `viewed` — check:
```sql
SELECT status FROM sow_documents WHERE sow_number = 'SOW-...';
```
If `draft`: the admin forgot to send it. Click Send first.
If `accepted`: it was already accepted (possibly by admin test). The 409 response body includes the deposit invoice URL.
If `void`: the SOW was voided. Cannot be accepted.

### EST share page shows "Session not found"

`session_token` is wrong or expired. Check:
```sql
SELECT id, session_token, status, created_at FROM quote_sessions
WHERE session_token = '<token>';
```
If no row: the token is wrong (typo in URL, or the session was deleted). Send the correct share URL from `/admin/quotes/[id]`.

---

## Cross-references

- `sow-lifecycle.md` — the full accept flow and side-effects
- `receipts-and-payments.md` — the deposit invoice the client lands on after accept
- `pdf-pipeline.md` — Download PDF button on invoice page
- `quote-estimator.md` (existing) — the `/quote` flow that produces sessions
