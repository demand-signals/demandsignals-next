// ── Public invoice viewer: /invoice/[number]/[uuid] ─────────────────
// Premium Stripe-receipt aesthetic. Server component — no 'use client'.
// Matches the PDF template visual language from src/lib/pdf/invoice.ts.

import { notFound } from 'next/navigation'
import { formatCents } from '@/lib/format'
import { BUSINESS_ADDRESS } from '@/lib/constants'

// ── Brand tokens (mirrored from src/lib/pdf/_shared.ts) ───────────────
const T = {
  teal:       '#68c5ad',
  tealDark:   '#4fa894',
  tealSoft:   'rgba(104,197,173,0.08)',
  orange:     '#f28500',
  orangeDeep: '#FF6B2B',
  dark:       '#1d2330',
  dark2:      '#252c3d',
  slate:      '#5d6780',
  slateSoft:  '#94a0b8',
  bgWarm:     '#fafbfc',
  light:      '#f4f6f9',
  rule:       '#e2e8f0',
  white:      '#ffffff',
} as const

const LOGO_URL = 'https://demandsignals.us/assets/logos/dsig_logo_v2b.png'
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

// ── Types ─────────────────────────────────────────────────────────────

interface PublicLineItem {
  description: string
  quantity: number
  unit_price_cents: number
  discount_cents: number | null
  discount_label: string | null
  line_total_cents: number
  sort_order: number
}

interface PublicProspect {
  business_name: string
  owner_name: string | null
  owner_email: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
}

interface PublicInvoice {
  id: string
  prospect_id: string | null
  invoice_number: string
  kind: string
  status: string
  currency: string
  subtotal_cents: number
  discount_cents: number
  total_due_cents: number
  due_date: string | null
  send_date: string | null
  sent_at: string | null
  paid_at: string | null
  voided_at: string | null
  void_reason: string | null
  notes: string | null
  superseded_by_number: string | null
  stripe_payment_link_url: string | null
  late_fee_cents: number | null
  late_fee_grace_days: number | null
  late_fee_applied_at: string | null
  trade_credit_cents: number | null
  trade_credit_description: string | null
  // Document-level discount (migration 036). One-time only. Stacks with TIK.
  discount_kind: 'percent' | 'amount' | null
  discount_value_bps: number | null
  discount_amount_cents: number | null
  discount_description: string | null
  // payment_terms used to be selected here but it's a SOW column, not
  // an invoice column. The API no longer returns it. Kept optional for
  // type safety in case a future schema adds it; render path is
  // conditional so undefined just hides the block.
  payment_terms?: string | null
  prospect: PublicProspect | null
}

interface PublicPaymentSummary {
  paid_cash_cents: number
  paid_tik_cents: number
  paid_total_cents: number
  outstanding_cents: number
  receipt_count: number
  is_partially_paid: boolean
  is_fully_paid: boolean
}

interface PublicProjectMeta {
  name: string | null
  sow_number: string | null
  schedule_outstanding?: {
    cash_remaining_cents: number
    tik_remaining_cents: number
    cash_paid_cents: number
    tik_paid_cents: number
    is_multi_installment: boolean
  } | null
}

interface InvoiceResponse {
  invoice: PublicInvoice
  line_items: PublicLineItem[]
  stripe_enabled: boolean
  payment_summary: PublicPaymentSummary
  project: PublicProjectMeta
}

// ── Data fetch ────────────────────────────────────────────────────────

async function fetchInvoice(number: string, uuid: string): Promise<InvoiceResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://demandsignals.co'
  const res = await fetch(`${baseUrl}/api/invoices/public/${number}?key=${uuid}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

// ── Helpers ───────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

// ── Status pill ───────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    paid:   { label: 'PAID ✓',  bg: 'rgba(34,197,94,0.12)',   color: '#16a34a' },
    sent:   { label: 'SENT',    bg: 'rgba(104,197,173,0.15)', color: '#4fa894' },
    viewed: { label: 'VIEWED',  bg: 'rgba(104,197,173,0.10)', color: '#68c5ad' },
    void:   { label: 'VOIDED',  bg: 'rgba(100,116,139,0.12)', color: '#64748b' },
    draft:  { label: 'DRAFT',   bg: 'rgba(242,133,0,0.12)',   color: '#f28500' },
  }
  const pill = map[status] ?? { label: status.toUpperCase(), bg: 'rgba(148,160,184,0.12)', color: T.slateSoft }
  return (
    <span
      className="inline-block rounded-full px-3 py-1 text-[11px] font-bold tracking-wide"
      style={{ background: pill.bg, color: pill.color, letterSpacing: '0.08em' }}
    >
      {pill.label}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string; uuid: string }>
  searchParams: Promise<{ e?: string }>
}) {
  const { number, uuid } = await params
  const { e: emailSendId } = await searchParams
  const data = await fetchInvoice(number, uuid)
  if (!data) notFound()

  const { invoice, line_items, payment_summary: paySummary, project } = data

  // ── Page tracking ─────────────────────────────────────────────────
  // Server-side log of this magic-link visit. Sets/promotes the dsig_attr
  // cookie when a stronger attribution signal (UUID) lands. Best-effort —
  // never blocks render. See spec §4.7.
  try {
    const { logPageVisit, buildAttributionCookieParts, shouldPromoteCookie } = await import('@/lib/page-tracking')
    const { ATTRIBUTION_COOKIE_NAME, verifyAttributionCookie } = await import('@/lib/attribution-cookie')
    const { cookies: nextCookies } = await import('next/headers')
    const c = await nextCookies()
    const cookiePayload = await verifyAttributionCookie(c.get(ATTRIBUTION_COOKIE_NAME)?.value)

    const visitResult = await logPageVisit({
      page_url: `/invoice/${number}/${uuid}`,
      page_type: 'invoice',
      invoice_id: invoice.id,
      attributed_prospect_id: invoice.prospect_id ?? undefined,
      email_send_id: emailSendId,
    })

    if (
      shouldPromoteCookie(visitResult.attribution_source, visitResult.prospect_id, cookiePayload?.pid ?? null)
    ) {
      const parts = await buildAttributionCookieParts(visitResult.prospect_id!)
      if (parts) {
        try {
          c.set(parts.name, parts.value, parts.options)
        } catch {
          // Read-only cookie context (e.g. static page render). Accept gap; next visit retries.
        }
      }
    }
  } catch (e) {
    console.error('[invoice page] tracking failed:', e instanceof Error ? e.message : e)
  }

  const isPaid      = invoice.status === 'paid'
  const isVoid      = invoice.status === 'void'
  const isOutstanding = !isPaid && !isVoid && invoice.total_due_cents > 0
  const canPay = isOutstanding && data.stripe_enabled
  const payRedirectHref = `/api/invoices/public/${number}/pay?key=${uuid}`
  const downloadUrl   = `/api/invoices/public/${number}/pdf?key=${uuid}`

  const lateFeeApplied = (invoice.late_fee_cents ?? 0) > 0 && !!invoice.late_fee_applied_at
  const grandTotal     = invoice.total_due_cents + (lateFeeApplied ? (invoice.late_fee_cents ?? 0) : 0)
  const tikCents       = invoice.trade_credit_cents ?? 0
  const discountTotal  = invoice.discount_cents ?? 0
  // Document-level discount (migration 036)
  const docDiscountKind = invoice.discount_kind ?? null
  const docDiscountValueBps = invoice.discount_value_bps ?? 0
  const docDiscountAmountCents = invoice.discount_amount_cents ?? 0
  const docDiscountDescription = invoice.discount_description ?? null
  const lineTotalForDisc = Math.max(0, invoice.subtotal_cents - discountTotal)
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

  const prospect = invoice.prospect
  const cityLine = [prospect?.city, prospect?.state, prospect?.zip].filter(Boolean).join(', ')

  // Sort line items
  const sortedItems = [...line_items].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bgWarm,
        fontFamily: FONT,
        color: T.dark,
      }}
    >
      {/* ── Outer wrapper ─────────────────────────────────────────── */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* ── Document card ─────────────────────────────────────── */}
        <div
          style={{
            position: 'relative',
            background: T.white,
            borderRadius: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 24px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >

          {/* Angled PAID / VOID stamp — mirrors the PDF stamp so the
              magic-link page and the downloaded PDF read identically.
              Hunter directive 2026-04-29. Pointer-events:none so it
              doesn't block clicks on anything underneath. */}
          {isPaid && (
            <div
              style={{
                position: 'absolute',
                top: '38%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-18deg)',
                pointerEvents: 'none',
                zIndex: 10,
                border: `6px double ${T.teal}`,
                borderRadius: 8,
                padding: '14px 36px 10px',
                opacity: 0.32,
                fontFamily: "Georgia, 'Times New Roman', serif",
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontSize: 72,
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  color: T.teal,
                  margin: 0,
                  lineHeight: 1,
                  textTransform: 'uppercase',
                }}
              >
                PAID
              </p>
              {invoice.paid_at && (
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.15em',
                    color: T.teal,
                    margin: '4px 0 0',
                  }}
                >
                  {fmtDate(invoice.paid_at)}
                </p>
              )}
            </div>
          )}
          {isVoid && (
            <div
              style={{
                position: 'absolute',
                top: '38%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-18deg)',
                pointerEvents: 'none',
                zIndex: 10,
                border: '6px double #dc2626',
                borderRadius: 8,
                padding: '14px 36px 10px',
                opacity: 0.32,
                fontFamily: "Georgia, 'Times New Roman', serif",
              }}
            >
              <p
                style={{
                  fontSize: 72,
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  color: '#dc2626',
                  margin: 0,
                  lineHeight: 1,
                  textTransform: 'uppercase',
                }}
              >
                VOID
              </p>
            </div>
          )}

          {/* ── 1. Header strip ─────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '40px 48px 28px',
              borderBottom: `1px solid ${T.rule}`,
            }}
          >
            {/* Logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO_URL}
              alt="Demand Signals"
              style={{ height: 34, objectFit: 'contain', display: 'block' }}
            />

            {/* Invoice eyebrow + number + status */}
            <div style={{ textAlign: 'right' }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: T.slateSoft,
                  marginBottom: 6,
                }}
              >
                INVOICE
              </p>
              <p
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: T.teal,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  letterSpacing: '-0.01em',
                  lineHeight: 1,
                  marginBottom: project?.name ? 6 : 10,
                }}
              >
                {invoice.invoice_number}
              </p>
              {project?.name && (
                <p style={{ fontSize: 13, color: T.dark, fontWeight: 600, marginBottom: 2 }}>
                  {project.name}
                </p>
              )}
              {project?.sow_number && (
                <p style={{ fontSize: 11, color: T.slateSoft, marginBottom: 10 }}>
                  For {project.sow_number}
                </p>
              )}
              <StatusPill status={invoice.status} />
            </div>
          </div>

          {/* ── Gradient accent bar ──────────────────────────────── */}
          <div
            style={{
              height: 5,
              background: `linear-gradient(90deg, ${T.orangeDeep}, ${T.teal})`,
            }}
          />

          {/* ── Void notice ──────────────────────────────────────── */}
          {isVoid && (
            <div
              style={{
                margin: '24px 48px 0',
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 10,
                padding: '16px 20px',
                color: '#dc2626',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>This invoice has been voided.</div>
              {invoice.void_reason && (
                <div style={{ fontSize: 13, color: '#ef4444', opacity: 0.85 }}>{invoice.void_reason}</div>
              )}
              {invoice.superseded_by_number && (
                <div style={{ fontSize: 12, marginTop: 6, color: T.slate }}>
                  Superseded by invoice <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{invoice.superseded_by_number}</span>
                </div>
              )}
            </div>
          )}

          {/* ── 2. Bill-to + dates row ───────────────────────────── */}
          <div
            style={{
              display: 'flex',
              gap: 0,
              padding: '28px 48px',
              borderBottom: `1px solid ${T.rule}`,
              flexWrap: 'wrap',
            }}
          >
            {/* Bill-to column */}
            <div style={{ flex: '2 1 200px', paddingRight: 32, paddingBottom: 16 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: T.slateSoft,
                  marginBottom: 10,
                }}
              >
                BILL TO
              </p>
              <p style={{ fontSize: 16, fontWeight: 700, color: T.dark, lineHeight: 1.3, marginBottom: 4 }}>
                {prospect?.business_name ?? '—'}
              </p>
              {prospect?.owner_name && (
                <p style={{ fontSize: 13, color: T.slate, marginBottom: 2 }}>{prospect.owner_name}</p>
              )}
              {prospect?.address && (
                <p style={{ fontSize: 13, color: T.slate, marginBottom: 2 }}>{prospect.address}</p>
              )}
              {cityLine && (
                <p style={{ fontSize: 13, color: T.slate, marginBottom: 2 }}>{cityLine}</p>
              )}
              {prospect?.owner_email && (
                <p style={{ fontSize: 13, color: T.slate }}>{prospect.owner_email}</p>
              )}
            </div>

            {/* Dates column */}
            <div
              style={{
                flex: '1 1 140px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                borderLeft: `1px solid ${T.rule}`,
                paddingLeft: 32,
              }}
            >
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.slateSoft, marginBottom: 4 }}>
                  FROM
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: T.dark, marginBottom: 2 }}>Demand Signals</p>
                <p style={{ fontSize: 12, color: T.slate, lineHeight: 1.5 }}>
                  {BUSINESS_ADDRESS.street}<br />
                  {BUSINESS_ADDRESS.city}, {BUSINESS_ADDRESS.state} {BUSINESS_ADDRESS.zip}<br />
                  (916) 542-2423
                </p>
              </div>
              {(invoice.send_date || invoice.sent_at) && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.slateSoft, marginBottom: 3 }}>
                    INVOICE DATE
                  </p>
                  <p style={{ fontSize: 13, color: T.dark }}>{fmtDate(invoice.send_date ?? invoice.sent_at)}</p>
                </div>
              )}
              {invoice.due_date && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.slateSoft, marginBottom: 3 }}>
                    DUE DATE
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.dark }}>{fmtDate(invoice.due_date)}</p>
                </div>
              )}
              {invoice.paid_at && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.slateSoft, marginBottom: 3 }}>
                    PAID
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.tealDark }}>{fmtDate(invoice.paid_at)}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── 3. Line items table ──────────────────────────────── */}
          <div style={{ padding: '0 48px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
                <thead>
                  <tr style={{ background: T.light }}>
                    <th style={{
                      textAlign: 'left', padding: '10px 12px',
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                      textTransform: 'uppercase', color: T.slateSoft,
                    }}>Item</th>
                    <th style={{
                      textAlign: 'right', padding: '10px 12px', width: 50,
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                      textTransform: 'uppercase', color: T.slateSoft,
                    }}>Qty</th>
                    <th style={{
                      textAlign: 'right', padding: '10px 12px', width: 90,
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                      textTransform: 'uppercase', color: T.slateSoft,
                    }}>Unit</th>
                    <th style={{
                      textAlign: 'right', padding: '10px 12px', width: 90,
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                      textTransform: 'uppercase', color: T.slateSoft,
                    }}>Discount</th>
                    <th style={{
                      textAlign: 'right', padding: '10px 12px', width: 100,
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                      textTransform: 'uppercase', color: T.slateSoft,
                    }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((li, idx) => {
                    const disc = li.discount_cents ?? 0
                    return (
                      <tr
                        key={idx}
                        style={{ borderBottom: `1px solid ${T.rule}` }}
                      >
                        <td style={{ padding: '13px 12px', verticalAlign: 'top' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.dark }}>
                            {li.description}
                          </div>
                          {li.discount_label && (
                            <div style={{ fontSize: 11, color: T.orange, marginTop: 3 }}>
                              {li.discount_label}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '13px 12px', textAlign: 'right', verticalAlign: 'top', fontSize: 13, fontVariantNumeric: 'tabular-nums', color: T.slate, whiteSpace: 'nowrap' }}>
                          {li.quantity}
                        </td>
                        <td style={{ padding: '13px 12px', textAlign: 'right', verticalAlign: 'top', fontSize: 13, fontVariantNumeric: 'tabular-nums', color: T.slate, whiteSpace: 'nowrap' }}>
                          {formatCents(li.unit_price_cents)}
                        </td>
                        <td style={{ padding: '13px 12px', textAlign: 'right', verticalAlign: 'top', fontSize: 13, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: disc > 0 ? T.orange : T.slateSoft }}>
                          {disc > 0 ? `−${formatCents(disc)}` : '—'}
                        </td>
                        <td style={{ padding: '13px 12px', textAlign: 'right', verticalAlign: 'top', fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: T.dark, whiteSpace: 'nowrap' }}>
                          {formatCents(li.line_total_cents)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── 4. Totals block ──────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '24px 48px 0' }}>
            <div style={{ width: 320 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '7px 0', fontSize: 13, color: T.slate }}>Subtotal</td>
                    <td style={{ padding: '7px 0', textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums', color: T.dark }}>
                      {formatCents(invoice.subtotal_cents)}
                    </td>
                  </tr>
                  {discountTotal > 0 && (
                    <tr>
                      <td style={{ padding: '7px 0', fontSize: 13, color: T.slate }}>Line item discounts</td>
                      <td style={{ padding: '7px 0', textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums', color: T.orange }}>
                        −{formatCents(discountTotal)}
                      </td>
                    </tr>
                  )}
                  {docDiscountCents > 0 && (
                    <tr>
                      <td style={{ padding: '7px 0', fontSize: 13, color: T.slate }}>
                        {docDiscountDescription?.trim() || 'Discount'}
                        {docDiscountKind === 'percent' && (
                          <span style={{ fontSize: 11, color: T.slateSoft, marginLeft: 4 }}>
                            ({(docDiscountValueBps / 100).toFixed(docDiscountValueBps % 100 === 0 ? 0 : 2)}%)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '7px 0', textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums', color: T.orange }}>
                        −{formatCents(docDiscountCents)}
                      </td>
                    </tr>
                  )}
                  {tikCents > 0 && (
                    <tr>
                      <td style={{ padding: '7px 0', fontSize: 13, color: T.slate }}>
                        Trade-in-Kind credit
                        {invoice.trade_credit_description && (
                          <div style={{ fontSize: 11, color: T.slateSoft, marginTop: 2 }}>
                            {invoice.trade_credit_description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '7px 0', textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums', color: T.orange }}>
                        −{formatCents(tikCents)}
                      </td>
                    </tr>
                  )}
                  {lateFeeApplied && (
                    <tr>
                      <td style={{ padding: '7px 0', fontSize: 13, color: T.slate }}>Late fee</td>
                      <td style={{ padding: '7px 0', textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums', color: T.orange }}>
                        +{formatCents(invoice.late_fee_cents!)}
                      </td>
                    </tr>
                  )}
                  {/* Total due — big */}
                  <tr>
                    <td style={{ paddingTop: 14, paddingBottom: paySummary?.paid_total_cents ? 8 : 0, borderTop: `2px solid ${T.dark}`, fontSize: 15, fontWeight: 700, color: T.dark }}>
                      Total due
                    </td>
                    <td style={{ paddingTop: 14, paddingBottom: paySummary?.paid_total_cents ? 8 : 0, borderTop: `2px solid ${T.dark}`, textAlign: 'right', fontSize: paySummary?.paid_total_cents ? 22 : 36, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: T.dark, letterSpacing: '-0.02em', lineHeight: 1 }}>
                      {formatCents(grandTotal)}
                    </td>
                  </tr>

                  {/* Payment rows — only when receipts exist */}
                  {paySummary && paySummary.paid_cash_cents > 0 && (
                    <tr>
                      <td style={{ padding: '5px 0', fontSize: 12, color: T.tealDark }}>Paid (cash)</td>
                      <td style={{ padding: '5px 0', textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums', color: T.tealDark }}>
                        −{formatCents(paySummary.paid_cash_cents)}
                      </td>
                    </tr>
                  )}
                  {paySummary && paySummary.paid_tik_cents > 0 && (
                    <tr>
                      <td style={{ padding: '5px 0', fontSize: 12, color: T.tealDark }}>Paid (trade-in-kind)</td>
                      <td style={{ padding: '5px 0', textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums', color: T.tealDark }}>
                        −{formatCents(paySummary.paid_tik_cents)}
                      </td>
                    </tr>
                  )}
                  {paySummary && paySummary.paid_total_cents > 0 && (
                    <tr>
                      <td style={{ paddingTop: 10, borderTop: `1px solid ${T.rule}`, fontSize: 14, fontWeight: 700, color: paySummary.outstanding_cents > 0 ? T.orange : T.tealDark }}>
                        Balance {paySummary.outstanding_cents > 0 ? 'due' : 'remaining'}
                      </td>
                      <td style={{ paddingTop: 10, borderTop: `1px solid ${T.rule}`, textAlign: 'right', fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: paySummary.outstanding_cents > 0 ? T.orange : T.tealDark, letterSpacing: '-0.01em' }}>
                        {formatCents(paySummary.outstanding_cents)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Late fee pending notice */}
              {(invoice.late_fee_cents ?? 0) > 0 && !lateFeeApplied && (
                <p style={{ fontSize: 11, color: T.slateSoft, textAlign: 'right', marginTop: 6 }}>
                  A late fee of {formatCents(invoice.late_fee_cents!)} applies if unpaid after {invoice.late_fee_grace_days} days past due.
                </p>
              )}
            </div>
          </div>

          {/* ── 4b. Project-level balance (multi-installment plans) ── */}
          {project?.schedule_outstanding && project.schedule_outstanding.is_multi_installment && (
            <div
              style={{
                margin: '20px 48px 0',
                background: '#fbfcfd',
                border: `1px solid ${T.rule}`,
                borderRadius: 10,
                padding: '14px 18px',
              }}
            >
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.slateSoft, marginBottom: 10 }}>
                {project.name ?? 'Project'} — overall balance
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
                <tbody>
                  {(project.schedule_outstanding.cash_remaining_cents > 0 || project.schedule_outstanding.cash_paid_cents > 0) && (
                    <tr>
                      <td style={{ padding: '4px 0', fontSize: 12, color: T.slate }}>Cash balance</td>
                      <td style={{ padding: '4px 0', textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums', color: T.dark }}>
                        {formatCents(project.schedule_outstanding.cash_paid_cents)} paid · <strong style={{ color: project.schedule_outstanding.cash_remaining_cents > 0 ? T.orange : T.tealDark }}>{formatCents(project.schedule_outstanding.cash_remaining_cents)}</strong> remaining
                      </td>
                    </tr>
                  )}
                  {(project.schedule_outstanding.tik_remaining_cents > 0 || project.schedule_outstanding.tik_paid_cents > 0) && (
                    <tr>
                      <td style={{ padding: '4px 0', fontSize: 12, color: T.slate }}>Trade-in-kind balance</td>
                      <td style={{ padding: '4px 0', textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums', color: T.dark }}>
                        {formatCents(project.schedule_outstanding.tik_paid_cents)} drawn · <strong style={{ color: project.schedule_outstanding.tik_remaining_cents > 0 ? T.orange : T.tealDark }}>{formatCents(project.schedule_outstanding.tik_remaining_cents)}</strong> remaining
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── 5. Payment card ──────────────────────────────────── */}
          <div
            style={{
              margin: '28px 48px 0',
              background: T.tealSoft,
              borderRadius: 12,
              borderLeft: `3px solid ${T.teal}`,
              padding: '20px 24px',
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: T.tealDark,
                marginBottom: 10,
              }}
            >
              PAYMENT INSTRUCTIONS
            </p>

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

            {invoice.payment_terms && (
              <p style={{ fontSize: 12, color: T.slate, marginTop: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {invoice.payment_terms}
              </p>
            )}
          </div>

          {/* ── 6. Notes ─────────────────────────────────────────── */}
          {invoice.notes && (
            <div
              style={{
                margin: '20px 48px 0',
                background: 'rgba(242,133,0,0.05)',
                borderRadius: 12,
                borderLeft: `3px solid ${T.orange}`,
                padding: '20px 24px',
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: T.orange,
                  marginBottom: 8,
                }}
              >
                NOTES
              </p>
              <p style={{ fontSize: 13, color: T.dark, lineHeight: 1.7, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                {invoice.notes}
              </p>
            </div>
          )}

          {/* ── 7. Action row ────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
              padding: '28px 48px',
            }}
          >
            <a
              href={downloadUrl}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: T.dark,
                color: T.white,
                borderRadius: 8,
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                letterSpacing: '-0.01em',
              }}
            >
              ↓ Download PDF
            </a>
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
          </div>

          {/* ── 8. Footer ────────────────────────────────────────── */}
          <div
            style={{
              borderTop: `1px solid ${T.rule}`,
              padding: '24px 48px 32px',
            }}
          >
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: T.dark,
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              Thank you for your business.
            </p>

            {/* 3-col contact */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 0,
                flexWrap: 'wrap',
                maxWidth: 480,
                margin: '0 auto 20px',
              }}
            >
              <div style={{ flex: '1 1 140px', textAlign: 'center', padding: '8px 16px', borderRight: `1px solid ${T.rule}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: T.slateSoft, marginBottom: 4 }}>EMAIL</p>
                <a href="mailto:DemandSignals@gmail.com" style={{ fontSize: 12, color: T.tealDark, textDecoration: 'none' }}>
                  DemandSignals@gmail.com
                </a>
              </div>
              <div style={{ flex: '1 1 120px', textAlign: 'center', padding: '8px 16px', borderRight: `1px solid ${T.rule}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: T.slateSoft, marginBottom: 4 }}>PHONE</p>
                <a href="tel:+19165422423" style={{ fontSize: 12, color: T.tealDark, textDecoration: 'none' }}>
                  (916) 542-2423
                </a>
              </div>
              <div style={{ flex: '1 1 120px', textAlign: 'center', padding: '8px 16px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: T.slateSoft, marginBottom: 4 }}>WEB</p>
                <a href="https://demandsignals.co" target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.tealDark, textDecoration: 'none' }}>
                  demandsignals.co
                </a>
              </div>
            </div>

            <p style={{ fontSize: 11, color: T.slateSoft, textAlign: 'center', opacity: 0.7 }}>
              &copy; 2026 Demand Signals. Confidential.
            </p>
          </div>

        </div>
        {/* /document card */}

      </div>
    </div>
  )
}

export const metadata = {
  robots: 'noindex, nofollow',
  // Strip the path (which contains the UUID secret) from any outgoing Referer
  // header. Site-wide policy is strict-origin-when-cross-origin, but THAT
  // still leaks the path on same-origin navigation (e.g. clicking a link from
  // this page to /contact would put the UUID in /contact's request log).
  // 'no-referrer' on this page strips the header entirely.
  referrer: 'no-referrer',
}
