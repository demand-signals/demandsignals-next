// ── Public SOW viewer: /sow/[number]/[uuid] ─────────────────────────
// Premium proposal microsite — matches PDF visual language.
// Server-rendered shell + client component for Accept flow.

import { notFound } from 'next/navigation'
import { SowAcceptClient } from './SowAcceptClient'
import { formatCents } from '@/lib/format'
import type { SowPhase, SowPhaseDeliverable, Cadence } from '@/lib/invoice-types'

// ── Types ────────────────────────────────────────────────────────────

interface LegacyDeliverable {
  name: string
  description: string
  acceptance_criteria?: string
  quantity?: number
  hours?: number
  unit_price_cents?: number
  line_total_cents?: number
}

interface LegacyTimelinePhase {
  name: string
  duration_weeks: number
  description: string
}

interface SowPricing {
  total_cents: number
  deposit_cents: number
  deposit_pct: number
}

interface PublicSow {
  id: string
  prospect_id: string | null
  sow_number: string
  public_uuid: string
  status: string
  title: string
  scope_summary: string | null
  phases: SowPhase[]
  deliverables: LegacyDeliverable[]
  timeline: LegacyTimelinePhase[]
  pricing: SowPricing
  trade_credit_cents: number | null
  trade_credit_description: string | null
  // Document-level discount (migration 036). One-time only. Stacks with TIK.
  discount_kind: 'percent' | 'amount' | null
  discount_value_bps: number | null
  discount_amount_cents: number | null
  discount_description: string | null
  payment_terms: string | null
  guarantees: string | null
  notes: string | null
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  accepted_signature: string | null
  voided_at: string | null
  void_reason: string | null
  prospect: { business_name: string; owner_email: string | null } | null
}

interface SowResponse {
  sow: PublicSow
  deposit_invoice_email?: {
    sent: boolean
    latest_event: string | null
  } | null
}

// ── Cadence helpers ──────────────────────────────────────────────────

const CADENCE_LABEL: Record<string, string> = {
  one_time: 'One-time',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
}

// Inline pill rendered as a React span
function CadencePill({ cadence }: { cadence: string }) {
  const label = CADENCE_LABEL[cadence] ?? cadence
  let color = '#94a0b8'
  if (cadence === 'monthly') color = '#68c5ad'
  else if (cadence === 'quarterly') color = '#4fa894'
  else if (cadence === 'annual') color = '#f28500'

  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ color, border: `1px solid ${color}`, letterSpacing: '0.02em' }}
    >
      {label}
    </span>
  )
}

// ── Accumulate phase totals ──────────────────────────────────────────

interface Totals { oneTime: number; monthly: number; quarterly: number; annual: number }

function accumulatePhase(phase: SowPhase): Totals {
  const t: Totals = { oneTime: 0, monthly: 0, quarterly: 0, annual: 0 }
  for (const d of phase.deliverables) {
    const line = d.line_total_cents ?? (((d.hours ?? d.quantity ?? 1)) * (d.unit_price_cents ?? 0))
    switch (d.cadence) {
      case 'monthly':   t.monthly   += line; break
      case 'quarterly': t.quarterly += line; break
      case 'annual':    t.annual    += line; break
      default:          t.oneTime   += line
    }
  }
  return t
}

function accumulateAll(phases: SowPhase[]): Totals {
  return phases.reduce<Totals>(
    (acc, p) => {
      const t = accumulatePhase(p)
      return { oneTime: acc.oneTime + t.oneTime, monthly: acc.monthly + t.monthly, quarterly: acc.quarterly + t.quarterly, annual: acc.annual + t.annual }
    },
    { oneTime: 0, monthly: 0, quarterly: 0, annual: 0 },
  )
}

// ── Data fetching ────────────────────────────────────────────────────

async function fetchSow(number: string, uuid: string): Promise<SowResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://demandsignals.co'
  const res = await fetch(`${baseUrl}/api/sow/public/${number}?key=${uuid}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

// ── Phase card ───────────────────────────────────────────────────────

function PhaseCard({ phase, idx }: { phase: SowPhase; idx: number }) {
  const num = String(idx + 1).padStart(2, '0')
  const t = accumulatePhase(phase)
  const parts: string[] = []
  if (t.oneTime > 0)    parts.push(`${formatCents(t.oneTime)} one-time`)
  if (t.monthly > 0)    parts.push(`${formatCents(t.monthly)}/mo`)
  if (t.quarterly > 0)  parts.push(`${formatCents(t.quarterly)}/qtr`)
  if (t.annual > 0)     parts.push(`${formatCents(t.annual)}/yr`)

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-6 overflow-hidden">
      {/* Phase header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <span
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-semibold text-sm flex-shrink-0"
            style={{ background: 'var(--teal)' }}
          >
            {num}
          </span>
          <h3 className="text-base font-bold text-slate-900">{phase.name}</h3>
        </div>
        {phase.description && (
          <p className="text-sm italic ml-11" style={{ color: 'var(--slate)' }}>
            {phase.description}
          </p>
        )}
      </div>

      {/* Deliverables table */}
      {phase.deliverables.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: '#f4f6f9' }}>
                <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94a0b8' }}>Item</th>
                <th className="text-center px-4 py-2 text-[10px] font-bold uppercase tracking-widest w-24" style={{ color: '#94a0b8' }}>Cadence</th>
                <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-widest w-16" style={{ color: '#94a0b8' }}>Qty</th>
                <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-widest w-24" style={{ color: '#94a0b8' }}>Rate</th>
                <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-widest w-24" style={{ color: '#94a0b8' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {phase.deliverables.map((d, i) => {
                const qty = d.quantity ?? 1
                const hrs = d.hours
                const unit = d.unit_price_cents ?? 0
                const line = d.line_total_cents ?? ((hrs ?? qty) * unit)
                const cadence = d.cadence ?? 'one_time'
                const suffix = cadence === 'monthly' ? '/mo' : cadence === 'quarterly' ? '/qtr' : cadence === 'annual' ? '/yr' : ''
                const qtyCell = hrs != null ? `${hrs} hr` : `${qty}`

                return (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 align-top max-w-xs">
                      <div className="font-semibold text-sm text-slate-900">{d.name}</div>
                      {d.description && (
                        <div className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--slate)' }}>{d.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center align-top whitespace-nowrap">
                      <CadencePill cadence={cadence} />
                    </td>
                    <td className="px-4 py-3 text-right align-top text-sm tabular-nums whitespace-nowrap">{qtyCell}</td>
                    <td className="px-4 py-3 text-right align-top text-sm tabular-nums whitespace-nowrap">
                      {formatCents(unit)}{suffix && <span className="text-[11px]" style={{ color: '#94a0b8' }}>{suffix}</span>}
                    </td>
                    <td className="px-4 py-3 text-right align-top text-sm font-semibold tabular-nums whitespace-nowrap">
                      {line > 0 ? <>{formatCents(line)}{suffix && <span className="text-[11px] font-normal" style={{ color: '#94a0b8' }}>{suffix}</span>}</> : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-6 pb-5 text-sm italic" style={{ color: '#94a0b8' }}>No deliverables defined for this phase.</p>
      )}

      {/* Phase subtotal strip */}
      {parts.length > 0 && (
        <div className="px-6 py-3 border-t border-slate-100 text-right text-sm" style={{ color: 'var(--slate)' }}>
          Phase subtotal: <strong className="text-slate-900">{parts.join(' · ')}</strong>
        </div>
      )}
    </div>
  )
}

// ── Legacy deliverables fallback ─────────────────────────────────────

function LegacyScopeCard({ deliverables }: { deliverables: LegacyDeliverable[] }) {
  if (!deliverables?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-6 overflow-hidden">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <span
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-semibold text-sm flex-shrink-0"
            style={{ background: 'var(--teal)' }}
          >
            01
          </span>
          <h3 className="text-base font-bold text-slate-900">Scope</h3>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: '#f4f6f9' }}>
              <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94a0b8' }}>Item</th>
              <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-widest w-16" style={{ color: '#94a0b8' }}>Qty/Hrs</th>
              <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-widest w-24" style={{ color: '#94a0b8' }}>Rate</th>
              <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-widest w-24" style={{ color: '#94a0b8' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {deliverables.map((d, i) => {
              const qty = d.quantity ?? 1
              const hrs = d.hours
              const unit = d.unit_price_cents ?? 0
              const line = d.line_total_cents ?? ((hrs ?? qty) * unit)
              const qtyCell = hrs != null ? `${hrs} hr` : `${qty}`
              return (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 align-top">
                    <div className="font-semibold text-sm text-slate-900">{d.name}</div>
                    {d.description && <div className="text-xs mt-0.5" style={{ color: 'var(--slate)' }}>{d.description}</div>}
                    {d.acceptance_criteria && (
                      <div className="text-xs mt-1.5" style={{ color: '#94a0b8' }}>
                        <span className="font-semibold">Accepted when:</span> {d.acceptance_criteria}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right align-top text-sm tabular-nums">{qtyCell}</td>
                  <td className="px-4 py-3 text-right align-top text-sm tabular-nums">{formatCents(unit)}</td>
                  <td className="px-4 py-3 text-right align-top text-sm font-semibold tabular-nums">{formatCents(line)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Info card (payment terms / guarantees / notes) ───────────────────

function InfoCard({
  title,
  body,
  accentColor = '#68c5ad',
}: {
  title: string
  body: string
  accentColor?: string
}) {
  return (
    <div
      className="rounded-xl p-5 mb-4"
      style={{
        background: `rgba(104,197,173,0.06)`,
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      <div
        className="text-[10px] font-bold uppercase tracking-widest mb-2"
        style={{ color: accentColor }}
      >
        {title}
      </div>
      <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--dark)' }}>
        {body}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────

export default async function PublicSowPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string; uuid: string }>
  searchParams: Promise<{ e?: string }>
}) {
  const { number, uuid } = await params
  const { e: emailSendId } = await searchParams
  const data = await fetchSow(number, uuid)
  if (!data) notFound()

  const { sow, deposit_invoice_email } = data

  // ── Page tracking ─────────────────────────────────────────────────
  // Server-side log + cookie promotion. Best-effort; never blocks render.
  // See spec §4.7.
  try {
    const { logPageVisit, buildAttributionCookieParts, shouldPromoteCookie } = await import('@/lib/page-tracking')
    const { ATTRIBUTION_COOKIE_NAME, verifyAttributionCookie } = await import('@/lib/attribution-cookie')
    const { cookies: nextCookies } = await import('next/headers')
    const c = await nextCookies()
    const cookiePayload = await verifyAttributionCookie(c.get(ATTRIBUTION_COOKIE_NAME)?.value)

    const visitResult = await logPageVisit({
      page_url: `/sow/${number}/${uuid}`,
      page_type: 'sow',
      sow_document_id: sow.id,
      attributed_prospect_id: sow.prospect_id ?? undefined,
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
          // Read-only cookie context. Accept gap; next visit retries.
        }
      }
    }
  } catch (e) {
    console.error('[sow page] tracking failed:', e instanceof Error ? e.message : e)
  }

  const isAccepted = sow.status === 'accepted'
  const isVoid     = sow.status === 'void'
  const isOpen     = !isAccepted && !isVoid && ['sent', 'viewed'].includes(sow.status)

  const downloadUrl = `/api/sow/public/${number}/pdf?key=${uuid}`

  // Determine if we have phases or fall back to legacy deliverables
  const usePhases = Array.isArray(sow.phases) && sow.phases.length > 0

  // Accumulate totals for investment section
  const totals = usePhases
    ? accumulateAll(sow.phases)
    : { oneTime: sow.pricing.total_cents, monthly: 0, quarterly: 0, annual: 0 }

  const tikCents    = sow.trade_credit_cents ?? 0
  // Document-level discount (migration 036). Same math as PDF + admin: subtotal − discount − TIK = cash.
  const discountCents = (() => {
    if (sow.discount_kind === 'percent') {
      const bps = Math.max(0, Math.min(10000, sow.discount_value_bps ?? 0))
      return Math.min(totals.oneTime, Math.round(totals.oneTime * bps / 10000))
    }
    if (sow.discount_kind === 'amount') {
      return Math.min(totals.oneTime, Math.max(0, sow.discount_amount_cents ?? 0))
    }
    return 0
  })()
  const cashOneTime = Math.max(0, totals.oneTime - discountCents - tikCents)
  const hasReductions = tikCents > 0 || discountCents > 0
  const depositPct  = sow.pricing.deposit_pct ?? 50
  const depositCents = sow.pricing.deposit_cents ?? Math.round(cashOneTime * depositPct / 100)
  const balanceCents = (hasReductions ? cashOneTime : totals.oneTime) - depositCents
  const hasRecurring = totals.monthly > 0 || totals.quarterly > 0 || totals.annual > 0

  const bigNumber = usePhases
    ? (hasReductions ? formatCents(cashOneTime) : formatCents(totals.oneTime))
    : formatCents(sow.pricing.total_cents)

  const issueDate = sow.sent_at
    ? new Date(sow.sent_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date(sow.viewed_at ?? Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const validUntilDate = (() => {
    const base = sow.sent_at ? new Date(sow.sent_at) : new Date()
    base.setDate(base.getDate() + 30)
    return base.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  })()

  return (
    <div className="min-h-screen" style={{ background: '#fafbfc', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── 1. Hero section ───────────────────────────────────────── */}
      <section
        style={{
          background: 'var(--dark)',
          backgroundImage: 'radial-gradient(circle at 110% -10%, rgba(104,197,173,0.30), transparent 50%)',
        }}
      >
        {/* Top bar — status pill only; logo removed (already in marketing nav) */}
        <div className="max-w-[920px] mx-auto px-6 pt-10 pb-0 flex items-center justify-end">
          {isAccepted ? (
            <span className="inline-block px-4 py-1 rounded-full text-xs font-bold text-white" style={{ background: '#22c55e' }}>
              ACCEPTED ✓
            </span>
          ) : isVoid ? (
            <span className="inline-block px-4 py-1 rounded-full text-xs font-bold text-white" style={{ background: '#ef4444' }}>
              VOIDED
            </span>
          ) : (
            <span className="inline-block px-4 py-1 rounded-full text-xs font-bold text-white" style={{ background: '#FF6B2B' }}>
              PROPOSAL
            </span>
          )}
        </div>

        {/* Void notice */}
        {isVoid && (
          <div className="max-w-[920px] mx-auto px-6 mt-6">
            <div className="bg-red-900/30 border border-red-500/40 rounded-lg px-5 py-4 text-red-200 text-sm">
              <div className="font-bold mb-1">This Statement of Work has been voided.</div>
              {sow.void_reason && <div>{sow.void_reason}</div>}
            </div>
          </div>
        )}

        {/* Main hero content */}
        <div className="max-w-[920px] mx-auto px-6 pt-14 pb-10">
          <p
            className="text-xs font-bold uppercase mb-5"
            style={{ letterSpacing: '0.4em', color: 'var(--teal)', opacity: 0.85 }}
          >
            STATEMENT OF WORK
          </p>
          <h1
            className="font-bold text-white mb-4 leading-tight"
            style={{ fontSize: 'clamp(36px, 5vw, 52px)', letterSpacing: '-0.02em' }}
          >
            {sow.title}
          </h1>
          <p
            className="text-xl font-mono mb-6"
            style={{ color: 'var(--teal)' }}
          >
            {sow.sow_number}
          </p>
          {/* Orange rule */}
          <div className="mb-6" style={{ width: 64, height: 3, background: '#FF6B2B' }} />
          {sow.prospect?.business_name && (
            <p className="text-sm italic" style={{ color: '#cbd5e1' }}>
              Prepared for <span className="font-bold not-italic text-white">{sow.prospect.business_name}</span>
            </p>
          )}
        </div>

        {/* Three-column info strip */}
        <div style={{ background: 'var(--dark-2, #252c3d)' }}>
          <div className="max-w-[920px] mx-auto px-6">
            <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-white/10">
              <div className="flex-1 py-6 sm:pr-8">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#cbd5e1' }}>ISSUE DATE</p>
                <p className="text-base font-bold text-white">{issueDate}</p>
              </div>
              <div className="flex-1 py-6 sm:px-8">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#cbd5e1' }}>INVESTMENT</p>
                <p className="text-lg font-bold text-white" style={{ letterSpacing: '-0.02em' }}>{bigNumber}</p>
                {tikCents > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--teal)' }}>cash (after TIK credit)</p>
                )}
              </div>
              <div className="flex-1 py-6 sm:pl-8">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#cbd5e1' }}>VALID UNTIL</p>
                <p className="text-base font-bold text-white">{validUntilDate}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Scope section ─────────────────────────────────────── */}
      {sow.scope_summary && (
        <section className="max-w-[860px] mx-auto px-6 pt-16 pb-2">
          <p className="text-base leading-relaxed mb-12 max-w-2xl whitespace-pre-wrap" style={{ color: 'var(--slate)' }}>
            {sow.scope_summary}
          </p>
        </section>
      )}

      {/* ── 3. Phases & Deliverables ────────────────────────────── */}
      <section className="max-w-[860px] mx-auto px-6 pb-16">
        {!sow.scope_summary && (
          <div className="pt-20 mb-8">
            <div
              className="w-full mb-10 rounded-full"
              style={{ height: 4, background: 'linear-gradient(90deg, #FF6B2B, #68c5ad)' }}
            />
          </div>
        )}
        <p className="text-[10px] font-bold uppercase tracking-widest mb-6" style={{ color: '#94a0b8' }}>
          PHASES &amp; DELIVERABLES
        </p>

        {usePhases
          ? sow.phases.map((phase, i) => <PhaseCard key={phase.id ?? i} phase={phase} idx={i} />)
          : <LegacyScopeCard deliverables={sow.deliverables} />
        }
      </section>

      {/* ── 4. Investment section ────────────────────────────────── */}
      <section className="max-w-[860px] mx-auto px-6 pb-16">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#94a0b8' }}>INVESTMENT</p>
        <div
          className="font-bold mb-1"
          style={{ fontSize: 'clamp(52px, 8vw, 72px)', color: 'var(--dark)', letterSpacing: '-0.03em', lineHeight: 1 }}
        >
          {bigNumber}
        </div>
        {tikCents > 0 && (
          <p className="text-sm mb-1" style={{ color: 'var(--slate)' }}>
            cash project total (after {formatCents(tikCents)} trade-in-kind credit)
          </p>
        )}
        {hasRecurring && (
          <p className="text-sm mb-4" style={{ color: 'var(--teal)' }}>
            + recurring services as scheduled below
          </p>
        )}

        {/* Breakdown card — full section width to match phases / scope */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mt-8 mb-4">
          <table className="w-full border-collapse">
            <tbody>
              {usePhases && totals.oneTime > 0 && (
                <tr>
                  <td className="py-2.5 border-b border-slate-100 text-sm" style={{ color: 'var(--slate)' }}>One-time project total</td>
                  <td className="py-2.5 border-b border-slate-100 text-right text-sm tabular-nums font-medium" style={{ color: 'var(--dark)' }}>{formatCents(totals.oneTime)}</td>
                </tr>
              )}
              {totals.monthly > 0 && (
                <tr>
                  <td className="py-2.5 border-b border-slate-100 text-sm" style={{ color: 'var(--slate)' }}>Monthly recurring</td>
                  <td className="py-2.5 border-b border-slate-100 text-right text-sm tabular-nums font-medium" style={{ color: 'var(--teal)' }}>{formatCents(totals.monthly)}<span className="text-[11px] font-normal" style={{ color: '#94a0b8' }}>/mo</span></td>
                </tr>
              )}
              {totals.quarterly > 0 && (
                <tr>
                  <td className="py-2.5 border-b border-slate-100 text-sm" style={{ color: 'var(--slate)' }}>Quarterly recurring</td>
                  <td className="py-2.5 border-b border-slate-100 text-right text-sm tabular-nums font-medium" style={{ color: 'var(--teal)' }}>{formatCents(totals.quarterly)}<span className="text-[11px] font-normal" style={{ color: '#94a0b8' }}>/qtr</span></td>
                </tr>
              )}
              {totals.annual > 0 && (
                <tr>
                  <td className="py-2.5 border-b border-slate-100 text-sm" style={{ color: 'var(--slate)' }}>Annual recurring</td>
                  <td className="py-2.5 border-b border-slate-100 text-right text-sm tabular-nums font-medium" style={{ color: 'var(--teal)' }}>{formatCents(totals.annual)}<span className="text-[11px] font-normal" style={{ color: '#94a0b8' }}>/yr</span></td>
                </tr>
              )}
              {discountCents > 0 && (
                <tr>
                  <td className="py-2.5 border-b border-slate-100 text-sm" style={{ color: 'var(--slate)' }}>
                    {sow.discount_description?.trim() || 'Discount'}
                    {sow.discount_kind === 'percent' && (
                      <span className="text-[11px] ml-1" style={{ color: '#94a0b8' }}>
                        ({((sow.discount_value_bps ?? 0) / 100).toFixed((sow.discount_value_bps ?? 0) % 100 === 0 ? 0 : 2)}%)
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 border-b border-slate-100 text-right text-sm tabular-nums font-medium" style={{ color: 'var(--orange)' }}>−{formatCents(discountCents)}</td>
                </tr>
              )}
              {tikCents > 0 && (
                <tr>
                  <td className="py-2.5 border-b border-slate-100 text-sm" style={{ color: 'var(--slate)' }}>
                    Trade-in-Kind credit
                    {sow.trade_credit_description && (
                      <div className="text-[11px] mt-0.5" style={{ color: '#94a0b8' }}>{sow.trade_credit_description}</div>
                    )}
                  </td>
                  <td className="py-2.5 border-b border-slate-100 text-right text-sm tabular-nums font-medium" style={{ color: 'var(--orange)' }}>−{formatCents(tikCents)}</td>
                </tr>
              )}
              {hasReductions && (
                <tr>
                  <td className="py-2.5 border-b-2 border-slate-200 text-sm font-semibold" style={{ color: 'var(--dark)' }}>Cash project total</td>
                  <td className="py-2.5 border-b-2 border-slate-200 text-right text-sm tabular-nums font-semibold" style={{ color: 'var(--dark)' }}>{formatCents(cashOneTime)}</td>
                </tr>
              )}
              {(totals.oneTime > 0 || sow.pricing.deposit_cents > 0) && (
                <>
                  <tr>
                    <td className="py-2.5 border-b border-slate-100 text-sm" style={{ color: 'var(--slate)' }}>Deposit ({depositPct}%)</td>
                    <td className="py-2.5 border-b border-slate-100 text-right text-sm tabular-nums font-medium" style={{ color: 'var(--dark)' }}>{formatCents(depositCents)}</td>
                  </tr>
                  <tr>
                    <td className="pt-3 text-sm font-bold" style={{ color: 'var(--dark)' }}>Balance on delivery</td>
                    <td className="pt-3 text-right text-sm tabular-nums font-bold" style={{ color: 'var(--dark)' }}>{formatCents(balanceCents)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {hasRecurring && (
          <p className="text-xs mb-2" style={{ color: '#94a0b8' }}>
            Recurring charges begin per deliverable start trigger.
          </p>
        )}

        {/* Orange accent rule */}
        <div className="my-10" style={{ height: 1, background: 'rgba(255,107,43,0.25)' }} />

        {/* Terms / Guarantees / Notes */}
        {sow.payment_terms && <InfoCard title="PAYMENT TERMS" body={sow.payment_terms} accentColor="#68c5ad" />}
        {sow.guarantees    && <InfoCard title="GUARANTEES"    body={sow.guarantees}    accentColor="#4fa894" />}
        {sow.notes         && <InfoCard title="NOTES"         body={sow.notes}         accentColor="#f28500" />}
      </section>

      {/* ── 5. Accept section ───────────────────────────────────── */}
      <section style={{ background: 'var(--teal-dark, #4fa894)', backgroundImage: 'radial-gradient(circle at 0% 100%, rgba(255,255,255,0.18), transparent 55%), radial-gradient(circle at 100% 0%, rgba(0,0,0,0.18), transparent 50%)' }}>
        <div className="max-w-[860px] mx-auto px-6 py-20 text-center">
          {isAccepted && sow.accepted_signature ? (
            <>
              <div
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full font-bold text-base mb-6"
                style={{
                  background: '#1d2330',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.6)',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.25)',
                }}
              >
                <span style={{ color: '#22c55e' }} className="text-xl">✓</span>
                Accepted on{' '}
                {sow.accepted_at && new Date(sow.accepted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                {' '}by <span style={{ color: '#86efac' }} className="ml-1">{sow.accepted_signature}</span>
              </div>
              <p className="text-sm mb-8 font-medium" style={{ color: 'rgba(255,255,255,0.95)' }}>
                {deposit_invoice_email?.sent
                  ? 'This Statement of Work has been signed. A deposit invoice has been sent.'
                  : deposit_invoice_email?.latest_event === 'bounced' || deposit_invoice_email?.latest_event === 'complained' || deposit_invoice_email?.latest_event === 'failed'
                  ? 'This Statement of Work has been signed. The deposit invoice email could not be delivered — we will follow up directly.'
                  : 'This Statement of Work has been signed. Your deposit invoice is ready below.'}
              </p>
              <a
                href={downloadUrl}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-colors"
                style={{
                  color: '#ffffff',
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid rgba(255,255,255,0.6)',
                }}
              >
                ↓ Download PDF
              </a>
            </>
          ) : isVoid ? (
            <p className="text-white text-lg font-semibold">This SOW has been voided.</p>
          ) : (
            <>
              <h2
                className="font-bold text-white mb-3"
                style={{ fontSize: 'clamp(24px, 4vw, 36px)', letterSpacing: '-0.02em' }}
              >
                Accept this Statement of Work
              </h2>
              <p className="text-sm mb-10 max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.85)' }}>
                By accepting, you authorize Demand Signals to invoice per the terms above.
                Your typed name constitutes electronic consent.
              </p>
              <SowAcceptClient
                sowNumber={number}
                publicUuid={uuid}
                depositCents={depositCents}
                downloadUrl={downloadUrl}
                isOpen={isOpen}
              />
            </>
          )}
        </div>
      </section>

      {/* Footer Van Gogh closer removed — the marketing site's standard
          Footer already renders below via the root layout, and the SOW's
          dark hero already shows brand contact + magic-link context. The
          duplicate closer was redundant. */}
    </div>
  )
}

export const metadata = {
  robots: 'noindex, nofollow',
  // Strip the path (which contains the UUID secret) from any outgoing Referer.
  // Without this, clicking ANY same-origin link from this page would leak the
  // UUID into the destination's request log. Site-wide policy is
  // strict-origin-when-cross-origin which is too lax for magic-link pages.
  referrer: 'no-referrer',
}
