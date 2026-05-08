'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Clock, Plus, Trash2, X, Clipboard } from 'lucide-react'
import type { ProjectPhase } from '@/lib/invoice-types'

interface TimeEntry {
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
  // Handoff-sourced fields (migration 048)
  hunter_minutes: number | null
  claude_minutes: number | null
  source: string | null
  project_note_id: string | null
}

function fmtMinutes(min: number | null | undefined): string {
  if (!min || min <= 0) return '0m'
  const m = Math.round(min)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`
}

function entryHours(e: TimeEntry): number {
  if (e.hours != null) return Number(e.hours)
  const split = (e.hunter_minutes ?? 0) + (e.claude_minutes ?? 0)
  return split > 0 ? split / 60 : 0
}

interface Rollup {
  total_hours: number
  billable_hours: number
  non_billable_hours: number
  by_phase: Record<string, number>
  entry_count: number
  last_entry_date: string | null
}

interface ApiResponse {
  entries: TimeEntry[]
  rollup: Rollup
}

export function TimeEntriesPanel({
  projectId,
  phases,
}: {
  projectId: string
  phases: ProjectPhase[]
}) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showPaste, setShowPaste] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/projects/${projectId}/time-entries`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => { load() }, [load])

  async function handleDelete(entryId: string) {
    if (!confirm('Delete this time entry?')) return
    const res = await fetch(`/api/admin/projects/${projectId}/time-entries/${entryId}`, {
      method: 'DELETE',
    })
    if (res.ok) load()
    else alert('Delete failed')
  }

  const phaseName = (phaseId: string | null) => {
    if (!phaseId) return null
    const ph = phases.find((p) => p.id === phaseId)
    return ph?.name ?? null
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--teal)]" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Time Entries
          </span>
          {data && data.rollup.entry_count > 0 && (
            <span className="text-xs text-slate-500">
              · <span className="font-semibold text-slate-700 tabular-nums">{data.rollup.total_hours.toFixed(2)}h</span>
              <span className="text-slate-400"> total</span>
              {data.rollup.non_billable_hours > 0 && (
                <span className="ml-1 text-slate-400">({data.rollup.billable_hours.toFixed(2)}h billable)</span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setShowPaste((v) => !v); setShowForm(false) }}
            className="text-xs px-3 py-1 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1"
            title="Paste a /handoff TIME TRACKING block"
          >
            {showPaste ? <><X className="w-3 h-3" /> Cancel</> : <><Clipboard className="w-3 h-3" /> Paste handoff</>}
          </button>
          <button
            onClick={() => { setShowForm((v) => !v); setShowPaste(false) }}
            className="text-xs px-3 py-1 rounded-lg bg-[var(--teal)] text-white hover:bg-[var(--teal-dark)] flex items-center gap-1"
          >
            {showForm ? <><X className="w-3 h-3" /> Cancel</> : <><Plus className="w-3 h-3" /> Log Time</>}
          </button>
        </div>
      </div>

      {showPaste && (
        <PasteHandoffForm
          projectId={projectId}
          onCreated={() => {
            setShowPaste(false)
            load()
          }}
        />
      )}

      {showForm && (
        <NewEntryForm
          phases={phases}
          onCreated={() => {
            setShowForm(false)
            load()
          }}
          onSubmit={async (input) => {
            const res = await fetch(`/api/admin/projects/${projectId}/time-entries`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(input),
            })
            return res.ok
          }}
        />
      )}

      {loading ? (
        <div className="px-4 py-6 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
        </div>
      ) : !data || data.entries.length === 0 ? (
        <div className="px-4 py-6 text-xs text-slate-400 italic text-center">
          No time logged yet.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.entries.map((e) => (
            <li key={e.id} className="px-4 py-2.5 flex items-start gap-3 group">
              <div className="text-sm font-semibold text-slate-700 tabular-nums w-14 shrink-0">
                {entryHours(e).toFixed(2)}h
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="text-slate-500">{new Date(e.logged_at).toLocaleDateString()}</span>
                  {e.source === 'handoff' && (
                    <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-semibold">handoff</span>
                  )}
                  {phaseName(e.phase_id) && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{phaseName(e.phase_id)}</span>
                  )}
                  {!e.billable && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">non-billable</span>
                  )}
                  {e.logged_by && (
                    <span className="text-slate-400 truncate">· {e.logged_by}</span>
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
                onClick={() => handleDelete(e.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 shrink-0"
                title="Delete entry"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function NewEntryForm({
  phases,
  onSubmit,
  onCreated,
}: {
  phases: ProjectPhase[]
  onSubmit: (input: {
    hours: number
    description: string | null
    phase_id: string | null
    billable: boolean
    logged_at: string
  }) => Promise<boolean>
  onCreated: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [hours, setHours] = useState('')
  const [description, setDescription] = useState('')
  const [phaseId, setPhaseId] = useState<string>('')
  const [billable, setBillable] = useState(true)
  const [loggedAt, setLoggedAt] = useState(today)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const h = parseFloat(hours)
    if (!h || h <= 0 || h > 24) {
      alert('Hours must be between 0 and 24')
      return
    }
    setSaving(true)
    const ok = await onSubmit({
      hours: h,
      description: description.trim() || null,
      phase_id: phaseId || null,
      billable,
      logged_at: loggedAt,
    })
    setSaving(false)
    if (ok) onCreated()
    else alert('Save failed')
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 bg-slate-50 border-b border-slate-100 space-y-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="number"
          step="0.25"
          min="0.25"
          max="24"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          placeholder="Hours"
          required
          autoFocus
          className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
        />
        <input
          type="date"
          value={loggedAt}
          onChange={(e) => setLoggedAt(e.target.value)}
          required
          className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
        />
        <select
          value={phaseId}
          onChange={(e) => setPhaseId(e.target.value)}
          className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
        >
          <option value="">— No phase —</option>
          {phases.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What did you work on?"
        maxLength={1000}
        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
            className="rounded text-teal-600"
          />
          Billable
        </label>
        <button
          type="submit"
          disabled={saving}
          className="text-xs px-4 py-1.5 rounded-lg bg-[var(--teal)] text-white hover:bg-[var(--teal-dark)] disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Save'}
        </button>
      </div>
    </form>
  )
}

// ── PasteHandoffForm ─────────────────────────────────────────────────
// Accepts a pasted /handoff session block — at minimum the TIME
// TRACKING artifact (artifact C). If a CLIENT UPDATE block is also
// present (artifact B), use it as the project note body. POSTs to
// /api/admin/project-notes which writes BOTH a project_notes row
// (visibility=client, source=handoff) AND a linked
// project_time_entries row (with hunter_minutes + claude_minutes
// AND hours mirrored so legacy UIs see it).

interface ParsedHandoff {
  hunter_minutes: number
  claude_minutes: number
  session_started_at: string | null
  session_ended_at: string | null
  client_update_body: string | null
  client_update_title: string | null
  notes: string | null
}

function parseHandoff(raw: string): ParsedHandoff | { error: string } {
  // Hunter: matches both v1c "Hunter (active):" and v1d "Hunter (full session):"
  const hunterRe = /Hunter\s*\([^)]+\):\s*(\d+)\s*h\s*(\d+)?\s*m?/i
  const claudeRe = /Claude\s*\([^)]+\):\s*(\d+)\s*h\s*(\d+)?\s*m?/i
  // Also allow plain-minutes form e.g. "Hunter: 330m"
  const hunterMinRe = /Hunter\s*\([^)]+\):.*?\(?=\s*(\d+)\s*m\b/i
  const claudeMinRe = /Claude\s*\([^)]+\):.*?\(?=\s*(\d+)\s*m\b/i

  let hunterMinutes = 0
  let claudeMinutes = 0

  const hMin = raw.match(hunterMinRe)
  if (hMin) hunterMinutes = parseInt(hMin[1], 10)
  else {
    const h = raw.match(hunterRe)
    if (h) hunterMinutes = parseInt(h[1], 10) * 60 + (h[2] ? parseInt(h[2], 10) : 0)
  }

  const cMin = raw.match(claudeMinRe)
  if (cMin) claudeMinutes = parseInt(cMin[1], 10)
  else {
    const c = raw.match(claudeRe)
    if (c) claudeMinutes = parseInt(c[1], 10) * 60 + (c[2] ? parseInt(c[2], 10) : 0)
  }

  if (hunterMinutes <= 0 && claudeMinutes <= 0) {
    return { error: 'Could not find Hunter/Claude time lines in pasted text. Expected "Hunter (full session): Xh Ym" and "Claude (AI compute): Xh Ym".' }
  }

  // Session window — "Session: ~17:00 PT 2026-05-07 → ~22:30 PT 2026-05-07"
  const sessRe = /Session:\s*~?(\d{1,2}:\d{2})\s*PT\s+(\d{4}-\d{2}-\d{2})\s*[—→-]+\s*~?(\d{1,2}:\d{2})\s*PT\s+(\d{4}-\d{2}-\d{2})/
  const sess = raw.match(sessRe)
  let sessionStartedAt: string | null = null
  let sessionEndedAt: string | null = null
  if (sess) {
    // PT = America/Los_Angeles. Build ISO strings with -07:00 offset (PDT)
    // or -08:00 (PST). Use Intl to compute the right offset for each date.
    sessionStartedAt = ptToIso(sess[2], sess[1])
    sessionEndedAt = ptToIso(sess[4], sess[3])
  }

  // CLIENT UPDATE block — captures everything between "## CLIENT UPDATE"
  // and the next "## " header (or end of string).
  const cuRe = /##\s*CLIENT UPDATE[^\n]*\n([\s\S]*?)(?=\n##\s|$)/
  const cu = raw.match(cuRe)
  let clientUpdateBody: string | null = null
  let clientUpdateTitle: string | null = null
  if (cu) {
    clientUpdateBody = cu[1].trim()
    // Try to extract the first "Completed this session:" bullet as the title
    const firstBullet = clientUpdateBody.match(/^-\s*(.+?)$/m)
    if (firstBullet) {
      clientUpdateTitle = firstBullet[1].slice(0, 200)
    }
  }

  // Notes block (artifact C "Notes:" line and below)
  const notesRe = /Notes:\s*([\s\S]*?)(?=\n##\s|$)/
  const notesMatch = raw.match(notesRe)

  return {
    hunter_minutes: hunterMinutes,
    claude_minutes: claudeMinutes,
    session_started_at: sessionStartedAt,
    session_ended_at: sessionEndedAt,
    client_update_body: clientUpdateBody,
    client_update_title: clientUpdateTitle,
    notes: notesMatch ? notesMatch[1].trim() : null,
  }
}

function ptToIso(date: string, time: string): string {
  // date = YYYY-MM-DD, time = HH:MM. Construct an ISO with
  // America/Los_Angeles offset (—07 in PDT, —08 in PST).
  const d = new Date(`${date}T${time}:00-08:00`)
  // Detect DST by parsing the date in the LA timezone
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    timeZoneName: 'short',
  })
  const parts = fmt.formatToParts(d)
  const tzPart = parts.find((p) => p.type === 'timeZoneName')
  const isPDT = tzPart?.value === 'PDT'
  const offset = isPDT ? '-07:00' : '-08:00'
  return `${date}T${time}:00${offset}`
}

function PasteHandoffForm({
  projectId,
  onCreated,
}: {
  projectId: string
  onCreated: () => void
}) {
  const [raw, setRaw] = useState('')
  const [parsed, setParsed] = useState<ParsedHandoff | null>(null)
  const [parseErr, setParseErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function tryParse(text: string) {
    setRaw(text)
    if (!text.trim()) {
      setParsed(null)
      setParseErr(null)
      return
    }
    const result = parseHandoff(text)
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
    if (!parsed) return
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
    onCreated()
  }

  const totalMinutes = parsed ? parsed.hunter_minutes + parsed.claude_minutes : 0

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 bg-violet-50 border-b border-violet-100 space-y-2.5">
      <textarea
        value={raw}
        onChange={(e) => tryParse(e.target.value)}
        placeholder="Paste the /handoff output (TIME TRACKING block at minimum; CLIENT UPDATE block also picked up if present)"
        rows={8}
        autoFocus
        className="w-full px-2.5 py-1.5 border border-violet-200 rounded-lg text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-300"
      />
      {parseErr && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
          {parseErr}
        </div>
      )}
      {parsed && (
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
          {parsed.client_update_title && (
            <div>Title: <em>{parsed.client_update_title}</em></div>
          )}
          {parsed.client_update_body && (
            <div className="text-slate-600">CLIENT UPDATE block detected ({parsed.client_update_body.length} chars) — will be saved as project note</div>
          )}
        </div>
      )}
      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={saving || !parsed}
          className="text-xs px-4 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Save handoff'}
        </button>
      </div>
    </form>
  )
}
