// ── Public budgetary-estimate share page: /quote/s/[token] ───────────
// Premium proposal microsite — matches SOW/Invoice visual language.
// Server-rendered shell + client component for interactive CTAs.

import { notFound } from 'next/navigation'
import { getSessionByShareToken } from '@/lib/quote-session'
import { getServiceSync as getItem, hydrateCatalogSnapshot } from '@/lib/services-catalog-sync'
import { calculateTotals, monthlyPlan, type SelectedItem } from '@/lib/quote-engine'
import { formatCents, formatRange } from '@/lib/format'
import { buildMetadata } from '@/lib/metadata'
import { ShareActions } from './ShareActions'

export const metadata = buildMetadata({
  title: 'Your Budgetary Estimate — Demand Signals',
  description: 'A premium budgetary estimate from Demand Signals — your demand generation roadmap, priced and ready to refine.',
  path: '/quote/s',
  noIndex: true,
})

interface Props {
  params: Promise<{ token: string }>
  searchParams: Promise<{ e?: string }>
}

// ── Category labels ──────────────────────────────────────────────────

const CATEGORY_LABEL: Record<string, string> = {
  'your-website':          'Website',
  'existing-site':         'Existing Site',
  'features-integrations': 'Features',
  'get-found':             'Discovery',
  'content-social':        'Content & Social',
  'ai-automation':         'AI & Automation',
  'monthly-services':      'Monthly',
  'hosting':               'Hosting',
  'research-strategy':     'Strategy',
  'team-rates':            'Team',
}

const CATEGORY_ORDER: Record<string, number> = {
  'your-website':          10,
  'existing-site':         10,
  'features-integrations': 20,
  'get-found':             30,
  'content-social':        40,
  'ai-automation':         50,
  'monthly-services':      60,
  'hosting':               70,
  'research-strategy':     80,
  'team-rates':            90,
}

// ── Item card ────────────────────────────────────────────────────────

interface EnrichedItem {
  id: string
  category: string
  name: string
  benefit: string
  aiBadge: string
  quantity: number
  quantityLabel: string | null
  isFree: boolean
  oneTimeLow: number
  oneTimeHigh: number
  monthlyLow: number
  monthlyHigh: number
}

function ItemCard({ item, showPricing }: { item: EnrichedItem; showPricing: boolean }) {
  const categoryLabel = CATEGORY_LABEL[item.category] ?? item.category

  const priceDisplay = (() => {
    if (!showPricing) return null
    if (item.isFree) return <span style={{ color: '#22c55e', fontWeight: 700 }}>Included</span>
    if (item.oneTimeLow || item.oneTimeHigh)
      return <>{formatRange(item.oneTimeLow, item.oneTimeHigh)}</>
    if (item.monthlyLow || item.monthlyHigh)
      return <>{formatRange(item.monthlyLow, item.monthlyHigh)}<span className="text-xs font-normal" style={{ color: '#94a0b8' }}>/mo</span></>
    return <span style={{ color: '#94a0b8' }}>—</span>
  })()

  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5 flex items-start gap-5"
    >
      {/* Left: name + benefit */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h3 className="text-sm font-bold text-slate-900">
            {item.name}
            {item.quantity > 1 && item.quantityLabel && (
              <span className="font-normal text-slate-400"> × {item.quantity} {item.quantityLabel}</span>
            )}
          </h3>
          {categoryLabel && (
            <span
              className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
              style={{ background: 'rgba(104,197,173,0.12)', color: '#68c5ad' }}
            >
              {categoryLabel}
            </span>
          )}
          {item.aiBadge && (
            <span
              className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
              style={{ background: 'rgba(242,133,0,0.12)', color: '#f28500' }}
            >
              {item.aiBadge}
            </span>
          )}
        </div>
        {item.benefit && (
          <p className="text-xs italic leading-relaxed" style={{ color: '#5d6780' }}>
            {item.benefit}
          </p>
        )}
      </div>

      {/* Right: price */}
      {showPricing && (
        <div className="text-sm font-semibold tabular-nums whitespace-nowrap text-right text-slate-800 flex-shrink-0">
          {priceDisplay}
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────

export default async function SharedEstimatePage({ params, searchParams }: Props) {
  const { token } = await params
  const { e: emailSendId } = await searchParams
  const session = await getSessionByShareToken(token)
  if (!session) notFound()

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
      page_url: `/quote/s/${token}`,
      page_type: 'quote',
      quote_session_id: session.id,
      attributed_prospect_id: session.prospect_id ?? undefined,
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
    console.error('[quote page] tracking failed:', e instanceof Error ? e.message : e)
  }

  const selections = (Array.isArray(session.selected_items) ? session.selected_items : []) as SelectedItem[]

  // Hydrate DB-backed catalog snapshot so sync getItem lookups hit fresh data.
  await hydrateCatalogSnapshot()

  const totals = calculateTotals(selections)
  const plan = monthlyPlan(totals)

  const items: EnrichedItem[] = selections
    .map((sel) => {
      const item = getItem(sel.id)
      return {
        id: sel.id,
        category: item?.category ?? '',
        name: item?.name ?? sel.id,
        benefit: item?.benefit ?? '',
        aiBadge: item?.aiBadge ?? '',
        quantity: sel.quantity,
        quantityLabel: item?.quantityLabel ?? null,
        isFree: item?.isFree ?? false,
        oneTimeLow: 0,
        oneTimeHigh: 0,
        monthlyLow: 0,
        monthlyHigh: 0,
      }
    })
    .sort((a, b) => (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99))

  // Prices shown only when the session is phone-verified — same gate as live estimator.
  if (session.phone_verified) {
    for (const item of items) {
      const match = totals.perItem.find((p) => p.id === item.id)
      if (match) {
        item.oneTimeLow = match.oneTimeLow
        item.oneTimeHigh = match.oneTimeHigh
        item.monthlyLow = match.monthlyLow
        item.monthlyHigh = match.monthlyHigh
      }
    }
  }

  const showPricing = session.phone_verified
  const daysOld = (Date.now() - new Date(session.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  const stale = daysOld > 60

  const businessName = session.business_name ?? 'Custom Demand Plan'
  const issueDate = new Date(session.updated_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  const hasMonthly = totals.monthlyHigh > 0 || (session.monthly_high ?? 0) > 0
  const estLow = session.estimate_low ?? totals.upfrontLow
  const estHigh = session.estimate_high ?? totals.upfrontHigh
  const moLow  = session.monthly_low  ?? totals.monthlyLow
  const moHigh = session.monthly_high ?? totals.monthlyHigh
  const twLow  = session.timeline_weeks_low  ?? totals.timelineWeeksLow
  const twHigh = session.timeline_weeks_high ?? totals.timelineWeeksHigh

  return (
    <div
      className="min-h-screen"
      style={{ background: '#fafbfc', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >

      {/* ── 1. Hero section ───────────────────────────────────────── */}
      <section
        style={{
          background: 'var(--dark, #1d2330)',
          backgroundImage: 'radial-gradient(circle at 110% -10%, rgba(104,197,173,0.28), transparent 50%)',
        }}
      >
        {/* Top bar: logo + badge */}
        <div className="max-w-[920px] mx-auto px-6 pt-10 pb-0 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://demandsignals.us/assets/logos/dsig_logo_v2b.png"
            alt="Demand Signals"
            className="h-9 object-contain"
            style={{}}
          />
          <span
            className="inline-block px-4 py-1 rounded-full text-xs font-bold text-white"
            style={{ background: '#FF6B2B' }}
          >
            BUDGETARY ESTIMATE
          </span>
        </div>

        {/* Staleness banner */}
        {stale && (
          <div className="max-w-[920px] mx-auto px-6 mt-6">
            <div className="bg-amber-900/30 border border-amber-500/40 rounded-lg px-5 py-3 text-amber-200 text-sm">
              This estimate is more than 60 days old — pricing and scope may have shifted. Book a call to get a fresh look.
            </div>
          </div>
        )}

        {/* Main hero content */}
        <div className="max-w-[920px] mx-auto px-6 pt-14 pb-10">
          <p
            className="text-xs font-bold uppercase mb-5"
            style={{ letterSpacing: '0.4em', color: 'var(--teal, #68c5ad)', opacity: 0.85 }}
          >
            BUDGETARY ESTIMATE
          </p>
          <h1
            className="font-bold text-white mb-4 leading-tight"
            style={{ fontSize: 'clamp(32px, 5vw, 52px)', letterSpacing: '-0.02em' }}
          >
            {businessName}
          </h1>
          {session.doc_number && (
            <p className="text-xl font-mono mb-4" style={{ color: 'var(--teal, #68c5ad)' }}>
              {session.doc_number}
            </p>
          )}
          {/* Orange rule */}
          <div className="mb-6" style={{ width: 64, height: 3, background: '#FF6B2B' }} />
          <p className="text-sm italic" style={{ color: '#94a0b8' }}>
            Your demand generation roadmap — priced, scoped, ready to refine.
          </p>
        </div>

        {/* Three-column summary strip */}
        <div style={{ background: 'var(--dark-2, #252c3d)' }}>
          <div className="max-w-[920px] mx-auto px-6">
            <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-white/10">
              <div className="flex-1 py-6 sm:pr-8">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#94a0b8' }}>
                  {showPricing ? 'INVESTMENT RANGE' : 'SERVICES SELECTED'}
                </p>
                {showPricing ? (
                  <p className="text-lg font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
                    {formatRange(estLow, estHigh)}
                    <span className="text-xs font-normal ml-1" style={{ color: '#94a0b8' }}>one-time</span>
                  </p>
                ) : (
                  <p className="text-lg font-bold text-white">{items.length} items</p>
                )}
              </div>
              <div className="flex-1 py-6 sm:px-8">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#94a0b8' }}>
                  {showPricing && hasMonthly ? 'MONTHLY' : 'PREPARED'}
                </p>
                {showPricing && hasMonthly ? (
                  <p className="text-lg font-bold" style={{ color: 'var(--teal, #68c5ad)', letterSpacing: '-0.02em' }}>
                    {formatRange(moLow, moHigh)}
                    <span className="text-xs font-normal ml-0.5" style={{ color: '#94a0b8' }}>/mo</span>
                  </p>
                ) : (
                  <p className="text-base font-bold text-white">{issueDate}</p>
                )}
              </div>
              <div className="flex-1 py-6 sm:pl-8">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#94a0b8' }}>TIMELINE</p>
                <p className="text-lg font-bold text-white">
                  {twLow && twHigh ? `${twLow}–${twHigh} weeks` : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Selected items section ────────────────────────────────── */}
      <section className="max-w-[860px] mx-auto px-6 pt-20 pb-4">
        {/* Gradient accent bar */}
        <div
          className="w-full mb-10 rounded-full"
          style={{ height: 4, background: 'linear-gradient(90deg, #FF6B2B, #68c5ad)' }}
        />
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#94a0b8' }}>
          SELECTED SERVICES
        </p>
        <div className="mb-3" style={{ width: 36, height: 3, background: '#FF6B2B' }} />
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark, #1d2330)', letterSpacing: '-0.02em' }}>
          What&rsquo;s in your plan
        </h2>
        <p className="text-sm mb-8 max-w-lg" style={{ color: '#5d6780' }}>
          {items.length === 0
            ? 'No services selected yet — resume the conversation to build your plan.'
            : showPricing
              ? 'Budgetary ranges shown. Final pricing confirmed in your Statement of Work.'
              : 'Pricing details unlock after phone verification in the live conversation.'}
        </p>

        {items.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No items selected yet.</div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} showPricing={showPricing} />
            ))}
          </div>
        )}
      </section>

      {/* ── 3. Investment summary (phone-verified only) ───────────────── */}
      {showPricing && (estHigh > 0 || moHigh > 0) && (
        <section className="max-w-[860px] mx-auto px-6 pt-16 pb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#94a0b8' }}>
            INVESTMENT SUMMARY
          </p>
          <div
            className="font-bold mb-1"
            style={{ fontSize: 'clamp(44px, 7vw, 64px)', color: 'var(--dark, #1d2330)', letterSpacing: '-0.03em', lineHeight: 1 }}
          >
            {formatRange(estLow, estHigh)}
          </div>
          {hasMonthly && (
            <p className="text-base mt-2 mb-4" style={{ color: 'var(--teal, #68c5ad)' }}>
              + {formatRange(moLow, moHigh)}/mo ongoing
            </p>
          )}

          {/* Breakdown card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 max-w-md mt-8 mb-4">
            <table className="w-full border-collapse">
              <tbody>
                {estHigh > 0 && (
                  <tr>
                    <td className="py-2.5 border-b border-slate-100 text-sm" style={{ color: '#5d6780' }}>One-time build range</td>
                    <td className="py-2.5 border-b border-slate-100 text-right text-sm tabular-nums font-medium" style={{ color: 'var(--dark, #1d2330)' }}>
                      {formatRange(estLow, estHigh)}
                    </td>
                  </tr>
                )}
                {hasMonthly && (
                  <tr>
                    <td className="py-2.5 border-b border-slate-100 text-sm" style={{ color: '#5d6780' }}>Monthly services range</td>
                    <td className="py-2.5 border-b border-slate-100 text-right text-sm tabular-nums font-medium" style={{ color: 'var(--teal, #68c5ad)' }}>
                      {formatRange(moLow, moHigh)}<span className="text-[11px] font-normal" style={{ color: '#94a0b8' }}>/mo</span>
                    </td>
                  </tr>
                )}
                {plan.monthlyPaymentHigh > 0 && estHigh > 0 && (
                  <tr>
                    <td className="pt-3 text-sm" style={{ color: '#5d6780' }}>Or: monthly plan option</td>
                    <td className="pt-3 text-right text-sm tabular-nums font-medium" style={{ color: 'var(--dark, #1d2330)' }}>
                      {formatRange(plan.monthlyPaymentLow, plan.monthlyPaymentHigh)}<span className="text-[11px] font-normal" style={{ color: '#94a0b8' }}>/mo × 12</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs" style={{ color: '#94a0b8' }}>
            Budgetary ranges only — not a binding quote. Final scope and pricing confirmed in your Statement of Work.
          </p>
        </section>
      )}

      {/* ── 4. "How this was built" narrative ───────────────────────── */}
      <section className="max-w-[860px] mx-auto px-6 pt-16 pb-4">
        <div
          className="rounded-xl p-6"
          style={{
            background: 'rgba(104,197,173,0.06)',
            borderLeft: '3px solid #68c5ad',
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-3"
            style={{ color: '#68c5ad' }}
          >
            ABOUT THIS ESTIMATE
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--dark, #1d2330)' }}>
            This budget was shaped by your business profile, selected services, and market context. It&rsquo;s a starting point — your formal Statement of Work will refine pricing, scope, and delivery timelines to match what we agree upon together.
          </p>
        </div>
      </section>

      {/* Orange rule */}
      <div className="max-w-[860px] mx-auto px-6 mt-12 mb-0" style={{ height: 1, background: 'rgba(255,107,43,0.2)' }} />

      {/* ── 5. Next-steps CTA ────────────────────────────────────────── */}
      {/* ShareActions handles Book + Resume + Text + Email — pure client interactivity */}
      <section className="max-w-[860px] mx-auto px-6 pt-12 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#94a0b8' }}>
          NEXT STEPS
        </p>
        <div className="mb-3" style={{ width: 36, height: 3, background: '#FF6B2B' }} />
        <h2
          className="font-bold mb-2"
          style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', color: 'var(--dark, #1d2330)', letterSpacing: '-0.02em' }}
        >
          Ready to move forward?
        </h2>
        <p className="text-sm mb-8" style={{ color: '#5d6780' }}>
          Book a strategy call, pick up where you left off, or send yourself the full plan.
        </p>

        <ShareActions
          shareToken={token}
          businessName={businessName}
          phoneVerified={session.phone_verified}
        />
      </section>

      {/* ── 6. Footer / Van Gogh closer ──────────────────────────────── */}
      <footer
        className="mt-20"
        style={{ background: 'var(--dark, #1d2330)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="max-w-[860px] mx-auto px-6 py-16 text-center">
          <p
            className="text-lg italic mb-2 max-w-lg mx-auto leading-relaxed"
            style={{ color: 'var(--teal, #68c5ad)' }}
          >
            &ldquo;Great things are done by a series of small things brought together.&rdquo;
          </p>
          <p className="text-xs mb-12" style={{ color: '#94a0b8' }}>— Vincent Van Gogh</p>

          <h3 className="text-xl font-bold text-white mb-12" style={{ letterSpacing: '-0.02em' }}>
            Great demand generation starts with a great conversation.
          </h3>

          {/* Contact 3-col */}
          <div
            className="flex flex-col sm:flex-row pt-8 max-w-md mx-auto divide-y sm:divide-y-0 sm:divide-x divide-white/10"
            style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="flex-1 text-center py-4 sm:py-0 sm:px-6">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#94a0b8' }}>EMAIL</p>
              <a href="mailto:DemandSignals@gmail.com" className="text-sm text-white hover:underline">
                DemandSignals@gmail.com
              </a>
            </div>
            <div className="flex-1 text-center py-4 sm:py-0 sm:px-6">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#94a0b8' }}>PHONE</p>
              <a href="tel:+19165422423" className="text-sm text-white hover:underline">
                (916) 542-2423
              </a>
            </div>
            <div className="flex-1 text-center py-4 sm:py-0 sm:px-6">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#94a0b8' }}>WEB</p>
              <a href="https://demandsignals.co" target="_blank" rel="noreferrer" className="text-sm text-white hover:underline">
                demandsignals.co
              </a>
            </div>
          </div>

          <p className="mt-12 text-xs" style={{ color: '#94a0b8', opacity: 0.6 }}>
            AI-assisted estimates. Budgetary ranges only — not a binding quote. Final scope confirmed on your strategy call.
          </p>
          <p className="mt-3 text-xs" style={{ color: '#94a0b8', opacity: 0.4 }}>
            &copy; 2026 Demand Signals. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
