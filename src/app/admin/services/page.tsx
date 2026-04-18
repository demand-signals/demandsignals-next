'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react'

interface Service {
  id: string
  category: string
  name: string
  description: string | null
  benefit: string | null
  pricing_type: string
  base_range_low_cents: number
  base_range_high_cents: number
  display_price_cents: number
  timeline_weeks_low: number
  timeline_weeks_high: number
  active: boolean
  included_with_paid_project: boolean
  sort_order: number
}

const CATEGORY_LABELS: Record<string, string> = {
  'your-website': 'Your Website',
  'existing-site': 'Existing Site',
  'features-integrations': 'Features & Integrations',
  'get-found': 'Get Found (SEO)',
  'content-social': 'Content & Social',
  'ai-automation': 'AI Automation',
  'research-strategy': 'Research & Strategy',
  'monthly-services': 'Monthly Services',
  hosting: 'Hosting',
  'team-rates': 'Team Rates',
}

export default function ServicesCatalogPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/services-catalog?active=${showInactive ? 'false' : 'true'}`)
    const data = await res.json()
    setServices(data.services ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [showInactive])

  // Group by category.
  const grouped: Record<string, Service[]> = {}
  for (const s of services) {
    if (!grouped[s.category]) grouped[s.category] = []
    grouped[s.category].push(s)
  }

  const valueStackCount = services.filter((s) => s.included_with_paid_project).length

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Services Catalog</h1>
          <div className="text-sm text-slate-500 mt-1">
            {services.length} services ·{' '}
            <span className="text-emerald-700 font-semibold">
              {valueStackCount} in paid-project value stack
            </span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive
          </label>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 bg-teal-500 text-white rounded-lg px-4 py-2 font-semibold hover:bg-teal-600"
          >
            <Plus className="w-4 h-4" />
            New Service
          </button>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
        💡 <b>Pricing philosophy:</b> Nothing is &quot;free&quot;. Every service has a real
        price. To gift a service to a client, invoice it at full price and add a 100% discount
        line. Services flagged &quot;included with paid project&quot; auto-add to paid-project
        deposit invoices as &quot;New Client Appreciation&quot; at 100% discount.
      </div>

      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <section key={cat}>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">
                {CATEGORY_LABELS[cat] ?? cat}{' '}
                <span className="text-slate-400 font-normal">({items.length})</span>
              </h2>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="text-left px-3 py-2">ID</th>
                      <th className="text-left px-3 py-2">Name</th>
                      <th className="text-left px-3 py-2">Description</th>
                      <th className="text-right px-3 py-2">Display $</th>
                      <th className="text-right px-3 py-2">Range</th>
                      <th className="text-center px-3 py-2">Stack</th>
                      <th className="text-right px-3 py-2 w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((s) => (
                      <tr
                        key={s.id}
                        className={`border-t border-slate-100 ${
                          !s.active ? 'opacity-50' : ''
                        } ${s.included_with_paid_project ? 'bg-emerald-50/40' : ''}`}
                      >
                        <td className="px-3 py-2 font-mono text-xs">{s.id}</td>
                        <td className="px-3 py-2 font-medium">{s.name}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {s.description ?? s.benefit ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          ${(s.display_price_cents / 100).toFixed(0)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-slate-500">
                          {s.base_range_low_cents === s.base_range_high_cents
                            ? '—'
                            : `$${(s.base_range_low_cents / 100).toFixed(0)} – $${(s.base_range_high_cents / 100).toFixed(0)}`}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {s.included_with_paid_project && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => setEditingId(s.id)}
                            className="text-teal-600 hover:text-teal-700"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4 inline" />
                          </button>
                          {s.active && (
                            <button
                              onClick={async () => {
                                if (!confirm(`Deactivate ${s.name}? (Soft delete — won't affect history.)`)) return
                                await fetch(`/api/admin/services-catalog/${s.id}`, {
                                  method: 'DELETE',
                                })
                                load()
                              }}
                              className="ml-2 text-slate-400 hover:text-red-500"
                              title="Deactivate"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      {editingId && (
        <ServiceEditModal
          id={editingId}
          onClose={(refresh) => {
            setEditingId(null)
            if (refresh) load()
          }}
        />
      )}
      {creating && (
        <ServiceEditModal
          id={null}
          onClose={(refresh) => {
            setCreating(false)
            if (refresh) load()
          }}
        />
      )}
    </div>
  )
}

function ServiceEditModal({
  id,
  onClose,
}: {
  id: string | null // null = creating new
  onClose: (refresh: boolean) => void
}) {
  const [data, setData] = useState<Partial<Service>>({
    id: '',
    name: '',
    category: 'your-website',
    description: '',
    benefit: '',
    pricing_type: 'one-time',
    base_range_low_cents: 0,
    base_range_high_cents: 0,
    display_price_cents: 0,
    timeline_weeks_low: 0,
    timeline_weeks_high: 1,
    included_with_paid_project: false,
    active: true,
  })
  const [loading, setLoading] = useState(!!id)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/admin/services-catalog/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d.service ?? {})
        setLoading(false)
      })
  }, [id])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const url = id ? `/api/admin/services-catalog/${id}` : '/api/admin/services-catalog'
      const method = id ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Failed')
      onClose(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={() => onClose(false)}
    >
      <div
        className="bg-white rounded-xl p-6 max-w-2xl w-full space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold">{id ? `Edit: ${data.name}` : 'New Service'}</h2>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {!id && (
            <label className="col-span-2">
              ID (slug, url-safe, permanent)
              <input
                value={data.id ?? ''}
                onChange={(e) => setData({ ...data, id: e.target.value })}
                className="w-full border border-slate-200 rounded px-2 py-1 mt-1 font-mono"
                placeholder="logo-refresh"
              />
            </label>
          )}
          <label>
            Name
            <input
              value={data.name ?? ''}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
            />
          </label>
          <label>
            Category
            <select
              value={data.category ?? 'your-website'}
              onChange={(e) => setData({ ...data, category: e.target.value })}
              className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
            >
              {Object.entries(CATEGORY_LABELS).map(([slug, label]) => (
                <option key={slug} value={slug}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2">
            Description (shown on invoice/SOW)
            <input
              value={data.description ?? ''}
              onChange={(e) => setData({ ...data, description: e.target.value })}
              className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
              placeholder="What the client is getting."
            />
          </label>
          <label className="col-span-2">
            Benefit (one-liner for quote AI)
            <input
              value={data.benefit ?? ''}
              onChange={(e) => setData({ ...data, benefit: e.target.value })}
              className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
            />
          </label>
          <label>
            Pricing type
            <select
              value={data.pricing_type ?? 'one-time'}
              onChange={(e) => setData({ ...data, pricing_type: e.target.value })}
              className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
            >
              <option value="one-time">One-time</option>
              <option value="monthly">Monthly</option>
              <option value="both">Both</option>
            </select>
          </label>
          <label>
            Display price ($)
            <input
              type="number"
              step="1"
              value={(data.display_price_cents ?? 0) / 100}
              onChange={(e) =>
                setData({
                  ...data,
                  display_price_cents: Math.round(parseFloat(e.target.value || '0') * 100),
                })
              }
              className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
            />
          </label>
          <label>
            Base range low ($)
            <input
              type="number"
              value={(data.base_range_low_cents ?? 0) / 100}
              onChange={(e) =>
                setData({
                  ...data,
                  base_range_low_cents: Math.round(parseFloat(e.target.value || '0') * 100),
                })
              }
              className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
            />
          </label>
          <label>
            Base range high ($)
            <input
              type="number"
              value={(data.base_range_high_cents ?? 0) / 100}
              onChange={(e) =>
                setData({
                  ...data,
                  base_range_high_cents: Math.round(parseFloat(e.target.value || '0') * 100),
                })
              }
              className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
            />
          </label>
          <label>
            Timeline weeks low
            <input
              type="number"
              value={data.timeline_weeks_low ?? 0}
              onChange={(e) =>
                setData({ ...data, timeline_weeks_low: parseInt(e.target.value) || 0 })
              }
              className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
            />
          </label>
          <label>
            Timeline weeks high
            <input
              type="number"
              value={data.timeline_weeks_high ?? 0}
              onChange={(e) =>
                setData({ ...data, timeline_weeks_high: parseInt(e.target.value) || 0 })
              }
              className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
            />
          </label>
          <label className="col-span-2 flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded p-2">
            <input
              type="checkbox"
              checked={!!data.included_with_paid_project}
              onChange={(e) =>
                setData({ ...data, included_with_paid_project: e.target.checked })
              }
              className="mt-0.5"
            />
            <span>
              <b>Include in paid-project value stack</b>
              <span className="block text-xs text-slate-600">
                When checked, this auto-populates on paid-project deposit invoices as
                &quot;New Client Appreciation&quot; at 100% discount.
              </span>
            </span>
          </label>
          {id && (
            <label className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!data.active}
                onChange={(e) => setData({ ...data, active: e.target.checked })}
              />
              Active
            </label>
          )}
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div className="flex justify-end gap-2">
          <button
            onClick={() => onClose(false)}
            disabled={saving}
            className="px-4 py-2 text-sm hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !data.name || !data.category}
            className="bg-teal-500 text-white rounded-lg px-5 py-2 text-sm font-bold hover:bg-teal-600 disabled:opacity-50"
          >
            {saving ? 'Saving…' : id ? 'Save changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
