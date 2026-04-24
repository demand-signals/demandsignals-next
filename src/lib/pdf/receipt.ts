// ── pdf/receipt.ts ───────────────────────────────────────────────────
// Premium receipt PDF — single page, Stripe-style "payment confirmed" feel.
// Green PAID stamp, clean detail table, large amount, thank-you close.

import { formatCents } from '@/lib/format'
import { htmlToPdfBuffer } from './render'
import { T, LOGO_URL, esc, docShell, FONT_STACK } from './_shared'

// ── Types ─────────────────────────────────────────────────────────────

export interface ReceiptData {
  id: string
  receipt_number: string
  invoice_id: string
  prospect_id: string
  amount_cents: number
  currency: string
  payment_method: string
  payment_reference: string | null
  paid_at: string
  notes: string | null
  created_at: string
}

export interface ReceiptInvoiceData {
  invoice_number: string
  total_due_cents: number
  send_date?: string | null
}

export interface ReceiptProspect {
  business_name: string
  client_code?: string | null
  owner_name?: string | null
  owner_email?: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────

const METHOD_LABEL: Record<string, string> = {
  stripe: 'Stripe',
  check: 'Check',
  wire: 'Wire Transfer',
  cash: 'Cash',
  trade: 'Trade',
  zero_balance: 'Zero Balance',
  other: 'Other',
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

// ── Template ──────────────────────────────────────────────────────────

function receiptBody(
  receipt: ReceiptData,
  invoice: ReceiptInvoiceData,
  prospect: ReceiptProspect,
): string {
  const methodLabel = METHOD_LABEL[receipt.payment_method] ?? receipt.payment_method

  return `
  <div style="
    width:100%;
    min-height:100vh;
    background:#fff;
    display:flex;
    flex-direction:column;
    font-family:${FONT_STACK};
  ">
    <!-- Header: logo + RECEIPT eyebrow + number + PAID stamp -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:48px 56px 28px">
      <div>
        <img src="${LOGO_URL}" alt="Demand Signals" style="height:32px;object-fit:contain;display:block;margin-bottom:14px">
        <p style="font-size:12px;color:${T.slate};line-height:1.8">
          Demand Signals<br>
          DemandSignals@gmail.com<br>
          (916) 542-2423<br>
          demandsignals.co
        </p>
      </div>

      <div style="text-align:right">
        <p style="font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:8px">PAYMENT RECEIPT</p>
        <p style="font-size:28px;font-weight:700;color:${T.dark};letter-spacing:-0.02em;line-height:1;font-variant-numeric:tabular-nums">${esc(receipt.receipt_number)}</p>
        <div style="
          margin-top:12px;
          display:inline-block;
          background:#d1fae5;
          color:#065f46;
          font-size:12px;
          font-weight:700;
          letter-spacing:0.15em;
          text-transform:uppercase;
          padding:5px 16px;
          border-radius:4px;
          border:1.5px solid #6ee7b7;
        ">&#x2713; PAID</div>
      </div>
    </div>

    <!-- Gradient bar -->
    <div style="height:4px;background:linear-gradient(90deg,${T.orangeDeep},${T.teal});width:100%"></div>

    <!-- Amount hero -->
    <div style="padding:40px 56px 32px;border-bottom:1px solid ${T.rule}">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:8px">AMOUNT PAID</p>
      <div style="font-size:56px;font-weight:700;color:#065f46;letter-spacing:-0.03em;line-height:1;font-variant-numeric:tabular-nums">${formatCents(receipt.amount_cents)}</div>
      <p style="font-size:12px;color:${T.slateSoft};margin-top:6px">${receipt.currency.toUpperCase()}</p>
    </div>

    <!-- Bill to + details columns -->
    <div style="display:flex;gap:0;padding:28px 56px;border-bottom:1px solid ${T.rule}">
      <!-- Client -->
      <div style="flex:1;padding-right:40px">
        <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:10px">CLIENT</p>
        <p style="font-size:15px;font-weight:700;color:${T.dark};line-height:1.3">${esc(prospect.business_name)}</p>
        ${prospect.owner_name ? `<p style="font-size:13px;color:${T.slate};margin-top:2px">${esc(prospect.owner_name)}</p>` : ''}
        ${prospect.client_code ? `<p style="font-size:12px;color:${T.teal};font-family:monospace;margin-top:2px">${esc(prospect.client_code)}</p>` : ''}
      </div>

      <!-- Receipt details -->
      <div style="flex:1;border-left:1px solid ${T.rule};padding-left:40px;display:flex;flex-direction:column;gap:14px">
        <div>
          <p style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:3px">PAID DATE</p>
          <p style="font-size:13px;font-weight:600;color:${T.dark}">${formatDate(receipt.paid_at)}</p>
        </div>
        <div>
          <p style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:3px">PAYMENT METHOD</p>
          <p style="font-size:13px;color:${T.dark}">${esc(methodLabel)}</p>
        </div>
        ${receipt.payment_reference ? `
        <div>
          <p style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:3px">REFERENCE</p>
          <p style="font-size:12px;color:${T.dark};font-family:monospace">${esc(receipt.payment_reference)}</p>
        </div>` : ''}
      </div>
    </div>

    <!-- Applied to invoice -->
    <div style="padding:24px 56px;border-bottom:1px solid ${T.rule};display:flex;justify-content:space-between;align-items:center">
      <div>
        <p style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:4px">APPLIED TO INVOICE</p>
        <p style="font-size:14px;font-weight:600;color:${T.dark};font-variant-numeric:tabular-nums">${esc(invoice.invoice_number)}</p>
        ${invoice.send_date ? `<p style="font-size:12px;color:${T.slate};margin-top:2px">Issued ${formatDate(invoice.send_date)}</p>` : ''}
      </div>
      <div style="text-align:right">
        <p style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:4px">INVOICE TOTAL</p>
        <p style="font-size:14px;font-weight:600;color:${T.dark};font-variant-numeric:tabular-nums">${formatCents(invoice.total_due_cents)}</p>
      </div>
    </div>

    ${receipt.notes ? `
    <div style="
      margin:20px 56px 0;
      background:rgba(104,197,173,0.06);
      border-radius:10px;
      border-left:3px solid ${T.teal};
      padding:16px 20px;
    ">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.tealDark};margin-bottom:8px">NOTES</p>
      <p style="font-size:13px;color:${T.dark};line-height:1.6">${esc(receipt.notes)}</p>
    </div>` : ''}

    <!-- Thank you + contact -->
    <div style="padding:36px 56px 0;text-align:center">
      <p style="font-size:18px;font-weight:700;color:${T.dark};margin-bottom:8px">Thank you for your payment!</p>
      <p style="font-size:13px;color:${T.slate};margin-bottom:20px">Questions? Contact us at DemandSignals@gmail.com or (916) 542-2423.</p>
    </div>

    <div style="flex:1"></div>

    <!-- Footer -->
    <div style="
      margin-top:32px;
      border-top:1px solid ${T.rule};
      padding:16px 56px;
      display:flex;
      justify-content:space-between;
      align-items:center;
    ">
      <p style="font-size:11px;color:${T.slateSoft}">Receipt is an immutable payment record — Demand Signals</p>
      <p style="font-size:11px;color:${T.slateSoft}">&copy; 2026 Demand Signals. Confidential.</p>
    </div>
  </div>`
}

// ── Main export ───────────────────────────────────────────────────────

/**
 * Render a premium receipt PDF and return the raw Buffer.
 */
export async function renderReceiptPdf(
  receipt: ReceiptData,
  invoice: ReceiptInvoiceData,
  prospect: ReceiptProspect,
): Promise<Buffer> {
  const html = docShell(
    `Receipt ${receipt.receipt_number} — ${prospect.business_name}`,
    receiptBody(receipt, invoice, prospect),
  )
  return htmlToPdfBuffer(html, { format: 'Letter', printBackground: true })
}
