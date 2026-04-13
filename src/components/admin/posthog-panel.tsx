'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity, Video, Zap, Users, MousePointerClick,
  ExternalLink, Gauge, Clock, Globe, Monitor,
  AlertTriangle, CheckCircle, Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────

type PostHogData = {
  overview: {
    totalEvents: number
    totalSessions: number
    uniqueUsers: number
    topEvents: { event: string; count: number }[]
  }
  recordings: {
    id: string
    startTime: string
    duration: number | null
    distinctId: string
    clickCount: number | null
    keypressCount: number | null
    pageCount: number | null
    country: string | null
    device: string | null
    startUrl: string | null
    viewUrl: string
  }[]
  events: {
    id: string
    event: string
    timestamp: string
    distinctId: string
    url: string | null
    pathname: string | null
    browser: string | null
    os: string | null
    device: string | null
  }[]
  vitals: {
    lcp: number | null
    fid: number | null
    cls: number | null
    inp: number | null
    sampleCount: number
  }
}

// ─── Helpers ────────────────────────────────────────────────

function formatDuration(seconds: number | null) {
  if (seconds == null) return '--'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function formatEventName(name: string) {
  if (name === '$pageview') return 'Pageview'
  if (name === '$pageleave') return 'Page Leave'
  if (name === '$autocapture') return 'Click / Input'
  if (name === '$web_vitals') return 'Web Vitals'
  if (name === '$dead_click') return 'Dead Click'
  if (name === '$rageclick') return 'Rage Click'
  if (name.startsWith('$')) return name.slice(1).replace(/_/g, ' ')
  return name
}

type VitalRating = 'good' | 'needs-improvement' | 'poor'

function vitalRating(metric: string, value: number | null): VitalRating {
  if (value == null) return 'good'
  switch (metric) {
    case 'lcp': return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor'
    case 'fid': return value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor'
    case 'cls': return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor'
    case 'inp': return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor'
    default: return 'good'
  }
}

const ratingColors: Record<VitalRating, string> = {
  good: 'text-green-600 bg-green-50 border-green-200',
  'needs-improvement': 'text-amber-600 bg-amber-50 border-amber-200',
  poor: 'text-red-600 bg-red-50 border-red-200',
}

const ratingIcons: Record<VitalRating, typeof CheckCircle> = {
  good: CheckCircle,
  'needs-improvement': AlertTriangle,
  poor: AlertTriangle,
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{children}</h3>
}

// ─── Setup Screen ───────────────────────────────────────────

function SetupInstructions({ detail }: { detail?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
          <Info className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 mb-2">Connect PostHog API</h3>
          <p className="text-sm text-slate-500 mb-4">
            To display PostHog data here, add two environment variables to Vercel:
          </p>
          <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside mb-4">
            <li>
              Go to{' '}
              <a href="https://us.posthog.com/settings/user-api-keys" target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] font-medium hover:underline">
                PostHog &rarr; Settings &rarr; Personal API Keys
              </a>{' '}
              and create a new key
            </li>
            <li>
              Find your Project ID in{' '}
              <a href="https://us.posthog.com/settings/project" target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] font-medium hover:underline">
                PostHog &rarr; Settings &rarr; Project
              </a>
            </li>
            <li>Add to Vercel env vars:
              <code className="block mt-1 bg-slate-50 px-3 py-2 rounded text-xs font-mono">
                POSTHOG_PERSONAL_API_KEY=phx_your_key_here<br />
                POSTHOG_PROJECT_ID=your_project_id
              </code>
            </li>
            <li>Redeploy</li>
          </ol>
          {detail && (
            <p className="text-xs text-red-500 mt-2 bg-red-50 rounded px-3 py-2 font-mono">{detail}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────

export function PostHogPanel() {
  const [dateRange] = useState(() => {
    const now = new Date()
    const from = new Date(now.getTime() - 7 * 86400000)
    return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }
  })

  const { data, isLoading, error } = useQuery<PostHogData>({
    queryKey: ['posthog', 'all', dateRange.from, dateRange.to],
    queryFn: async () => {
      const sp = new URLSearchParams({ metric: 'all', from: dateRange.from, to: dateRange.to })
      const res = await fetch(`/api/admin/posthog?${sp}`)
      if (!res.ok) throw new Error('Failed to fetch PostHog data')
      const json = await res.json()
      if (json.configured === false) throw new Error('NOT_CONFIGURED:' + (json.detail || ''))
      if (json.error) throw new Error(json.error + (json.hint ? ` — ${json.hint}` : ''))
      return json
    },
    retry: false,
  })

  if (isLoading) {
    return <div className="text-slate-400 text-sm animate-pulse">Loading PostHog data...</div>
  }

  if (error?.message?.startsWith('NOT_CONFIGURED')) {
    return <SetupInstructions detail={error.message.split(':').slice(1).join(':')} />
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
        Failed to load PostHog data: {error?.message || 'Unknown error'}
      </div>
    )
  }

  const maxEventCount = Math.max(1, ...data.overview.topEvents.map(e => e.count))

  return (
    <div className="space-y-5">
      {/* Overview stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-slate-500">Total Events</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{data.overview.totalEvents.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-slate-500">Unique Users</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{data.overview.uniqueUsers.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <MousePointerClick className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-slate-500">Sessions</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{data.overview.totalSessions.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Video className="w-4 h-4 text-red-500" />
            <span className="text-xs text-slate-500">Recordings</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{data.recordings.length}</div>
        </div>
      </div>

      {/* Web Vitals */}
      {data.vitals.sampleCount > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>Core Web Vitals</SectionTitle>
            <span className="text-[0.6rem] text-slate-300">{data.vitals.sampleCount} samples</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {([
              { key: 'lcp', label: 'LCP', value: data.vitals.lcp, unit: 'ms', desc: 'Largest Contentful Paint' },
              { key: 'inp', label: 'INP', value: data.vitals.inp, unit: 'ms', desc: 'Interaction to Next Paint' },
              { key: 'cls', label: 'CLS', value: data.vitals.cls, unit: '', desc: 'Cumulative Layout Shift' },
              { key: 'fid', label: 'FID', value: data.vitals.fid, unit: 'ms', desc: 'First Input Delay' },
            ] as const).map(({ key, label, value, unit, desc }) => {
              const rating = vitalRating(key, value)
              const RatingIcon = ratingIcons[rating]
              return (
                <div key={key} className={cn('border rounded-lg p-3', ratingColors[rating])}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <RatingIcon className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">{label}</span>
                  </div>
                  <div className="text-xl font-bold">
                    {value != null ? `${value}${unit}` : '--'}
                  </div>
                  <div className="text-[0.6rem] opacity-70 mt-0.5">{desc}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Two-col: Top Events + Session Replays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Events */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <SectionTitle>Top Events (7d)</SectionTitle>
          <div className="mt-3 space-y-2">
            {data.overview.topEvents.slice(0, 10).map((e, i) => (
              <div key={i} className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 truncate max-w-[70%]">{formatEventName(e.event)}</span>
                  <span className="text-slate-400 font-mono">{e.count.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-400 rounded-full"
                    style={{ width: `${(e.count / maxEventCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {data.overview.topEvents.length === 0 && (
              <p className="text-slate-300 text-sm">No events recorded yet</p>
            )}
          </div>
        </div>

        {/* Session Replays */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <SectionTitle>Recent Session Replays</SectionTitle>
          <div className="mt-3 space-y-1.5 max-h-[320px] overflow-y-auto">
            {data.recordings.slice(0, 12).map((r) => (
              <a
                key={r.id}
                href={r.viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <Video className="w-4 h-4 text-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-700 font-medium truncate">
                      {r.startUrl ? new URL(r.startUrl).pathname : r.distinctId?.slice(0, 12)}
                    </span>
                    <ExternalLink className="w-2.5 h-2.5 text-slate-300 group-hover:text-slate-500" />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[0.6rem] text-slate-400">
                    <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{formatDuration(r.duration)}</span>
                    {r.pageCount != null && <span>{r.pageCount} pages</span>}
                    {r.clickCount != null && <span>{r.clickCount} clicks</span>}
                    {r.country && <span className="flex items-center gap-0.5"><Globe className="w-2.5 h-2.5" />{r.country}</span>}
                    {r.device && <span className="flex items-center gap-0.5"><Monitor className="w-2.5 h-2.5" />{r.device}</span>}
                  </div>
                </div>
                <span className="text-[0.55rem] text-slate-300 whitespace-nowrap">
                  {formatTime(r.startTime)}
                </span>
              </a>
            ))}
            {data.recordings.length === 0 && (
              <p className="text-slate-300 text-sm">No recordings yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Live Event Feed */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <SectionTitle>Recent Events</SectionTitle>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="pb-2 pr-3">Event</th>
                <th className="pb-2 pr-3">Page</th>
                <th className="pb-2 pr-3">Browser</th>
                <th className="pb-2 text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {data.events.slice(0, 20).map((e) => (
                <tr key={e.id} className="border-t border-slate-50">
                  <td className="py-1.5 pr-3">
                    <span className="inline-flex items-center gap-1">
                      <Activity className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-600">{formatEventName(e.event)}</span>
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 text-slate-500 truncate max-w-[200px]" title={e.pathname || ''}>
                    {e.pathname || '--'}
                  </td>
                  <td className="py-1.5 pr-3 text-slate-400 text-xs">
                    {[e.browser, e.os].filter(Boolean).join(' / ') || '--'}
                  </td>
                  <td className="py-1.5 text-right text-slate-400 text-xs whitespace-nowrap">
                    {formatTime(e.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.events.length === 0 && (
            <p className="text-slate-300 text-sm text-center py-4">No events recorded yet</p>
          )}
        </div>
      </div>

      {/* PostHog Cloud link */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          <strong className="text-slate-600">PostHog Cloud</strong> — Session replays play in PostHog&apos;s viewer. Free: 1M events + 5K recordings/month.
        </p>
        <a
          href="https://us.posthog.com/home"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--teal)] font-medium hover:underline flex items-center gap-1"
        >
          Open PostHog <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}
