'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Clock, Plus, Trash2, X } from 'lucide-react'
import type { ProjectPhase } from '@/lib/invoice-types'

interface TimeEntry {
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
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs px-3 py-1 rounded-lg bg-[var(--teal)] text-white hover:bg-[var(--teal-dark)] flex items-center gap-1"
        >
          {showForm ? <><X className="w-3 h-3" /> Cancel</> : <><Plus className="w-3 h-3" /> Log Time</>}
        </button>
      </div>

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
                {Number(e.hours).toFixed(2)}h
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="text-slate-500">{new Date(e.logged_at).toLocaleDateString()}</span>
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
