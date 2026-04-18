'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface Plan {
  id: string
  slug: string
  name: string
  price_cents: number
  billing_interval: string
  trial_days: number
  active: boolean
  stripe_price_id: string | null
  description: string | null
}

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/subscription-plans?active=false')
    const data = await res.json()
    setPlans(data.plans ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Subscription Plans</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-teal-500 text-white rounded-lg px-4 py-2 font-semibold hover:bg-teal-600"
        >
          {showForm ? 'Cancel' : 'New Plan'}
        </button>
      </div>

      {showForm && <NewPlanForm onCreated={() => { setShowForm(false); load() }} />}

      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      ) : plans.length === 0 ? (
        <div className="text-center p-16 text-slate-400">No plans yet</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left px-4 py-3">Slug</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-right px-4 py-3">Price</th>
                <th className="text-left px-4 py-3">Interval</th>
                <th className="text-left px-4 py-3">Trial</th>
                <th className="text-left px-4 py-3">Stripe Price</th>
                <th className="text-left px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">{p.slug}</td>
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3 text-right">${(p.price_cents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">{p.billing_interval}</td>
                  <td className="px-4 py-3">{p.trial_days > 0 ? `${p.trial_days}d` : '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono">
                    {p.stripe_price_id ? p.stripe_price_id.slice(0, 15) + '…' : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {p.active ? (
                      <span className="text-emerald-700 text-xs">active</span>
                    ) : (
                      <span className="text-slate-400 text-xs">inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function NewPlanForm({ onCreated }: { onCreated: () => void }) {
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [priceDollars, setPriceDollars] = useState('')
  const [interval, setInterval] = useState<'month' | 'quarter' | 'year'>('month')
  const [trialDays, setTrialDays] = useState('0')
  const [stripePriceId, setStripePriceId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/subscription-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name,
          description: description || undefined,
          price_cents: Math.round(parseFloat(priceDollars || '0') * 100),
          billing_interval: interval,
          trial_days: parseInt(trialDays) || 0,
          stripe_price_id: stripePriceId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setBusy(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
      <h2 className="font-semibold">New Plan</h2>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <label>
          Slug (URL-safe)
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full border border-slate-200 rounded px-2 py-1 mt-1 font-mono"
            placeholder="monthly-retainer-pro"
          />
        </label>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
            placeholder="Monthly Retainer — Pro"
          />
        </label>
        <label className="col-span-2">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
            rows={2}
          />
        </label>
        <label>
          Price ($)
          <input
            type="number"
            step="0.01"
            value={priceDollars}
            onChange={(e) => setPriceDollars(e.target.value)}
            className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
          />
        </label>
        <label>
          Interval
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value as typeof interval)}
            className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
          >
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="year">Yearly</option>
          </select>
        </label>
        <label>
          Trial days
          <input
            type="number"
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value)}
            className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
          />
        </label>
        <label>
          Stripe Price ID
          <input
            value={stripePriceId}
            onChange={(e) => setStripePriceId(e.target.value)}
            className="w-full border border-slate-200 rounded px-2 py-1 mt-1 font-mono text-xs"
            placeholder="price_1ABC…"
          />
        </label>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={busy || !slug || !name || !priceDollars}
          className="bg-teal-500 text-white rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Create Plan'}
        </button>
      </div>
    </div>
  )
}
