// ── pdf/invoice.ts ───────────────────────────────────────────────────
// Premium invoice PDF. Single-page document.
// Per DSIG PDF Standard v2: interior header (gradient bar + logo + section
// label + separator) + footer (separator + Confidential text).

import { formatCents } from '@/lib/format'
import type { InvoiceWithLineItems } from '@/lib/invoice-types'
import { BUSINESS_ADDRESS } from '@/lib/constants'
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

export interface InvoiceProjectMeta {
  name?: string | null
  sow_number?: string | null
  schedule_outstanding?: {
    cash_remaining_cents: number
    tik_remaining_cents: number
    cash_paid_cents: number
    tik_paid_cents: number
    is_multi_installment: boolean
  } | null
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

function invoiceMeta(inv: InvoiceWithLineItems, project?: InvoiceProjectMeta): string {
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
        <strong style="color:${T.SLATE}">Demand Signals</strong><br>
        ${esc(BUSINESS_ADDRESS.street)}<br>
        ${esc(BUSINESS_ADDRESS.city)}, ${esc(BUSINESS_ADDRESS.state)} ${esc(BUSINESS_ADDRESS.zip)}<br>
        DemandSignals@gmail.com<br>
        (916) 542-2423<br>
        demandsignals.co
      </p>
    </div>

    <!-- Invoice number + project -->
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
      ${project?.name ? `<p style="font-size:12px;color:${T.SLATE};margin-top:8px;font-weight:600;font-family:${FONT_STACK}">${esc(project.name)}</p>` : ''}
      ${project?.sow_number ? `<p style="font-size:11px;color:${T.GRAY};font-family:${FONT_STACK}">For ${esc(project.sow_number)}</p>` : ''}
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

interface PaymentSummary {
  paid_cash_cents: number
  paid_tik_cents: number
  paid_total_cents: number
  outstanding_cents: number
  is_partially_paid?: boolean
  is_fully_paid?: boolean
  receipt_count?: number
}

function totalsBlock(inv: InvoiceWithLineItems, paySummary?: PaymentSummary): string {
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
    <td style="padding:12px 0 6px;border-top:2px solid ${T.SLATE};font-size:15px;font-weight:700;color:${T.SLATE}">Total due</td>
    <td style="padding:12px 0 6px;border-top:2px solid ${T.SLATE};text-align:right;font-size:20px;font-weight:700;font-variant-numeric:tabular-nums;color:${T.SLATE};letter-spacing:-0.02em">${formatCents(grandTotal)}</td>
  </tr>`)

  // ── Payments + outstanding (only when receipts exist) ──
  if (paySummary && paySummary.paid_total_cents > 0) {
    if (paySummary.paid_cash_cents > 0) {
      rows.push(`<tr>
        <td style="padding:5px 0;font-size:11px;color:${T.TEAL}">Paid (cash)</td>
        <td style="padding:5px 0;text-align:right;font-size:11px;font-variant-numeric:tabular-nums;color:${T.TEAL}">−${formatCents(paySummary.paid_cash_cents)}</td>
      </tr>`)
    }
    if (paySummary.paid_tik_cents > 0) {
      rows.push(`<tr>
        <td style="padding:5px 0;font-size:11px;color:${T.TEAL}">Paid (trade-in-kind)</td>
        <td style="padding:5px 0;text-align:right;font-size:11px;font-variant-numeric:tabular-nums;color:${T.TEAL}">−${formatCents(paySummary.paid_tik_cents)}</td>
      </tr>`)
    }
    rows.push(`<tr>
      <td style="padding:8px 0 0;border-top:1px solid ${T.BORDER};font-size:13px;font-weight:700;color:${paySummary.outstanding_cents > 0 ? T.ORANGE_S : T.TEAL}">Balance ${paySummary.outstanding_cents > 0 ? 'due' : 'remaining'}</td>
      <td style="padding:8px 0 0;border-top:1px solid ${T.BORDER};text-align:right;font-size:16px;font-weight:700;font-variant-numeric:tabular-nums;color:${paySummary.outstanding_cents > 0 ? T.ORANGE_S : T.TEAL}">${formatCents(paySummary.outstanding_cents)}</td>
    </tr>`)
  }

  return `
  <div style="display:flex;justify-content:flex-end;padding:20px 54px 0;font-family:${FONT_STACK}">
    <div style="width:340px">
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
// For outstanding cash invoices, embeds a prominent "Pay online" link.
// PDF links are honored by every modern reader (Adobe, Preview, Chrome,
// browser inline, mobile mail apps). The URL points at the magic-link
// HTML page which itself redirects to Stripe via /api/invoices/public/[n]/pay.
//
// Why magic-link page (not direct /pay redirect): if Stripe is temporarily
// disabled OR the invoice has been voided/paid since PDF was generated,
// the magic-link page handles the state correctly. Direct redirect would 503.

function paymentCard(inv: InvoiceWithLineItems, paySummary?: PaymentSummary): string {
  const isPaid = inv.status === 'paid'
  const isVoid = inv.status === 'void'
  const isOutstanding = !isPaid && !isVoid && inv.total_due_cents > 0
  const baseUrl = 'https://demandsignals.co'
  const payUrl = `${baseUrl}/invoice/${encodeURIComponent(inv.invoice_number)}/${inv.public_uuid}`

  if (!isOutstanding) {
    // Paid/void/zero — describe accurately.
    let message: string
    if (isVoid) {
      message = 'This invoice has been voided.'
    } else if (isPaid && paySummary && paySummary.paid_total_cents > 0) {
      const parts: string[] = []
      if (paySummary.paid_cash_cents > 0) parts.push(`${formatCents(paySummary.paid_cash_cents)} cash`)
      if (paySummary.paid_tik_cents > 0) parts.push(`${formatCents(paySummary.paid_tik_cents)} trade-in-kind`)
      message = `Paid in full — ${parts.join(' + ')}. Thank you.`
    } else if (isPaid) {
      message = 'This invoice has been paid in full. Thank you.'
    } else {
      message = 'No balance due.'
    }
    return `
    <div style="
      margin:20px 54px 0;
      background:${T.VLT};
      border-left:3px solid ${T.TEAL_S};
      padding:14px 20px;
      font-family:${FONT_STACK};
    ">
      <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.TEAL};margin-bottom:7px">PAYMENT</p>
      <p style="font-size:12px;color:${T.BODY};line-height:1.6">${message}</p>
    </div>`
  }

  // Outstanding cash invoice — show the prominent Pay button.
  // When partial payments exist, the button charges the OUTSTANDING amount,
  // not the original total.
  const outstanding = paySummary?.outstanding_cents ?? inv.total_due_cents
  const partialNote = paySummary && paySummary.is_partially_paid
    ? `<p style="font-size:11px;color:${T.GRAY};margin-bottom:10px;line-height:1.55">
        ${paySummary.paid_cash_cents > 0 ? `${formatCents(paySummary.paid_cash_cents)} already paid in cash. ` : ''}${paySummary.paid_tik_cents > 0 ? `${formatCents(paySummary.paid_tik_cents)} applied as trade-in-kind. ` : ''}Remaining balance shown below.
      </p>`
    : ''
  return `
  <div style="
    margin:20px 54px 0;
    background:${T.VLT};
    border-left:3px solid ${T.TEAL_S};
    padding:16px 20px;
    font-family:${FONT_STACK};
  ">
    <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.TEAL};margin-bottom:9px">PAYMENT</p>
    ${partialNote}
    <p style="font-size:12px;color:${T.BODY};line-height:1.6;margin-bottom:12px">
      <strong>Pay online instantly with any major credit/debit card.</strong>
      Click the button below or open the link in any browser. You may also pay by check or wire transfer — please reference invoice <strong>${esc(inv.invoice_number)}</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 6px"><tr><td style="
      background:${T.ORANGE_S};
      border-radius:6px;
      padding:0;
    ">
      <a href="${payUrl}" style="
        display:inline-block;
        padding:10px 22px;
        color:${T.WHITE};
        font-size:13px;
        font-weight:700;
        text-decoration:none;
        font-family:${FONT_STACK};
        letter-spacing:0.01em;
      ">Pay ${esc(formatCents(outstanding))} online &rarr;</a>
    </td></tr></table>
    <p style="font-size:10px;color:${T.MUTED};line-height:1.5;margin-top:8px;word-break:break-all">
      Or copy this link: <a href="${payUrl}" style="color:${T.TEAL};text-decoration:underline">${payUrl}</a>
    </p>
  </div>`
}

// ── Project balance (when invoice belongs to a multi-installment plan) ─

function projectBalanceBlock(project?: InvoiceProjectMeta): string {
  const so = project?.schedule_outstanding
  if (!so || !so.is_multi_installment) return ''
  const cashLine = so.cash_remaining_cents > 0 || so.cash_paid_cents > 0
    ? `<tr>
        <td style="padding:4px 0;font-size:11px;color:${T.BODY}">Cash balance</td>
        <td style="padding:4px 0;text-align:right;font-size:11px;font-variant-numeric:tabular-nums;color:${T.SLATE}">${formatCents(so.cash_paid_cents)} paid · <strong style="color:${so.cash_remaining_cents > 0 ? T.ORANGE_S : T.TEAL}">${formatCents(so.cash_remaining_cents)}</strong> remaining</td>
      </tr>`
    : ''
  const tikLine = so.tik_remaining_cents > 0 || so.tik_paid_cents > 0
    ? `<tr>
        <td style="padding:4px 0;font-size:11px;color:${T.BODY}">Trade-in-kind balance</td>
        <td style="padding:4px 0;text-align:right;font-size:11px;font-variant-numeric:tabular-nums;color:${T.SLATE}">${formatCents(so.tik_paid_cents)} drawn · <strong style="color:${so.tik_remaining_cents > 0 ? T.ORANGE_S : T.TEAL}">${formatCents(so.tik_remaining_cents)}</strong> remaining</td>
      </tr>`
    : ''
  if (!cashLine && !tikLine) return ''
  const projectLabel = project?.name ?? 'project'
  return `
  <div style="margin:16px 54px 0;background:#fbfcfd;border:1px solid ${T.BORDER};border-radius:6px;padding:12px 16px;font-family:${FONT_STACK}">
    <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:8px">${esc(projectLabel)} — overall balance</p>
    <table style="width:100%;border-collapse:collapse"><tbody>${cashLine}${tikLine}</tbody></table>
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

export interface RenderInvoiceOptions {
  prospect?: InvoiceProspect
  project?: InvoiceProjectMeta
  paymentSummary?: PaymentSummary
}

/**
 * Render a premium invoice PDF and return the raw Buffer.
 * Single-page interior layout with v2 spec header + footer.
 *
 * Accepts optional payment summary (from receipts) and project meta
 * (project name + originating SOW). When supplied, the totals block
 * shows split TIK + cash paid rows and a real outstanding balance,
 * and the meta header surfaces the project name.
 */
export async function renderInvoicePdf(
  invoice: InvoiceWithLineItems,
  options?: RenderInvoiceOptions | InvoiceProspect,
): Promise<Buffer> {
  // Back-compat: legacy callers pass the prospect as the second arg.
  const opts: RenderInvoiceOptions =
    options && 'business_name' in options
      ? { prospect: options as InvoiceProspect }
      : ((options as RenderInvoiceOptions) ?? {})

  const p: InvoiceProspect = opts.prospect ?? {
    business_name: invoice.bill_to.business_name,
    owner_name:    invoice.bill_to.contact_name,
    owner_email:   invoice.bill_to.email,
  }

  const body = `
  <div style="width:100%;min-height:100vh;background:${T.WHITE};display:flex;flex-direction:column;font-family:${FONT_STACK};">
    ${interiorPageHeader('Invoice')}
    ${invoiceMeta(invoice, opts.project)}
    ${billToBlock(invoice, p)}
    ${lineItemsTable(invoice)}
    ${totalsBlock(invoice, opts.paymentSummary)}
    ${projectBalanceBlock(opts.project)}
    ${paymentCard(invoice, opts.paymentSummary)}
    ${notesSection(invoice)}
    <div style="flex:1"></div>
    ${interiorPageFooter()}
  </div>`

  const html = docShell(`Invoice ${invoice.invoice_number}`, body)
  return htmlToPdfBuffer(html, { format: 'Legal', printBackground: true })
}
