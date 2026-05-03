// ── pdf/invoice.ts ───────────────────────────────────────────────────
// Premium invoice PDF. Single-page document.
// Per DSIG PDF Standard v2: interior header (gradient bar + logo + section
// label + separator) + footer (separator + Confidential text).

import { formatCents } from '@/lib/format'
import type { InvoiceWithLineItems } from '@/lib/invoice-types'
import { BUSINESS_ADDRESS } from '@/lib/constants'
import { countryName } from '@/lib/countries'
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
  // ISO 3166-1 alpha-2 (migration 046a). Defaults to 'US' when omitted;
  // the bill-to block renders the country on its own line, all-caps,
  // only when the prospect is international (per postal convention).
  country?: string | null
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
    /** Per-row breakdown of installments still owing money. */
    outstanding_installments?: Array<{
      sequence: number
      description: string
      amount_cents: number
      amount_paid_cents: number
      remaining_cents: number
      currency_type: 'cash' | 'tik'
      status: string
    }>
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
  // Country line: only render for non-US prospects, all-caps per
  // international postal convention.
  const countryLine =
    prospect.country && prospect.country !== 'US'
      ? countryName(prospect.country).toUpperCase()
      : ''

  return `
  <div style="display:flex;gap:0;padding:20px 54px;border-bottom:1px solid ${T.BORDER};font-family:${FONT_STACK}">
    <!-- Bill To -->
    <div style="flex:2;padding-right:36px">
      <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:8px">BILL TO</p>
      <p style="font-size:14px;font-weight:700;color:${T.SLATE};line-height:1.3">${esc(bt.business_name || prospect.business_name)}</p>
      ${bt.contact_name || prospect.owner_name ? `<p style="font-size:12px;color:${T.BODY};margin-top:2px">${esc(bt.contact_name ?? prospect.owner_name ?? '')}</p>` : ''}
      ${prospect.address ? `<p style="font-size:12px;color:${T.BODY};margin-top:2px">${esc(prospect.address)}</p>` : ''}
      ${cityLine          ? `<p style="font-size:12px;color:${T.BODY}">${esc(cityLine)}</p>` : ''}
      ${countryLine       ? `<p style="font-size:12px;color:${T.BODY};font-weight:600;letter-spacing:0.05em">${esc(countryLine)}</p>` : ''}
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
      ${/* PAID date intentionally NOT rendered in the meta band — the
           angled PAID stamp anchored to the upper-right covers it.
           Hunter directive 2026-04-29: stamp replaces the text. */ ''}
    </div>
  </div>`
}

// ── Line items table ──────────────────────────────────────────────────

function lineItemsTable(inv: InvoiceWithLineItems): string {
  const sorted = [...inv.line_items].sort((a, b) => a.sort_order - b.sort_order)

  const rows = sorted.map((li, i) => {
    const rowBg = i % 2 === 1 ? T.OFF_WHITE : T.WHITE
    // Cadence annotation per migration 043. Monthly/annual lines bill cycle 1
    // here and Stripe runs the rest as a subscription (set-and-forget). The
    // tag makes that explicit on the PDF so clients understand recurring
    // billing before paying. Hunter directive 2026-05-02: "nothing in the
    // invoice says subscription."
    const cadence = (li as unknown as { cadence?: string }).cadence ?? 'one_time'
    const cadenceTag = cadence === 'monthly'
      ? `<span style="display:inline-block;font-size:9px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;background:${T.VLT};color:${T.TEAL_S};border:1px solid ${T.TEAL_S};border-radius:3px;padding:1px 6px;margin-left:6px;vertical-align:1px">Monthly</span>`
      : cadence === 'annual'
        ? `<span style="display:inline-block;font-size:9px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;background:${T.VLT};color:${T.TEAL_S};border:1px solid ${T.TEAL_S};border-radius:3px;padding:1px 6px;margin-left:6px;vertical-align:1px">Annual</span>`
        : ''
    return `
    <tr style="background:${rowBg}">
      <td style="padding:10px 11px;border-bottom:1px solid ${T.BORDER};vertical-align:top">
        <div style="font-size:12px;font-weight:600;color:${T.SLATE}">${esc(li.description)}${cadenceTag}</div>
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
  // Document-level discount (migration 036). Computed for display only —
  // inv.total_due_cents already reflects it from the persisted math.
  const docDiscountKind = (inv as InvoiceWithLineItems & { discount_kind?: 'percent' | 'amount' | null }).discount_kind ?? null
  const docDiscountValueBps = (inv as InvoiceWithLineItems & { discount_value_bps?: number }).discount_value_bps ?? 0
  const docDiscountAmountCents = (inv as InvoiceWithLineItems & { discount_amount_cents?: number }).discount_amount_cents ?? 0
  const docDiscountDescription = (inv as InvoiceWithLineItems & { discount_description?: string | null }).discount_description ?? null
  const lineTotalForDisc = Math.max(0, inv.subtotal_cents - inv.discount_cents)
  const docDiscountCents = (() => {
    if (docDiscountKind === 'percent') {
      const bps = Math.max(0, Math.min(10000, docDiscountValueBps))
      return Math.min(lineTotalForDisc, Math.round(lineTotalForDisc * bps / 10000))
    }
    if (docDiscountKind === 'amount') {
      return Math.min(lineTotalForDisc, Math.max(0, docDiscountAmountCents))
    }
    return 0
  })()

  const rows: string[] = []

  rows.push(`<tr>
    <td style="padding:7px 0;font-size:12px;color:${T.BODY}">Subtotal</td>
    <td style="padding:7px 0;text-align:right;font-size:12px;font-variant-numeric:tabular-nums;color:${T.SLATE}">${formatCents(inv.subtotal_cents)}</td>
  </tr>`)

  if (inv.discount_cents > 0) {
    rows.push(`<tr>
      <td style="padding:7px 0;font-size:12px;color:${T.BODY}">Line item discounts</td>
      <td style="padding:7px 0;text-align:right;font-size:12px;font-variant-numeric:tabular-nums;color:${T.ORANGE_S}">−${formatCents(inv.discount_cents)}</td>
    </tr>`)
  }

  if (docDiscountCents > 0) {
    const discLabel = docDiscountDescription?.trim() || 'Discount'
    const discSuffix = docDiscountKind === 'percent'
      ? ` <span style="color:${T.GRAY};font-weight:400">(${(docDiscountValueBps / 100).toFixed(docDiscountValueBps % 100 === 0 ? 0 : 2)}%)</span>`
      : ''
    rows.push(`<tr>
      <td style="padding:7px 0;font-size:12px;color:${T.BODY}">${esc(discLabel)}${discSuffix}</td>
      <td style="padding:7px 0;text-align:right;font-size:12px;font-variant-numeric:tabular-nums;color:${T.ORANGE_S}">−${formatCents(docDiscountCents)}</td>
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

// ── Subscription disclosure ───────────────────────────────────────────
// When the invoice has any recurring lines (cadence=monthly/annual), surface
// what's about to happen on payment: Stripe sub auto-bills the recurring
// portion to the same card for the term, set-and-forget. Required by
// Hunter directive 2026-05-02 — the PDF must say "subscription" so the
// client understands recurring billing before paying.

function subscriptionDisclosure(inv: InvoiceWithLineItems): string {
  // Aggregate recurring lines.
  const monthly = inv.line_items
    .filter((li) => (li as unknown as { cadence?: string }).cadence === 'monthly')
    .reduce((s, li) => s + (li.line_total_cents ?? 0), 0)
  const annual = inv.line_items
    .filter((li) => (li as unknown as { cadence?: string }).cadence === 'annual')
    .reduce((s, li) => s + (li.line_total_cents ?? 0), 0)

  if (monthly === 0 && annual === 0) return ''

  const termMonths = (inv as unknown as { term_months?: number | null }).term_months ?? null
  const untilCancelled = (inv as unknown as { until_cancelled?: boolean }).until_cancelled ?? false
  const termPhrase = untilCancelled
    ? 'until cancelled'
    : termMonths
      ? `for ${termMonths} months`
      : 'for the contract term'

  // Bullet list of the recurring components.
  const lines: string[] = []
  if (monthly > 0) lines.push(`<li><strong>${formatCents(monthly)}/mo</strong> — auto-charges every month</li>`)
  if (annual > 0) lines.push(`<li><strong>${formatCents(annual)}/yr</strong> — auto-charges every year</li>`)

  return `
  <div style="
    margin:20px 54px 0;
    background:${T.VLT};
    border:1px solid ${T.TEAL_S};
    border-radius:6px;
    padding:14px 20px;
    font-family:${FONT_STACK};
  ">
    <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.TEAL_S};margin-bottom:8px">RECURRING SUBSCRIPTION</p>
    <p style="font-size:12px;color:${T.BODY};line-height:1.55;margin-bottom:8px">
      This invoice covers cycle 1 of an ongoing subscription. After payment, the same card
      auto-bills the recurring portion ${termPhrase}:
    </p>
    <ul style="font-size:12px;color:${T.BODY};line-height:1.65;margin:0 0 8px 18px;padding:0">
      ${lines.join('')}
    </ul>
    <p style="font-size:10px;color:${T.GRAY};line-height:1.55">
      Card captured once on this invoice — you will not be sent monthly invoices to chase.
      ${untilCancelled
        ? 'You can cancel anytime by contacting Demand Signals.'
        : 'The subscription stops automatically at the end of the term.'}
    </p>
  </div>`
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
  const isDraft = inv.status === 'draft'
  const isOutstanding = !isPaid && !isVoid && !isDraft && inv.total_due_cents > 0
  const baseUrl = 'https://demandsignals.co'
  const payUrl = `${baseUrl}/invoice/${encodeURIComponent(inv.invoice_number)}/${inv.public_uuid}`

  if (isDraft) {
    // Draft preview — never embed the magic-link URL because the public
    // route gates drafts behind admin auth. Showing the link in the PDF
    // would 404 when a non-admin (or any client) opens it. The PAYMENT
    // section becomes a "preview-only" reminder until the invoice is
    // sent. Once status flips to 'sent', the live Pay button appears.
    return `
    <div style="
      margin:20px 54px 0;
      background:${T.VLT};
      border-left:3px solid ${T.ORANGE_S};
      padding:14px 20px;
      font-family:${FONT_STACK};
    ">
      <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.ORANGE_S};margin-bottom:7px">PAYMENT — DRAFT PREVIEW</p>
      <p style="font-size:12px;color:${T.BODY};line-height:1.6">
        This invoice is still in draft. The payment link will appear here once it is sent.
      </p>
    </div>`
  }

  if (!isOutstanding) {
    // Paid/void/zero — describe accurately.
    let message: string
    if (isVoid) {
      message = 'This invoice has been voided.'
    } else if (isPaid && paySummary && paySummary.paid_total_cents > 0) {
      const parts: string[] = []
      if (paySummary.paid_cash_cents > 0) parts.push(`${formatCents(paySummary.paid_cash_cents)} cash`)
      if (paySummary.paid_tik_cents > 0) parts.push(`${formatCents(paySummary.paid_tik_cents)} trade-in-kind`)
      // Hunter directive 2026-04-29: "Paid in full" was ambiguous next
      // to a SOW-balance block showing remaining money. Scope the
      // sentence explicitly to THIS invoice so a paid deposit doesn't
      // read as "the whole project is paid".
      message = `This invoice paid in full — ${parts.join(' + ')}. Thank you.`
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

  const items = so.outstanding_installments ?? []
  const totalRemaining = so.cash_remaining_cents + so.tik_remaining_cents

  // Nothing left to bill on the SOW — render a celebratory "fully paid"
  // line instead of a confusing empty box.
  if (totalRemaining <= 0 && items.length === 0) {
    if (so.cash_paid_cents === 0 && so.tik_paid_cents === 0) return ''
    const sowLabel = project?.sow_number ? `SOW ${project.sow_number}` : 'SOW'
    return `
    <div style="margin:16px 54px 0;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px 16px;font-family:${FONT_STACK}">
      <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.TEAL};margin-bottom:6px">${esc(sowLabel)} — paid in full</p>
      <p style="font-size:11px;color:${T.BODY}">All scheduled payments on this SOW have been received. Thank you.</p>
    </div>`
  }

  const sowLabel = project?.sow_number ? `Remaining balance for SOW ${project.sow_number}` : 'Remaining balance for this SOW'

  // Per-installment rows. Cash items appear first (most relevant for
  // the "what do I owe in money" question), TIK items follow.
  const cashItems = items.filter((i) => i.currency_type === 'cash')
  const tikItems = items.filter((i) => i.currency_type === 'tik')
  const orderedItems = [...cashItems, ...tikItems]

  const itemRows = orderedItems.map((i) => {
    const settlement = i.currency_type === 'tik' ? 'TIK' : 'Cash'
    return `<tr>
      <td style="padding:5px 0;font-size:11px;color:${T.BODY}">
        ${esc(i.description)}
        <span style="color:${T.GRAY};font-size:10px"> · ${settlement}</span>
      </td>
      <td style="padding:5px 0;text-align:right;font-size:11px;font-variant-numeric:tabular-nums;color:${T.SLATE};font-weight:600">${formatCents(i.remaining_cents)}</td>
    </tr>`
  }).join('')

  const totalRow = `<tr>
    <td style="padding:8px 0 0;border-top:1px solid ${T.BORDER};font-size:11px;font-weight:700;color:${T.SLATE}">Total remaining on SOW</td>
    <td style="padding:8px 0 0;border-top:1px solid ${T.BORDER};text-align:right;font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;color:${T.ORANGE_S}">${formatCents(totalRemaining)}</td>
  </tr>`

  return `
  <div style="margin:16px 54px 0;background:#fbfcfd;border:1px solid ${T.BORDER};border-radius:6px;padding:12px 16px;font-family:${FONT_STACK}">
    <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:8px">${esc(sowLabel)}</p>
    <p style="font-size:10px;color:${T.GRAY};margin-bottom:8px;line-height:1.4">This invoice is for the deposit. Below is the rest of the SOW schedule — separate invoices will be issued as each phase completes.</p>
    <table style="width:100%;border-collapse:collapse"><tbody>${itemRows}${totalRow}</tbody></table>
  </div>`
}

// ── Payment terms ─────────────────────────────────────────────────────

function paymentTermsSection(inv: InvoiceWithLineItems): string {
  if (!inv.payment_terms) return ''
  return `
  <div style="
    margin:16px 54px 0;
    background:${T.VLT};
    border-left:3px solid ${T.TEAL_S};
    padding:14px 20px;
    font-family:${FONT_STACK};
  ">
    <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.TEAL_S};margin-bottom:7px">PAYMENT TERMS</p>
    <p style="font-size:12px;color:${T.BODY};line-height:1.7">${escNl(inv.payment_terms)}</p>
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

// ── Paid / Void stamps ────────────────────────────────────────────────
// Hunter directive 2026-04-29: paid invoices show an angled "PAID" stamp
// across the page, like a bank stamp on an old paper invoice. Easier
// for clients + internal workers to see status at a glance than reading
// the totals block.
//
// Implementation: absolute-positioned over the body wrapper, centered,
// rotated -18deg with a thick double-stroke border. Semi-transparent so
// document text underneath stays readable. Only renders when paid.

// Stamp positioned in the top-center white-space gutter between the
// logo (left) and the INVOICE-number block (right). Hunter directive
// 2026-04-29 round 4: lock to white-space coords, never overlap text.
//
// PDF page is Legal portrait (612pt = 816px wide at default DPI). Logo
// row sits at top with logo on the left. INVOICE label + number block
// is right-aligned. Top:32 vertically aligns with the logo. Left:38%
// puts the stamp center in the gutter — same coords as the magic-link
// page so the two surfaces look identical.
function paidStamp(inv: InvoiceWithLineItems): string {
  if (inv.status !== 'paid') return ''
  return `
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
    ${inv.paid_at ? `<p style="font-size:9px;font-weight:600;letter-spacing:0.15em;color:${T.TEAL_S};margin:3px 0 0;font-family:${FONT_STACK}">${formatDate(inv.paid_at)}</p>` : ''}
  </div>`
}

function voidStamp(inv: InvoiceWithLineItems): string {
  if (inv.status !== 'void') return ''
  return `
  <div style="
    position:absolute;
    top:32px;
    left:48%;
    transform:translateX(-50%) rotate(-12deg);
    pointer-events:none;
    z-index:10;
    border:4px double ${T.RED};
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
      color:${T.RED};
      margin:0;
      line-height:1;
      text-transform:uppercase;
    ">VOID</p>
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
  <div style="position:relative;width:100%;min-height:100vh;background:${T.WHITE};display:flex;flex-direction:column;font-family:${FONT_STACK};">
    ${interiorPageHeader('Invoice')}
    ${invoiceMeta(invoice, opts.project)}
    ${billToBlock(invoice, p)}
    ${lineItemsTable(invoice)}
    ${totalsBlock(invoice, opts.paymentSummary)}
    ${projectBalanceBlock(opts.project)}
    ${subscriptionDisclosure(invoice)}
    ${paymentCard(invoice, opts.paymentSummary)}
    ${paymentTermsSection(invoice)}
    ${notesSection(invoice)}
    <div style="flex:1"></div>
    ${interiorPageFooter()}
    ${paidStamp(invoice)}
    ${voidStamp(invoice)}
  </div>`

  const html = docShell(`Invoice ${invoice.invoice_number}`, body)
  return htmlToPdfBuffer(html, { format: 'Legal', printBackground: true })
}
