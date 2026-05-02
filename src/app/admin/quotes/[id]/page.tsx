'use client'

import { useEffect, useState, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, ExternalLink, Flag, CreditCard, ScrollText, ArrowRight, Trash2, Pencil } from 'lucide-react'
import RetainerPanel from '@/components/admin/RetainerPanel'
import { EditQuotePanel } from './EditQuotePanel'

interface QuoteDetail {
  session: {
    id: string
    share_token: string
    prospect_id: string | null
    doc_number: string | null
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
    // retainer fields (present when a plan has been selected)
    selected_plan_id: string | null
    retainer_monthly_cents: number | null
    retainer_start_date: string | null
    retainer_activated_at: string | null
    retainer_cancelled_at: string | null
    retainer_subscription_id: string | null
    launched_at: string | null
  }
  retainerPlan: { name: string; tier: string } | null
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
  const router = useRouter()
  const [detail, setDetail] = useState<QuoteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [linkedSow, setLinkedSow] = useState<{ id: string; sow_number: string } | null | undefined>(undefined)
  const [continueLoading, setContinueLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const refetchQuote = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/quotes/${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setDetail(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }, [id])

  // Check if a SOW already exists for this quote session
  async function fetchLinkedSow(prospectId: string) {
    try {
      const res = await fetch(`/api/admin/sow?prospect_id=${prospectId}`)
      const data = await res.json()
      if (!res.ok) return
      // Find a SOW linked to this specific session
      const linked = (data.sows as Array<{ id: string; sow_number: string; quote_session_id?: string }>)
        ?.find((s) => s.quote_session_id === id) ?? null
      setLinkedSow(linked)
    } catch {
      setLinkedSow(null)
    }
  }

  async function handleDeleteQuote() {
    if (
      !confirm(
        'Delete this quote session? This also removes all its messages and events. The linked SOW (if any) is NOT deleted.',
      )
    )
      return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/admin/quotes/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Delete failed')
        return
      }
      router.push('/admin/quotes')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleContinueToSow() {
    setContinueLoading(true)
    try {
      const res = await fetch(`/api/admin/quotes/${id}/continue-to-sow`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Failed to create SOW')
        return
      }
      router.push(`/admin/sow/${data.sow_id}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create SOW')
    } finally {
      setContinueLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/quotes/${id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to load')
        if (!cancelled) {
          setDetail(data)
          // Check for an existing linked SOW if prospect is set
          if (data.session?.prospect_id) {
            fetchLinkedSow(data.session.prospect_id)
          } else {
            setLinkedSow(null)
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Status badge color (mirrors invoice/sow toolbar pattern)
  const statusBadge = (() => {
    switch (session.status) {
      case 'converted': return 'bg-emerald-100 text-emerald-700'
      case 'active':    return 'bg-blue-100 text-blue-700'
      case 'abandoned': return 'bg-slate-100 text-slate-600'
      case 'expired':   return 'bg-amber-100 text-amber-700'
      case 'blocked':   return 'bg-red-100 text-red-700'
      default:          return 'bg-slate-100 text-slate-600'
    }
  })()

  return (
    <div className="pb-24">
      {/* Sticky toolbar — mirrors invoice/sow/receipt detail pages */}
      <div
        className="sticky top-0 z-30 flex items-center gap-2 flex-wrap px-6 py-3 border-b border-slate-200 bg-white/95 backdrop-blur-sm"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      >
        <Link href="/admin/quotes" className="text-sm text-teal-600 mr-2">
          ← All quotes
        </Link>
        {session.doc_number && (
          <span className="text-xs font-mono text-slate-400 mr-2">{session.doc_number}</span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mr-2 ${statusBadge}`}>
          {session.status}
        </span>
        {linkedSow && (
          <span className="text-xs text-slate-400">→ {linkedSow.sow_number}</span>
        )}

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <a
            href={`/quote/s/${session.share_token}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-xs font-semibold transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Share URL
          </a>
          {detail.prospect && (
            <Link
              href={`/admin/invoices/new?prospect_id=${detail.prospect.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-100 hover:bg-teal-200 rounded-md text-xs font-semibold text-teal-900 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              New Invoice
            </Link>
          )}
          {detail.prospect && (
            linkedSow ? (
              <Link
                href={`/admin/sow/${linkedSow.id}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 rounded-md text-xs font-semibold text-indigo-900 transition-colors"
              >
                <ScrollText className="w-3.5 h-3.5" />
                {linkedSow.sow_number} →
              </Link>
            ) : (
              <button
                onClick={handleContinueToSow}
                disabled={continueLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold disabled:opacity-60"
              >
                {continueLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                Continue to SOW
              </button>
            )
          )}
          {detail.prospect && session.phone_verified && session.email && (
            <CourtesyDropdown sessionId={session.id} />
          )}
          <button
            onClick={() => setShowEdit(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition-colors"
            title="Edit quote details"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={handleDeleteQuote}
            disabled={deleteLoading}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-md text-xs font-semibold disabled:opacity-60 transition-colors"
            title="Delete this quote session"
          >
            {deleteLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Delete
          </button>
        </div>
      </div>

      {showEdit && (
        <EditQuotePanel
          session={session}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false)
            refetchQuote()
          }}
        />
      )}

      {/* Branded document card — long-format proposal chrome (mirrors SOW page) */}
      <div
        className="max-w-3xl mx-auto mt-8 mb-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      >
        {/* Cover-style dark header (mirrors SOW cover) */}
        <div
          className="relative px-10 py-10 overflow-hidden"
          style={{
            background: '#3D4566',
            color: '#ffffff',
            backgroundImage:
              'radial-gradient(circle at 92% 12%, rgba(82,201,160,0.22) 0%, rgba(82,201,160,0) 38%), radial-gradient(circle at 8% 88%, rgba(242,100,25,0.18) 0%, rgba(242,100,25,0) 42%)',
          }}
        >
          {/* Top gradient strip */}
          <div
            className="absolute top-0 left-0 right-0 h-[5px]"
            style={{ background: 'linear-gradient(90deg, #F26419 0%, #52C9A0 100%)' }}
          />

          {/* Logo + EST badge */}
          <div className="flex items-start justify-between mb-8 relative z-10">
            <div>
              <Image
                src="https://demandsignals.co/logo.png"
                alt="Demand Signals"
                width={160}
                height={50}
                className="h-10 w-auto object-contain"
                unoptimized
              />
              <div className="text-xs mt-1.5 opacity-80">demandsignals.co</div>
            </div>
            <div className="text-right">
              {session.doc_number ? (
                <div className="font-mono text-xs opacity-90 inline-block px-2 py-0.5 rounded bg-white/10 border border-white/20">
                  {session.doc_number}
                </div>
              ) : (
                <div className="text-[10px] italic opacity-60">EST number pending</div>
              )}
            </div>
          </div>

          {/* Cover body */}
          <div className="relative z-10 space-y-3">
            <p
              className="text-xs uppercase font-bold tracking-[0.2em]"
              style={{ color: '#F26419' }}
            >
              Budgetary Estimate
            </p>
            <h1 className="text-3xl font-bold" style={{ letterSpacing: '-0.01em' }}>
              {session.business_name ?? '(anonymous session)'}
            </h1>
            <div className="h-[2px] w-16" style={{ background: '#F26419' }} />
            {session.business_location && (
              <p className="text-sm opacity-85">{session.business_location}</p>
            )}
            {session.business_type && (
              <p className="text-xs uppercase tracking-wide opacity-70">{session.business_type}</p>
            )}
          </div>

          {/* Bottom meta band — Estimate range + Created */}
          <div
            className="absolute bottom-0 left-0 right-0 grid grid-cols-3 text-[10px] uppercase tracking-wider px-10 py-3 border-t border-white/10"
            style={{ background: 'rgba(0,0,0,0.18)' }}
          >
            <div>
              <div className="opacity-60">One-time estimate</div>
              <div className="font-semibold mt-0.5 normal-case">
                {formatRange(session.estimate_low, session.estimate_high)}
              </div>
            </div>
            <div>
              <div className="opacity-60">Monthly recurring</div>
              <div className="font-semibold mt-0.5 normal-case">
                {session.monthly_high
                  ? `${formatRange(session.monthly_low, session.monthly_high)}/mo`
                  : '—'}
              </div>
            </div>
            <div>
              <div className="opacity-60">Created</div>
              <div className="font-semibold mt-0.5 normal-case">
                {new Date(session.created_at).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Interior strip header (mirrors SOW Project Brief band) */}
        <div
          className="flex items-center justify-between px-10 py-3"
          style={{ background: '#fafbfc', borderBottom: '1px solid #e2e8f0' }}
        >
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#3D4566' }}>
            Quote Summary
          </div>
          <div className="text-xs" style={{ color: '#5d6780' }}>
            Detail {session.accuracy_pct}% · {session.timeline_weeks_low}–{session.timeline_weeks_high} weeks
          </div>
        </div>

        {/* Interior body — selected items + retainer summary */}
        <div className="px-10 py-8 space-y-6" style={{ color: '#1d2330' }}>
          {/* Selected items */}
          <section>
            <div
              className="text-xs uppercase tracking-wide font-semibold mb-3 pb-1.5"
              style={{ color: '#5d6780', borderBottom: '1px solid #e2e8f0' }}
            >
              Selected items
            </div>
            {session.selected_items.length === 0 ? (
              <p className="text-sm italic" style={{ color: '#5d6780' }}>No items selected.</p>
            ) : (
              <ul className="text-sm space-y-1.5">
                {session.selected_items.map((item) => (
                  <li key={item.id} className="flex justify-between border-b border-slate-50 py-1.5">
                    <span className="font-mono text-xs">{item.id}</span>
                    <span style={{ color: '#5d6780' }}>× {item.quantity}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Retainer plan inline */}
          {detail.retainerPlan && (
            <section>
              <div
                className="text-xs uppercase tracking-wide font-semibold mb-3 pb-1.5"
                style={{ color: '#5d6780', borderBottom: '1px solid #e2e8f0' }}
              >
                Retainer
              </div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-semibold">{detail.retainerPlan.name}</div>
                  <div className="text-xs uppercase tracking-wide" style={{ color: '#5d6780' }}>
                    {detail.retainerPlan.tier}
                  </div>
                </div>
                {session.retainer_monthly_cents != null && session.retainer_monthly_cents > 0 && (
                  <div
                    className="font-mono font-semibold tabular-nums"
                    style={{ color: '#22c55e' }}
                  >
                    {formatCents(session.retainer_monthly_cents)}/mo
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Footer brand line */}
          <div
            className="text-xs pt-4 mt-4"
            style={{ color: '#5d6780', borderTop: '1px solid #e2e8f0' }}
          >
            Demand Signals · DemandSignals@gmail.com · (916) 542-2423 · demandsignals.co
          </div>
        </div>
      </div>

      {/* ───── Operator workbench (wide, below the document card) ───── */}
      <div className="px-6 space-y-6">

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
        {/* ───── Left: prospect profile + stats + retainer ───── */}
        <div className="space-y-4">
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

        <RetainerPanel
          quoteId={session.id}
          planName={detail.retainerPlan?.name ?? null}
          planTier={detail.retainerPlan?.tier ?? null}
          monthlyCents={session.retainer_monthly_cents ?? 0}
          startDate={session.retainer_start_date ?? null}
          activatedAt={session.retainer_activated_at ?? null}
          cancelledAt={session.retainer_cancelled_at ?? null}
          subscriptionId={session.retainer_subscription_id ?? null}
          launchedAt={session.launched_at ?? null}
          onActivated={refetchQuote}
        />
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
    </div>
  )
}

// Courtesy dropdown — creates a $0 "New Client Appreciation" invoice with
// ONE chosen diagnostic/research item shown at full price + 100% discount.
// Default = Site & Social Audit (the pain-diagnostic that closes hardest).
function CourtesyDropdown({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function trigger(courtesyItemId: string) {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/invoices/restaurant-rule-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_session_id: sessionId, courtesy_item_id: courtesyItemId }),
      })
      const data = await res.json()
      if (res.ok) window.location.href = `/admin/invoices/${data.invoice.id}`
      else alert(data.error ?? 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="inline-flex items-center gap-1 px-3 py-2 bg-orange-100 hover:bg-orange-200 rounded-md text-sm text-orange-900"
      >
        🎁 Send Courtesy {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
          <div className="px-3 py-2 border-b border-slate-100 text-[10px] font-semibold text-slate-500 uppercase">
            Pick the courtesy item
          </div>
          <button
            onClick={() => trigger('site-social-audit')}
            disabled={busy}
            className="w-full text-left px-3 py-2 hover:bg-orange-50 text-sm border-b border-slate-100"
          >
            <div className="font-medium">Site & Social Audit</div>
            <div className="text-xs text-slate-500">Diagnostic — recommended default</div>
          </button>
          <button
            onClick={() => trigger('market-research')}
            disabled={busy}
            className="w-full text-left px-3 py-2 hover:bg-orange-50 text-sm border-b border-slate-100"
          >
            <div className="font-medium">Market Research</div>
            <div className="text-xs text-slate-500">Industry + opportunity analysis</div>
          </button>
          <button
            onClick={() => trigger('competitor-analysis')}
            disabled={busy}
            className="w-full text-left px-3 py-2 hover:bg-orange-50 text-sm"
          >
            <div className="font-medium">Competitor Analysis</div>
            <div className="text-xs text-slate-500">Competitive landscape</div>
          </button>
        </div>
      )}
    </div>
  )
}
