'use client'

// Edit-project metadata modal. Surfaces all PATCH-able top-level fields
// (status, type, dates, monthly value, notes) for /api/admin/projects/[id].
// Phases/deliverables are edited inline on the detail page itself.

import { useState } from 'react'
import { Loader2, X } from 'lucide-react'

const TYPES = [
  'website', 'mobile_app', 'webapp', 'content', 'seo', 'ads', 'consulting',
  'customer_service', 'bug_report', 'internal', 'courtesy', 'other',
] as const

const TYPE_LABELS: Record<(typeof TYPES)[number], string> = {
  website: 'Website',
  mobile_app: 'Mobile App',
  webapp: 'Web App',
  content: 'Content',
  seo: 'SEO',
  ads: 'Ads',
  consulting: 'Consulting',
  customer_service: 'Customer Service',
  bug_report: 'Bug Report',
  internal: 'Internal',
  courtesy: 'Courtesy',
  other: 'Other',
}

const STATUSES = ['active', 'planning', 'in_progress', 'on_hold', 'completed', 'cancelled'] as const

interface EditProjectInitial {
  type: string
  status: string
  start_date: string | null
  target_date: string | null
  completed_at: string | null
  monthly_value: number | null
  notes: string | null
}

interface Props {
  projectId: string
  initial: EditProjectInitial
  onClose: () => void
  onSaved: () => void
}

export function EditProjectModal({ projectId, initial, onClose, onSaved }: Props) {
  // Default `type` to 'other' if the existing value isn't in our enum (defensive)
  const initialType = (TYPES as readonly string[]).includes(initial.type) ? initial.type : 'other'
  const initialStatus = (STATUSES as readonly string[]).includes(initial.status) ? initial.status : 'active'

  const [type, setType] = useState<string>(initialType)
  const [status, setStatus] = useState<string>(initialStatus)
  const [startDate, setStartDate] = useState<string>(initial.start_date ?? '')
  const [targetDate, setTargetDate] = useState<string>(initial.target_date ?? '')
  const [completedAt, setCompletedAt] = useState<string>(
    initial.completed_at ? initial.completed_at.slice(0, 10) : '',
  )
  // Monthly value stored in DB as decimal dollars (per existing PATCH contract:
  // body.monthly_value is `number`). Display as dollars in the input, save same.
  const [monthlyValue, setMonthlyValue] = useState<string>(
    initial.monthly_value != null ? String(initial.monthly_value) : '',
  )
  const [notes, setNotes] = useState<string>(initial.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)

    const payload: Record<string, unknown> = {
      type,
      status,
      start_date: startDate || null,
      target_date: targetDate || null,
      completed_at: completedAt ? new Date(completedAt).toISOString() : null,
      monthly_value: monthlyValue.trim() === '' ? null : Number(monthlyValue),
      notes: notes.trim() || null,
    }

    const res = await fetch(`/api/admin/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j.error ?? 'Save failed')
      return
    }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto pt-12 pb-12 px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Edit Project</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Target date">
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Completed at">
            <input
              type="date"
              value={completedAt}
              onChange={(e) => setCompletedAt(e.target.value)}
              className={inputCls}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Auto-stamped when all phases complete; clear to reopen.
            </p>
          </Field>

          <Field label="Monthly value">
            <input
              type="number"
              min="0"
              step="0.01"
              value={monthlyValue}
              onChange={(e) => setMonthlyValue(e.target.value)}
              className={inputCls}
              placeholder="Snapshot value (live MRR is computed from active subscriptions)"
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className={inputCls}
            />
          </Field>

          {err && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-sm rounded-lg bg-[var(--teal)] text-white hover:bg-[var(--teal-dark)] disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save changes
          </button>
        </div>
      </form>
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">{label}</span>
      {children}
    </label>
  )
}
