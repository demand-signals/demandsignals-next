'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Clock, Trash2, Loader2, Clipboard, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimeEntryRow {
  id: string
  project_id: string
  phase_id: string | null
  deliverable_id: string | null
  hours: number | null
  description: string | null
  billable: boolean
  hourly_rate_cents: number | null
  logged_at: string
  logged_by: string | null
  created_at: string
  hunter_minutes: number | null
  claude_minutes: number | null
  source: string | null
  project_note_id: string | null
  project: {
    id: string
    name: string
    prospect_id: string
    prospects: { business_name: string } | null
  } | null
}

function entryHours(e: TimeEntryRow): number {
  if (e.hours != null) return Number(e.hours)
  const split = (e.hunter_minutes ?? 0) + (e.claude_minutes ?? 0)
  return split > 0 ? split / 60 : 0
}

function fmtMinutes(min: number | null | undefined): string {
  if (!min || min <= 0) return '0m'
  const m = Math.round(min)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`
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
  const [showPaste, setShowPaste] = useState(false)

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
            Cross-project time tracker. Paste a /handoff block below or log time from a project&apos;s detail page.
          </p>
        </div>
        <button
          onClick={() => setShowPaste((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5"
        >
          {showPaste ? <><X className="w-3.5 h-3.5" /> Cancel</> : <><Clipboard className="w-3.5 h-3.5" /> Paste handoff</>}
        </button>
      </div>

      {showPaste && (
        <PasteHandoffBlock
          onSaved={() => { setShowPaste(false); load() }}
        />
      )}

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
                        {entryHours(e).toFixed(2)}h
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
                          {e.source === 'handoff' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-semibold">
                              handoff
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
                        {((e.hunter_minutes ?? 0) > 0 || (e.claude_minutes ?? 0) > 0) && (
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>Hunter <strong className="text-slate-700">{fmtMinutes(e.hunter_minutes)}</strong></span>
                            <span>·</span>
                            <span>Claude <strong className="text-slate-700">{fmtMinutes(e.claude_minutes)}</strong></span>
                          </div>
                        )}
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

// ── PasteHandoffBlock ────────────────────────────────────────────────
// Cross-project paste-handoff entry. Asks the admin to pick a project
// from a typeahead since the timekeeping page has no project context.
// Reuses the same parser as TimeEntriesPanel.

interface ParsedHandoff {
  hunter_minutes: number
  claude_minutes: number
  session_started_at: string | null
  session_ended_at: string | null
  client_update_body: string | null
  client_update_title: string | null
}

function parseHandoffText(raw: string): ParsedHandoff | { error: string } {
  const hunterRe = /Hunter\s*\([^)]+\):\s*(\d+)\s*h\s*(\d+)?\s*m?/i
  const claudeRe = /Claude\s*\([^)]+\):\s*(\d+)\s*h\s*(\d+)?\s*m?/i

  let hunterMinutes = 0
  let claudeMinutes = 0

  const h = raw.match(hunterRe)
  if (h) hunterMinutes = parseInt(h[1], 10) * 60 + (h[2] ? parseInt(h[2], 10) : 0)
  const c = raw.match(claudeRe)
  if (c) claudeMinutes = parseInt(c[1], 10) * 60 + (c[2] ? parseInt(c[2], 10) : 0)

  if (hunterMinutes <= 0 && claudeMinutes <= 0) {
    return { error: 'Could not find Hunter/Claude time lines.' }
  }

  const sessRe = /Session:\s*~?(\d{1,2}:\d{2})\s*PT\s+(\d{4}-\d{2}-\d{2})\s*[—→-]+\s*~?(\d{1,2}:\d{2})\s*PT\s+(\d{4}-\d{2}-\d{2})/
  const sess = raw.match(sessRe)
  let sessionStartedAt: string | null = null
  let sessionEndedAt: string | null = null
  if (sess) {
    sessionStartedAt = `${sess[2]}T${sess[1]}:00-08:00`
    sessionEndedAt = `${sess[4]}T${sess[3]}:00-08:00`
  }

  const cuRe = /##\s*CLIENT UPDATE[^\n]*\n([\s\S]*?)(?=\n##\s|$)/
  const cu = raw.match(cuRe)
  let clientUpdateBody: string | null = null
  let clientUpdateTitle: string | null = null
  if (cu) {
    clientUpdateBody = cu[1].trim()
    const firstBullet = clientUpdateBody.match(/^-\s*(.+?)$/m)
    if (firstBullet) clientUpdateTitle = firstBullet[1].slice(0, 200)
  }

  return {
    hunter_minutes: hunterMinutes,
    claude_minutes: claudeMinutes,
    session_started_at: sessionStartedAt,
    session_ended_at: sessionEndedAt,
    client_update_body: clientUpdateBody,
    client_update_title: clientUpdateTitle,
  }
}

interface ProjectOption {
  id: string
  name: string
  business_name: string | null
}

function PasteHandoffBlock({ onSaved }: { onSaved: () => void }) {
  const [raw, setRaw] = useState('')
  const [parsed, setParsed] = useState<ParsedHandoff | null>(null)
  const [parseErr, setParseErr] = useState<string | null>(null)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [projectId, setProjectId] = useState('')
  const [filter, setFilter] = useState('')
  const [saving, setSaving] = useState(false)

  // Load projects once for the picker
  useEffect(() => {
    fetch('/api/admin/projects?limit=200')
      .then((r) => r.json())
      .then((d) => {
        const items = (d.projects ?? d.data ?? []).map((p: { id: string; name: string; prospects?: { business_name: string | null } | null }) => ({
          id: p.id,
          name: p.name,
          business_name: p.prospects?.business_name ?? null,
        }))
        setProjects(items)
      })
      .catch(() => setProjects([]))
  }, [])

  const filteredProjects = useMemo(() => {
    const f = filter.toLowerCase().trim()
    if (!f) return projects.slice(0, 20)
    return projects
      .filter((p) =>
        p.name.toLowerCase().includes(f) ||
        (p.business_name?.toLowerCase().includes(f) ?? false)
      )
      .slice(0, 20)
  }, [projects, filter])

  function tryParse(text: string) {
    setRaw(text)
    if (!text.trim()) {
      setParsed(null)
      setParseErr(null)
      return
    }
    const result = parseHandoffText(text)
    if ('error' in result) {
      setParsed(null)
      setParseErr(result.error)
    } else {
      setParsed(result)
      setParseErr(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!parsed || !projectId) return
    setSaving(true)
    const res = await fetch('/api/admin/project-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        title: parsed.client_update_title,
        body: parsed.client_update_body ?? '(time entry from /handoff)',
        visibility: 'client',
        source: 'handoff',
        session_started_at: parsed.session_started_at,
        session_ended_at: parsed.session_ended_at,
        hunter_minutes: parsed.hunter_minutes,
        claude_minutes: parsed.claude_minutes,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(j.error ?? 'Save failed')
      return
    }
    onSaved()
  }

  const totalMinutes = parsed ? parsed.hunter_minutes + parsed.claude_minutes : 0

  return (
    <form onSubmit={handleSubmit} className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
      <div className="text-xs font-semibold text-violet-900 uppercase tracking-wide">
        Paste /handoff session block
      </div>
      <textarea
        value={raw}
        onChange={(e) => tryParse(e.target.value)}
        placeholder="Paste TIME TRACKING + (optional) CLIENT UPDATE blocks here"
        rows={10}
        autoFocus
        className="w-full px-2.5 py-1.5 border border-violet-200 rounded-lg text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
      />
      {parseErr && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
          {parseErr}
        </div>
      )}
      {parsed && (
        <>
          <div className="text-[11px] text-violet-900 bg-white border border-violet-200 rounded px-3 py-2 space-y-1">
            <div className="flex items-center gap-3">
              <span>Hunter <strong>{fmtMinutes(parsed.hunter_minutes)}</strong></span>
              <span>+ Claude <strong>{fmtMinutes(parsed.claude_minutes)}</strong></span>
              <span>= <strong className="text-violet-700">{fmtMinutes(totalMinutes)}</strong> ({(totalMinutes / 60).toFixed(2)}h)</span>
            </div>
            {parsed.session_started_at && (
              <div className="text-slate-500">
                Session {new Date(parsed.session_started_at).toLocaleString()} → {parsed.session_ended_at ? new Date(parsed.session_ended_at).toLocaleString() : '—'}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Project to attribute
            </label>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter projects by name or client..."
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
            />
            <div className="max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
              {filteredProjects.length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-400">No projects match.</div>
              )}
              {filteredProjects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProjectId(p.id)}
                  className={cn(
                    'w-full px-3 py-1.5 text-left text-xs hover:bg-violet-50',
                    projectId === p.id && 'bg-violet-100',
                  )}
                >
                  <span className="font-medium text-slate-800">{p.name}</span>
                  {p.business_name && <span className="text-slate-500 ml-2">· {p.business_name}</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={saving || !parsed || !projectId}
          className="text-xs px-4 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          Save handoff entry
        </button>
      </div>
    </form>
  )
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
