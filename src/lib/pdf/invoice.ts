// ── pdf/invoice.ts ───────────────────────────────────────────────────
// Premium invoice PDF. Single-page document.
// Per DSIG PDF Standard v2: interior header (gradient bar + logo + section
// label + separator) + footer (separator + Confidential text).

import { formatCents } from '@/lib/format'
import type { InvoiceWithLineItems } from '@/lib/invoice-types'
import { htmlToPdfBuffer } from './render'
import {
  T, FONT_STACK,
  esc, escNl, docShell,
  interiorPageHeader, interiorPageFooter,
} from './_shared'

// ── Types ─────────────────────────────────────────────────────────────

export interface InvoiceProspect {
  business_name: string
  owner_name?: string | null
  owner_email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

// ── Invoice number + meta block ───────────────────────────────────────
// The interior header already holds logo + section label. Below it we show
// the large invoice number and dates.

function invoiceMeta(inv: InvoiceWithLineItems): string {
  return `
  <div style="
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    padding:20px 54px 18px;
    border-bottom:1px solid ${T.BORDER};
  ">
    <!-- Sender info (compact — logo already in header) -->
    <div>
      <p style="font-size:12px;color:${T.BODY};line-height:1.8;font-family:${FONT_STACK}">
        Demand Signals<br>
        DemandSignals@gmail.com<br>
        (916) 542-2423<br>
        demandsignals.co
      </p>
    </div>

    <!-- Invoice number -->
    <div style="text-align:right">
      <p style="
        font-size:32px;
        font-weight:700;
        color:${T.SLATE};
        letter-spacing:-0.02em;
        line-height:1;
        font-variant-numeric:tabular-nums;
        font-family:${FONT_STACK};
      ">${esc(inv.invoice_number)}</p>
      ${inv.send_date ? `<p style="font-size:12px;color:${T.BODY};margin-top:6px;font-family:${FONT_STACK}">Issued ${formatDate(inv.send_date)}</p>` : ''}
      ${inv.due_date  ? `<p style="font-size:12px;color:${T.BODY};font-family:${FONT_STACK}">Due ${formatDate(inv.due_date)}</p>` : ''}
    </div>
  </div>`
}

// ── Bill-to + meta columns ────────────────────────────────────────────

function billToBlock(inv: InvoiceWithLineItems, prospect: InvoiceProspect): string {
  const bt = inv.bill_to
  const cityLine = [prospect.city, prospect.state, prospect.zip].filter(Boolean).join(', ')

  return `
  <div style="display:flex;gap:0;padding:20px 54px;border-bottom:1px solid ${T.BORDER};font-family:${FONT_STACK}">
    <!-- Bill To -->
    <div style="flex:2;padding-right:36px">
      <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:8px">BILL TO</p>
      <p style="font-size:14px;font-weight:700;color:${T.SLATE};line-height:1.3">${esc(bt.business_name || prospect.business_name)}</p>
      ${bt.contact_name || prospect.owner_name ? `<p style="font-size:12px;color:${T.BODY};margin-top:2px">${esc(bt.contact_name ?? prospect.owner_name ?? '')}</p>` : ''}
      ${prospect.address ? `<p style="font-size:12px;color:${T.BODY};margin-top:2px">${esc(prospect.address)}</p>` : ''}
      ${cityLine          ? `<p style="font-size:12px;color:${T.BODY}">${esc(cityLine)}</p>` : ''}
      ${bt.email || prospect.owner_email ? `<p style="font-size:12px;color:${T.BODY}">${esc(bt.email ?? prospect.owner_email ?? '')}</p>` : ''}
    </div>

    <!-- Dates meta -->
    <div style="flex:1;display:flex;flex-direction:column;gap:12px;border-left:1px solid ${T.BORDER};padding-left:36px">
      ${inv.send_date ? `
      <div>
        <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:3px">INVOICE DATE</p>
        <p style="font-size:12px;color:${T.SLATE}">${formatDate(inv.send_date)}</p>
      </div>` : ''}
      ${inv.due_date ? `
      <div>
        <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:3px">DUE DATE</p>
        <p style="font-size:12px;color:${T.SLATE};font-weight:600">${formatDate(inv.due_date)}</p>
      </div>` : ''}
      ${inv.paid_at ? `
      <div>
        <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:3px">PAID</p>
        <p style="font-size:12px;color:${T.TEAL};font-weight:600">${formatDate(inv.paid_at)}</p>
      </div>` : ''}
    </div>
  </div>`
}

// ── Line items table ──────────────────────────────────────────────────

function lineItemsTable(inv: InvoiceWithLineItems): string {
  const sorted = [...inv.line_items].sort((a, b) => a.sort_order - b.sort_order)

  const rows = sorted.map((li, i) => {
    const rowBg = i % 2 === 1 ? T.OFF_WHITE : T.WHITE
    return `
    <tr style="background:${rowBg}">
      <td style="padding:10px 11px;border-bottom:1px solid ${T.BORDER};vertical-align:top">
        <div style="font-size:12px;font-weight:600;color:${T.SLATE}">${esc(li.description)}</div>
        ${li.discount_label ? `<div style="font-size:10px;color:${T.ORANGE_S};margin-top:2px">${esc(li.discount_label)}</div>` : ''}
      </td>
      <td style="padding:10px 11px;border-bottom:1px solid ${T.BORDER};text-align:right;vertical-align:top;font-size:12px;font-variant-numeric:tabular-nums;color:${T.BODY};white-space:nowrap">${li.quantity}</td>
      <td style="padding:10px 11px;border-bottom:1px solid ${T.BORDER};text-align:right;vertical-align:top;font-size:12px;font-variant-numeric:tabular-nums;color:${T.BODY};white-space:nowrap">${formatCents(li.unit_price_cents)}</td>
      <td style="padding:10px 11px;border-bottom:1px solid ${T.BORDER};text-align:right;vertical-align:top;font-size:12px;font-variant-numeric:tabular-nums;color:${li.discount_cents > 0 ? T.ORANGE_S : T.GRAY};white-space:nowrap">${li.discount_cents > 0 ? `−${formatCents(li.discount_cents)}` : '—'}</td>
      <td style="padding:10px 11px;border-bottom:1px solid ${T.BORDER};text-align:right;vertical-align:top;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;color:${T.SLATE};white-space:nowrap">${formatCents(li.line_total_cents)}</td>
    </tr>`
  }).join('')

  return `
  <div style="padding:0 54px;font-family:${FONT_STACK}">
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:${T.SLATE}">
          <th style="text-align:left;padding:8px 11px;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.WHITE}">Item</th>
          <th style="text-align:right;padding:8px 11px;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.WHITE};width:44px">Qty</th>
          <th style="text-align:right;padding:8px 11px;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.WHITE};width:72px">Unit</th>
          <th style="text-align:right;padding:8px 11px;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.WHITE};width:72px">Discount</th>
          <th style="text-align:right;padding:8px 11px;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.WHITE};width:80px">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`
}

// ── Totals block ──────────────────────────────────────────────────────

function totalsBlock(inv: InvoiceWithLineItems): string {
  const lateFeeApplied = inv.late_fee_cents > 0 && !!inv.late_fee_applied_at
  const grandTotal = inv.total_due_cents + (lateFeeApplied ? inv.late_fee_cents : 0)
  const tikCents   = inv.trade_credit_cents ?? 0

  const rows: string[] = []

  rows.push(`<tr>
    <td style="padding:7px 0;font-size:12px;color:${T.BODY}">Subtotal</td>
    <td style="padding:7px 0;text-align:right;font-size:12px;font-variant-numeric:tabular-nums;color:${T.SLATE}">${formatCents(inv.subtotal_cents)}</td>
  </tr>`)

  if (inv.discount_cents > 0) {
    rows.push(`<tr>
      <td style="padding:7px 0;font-size:12px;color:${T.BODY}">Discount</td>
      <td style="padding:7px 0;text-align:right;font-size:12px;font-variant-numeric:tabular-nums;color:${T.ORANGE_S}">−${formatCents(inv.discount_cents)}</td>
    </tr>`)
  }

  if (tikCents > 0) {
    rows.push(`<tr>
      <td style="padding:7px 0;font-size:12px;color:${T.BODY}">
        Trade-in-Kind credit
        ${inv.trade_credit_description ? `<div style="font-size:10px;color:${T.GRAY}">${esc(inv.trade_credit_description)}</div>` : ''}
      </td>
      <td style="padding:7px 0;text-align:right;font-size:12px;font-variant-numeric:tabular-nums;color:${T.ORANGE_S}">−${formatCents(tikCents)}</td>
    </tr>`)
  }

  if (lateFeeApplied) {
    rows.push(`<tr>
      <td style="padding:7px 0;font-size:12px;color:${T.BODY}">Late fee</td>
      <td style="padding:7px 0;text-align:right;font-size:12px;font-variant-numeric:tabular-nums;color:${T.RED}">${formatCents(inv.late_fee_cents)}</td>
    </tr>`)
  }

  rows.push(`<tr>
    <td style="padding:12px 0 0;border-top:2px solid ${T.SLATE};font-size:15px;font-weight:700;color:${T.SLATE}">Total due</td>
    <td style="padding:12px 0 0;border-top:2px solid ${T.SLATE};text-align:right;font-size:20px;font-weight:700;font-variant-numeric:tabular-nums;color:${T.SLATE};letter-spacing:-0.02em">${formatCents(grandTotal)}</td>
  </tr>`)

  return `
  <div style="display:flex;justify-content:flex-end;padding:20px 54px 0;font-family:${FONT_STACK}">
    <div style="width:300px">
      <table style="width:100%;border-collapse:collapse">
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>
  </div>

  ${inv.late_fee_cents > 0 && !lateFeeApplied
    ? `<p style="font-size:10px;color:${T.GRAY};text-align:right;padding:6px 54px 0;font-family:${FONT_STACK}">Late fee of ${formatCents(inv.late_fee_cents)} applies if unpaid after ${inv.late_fee_grace_days} days past due.</p>`
    : ''}`
}

// ── Payment card ──────────────────────────────────────────────────────

function paymentCard(): string {
  return `
  <div style="
    margin:20px 54px 0;
    background:${T.VLT};
    border-left:3px solid ${T.TEAL_S};
    padding:14px 20px;
    font-family:${FONT_STACK};
  ">
    <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.TEAL};margin-bottom:7px">PAYMENT</p>
    <p style="font-size:12px;color:${T.BODY};line-height:1.6">
      Pay by check, wire transfer, or via the secure link on your invoice email.
      Please reference your invoice number when submitting payment.
      Contact us at DemandSignals@gmail.com with any questions.
    </p>
  </div>`
}

// ── Notes ─────────────────────────────────────────────────────────────

function notesSection(inv: InvoiceWithLineItems): string {
  if (!inv.notes) return ''
  return `
  <div style="
    margin:16px 54px 0;
    background:${T.VLO};
    border-left:3px solid ${T.ORANGE_S};
    padding:14px 20px;
    font-family:${FONT_STACK};
  ">
    <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.ORANGE_S};margin-bottom:7px">NOTES</p>
    <p style="font-size:12px;color:${T.BODY};line-height:1.7">${escNl(inv.notes)}</p>
  </div>`
}

// ── Main export ───────────────────────────────────────────────────────

/**
 * Render a premium invoice PDF and return the raw Buffer.
 * Single-page interior layout with v2 spec header + footer.
 */
export async function renderInvoicePdf(
  invoice: InvoiceWithLineItems,
  prospect?: InvoiceProspect,
): Promise<Buffer> {
  const p: InvoiceProspect = prospect ?? {
    business_name: invoice.bill_to.business_name,
    owner_name:    invoice.bill_to.contact_name,
    owner_email:   invoice.bill_to.email,
  }

  const body = `
  <div style="width:100%;min-height:100vh;background:${T.WHITE};display:flex;flex-direction:column;font-family:${FONT_STACK};">
    ${interiorPageHeader('Invoice')}
    ${invoiceMeta(invoice)}
    ${billToBlock(invoice, p)}
    ${lineItemsTable(invoice)}
    ${totalsBlock(invoice)}
    ${paymentCard()}
    ${notesSection(invoice)}
    <div style="flex:1"></div>
    ${interiorPageFooter()}
  </div>`

  const html = docShell(`Invoice ${invoice.invoice_number}`, body)
  return htmlToPdfBuffer(html, { format: 'Legal', printBackground: true })
}
