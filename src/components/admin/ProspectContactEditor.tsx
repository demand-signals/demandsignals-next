'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export interface ProspectContact {
  id: string
  owner_name: string | null
  owner_email: string | null
  business_email: string | null
  owner_phone: string | null
  business_phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
}

interface Props {
  prospect: ProspectContact
  onSaved?: (updated: ProspectContact) => void
}

export default function ProspectContactEditor({ prospect, onSaved }: Props) {
  const [editing, setEditing] = useState(false)
  const [state, setState] = useState<ProspectContact>(prospect)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/admin/prospects/${prospect.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_name: state.owner_name,
          owner_email: state.owner_email,
          business_email: state.business_email,
          owner_phone: state.owner_phone,
          business_phone: state.business_phone,
          address: state.address,
          city: state.city,
          state: state.state,
          zip: state.zip,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setEditing(false)
      onSaved?.(state)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  function update<K extends keyof ProspectContact>(key: K, value: ProspectContact[K]) {
    setState((s) => ({ ...s, [key]: value }))
  }

  if (!editing) {
    const cityLine = [state.city, state.state, state.zip].filter(Boolean).join(', ')
    return (
      <div className="text-sm space-y-0.5">
        {state.owner_name && <div>{state.owner_name}</div>}
        {state.address && <div>{state.address}</div>}
        {cityLine && <div>{cityLine}</div>}
        {(state.owner_email || state.business_email) && <div>{state.owner_email ?? state.business_email}</div>}
        {(state.owner_phone || state.business_phone) && <div>{state.owner_phone ?? state.business_phone}</div>}
        <button onClick={() => setEditing(true)} className="text-xs text-teal-600 hover:underline mt-1">
          Edit contact info
        </button>
      </div>
    )
  }

  return (
    <div className="text-sm space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="block"><span className="text-xs text-slate-500">Owner name</span>
          <input value={state.owner_name ?? ''} onChange={(e) => update('owner_name', e.target.value || null)} className="w-full border border-slate-200 rounded px-2 py-1" />
        </label>
        <label className="block"><span className="text-xs text-slate-500">Owner email</span>
          <input type="email" value={state.owner_email ?? ''} onChange={(e) => update('owner_email', e.target.value || null)} className="w-full border border-slate-200 rounded px-2 py-1" />
        </label>
        <label className="block"><span className="text-xs text-slate-500">Business email</span>
          <input type="email" value={state.business_email ?? ''} onChange={(e) => update('business_email', e.target.value || null)} className="w-full border border-slate-200 rounded px-2 py-1" />
        </label>
        <label className="block"><span className="text-xs text-slate-500">Owner phone</span>
          <input value={state.owner_phone ?? ''} onChange={(e) => update('owner_phone', e.target.value || null)} className="w-full border border-slate-200 rounded px-2 py-1" />
        </label>
        <label className="block"><span className="text-xs text-slate-500">Business phone</span>
          <input value={state.business_phone ?? ''} onChange={(e) => update('business_phone', e.target.value || null)} className="w-full border border-slate-200 rounded px-2 py-1" />
        </label>
        <label className="block"><span className="text-xs text-slate-500">Address</span>
          <input value={state.address ?? ''} onChange={(e) => update('address', e.target.value || null)} className="w-full border border-slate-200 rounded px-2 py-1" />
        </label>
        <label className="block"><span className="text-xs text-slate-500">City</span>
          <input value={state.city ?? ''} onChange={(e) => update('city', e.target.value || null)} className="w-full border border-slate-200 rounded px-2 py-1" />
        </label>
        <label className="block"><span className="text-xs text-slate-500">State</span>
          <input value={state.state ?? ''} onChange={(e) => update('state', e.target.value || null)} className="w-full border border-slate-200 rounded px-2 py-1" />
        </label>
        <label className="block col-span-2"><span className="text-xs text-slate-500">ZIP</span>
          <input value={state.zip ?? ''} onChange={(e) => update('zip', e.target.value || null)} className="w-full border border-slate-200 rounded px-2 py-1 max-w-32" />
        </label>
      </div>
      {err && <div className="text-red-600 text-xs">{err}</div>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="bg-teal-500 text-white rounded px-3 py-1 text-xs font-semibold disabled:opacity-50">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
        </button>
        <button onClick={() => { setState(prospect); setEditing(false) }} className="bg-slate-100 rounded px-3 py-1 text-xs">Cancel</button>
      </div>
    </div>
  )
}
