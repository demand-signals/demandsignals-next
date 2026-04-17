'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { Loader2, ExternalLink, Flag } from 'lucide-react'

interface QuoteDetail {
  session: {
    id: string
    share_token: string
    business_name: string | null
    business_type: string | null
    business_location: string | null
    phone_verified: boolean
    phone_last_four: string | null
    phone_is_voip: boolean | null
    email: string | null
    status: string
    conversion_action: string | null
    selected_items: Array<{ id: string; quantity: number }>
    estimate_low: number | null
    estimate_high: number | null
    monthly_low: number | null
    monthly_high: number | null
    timeline_weeks_low: number | null
    timeline_weeks_high: number | null
    accuracy_pct: number
    missed_leads_monthly: number | null
    avg_customer_value: number | null
    build_path: string | null
    handoff_offered: boolean
    total_cost_cents: number
    total_tokens_used: number
    referrer: string | null
    utm_source: string | null
    utm_medium: string | null
    utm_campaign: string | null
    device: string | null
    discovery_answers: Record<string, unknown>
    catalog_version: string | null
    created_at: string
    updated_at: string
  }
  messages: Array<{
    id: string
    role: string
    content: string
    channel: string
    flagged: boolean
    flag_reason: string | null
    ai_model_used: string | null
    cost_cents: number | null
    created_at: string
  }>
  events: Array<{
    id: string
    event_type: string
    event_data: Record<string, unknown>
    created_at: string
  }>
}

function formatCents(cents: number | null): string {
  if (!cents) return '$0'
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}
function formatRange(low: number | null, high: number | null): string {
  if (!low && !high) return '—'
  if (low === high) return formatCents(low)
  return `${formatCents(low)}–${formatCents(high)}`
}

export default function AdminQuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [detail, setDetail] = useState<QuoteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/quotes/${id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to load')
        if (!cancelled) setDetail(data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--teal)]" />
      </div>
    )
  }
  if (error || !detail) {
    return <div className="p-6 text-red-600">Error: {error ?? 'Not found'}</div>
  }

  const { session, messages, events } = detail

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/quotes" className="text-sm text-[var(--teal)]">
            ← All quotes
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            {session.business_name ?? '(anonymous session)'}
          </h1>
          {session.business_location && (
            <div className="text-sm text-slate-500">{session.business_location}</div>
          )}
        </div>
        <div className="flex gap-2">
          <a
            href={`/quote/s/${session.share_token}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Shareable URL
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ───── Left: prospect profile + stats ───── */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="font-semibold text-slate-900">Prospect</h2>
          <dl className="text-sm space-y-2">
            <div>
              <dt className="text-xs text-slate-500">Status</dt>
              <dd className="font-medium">{session.status}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Phone</dt>
              <dd>
                {session.phone_verified ? (
                  <>
                    ···{session.phone_last_four}
                    {session.phone_is_voip && (
                      <span className="ml-2 text-xs text-amber-600">VOIP</span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-400">not verified</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Business type</dt>
              <dd>{session.business_type ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Build path</dt>
              <dd>{session.build_path ?? '—'}</dd>
            </div>
            {session.missed_leads_monthly && session.avg_customer_value && (
              <div>
                <dt className="text-xs text-slate-500">ROI inputs</dt>
                <dd>
                  {session.missed_leads_monthly} leads/mo × {formatCents(session.avg_customer_value)}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-slate-500">Source</dt>
              <dd className="text-xs">
                {session.device} · {session.utm_source ?? session.referrer ?? 'direct'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">AI cost</dt>
              <dd>
                {formatCents(session.total_cost_cents)} · {session.total_tokens_used.toLocaleString()} tokens
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Catalog version</dt>
              <dd className="text-xs font-mono">{session.catalog_version ?? '—'}</dd>
            </div>
          </dl>
        </div>

        {/* ───── Middle: transcript ───── */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Transcript ({messages.length})</h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-[var(--teal)] text-white'
                      : m.role === 'ai'
                        ? 'bg-slate-100 text-slate-800'
                        : 'bg-amber-50 text-amber-900 text-xs'
                  }`}
                >
                  {m.flagged && (
                    <div className="flex items-center gap-1 text-[10px] text-red-600 mb-1">
                      <Flag className="w-3 h-3" /> flagged: {m.flag_reason}
                    </div>
                  )}
                  <div>{m.content}</div>
                  <div className="text-[10px] opacity-60 mt-1">
                    {new Date(m.created_at).toLocaleString()}
                    {m.ai_model_used && ` · ${m.ai_model_used}`}
                    {m.cost_cents ? ` · ${formatCents(m.cost_cents)}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ───── Bottom: configurator snapshot ───── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">Configurator</h2>
          <div className="text-sm text-slate-600">
            {formatRange(session.estimate_low, session.estimate_high)}
            {session.monthly_high ? (
              <span className="ml-2">
                + {formatRange(session.monthly_low, session.monthly_high)}/mo
              </span>
            ) : null}
          </div>
        </div>
        <div className="text-xs text-slate-500 mb-3">
          Detail: {session.accuracy_pct}% · Timeline: {session.timeline_weeks_low}-{session.timeline_weeks_high} weeks
        </div>
        <ul className="text-sm space-y-1">
          {session.selected_items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span className="font-mono text-xs">{item.id}</span>
              <span className="text-slate-600">× {item.quantity}</span>
            </li>
          ))}
          {session.selected_items.length === 0 && (
            <li className="text-slate-400 text-sm">no items</li>
          )}
        </ul>
      </div>

      {/* ───── Event timeline ───── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Event timeline</h2>
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {events.map((e) => (
            <div key={e.id} className="text-xs text-slate-600 flex gap-3 border-b border-slate-50 py-1">
              <span className="text-slate-400 w-32 shrink-0">
                {new Date(e.created_at).toLocaleTimeString()}
              </span>
              <span className="font-mono font-medium text-slate-800 w-40 shrink-0">{e.event_type}</span>
              <span className="text-slate-500 truncate">
                {JSON.stringify(e.event_data).slice(0, 120)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
