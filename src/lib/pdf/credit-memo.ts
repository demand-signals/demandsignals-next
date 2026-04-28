// ── pdf/credit-memo.ts ────────────────────────────────────────────────
// Premium credit-memo PDF — single page, mirrors the receipt layout but
// flows the other direction (money/credit OUT to client).
//
// Per DSIG PDF Standard v2: interior header + footer, ORANGE_S amount
// (vs receipt's TEAL_S — the orange marks "credit out" semantics).

import { formatCents } from '@/lib/format'
import { htmlToPdfBuffer } from './render'
import {
  T, FONT_STACK,
  esc, docShell,
  interiorPageHeader, interiorPageFooter,
} from './_shared'

// ── Types ─────────────────────────────────────────────────────────────

export interface CreditMemoData {
  id: string
  credit_memo_number: string
  invoice_id: string
  prospect_id: string
  amount_cents: number
  currency: string
  kind: 'refund' | 'goodwill' | 'dispute' | 'write_off'
  reason: string
  notes: string | null
  payment_method: string | null
  payment_reference: string | null
  stripe_refund_id: string | null
  issued_at: string
  created_at: string
}

export interface CreditMemoInvoiceData {
  invoice_number: string
  total_due_cents: number
  send_date?: string | null
}

export interface CreditMemoProspect {
  business_name: string
  client_code?: string | null
  owner_name?: string | null
  owner_email?: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────

const KIND_LABEL: Record<CreditMemoData['kind'], string> = {
  refund:    'REFUND ISSUED',
  goodwill:  'GOODWILL CREDIT',
  dispute:   'CHARGEBACK / DISPUTE',
  write_off: 'BALANCE WRITE-OFF',
}

const METHOD_LABEL: Record<string, string> = {
  stripe_refund: 'Stripe Refund',
  check:         'Check',
  wire:          'Wire Transfer',
  cash:          'Cash',
  tik:           'Trade-in-Kind',
  zero_balance:  'Zero Balance',
  other:         'Other',
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

// ── Template ──────────────────────────────────────────────────────────

function creditMemoBody(
  memo: CreditMemoData,
  invoice: CreditMemoInvoiceData,
  prospect: CreditMemoProspect,
): string {
  const methodLabel = memo.payment_method
    ? (METHOD_LABEL[memo.payment_method] ?? memo.payment_method)
    : (memo.kind === 'goodwill' ? 'No money refunded — goodwill credit' : memo.kind === 'write_off' ? 'No money refunded — write-off' : '—')

  const kindLabel = KIND_LABEL[memo.kind] ?? memo.kind.toUpperCase()

  return `
  <div style="
    width:100%;
    min-height:100vh;
    background:${T.WHITE};
    display:flex;
    flex-direction:column;
    font-family:${FONT_STACK};
  ">
    ${interiorPageHeader('Credit Memo')}

    <!-- Memo number + kind stamp row -->
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:16px 54px 14px;
      border-bottom:1px solid ${T.BORDER};
    ">
      <div>
        <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:6px">CREDIT MEMO</p>
        <p style="font-size:26px;font-weight:700;color:${T.SLATE};letter-spacing:-0.02em;line-height:1;font-variant-numeric:tabular-nums">${esc(memo.credit_memo_number)}</p>
      </div>
      <!-- Kind stamp (orange — "credit out" semantics) -->
      <div style="
        display:inline-block;
        background:#fff4ec;
        color:${T.ORANGE_S};
        font-size:11px;
        font-weight:700;
        letter-spacing:0.12em;
        text-transform:uppercase;
        padding:6px 16px;
        border-radius:4px;
        border:1.5px solid ${T.ORANGE_S};
      ">${esc(kindLabel)}</div>
    </div>

    <!-- Amount hero -->
    <div style="padding:28px 54px 24px;border-bottom:1px solid ${T.BORDER}">
      <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:6px">CREDIT AMOUNT</p>
      <div style="
        font-size:52px;
        font-weight:700;
        color:${T.ORANGE_S};
        letter-spacing:-0.03em;
        line-height:1;
        font-variant-numeric:tabular-nums;
      ">−${formatCents(memo.amount_cents)}</div>
      <p style="font-size:11px;color:${T.GRAY};margin-top:5px">${memo.currency.toUpperCase()}</p>
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

      <!-- Memo details -->
      <div style="flex:1;border-left:1px solid ${T.BORDER};padding-left:36px;display:flex;flex-direction:column;gap:12px">
        <div>
          <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:3px">ISSUED DATE</p>
          <p style="font-size:12px;font-weight:600;color:${T.SLATE}">${formatDate(memo.issued_at)}</p>
        </div>
        <div>
          <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:3px">METHOD</p>
          <p style="font-size:12px;color:${T.BODY}">${esc(methodLabel)}</p>
        </div>
        ${memo.stripe_refund_id ? `
        <div>
          <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:3px">STRIPE REFUND</p>
          <p style="font-size:11px;color:${T.BODY};font-family:monospace">${esc(memo.stripe_refund_id)}</p>
        </div>` : memo.payment_reference ? `
        <div>
          <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:3px">REFERENCE</p>
          <p style="font-size:11px;color:${T.BODY};font-family:monospace">${esc(memo.payment_reference)}</p>
        </div>` : ''}
      </div>
    </div>

    <!-- Reason block -->
    <div style="padding:18px 54px;border-bottom:1px solid ${T.BORDER}">
      <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:6px">REASON</p>
      <p style="font-size:13px;color:${T.SLATE};line-height:1.5">${esc(memo.reason)}</p>
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

    ${memo.notes ? `
    <div style="
      margin:16px 54px 0;
      background:#fff4ec;
      border-left:3px solid ${T.ORANGE_S};
      padding:14px 18px;
    ">
      <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.ORANGE_S};margin-bottom:7px">NOTES</p>
      <p style="font-size:12px;color:${T.BODY};line-height:1.6">${esc(memo.notes)}</p>
    </div>` : ''}

    <!-- Closing line -->
    <div style="padding:24px 54px 0;text-align:center">
      <p style="font-size:14px;font-weight:600;color:${T.SLATE};margin-bottom:6px">Credit memo of record. Keep with your invoice for accounting.</p>
      <p style="font-size:12px;color:${T.BODY};margin-bottom:16px">Questions? Contact us at DemandSignals@gmail.com or (916) 542-2423.</p>
    </div>

    <div style="flex:1"></div>

    ${interiorPageFooter()}
  </div>`
}

// ── Main export ───────────────────────────────────────────────────────

/**
 * Render a credit-memo PDF and return the raw Buffer. Single-page
 * interior layout matching the v2 receipt template, with orange "credit out"
 * accent in place of the receipt's teal "money in" accent.
 */
export async function renderCreditMemoPdf(
  memo: CreditMemoData,
  invoice: CreditMemoInvoiceData,
  prospect: CreditMemoProspect,
): Promise<Buffer> {
  const html = docShell(
    `Credit Memo ${memo.credit_memo_number} — ${prospect.business_name}`,
    creditMemoBody(memo, invoice, prospect),
  )
  return htmlToPdfBuffer(html, { format: 'Legal', printBackground: true })
}
