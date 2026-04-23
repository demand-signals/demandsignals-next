'use client'

import { useEffect, useState } from 'react'
import { Loader2, Pencil, Trash2, X, Check } from 'lucide-react'
import { formatCents } from '@/lib/format'

interface Plan {
  id: string
  slug: string
  name: string
  description: string | null
  price_cents: number | null
  billing_interval: string
  trial_days: number
  active: boolean
  stripe_price_id: string | null
  sort_order: number | null
}

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

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

  async function handleDelete(plan: Plan) {
    if (!confirm('Deactivate plan? (Soft delete — preserves subscription history.)')) return
    const res = await fetch(`/api/admin/subscription-plans/${plan.id}`, { method: 'DELETE' })
    if (res.ok) load()
    else {
      const d = await res.json()
      alert(d.error ?? 'Delete failed')
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Subscription Plans</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-teal-500 text-white rounded-lg px-4 py-2 font-semibold hover:bg-teal-600"
        >
          {showForm ? 'Cancel' : 'New Plan'}
        </button>
      </div>

      {showForm && (
        <NewPlanForm
          onCreated={() => {
            setShowForm(false)
            load()
          }}
        />
      )}

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
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) =>
                editingId === p.id ? (
                  <EditRow
                    key={p.id}
                    plan={p}
                    onSaved={() => {
                      setEditingId(null)
                      load()
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-mono text-xs">{p.slug}</td>
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3 text-right">
                      {p.price_cents != null ? formatCents(p.price_cents) : '—'}
                    </td>
                    <td className="px-4 py-3">{p.billing_interval}</td>
                    <td className="px-4 py-3">{p.trial_days > 0 ? `${p.trial_days}d` : '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono">
                      {p.stripe_price_id ? (
                        p.stripe_price_id.slice(0, 15) + '…'
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.active ? (
                        <span className="text-emerald-700 text-xs">active</span>
                      ) : (
                        <span className="text-slate-400 text-xs">inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingId(p.id)}
                          className="text-slate-400 hover:text-teal-600 transition-colors"
                          title="Edit plan"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                          title="Deactivate plan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Inline edit row ──────────────────────────────────────────────────

function EditRow({
  plan,
  onSaved,
  onCancel,
}: {
  plan: Plan
  onSaved: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(plan.name)
  const [description, setDescription] = useState(plan.description ?? '')
  const [priceDollars, setPriceDollars] = useState(
    plan.price_cents != null ? (plan.price_cents / 100).toFixed(2) : '',
  )
  const [interval, setInterval] = useState(plan.billing_interval)
  const [trialDays, setTrialDays] = useState(String(plan.trial_days))
  const [sortOrder, setSortOrder] = useState(String(plan.sort_order ?? 0))
  const [active, setActive] = useState(plan.active)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/subscription-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          price_cents: priceDollars ? Math.round(parseFloat(priceDollars) * 100) : undefined,
          billing_interval: interval,
          trial_days: parseInt(trialDays) || 0,
          sort_order: parseInt(sortOrder) || 0,
          active,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Failed')
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setBusy(false)
    }
  }

  return (
    <tr className="border-t border-slate-100 bg-teal-50/30">
      {/* slug — read only */}
      <td className="px-4 py-2 font-mono text-xs text-slate-400">{plan.slug}</td>

      {/* name */}
      <td className="px-4 py-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
        />
      </td>

      {/* price */}
      <td className="px-4 py-2">
        <input
          type="number"
          step="0.01"
          value={priceDollars}
          onChange={(e) => setPriceDollars(e.target.value)}
          className="w-24 border border-slate-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-teal-400"
          placeholder="0.00"
        />
      </td>

      {/* interval */}
      <td className="px-4 py-2">
        <select
          value={interval}
          onChange={(e) => setInterval(e.target.value)}
          className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
        >
          <option value="month">month</option>
          <option value="quarter">quarter</option>
          <option value="year">year</option>
        </select>
      </td>

      {/* trial days */}
      <td className="px-4 py-2">
        <input
          type="number"
          value={trialDays}
          onChange={(e) => setTrialDays(e.target.value)}
          className="w-16 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
        />
      </td>

      {/* stripe price id — read only in edit row (use Stripe dashboard) */}
      <td className="px-4 py-2 text-xs font-mono text-slate-400">
        {plan.stripe_price_id ? plan.stripe_price_id.slice(0, 15) + '…' : '—'}
      </td>

      {/* active toggle */}
      <td className="px-4 py-2">
        <label className="flex items-center gap-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="accent-teal-500"
          />
          <span className="text-xs text-slate-600">{active ? 'active' : 'inactive'}</span>
        </label>
      </td>

      {/* actions */}
      <td className="px-4 py-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={busy || !name}
              className="text-teal-600 hover:text-teal-800 disabled:opacity-40 transition-colors"
              title="Save"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>
      </td>
    </tr>
  )
}

// ── New plan form ────────────────────────────────────────────────────

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
