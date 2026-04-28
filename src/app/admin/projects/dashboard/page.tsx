'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, FolderKanban, CheckCircle2, Clock, Layers, DollarSign, ArrowRight } from 'lucide-react'
import { formatCents } from '@/lib/format'

interface DashboardData {
  status_counts: Record<string, number>
  total_projects: number
  active_monthly_cents: number
  active_subscription_count: number
  phase_progress: { total: number; completed: number }
  deliverable_progress: { total: number; delivered: number }
  upcoming_deliverables: Array<{
    project_id: string
    project_name: string
    client_name: string
    phase_id: string
    phase_name: string
    deliverable_id: string
    deliverable_name: string
  }>
  upcoming_deliverable_total: number
  recent_activity: Array<{
    id: string
    name: string
    client_name: string
    status: string
    updated_at: string
  }>
}

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  on_hold: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function ProjectsDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/projects/dashboard')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6"><Loader2 className="w-6 h-6 animate-spin text-teal-500" /></div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!data) return null

  const phasePct = data.phase_progress.total > 0
    ? Math.round((data.phase_progress.completed / data.phase_progress.total) * 100)
    : 0
  const delivPct = data.deliverable_progress.total > 0
    ? Math.round((data.deliverable_progress.delivered / data.deliverable_progress.total) * 100)
    : 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FolderKanban className="w-6 h-6 text-[var(--teal)]" />
          Project Dashboard
        </h1>
        <Link href="/admin/projects" className="text-sm text-teal-600 hover:underline flex items-center gap-1">
          All projects <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total projects"
          value={String(data.total_projects)}
          icon={<FolderKanban className="w-5 h-5 text-[var(--teal)]" />}
        />
        <StatCard
          label="In progress"
          value={String(data.status_counts.in_progress ?? 0)}
          icon={<Clock className="w-5 h-5 text-blue-500" />}
          accent="text-blue-700"
        />
        <StatCard
          label="Completed"
          value={String(data.status_counts.completed ?? 0)}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          accent="text-emerald-700"
        />
        <StatCard
          label="Active monthly"
          value={formatCents(data.active_monthly_cents)}
          sublabel={`${data.active_subscription_count} active sub${data.active_subscription_count === 1 ? '' : 's'}`}
          icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
          accent="text-emerald-700"
        />
      </div>

      {/* Status breakdown + Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            By Status
          </div>
          <div className="space-y-2">
            {(['in_progress', 'planning', 'on_hold', 'completed', 'cancelled'] as const).map((s) => {
              const count = data.status_counts[s] ?? 0
              const pct = data.total_projects > 0 ? Math.round((count / data.total_projects) * 100) : 0
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold w-24 text-center ${STATUS_COLORS[s]}`}>
                    {s.replace('_', ' ')}
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-[var(--teal)] h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 w-10 text-right tabular-nums">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Delivery Progress
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Layers className="w-4 h-4 text-[var(--teal)]" />
                  Phases
                </div>
                <span className="text-sm font-semibold text-slate-700 tabular-nums">
                  {data.phase_progress.completed} / {data.phase_progress.total}
                  <span className="text-xs text-slate-500 ml-1.5">({phasePct}%)</span>
                </span>
              </div>
              <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${phasePct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-[var(--teal)]" />
                  Deliverables
                </div>
                <span className="text-sm font-semibold text-slate-700 tabular-nums">
                  {data.deliverable_progress.delivered} / {data.deliverable_progress.total}
                  <span className="text-xs text-slate-500 ml-1.5">({delivPct}%)</span>
                </span>
              </div>
              <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${delivPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Upcoming Deliverables
            </div>
            {data.upcoming_deliverable_total > data.upcoming_deliverables.length && (
              <span className="text-[10px] text-slate-400">
                showing 12 of {data.upcoming_deliverable_total}
              </span>
            )}
          </div>
          {data.upcoming_deliverables.length === 0 ? (
            <div className="px-4 py-6 text-xs text-slate-400 italic text-center">
              No pending deliverables on active phases.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.upcoming_deliverables.map((d) => (
                <li key={d.deliverable_id} className="px-4 py-2.5">
                  <Link
                    href={`/admin/projects/${d.project_id}`}
                    className="flex items-start gap-3 hover:bg-slate-50 -mx-4 px-4 py-1 rounded"
                  >
                    <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-800 truncate">{d.deliverable_name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {d.client_name} · {d.project_name} · {d.phase_name}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Recent Activity
          </div>
          {data.recent_activity.length === 0 ? (
            <div className="px-4 py-6 text-xs text-slate-400 italic text-center">
              No projects yet.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recent_activity.map((p) => (
                <li key={p.id} className="px-4 py-2.5">
                  <Link
                    href={`/admin/projects/${p.id}`}
                    className="flex items-center gap-3 hover:bg-slate-50 -mx-4 px-4 py-1 rounded"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-800 truncate font-medium">{p.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{p.client_name}</div>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                        STATUS_COLORS[p.status] ?? 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                      {new Date(p.updated_at).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sublabel,
  icon,
  accent = 'text-slate-800',
}: {
  label: string
  value: string
  sublabel?: string
  icon?: React.ReactNode
  accent?: string
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-slate-500">{label}</div>
        {icon}
      </div>
      <div className={`text-xl font-bold tabular-nums ${accent}`}>{value}</div>
      {sublabel && <div className="text-[10px] text-slate-400 mt-0.5">{sublabel}</div>}
    </div>
  )
}
