'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, ExternalLink, AlertTriangle, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { FaqAccordion } from '@/components/ui/FaqAccordion'

// ── Types ───────────────────────────────────────────────────────────────────

type ComponentStatus = 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance' | 'unknown'

type Component = {
  name: string
  status: ComponentStatus
  description?: string
}

type Incident = {
  name: string
  status: string
  impact: string
  createdAt: string
  resolvedAt: string | null
  url: string
  updates: string[]
}

type PlatformStatus = {
  id: string
  name: string
  icon: string
  color: string
  homepageUrl: string
  overallStatus: ComponentStatus
  statusDescription: string
  components: Component[]
  activeIncidents: Incident[]
  fetchedAt: string
  error?: string
}

type StatusResponse = {
  platforms: PlatformStatus[]
  cached: boolean
  fetchedAt: string
}

// ── Status display helpers ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<ComponentStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  operational: { label: 'Operational', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', icon: CheckCircle2 },
  degraded_performance: { label: 'Degraded', color: '#eab308', bg: 'rgba(234,179,8,0.1)', icon: AlertTriangle },
  partial_outage: { label: 'Partial Outage', color: '#f97316', bg: 'rgba(249,115,22,0.1)', icon: AlertTriangle },
  major_outage: { label: 'Major Outage', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: XCircle },
  under_maintenance: { label: 'Maintenance', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: Clock },
  unknown: { label: 'Unknown', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: Clock },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ── Platform Card ───────────────────────────────────────────────────────────

function PlatformCard({ platform }: { platform: PlatformStatus }) {
  const [expanded, setExpanded] = useState(false)
  const statusConfig = STATUS_CONFIG[platform.overallStatus]
  const StatusIcon = statusConfig.icon
  const hasIssues = platform.overallStatus !== 'operational' && platform.overallStatus !== 'unknown'

  return (
    <div
      className="rounded-2xl border-2 bg-white overflow-hidden transition-all"
      style={{ borderColor: hasIssues ? statusConfig.color : 'rgba(226,232,240,1)' }}
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-4">
        {/* Platform icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm"
          style={{ backgroundColor: platform.color }}
        >
          {platform.icon}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-800">{platform.name}</h3>
            <a
              href={platform.homepageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-600 transition-colors"
              title="View official status page"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <StatusIcon className="w-4 h-4" style={{ color: statusConfig.color }} />
            <span className="text-sm font-medium" style={{ color: statusConfig.color }}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Overall status dot */}
        <div className="flex flex-col items-end gap-1">
          <div
            className="w-4 h-4 rounded-full shadow-sm"
            style={{
              backgroundColor: statusConfig.color,
              boxShadow: hasIssues ? `0 0 8px ${statusConfig.color}40` : undefined,
            }}
          />
          {platform.components.length > 0 && (
            <button
              onClick={() => setExpanded(prev => !prev)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              {platform.components.length} services
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Active incidents */}
      {platform.activeIncidents.length > 0 && (
        <div className="px-5 pb-3">
          {platform.activeIncidents.map((incident, i) => (
            <div
              key={i}
              className="rounded-lg px-3 py-2 mb-2 last:mb-0"
              style={{ backgroundColor: statusConfig.bg }}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: statusConfig.color }} />
                <div className="min-w-0">
                  <a
                    href={incident.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-slate-800 hover:underline"
                  >
                    {incident.name}
                  </a>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">{timeAgo(incident.createdAt)}</span>
                    <span
                      className="text-xs font-medium px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                    >
                      {incident.status}
                    </span>
                  </div>
                  {incident.updates[0] && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{incident.updates[0]}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expanded components */}
      {expanded && platform.components.length > 0 && (
        <div className="px-5 pb-4 border-t border-slate-100 pt-3">
          <div className="space-y-1.5">
            {platform.components.map((comp, i) => {
              const compConfig = STATUS_CONFIG[comp.status]
              return (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{comp.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs" style={{ color: compConfig.color }}>{compConfig.label}</span>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: compConfig.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Error state */}
      {platform.error && (
        <div className="px-5 pb-3">
          <p className="text-xs text-red-400">Failed to fetch: {platform.error}</p>
        </div>
      )}
    </div>
  )
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export function AiStatusDashboard({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const [data, setData] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await fetch('/api/status')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch { /* ignore */ }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    fetchData()
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => fetchData(), 60_000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Count statuses for summary bar
  const allOperational = data?.platforms.every(p => p.overallStatus === 'operational' || p.overallStatus === 'unknown') ?? false
  const issueCount = data?.platforms.filter(p => p.overallStatus !== 'operational' && p.overallStatus !== 'unknown').length ?? 0

  return (
    <main style={{ paddingTop: '72px' }}>
      {/* Hero */}
      <section className="bg-[var(--dark)] text-white py-16 sm:py-20 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-sm text-white/80 mb-6">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Live Monitoring
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              AI Platform <span style={{ color: 'var(--teal)' }}>Status Dashboard</span>
            </h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Real-time uptime monitoring for Claude, ChatGPT, Gemini, and DeepSeek.
              One page to check if any AI platform is down.
            </p>
          </div>
        </div>
      </section>

      {/* Status summary bar */}
      <section className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {allOperational ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-700">All Systems Operational</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium text-orange-700">
                  {issueCount} platform{issueCount !== 1 ? 's' : ''} reporting issues
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            {data && (
              <span className="text-xs text-slate-400">
                Updated {timeAgo(data.fetchedAt)}
              </span>
            )}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-600 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* Platform cards */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-2xl border-2 border-slate-200 bg-white p-6 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-200" />
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 rounded w-40 mb-2" />
                      <div className="h-3 bg-slate-100 rounded w-24" />
                    </div>
                    <div className="w-4 h-4 rounded-full bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.platforms.map(platform => (
                <PlatformCard key={platform.id} platform={platform} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">Failed to load status data.</div>
          )}

          {/* Legend */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
            {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'unknown').map(([key, config]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.color }} />
                {config.label}
              </div>
            ))}
          </div>

          {/* Auto-refresh note */}
          <p className="text-center text-xs text-slate-400 mt-4">
            Auto-refreshes every 60 seconds. Data sourced from official platform status APIs.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[var(--light)] py-16">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center text-[var(--dark)] mb-8">Frequently Asked Questions</h2>
          <FaqAccordion faqs={faqs} />
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--dark)] mb-4">
            Need help choosing the right AI platform?
          </h2>
          <p className="text-[var(--slate)] mb-8">
            We build AI-powered systems on Claude, GPT, and Gemini. Let us help you pick the right stack for your business.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center px-8 py-3 rounded-full text-white font-semibold text-base"
            style={{ backgroundColor: '#FF6B2B' }}
          >
            Get a Free Consultation
          </a>
        </div>
      </section>
    </main>
  )
}
