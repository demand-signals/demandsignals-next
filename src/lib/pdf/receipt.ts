// ── pdf/receipt.ts ───────────────────────────────────────────────────
// Premium receipt PDF — single page, "payment confirmed" feel.
// Per DSIG PDF Standard v2: interior header + footer, TEAL_S amount,
// SLATE headings, GRAY labels. Green PAID stamp retained as status signal.

import { formatCents } from '@/lib/format'
import { htmlToPdfBuffer } from './render'
import {
  T, FONT_STACK,
  esc, docShell,
  interiorPageHeader, interiorPageFooter,
} from './_shared'

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
  stripe:       'Stripe',
  check:        'Check',
  wire:         'Wire Transfer',
  cash:         'Cash',
  trade:        'Trade',
  zero_balance: 'Zero Balance',
  other:        'Other',
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
    position:relative;
    width:100%;
    min-height:100vh;
    background:${T.WHITE};
    display:flex;
    flex-direction:column;
    font-family:${FONT_STACK};
  ">
    ${interiorPageHeader('Receipt')}

    <!-- Angled PAID stamp in the white-space gutter, matches the
         invoice PDF + invoice magic-link page exactly so a paid
         invoice and its receipt look like a coordinated set.
         Hunter directive 2026-04-29. -->
    <div style="
      position:absolute;
      top:32px;
      left:48%;
      transform:translateX(-50%) rotate(-12deg);
      pointer-events:none;
      z-index:10;
      border:4px double ${T.TEAL_S};
      border-radius:6px;
      padding:8px 22px 6px;
      opacity:0.6;
      background:${T.WHITE};
      font-family:Georgia,'Times New Roman',serif;
      text-align:center;
    ">
      <p style="
        font-size:36px;
        font-weight:900;
        letter-spacing:0.08em;
        color:${T.TEAL_S};
        margin:0;
        line-height:1;
        text-transform:uppercase;
      ">PAID</p>
      <p style="font-size:9px;font-weight:600;letter-spacing:0.15em;color:${T.TEAL_S};margin:3px 0 0;font-family:${FONT_STACK}">${formatDate(receipt.paid_at)}</p>
    </div>

    <!-- Receipt number row (PAID pill removed — angled stamp above
         replaces it as the primary status signal). -->
    <div style="
      padding:16px 54px 14px;
      border-bottom:1px solid ${T.BORDER};
    ">
      <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:6px">PAYMENT RECEIPT</p>
      <p style="font-size:26px;font-weight:700;color:${T.SLATE};letter-spacing:-0.02em;line-height:1;font-variant-numeric:tabular-nums">${esc(receipt.receipt_number)}</p>
    </div>

    <!-- Amount hero -->
    <div style="padding:28px 54px 24px;border-bottom:1px solid ${T.BORDER}">
      <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:6px">AMOUNT PAID</p>
      <div style="
        font-size:52px;
        font-weight:700;
        color:${T.TEAL_S};
        letter-spacing:-0.03em;
        line-height:1;
        font-variant-numeric:tabular-nums;
      ">${formatCents(receipt.amount_cents)}</div>
      <p style="font-size:11px;color:${T.GRAY};margin-top:5px">${receipt.currency.toUpperCase()}</p>
    </div>

    <!-- Bill to + details columns -->
    <div style="display:flex;gap:0;padding:22px 54px;border-bottom:1px solid ${T.BORDER}">
      <!-- Client -->
      <div style="flex:1;padding-right:36px">
        <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:8px">CLIENT</p>
        <p style="font-size:14px;font-weight:700;color:${T.SLATE};line-height:1.3">${esc(prospect.business_name)}</p>
        ${prospect.owner_name  ? `<p style="font-size:12px;color:${T.BODY};margin-top:2px">${esc(prospect.owner_name)}</p>` : ''}
        ${prospect.client_code ? `<p style="font-size:11px;color:${T.TEAL};font-family:monospace;margin-top:2px">${esc(prospect.client_code)}</p>` : ''}
      </div>

      <!-- Receipt details -->
      <div style="flex:1;border-left:1px solid ${T.BORDER};padding-left:36px;display:flex;flex-direction:column;gap:12px">
        <div>
          <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:3px">PAID DATE</p>
          <p style="font-size:12px;font-weight:600;color:${T.SLATE}">${formatDate(receipt.paid_at)}</p>
        </div>
        <div>
          <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:3px">PAYMENT METHOD</p>
          <p style="font-size:12px;color:${T.BODY}">${esc(methodLabel)}</p>
        </div>
        ${receipt.payment_reference ? `
        <div>
          <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:3px">REFERENCE</p>
          <p style="font-size:11px;color:${T.BODY};font-family:monospace">${esc(receipt.payment_reference)}</p>
        </div>` : ''}
      </div>
    </div>

    <!-- Applied to invoice -->
    <div style="padding:18px 54px;border-bottom:1px solid ${T.BORDER};display:flex;justify-content:space-between;align-items:center">
      <div>
        <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:4px">APPLIED TO INVOICE</p>
        <p style="font-size:13px;font-weight:600;color:${T.SLATE};font-variant-numeric:tabular-nums">${esc(invoice.invoice_number)}</p>
        ${invoice.send_date ? `<p style="font-size:11px;color:${T.BODY};margin-top:2px">Issued ${formatDate(invoice.send_date)}</p>` : ''}
      </div>
      <div style="text-align:right">
        <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:4px">INVOICE TOTAL</p>
        <p style="font-size:13px;font-weight:600;color:${T.SLATE};font-variant-numeric:tabular-nums">${formatCents(invoice.total_due_cents)}</p>
      </div>
    </div>

    ${receipt.notes ? `
    <div style="
      margin:16px 54px 0;
      background:${T.VLT};
      border-left:3px solid ${T.TEAL};
      padding:14px 18px;
    ">
      <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.TEAL};margin-bottom:7px">NOTES</p>
      <p style="font-size:12px;color:${T.BODY};line-height:1.6">${esc(receipt.notes)}</p>
    </div>` : ''}

    <!-- Thank you -->
    <div style="padding:28px 54px 0;text-align:center">
      <p style="font-size:16px;font-weight:700;color:${T.SLATE};margin-bottom:7px">Thank you for your payment!</p>
      <p style="font-size:12px;color:${T.BODY};margin-bottom:16px">Questions? Contact us at DemandSignals@gmail.com or (916) 542-2423.</p>
    </div>

    <div style="flex:1"></div>

    ${interiorPageFooter()}
  </div>`
}

// ── Main export ───────────────────────────────────────────────────────

/**
 * Render a premium receipt PDF and return the raw Buffer.
 * Single-page interior layout with v2 spec header + footer.
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
  return htmlToPdfBuffer(html, { format: 'Legal', printBackground: true })
}
