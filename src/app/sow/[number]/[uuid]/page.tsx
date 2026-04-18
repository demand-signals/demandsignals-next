// ── Public SOW viewer: /sow/[number]/[uuid] ─────────────────────────
// Server-rendered shell + small client component for Accept flow.

import { notFound } from 'next/navigation'
import { Download } from 'lucide-react'
import { SowAcceptClient } from './SowAcceptClient'

interface Deliverable {
  name: string
  description: string
  acceptance_criteria?: string
}
interface TimelinePhase {
  name: string
  duration_weeks: number
  description: string
}
interface Pricing {
  total_cents: number
  deposit_cents: number
  deposit_pct: number
}

interface SowResponse {
  sow: {
    id: string
    sow_number: string
    public_uuid: string
    status: string
    title: string
    scope_summary: string | null
    deliverables: Deliverable[]
    timeline: TimelinePhase[]
    pricing: Pricing
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
}

function formatCents(c: number): string {
  return `$${(c / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

async function fetchSow(number: string, uuid: string): Promise<SowResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://demandsignals.co'
  const res = await fetch(`${baseUrl}/api/sow/public/${number}?key=${uuid}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export default async function PublicSowPage({
  params,
}: {
  params: Promise<{ number: string; uuid: string }>
}) {
  const { number, uuid } = await params
  const data = await fetchSow(number, uuid)
  if (!data) notFound()

  const { sow } = data
  const isAccepted = sow.status === 'accepted'
  const isVoid = sow.status === 'void'
  const isOpen = !isAccepted && !isVoid && ['sent', 'viewed'].includes(sow.status)
  const downloadUrl = `/api/sow/public/${number}/pdf?key=${uuid}`

  const total = sow.pricing.total_cents
  const deposit = sow.pricing.deposit_cents
  const remaining = total - deposit

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-10">
        {isVoid && (
          <div className="bg-red-50 border border-red-200 text-red-900 rounded p-4 mb-6">
            <div className="font-bold">VOIDED</div>
            {sow.void_reason && <div className="text-sm mt-1">{sow.void_reason}</div>}
          </div>
        )}

        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="text-2xl font-bold text-slate-900">DEMAND SIGNALS</div>
            <div className="text-xs text-slate-500 mt-1">
              Statement of Work · {sow.sow_number}
            </div>
          </div>
          <div className="text-right">
            {isAccepted && (
              <div className="inline-block bg-emerald-100 text-emerald-800 rounded-full px-3 py-1 text-xs font-bold">
                ACCEPTED ✓
              </div>
            )}
            {!isAccepted && !isVoid && (
              <div className="inline-block bg-teal-100 text-teal-800 rounded-full px-3 py-1 text-xs font-bold">
                PROPOSAL
              </div>
            )}
          </div>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">{sow.title}</h1>
        {sow.prospect?.business_name && (
          <div className="text-slate-600 mb-8">
            Prepared for <span className="font-semibold">{sow.prospect.business_name}</span>
            {sow.sent_at && (
              <span className="text-slate-400">
                {' '}
                · {new Date(sow.sent_at).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        {sow.scope_summary && (
          <div className="bg-slate-50 border-l-4 border-teal-500 rounded p-4 mb-8">
            <div className="text-xs uppercase text-slate-500 mb-1">Scope</div>
            <p className="text-sm text-slate-800 leading-relaxed">{sow.scope_summary}</p>
          </div>
        )}

        {sow.deliverables && sow.deliverables.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Deliverables</h2>
            <div className="space-y-3">
              {sow.deliverables.map((d, i) => (
                <div key={i} className="border-l-2 border-slate-200 pl-4">
                  <div className="font-semibold text-sm">{d.name}</div>
                  <div className="text-sm text-slate-600 mt-1">{d.description}</div>
                  {d.acceptance_criteria && (
                    <div className="text-xs text-slate-500 mt-2">
                      <span className="font-semibold">Accepted when:</span> {d.acceptance_criteria}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {sow.timeline && sow.timeline.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Timeline</h2>
            <div className="space-y-2">
              {sow.timeline.map((phase, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="text-xs font-mono text-teal-600 shrink-0 w-20 pt-1">
                    {phase.duration_weeks}w
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{phase.name}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{phase.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-slate-900 text-white rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Investment</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total Project Investment</span>
              <span className="font-bold">{formatCents(total)}</span>
            </div>
            <div className="flex justify-between text-teal-300">
              <span>Deposit on Acceptance ({sow.pricing.deposit_pct}%)</span>
              <span className="font-bold">{formatCents(deposit)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Balance on Delivery</span>
              <span className="font-bold">{formatCents(remaining)}</span>
            </div>
          </div>
        </section>

        {sow.payment_terms && (
          <div className="bg-teal-50 border-l-4 border-teal-500 rounded p-4 mb-4">
            <div className="text-xs uppercase text-teal-900 mb-1 font-semibold">
              Payment Terms
            </div>
            <div className="text-sm text-teal-900">{sow.payment_terms}</div>
          </div>
        )}

        {sow.guarantees && (
          <div className="bg-orange-50 border-l-4 border-orange-500 rounded p-4 mb-8">
            <div className="text-xs uppercase text-orange-900 mb-1 font-semibold">
              Our Guarantee
            </div>
            <div className="text-sm text-orange-900">{sow.guarantees}</div>
          </div>
        )}

        {sow.notes && (
          <div className="text-xs text-slate-500 mb-8 italic">{sow.notes}</div>
        )}

        {isAccepted && sow.accepted_signature && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6">
            <div className="text-xs uppercase text-emerald-900 font-semibold mb-2">
              Accepted
            </div>
            <div className="text-sm">
              Signed by{' '}
              <span className="font-bold">{sow.accepted_signature}</span>
              {sow.accepted_at && (
                <> on {new Date(sow.accepted_at).toLocaleDateString()}</>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-end items-center">
          <a
            href={downloadUrl}
            className="inline-flex items-center gap-2 bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-slate-700"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </a>
          {isOpen && (
            <SowAcceptClient sowNumber={number} publicUuid={uuid} depositCents={deposit} />
          )}
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
          Questions? Email{' '}
          <a href="mailto:DemandSignals@gmail.com" className="text-teal-600">
            DemandSignals@gmail.com
          </a>{' '}
          or call (916) 542-2423.
        </div>
      </div>
    </div>
  )
}

export const metadata = {
  robots: 'noindex, nofollow',
}
