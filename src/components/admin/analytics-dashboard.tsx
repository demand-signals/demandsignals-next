'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye, Users, TrendingUp, Bot, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { StatCard } from './stat-card'
import { cn } from '@/lib/utils'

type AnalyticsData = {
  empty?: boolean
  period: { from: string; to: string }
  totalPageviews: number
  uniqueVisitors: number
  prevPageviews: number
  prevUniqueVisitors: number
  botPageviews: number
  topPages: { path: string; views: number; visitors: number }[]
  topReferrers: { domain: string; views: number }[]
  topCountries: { country: string; views: number }[]
  topCities: { city: string; views: number }[]
  devices: { type: string; count: number; pct: number }[]
  browsers: { name: string; count: number; pct: number }[]
  osSystems: { name: string; count: number; pct: number }[]
  dailyTrend: { date: string; views: number; visitors: number }[]
  utmCampaigns: { source: string; medium: string; campaign: string | null; views: number }[]
}

async function fetchAnalytics(from: string, to: string): Promise<AnalyticsData> {
  const sp = new URLSearchParams({ from, to })
  const res = await fetch(`/api/admin/analytics?${sp}`)
  if (!res.ok) throw new Error('Failed to fetch analytics')
  return res.json()
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function TrendArrow({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return null
  const up = pct > 0
  return (
    <span className={cn('inline-flex items-center text-[0.6rem] font-medium', up ? 'text-green-500' : 'text-red-500')}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(pct)}%
    </span>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{children}</h3>
}

export function AnalyticsDashboard() {
  const now = new Date()
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all' | 'custom'>('30d')
  const [customFrom, setCustomFrom] = useState(formatDate(new Date(now.getTime() - 30 * 86400000)))
  const [customTo, setCustomTo] = useState(formatDate(now))

  const getDateRange = () => {
    switch (range) {
      case '7d': return { from: formatDate(new Date(now.getTime() - 7 * 86400000)), to: formatDate(now) }
      case '30d': return { from: formatDate(new Date(now.getTime() - 30 * 86400000)), to: formatDate(now) }
      case '90d': return { from: formatDate(new Date(now.getTime() - 90 * 86400000)), to: formatDate(now) }
      case 'all': return { from: '2020-01-01', to: formatDate(now) }
      case 'custom': return { from: customFrom, to: customTo }
    }
  }

  const { from, to } = getDateRange()

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', from, to],
    queryFn: () => fetchAnalytics(from, to),
  })

  const daysInRange = Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000))
  const avgPerDay = data ? Math.round(data.totalPageviews / daysInRange) : 0

  const btnClass = (active: boolean) => cn(
    'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
    active ? 'bg-[var(--teal)] text-white border-[var(--teal)]' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
  )

  if (isLoading) {
    return <div className="text-slate-400 text-sm animate-pulse">Loading analytics…</div>
  }

  if (!data || data.empty) {
    return (
      <div className="text-center py-12">
        <Eye className="w-12 h-12 text-slate-200 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-slate-600">No analytics data yet</h3>
        <p className="text-slate-400 text-sm mt-1">Tracking just started — data will appear as visitors browse the site.</p>
      </div>
    )
  }

  const maxDailyViews = Math.max(1, ...data.dailyTrend.map(d => d.views))

  return (
    <div className="space-y-6">
      {/* Date range */}
      <div className="flex flex-wrap items-center gap-2">
        {(['7d', '30d', '90d', 'all'] as const).map(r => (
          <button key={r} onClick={() => setRange(r)} className={btnClass(range === r)}>
            {r === 'all' ? 'All Time' : r}
          </button>
        ))}
        <button onClick={() => setRange('custom')} className={btnClass(range === 'custom')}>Custom</button>
        {range === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600" />
            <span className="text-slate-400 text-xs">to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600" />
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-[#68c5ad]" />
            <span className="text-xs text-slate-500">Pageviews</span>
            <TrendArrow current={data.totalPageviews} previous={data.prevPageviews} />
          </div>
          <div className="text-2xl font-bold text-slate-800">{data.totalPageviews.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-slate-500">Unique Visitors</span>
            <TrendArrow current={data.uniqueVisitors} previous={data.prevUniqueVisitors} />
          </div>
          <div className="text-2xl font-bold text-slate-800">{data.uniqueVisitors.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-[#f28500]" />
            <span className="text-xs text-slate-500">Avg / Day</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{avgPerDay.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">Bot Views</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{data.botPageviews.toLocaleString()}</div>
        </div>
      </div>

      {/* Daily trend bar chart */}
      {data.dailyTrend.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <SectionTitle>Daily Trend</SectionTitle>
          <div className="flex items-end gap-[2px] mt-3" style={{ height: 120 }}>
            {data.dailyTrend.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[0.5rem] text-slate-400">{d.views}</span>
                <div
                  className="w-full bg-[var(--teal)] rounded-t opacity-80 hover:opacity-100 transition-opacity"
                  style={{ height: `${(d.views / maxDailyViews) * 100}%`, minHeight: d.views > 0 ? 4 : 0 }}
                  title={`${d.date}: ${d.views} views, ${d.visitors} visitors`}
                />
                {data.dailyTrend.length <= 31 && (
                  <span className="text-[0.45rem] text-slate-300 -rotate-45 origin-top-left whitespace-nowrap">{d.date}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-col: Top Pages + Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <SectionTitle>Top Pages</SectionTitle>
          <div className="mt-3 space-y-1.5 max-h-[300px] overflow-y-auto">
            {data.topPages.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 truncate max-w-[70%]" title={p.path}>{p.path}</span>
                <span className="text-slate-400 text-xs font-mono">{p.views}</span>
              </div>
            ))}
            {data.topPages.length === 0 && <p className="text-slate-300 text-sm">No data</p>}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <SectionTitle>Traffic Sources</SectionTitle>
          <div className="mt-3 space-y-1.5 max-h-[300px] overflow-y-auto">
            {data.topReferrers.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 truncate max-w-[70%]">{r.domain}</span>
                <span className="text-slate-400 text-xs font-mono">{r.views}</span>
              </div>
            ))}
            {data.topReferrers.length === 0 && <p className="text-slate-300 text-sm">No referrer data</p>}
          </div>
        </div>
      </div>

      {/* Three-col: Countries + Devices + Browsers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <SectionTitle>Countries</SectionTitle>
          <div className="mt-3 space-y-1.5">
            {data.topCountries.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{c.country || 'Unknown'}</span>
                <span className="text-slate-400 text-xs font-mono">{c.views}</span>
              </div>
            ))}
            {data.topCountries.length === 0 && <p className="text-slate-300 text-sm">No data</p>}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <SectionTitle>Devices</SectionTitle>
          <div className="mt-3 space-y-2">
            {data.devices.map((d, i) => (
              <div key={i} className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 capitalize">{d.type}</span>
                  <span className="text-slate-400">{d.pct}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--teal)] rounded-full" style={{ width: `${d.pct}%` }} />
                </div>
              </div>
            ))}
            {data.devices.length === 0 && <p className="text-slate-300 text-sm">No data</p>}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <SectionTitle>Browsers</SectionTitle>
          <div className="mt-3 space-y-2">
            {data.browsers.map((b, i) => (
              <div key={i} className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">{b.name}</span>
                  <span className="text-slate-400">{b.pct}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${b.pct}%` }} />
                </div>
              </div>
            ))}
            {data.browsers.length === 0 && <p className="text-slate-300 text-sm">No data</p>}
          </div>
        </div>
      </div>

      {/* UTM Campaigns */}
      {data.utmCampaigns.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <SectionTitle>UTM Campaigns</SectionTitle>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th className="pb-2">Source</th>
                  <th className="pb-2">Medium</th>
                  <th className="pb-2">Campaign</th>
                  <th className="pb-2 text-right">Views</th>
                </tr>
              </thead>
              <tbody>
                {data.utmCampaigns.map((c, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-1.5 text-slate-600">{c.source}</td>
                    <td className="py-1.5 text-slate-500">{c.medium}</td>
                    <td className="py-1.5 text-slate-500">{c.campaign || '—'}</td>
                    <td className="py-1.5 text-slate-400 text-right font-mono text-xs">{c.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
