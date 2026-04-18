'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { Loader2, ExternalLink, Flag, CreditCard, ScrollText } from 'lucide-react'

interface QuoteDetail {
  session: {
    id: string
    share_token: string
    prospect_id: string | null
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
  prospect: {
    id: string
    business_name: string
    industry: string | null
    city: string | null
    state: string | null
    stage: string
    tags: string[]
    owner_email: string | null
    owner_phone: string | null
    business_phone: string | null
    website_url: string | null
    google_rating: number | null
    google_review_count: number | null
    site_quality_score: number | null
    scope_summary: string | null
    quote_estimate_low_cents: number | null
    quote_estimate_high_cents: number | null
    last_activity_at: string | null
    last_contacted_at: string | null
    created_at: string
  } | null
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
        <div className="flex gap-2 flex-wrap justify-end">
          <a
            href={`/quote/s/${session.share_token}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Shareable URL
          </a>
          {detail.prospect && (
            <Link
              href={`/admin/invoices/new?prospect_id=${detail.prospect.id}`}
              className="inline-flex items-center gap-1 px-3 py-2 bg-teal-100 hover:bg-teal-200 rounded-md text-sm text-teal-900"
            >
              <CreditCard className="w-4 h-4" />
              Create Invoice
            </Link>
          )}
          {detail.prospect && (
            <Link
              href={`/admin/sow/new?prospect_id=${detail.prospect.id}`}
              className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-sm"
            >
              <ScrollText className="w-4 h-4" />
              Create SOW
            </Link>
          )}
          {detail.prospect && session.phone_verified && session.email && (
            <button
              onClick={async () => {
                const res = await fetch('/api/admin/invoices/restaurant-rule-draft', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ quote_session_id: session.id }),
                })
                const data = await res.json()
                if (res.ok) window.location.href = `/admin/invoices/${data.invoice.id}`
                else alert(data.error ?? 'Failed')
              }}
              className="inline-flex items-center gap-1 px-3 py-2 bg-orange-100 hover:bg-orange-200 rounded-md text-sm text-orange-900"
            >
              🍽️ Restaurant Rule
            </button>
          )}
        </div>
      </div>

      {/* Linked prospect card — appears when a prospect record has been created/enriched.
          Makes the CRM→quote relationship visible at a glance. */}
      {detail.prospect && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  Linked Prospect
                </span>
                <span className="inline-block px-2 py-0.5 bg-white/60 rounded text-[10px] text-emerald-800 font-medium">
                  {detail.prospect.stage}
                </span>
                {detail.prospect.tags?.map((tag) => (
                  <span
                    key={tag}
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                      tag === 'walkaway-risk'
                        ? 'bg-red-100 text-red-800 ring-1 ring-red-200'
                        : 'bg-white/60 text-emerald-800'
                    }`}
                  >
                    {tag === 'walkaway-risk' ? '🚨 walkaway-risk' : tag}
                  </span>
                ))}
              </div>
              <Link
                href={`/admin/prospects/${detail.prospect.id}`}
                className="text-lg font-bold text-emerald-900 hover:underline"
              >
                {detail.prospect.business_name}
              </Link>
              <div className="text-xs text-emerald-700 mt-0.5">
                {detail.prospect.industry && <>{detail.prospect.industry} · </>}
                {detail.prospect.city && detail.prospect.state && (
                  <>{detail.prospect.city}, {detail.prospect.state}</>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs mt-3">
                {detail.prospect.google_rating != null && (
                  <div>
                    <span className="text-emerald-600">Google:</span>{' '}
                    <span className="font-medium">
                      {detail.prospect.google_rating.toFixed(1)}★ ({detail.prospect.google_review_count ?? 0})
                    </span>
                  </div>
                )}
                {detail.prospect.site_quality_score != null && (
                  <div>
                    <span className="text-emerald-600">Site score:</span>{' '}
                    <span className="font-medium">{detail.prospect.site_quality_score}/100</span>
                  </div>
                )}
                {detail.prospect.owner_phone && (
                  <div>
                    <span className="text-emerald-600">Phone:</span>{' '}
                    <span className="font-medium">{detail.prospect.owner_phone}</span>
                  </div>
                )}
                {detail.prospect.owner_email && (
                  <div className="truncate">
                    <span className="text-emerald-600">Email:</span>{' '}
                    <span className="font-medium">{detail.prospect.owner_email}</span>
                  </div>
                )}
                {detail.prospect.website_url && (
                  <div className="truncate col-span-2">
                    <span className="text-emerald-600">Site:</span>{' '}
                    <a
                      href={detail.prospect.website_url}
                      target="_blank"
                      rel="noopener"
                      className="font-medium text-emerald-800 hover:underline"
                    >
                      {detail.prospect.website_url.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>
              {detail.prospect.scope_summary && (
                <div className="text-xs text-emerald-700 mt-3">
                  <span className="text-emerald-600">Current scope:</span>{' '}
                  <span>{detail.prospect.scope_summary}</span>
                </div>
              )}
              {detail.prospect.quote_estimate_low_cents != null &&
                detail.prospect.quote_estimate_high_cents != null && (
                  <div className="text-xs text-emerald-700 mt-1">
                    <span className="text-emerald-600">Estimate:</span>{' '}
                    <span className="font-medium">
                      {formatRange(detail.prospect.quote_estimate_low_cents, detail.prospect.quote_estimate_high_cents)}
                    </span>
                  </div>
                )}
            </div>
            <Link
              href={`/admin/prospects/${detail.prospect.id}`}
              className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-3 py-1.5 text-xs font-medium"
            >
              Open Prospect →
            </Link>
          </div>
        </div>
      )}

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
