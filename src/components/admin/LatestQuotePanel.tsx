'use client'

import { ExternalLink, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface QuoteSnapshot {
  id: string
  doc_number: string | null
  status: string
  share_token: string
  estimate_low: number | null
  estimate_high: number | null
  monthly_low: number | null
  monthly_high: number | null
  scope_summary: string | null
  missed_leads_monthly: number | null
  avg_customer_value: number | null
  business_type: string | null
  person_role: string | null
  build_path: string | null
  research_findings: unknown
  created_at: string
}

interface Props {
  quote: QuoteSnapshot
}

function formatCents(cents: number | null): string {
  if (cents == null) return '—'
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}

export function LatestQuotePanel({ quote }: Props) {
  const findings = quote.research_findings as
    | { place?: { rating?: number; user_rating_count?: number }; site_scan?: { error?: string | null } | null; observations?: string[]; suggested_adds?: string[] }
    | null

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-900">Latest Quote</h2>
            {quote.doc_number && (
              <span className="font-mono text-xs text-slate-500">{quote.doc_number}</span>
            )}
            <span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full">{quote.status}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Started {new Date(quote.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/quotes/${quote.id}`}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-xs font-medium"
          >
            <ExternalLink className="w-3 h-3 inline mr-1" />
            View transcript
          </Link>
          <button
            onClick={async () => {
              const res = await fetch(`/api/admin/quotes/${quote.id}/continue-to-sow`, { method: 'POST' })
              const data = await res.json()
              if (res.ok) window.location.href = `/admin/sow/${data.sow_id}`
              else alert(data.error ?? 'Failed to create SOW')
            }}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium"
          >
            <ArrowRight className="w-3 h-3 inline mr-1" />
            Continue to SOW
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <div className="text-xs text-slate-500">Build estimate</div>
          <div className="font-semibold">{formatCents(quote.estimate_low)} – {formatCents(quote.estimate_high)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Monthly</div>
          <div className="font-semibold">
            {quote.monthly_high ? `${formatCents(quote.monthly_low)}–${formatCents(quote.monthly_high)}/mo` : '—'}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Persona</div>
          <div className="text-xs">{[quote.person_role, quote.business_type].filter(Boolean).join(' · ') || '—'}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Build path</div>
          <div className="text-xs">{quote.build_path ?? '—'}</div>
        </div>
      </div>

      {quote.scope_summary && (
        <div>
          <div className="text-xs text-slate-500 mb-1">Scope</div>
          <p className="text-sm text-slate-800">{quote.scope_summary}</p>
        </div>
      )}

      {quote.missed_leads_monthly != null && quote.avg_customer_value != null && (
        <div>
          <div className="text-xs text-slate-500 mb-1">ROI input</div>
          <p className="text-sm text-slate-800">
            {quote.missed_leads_monthly} leads/mo × {formatCents(quote.avg_customer_value)} avg
          </p>
        </div>
      )}

      {findings?.place && (
        <div>
          <div className="text-xs text-slate-500 mb-1">AI research highlights</div>
          <ul className="text-xs text-slate-700 space-y-0.5">
            {findings.place.rating != null && (
              <li>· Google: {findings.place.rating.toFixed(1)}★ ({findings.place.user_rating_count ?? 0})</li>
            )}
            {findings.observations?.slice(0, 2).map((o, i) => <li key={i}>· {o}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
