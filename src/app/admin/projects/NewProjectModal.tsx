'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, X } from 'lucide-react'

const TYPES = ['website', 'mobile_app', 'webapp', 'content', 'seo', 'ads', 'consulting', 'other'] as const
const STATUSES = ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'] as const

interface ProspectOption {
  id: string
  business_name: string
  client_code: string | null
  is_client: boolean
}

export function NewProjectModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [prospects, setProspects] = useState<ProspectOption[]>([])
  const [form, setForm] = useState({
    name: '',
    prospect_id: '',
    type: 'website' as (typeof TYPES)[number],
    status: 'planning' as (typeof STATUSES)[number],
    start_date: new Date().toISOString().slice(0, 10),
    target_date: '',
    monthly_value: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    // Fetch prospects (clients first). Capped at 500 to stay snappy.
    fetch('/api/admin/prospects?limit=500&sort=updated_at&order=desc')
      .then((r) => r.json())
      .then((d) => {
        const list = (d.data ?? []) as ProspectOption[]
        // Sort clients to the top.
        list.sort((a, b) => Number(b.is_client) - Number(a.is_client))
        setProspects(list)
      })
      .catch(() => setProspects([]))
  }, [])

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  const filtered = prospects.filter((p) => {
    if (!filter) return true
    const f = filter.toLowerCase()
    return (
      p.business_name.toLowerCase().includes(f) ||
      (p.client_code ?? '').toLowerCase().includes(f)
    )
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!form.name.trim() || !form.prospect_id) {
      setErr('Project name and a prospect are required')
      return
    }
    setSaving(true)
    const payload = {
      name:          form.name.trim(),
      prospect_id:   form.prospect_id,
      type:          form.type,
      status:        form.status,
      start_date:    form.start_date || null,
      target_date:   form.target_date || null,
      monthly_value: form.monthly_value === '' ? null : Number(form.monthly_value),
      notes:         form.notes.trim() || null,
    }
    const res = await fetch('/api/admin/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j.error ?? 'Save failed')
      return
    }
    const j = await res.json()
    router.push(`/admin/projects/${j.id}`)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto pt-12 pb-12 px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">New Project</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <Field label="Project name *">
            <input
              autoFocus
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className={inputCls}
              placeholder="e.g. Demand Generation Project"
            />
          </Field>

          <Field label="Client / prospect *">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by name or client code"
              className={inputCls + ' mb-2'}
            />
            <select
              value={form.prospect_id}
              onChange={(e) => set('prospect_id', e.target.value)}
              className={inputCls}
              size={6}
            >
              <option value="">— select a prospect —</option>
              {filtered.slice(0, 200).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.is_client ? '[CLIENT] ' : ''}
                  {p.business_name}
                  {p.client_code ? ` (${p.client_code})` : ''}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select value={form.type} onChange={(e) => set('type', e.target.value as any)} className={inputCls}>
                {TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => set('status', e.target.value as any)} className={inputCls}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Target date">
              <input type="date" value={form.target_date} onChange={(e) => set('target_date', e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Monthly value ($)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.monthly_value}
              onChange={(e) => set('monthly_value', e.target.value)}
              className={inputCls}
              placeholder="Snapshot value; live MRR is computed from active subscriptions"
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>

          {err && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-sm rounded-lg bg-[var(--teal)] text-white hover:bg-[var(--teal-dark)] disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Create project
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
