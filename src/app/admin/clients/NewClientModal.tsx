'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, X } from 'lucide-react'

const INDUSTRIES = ['restaurant', 'retail', 'healthcare', 'home_services', 'professional', 'fitness', 'beauty', 'auto', 'other'] as const

export function NewClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const router = useRouter()
  const [form, setForm] = useState({
    business_name: '',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    business_phone: '',
    website_url: '',
    address: '',
    city: '',
    state: 'CA',
    zip: '',
    industry: 'other' as (typeof INDUSTRIES)[number],
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!form.business_name.trim()) {
      setErr('Business name is required')
      return
    }
    setSaving(true)
    const payload = {
      business_name:  form.business_name.trim(),
      owner_name:     form.owner_name.trim() || null,
      owner_email:    form.owner_email.trim() || null,
      owner_phone:    form.owner_phone.trim() || null,
      business_phone: form.business_phone.trim() || null,
      website_url:    form.website_url.trim() || null,
      address:        form.address.trim() || null,
      city:           form.city.trim() || null,
      state:          form.state.trim() || null,
      zip:            form.zip.trim() || null,
      industry:       form.industry,
      stage:          'closed',
      is_client:      true,
      became_client_at: new Date().toISOString(),
      source:         'manual',
    }
    const res = await fetch('/api/admin/prospects', {
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
    if (j?.data?.id) {
      router.push(`/admin/prospects/${j.data.id}`)
      return
    }
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto pt-12 pb-12 px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">New Client</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
          <Field label="Business name *">
            <input autoFocus value={form.business_name} onChange={(e) => set('business_name', e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Industry">
              <select value={form.industry} onChange={(e) => set('industry', e.target.value as any)} className={inputCls}>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i.replace('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label="Website">
              <input value={form.website_url} onChange={(e) => set('website_url', e.target.value)} className={inputCls} placeholder="https://" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner name">
              <input value={form.owner_name} onChange={(e) => set('owner_name', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Owner email">
              <input type="email" value={form.owner_email} onChange={(e) => set('owner_email', e.target.value)} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner phone">
              <input value={form.owner_phone} onChange={(e) => set('owner_phone', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Business phone">
              <input value={form.business_phone} onChange={(e) => set('business_phone', e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="Address">
            <input value={form.address} onChange={(e) => set('address', e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="City">
              <input value={form.city} onChange={(e) => set('city', e.target.value)} className={inputCls} />
            </Field>
            <Field label="State">
              <input value={form.state} onChange={(e) => set('state', e.target.value)} className={inputCls} maxLength={2} />
            </Field>
            <Field label="ZIP">
              <input value={form.zip} onChange={(e) => set('zip', e.target.value)} className={inputCls} />
            </Field>
          </div>
          {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</p>}
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
            Create client
          </button>
        </div>
      </form>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">{label}</span>
      {children}
    </label>
  )
}
