# Plan A — Magic-link Pay button + Stripe activation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every outstanding cash invoice payable via the magic-link page today. Stripe webhook properly issues receipts.

**Architecture:** Drop the precondition on the Pay button so it always renders for outstanding cash invoices. Button points at the existing `/api/invoices/public/[number]/pay?key=<uuid>` redirect, which lazily creates the Payment Link via `ensurePaymentLink()`. Webhook handler is enhanced to auto-create RCT receipts on `payment_intent.succeeded` / `checkout.session.completed` / `invoice.paid`. Stripe activation: env vars + dashboard webhook + `stripe_enabled=true` config flag.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (Postgres + service role), Stripe SDK v22, existing `stripe-client.ts` + `stripe-sync.ts` libs.

**Spec:** `docs/superpowers/specs/2026-04-24-stripe-payment-plans-design.md`

---

## File Structure

**New files:** none.

**Modified files:**
- `src/app/invoice/[number]/[uuid]/page.tsx` — drop `stripe_payment_link_url` precondition on Pay button; render whenever outstanding + cash + Stripe enabled.
- `src/app/api/invoices/public/[number]/route.ts` — add `stripe_enabled` flag to response so the page can gate UI without an extra round-trip.
- `src/lib/stripe-sync.ts` — add `setup_future_usage='off_session'` to `ensurePaymentLink()` so cards are saved on the customer for reuse.
- `src/app/api/webhooks/stripe/route.ts` — auto-issue RCT receipts on payment events.

**Operational changes (not code):**
- Set Vercel env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- Stripe dashboard: add webhook endpoint at `https://demandsignals.co/api/webhooks/stripe`.
- Supabase: insert `quote_config` row `stripe_enabled='true'`.

---

## Task 1: Confirm spec read + branch state

**Files:**
- Read: `docs/superpowers/specs/2026-04-24-stripe-payment-plans-design.md` (full spec)
- Read: `CLAUDE.md` §4 (creds), §12 (lessons), §15 (env vars)

- [ ] **Step 1: Read the spec end-to-end**

Open `docs/superpowers/specs/2026-04-24-stripe-payment-plans-design.md` and read all 14 sections. The plan you're about to execute implements §1 problem #1 + §8 receipt auto-issuance.

- [ ] **Step 2: Verify branch is clean and on master**

Run:
```bash
git status
git rev-parse --abbrev-ref HEAD
```
Expected: working tree clean, branch is `master`.

- [ ] **Step 3: Build baseline**

Run:
```bash
cd "D:\CLAUDE\demandsignals-next"
npm run build
```
Expected: build completes with zero errors. If errors, STOP and report — do not proceed until baseline is green.

---

## Task 2: Add `stripe_enabled` to public invoice API response

**Files:**
- Modify: `src/app/api/invoices/public/[number]/route.ts`

The page render at `/invoice/[number]/[uuid]` fetches data via this API. To gate the Pay button without a second round-trip to Stripe config, add the flag here.

- [ ] **Step 1: Read the current file**

Read `src/app/api/invoices/public/[number]/route.ts` end-to-end so you know the response shape.

- [ ] **Step 2: Import isStripeEnabled**

At the top of the file, add to the imports:
```ts
import { isStripeEnabled } from '@/lib/stripe-client'
```

- [ ] **Step 3: Compute the flag and add it to the response**

Find the `NextResponse.json({ invoice, line_items })` return at the end of the GET handler. Replace it with:
```ts
const stripeEnabled = await isStripeEnabled()
return NextResponse.json({ invoice, line_items, stripe_enabled: stripeEnabled })
```

- [ ] **Step 4: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/invoices/public/[number]/route.ts
git commit -m "feat(invoice): expose stripe_enabled flag in public invoice API"
```

---

## Task 3: Drop Pay button precondition on magic-link page

**Files:**
- Modify: `src/app/invoice/[number]/[uuid]/page.tsx` (the `InvoiceResponse` type, `fetchInvoice` consumer, and the two Pay button conditions)

Current bug: Pay button only renders when `invoice.stripe_payment_link_url` is already cached. That URL is created lazily by the `/pay` redirect endpoint, NOT during page render — so first-time viewers see the "Pay by check" fallback.

Fix: render the Pay button whenever the invoice is outstanding cash AND Stripe is enabled, pointing at the `/pay` redirect endpoint. The redirect handles link creation lazily.

- [ ] **Step 1: Extend the InvoiceResponse type**

In `src/app/invoice/[number]/[uuid]/page.tsx`, find the `interface InvoiceResponse` block. Add a new field:
```ts
interface InvoiceResponse {
  invoice: PublicInvoice
  line_items: PublicLineItem[]
  stripe_enabled: boolean
}
```

- [ ] **Step 2: Compute the canPay flag in the page component**

Find the line `const isOutstanding = !isPaid && !isVoid && invoice.total_due_cents > 0`. Right after it, add:
```ts
const canPay = isOutstanding && data.stripe_enabled
const payRedirectHref = `/api/invoices/public/${number}/pay?key=${uuid}`
```

- [ ] **Step 3: Replace the in-card Pay block (section 5)**

Find the block:
```tsx
{invoice.stripe_payment_link_url ? (
  <div>
    <p style={{ fontSize: 13, color: T.dark, lineHeight: 1.6, marginBottom: 16 }}>
      Click the button below to pay securely via card. Your invoice number will be auto-referenced.
    </p>
    <a
      href={invoice.stripe_payment_link_url}
      target="_blank"
      rel="noreferrer"
```

Replace the entire `{invoice.stripe_payment_link_url ? (...) : (...)}` ternary with:
```tsx
{canPay ? (
  <div>
    <p style={{ fontSize: 13, color: T.dark, lineHeight: 1.6, marginBottom: 16 }}>
      Click the button below to pay securely via card. Your invoice number will be auto-referenced.
    </p>
    <a
      href={payRedirectHref}
      style={{
        display: 'inline-block',
        background: T.orangeDeep,
        color: T.white,
        borderRadius: 8,
        padding: '12px 28px',
        fontWeight: 700,
        fontSize: 15,
        textDecoration: 'none',
        letterSpacing: '-0.01em',
      }}
    >
      Pay this invoice →
    </a>
  </div>
) : (
  <p style={{ fontSize: 13, color: T.dark, lineHeight: 1.7 }}>
    Pay via check, wire, or ACH. Please reference your invoice number <strong>{invoice.invoice_number}</strong> when submitting payment.
    Contact{' '}
    <a href="mailto:DemandSignals@gmail.com" style={{ color: T.tealDark, textDecoration: 'none', fontWeight: 600 }}>
      DemandSignals@gmail.com
    </a>{' '}
    for payment details.
  </p>
)}
```

(Note: removed `target="_blank"` because the redirect endpoint 302s to Stripe — same-tab is fine; client returns to the same site after pay.)

- [ ] **Step 4: Replace the action-row Pay button**

Find the block in section 7 (Action row):
```tsx
{isOutstanding && invoice.stripe_payment_link_url && (
  <a
    href={invoice.stripe_payment_link_url}
    target="_blank"
    rel="noreferrer"
```

Replace the entire `{isOutstanding && invoice.stripe_payment_link_url && (...)}` block with:
```tsx
{canPay && (
  <a
    href={payRedirectHref}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      background: T.orangeDeep,
      color: T.white,
      borderRadius: 8,
      padding: '10px 24px',
      fontSize: 15,
      fontWeight: 700,
      textDecoration: 'none',
      boxShadow: '0 4px 16px rgba(255,107,43,0.30)',
      letterSpacing: '-0.01em',
    }}
  >
    Pay {formatCents(grandTotal)} →
  </a>
)}
```

- [ ] **Step 5: Remove the now-unused `stripe_payment_link_url` from PublicInvoice**

Find `interface PublicInvoice`. The field `stripe_payment_link_url: string | null` is no longer read by the page. Leave the field (the underlying API still returns it; removing it would require API change). No edit needed — just verify no other code references it on this page.

Run grep:
```bash
grep -n stripe_payment_link_url src/app/invoice/[number]/[uuid]/page.tsx
```
Expected: only the type definition line. No more JSX references.

- [ ] **Step 6: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/invoice/[number]/[uuid]/page.tsx
git commit -m "fix(invoice): always render Pay button for outstanding cash invoices"
```

---

## Task 4: Add `setup_future_usage` to Payment Link creation

**Files:**
- Modify: `src/lib/stripe-sync.ts:106-129` (the `paymentLinks.create` call inside `ensurePaymentLink`)

Goal: when a client pays via a Payment Link, save their card on the Stripe Customer for re-use on later invoices. This is the foundation that makes "use saved card" possible for Plan B installment 2 and Plan C subscription card collection.

- [ ] **Step 1: Read the current ensurePaymentLink implementation**

Read `src/lib/stripe-sync.ts` lines 60–141 to understand the current call.

- [ ] **Step 2: Add payment_intent_data to the paymentLinks.create call**

In `src/lib/stripe-sync.ts`, find:
```ts
const link = await s.paymentLinks.create(
  {
    line_items: [
      {
        price: price.id,
        quantity: 1,
      },
    ],
    metadata: {
      dsig_invoice_id: invoice.id,
      dsig_invoice_number: invoice.invoice_number,
      dsig_kind: invoice.kind,
    },
    after_completion: {
      type: 'redirect',
      redirect: {
        url: `https://demandsignals.co/invoice/${invoice.invoice_number}/${invoice.public_uuid}?paid=1`,
      },
    },
  },
```

Insert `payment_intent_data` and `customer_creation` BEFORE the `metadata` field:
```ts
const link = await s.paymentLinks.create(
  {
    line_items: [
      {
        price: price.id,
        quantity: 1,
      },
    ],
    customer_creation: 'always',
    payment_intent_data: {
      setup_future_usage: 'off_session',
      metadata: {
        dsig_invoice_id: invoice.id,
        dsig_invoice_number: invoice.invoice_number,
      },
    },
    metadata: {
      dsig_invoice_id: invoice.id,
      dsig_invoice_number: invoice.invoice_number,
      dsig_kind: invoice.kind,
    },
    after_completion: {
      type: 'redirect',
      redirect: {
        url: `https://demandsignals.co/invoice/${invoice.invoice_number}/${invoice.public_uuid}?paid=1`,
      },
    },
  },
```

Note: `customer_creation: 'always'` ensures Stripe creates a Customer for one-shot Payment Link payments so the saved card has somewhere to attach. `payment_intent_data.metadata` mirrors top-level metadata so PaymentIntent webhook events can resolve back to the DSIG invoice (the top-level Payment Link metadata doesn't propagate to PI events).

- [ ] **Step 3: Build to verify**

Run: `npm run build`
Expected: zero TypeScript errors. (The Stripe SDK types accept these fields.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/stripe-sync.ts
git commit -m "feat(stripe): save card on Payment Link payment for future use"
```

---

## Task 5: Auto-issue RCT receipts on Stripe payment webhooks

**Files:**
- Modify: `src/app/api/webhooks/stripe/route.ts`
- Modify: `src/lib/stripe-sync.ts` (add a helper)

Today, `markInvoicePaidFromStripe()` only flips the invoice status. The admin-side `/api/admin/invoices/[id]/mark-paid` route creates a receipt as a side effect, but the Stripe webhook path skips that. Result: Stripe-paid invoices have no RCT receipt.

Fix: extract the receipt-creation logic from the mark-paid route into a shared helper, then call it from the webhook handler.

- [ ] **Step 1: Add a `createReceiptForInvoice()` helper to stripe-sync.ts**

At the bottom of `src/lib/stripe-sync.ts`, append:
```ts
// ── Auto-issue RCT receipt for a paid invoice ───────────────────────
// Mirrors the receipt-creation block in /api/admin/invoices/[id]/mark-paid.
// Idempotent: if a receipt already exists for this invoice with the same
// amount + payment_method, skips creation.
//
// Best-effort: failures are logged but never thrown. The invoice is already
// marked paid; missing a receipt is a recoverable state (admin can re-create
// from the admin UI later).
export async function createReceiptForInvoice(args: {
  invoiceId: string
  prospectId: string
  amountCents: number
  paymentMethod: string
  paymentReference?: string | null
  notes?: string | null
}): Promise<void> {
  // Idempotency: short-circuit if a receipt for this exact (invoice, amount,
  // method) already exists. Stripe webhooks can fire duplicates; we trust the
  // stripe_events UNIQUE constraint as the primary guard, but defense-in-depth
  // here protects against any race between webhook + admin manual mark-paid.
  const { data: existing } = await supabaseAdmin
    .from('receipts')
    .select('id')
    .eq('invoice_id', args.invoiceId)
    .eq('amount_cents', args.amountCents)
    .eq('payment_method', args.paymentMethod)
    .limit(1)
    .maybeSingle()
  if (existing) return

  const tempRct = `PENDING-${crypto.randomUUID()}`
  const { data: rctRow, error: rctErr } = await supabaseAdmin
    .from('receipts')
    .insert({
      receipt_number: tempRct,
      invoice_id: args.invoiceId,
      prospect_id: args.prospectId,
      amount_cents: args.amountCents,
      currency: 'USD',
      payment_method: args.paymentMethod,
      payment_reference: args.paymentReference ?? null,
      paid_at: new Date().toISOString(),
      notes: args.notes ?? null,
    })
    .select('id')
    .single()

  if (rctErr || !rctRow) {
    console.error('[createReceiptForInvoice] insert failed:', rctErr?.message)
    return
  }

  try {
    const { allocateDocNumber } = await import('./doc-numbering')
    const rctNumber = await allocateDocNumber({
      doc_type: 'RCT',
      prospect_id: args.prospectId,
      ref_table: 'receipts',
      ref_id: rctRow.id,
    })
    await supabaseAdmin
      .from('receipts')
      .update({ receipt_number: rctNumber })
      .eq('id', rctRow.id)
  } catch (numErr) {
    console.error('[createReceiptForInvoice] numbering failed:', numErr instanceof Error ? numErr.message : numErr)
    // Receipt remains as PENDING-… — visible in admin and fixable manually.
  }
}
```

- [ ] **Step 2: Modify markInvoicePaidFromStripe to issue receipt**

In `src/lib/stripe-sync.ts`, find `markInvoicePaidFromStripe` (around line 147–170). Replace the function body with:
```ts
export async function markInvoicePaidFromStripe(
  invoiceId: string,
  options: {
    paymentMethod?: string
    note?: string
    amountCents?: number
    paymentReference?: string | null
  } = {},
): Promise<void> {
  const { data: current } = await supabaseAdmin
    .from('invoices')
    .select('id, status, total_due_cents, prospect_id')
    .eq('id', invoiceId)
    .maybeSingle()

  if (!current || current.status === 'paid' || current.status === 'void') {
    return
  }

  const amountCents = options.amountCents ?? current.total_due_cents
  const isFullPayment = amountCents >= current.total_due_cents
  const newStatus = isFullPayment ? 'paid' : current.status  // keep 'sent'/'viewed' if partial
  const paymentMethod = options.paymentMethod ?? 'stripe'

  await supabaseAdmin
    .from('invoices')
    .update({
      status: newStatus,
      ...(isFullPayment
        ? {
            paid_at: new Date().toISOString(),
            paid_method: paymentMethod,
            paid_note: options.note ?? 'Paid via Stripe',
          }
        : {}),
    })
    .eq('id', invoiceId)

  // Issue receipt for the amount actually received (works for partials too).
  if (current.prospect_id) {
    await createReceiptForInvoice({
      invoiceId: invoiceId,
      prospectId: current.prospect_id,
      amountCents,
      paymentMethod,
      paymentReference: options.paymentReference ?? null,
      notes: options.note ?? null,
    })
  }
}
```

- [ ] **Step 3: Update webhook handler to pass amount on payment events**

In `src/app/api/webhooks/stripe/route.ts`, find the `handleEvent` function. Update the `checkout.session.completed` / `payment_intent.succeeded` case to extract the amount from the event:
```ts
    case 'checkout.session.completed':
    case 'payment_intent.succeeded': {
      const invoiceId = await findInvoiceForStripeEvent(event)
      if (invoiceId) {
        // Extract amount: checkout sessions use amount_total (cents),
        // payment_intents use amount_received.
        const obj = event.data.object as unknown as Record<string, unknown>
        const amountCents =
          (obj.amount_total as number | undefined) ??
          (obj.amount_received as number | undefined) ??
          undefined
        const reference =
          (obj.id as string | undefined) ?? null
        await markInvoicePaidFromStripe(invoiceId, {
          paymentMethod: 'stripe',
          amountCents,
          paymentReference: reference,
          note: `Stripe ${event.type} ${event.id}`,
        })
      }
      return
    }
```

And the `invoice.paid` case:
```ts
    case 'invoice.paid': {
      const invoiceId = await findInvoiceForStripeEvent(event)
      if (invoiceId) {
        const obj = event.data.object as unknown as Record<string, unknown>
        const amountCents = (obj.amount_paid as number | undefined) ?? undefined
        const reference = (obj.id as string | undefined) ?? null
        await markInvoicePaidFromStripe(invoiceId, {
          paymentMethod: 'stripe',
          amountCents,
          paymentReference: reference,
          note: `Stripe invoice.paid ${event.id}`,
        })
      }
      return
    }
```

- [ ] **Step 4: Build to verify**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stripe-sync.ts src/app/api/webhooks/stripe/route.ts
git commit -m "feat(stripe): auto-issue RCT receipts on Stripe payment webhooks"
```

---

## Task 6: Verify env vars + Supabase config flag (operational, not code)

**Files:**
- No code changes. This is an operational checklist.

- [ ] **Step 1: Confirm Vercel env vars**

In Vercel dashboard → Project `demandsignals-next` → Settings → Environment Variables, verify these exist for **Production**:
- `STRIPE_SECRET_KEY` — sk_live_… or sk_test_… (test mode acceptable for v1 rollout)
- `STRIPE_WEBHOOK_SECRET` — whsec_… (set after Step 2 below)

If missing: ask Hunter for the keys.

- [ ] **Step 2: Add Stripe webhook endpoint in Stripe dashboard**

In Stripe dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://demandsignals.co/api/webhooks/stripe`
- Events to send (select these explicitly):
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `charge.refunded`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.paused`
  - `customer.subscription.resumed`
- Copy the signing secret (`whsec_…`).
- Set as `STRIPE_WEBHOOK_SECRET` in Vercel.
- Trigger a redeploy in Vercel (or push any small commit) so the new env var loads.

- [ ] **Step 3: Insert stripe_enabled config flag in Supabase**

In Supabase SQL Editor for project `uoekjqkawssbskfkziwz`, run:
```sql
INSERT INTO quote_config (key, value) VALUES ('stripe_enabled', 'true')
ON CONFLICT (key) DO UPDATE SET value = 'true';
```

Verify with:
```sql
SELECT key, value FROM quote_config WHERE key = 'stripe_enabled';
```
Expected: one row, value = 'true'.

- [ ] **Step 4: Verify settings page reflects readiness**

Open `https://demandsignals.co/admin/settings`. Confirm:
- "Stripe Payments" flag shows ON (green)
- `stripe_secret_configured`: ✓
- `stripe_webhook_secret_configured`: ✓

If either env signal is red, re-verify Vercel env vars.

---

## Task 7: End-to-end manual smoke test (test mode)

**Files:**
- No code changes. Manual verification.

- [ ] **Step 1: Find or create a test invoice**

In `/admin/invoices`, find an invoice with status `sent` or `viewed` and `total_due_cents > 0`. Note its magic-link URL: `https://demandsignals.co/invoice/[number]/[uuid]`.

If none exist, create one:
- Go to `/admin/prospects`, find any prospect with `client_code` set
- Click into the prospect, use whatever new-invoice action exists (or insert via SQL with status='sent')

- [ ] **Step 2: Open the magic link in an incognito window**

Open the URL. Expected:
- Page renders
- Pay button appears (orange "Pay $X.XX →") in both the payment card section AND the action row
- "Pay via check, wire, or ACH" fallback is gone

If button doesn't render: check `/admin/settings` that Stripe is enabled. Check browser console for errors. Check that `stripe_enabled` came back true in the API response (Network tab on the page → look at `/api/invoices/public/[number]?key=…` response JSON).

- [ ] **Step 3: Click Pay button**

Click. Expected: 302 redirect to a Stripe-hosted page (`https://buy.stripe.com/test_…` in test mode, `https://buy.stripe.com/…` in live mode).

If you get an error page: inspect Network tab. Common issues:
- 503 "Stripe is disabled" → config flag not set
- 502 "Stripe error: ..." → API key issue or invalid invoice state

- [ ] **Step 4: Pay with test card (test mode only — DO NOT USE REAL CARD UNLESS DESIRED)**

In Stripe test mode, use card `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP. Submit.

- [ ] **Step 5: Verify post-payment state**

After Stripe redirects back to `/invoice/[number]/[uuid]?paid=1`:
- Refresh page. Status pill should show "PAID ✓".
- In `/admin/invoices/[id]`, status = paid, paid_method = stripe, paid_at populated.
- In `/admin/receipts`, a new RCT-CLIENT-MMDDYY{S} row exists for this invoice with payment_method = stripe.

If receipt is missing: check Vercel function logs for `/api/webhooks/stripe`. Check `stripe_events` table:
```sql
SELECT stripe_event_id, event_type, processing_result, error_message, processed_at
FROM stripe_events ORDER BY processed_at DESC LIMIT 10;
```
Both `payment_intent.succeeded` and `checkout.session.completed` should appear with `processing_result='success'`.

- [ ] **Step 6: Verify card was saved**

In Stripe dashboard → Customers, find the customer for this prospect (search by email or business name). Click in. Expected: a Payment Method (card) is attached.

This is the foundation Plan B/C will depend on.

---

## Task 8: Push and confirm production

**Files:**
- No code changes.

- [ ] **Step 1: Push all Plan A commits**

Run:
```bash
git push origin master
```
(Use the OAuth token method per CLAUDE.md §4 if needed.)

Vercel auto-deploys on push.

- [ ] **Step 2: Wait for Vercel deploy**

Watch Vercel dashboard or run:
```bash
curl -s -o /dev/null -w "%{http_code}" https://demandsignals.co
```
Expected: 200.

- [ ] **Step 3: Re-run smoke test on production**

Repeat Task 7 steps 2–6 on the live site to confirm production behavior matches.

- [ ] **Step 4: Update CLAUDE.md "What Is Complete" section**

In `CLAUDE.md` §10, append to the bullet list:
```markdown
- [x] Stripe activation (Plan A): magic-link Pay button always renders for outstanding cash invoices; Stripe Payment Links lazily created via /pay redirect; cards saved via setup_future_usage; Stripe webhook auto-issues RCT receipts.
```

- [ ] **Step 5: Final commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark Plan A complete (Stripe magic-link payments live)"
git push origin master
```

---

## Plan A complete

After this plan: every existing outstanding cash invoice can be paid via the magic link. Stripe is activated. Cards are saved for re-use. Receipts auto-issue.

**Next:** Plan B — payment plans + SOW conversion (the SOW-MOME and Hangtown cases).
