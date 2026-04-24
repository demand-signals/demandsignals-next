'use client'

import { useEffect, useState, useCallback } from 'react'
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
  is_retainer: boolean | null
  tier: string | null
}

type Tab = 'all' | 'retainers' | 'other'

export default function ServicePlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/subscription-plans?active=false')
    const data = await res.json()
    setPlans(data.plans ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(plan: Plan) {
    if (!confirm('Deactivate plan? (Soft delete — preserves subscription history.)')) return
    const res = await fetch(`/api/admin/subscription-plans/${plan.id}`, { method: 'DELETE' })
    if (res.ok) load()
    else {
      const d = await res.json()
      alert(d.error ?? 'Delete failed')
    }
  }

  const filtered = plans.filter((p) => {
    if (tab === 'retainers') return p.is_retainer === true
    if (tab === 'other') return !p.is_retainer
    return true
  })

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      tab === t
        ? 'bg-[var(--teal)] text-white'
        : 'text-slate-600 hover:bg-slate-100'
    }`

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Service Plans</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-[var(--teal)] text-white rounded-lg px-4 py-2 font-semibold hover:bg-[var(--teal-dark)] transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Plan'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button className={tabCls('all')} onClick={() => setTab('all')}>
          All ({plans.length})
        </button>
        <button className={tabCls('retainers')} onClick={() => setTab('retainers')}>
          Retainers ({plans.filter((p) => p.is_retainer === true).length})
        </button>
        <button className={tabCls('other')} onClick={() => setTab('other')}>
          Other ({plans.filter((p) => !p.is_retainer).length})
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
        <Loader2 className="w-6 h-6 animate-spin text-[var(--teal)]" />
      ) : filtered.length === 0 ? (
        <div className="text-center p-16 text-slate-400">No plans found</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left px-4 py-3">Tier</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Slug</th>
                <th className="text-left px-4 py-3">Interval</th>
                <th className="text-right px-4 py-3">Price</th>
                <th className="text-left px-4 py-3">Active</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) =>
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
                    <td className="px-4 py-3 text-xs">
                      {p.tier ? (
                        <span className="capitalize px-2 py-0.5 bg-teal-50 text-teal-700 rounded font-medium">
                          {p.tier.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.slug}</td>
                    <td className="px-4 py-3 text-slate-600">{p.billing_interval}</td>
                    <td className="px-4 py-3 text-right">
                      {p.price_cents != null ? formatCents(p.price_cents) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {p.active ? (
                        <span className="text-emerald-700 text-xs font-medium">active</span>
                      ) : (
                        <span className="text-slate-400 text-xs">inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingId(p.id)}
                          className="text-slate-400 hover:text-[var(--teal)] transition-colors"
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
  const [isRetainer, setIsRetainer] = useState(plan.is_retainer ?? false)
  const [tier, setTier] = useState(plan.tier ?? '')
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
          is_retainer: isRetainer,
          tier: tier || undefined,
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
      {/* tier */}
      <td className="px-4 py-2">
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
        >
          <option value="">—</option>
          <option value="essential">essential</option>
          <option value="growth">growth</option>
          <option value="full">full</option>
          <option value="site_only">site_only</option>
        </select>
      </td>

      {/* name */}
      <td className="px-4 py-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
        />
      </td>

      {/* slug — read only */}
      <td className="px-4 py-2 font-mono text-xs text-slate-400">{plan.slug}</td>

      {/* interval */}
      <td className="px-4 py-2">
        <select
          value={interval}
          onChange={(e) => setInterval(e.target.value)}
          className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
        >
          <option value="month">month</option>
          <option value="quarter">quarter</option>
          <option value="year">year</option>
        </select>
      </td>

      {/* price */}
      <td className="px-4 py-2">
        <input
          type="number"
          step="0.01"
          value={priceDollars}
          onChange={(e) => setPriceDollars(e.target.value)}
          className="w-24 border border-slate-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
          placeholder="0.00"
        />
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
              className="text-[var(--teal)] hover:text-[var(--teal-dark)] disabled:opacity-40 transition-colors"
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
  const [isRetainer, setIsRetainer] = useState(false)
  const [tier, setTier] = useState('')
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
          is_retainer: isRetainer,
          tier: tier || undefined,
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
      <h2 className="font-semibold text-slate-900">New Plan</h2>
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
        <label>
          Tier
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
          >
            <option value="">— none —</option>
            <option value="essential">essential</option>
            <option value="growth">growth</option>
            <option value="full">full</option>
            <option value="site_only">site_only</option>
          </select>
        </label>
        <label className="flex items-center gap-2 mt-1">
          <input
            type="checkbox"
            checked={isRetainer}
            onChange={(e) => setIsRetainer(e.target.checked)}
            className="accent-teal-500"
          />
          <span>Is retainer plan</span>
        </label>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={busy || !slug || !name || !priceDollars}
          className="bg-[var(--teal)] text-white rounded-lg px-4 py-2 font-semibold disabled:opacity-50 hover:bg-[var(--teal-dark)] transition-colors"
        >
          {busy ? 'Saving…' : 'Create Plan'}
        </button>
      </div>
    </div>
  )
}
