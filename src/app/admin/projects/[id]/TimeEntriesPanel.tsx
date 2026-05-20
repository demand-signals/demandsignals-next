'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Clock, Plus, Trash2, X, Clipboard, Pencil, Check } from 'lucide-react'
import type { ProjectPhase } from '@/lib/invoice-types'

type TimeEntryCategory =
  | 'billable'
  | 'non_billable'
  | 'bulk_payment'
  | 'services_contract'
  | 'internal'

const CATEGORY_OPTIONS: ReadonlyArray<{ value: TimeEntryCategory; label: string }> = [
  { value: 'billable', label: 'Billable' },
  { value: 'non_billable', label: 'Non-billable' },
  { value: 'bulk_payment', label: 'Bulk payment' },
  { value: 'services_contract', label: 'Services contract' },
  { value: 'internal', label: 'Internal' },
]

const CATEGORY_BADGE: Record<TimeEntryCategory, { label: string; className: string }> = {
  billable: { label: 'Billable', className: 'bg-emerald-100 text-emerald-700' },
  non_billable: { label: 'Non-billable', className: 'bg-amber-100 text-amber-700' },
  bulk_payment: { label: 'Bulk payment', className: 'bg-sky-100 text-sky-700' },
  services_contract: { label: 'Services contract', className: 'bg-indigo-100 text-indigo-700' },
  internal: { label: 'Internal', className: 'bg-slate-100 text-slate-600' },
}

interface CoverageRefOption {
  id: string
  label: string
}

interface TimeEntry {
  id: string
  project_id: string
  phase_id: string | null
  deliverable_id: string | null
  hours: number | null
  description: string | null
  billable: boolean
  category: TimeEntryCategory | null
  covered_by_invoice_id: string | null
  covered_by_subscription_id: string | null
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
  by_category?: Record<TimeEntryCategory, number>
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editHunterStr, setEditHunterStr] = useState('')
  const [editClaudeStr, setEditClaudeStr] = useState('')
  const [editHoursStr, setEditHoursStr] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editCategory, setEditCategory] = useState<TimeEntryCategory>('billable')
  const [editInvoiceId, setEditInvoiceId] = useState<string>('')
  const [editSubscriptionId, setEditSubscriptionId] = useState<string>('')
  const [editBusy, setEditBusy] = useState(false)
  const [coverageOptions, setCoverageOptions] = useState<{
    invoices: CoverageRefOption[]
    subscriptions: CoverageRefOption[]
  } | null>(null)

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

  // Edit-entry helpers: Xh Ym → minutes parser, used for both hunter +
  // claude inputs. Empty/invalid → 0. "6h 30m" / "6h" / "30m" / "390"
  // (raw minutes) all accepted.
  function parseTimeInputToMinutes(s: string): number {
    const t = s.trim()
    if (!t) return 0
    if (/^\d+$/.test(t)) return parseInt(t, 10)  // raw minutes
    let mins = 0
    const h = t.match(/(\d+)\s*h/i)
    const m = t.match(/(\d+)\s*m\b/i)
    if (h) mins += parseInt(h[1], 10) * 60
    if (m) mins += parseInt(m[1], 10)
    return mins
  }

  async function loadCoverageOptionsIfNeeded() {
    if (coverageOptions) return
    const r = await fetch(`/api/admin/projects/${projectId}/coverage-options`)
    if (!r.ok) return
    const j = await r.json()
    setCoverageOptions({
      invoices: j.invoices ?? [],
      subscriptions: j.subscriptions ?? [],
    })
  }

  function startEditEntry(e: TimeEntry) {
    setEditingId(e.id)
    setEditHunterStr(e.hunter_minutes ? fmtMinutes(e.hunter_minutes) : '')
    setEditClaudeStr(e.claude_minutes ? fmtMinutes(e.claude_minutes) : '')
    // Show hours only if it's a manual entry without minute splits
    const hasMinutes = (e.hunter_minutes ?? 0) > 0 || (e.claude_minutes ?? 0) > 0
    setEditHoursStr(hasMinutes ? '' : (e.hours != null ? String(e.hours) : ''))
    setEditDesc(e.description ?? '')
    setEditCategory((e.category ?? (e.billable ? 'billable' : 'non_billable')) as TimeEntryCategory)
    setEditInvoiceId(e.covered_by_invoice_id ?? '')
    setEditSubscriptionId(e.covered_by_subscription_id ?? '')
    // Pre-fetch coverage options in case the user switches to bulk_payment / services_contract
    void loadCoverageOptionsIfNeeded()
  }
  function cancelEditEntry() {
    setEditingId(null)
    setEditHunterStr('')
    setEditClaudeStr('')
    setEditHoursStr('')
    setEditDesc('')
    setEditCategory('billable')
    setEditInvoiceId('')
    setEditSubscriptionId('')
  }
  async function saveEditEntry(entryId: string) {
    setEditBusy(true)
    const payload: Record<string, unknown> = {
      description: editDesc.trim() || null,
      category: editCategory,
    }

    // Coverage refs: only send the relevant one for the chosen category.
    // The server clears the other one regardless, but being explicit
    // makes the request log cleaner.
    if (editCategory === 'bulk_payment') {
      if (!editInvoiceId) {
        alert('Bulk payment requires selecting an invoice to attach to.')
        setEditBusy(false)
        return
      }
      payload.covered_by_invoice_id = editInvoiceId
    } else if (editCategory === 'services_contract') {
      if (!editSubscriptionId) {
        alert('Services contract requires selecting a subscription to attach to.')
        setEditBusy(false)
        return
      }
      payload.covered_by_subscription_id = editSubscriptionId
    }

    const hMin = parseTimeInputToMinutes(editHunterStr)
    const cMin = parseTimeInputToMinutes(editClaudeStr)
    const hasMinuteEdits =
      editHunterStr.trim().length > 0 || editClaudeStr.trim().length > 0
    if (hasMinuteEdits) {
      payload.hunter_minutes = hMin
      payload.claude_minutes = cMin
      // hours auto-mirrors on the server when minutes change
    } else if (editHoursStr.trim().length > 0) {
      const h = parseFloat(editHoursStr)
      if (!Number.isFinite(h) || h < 0) {
        alert('Hours must be a non-negative number')
        setEditBusy(false)
        return
      }
      payload.hours = h
    }
    const res = await fetch(`/api/admin/projects/${projectId}/time-entries/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setEditBusy(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(j.error ?? 'Edit failed')
      return
    }
    cancelEditEntry()
    load()
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
              {data.rollup.by_category && (
                <span className="ml-1 text-slate-400">
                  ({(['billable', 'bulk_payment', 'services_contract', 'non_billable', 'internal'] as TimeEntryCategory[])
                    .filter((k) => (data.rollup.by_category?.[k] ?? 0) > 0)
                    .map((k) => `${(data.rollup.by_category?.[k] ?? 0).toFixed(2)}h ${CATEGORY_BADGE[k].label.toLowerCase()}`)
                    .join(' · ')})
                </span>
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
            if (!res.ok) {
              const j = await res.json().catch(() => ({}))
              alert(j.error ?? 'Save failed')
            }
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
          {data.entries.map((e) => {
            const isEditing = editingId === e.id
            return (
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
                    {(() => {
                      const cat = (e.category ?? (e.billable ? 'billable' : 'non_billable')) as TimeEntryCategory
                      // Default 'billable' is the implicit positive case — don't badge it (saves visual noise)
                      if (cat === 'billable') return null
                      const b = CATEGORY_BADGE[cat]
                      return (
                        <span className={`px-1.5 py-0.5 rounded font-medium ${b.className}`}>
                          {b.label}
                        </span>
                      )
                    })()}
                    {e.logged_by && (
                      <span className="text-slate-400 truncate">· {e.logged_by}</span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mt-2 space-y-2 bg-slate-50 -mx-2 px-2 py-2 rounded">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-[11px] text-slate-600">
                          Hunter
                          <input
                            value={editHunterStr}
                            onChange={(ev) => setEditHunterStr(ev.target.value)}
                            placeholder="6h 30m"
                            className="w-full mt-0.5 px-2 py-1 border border-slate-200 rounded text-sm"
                          />
                        </label>
                        <label className="text-[11px] text-slate-600">
                          Claude
                          <input
                            value={editClaudeStr}
                            onChange={(ev) => setEditClaudeStr(ev.target.value)}
                            placeholder="9h 0m"
                            className="w-full mt-0.5 px-2 py-1 border border-slate-200 rounded text-sm"
                          />
                        </label>
                      </div>
                      {!editHunterStr.trim() && !editClaudeStr.trim() && (
                        <label className="text-[11px] text-slate-600 block">
                          Or hours (decimal, when no minute split)
                          <input
                            value={editHoursStr}
                            onChange={(ev) => setEditHoursStr(ev.target.value)}
                            placeholder="2.5"
                            className="w-full mt-0.5 px-2 py-1 border border-slate-200 rounded text-sm"
                          />
                        </label>
                      )}
                      <label className="text-[11px] text-slate-600 block">
                        Category
                        <select
                          value={editCategory}
                          onChange={(ev) => setEditCategory(ev.target.value as TimeEntryCategory)}
                          className="w-full mt-0.5 px-2 py-1 border border-slate-200 rounded text-sm bg-white"
                        >
                          {CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </label>
                      {editCategory === 'bulk_payment' && (
                        <label className="text-[11px] text-slate-600 block">
                          Attach to invoice (bulk-payment / deposit)
                          <select
                            value={editInvoiceId}
                            onChange={(ev) => setEditInvoiceId(ev.target.value)}
                            className="w-full mt-0.5 px-2 py-1 border border-slate-200 rounded text-sm bg-white"
                          >
                            <option value="">— Pick an invoice —</option>
                            {(coverageOptions?.invoices ?? []).map((opt) => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </select>
                          {coverageOptions && coverageOptions.invoices.length === 0 && (
                            <span className="text-[10px] text-amber-700 italic">No invoices on this project yet — create one first.</span>
                          )}
                        </label>
                      )}
                      {editCategory === 'services_contract' && (
                        <label className="text-[11px] text-slate-600 block">
                          Attach to subscription (recurring contract)
                          <select
                            value={editSubscriptionId}
                            onChange={(ev) => setEditSubscriptionId(ev.target.value)}
                            className="w-full mt-0.5 px-2 py-1 border border-slate-200 rounded text-sm bg-white"
                          >
                            <option value="">— Pick a subscription —</option>
                            {(coverageOptions?.subscriptions ?? []).map((opt) => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </select>
                          {coverageOptions && coverageOptions.subscriptions.length === 0 && (
                            <span className="text-[10px] text-amber-700 italic">No subscriptions on this project yet.</span>
                          )}
                        </label>
                      )}
                      <textarea
                        value={editDesc}
                        onChange={(ev) => setEditDesc(ev.target.value)}
                        placeholder="Description"
                        rows={2}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={cancelEditEntry}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded text-slate-600 hover:bg-slate-100"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                        <button
                          onClick={() => saveEditEntry(e.id)}
                          disabled={editBusy}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded bg-[var(--teal)] text-white font-medium disabled:opacity-50 hover:bg-[var(--teal-dark)]"
                        >
                          {editBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditEntry(e)}
                      className="text-slate-400 hover:text-teal-600"
                      title="Edit entry"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="text-slate-400 hover:text-red-500"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </li>
            )
          })}
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
    category: TimeEntryCategory
    covered_by_invoice_id: string | null
    covered_by_subscription_id: string | null
    logged_at: string
  }) => Promise<boolean>
  onCreated: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [hours, setHours] = useState('')
  const [description, setDescription] = useState('')
  const [phaseId, setPhaseId] = useState<string>('')
  const [category, setCategory] = useState<TimeEntryCategory>('billable')
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
      billable: category === 'billable',
      category,
      // Coverage refs deferred to inline edit (keeps the create form simple).
      // Admin picks the doc by entering edit mode after create if needed.
      covered_by_invoice_id: null,
      covered_by_subscription_id: null,
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
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-600 flex-1 min-w-0">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TimeEntryCategory)}
            className="flex-1 min-w-0 px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-teal-300"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
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
  // Two artifact formats are supported, tried in this order:
  //
  // FORMAT A — v1i+ (dsig-handoff skill, 2026-05-15 and later). Auto-
  // derived from session transcripts; three time categories rolled up
  // into two billable totals with explicit "(= NNNm)" anchors:
  //
  //   - Hunter on-clock (own + while Claude works):  7h 06m  (= 426m)
  //   - Claude line (inference + tool execution):    5h 11m  (= 311m)
  //
  // We MUST anchor on these specific lines — the same artifact also
  // contains intermediate breakdown lines that match the legacy
  // "Hunter (...)" / "Claude (...)" regexes (e.g., "Hunter human (own
  // typing/reading, 20-min idle cap)" and "Claude inference (model
  // thinking)") and would silently capture the wrong (smaller) value.
  // Witnessed 2026-05-19 SMMA session: legacy regex parsed Hunter as
  // 115m instead of the on-clock 426m, undercounting by 5+ hours.
  //
  // FORMAT B — pre-2026-05-15 single-line. Kept as fallback for
  // historical pastes and any future variants:
  //
  //   - Hunter (active engagement): 6h 30m
  //   - Claude (compute): 2h 15m
  //
  // The parenthetical content is captured but ignored — any label
  // works. Tilde (~) prefix on the value is tolerated.

  let hunterMinutes = 0
  let claudeMinutes = 0

  // FORMAT A: anchor on the explicit "(= NNNm)" billable-total form.
  // These regexes ONLY match the on-clock / billable-line summaries.
  const hunterOnClockRe = /Hunter\s+on-clock\s*\([^)]*\)\s*:[^\n(]*\(\s*=\s*(\d+)\s*m\s*\)/i
  const claudeLineRe = /Claude\s+line\s*\([^)]*\)\s*:[^\n(]*\(\s*=\s*(\d+)\s*m\s*\)/i

  const hOC = raw.match(hunterOnClockRe)
  const cL = raw.match(claudeLineRe)
  if (hOC) hunterMinutes = parseInt(hOC[1], 10)
  if (cL) claudeMinutes = parseInt(cL[1], 10)

  // FORMAT B fallback: only consult if FORMAT A didn't match. Tolerant
  // patterns. h+m form ("6h 30m"), bare-h form ("6h"), or bare-m form
  // ("330m"). Bare-minutes form attempted FIRST: only matches when the
  // line has ONLY a minutes value (no preceding hour value), so "6h 30m"
  // goes to the h+m form, not the bare-m form. Anchored at the colon to
  // avoid catching trailing "30m" of an h+m line.
  if (hunterMinutes === 0) {
    const hunterMinRe = /Hunter\s*\([^)]+\):\s*~?\s*(\d+)\s*m\b(?!\s*\d)/i
    const hunterRe = /Hunter\s*\([^)]+\):\s*~?\s*(\d+)\s*h(?:\s*(\d+)\s*m?)?/i
    const hMin = raw.match(hunterMinRe)
    if (hMin) hunterMinutes = parseInt(hMin[1], 10)
    if (hunterMinutes === 0) {
      const h = raw.match(hunterRe)
      if (h) hunterMinutes = parseInt(h[1], 10) * 60 + (h[2] ? parseInt(h[2], 10) : 0)
    }
  }

  if (claudeMinutes === 0) {
    const claudeMinRe = /Claude\s*\([^)]+\):\s*~?\s*(\d+)\s*m\b(?!\s*\d)/i
    const claudeRe = /Claude\s*\([^)]+\):\s*~?\s*(\d+)\s*h(?:\s*(\d+)\s*m?)?/i
    const cMin = raw.match(claudeMinRe)
    if (cMin) claudeMinutes = parseInt(cMin[1], 10)
    if (claudeMinutes === 0) {
      const c = raw.match(claudeRe)
      if (c) claudeMinutes = parseInt(c[1], 10) * 60 + (c[2] ? parseInt(c[2], 10) : 0)
    }
  }

  if (hunterMinutes <= 0 && claudeMinutes <= 0) {
    return { error: 'Could not find Hunter/Claude time lines in pasted text. Expected "Hunter (any-label): Xh Ym" and "Claude (any-label): Xh Ym" — tilde (~) prefix on the value is OK.' }
  }

  // Session window — multi-shape tolerant. Hunter's /handoff output uses
  // any of these forms:
  //   "Session: ~17:00 PT 2026-05-07 → ~22:30 PT 2026-05-07"      (TIME PT DATE)
  //   "Session: 2026-05-05 ~10:30 AM PT — 2026-05-06 ~late ev PT" (DATE TIME PT, fuzzy end)
  //   "Session: ~2026-05-07 11:00 PT — 2026-05-08 00:50 PT"       (~DATE TIME PT)
  //
  // Strategy: split the Session line at — / → / -, extract a date and an
  // optional time from each side independently. Falls back to noon for
  // start and 11:59 PM for end if a side has only a fuzzy time word
  // (morning/evening/late). Empty sessionStartedAt/EndedAt are valid
  // (server schema accepts null) — better to drop the times than to
  // reject the whole save.
  let sessionStartedAt: string | null = null
  let sessionEndedAt: string | null = null

  const sessLineMatch = raw.match(/Session:\s*([^\n]+)/i)
  if (sessLineMatch) {
    const sessLine = sessLineMatch[1]
    const splitRe = /\s*(?:[—→]|--)\s*|\s+-\s+/
    const halves = sessLine.split(splitRe)
    if (halves.length === 2) {
      const left = parseSessionHalf(halves[0], 'start')
      const right = parseSessionHalf(halves[1], 'end')
      if (left) sessionStartedAt = left
      if (right) sessionEndedAt = right
    }
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

  // Fallback body: when no formal "## CLIENT UPDATE" header was pasted
  // (Hunter's typical handoff is just the TIME TRACKING content + Notes
  // block), use the WHOLE raw paste as the note body. The session detail
  // Hunter writes — the breakdown of Hunter active time, the Claude
  // compute description, etc. — is what makes a good client-visible
  // note. Better to capture too much than to leave the body as a
  // placeholder "(time entry from /handoff)" string.
  if (!clientUpdateBody && raw.trim().length > 0) {
    clientUpdateBody = raw.trim()
    // Title fallback: first non-trivial line (skip "Session:", "Wall clock:",
    // "Project / Client:", "Total billable:" lines — those are headers).
    const titleSkipRe = /^(session|wall clock|project|client|total billable|notes)\s*[:\/]/i
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
    for (const line of lines) {
      if (!titleSkipRe.test(line) && !line.startsWith('-') && !line.startsWith('#')) {
        clientUpdateTitle = line.slice(0, 200)
        break
      }
    }
    // If no title found, try the Project / Client line trimmed
    if (!clientUpdateTitle) {
      const projLine = raw.match(/Project\s*\/\s*Client:\s*([^\n]+)/i)
      if (projLine) clientUpdateTitle = projLine[1].trim().slice(0, 200)
    }
  }

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

// Parse one half of a Session: line into an ISO timestamp.
// Returns null if no recognizable date is found.
//   "~10:30 AM PT 2026-05-05"        → "2026-05-05T10:30:00-07:00"
//   "2026-05-06 ~10:30 AM PT"        → "2026-05-06T10:30:00-07:00"
//   "~2026-05-07 11:00 PT"           → "2026-05-07T11:00:00-07:00"
//   "2026-05-06 ~late evening PT"    → "2026-05-06T23:59:00-07:00"  (end fallback)
//   "2026-05-06 ~morning PT"         → "2026-05-06T08:00:00-07:00"  (morning fallback)
//   "2026-05-06 ~afternoon PT"       → "2026-05-06T14:00:00-07:00"
//   "2026-05-06 PT"                  → start half: noon; end half: 11:59 PM
function parseSessionHalf(half: string, side: 'start' | 'end'): string | null {
  const dateMatch = half.match(/(\d{4}-\d{2}-\d{2})/)
  if (!dateMatch) return null
  const date = dateMatch[1]

  // Try HH:MM (with optional AM/PM)
  const timeMatch = half.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  let hh = -1
  let mm = 0
  if (timeMatch) {
    hh = parseInt(timeMatch[1], 10)
    mm = parseInt(timeMatch[2], 10)
    const ampm = timeMatch[3]?.toUpperCase()
    if (ampm === 'PM' && hh < 12) hh += 12
    if (ampm === 'AM' && hh === 12) hh = 0
  } else {
    // Fuzzy time-of-day fallback
    const lower = half.toLowerCase()
    if (/morning|early/.test(lower)) hh = 8
    else if (/noon|mid-?day/.test(lower)) hh = 12
    else if (/afternoon/.test(lower)) hh = 14
    else if (/evening|late/.test(lower)) hh = side === 'end' ? 23 : 18
    else if (/night/.test(lower)) hh = 21
    else hh = side === 'end' ? 23 : 12
    mm = side === 'end' && hh === 23 ? 59 : 0
  }
  const time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  return ptToIso(date, time)
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
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(j.error ?? 'Save failed')
      return
    }
    // Server returns 200 with a `warning` field when the project_notes
    // row wrote but the project_time_entries row failed (e.g. column
    // mismatch, constraint failure). Don't pretend success — surface
    // it so the admin knows the time entry didn't land.
    if (j.warning) {
      alert(`Saved with warning:\n\n${j.warning}\n\nThe note saved but the time entry did not. Re-paste after the underlying issue is fixed, or log time manually via Log Time.`)
      // Still call onCreated() so the panel refreshes and shows what DID save.
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
