'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Sparkles } from 'lucide-react'
import { CatalogPicker, type CatalogPickerItem } from '@/components/admin/catalog-picker'

interface Prospect {
  id: string
  business_name: string
}

interface Deliverable {
  name: string
  description: string
  acceptance_criteria: string
  catalog_item_id?: string | null
}
interface Phase {
  name: string
  duration_weeks: number
  description: string
}

export default function NewSowPage() {
  const router = useRouter()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [prospectId, setProspectId] = useState('')
  const [title, setTitle] = useState('')
  const [scopeSummary, setScopeSummary] = useState('')
  const [deliverables, setDeliverables] = useState<Deliverable[]>([
    { name: '', description: '', acceptance_criteria: '' },
  ])
  const [timeline, setTimeline] = useState<Phase[]>([
    { name: '', duration_weeks: 1, description: '' },
  ])
  const [totalDollars, setTotalDollars] = useState('')
  const [depositPct, setDepositPct] = useState('25')
  const [paymentTerms, setPaymentTerms] = useState(
    'Net 30. 25% deposit on acceptance; remainder on delivery.',
  )
  const [guarantees, setGuarantees] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/prospects?limit=200')
      .then((r) => r.json())
      .then((d) => setProspects(d.data ?? []))
  }, [])

  function addDeliverable() {
    setDeliverables((d) => [...d, { name: '', description: '', acceptance_criteria: '' }])
  }
  function addDeliverableFromCatalog(item: CatalogPickerItem) {
    setDeliverables((d) => [
      ...d,
      {
        name: item.name,
        description: item.description ?? item.benefit ?? '',
        acceptance_criteria: 'Delivered + client review',
        catalog_item_id: item.id,
      },
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

  async function save(andSend: boolean) {
    setBusy(true)
    setError(null)
    try {
      const total_cents = Math.round(parseFloat(totalDollars || '0') * 100)
      const deposit_pct = parseInt(depositPct) || 25
      const deposit_cents = Math.round((total_cents * deposit_pct) / 100)

      const res = await fetch('/api/admin/sow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          prospect_id: prospectId || undefined,
          scope_summary: scopeSummary || undefined,
          deliverables: deliverables.filter((d) => d.name.trim()),
          timeline: timeline.filter((p) => p.name.trim()),
          pricing: { total_cents, deposit_cents, deposit_pct },
          payment_terms: paymentTerms || undefined,
          guarantees: guarantees || undefined,
          notes: notes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      if (andSend) {
        const sendRes = await fetch(`/api/admin/sow/${data.sow.id}/send`, { method: 'POST' })
        const sendData = await sendRes.json()
        if (!sendRes.ok) throw new Error(sendData.error ?? 'Send failed')
      }
      router.push(`/admin/sow/${data.sow.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setBusy(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900">New SOW</h1>

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 text-sm">
        <h2 className="font-semibold">Basics</h2>
        <label className="block">
          Prospect
          <select
            value={prospectId}
            onChange={(e) => setProspectId(e.target.value)}
            className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
          >
            <option value="">— none —</option>
            {prospects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.business_name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
            placeholder="Website Rebuild + AI Content Engine"
          />
        </label>
        <label className="block">
          Scope summary
          <textarea
            value={scopeSummary}
            onChange={(e) => setScopeSummary(e.target.value)}
            className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
            rows={3}
          />
        </label>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Deliverables</h2>
          <button onClick={addDeliverable} className="text-xs text-slate-500 hover:text-slate-700">
            + ad-hoc
          </button>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-slate-500 font-semibold uppercase">Add from catalog</div>
          <CatalogPicker
            onPick={addDeliverableFromCatalog}
            placeholder="Search catalog to add as a deliverable…"
          />
        </div>

        {deliverables.filter((d) => d.name || d.description).length === 0 && (
          <div className="text-xs text-slate-400 italic">No deliverables yet. Pick from catalog above, or add ad-hoc.</div>
        )}

        {deliverables.map((d, idx) => (
          <div
            key={idx}
            className={`border border-slate-100 rounded p-3 space-y-2 ${
              d.catalog_item_id ? 'bg-teal-50/30' : ''
            }`}
          >
            <div className="flex gap-2 items-start">
              {d.catalog_item_id && (
                <span title="From catalog" className="pt-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                </span>
              )}
              <input
                value={d.name}
                onChange={(e) => updateDeliverable(idx, { name: e.target.value })}
                placeholder="Name (e.g. Next.js Website)"
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
          </div>
        ))}
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Timeline</h2>
          <button onClick={addPhase} className="text-xs bg-slate-100 hover:bg-slate-200 rounded px-3 py-1">
            <Plus className="w-3 h-3 inline" /> Add phase
          </button>
        </div>
        {timeline.map((p, idx) => (
          <div key={idx} className="border border-slate-100 rounded p-3 space-y-2">
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
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 text-sm">
        <h2 className="font-semibold">Pricing</h2>
        <div className="grid grid-cols-2 gap-3">
          <label>
            Total ($)
            <input
              type="number"
              step="0.01"
              value={totalDollars}
              onChange={(e) => setTotalDollars(e.target.value)}
              className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
            />
          </label>
          <label>
            Deposit %
            <input
              type="number"
              value={depositPct}
              onChange={(e) => setDepositPct(e.target.value)}
              className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
            />
          </label>
        </div>
        <label className="block">
          Payment terms
          <textarea
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            rows={2}
            className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
          />
        </label>
        <label className="block">
          Guarantees
          <textarea
            value={guarantees}
            onChange={(e) => setGuarantees(e.target.value)}
            rows={2}
            className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
          />
        </label>
        <label className="block">
          Notes (shown at bottom of SOW)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
          />
        </label>
      </section>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="flex gap-3">
        <button
          onClick={() => save(false)}
          disabled={busy || !title || !totalDollars}
          className="bg-slate-100 hover:bg-slate-200 rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save as draft'}
        </button>
        <button
          onClick={() => save(true)}
          disabled={busy || !title || !totalDollars}
          className="bg-teal-500 text-white rounded-lg px-4 py-2 font-semibold hover:bg-teal-600 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Send'}
        </button>
      </div>
    </div>
  )
}
