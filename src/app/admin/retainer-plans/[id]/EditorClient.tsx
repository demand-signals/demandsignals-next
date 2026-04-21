'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RetainerMenuItem } from '@/lib/retainer'
import { formatCents } from '@/lib/quote-engine'

interface Plan {
  id: string
  slug: string
  name: string
  description: string | null
  price_cents: number
  tier: string
  sort_order: number
  active: boolean
}

interface Item {
  service_id: string
  quantity: number
}

export default function EditorClient({
  plan,
  items: initialItems,
  menu,
}: {
  plan: Plan
  items: Item[]
  menu: RetainerMenuItem[]
}) {
  const router = useRouter()
  const [name, setName] = useState(plan.name)
  const [description, setDescription] = useState(plan.description ?? '')
  const [priceCents, setPriceCents] = useState(plan.price_cents)
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialItems.map((i) => i.service_id))
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setErr(null)
    try {
      const r1 = await fetch(`/api/admin/retainer-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, price_cents: priceCents }),
      })
      if (!r1.ok) throw new Error((await r1.json()).error ?? 'Plan update failed')

      const r2 = await fetch(`/api/admin/retainer-plans/${plan.id}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: Array.from(selected).map((service_id) => ({ service_id, quantity: 1 })),
        }),
      })
      if (!r2.ok) throw new Error((await r2.json()).error ?? 'Items update failed')

      router.refresh()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          <span className="capitalize">{plan.tier.replace('_', ' ')}</span> tier —{' '}
          {plan.name}
        </h1>
        <p className="text-sm text-slate-500">Slug: {plan.slug}</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Price (cents)</span>
          <input
            type="number"
            min={0}
            value={priceCents}
            onChange={(e) => setPriceCents(Number(e.target.value))}
            className="mt-1 block w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-slate-500 mt-1 block">{formatCents(priceCents)}</span>
        </label>
      </div>

      <div>
        <h2 className="font-semibold text-slate-900 mb-2">Included menu items</h2>
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {menu.length === 0 ? (
            <div className="p-4 text-slate-500 text-sm">No monthly services in catalog.</div>
          ) : (
            menu.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selected.has(m.id)}
                  onChange={() => toggle(m.id)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex-1">
                  <span className="font-medium text-slate-800">{m.name}</span>
                  <span className="text-xs text-slate-500 ml-2">[{m.category}]</span>
                </span>
                <span className="text-sm text-slate-600">{formatCents(m.monthly_cents)}/mo</span>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </div>
  )
}
