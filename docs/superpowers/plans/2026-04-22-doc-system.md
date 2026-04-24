# Doc System Overhaul — Proposals (SOW) + Invoices + Subscriptions

**Status:** SHIPPED 2026-04-22 · DEPLOYED
**Commit range:** various (doc system overhaul sprint — see commit `7485cd9` and nearby)
**See also:** `docs/runbooks/sow-lifecycle.md`, `docs/runbooks/invoicing-morning-2026-04-18.md`, `docs/runbooks/pdf-pipeline.md`
**Notes:** Priced deliverables on SOW, edit-after-create for SOW/Invoice/Subscription, HTML preview (`doc-preview.ts` / `DocumentPreview.tsx`), late fee config on invoices, subscription end date and notes — all shipped. The `DocumentPreview` iframe component is the in-browser WYSIWYG preview; the PDF endpoint uses the Chromium pipeline. `ProspectContactEditor` was shipped. Money input typing fixes landed in commit `7485cd9`.

---

> **For agentic workers:** use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Make SOW, Invoice, and Subscription documents production-grade — editable after creation, client-info-aware, priced per deliverable, with branded PDF preview and download. Hunter needs to issue several deals tomorrow morning.

**Architecture:** Extend existing schema + admin UIs. Do not rebuild. SOW gains priced deliverables + editable-after-create. Invoice gains edit/refund/resend/mark-paid on detail page + late fee policy + send date. Subscription gains editable fields + end date + full CRUD. All three gain client-info preview + editing before send. PDF preview renders HTML in-browser; PDF download goes through the existing `renderSowPdf` / invoice PDF service.

**Tech Stack:** Next.js 16 App Router, Supabase/Postgres, React 19, TypeScript strict, Tailwind v4.

---

## Data Model Summary

| Table | Change | Purpose |
|---|---|---|
| `sow_documents` | Extend | `deliverables.unit_price_cents`, `deliverables.quantity`, `deliverables.hours`, `send_date` |
| `invoices` | Extend | `send_date`, `late_fee_cents`, `late_fee_grace_days`, `late_fee_applied_at` |
| `subscriptions` | Extend | `end_date`, `notes`, overridable `monthly_amount_cents` for one-off adjustments |
| `subscription_plans` | Existing | Admin list/edit/delete already exists for retainer tier; generalize to all plans |

---

## File Structure

### New files

- `supabase/migrations/017a_sow_priced_deliverables.sql`
- `supabase/migrations/017b_invoice_send_and_late_fee.sql`
- `supabase/migrations/017c_subscription_end_date.sql`
- `supabase/migrations/APPLY-017-2026-04-22.sql` (bundle)
- `src/components/admin/DocumentPreview.tsx` — shared HTML preview (SOW or Invoice) rendered from same data as the PDF
- `src/components/admin/ProspectContactEditor.tsx` — inline editor for prospect contact info used by all 3 doc types
- `src/app/admin/sow/[id]/EditClient.tsx` — edit-after-create for SOW
- `src/app/admin/invoices/[id]/EditClient.tsx` — edit-after-create for Invoice
- `src/app/admin/subscriptions/[id]/EditClient.tsx` — edit for Subscription
- `src/app/api/admin/sow/[id]/preview/route.ts` — GET HTML preview
- `src/app/api/admin/invoices/[id]/preview/route.ts` — GET HTML preview
- `src/app/api/admin/invoices/[id]/refund/route.ts` — initiate refund
- `src/app/api/admin/invoices/[id]/resend/route.ts` — resend
- `src/app/api/admin/subscriptions/[id]/refund/route.ts` — refund last cycle
- `src/app/api/admin/subscriptions/[id]/mark-paid/route.ts` — mark last cycle paid
- `src/app/api/admin/subscription-plans/route.ts` + `[id]/route.ts` — generalize existing retainer-plan CRUD to all plans
- `src/lib/doc-preview.ts` — HTML preview renderer shared between SOW + Invoice endpoints

### Modified files

- `src/app/admin/sow/new/page.tsx` — add priced deliverables with quantity/hours; live total
- `src/app/admin/sow/[id]/page.tsx` — add Edit, Preview, client-info-block, PDF download always visible
- `src/app/admin/invoices/new/page.tsx` — add preview pane, send-date, late-fee config
- `src/app/admin/invoices/[id]/page.tsx` — add Edit, Refund, Resend, Mark Paid buttons + preview
- `src/app/admin/subscriptions/[id]/page.tsx` — add Edit, Refund last cycle, Mark Paid, Delete, End Date
- `src/app/admin/subscription-plans/page.tsx` — add Edit/Delete buttons
- `src/app/api/admin/sow/[id]/route.ts` — add PATCH + compute total from deliverables
- `src/app/api/admin/invoices/[id]/route.ts` — add PATCH
- `src/app/api/admin/subscriptions/[id]/route.ts` — add PATCH + DELETE
- `src/lib/sow-pdf/payload.ts` — render priced deliverables with totals
- `src/lib/invoice-types.ts` — extend `SowDeliverable` with `unit_price_cents`, `quantity`, `hours`

---

## Task 1: DB — Priced deliverables on SOW

**Files:** Create `supabase/migrations/017a_sow_priced_deliverables.sql`

- [ ] **Step 1: Write migration**

```sql
-- 017a: Priced deliverables on SOW.
-- deliverables is existing jsonb; no DDL on its shape (it's flexible jsonb).
-- Add top-level fields for a send date + total computation traceability.

ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS send_date date,
  ADD COLUMN IF NOT EXISTS computed_from_deliverables boolean NOT NULL DEFAULT false;

-- No index needed — send_date is rarely filtered on.
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/017a_sow_priced_deliverables.sql
git commit -m "feat(sow): send_date + computed_from_deliverables flag"
```

---

## Task 2: DB — Invoice send date + late fee

**Files:** Create `supabase/migrations/017b_invoice_send_and_late_fee.sql`

- [ ] **Step 1: Write migration**

```sql
-- 017b: Invoice send-date scheduling + late fee policy.
-- late_fee_cents is a flat one-time fee applied if unpaid past due_date + grace_days.
-- late_fee_applied_at is null until applied (then the fee is added as a new line item via a separate flow — not automated in this migration).

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS send_date date,
  ADD COLUMN IF NOT EXISTS late_fee_cents integer NOT NULL DEFAULT 0 CHECK (late_fee_cents >= 0),
  ADD COLUMN IF NOT EXISTS late_fee_grace_days integer NOT NULL DEFAULT 0 CHECK (late_fee_grace_days >= 0),
  ADD COLUMN IF NOT EXISTS late_fee_applied_at timestamptz;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/017b_invoice_send_and_late_fee.sql
git commit -m "feat(invoice): send_date + late fee policy columns"
```

---

## Task 3: DB — Subscription end date + notes

**Files:** Create `supabase/migrations/017c_subscription_end_date.sql`

- [ ] **Step 1: Write migration**

```sql
-- 017c: Subscription end date + admin notes.
-- end_date is inclusive last-billing-cycle end. null = open-ended.
-- override_monthly_amount_cents lets admin charge a different amount than plan.price_cents without creating a new plan.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS override_monthly_amount_cents integer CHECK (override_monthly_amount_cents IS NULL OR override_monthly_amount_cents >= 0);

CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date
  ON subscriptions (end_date)
  WHERE end_date IS NOT NULL;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/017c_subscription_end_date.sql
git commit -m "feat(subscription): end_date + notes + override amount"
```

---

## Task 4: DB — Bundle APPLY-017

- [ ] **Step 1: Concatenate**

```bash
cat supabase/migrations/017a_sow_priced_deliverables.sql \
    supabase/migrations/017b_invoice_send_and_late_fee.sql \
    supabase/migrations/017c_subscription_end_date.sql \
    > supabase/migrations/APPLY-017-2026-04-22.sql
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/APPLY-017-2026-04-22.sql
git commit -m "chore: bundled 017a-c for Supabase paste"
```

---

## Task 5: Extend `SowDeliverable` type

**Files:** Modify `src/lib/invoice-types.ts`

- [ ] **Step 1: Replace the existing `SowDeliverable` interface**

```ts
export interface SowDeliverable {
  name: string
  description: string
  acceptance_criteria?: string
  // Pricing per deliverable. For hourly items set hours + unit_price_cents
  // as the hourly rate. For fixed items set quantity=1, unit_price_cents=fee.
  quantity?: number
  hours?: number
  unit_price_cents?: number
  line_total_cents?: number  // computed: (hours ?? quantity) * unit_price_cents
}
```

- [ ] **Step 2: Also extend `SowDocument`**

Add under `pricing`:
```ts
send_date?: string | null
computed_from_deliverables?: boolean
```

- [ ] **Step 3: Verify TS**

```bash
npx tsc --noEmit 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/invoice-types.ts
git commit -m "feat(types): priced deliverables + send_date on SowDocument"
```

---

## Task 6: Extend Invoice + Subscription types

**Files:** Modify `src/lib/invoice-types.ts`

- [ ] **Step 1: Add to `Invoice` interface**

```ts
send_date: string | null
late_fee_cents: number
late_fee_grace_days: number
late_fee_applied_at: string | null
```

- [ ] **Step 2: Add to `Subscription` type (find existing one in the file)**

```ts
end_date: string | null
notes: string | null
override_monthly_amount_cents: number | null
```

- [ ] **Step 3: Verify + commit**

```bash
npx tsc --noEmit 2>&1 | tail -10
git add src/lib/invoice-types.ts
git commit -m "feat(types): invoice late fee + subscription end_date"
```

---

## Task 7: SOW `new` page — priced deliverables UI

**Files:** Modify `src/app/admin/sow/new/page.tsx`

- [ ] **Step 1: Extend `Deliverable` interface in the file**

```ts
interface Deliverable {
  name: string
  description: string
  acceptance_criteria: string
  catalog_item_id?: string | null
  quantity: number
  hours: number | null  // null = not hourly
  unit_price_cents: number
}
```

- [ ] **Step 2: Update `addDeliverable()` to seed quantity=1, hours=null, unit_price_cents=0**

```ts
function addDeliverable() {
  setDeliverables((d) => [...d, { name: '', description: '', acceptance_criteria: '', quantity: 1, hours: null, unit_price_cents: 0 }])
}
```

- [ ] **Step 3: Update `addDeliverableFromCatalog` to seed from catalog price**

```ts
function addDeliverableFromCatalog(item: CatalogPickerItem) {
  setDeliverables((d) => [...d, {
    name: item.name,
    description: item.description ?? item.benefit ?? '',
    acceptance_criteria: 'Delivered + client review',
    catalog_item_id: item.id,
    quantity: 1,
    hours: null,
    unit_price_cents: item.display_price_cents,
  }])
}
```

- [ ] **Step 4: Render price fields per deliverable card**

Inside the existing deliverable map, after the `acceptance_criteria` input, add a grid:

```tsx
<div className="grid grid-cols-4 gap-2">
  <label className="text-xs">
    Qty
    <input type="number" min="1" value={d.quantity}
      onChange={(e) => updateDeliverable(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
      className="w-full border border-slate-200 rounded px-2 py-1" />
  </label>
  <label className="text-xs">
    Hours (optional)
    <input type="number" step="0.25" min="0" value={d.hours ?? ''}
      placeholder="—"
      onChange={(e) => updateDeliverable(idx, { hours: e.target.value ? parseFloat(e.target.value) : null })}
      className="w-full border border-slate-200 rounded px-2 py-1" />
  </label>
  <label className="text-xs">
    {d.hours != null ? 'Rate $/hr' : 'Unit $'}
    <input type="number" step="0.01" min="0"
      value={(d.unit_price_cents / 100).toFixed(2)}
      onChange={(e) => updateDeliverable(idx, { unit_price_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
      className="w-full border border-slate-200 rounded px-2 py-1" />
  </label>
  <div className="text-xs">
    Line total
    <div className="pt-1 font-semibold">
      ${(((d.hours ?? d.quantity) * d.unit_price_cents) / 100).toFixed(2)}
    </div>
  </div>
</div>
```

- [ ] **Step 5: Compute total from deliverables; allow override**

Add state `totalOverride: boolean` (default false). Add a checkbox above the existing Total field: "Compute from deliverables." When true, the Total field is read-only and reflects `sum(deliverables line totals)`. When false (override), the Total field is user-editable.

```tsx
const computedTotalCents = deliverables.reduce((s, d) => s + Math.round(((d.hours ?? d.quantity) || 0) * (d.unit_price_cents || 0)), 0)

// ...in the Pricing section, replace the Total input with:
<div className="flex items-center gap-2 mb-2">
  <input type="checkbox" id="compute" checked={computeFromDeliverables}
    onChange={(e) => {
      setComputeFromDeliverables(e.target.checked)
      if (e.target.checked) setTotalDollars((computedTotalCents / 100).toFixed(2))
    }} />
  <label htmlFor="compute" className="text-xs">Compute total from deliverables (currently ${(computedTotalCents/100).toFixed(2)})</label>
</div>
<label>
  Total ($)
  <input type="number" step="0.01"
    readOnly={computeFromDeliverables}
    value={computeFromDeliverables ? (computedTotalCents / 100).toFixed(2) : totalDollars}
    onChange={(e) => setTotalDollars(e.target.value)}
    className={`w-full border border-slate-200 rounded px-2 py-1 mt-1 ${computeFromDeliverables ? 'bg-slate-50' : ''}`} />
</label>
```

Also: add `const [computeFromDeliverables, setComputeFromDeliverables] = useState(true)` with existing useState hooks. When submitting, include `computed_from_deliverables: computeFromDeliverables` in the POST body and merge pricing fields (quantity, hours, unit_price_cents, line_total_cents) into each deliverable before POSTing.

- [ ] **Step 6: Verify + commit**

```bash
npx tsc --noEmit 2>&1 | tail -10
git add src/app/admin/sow/new/page.tsx
git commit -m "feat(sow): priced deliverables + compute-from-deliverables total"
```

---

## Task 8: SOW API — accept priced deliverables

**Files:** Modify `src/app/api/admin/sow/route.ts` + `src/app/api/admin/sow/[id]/route.ts`

- [ ] **Step 1: Update POST validator to accept pricing fields**

Find the zod schema (or manual validation) in the POST. Extend the `deliverables` array item shape to optionally include `quantity`, `hours`, `unit_price_cents`. On insert, compute `line_total_cents = (hours ?? quantity) * unit_price_cents` per item. Store the enriched array as-is in the jsonb column.

- [ ] **Step 2: Update POST to accept `computed_from_deliverables`**

Pass through to the insert.

- [ ] **Step 3: Add PATCH handler to `/api/admin/sow/[id]/route.ts`**

Admin-only. Accept partial SOW update: `title`, `scope_summary`, `deliverables`, `timeline`, `pricing`, `payment_terms`, `guarantees`, `notes`, `send_date`, `computed_from_deliverables`. Recompute deliverable line totals on each PATCH. Refuse if `status !== 'draft'` — once sent/accepted, SOW is immutable (or require explicit `force_edit: true` — include that as an optional body flag for emergencies).

```ts
const { data: current } = await supabaseAdmin
  .from('sow_documents').select('status').eq('id', id).single()
if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
if (current.status !== 'draft' && !body.force_edit) {
  return NextResponse.json({ error: `Cannot edit SOW in status ${current.status}. Pass force_edit: true to override.` }, { status: 409 })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/sow/
git commit -m "feat(sow): PATCH endpoint + priced-deliverable handling"
```

---

## Task 9: SOW detail page — edit mode + PDF always visible

**Files:** Modify `src/app/admin/sow/[id]/page.tsx` + create `src/app/admin/sow/[id]/EditClient.tsx`

- [ ] **Step 1: Extract existing read-only JSX into `ViewClient` (rename the default export)**

Keep the existing component's behavior identical but move deliverables/timeline/pricing into a sub-component accepting the SOW detail as a prop.

- [ ] **Step 2: Add an "Edit" toggle**

At the top of the page, next to the existing Delete/Send/PDF buttons, add an Edit button that toggles local state `editing`. When `editing=true`, render `<EditClient sow={sow} onSave={handleSave} onCancel={() => setEditing(false)} />`. Otherwise render the existing read view.

- [ ] **Step 3: Write `EditClient.tsx`**

Clone the New SOW form JSX (deliverables, timeline, pricing, payment terms, guarantees, notes) but seeded from the loaded SOW. Call `PATCH /api/admin/sow/{id}` on save. On 409 (status not draft), show a confirm "SOW is sent/accepted — force edit?" and retry with `force_edit: true`.

- [ ] **Step 4: PDF download always visible (not just post-draft)**

Current page only shows the PDF link when `status !== 'draft'`. Change this — always show the PDF link. The PDF endpoint should render from current data regardless of status so Hunter can preview what a client would see before sending.

- [ ] **Step 5: Ensure `/api/admin/sow/[id]/pdf` works for draft status**

Check that route — if it rejects drafts, relax the guard.

- [ ] **Step 6: Render priced deliverables in the read view**

For each deliverable, if `unit_price_cents > 0`, show `<b>{name}</b> — {description} · {qty} × ${unit} = ${total}`. Below deliverables, show a mini-totals table.

- [ ] **Step 7: Client info block**

Above the Scope section, render a compact client block using prospect data (already loaded in `detail.sow.prospect`). Show business_name, owner_name, owner_email, business_phone/owner_phone, address. Use `formatCents` from `@/lib/quote-engine` everywhere for money.

- [ ] **Step 8: Verify + commit**

```bash
npx tsc --noEmit 2>&1 | tail -10
git add src/app/admin/sow/\[id\]/
git commit -m "feat(sow): edit after create + priced deliverables in view + always-visible PDF + client info"
```

---

## Task 10: SOW PDF payload — render priced deliverables

**Files:** Modify `src/lib/sow-pdf/payload.ts`

- [ ] **Step 1: Pass priced fields through to the Python renderer**

Extend `SowPdfPayload.data.deliverables` shape to include optional `quantity`, `hours`, `unit_price_cents`, `line_total_cents`. The Python renderer can ignore the fields it doesn't understand; new fields will simply not render until Hunter updates `dsig_pdf`. For now TypeScript-side passes them through so the HTML preview (Task 13) can use them.

```ts
deliverables: Array<{
  name: string
  description: string
  acceptance_criteria?: string
  quantity?: number
  hours?: number
  unit_price_cents?: number
  line_total_cents?: number
}>
```

Return object unchanged structurally — `sow.deliverables` already contains these fields post-Task 8.

- [ ] **Step 2: Commit**

```bash
git add src/lib/sow-pdf/payload.ts
git commit -m "feat(sow-pdf): pass priced-deliverable fields through to renderer"
```

---

## Task 11: Shared `DocumentPreview` component (HTML preview)

**Files:** Create `src/components/admin/DocumentPreview.tsx` + `src/lib/doc-preview.ts`

- [ ] **Step 1: Write `src/lib/doc-preview.ts`**

A pure HTML renderer for both SOW and Invoice shapes. Does NOT render a PDF — renders an iframe-able HTML string that approximates the final document. Uses inline styles so it's self-contained.

Exports:
```ts
export function renderSowHtml(sow: SowDocument, client: ClientInfo): string
export function renderInvoiceHtml(invoice: InvoiceWithLineItems, client: ClientInfo): string
```

Each returns a complete HTML doc string with `<!doctype html>`, brand colors (`#68c5ad` teal, `#1d2330` dark, `#5d6780` slate), DSIG logo `https://demandsignals.us/assets/logos/dsig_logo_v2b.png`, client info block, line items table with totals, payment terms, notes, signature placeholder (for SOW). Use `formatCents` from `@/lib/quote-engine` for money.

Full implementation is ~200 lines of HTML template literals. Structure:

```ts
import { formatCents } from './quote-engine'
import type { SowDocument, InvoiceWithLineItems } from './invoice-types'

export interface ClientInfo {
  business_name: string
  owner_name?: string | null
  owner_email?: string | null
  business_email?: string | null
  owner_phone?: string | null
  business_phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
}

function clientBlockHtml(c: ClientInfo): string {
  const cityLine = [c.city, c.state, c.zip].filter(Boolean).join(', ')
  return `
    <div class="client">
      <div class="label">Bill to</div>
      <div class="name">${escapeHtml(c.business_name)}</div>
      ${c.owner_name ? `<div>${escapeHtml(c.owner_name)}</div>` : ''}
      ${c.address ? `<div>${escapeHtml(c.address)}</div>` : ''}
      ${cityLine ? `<div>${escapeHtml(cityLine)}</div>` : ''}
      ${c.owner_email || c.business_email ? `<div>${escapeHtml(c.owner_email ?? c.business_email ?? '')}</div>` : ''}
      ${c.owner_phone || c.business_phone ? `<div>${escapeHtml(c.owner_phone ?? c.business_phone ?? '')}</div>` : ''}
    </div>
  `
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]!))
}

const SHARED_STYLES = `
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1d2330; padding: 40px; max-width: 800px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #68c5ad; padding-bottom: 20px; margin-bottom: 30px; }
    header img { height: 50px; }
    h1 { color: #1d2330; font-size: 28px; margin: 0; }
    .meta { color: #5d6780; font-size: 13px; }
    .client { background: #f4f6f9; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
    .client .label { font-size: 11px; text-transform: uppercase; color: #5d6780; margin-bottom: 6px; }
    .client .name { font-weight: 600; font-size: 15px; }
    section { margin-bottom: 24px; }
    section h2 { font-size: 14px; text-transform: uppercase; color: #5d6780; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; padding: 8px; background: #f4f6f9; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #5d6780; }
    td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .totals { margin-top: 16px; width: 50%; margin-left: auto; font-size: 14px; }
    .totals td { border: none; padding: 4px 8px; }
    .totals .grand { border-top: 2px solid #1d2330; font-weight: 700; font-size: 16px; padding-top: 10px; }
    footer { margin-top: 40px; font-size: 12px; color: #5d6780; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    .signature { margin-top: 40px; padding-top: 40px; border-top: 1px dashed #5d6780; }
    .signature-line { display: inline-block; min-width: 240px; border-bottom: 1px solid #1d2330; height: 30px; }
  </style>
`

export function renderSowHtml(sow: SowDocument, client: ClientInfo): string {
  const rows = sow.deliverables.map((d) => {
    const qty = d.quantity ?? 1
    const hrs = d.hours
    const unit = d.unit_price_cents ?? 0
    const line = d.line_total_cents ?? ((hrs ?? qty) * unit)
    const qtyCell = hrs != null ? `${hrs} hr` : `${qty}`
    return `
      <tr>
        <td><strong>${escapeHtml(d.name)}</strong><br><span style="color:#5d6780;font-size:12px">${escapeHtml(d.description)}</span></td>
        <td class="num">${qtyCell}</td>
        <td class="num">${formatCents(unit)}</td>
        <td class="num">${formatCents(line)}</td>
      </tr>
    `
  }).join('')

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(sow.title)}</title>${SHARED_STYLES}</head>
<body>
<header>
  <div>
    <img src="https://demandsignals.us/assets/logos/dsig_logo_v2b.png" alt="Demand Signals">
    <div class="meta">Demand Signals · demandsignals.co</div>
  </div>
  <div style="text-align:right">
    <h1>Statement of Work</h1>
    <div class="meta">${escapeHtml(sow.sow_number)}</div>
    ${sow.send_date ? `<div class="meta">Issued ${escapeHtml(sow.send_date)}</div>` : ''}
  </div>
</header>

${clientBlockHtml(client)}

<section>
  <h2>${escapeHtml(sow.title)}</h2>
  ${sow.scope_summary ? `<p>${escapeHtml(sow.scope_summary)}</p>` : ''}
</section>

<section>
  <h2>Deliverables</h2>
  <table>
    <thead><tr><th>Item</th><th class="num">Qty/Hours</th><th class="num">Rate</th><th class="num">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>

${sow.timeline.length > 0 ? `
<section>
  <h2>Timeline</h2>
  <ul>${sow.timeline.map((p) => `<li><strong>${escapeHtml(p.name)}</strong> (${p.duration_weeks}w) — ${escapeHtml(p.description)}</li>`).join('')}</ul>
</section>` : ''}

<section>
  <h2>Pricing</h2>
  <table class="totals">
    <tr><td>Total</td><td class="num">${formatCents(sow.pricing.total_cents)}</td></tr>
    <tr><td>Deposit (${sow.pricing.deposit_pct}%)</td><td class="num">${formatCents(sow.pricing.deposit_cents)}</td></tr>
    <tr class="grand"><td>Balance on delivery</td><td class="num">${formatCents(sow.pricing.total_cents - sow.pricing.deposit_cents)}</td></tr>
  </table>
</section>

${sow.payment_terms ? `<section><h2>Payment Terms</h2><p>${escapeHtml(sow.payment_terms)}</p></section>` : ''}
${sow.guarantees ? `<section><h2>Guarantees</h2><p>${escapeHtml(sow.guarantees)}</p></section>` : ''}
${sow.notes ? `<section><h2>Notes</h2><p>${escapeHtml(sow.notes)}</p></section>` : ''}

<div class="signature">
  <div style="display:flex;gap:40px">
    <div><div style="margin-bottom:4px;font-size:12px;color:#5d6780">Client signature</div><div class="signature-line"></div><div style="font-size:11px;color:#5d6780;margin-top:4px">Date</div></div>
    <div><div style="margin-bottom:4px;font-size:12px;color:#5d6780">DSIG signature</div><div class="signature-line"></div><div style="font-size:11px;color:#5d6780;margin-top:4px">Date</div></div>
  </div>
</div>

<footer>Demand Signals · DemandSignals@gmail.com · (916) 542-2423 · demandsignals.co</footer>
</body></html>`
}

export function renderInvoiceHtml(inv: InvoiceWithLineItems, client: ClientInfo): string {
  const rows = inv.line_items.sort((a, b) => a.sort_order - b.sort_order).map((li) => `
    <tr>
      <td>${escapeHtml(li.description)}${li.discount_label ? `<br><span style="color:#5d6780;font-size:12px">${escapeHtml(li.discount_label)}</span>` : ''}</td>
      <td class="num">${li.quantity}</td>
      <td class="num">${formatCents(li.unit_price_cents)}</td>
      ${li.discount_cents > 0 ? `<td class="num" style="color:#f28500">-${formatCents(li.discount_cents)}</td>` : '<td class="num">—</td>'}
      <td class="num">${formatCents(li.line_total_cents)}</td>
    </tr>
  `).join('')

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(inv.invoice_number)}</title>${SHARED_STYLES}</head>
<body>
<header>
  <div>
    <img src="https://demandsignals.us/assets/logos/dsig_logo_v2b.png" alt="Demand Signals">
    <div class="meta">Demand Signals · demandsignals.co</div>
  </div>
  <div style="text-align:right">
    <h1>Invoice</h1>
    <div class="meta">${escapeHtml(inv.invoice_number)}</div>
    ${inv.send_date ? `<div class="meta">Issued ${escapeHtml(inv.send_date)}</div>` : ''}
    ${inv.due_date ? `<div class="meta">Due ${escapeHtml(inv.due_date)}</div>` : ''}
  </div>
</header>

${clientBlockHtml(client)}

<section>
  <table>
    <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Discount</th><th class="num">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>

<table class="totals">
  <tr><td>Subtotal</td><td class="num">${formatCents(inv.subtotal_cents)}</td></tr>
  ${inv.discount_cents > 0 ? `<tr><td>Discount</td><td class="num">-${formatCents(inv.discount_cents)}</td></tr>` : ''}
  ${inv.late_fee_cents > 0 && inv.late_fee_applied_at ? `<tr><td>Late fee</td><td class="num">${formatCents(inv.late_fee_cents)}</td></tr>` : ''}
  <tr class="grand"><td>Total due</td><td class="num">${formatCents(inv.total_due_cents + ((inv.late_fee_applied_at ? inv.late_fee_cents : 0)))}</td></tr>
</table>

${inv.late_fee_cents > 0 && !inv.late_fee_applied_at ? `<p style="font-size:12px;color:#5d6780">Late fee of ${formatCents(inv.late_fee_cents)} applies if unpaid after ${inv.late_fee_grace_days} days past due.</p>` : ''}

${inv.notes ? `<section><h2>Notes</h2><p>${escapeHtml(inv.notes)}</p></section>` : ''}

<footer>Demand Signals · DemandSignals@gmail.com · (916) 542-2423 · demandsignals.co</footer>
</body></html>`
}
```

- [ ] **Step 2: Write `DocumentPreview.tsx` client component**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface Props {
  src: string  // URL to the preview endpoint
  title: string
}

export default function DocumentPreview({ src, title }: Props) {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(src)
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.text()
      })
      .then(setHtml)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }, [src])

  if (error) return <div className="text-sm text-red-600">Preview error: {error}</div>
  if (!html) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-teal-500" /></div>

  return (
    <iframe
      title={title}
      srcDoc={html}
      className="w-full border border-slate-200 rounded-xl bg-white"
      style={{ height: '90vh' }}
    />
  )
}
```

- [ ] **Step 3: Create preview API route for SOW**

`src/app/api/admin/sow/[id]/preview/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { renderSowHtml } from '@/lib/doc-preview'

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await ctx.params

  const { data: sow } = await supabaseAdmin
    .from('sow_documents').select('*, prospect:prospect_id(*)')
    .eq('id', id).single()
  if (!sow) return new Response('Not found', { status: 404 })

  const prospect = (sow as any).prospect ?? {}
  const html = renderSowHtml(sow, {
    business_name: prospect.business_name ?? '—',
    owner_name: prospect.owner_name,
    owner_email: prospect.owner_email,
    business_email: prospect.business_email,
    owner_phone: prospect.owner_phone,
    business_phone: prospect.business_phone,
    address: prospect.address,
    city: prospect.city,
    state: prospect.state,
    zip: prospect.zip,
  })
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
```

- [ ] **Step 4: Create preview API route for Invoice**

`src/app/api/admin/invoices/[id]/preview/route.ts`: analogous — load invoice + line_items + prospect, call `renderInvoiceHtml`.

- [ ] **Step 5: Verify + commit**

```bash
npx tsc --noEmit 2>&1 | tail -10
git add src/lib/doc-preview.ts src/components/admin/DocumentPreview.tsx src/app/api/admin/sow/\[id\]/preview src/app/api/admin/invoices/\[id\]/preview
git commit -m "feat(docs): shared HTML preview renderer + SOW/Invoice preview endpoints"
```

---

## Task 12: SOW detail page — wire up preview

**Files:** Modify `src/app/admin/sow/[id]/page.tsx`

- [ ] **Step 1: Add a "Preview" button next to "PDF"**

When clicked, toggles local state `showPreview`. When `showPreview`, render `<DocumentPreview src={\`/api/admin/sow/${id}/preview\`} title={sow.title} />` in a full-width area.

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/sow/\[id\]/page.tsx
git commit -m "feat(sow): live HTML preview on detail page"
```

---

## Task 13: Invoice detail page — add detail page

**Files:** Create `src/app/admin/invoices/[id]/page.tsx`

Check if it exists already — looking at the earlier exploration, `src/app/admin/invoices/[id]/page.tsx` exists.

- [ ] **Step 1: Read current file**

- [ ] **Step 2: Ensure it shows: Preview button (toggles `<DocumentPreview src={\`/api/admin/invoices/${id}/preview\`} />`), Edit button, Refund, Resend, Mark Paid**

Edit button enters an edit mode — see Task 15.
Refund button calls `POST /api/admin/invoices/{id}/refund` with an optional `amount_cents` (default full total) and confirms first.
Resend button calls `POST /api/admin/invoices/{id}/resend`, which re-sends the existing `sent_via_channel` payload.
Mark Paid button calls the existing `POST /api/admin/invoices/{id}/mark-paid`.

- [ ] **Step 3: Add client info block at top**

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/invoices/\[id\]/page.tsx
git commit -m "feat(invoice): detail page with preview + refund + resend + mark-paid"
```

---

## Task 14: Invoice API — refund + resend

**Files:** Create `src/app/api/admin/invoices/[id]/refund/route.ts` + `src/app/api/admin/invoices/[id]/resend/route.ts`

- [ ] **Step 1: Refund handler**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

const bodySchema = z.object({
  amount_cents: z.number().int().positive().optional(),
  reason: z.string().optional(),
})

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await ctx.params

  let parsed
  try { parsed = bodySchema.parse(await request.json()) } catch { return NextResponse.json({ error: 'invalid body' }, { status: 400 }) }

  const { data: inv } = await supabaseAdmin
    .from('invoices').select('id, total_due_cents, stripe_payment_link_id, status').eq('id', id).single()
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (inv.status !== 'paid') return NextResponse.json({ error: `Cannot refund invoice in status ${inv.status}` }, { status: 409 })

  const refundAmount = parsed.amount_cents ?? inv.total_due_cents

  // Record refund intent. Actual Stripe refund call happens in a follow-up
  // when Stripe is live. For now, mark the invoice as 'refunded' and log.
  await supabaseAdmin.from('invoices').update({
    status: 'void',
    void_reason: `Refund: ${parsed.reason ?? 'admin-initiated'} · ${refundAmount} cents`,
    voided_at: new Date().toISOString(),
    voided_by: auth.user_id,
  }).eq('id', id)

  return NextResponse.json({ ok: true, refund_amount_cents: refundAmount, note: 'Refund recorded; complete in Stripe manually until integration lands.' })
}
```

- [ ] **Step 2: Resend handler**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await ctx.params

  const { data: inv } = await supabaseAdmin
    .from('invoices').select('id, sent_via_channel, sent_via_email_to').eq('id', id).single()
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delegate to existing send-email or send-sms endpoint based on original channel.
  const path = inv.sent_via_channel === 'sms' ? 'send-sms' : 'send-email'
  const base = request.nextUrl.origin
  const res = await fetch(`${base}/api/admin/invoices/${id}/${path}`, {
    method: 'POST',
    headers: { cookie: request.headers.get('cookie') ?? '' },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return NextResponse.json({ error: data.error ?? 'Resend failed' }, { status: res.status })
  return NextResponse.json({ ok: true, channel: inv.sent_via_channel })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/invoices/\[id\]/refund src/app/api/admin/invoices/\[id\]/resend
git commit -m "feat(invoice): refund + resend API endpoints"
```

---

## Task 15: Invoice — edit after creation

**Files:** Modify `src/app/api/admin/invoices/[id]/route.ts` (add PATCH) + create `src/app/admin/invoices/[id]/EditClient.tsx`

- [ ] **Step 1: PATCH handler**

Allow updates to: `notes`, `due_date`, `send_date`, `late_fee_cents`, `late_fee_grace_days`, `line_items` (replace all). Refuse if `status === 'paid'` or `status === 'void'` without `force_edit: true`.

When `line_items` is in the body: delete all existing, insert new, recompute `subtotal_cents`, `discount_cents`, `total_due_cents`, update the invoice row.

- [ ] **Step 2: Write `EditClient.tsx`**

Same general shape as the New Invoice form but seeded from the loaded invoice. On save, call PATCH.

- [ ] **Step 3: Add Edit button to invoice detail page (Task 13)**

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/invoices/\[id\]/route.ts src/app/admin/invoices/\[id\]/EditClient.tsx src/app/admin/invoices/\[id\]/page.tsx
git commit -m "feat(invoice): PATCH endpoint + edit-after-create UI"
```

---

## Task 16: Invoice `new` page — preview + send date + late fee

**Files:** Modify `src/app/admin/invoices/new/page.tsx`

- [ ] **Step 1: Add send_date input**

Next to the existing due_date input.

- [ ] **Step 2: Add late fee config**

Two inputs: "Late fee ($)" and "Grace days after due date." Both optional, default 0 (no late fee).

- [ ] **Step 3: Add split-pane preview**

Add a toggle button "Show preview" in the toolbar. When toggled, render the right-pane as `<DocumentPreview src={\`/api/admin/invoices/${draftId}/preview\`} />`. Requires the invoice to be saved as a draft first — add a "Save as draft" button that POSTs to the existing endpoint, then enables preview on the returned id.

(Alternative if simpler: preview renders from in-memory state via a synchronous call to `renderInvoiceHtml` — that avoids the save-first dance. Implementer picks whichever is cleaner given how much the current form ties to the server.)

- [ ] **Step 4: Include client info block in the form**

Already driven by the selected `prospect_id` — add a read-only block below the prospect select showing the prospect's contact details, with an "Edit contact info" link that opens a small inline editor to update the prospect row before the invoice is created.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/invoices/new/page.tsx
git commit -m "feat(invoice): new-invoice preview + send date + late fee"
```

---

## Task 17: Subscription detail page — edit + refund + mark-paid + delete + end date

**Files:** Modify `src/app/admin/subscriptions/[id]/page.tsx` + create `src/app/admin/subscriptions/[id]/EditClient.tsx`

- [ ] **Step 1: Add PATCH + DELETE to API**

`src/app/api/admin/subscriptions/[id]/route.ts`:
- PATCH: allow updates to `status`, `end_date`, `notes`, `override_monthly_amount_cents`, `next_invoice_date`
- DELETE: set status='canceled', canceled_at=now, cancel_reason='deleted_by_admin'. Do NOT hard-delete (keeps invoice history intact).

- [ ] **Step 2: Add new actions to the detail page**

- **Edit** button → `<EditClient subscription={...} />` with fields: end_date (date picker), notes (textarea), override amount (dollar input)
- **Refund last cycle** button → prompts for amount + reason, hits `POST /api/admin/subscriptions/{id}/refund`
- **Mark last paid** → hits `POST /api/admin/subscriptions/{id}/mark-paid`, marks most recent unpaid invoice as paid
- **Delete** button → confirms, hits `DELETE /api/admin/subscriptions/{id}`

- [ ] **Step 3: Add refund + mark-paid route handlers**

Refund: record the intent against the most recent paid invoice. Mark-paid: find most recent unpaid invoice and set `paid_at=now`, `paid_method='other'`, `status='paid'`.

- [ ] **Step 4: Add prospect contact info block + editor on the page**

Similar to SOW task — render prospect contact block; allow inline edit via `<ProspectContactEditor prospect={...} onSave={...} />`.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/subscriptions/ src/app/api/admin/subscriptions/
git commit -m "feat(subscription): edit + refund + mark-paid + delete + end date + contact editor"
```

---

## Task 18: `ProspectContactEditor` shared component

**Files:** Create `src/components/admin/ProspectContactEditor.tsx`

- [ ] **Step 1: Client component**

Loads prospect by id, renders editable fields: `owner_name`, `owner_email`, `business_email`, `owner_phone`, `business_phone`, `address`, `city`, `state`, `zip`. On save, PATCHes `/api/admin/prospects/[id]`.

- [ ] **Step 2: Ensure prospects API supports PATCH**

If `/api/admin/prospects/[id]` doesn't exist or doesn't accept PATCH, add it. Admin-only. Accept partial update of the contact fields above.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ProspectContactEditor.tsx src/app/api/admin/prospects/\[id\]/route.ts
git commit -m "feat(admin): shared ProspectContactEditor + PATCH prospect endpoint"
```

---

## Task 19: Subscription plans — add Edit + Delete

**Files:** Modify `src/app/admin/subscription-plans/page.tsx`

- [ ] **Step 1: Check current behavior**

`/admin/retainer-plans` already has edit + delete (from Task 9 of the previous retainer plan). `/admin/subscription-plans` shows all plans. Extend this page so non-retainer plans also have row-level Edit + Delete buttons, using the existing `/api/admin/retainer-plans/*` endpoints — BUT those endpoints currently guard `is_retainer=true` (fixed in that session). 

**Two options:**
- A: Generalize the existing endpoints to accept both retainer and non-retainer rows (drop the `is_retainer` scoping guard or make it conditional).
- B: Create parallel `/api/admin/subscription-plans/[id]` endpoints that don't scope.

Recommend B — separation keeps the retainer-specific path safe from accidental edits to other plan types. Build these parallel endpoints:

- `src/app/api/admin/subscription-plans/route.ts` — GET list (all plans), POST create
- `src/app/api/admin/subscription-plans/[id]/route.ts` — PATCH update, DELETE soft-delete (`active=false`)

- [ ] **Step 2: Wire the subscription-plans page to use them**

Add Edit/Delete buttons per row. Edit opens an inline form or modal with the same fields as the retainer editor.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/subscription-plans/ src/app/api/admin/subscription-plans/
git commit -m "feat(plans): edit + delete for all subscription plans"
```

---

## Task 20: Verification

- [ ] **Step 1: TypeScript**

```bash
npx tsc --noEmit 2>&1 | tail -20
```

- [ ] **Step 2: Tests**

```bash
npm test 2>&1 | tail -15
```
All existing tests still pass.

- [ ] **Step 3: Build**

```bash
npm run build 2>&1 | tail -30
```
Must succeed. (Pre-existing Supabase-URL build-time error in admin config is out of scope — if that error is the only failure, proceed.)

- [ ] **Step 4: Smoke check key pages locally (Hunter runs)**

1. `/admin/sow/new` — create a SOW with 2 priced deliverables, one hourly + one fixed. Verify total computes correctly.
2. `/admin/sow/[id]` — click Preview, see branded HTML. Click PDF, get a PDF. Click Edit, change a field, save.
3. `/admin/invoices/[id]` — Edit, Refund, Resend, Mark Paid all render.
4. `/admin/subscriptions/[id]` — Edit end_date, Refund, Mark Paid, Delete.
5. `/admin/subscription-plans` — Edit/Delete on a non-retainer plan works.
