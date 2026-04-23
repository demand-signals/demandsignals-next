'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { formatCents } from '@/lib/format'

interface Deliverable {
  name: string
  description: string
  acceptance_criteria: string
  quantity: number
  hours: number | null
  unit_price_cents: number
}
interface Phase {
  name: string
  duration_weeks: number
  description: string
}

interface SowData {
  id: string
  status: string
  title: string
  scope_summary: string | null
  deliverables: Array<{
    name: string
    description: string
    acceptance_criteria?: string
    quantity?: number
    hours?: number
    unit_price_cents?: number
    line_total_cents?: number
  }>
  timeline: Array<{ name: string; duration_weeks: number; description: string }>
  pricing: { total_cents: number; deposit_cents: number; deposit_pct: number }
  payment_terms: string | null
  guarantees: string | null
  notes: string | null
}

interface Props {
  sow: SowData
  onSaved: () => void
  onCancel: () => void
}

export default function EditClient({ sow, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState(sow.title)
  const [scopeSummary, setScopeSummary] = useState(sow.scope_summary ?? '')
  const [deliverables, setDeliverables] = useState<Deliverable[]>(() =>
    sow.deliverables.map((d) => ({
      name: d.name,
      description: d.description,
      acceptance_criteria: d.acceptance_criteria ?? '',
      quantity: d.quantity ?? 1,
      hours: d.hours ?? null,
      unit_price_cents: d.unit_price_cents ?? 0,
    })),
  )
  const [computeFromDeliverables, setComputeFromDeliverables] = useState(true)
  const [timeline, setTimeline] = useState<Phase[]>(() =>
    sow.timeline.map((p) => ({ name: p.name, duration_weeks: p.duration_weeks, description: p.description })),
  )
  const [depositPct, setDepositPct] = useState(() => String(sow.pricing.deposit_pct ?? 25))
  const [totalDollars, setTotalDollars] = useState(() => (sow.pricing.total_cents / 100).toFixed(2))
  const [paymentTerms, setPaymentTerms] = useState(sow.payment_terms ?? '')
  const [guarantees, setGuarantees] = useState(sow.guarantees ?? '')
  const [notes, setNotes] = useState(sow.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const computedTotalCents = deliverables.reduce(
    (s, d) => s + Math.round(((d.hours ?? d.quantity) || 0) * (d.unit_price_cents || 0)),
    0,
  )

  function addDeliverable() {
    setDeliverables((d) => [
      ...d,
      { name: '', description: '', acceptance_criteria: '', quantity: 1, hours: null, unit_price_cents: 0 },
    ])
  }
  function updateDeliverable(idx: number, patch: Partial<Deliverable>) {
    setDeliverables((d) => d.map((x, i) => (i === idx ? { ...x, ...patch } : x)))
  }
  function removeDeliverable(idx: number) {
    setDeliverables((d) => d.filter((_, i) => i !== idx))
  }

  function addPhase() {
    setTimeline((t) => [...t, { name: '', duration_weeks: 1, description: '' }])
  }
  function updatePhase(idx: number, patch: Partial<Phase>) {
    setTimeline((t) => t.map((x, i) => (i === idx ? { ...x, ...patch } : x)))
  }
  function removePhase(idx: number) {
    setTimeline((t) => t.filter((_, i) => i !== idx))
  }

  async function save(forceEdit = false) {
    setBusy(true)
    setError(null)
    try {
      const total_cents = computeFromDeliverables
        ? computedTotalCents
        : Math.round(parseFloat(totalDollars || '0') * 100)
      const pct = parseFloat(depositPct) || 25
      const deposit_cents = Math.round(total_cents * pct / 100)

      const body: Record<string, unknown> = {
        title,
        scope_summary: scopeSummary,
        computed_from_deliverables: computeFromDeliverables,
        deliverables: deliverables.map((d) => ({
          name: d.name,
          description: d.description,
          acceptance_criteria: d.acceptance_criteria || undefined,
          quantity: d.hours == null ? d.quantity : undefined,
          hours: d.hours ?? undefined,
          unit_price_cents: d.unit_price_cents || undefined,
        })),
        timeline: timeline.map((p) => ({
          name: p.name,
          duration_weeks: p.duration_weeks,
          description: p.description,
        })),
        pricing: { total_cents, deposit_cents, deposit_pct: pct },
        payment_terms: paymentTerms,
        guarantees,
        notes,
      }
      if (forceEdit) body.force_edit = true

      const res = await fetch(`/api/admin/sow/${sow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 409 && !forceEdit) {
        if (confirm('SOW is sent/accepted — force edit anyway?')) {
          setBusy(false)
          return save(true)
        }
        setBusy(false)
        return
      }

      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Save failed')
        setBusy(false)
        return
      }

      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 text-sm">
      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-slate-200 rounded px-3 py-1.5"
        />
      </div>

      {/* Scope */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Scope summary</label>
        <textarea
          value={scopeSummary}
          onChange={(e) => setScopeSummary(e.target.value)}
          rows={3}
          className="w-full border border-slate-200 rounded px-3 py-1.5"
        />
      </div>

      {/* Deliverables */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold">Deliverables</span>
          <button onClick={addDeliverable} className="text-xs bg-slate-100 hover:bg-slate-200 rounded px-3 py-1">
            <Plus className="w-3 h-3 inline" /> Add
          </button>
        </div>
        {deliverables.map((d, idx) => (
          <div key={idx} className="border border-slate-100 rounded p-3 space-y-2 mb-2">
            <div className="flex gap-2">
              <input
                value={d.name}
                onChange={(e) => updateDeliverable(idx, { name: e.target.value })}
                placeholder="Name"
                className="flex-1 border border-slate-200 rounded px-2 py-1 font-medium"
              />
              <button onClick={() => removeDeliverable(idx)} className="text-slate-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={d.description}
              onChange={(e) => updateDeliverable(idx, { description: e.target.value })}
              placeholder="Description"
              rows={2}
              className="w-full border border-slate-200 rounded px-2 py-1"
            />
            <input
              value={d.acceptance_criteria}
              onChange={(e) => updateDeliverable(idx, { acceptance_criteria: e.target.value })}
              placeholder="Acceptance criteria"
              className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
            />
            <div className="grid grid-cols-4 gap-2">
              <label className="text-xs">
                Qty
                <input
                  type="number"
                  min="1"
                  value={d.quantity}
                  onChange={(e) => updateDeliverable(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full border border-slate-200 rounded px-2 py-1"
                />
              </label>
              <label className="text-xs">
                Hours (opt)
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={d.hours ?? ''}
                  placeholder="—"
                  onChange={(e) => updateDeliverable(idx, { hours: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full border border-slate-200 rounded px-2 py-1"
                />
              </label>
              <label className="text-xs">
                {d.hours != null ? 'Rate $/hr' : 'Unit $'}
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={(d.unit_price_cents / 100).toFixed(2)}
                  onChange={(e) => updateDeliverable(idx, { unit_price_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                  className="w-full border border-slate-200 rounded px-2 py-1"
                />
              </label>
              <div className="text-xs">
                Line total
                <div className="pt-1 font-semibold">
                  {formatCents(Math.round(((d.hours ?? d.quantity) * d.unit_price_cents) || 0))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold">Timeline</span>
          <button onClick={addPhase} className="text-xs bg-slate-100 hover:bg-slate-200 rounded px-3 py-1">
            <Plus className="w-3 h-3 inline" /> Add phase
          </button>
        </div>
        {timeline.map((p, idx) => (
          <div key={idx} className="border border-slate-100 rounded p-3 space-y-2 mb-2">
            <div className="flex gap-2">
              <input
                value={p.name}
                onChange={(e) => updatePhase(idx, { name: e.target.value })}
                placeholder="Phase name"
                className="flex-1 border border-slate-200 rounded px-2 py-1 font-medium"
              />
              <input
                type="number"
                value={p.duration_weeks}
                onChange={(e) => updatePhase(idx, { duration_weeks: parseInt(e.target.value) || 1 })}
                placeholder="Weeks"
                className="w-20 border border-slate-200 rounded px-2 py-1 text-right"
              />
              <button onClick={() => removePhase(idx)} className="text-slate-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <input
              value={p.description}
              onChange={(e) => updatePhase(idx, { description: e.target.value })}
              placeholder="Description"
              className="w-full border border-slate-200 rounded px-2 py-1"
            />
          </div>
        ))}
      </div>

      {/* Pricing */}
      <div className="space-y-2">
        <span className="font-semibold">Pricing</span>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="edit-compute"
            checked={computeFromDeliverables}
            onChange={(e) => {
              setComputeFromDeliverables(e.target.checked)
              if (e.target.checked) setTotalDollars((computedTotalCents / 100).toFixed(2))
            }}
          />
          <label htmlFor="edit-compute" className="text-xs">
            Compute total from deliverables (currently {formatCents(computedTotalCents)})
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs">
            Total ($)
            <input
              type="number"
              step="0.01"
              readOnly={computeFromDeliverables}
              value={computeFromDeliverables ? (computedTotalCents / 100).toFixed(2) : totalDollars}
              onChange={(e) => setTotalDollars(e.target.value)}
              className={`w-full border border-slate-200 rounded px-2 py-1 mt-1${computeFromDeliverables ? ' bg-slate-50' : ''}`}
            />
          </label>
          <label className="block text-xs">
            Deposit %
            <input
              type="number"
              value={depositPct}
              onChange={(e) => setDepositPct(e.target.value)}
              className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
            />
          </label>
        </div>
      </div>

      {/* Payment terms / guarantees / notes */}
      <label className="block">
        <span className="text-xs font-medium text-slate-600">Payment terms</span>
        <textarea
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value)}
          rows={2}
          className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-slate-600">Guarantees</span>
        <textarea
          value={guarantees}
          onChange={(e) => setGuarantees(e.target.value)}
          rows={2}
          className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-slate-600">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
        />
      </label>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={busy}
          className="bg-slate-100 hover:bg-slate-200 rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={() => save()}
          disabled={busy || !title}
          className="bg-teal-500 text-white rounded-lg px-4 py-2 font-semibold hover:bg-teal-600 disabled:opacity-50 flex items-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
