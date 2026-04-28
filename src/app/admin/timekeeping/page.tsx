'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Clock, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimeEntryRow {
  id: string
  project_id: string
  phase_id: string | null
  deliverable_id: string | null
  hours: number
  description: string | null
  billable: boolean
  hourly_rate_cents: number | null
  logged_at: string
  logged_by: string | null
  created_at: string
  project: {
    id: string
    name: string
    prospect_id: string
    prospects: { business_name: string } | null
  } | null
}

interface Summary {
  total_hours: number
  billable_hours: number
  non_billable_hours: number
  distinct_projects: number
  distinct_clients: number
  entry_count: number
  last_entry_date: string | null
}

type RangeKey = 'week' | 'month' | 'all'

function rangeBounds(key: RangeKey): { from?: string; to?: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  if (key === 'week') {
    const day = now.getDay()  // 0 = Sun
    const sunday = new Date(y, m, d - day)
    return { from: sunday.toISOString().slice(0, 10) }
  }
  if (key === 'month') {
    const first = new Date(y, m, 1)
    return { from: first.toISOString().slice(0, 10) }
  }
  return {}
}

export default function TimekeepingPage() {
  const [entries, setEntries] = useState<TimeEntryRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<RangeKey>('week')
  const [billableFilter, setBillableFilter] = useState<'all' | 'billable' | 'non_billable'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function buildUrl() {
    const params = new URLSearchParams()
    const r = rangeBounds(range)
    if (r.from) params.set('from', r.from)
    if (r.to) params.set('to', r.to)
    if (billableFilter === 'billable') params.set('billable', 'true')
    if (billableFilter === 'non_billable') params.set('billable', 'false')
    params.set('limit', '200')
    return `/api/admin/time-entries?${params.toString()}`
  }

  function load() {
    setLoading(true)
    fetch(buildUrl())
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setEntries(d.entries ?? [])
        setSummary(d.summary ?? null)
        setTotal(d.total ?? 0)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [range, billableFilter])

  async function handleDelete(entry: TimeEntryRow) {
    if (!confirm(`Delete this ${entry.hours}h entry?`)) return
    setDeletingId(entry.id)
    const res = await fetch(
      `/api/admin/projects/${entry.project_id}/time-entries/${entry.id}`,
      { method: 'DELETE' },
    )
    setDeletingId(null)
    if (!res.ok) {
      alert('Delete failed')
      return
    }
    load()
  }

  const grouped = useMemo(() => groupByLoggedAt(entries), [entries])

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-6 h-6 text-[var(--teal)]" />
            Timekeeping
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cross-project time tracker. Log entries from a project&apos;s detail page; filter and review them all here.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryCard label="Total hours" value={summary.total_hours.toFixed(2)} suffix="h" accent="text-slate-900" />
          <SummaryCard label="Billable" value={summary.billable_hours.toFixed(2)} suffix="h" accent="text-emerald-700" />
          <SummaryCard label="Non-billable" value={summary.non_billable_hours.toFixed(2)} suffix="h" accent="text-slate-600" />
          <SummaryCard label="Projects" value={String(summary.distinct_projects)} accent="text-slate-700" />
          <SummaryCard label="Clients" value={String(summary.distinct_clients)} accent="text-slate-700" />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 mr-1">Range:</span>
        {(['week', 'month', 'all'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-colors',
              range === r
                ? 'bg-[var(--teal)] text-white border-[var(--teal)]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
            )}
          >
            {r === 'week' ? 'This week' : r === 'month' ? 'This month' : 'All time'}
          </button>
        ))}
        <span className="text-xs text-slate-500 ml-3 mr-1">Billable:</span>
        {(['all', 'billable', 'non_billable'] as const).map((b) => (
          <button
            key={b}
            onClick={() => setBillableFilter(b)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-colors',
              billableFilter === b
                ? 'bg-[var(--teal)] text-white border-[var(--teal)]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
            )}
          >
            {b === 'all' ? 'All' : b === 'billable' ? 'Billable only' : 'Non-billable only'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-slate-400 text-sm py-12 text-center">Loading time entries…</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-400 text-sm">
            No time entries {range === 'week' ? 'this week' : range === 'month' ? 'this month' : 'yet'}.
          </p>
          <p className="text-slate-400 text-xs mt-1">
            Log entries from a project&apos;s detail page (Projects → pick one → Log Time).
          </p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="space-y-4">
          {grouped.map(([date, dayEntries]) => {
            const dayTotal = dayEntries.reduce((s, e) => s + Number(e.hours), 0)
            return (
              <div key={date} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-700">
                    {new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </div>
                  <div className="text-xs text-slate-500 tabular-nums">
                    {dayTotal.toFixed(2)}h · {dayEntries.length} entr{dayEntries.length === 1 ? 'y' : 'ies'}
                  </div>
                </div>
                <ul className="divide-y divide-slate-100">
                  {dayEntries.map((e) => (
                    <li key={e.id} className="px-4 py-2.5 flex items-start gap-3 group">
                      <div className="text-sm font-semibold text-slate-700 tabular-nums w-14 shrink-0">
                        {Number(e.hours).toFixed(2)}h
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {e.project && (
                            <Link
                              href={`/admin/projects/${e.project.id}`}
                              className="text-sm font-medium text-[var(--teal)] hover:underline truncate"
                            >
                              {e.project.name}
                            </Link>
                          )}
                          {e.project?.prospects?.business_name && (
                            <span className="text-xs text-slate-500">
                              · {e.project.prospects.business_name}
                            </span>
                          )}
                          {!e.billable && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">
                              non-billable
                            </span>
                          )}
                          {e.logged_by && (
                            <span className="text-[11px] text-slate-400 truncate">· {e.logged_by}</span>
                          )}
                        </div>
                        {e.description && (
                          <div className="text-sm text-slate-700 mt-0.5">{e.description}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(e)}
                        disabled={deletingId === e.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 shrink-0 disabled:opacity-50"
                        title="Delete entry"
                      >
                        {deletingId === e.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          {total > entries.length && (
            <div className="text-center text-xs text-slate-400 pt-2">
              Showing {entries.length} of {total} entries
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function groupByLoggedAt(entries: TimeEntryRow[]): Array<[string, TimeEntryRow[]]> {
  const map = new Map<string, TimeEntryRow[]>()
  for (const e of entries) {
    const key = e.logged_at  // already YYYY-MM-DD
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  // Map preserves insertion order; entries arrive sorted desc by API.
  return Array.from(map.entries())
}

function SummaryCard({
  label,
  value,
  suffix,
  accent,
}: {
  label: string
  value: string
  suffix?: string
  accent: string
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={cn('text-xl font-bold tabular-nums', accent)}>
        {value}
        {suffix && <span className="text-sm font-medium text-slate-400 ml-0.5">{suffix}</span>}
      </div>
    </div>
  )
}
