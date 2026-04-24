// ── pdf/invoice.ts ───────────────────────────────────────────────────
// Premium invoice PDF. Single/2-page document. Stripe receipt aesthetic:
// clean white background, strong number hierarchy, tasteful teal accents.

import { formatCents } from '@/lib/format'
import type { InvoiceWithLineItems } from '@/lib/invoice-types'
import { htmlToPdfBuffer } from './render'
import { T, LOGO_URL, esc, escNl, docShell, FONT_STACK } from './_shared'

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

// ── Header block ──────────────────────────────────────────────────────

function invoiceHeader(inv: InvoiceWithLineItems): string {
  return `
  <div style="
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    padding:48px 56px 32px;
    border-bottom:1px solid ${T.rule};
  ">
    <!-- Logo + sender info -->
    <div>
      <img src="${LOGO_URL}" alt="Demand Signals" style="height:36px;object-fit:contain;display:block;margin-bottom:14px">
      <p style="font-size:12px;color:${T.slate};line-height:1.8">
        Demand Signals<br>
        DemandSignals@gmail.com<br>
        (916) 542-2423<br>
        demandsignals.co
      </p>
    </div>

    <!-- Invoice number + eyebrow -->
    <div style="text-align:right">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:8px">INVOICE</p>
      <p style="font-size:32px;font-weight:700;color:${T.dark};letter-spacing:-0.02em;line-height:1;font-variant-numeric:tabular-nums">${esc(inv.invoice_number)}</p>
      ${inv.send_date ? `<p style="font-size:12px;color:${T.slate};margin-top:6px">Issued ${formatDate(inv.send_date)}</p>` : ''}
      ${inv.due_date ? `<p style="font-size:12px;color:${T.slate}">Due ${formatDate(inv.due_date)}</p>` : ''}
    </div>
  </div>`
}

// ── Gradient rule ─────────────────────────────────────────────────────

function gradientBar(): string {
  return `<div style="height:4px;background:linear-gradient(90deg,${T.orangeDeep},${T.teal});width:100%"></div>`
}

// ── Bill-to + meta block ──────────────────────────────────────────────

function billToBlock(inv: InvoiceWithLineItems, prospect: InvoiceProspect): string {
  const bt = inv.bill_to
  const cityLine = [prospect.city, prospect.state, prospect.zip].filter(Boolean).join(', ')

  return `
  <div style="display:flex;gap:0;padding:28px 56px;border-bottom:1px solid ${T.rule}">
    <!-- Bill To -->
    <div style="flex:2;padding-right:40px">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:10px">BILL TO</p>
      <p style="font-size:15px;font-weight:700;color:${T.dark};line-height:1.4">${esc(bt.business_name || prospect.business_name)}</p>
      ${bt.contact_name || prospect.owner_name ? `<p style="font-size:13px;color:${T.slate};margin-top:2px">${esc(bt.contact_name ?? prospect.owner_name ?? '')}</p>` : ''}
      ${prospect.address ? `<p style="font-size:13px;color:${T.slate};margin-top:2px">${esc(prospect.address)}</p>` : ''}
      ${cityLine ? `<p style="font-size:13px;color:${T.slate}">${esc(cityLine)}</p>` : ''}
      ${bt.email || prospect.owner_email ? `<p style="font-size:13px;color:${T.slate}">${esc(bt.email ?? prospect.owner_email ?? '')}</p>` : ''}
    </div>

    <!-- Dates meta -->
    <div style="flex:1;display:flex;flex-direction:column;gap:14px;border-left:1px solid ${T.rule};padding-left:40px">
      ${inv.send_date ? `
      <div>
        <p style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:3px">INVOICE DATE</p>
        <p style="font-size:13px;color:${T.dark}">${formatDate(inv.send_date)}</p>
      </div>` : ''}
      ${inv.due_date ? `
      <div>
        <p style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:3px">DUE DATE</p>
        <p style="font-size:13px;color:${T.dark};font-weight:600">${formatDate(inv.due_date)}</p>
      </div>` : ''}
      ${inv.paid_at ? `
      <div>
        <p style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:3px">PAID</p>
        <p style="font-size:13px;color:${T.tealDark};font-weight:600">${formatDate(inv.paid_at)}</p>
      </div>` : ''}
    </div>
  </div>`
}

// ── Line items table ──────────────────────────────────────────────────

function lineItemsTable(inv: InvoiceWithLineItems): string {
  const sorted = [...inv.line_items].sort((a, b) => a.sort_order - b.sort_order)

  const rows = sorted.map((li) => `
  <tr>
    <td style="padding:12px 12px;border-bottom:1px solid ${T.rule};vertical-align:top">
      <div style="font-size:13px;font-weight:600;color:${T.dark}">${esc(li.description)}</div>
      ${li.discount_label ? `<div style="font-size:11px;color:${T.orange};margin-top:2px">${esc(li.discount_label)}</div>` : ''}
    </td>
    <td style="padding:12px 12px;border-bottom:1px solid ${T.rule};text-align:right;vertical-align:top;font-size:13px;font-variant-numeric:tabular-nums;color:${T.slate};white-space:nowrap">${li.quantity}</td>
    <td style="padding:12px 12px;border-bottom:1px solid ${T.rule};text-align:right;vertical-align:top;font-size:13px;font-variant-numeric:tabular-nums;color:${T.slate};white-space:nowrap">${formatCents(li.unit_price_cents)}</td>
    <td style="padding:12px 12px;border-bottom:1px solid ${T.rule};text-align:right;vertical-align:top;font-size:13px;font-variant-numeric:tabular-nums;color:${li.discount_cents > 0 ? T.orange : T.slateSoft};white-space:nowrap">${li.discount_cents > 0 ? `−${formatCents(li.discount_cents)}` : '—'}</td>
    <td style="padding:12px 12px;border-bottom:1px solid ${T.rule};text-align:right;vertical-align:top;font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;color:${T.dark};white-space:nowrap">${formatCents(li.line_total_cents)}</td>
  </tr>`).join('')

  return `
  <div style="padding:0 56px">
    <table style="width:100%;border-collapse:collapse;font-family:${FONT_STACK}">
      <thead>
        <tr style="background:${T.light}">
          <th style="text-align:left;padding:10px 12px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft}">Item</th>
          <th style="text-align:right;padding:10px 12px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft};width:50px">Qty</th>
          <th style="text-align:right;padding:10px 12px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft};width:80px">Unit</th>
          <th style="text-align:right;padding:10px 12px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft};width:80px">Discount</th>
          <th style="text-align:right;padding:10px 12px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft};width:90px">Total</th>
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
  const tikCents = inv.trade_credit_cents ?? 0

  const rows: string[] = []

  rows.push(`<tr>
    <td style="padding:8px 0;font-size:13px;color:${T.slate}">Subtotal</td>
    <td style="padding:8px 0;text-align:right;font-size:13px;font-variant-numeric:tabular-nums;color:${T.dark}">${formatCents(inv.subtotal_cents)}</td>
  </tr>`)

  if (inv.discount_cents > 0) {
    rows.push(`<tr>
      <td style="padding:8px 0;font-size:13px;color:${T.slate}">Discount</td>
      <td style="padding:8px 0;text-align:right;font-size:13px;font-variant-numeric:tabular-nums;color:${T.orange}">−${formatCents(inv.discount_cents)}</td>
    </tr>`)
  }

  if (tikCents > 0) {
    rows.push(`<tr>
      <td style="padding:8px 0;font-size:13px;color:${T.slate}">
        Trade-in-Kind credit
        ${inv.trade_credit_description ? `<div style="font-size:11px;color:${T.slateSoft}">${esc(inv.trade_credit_description)}</div>` : ''}
      </td>
      <td style="padding:8px 0;text-align:right;font-size:13px;font-variant-numeric:tabular-nums;color:${T.orange}">−${formatCents(tikCents)}</td>
    </tr>`)
  }

  if (lateFeeApplied) {
    rows.push(`<tr>
      <td style="padding:8px 0;font-size:13px;color:${T.slate}">Late fee</td>
      <td style="padding:8px 0;text-align:right;font-size:13px;font-variant-numeric:tabular-nums;color:${T.orange}">${formatCents(inv.late_fee_cents)}</td>
    </tr>`)
  }

  rows.push(`<tr>
    <td style="padding:14px 0 0;border-top:2px solid ${T.dark};font-size:16px;font-weight:700;color:${T.dark}">Total due</td>
    <td style="padding:14px 0 0;border-top:2px solid ${T.dark};text-align:right;font-size:22px;font-weight:700;font-variant-numeric:tabular-nums;color:${T.dark};letter-spacing:-0.02em">${formatCents(grandTotal)}</td>
  </tr>`)

  return `
  <div style="display:flex;justify-content:flex-end;padding:24px 56px 0">
    <div style="width:320px">
      <table style="width:100%;border-collapse:collapse;font-family:${FONT_STACK}">
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>
  </div>

  ${inv.late_fee_cents > 0 && !lateFeeApplied
    ? `<p style="font-size:11px;color:${T.slateSoft};text-align:right;padding:8px 56px 0">Late fee of ${formatCents(inv.late_fee_cents)} applies if unpaid after ${inv.late_fee_grace_days} days past due.</p>`
    : ''}`
}

// ── Payment card ──────────────────────────────────────────────────────

function paymentCard(): string {
  return `
  <div style="
    margin:28px 56px 0;
    background:${T.tealSoft};
    border-radius:10px;
    border-left:3px solid ${T.teal};
    padding:18px 24px;
  ">
    <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.tealDark};margin-bottom:8px">PAYMENT</p>
    <p style="font-size:13px;color:${T.dark};line-height:1.6">
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
    margin:20px 56px 0;
    background:rgba(242,133,0,0.06);
    border-radius:10px;
    border-left:3px solid ${T.orange};
    padding:18px 24px;
  ">
    <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.orange};margin-bottom:8px">NOTES</p>
    <p style="font-size:13px;color:${T.dark};line-height:1.7">${escNl(inv.notes)}</p>
  </div>`
}

// ── Footer ────────────────────────────────────────────────────────────

function invoiceFooter(): string {
  return `
  <div style="
    margin-top:32px;
    border-top:1px solid ${T.rule};
    padding:16px 56px;
    display:flex;
    justify-content:space-between;
    align-items:center;
  ">
    <p style="font-size:11px;color:${T.slateSoft}">Thank you for your business — Demand Signals</p>
    <p style="font-size:11px;color:${T.slateSoft}">&copy; 2026 Demand Signals. Confidential.</p>
  </div>`
}

// ── Main export ───────────────────────────────────────────────────────

/**
 * Render a premium invoice PDF and return the raw Buffer.
 * Replaces the old Python dsig-pdf-service path.
 */
export async function renderInvoicePdf(
  invoice: InvoiceWithLineItems,
  prospect?: InvoiceProspect,
): Promise<Buffer> {
  const p: InvoiceProspect = prospect ?? {
    business_name: invoice.bill_to.business_name,
    owner_name: invoice.bill_to.contact_name,
    owner_email: invoice.bill_to.email,
  }

  const body = `
  <div style="width:100%;min-height:100vh;background:#fff;display:flex;flex-direction:column;">
    ${invoiceHeader(invoice)}
    ${gradientBar()}
    ${billToBlock(invoice, p)}
    ${lineItemsTable(invoice)}
    ${totalsBlock(invoice)}
    ${paymentCard()}
    ${notesSection(invoice)}
    <div style="flex:1"></div>
    ${invoiceFooter()}
  </div>`

  const html = docShell(`Invoice ${invoice.invoice_number}`, body)
  return htmlToPdfBuffer(html, { format: 'Letter', printBackground: true })
}
