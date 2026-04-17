import { notFound } from 'next/navigation'
import { getSessionByShareToken } from '@/lib/quote-session'
import { getItem } from '@/lib/quote-pricing'
import { calculateTotals, monthlyPlan, type SelectedItem } from '@/lib/quote-engine'
import { buildMetadata } from '@/lib/metadata'

export const metadata = buildMetadata({
  title: 'Your Shared Estimate — Demand Signals',
  description: 'A shared budgetary estimate from Demand Signals.',
  path: '/quote/s',
  noIndex: true,
})

interface Props {
  params: Promise<{ token: string }>
}

function formatCents(cents: number): string {
  if (!cents) return '$0'
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}

function formatRange(low: number, high: number): string {
  if (low === high) return formatCents(low)
  return `${formatCents(low)}–${formatCents(high)}`
}

export default async function SharedEstimatePage({ params }: Props) {
  const { token } = await params
  const session = await getSessionByShareToken(token)
  if (!session) notFound()

  const selections = (Array.isArray(session.selected_items) ? session.selected_items : []) as SelectedItem[]
  const totals = calculateTotals(selections)
  const plan = monthlyPlan(totals)

  const items = selections.map((sel) => {
    const item = getItem(sel.id)
    return {
      id: sel.id,
      name: item?.name ?? sel.id,
      benefit: item?.benefit ?? '',
      aiBadge: item?.aiBadge ?? '',
      quantity: sel.quantity,
      quantityLabel: item?.quantityLabel ?? null,
      isFree: item?.isFree ?? false,
    }
  })

  // Sessions older than 60 days show a staleness banner.
  const daysOld = (Date.now() - new Date(session.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  const stale = daysOld > 60

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 text-white p-6">
            <div className="text-xs text-slate-300 uppercase tracking-wide">Budgetary Estimate</div>
            <h1 className="text-2xl font-bold mt-1">{session.business_name ?? 'Your Project'}</h1>
            <div className="text-xs text-slate-400 mt-2">
              Detail level: {session.accuracy_pct}% · Last updated {new Date(session.updated_at).toLocaleDateString()}
            </div>
          </div>

          {stale && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-sm text-amber-900">
              This estimate is more than 60 days old — pricing and availability may have changed.
            </div>
          )}

          <div className="p-6 space-y-4">
            {items.length === 0 ? (
              <div className="text-slate-400 text-sm text-center py-8">No items selected yet.</div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="border-b border-slate-100 pb-3 last:border-0">
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">
                        {item.name}
                        {item.quantity > 1 && item.quantityLabel && (
                          <span className="text-slate-400 font-normal"> × {item.quantity} {item.quantityLabel}</span>
                        )}
                        {item.isFree && (
                          <span className="ml-2 text-xs text-emerald-600 font-semibold">FREE</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 mt-0.5">{item.benefit}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {session.phone_verified && (
            <div className="bg-slate-50 border-t border-slate-200 p-6">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs text-slate-500">Build total</div>
                  <div className="text-3xl font-bold text-slate-900">
                    {formatRange(totals.upfrontLow, totals.upfrontHigh)}
                  </div>
                  {totals.monthlyHigh > 0 && (
                    <div className="text-sm text-slate-600 mt-1">
                      + {formatRange(totals.monthlyLow, totals.monthlyHigh)}/mo ongoing
                    </div>
                  )}
                  <div className="text-xs text-slate-500 mt-1">
                    Timeline: {totals.timelineWeeksLow}-{totals.timelineWeeksHigh} weeks
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>Or monthly plan:</div>
                  <div className="text-lg font-bold text-slate-900">
                    {formatRange(plan.monthlyPaymentLow, plan.monthlyPaymentHigh)}/mo
                  </div>
                  <div>× 12 months</div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3yjIRXePILfG3aDwDq7N_ZdQIEOxi0HioY6NFF1vzE7PfH-xYXGVOW95ZNJ0BZj5d4-uUVJNPK?gv=true"
                  target="_blank"
                  rel="noopener"
                  className="bg-[var(--teal)] text-white rounded-lg py-3 font-semibold text-center"
                >
                  Book a Strategy Call
                </a>
                <a
                  href="/quote"
                  className="border border-slate-300 text-slate-700 rounded-lg py-3 font-medium text-center"
                >
                  Make Changes
                </a>
              </div>
            </div>
          )}

          <div className="px-6 pb-4 text-xs text-slate-400 text-center">
            Budgetary estimate — not a binding quote. Final scope, pricing, and timeline are confirmed in your Statement of Work.
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-slate-500">
          <a href="/" className="underline">Demand Signals</a> · Human-led strategy, AI-powered execution
        </div>
      </div>
    </div>
  )
}
