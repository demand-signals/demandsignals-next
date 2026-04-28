'use client'

import { useState } from 'react'
import { Loader2, X } from 'lucide-react'

const STATUSES = ['active', 'abandoned', 'converted', 'expired', 'blocked'] as const
const CONVERSION_ACTIONS = [
  '', 'booked_call', 'sent_estimate', 'lets_go', 'bought_single',
  'research', 'bid_submitted', 'bid_accepted', 'abandoned',
] as const

interface EditableSession {
  id: string
  business_name: string | null
  business_type: string | null
  business_location: string | null
  estimate_low: number | null
  estimate_high: number | null
  monthly_low: number | null
  monthly_high: number | null
  status: string
  conversion_action: string | null
  scope_summary?: string | null
  valid_until?: string | null
}

export function EditQuotePanel({
  session,
  onClose,
  onSaved,
}: {
  session: EditableSession
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    business_name: session.business_name ?? '',
    business_type: session.business_type ?? '',
    business_location: session.business_location ?? '',
    estimate_low: session.estimate_low ?? '',
    estimate_high: session.estimate_high ?? '',
    monthly_low: session.monthly_low ?? '',
    monthly_high: session.monthly_high ?? '',
    status: session.status,
    conversion_action: session.conversion_action ?? '',
    scope_summary: session.scope_summary ?? '',
    valid_until: session.valid_until ? session.valid_until.slice(0, 10) : '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    const payload: Record<string, unknown> = {
      business_name:     form.business_name.trim() || null,
      business_type:     form.business_type.trim() || null,
      business_location: form.business_location.trim() || null,
      estimate_low:      form.estimate_low === '' ? null : Number(form.estimate_low),
      estimate_high:     form.estimate_high === '' ? null : Number(form.estimate_high),
      monthly_low:       form.monthly_low === '' ? null : Number(form.monthly_low),
      monthly_high:      form.monthly_high === '' ? null : Number(form.monthly_high),
      status:            form.status,
      conversion_action: form.conversion_action || null,
      scope_summary:     form.scope_summary.trim() || null,
      valid_until:       form.valid_until || null,
    }
    const res = await fetch(`/api/admin/quotes/${session.id}`, {
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
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto pt-12 pb-12 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Edit Quote</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Business identity */}
          <Field label="Business name">
            <input
              value={form.business_name}
              onChange={(e) => set('business_name', e.target.value)}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Business type">
              <input
                value={form.business_type}
                onChange={(e) => set('business_type', e.target.value)}
                className={inputCls}
                placeholder="e.g. mobile mechanic"
              />
            </Field>
            <Field label="Location">
              <input
                value={form.business_location}
                onChange={(e) => set('business_location', e.target.value)}
                className={inputCls}
                placeholder="e.g. Sacramento, CA"
              />
            </Field>
          </div>

          {/* Estimate ranges (dollars, not cents — matches table schema) */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="One-time estimate low ($)">
              <input
                type="number"
                min="0"
                value={form.estimate_low}
                onChange={(e) => set('estimate_low', e.target.value as any)}
                className={inputCls}
              />
            </Field>
            <Field label="One-time estimate high ($)">
              <input
                type="number"
                min="0"
                value={form.estimate_high}
                onChange={(e) => set('estimate_high', e.target.value as any)}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monthly retainer low ($)">
              <input
                type="number"
                min="0"
                value={form.monthly_low}
                onChange={(e) => set('monthly_low', e.target.value as any)}
                className={inputCls}
              />
            </Field>
            <Field label="Monthly retainer high ($)">
              <input
                type="number"
                min="0"
                value={form.monthly_high}
                onChange={(e) => set('monthly_high', e.target.value as any)}
                className={inputCls}
              />
            </Field>
          </div>

          {/* Status / conversion / valid_until */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className={inputCls}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Conversion action">
              <select
                value={form.conversion_action}
                onChange={(e) => set('conversion_action', e.target.value)}
                className={inputCls}
              >
                {CONVERSION_ACTIONS.map((a) => (
                  <option key={a} value={a}>{a || '— none —'}</option>
                ))}
              </select>
            </Field>
            <Field label="Valid until">
              <input
                type="date"
                value={form.valid_until}
                onChange={(e) => set('valid_until', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Scope summary">
            <textarea
              value={form.scope_summary}
              onChange={(e) => set('scope_summary', e.target.value)}
              rows={4}
              className={inputCls}
              placeholder="Short narrative captured by the AI flow — admin-editable."
            />
          </Field>

          {err && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {err}
            </p>
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
