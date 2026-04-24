'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Sparkles, ChevronUp, ChevronDown } from 'lucide-react'
import { CatalogPicker, type CatalogPickerItem } from '@/components/admin/catalog-picker'
import { formatCents } from '@/lib/format'
import type { Cadence } from '@/lib/invoice-types'

interface Prospect {
  id: string
  business_name: string
}

interface StartTrigger {
  type: 'on_phase_complete' | 'date'
  phase_id?: string | null
  date?: string | null
}

interface PhaseDeliverable {
  id: string
  service_id?: string | null
  name: string
  description: string
  cadence: Cadence
  quantity: number
  hours: number | null
  unit_price_cents: number
  unit_price_input: string  // raw string for the price input; committed to cents on blur
  start_trigger?: StartTrigger
}

interface SowPhase {
  id: string
  name: string
  description: string
  deliverables: PhaseDeliverable[]
}

const CADENCE_LABELS: Record<Cadence, string> = {
  one_time: 'One-time',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
}

const CADENCE_SUFFIX: Record<Cadence, string> = {
  one_time: '',
  monthly: '/mo',
  quarterly: '/qtr',
  annual: '/yr',
}

function newId(): string {
  return crypto.randomUUID()
}

function computeLineCents(d: PhaseDeliverable): number {
  const qty = d.hours != null ? d.hours : d.quantity
  return Math.round((qty || 0) * (d.unit_price_cents || 0))
}

// ── Cadence pick modal for 'both' pricing_type catalog items ──────────

function CadencePickModal({
  item,
  onConfirm,
  onCancel,
}: {
  item: CatalogPickerItem
  onConfirm: (cadence: Cadence, unitPrice: number) => void
  onCancel: () => void
}) {
  const [cadence, setCadence] = useState<Cadence>(
    item.pricing_type === 'monthly' ? 'monthly' : 'one_time',
  )
  const price =
    cadence === 'one_time'
      ? item.display_price_cents
      : item.monthly_range_low_cents ?? item.display_price_cents

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4">
        <h2 className="text-base font-bold">Choose cadence for "{item.name}"</h2>
        <div className="space-y-2 text-sm">
          {(['one_time', 'monthly', 'quarterly', 'annual'] as Cadence[]).map((c) => (
            <label key={c} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="cadence"
                value={c}
                checked={cadence === c}
                onChange={() => setCadence(c)}
              />
              <span>{CADENCE_LABELS[c]}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-slate-500">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(cadence, price)}
            className="bg-teal-500 text-white rounded px-4 py-1.5 text-sm font-bold"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NewSowPage() {
  const router = useRouter()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [prospectId, setProspectId] = useState('')
  const [title, setTitle] = useState('')
  const [scopeSummary, setScopeSummary] = useState('')
  const [phases, setPhases] = useState<SowPhase[]>([
    { id: newId(), name: 'Phase 1', description: '', deliverables: [] },
  ])
  const [depositPct, setDepositPct] = useState('25')
  const [paymentTerms, setPaymentTerms] = useState(
    'Net 30. 25% deposit on acceptance; remainder on delivery.',
  )
  const [guarantees, setGuarantees] = useState('')
  const [notes, setNotes] = useState('')
  const [tradeCents, setTradeCents] = useState(0)
  const [tradeAmountInput, setTradeAmountInput] = useState('0.00')
  const [tradeDescription, setTradeDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cadence modal for 'both' pricing_type
  const [pendingCatalogItem, setPendingCatalogItem] = useState<{
    item: CatalogPickerItem
    phaseId: string
  } | null>(null)

  useEffect(() => {
    fetch('/api/admin/prospects?limit=200')
      .then((r) => r.json())
      .then((d) => setProspects(d.data ?? []))
  }, [])

  // ── Phase helpers ─────────────────────────────────────────────────

  function addPhase() {
    setPhases((prev) => [
      ...prev,
      { id: newId(), name: `Phase ${prev.length + 1}`, description: '', deliverables: [] },
    ])
  }

  function updatePhase(phaseId: string, patch: Partial<Omit<SowPhase, 'deliverables'>>) {
    setPhases((prev) => prev.map((p) => (p.id === phaseId ? { ...p, ...patch } : p)))
  }

  function removePhase(phaseId: string) {
    setPhases((prev) => prev.filter((p) => p.id !== phaseId))
  }

  function movePhase(idx: number, dir: -1 | 1) {
    setPhases((prev) => {
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  // ── Deliverable helpers ───────────────────────────────────────────

  function addDeliverable(phaseId: string) {
    setPhases((prev) =>
      prev.map((p) =>
        p.id === phaseId
          ? {
              ...p,
              deliverables: [
                ...p.deliverables,
                {
                  id: newId(),
                  service_id: null,
                  name: '',
                  description: '',
                  cadence: 'one_time' as Cadence,
                  quantity: 1,
                  hours: null,
                  unit_price_cents: 0,
                  unit_price_input: '0.00',
                },
              ],
            }
          : p,
      ),
    )
  }

  function addDeliverableFromCatalog(phaseId: string, item: CatalogPickerItem, cadence: Cadence, unitPrice: number) {
    setPhases((prev) =>
      prev.map((p) =>
        p.id === phaseId
          ? {
              ...p,
              deliverables: [
                ...p.deliverables,
                {
                  id: newId(),
                  service_id: item.id,
                  name: item.name,
                  description: item.description ?? item.benefit ?? '',
                  cadence,
                  quantity: 1,
                  hours: null,
                  unit_price_cents: unitPrice,
                  unit_price_input: (unitPrice / 100).toFixed(2),
                },
              ],
            }
          : p,
      ),
    )
  }

  function updateDeliverable(phaseId: string, delivId: string, patch: Partial<PhaseDeliverable>) {
    setPhases((prev) =>
      prev.map((p) =>
        p.id === phaseId
          ? {
              ...p,
              deliverables: p.deliverables.map((d) =>
                d.id === delivId ? { ...d, ...patch } : d,
              ),
            }
          : p,
      ),
    )
  }

  function removeDeliverable(phaseId: string, delivId: string) {
    setPhases((prev) =>
      prev.map((p) =>
        p.id === phaseId
          ? { ...p, deliverables: p.deliverables.filter((d) => d.id !== delivId) }
          : p,
      ),
    )
  }

  function moveDeliverable(phaseId: string, idx: number, dir: -1 | 1) {
    setPhases((prev) =>
      prev.map((p) => {
        if (p.id !== phaseId) return p
        const dels = [...p.deliverables]
        const target = idx + dir
        if (target < 0 || target >= dels.length) return p
        ;[dels[idx], dels[target]] = [dels[target], dels[idx]]
        return { ...p, deliverables: dels }
      }),
    )
  }

  function handleCatalogPick(phaseId: string, item: CatalogPickerItem) {
    if (item.pricing_type === 'both') {
      setPendingCatalogItem({ item, phaseId })
      return
    }
    const cadence: Cadence = item.pricing_type === 'monthly' ? 'monthly' : 'one_time'
    const unitPrice =
      cadence === 'monthly'
        ? (item.monthly_range_low_cents ?? item.display_price_cents)
        : item.display_price_cents
    addDeliverableFromCatalog(phaseId, item, cadence, unitPrice)
  }

  // ── Computed totals ───────────────────────────────────────────────

  const allDeliverables = phases.flatMap((p) => p.deliverables)
  const oneTimeTotalCents = allDeliverables
    .filter((d) => d.cadence === 'one_time')
    .reduce((s, d) => s + computeLineCents(d), 0)
  const monthlyTotalCents = allDeliverables
    .filter((d) => d.cadence === 'monthly')
    .reduce((s, d) => s + computeLineCents(d), 0)
  const quarterlyTotalCents = allDeliverables
    .filter((d) => d.cadence === 'quarterly')
    .reduce((s, d) => s + computeLineCents(d), 0)
  const annualTotalCents = allDeliverables
    .filter((d) => d.cadence === 'annual')
    .reduce((s, d) => s + computeLineCents(d), 0)

  const pct = parseInt(depositPct) || 25
  const cashTotalCents = Math.max(0, oneTimeTotalCents - tradeCents)
  const depositCents = Math.round((cashTotalCents * pct) / 100)
  const balanceCents = cashTotalCents - depositCents

  // ── Save ──────────────────────────────────────────────────────────

  async function save(andSend: boolean) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/sow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          prospect_id: prospectId || undefined,
          scope_summary: scopeSummary || undefined,
          phases,
          // Legacy fields kept for backward compat
          deliverables: allDeliverables
            .filter((d) => d.cadence === 'one_time' && d.name.trim())
            .map((d) => ({
              name: d.name,
              description: d.description,
              quantity: d.hours == null ? d.quantity : undefined,
              hours: d.hours ?? undefined,
              unit_price_cents: d.unit_price_cents || undefined,
              line_total_cents: computeLineCents(d),
            })),
          timeline: [],
          pricing: {
            total_cents: oneTimeTotalCents,
            deposit_cents: depositCents,
            deposit_pct: pct,
          },
          payment_terms: paymentTerms || undefined,
          guarantees: guarantees || undefined,
          notes: notes || undefined,
          computed_from_deliverables: true,
          trade_credit_cents: tradeCents > 0 ? tradeCents : undefined,
          trade_credit_description: tradeDescription || undefined,
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

      {/* Basics */}
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

      {/* Phases */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Phases</h2>
          <button
            onClick={addPhase}
            className="text-xs bg-slate-100 hover:bg-slate-200 rounded px-3 py-1.5 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add phase
          </button>
        </div>

        {phases.map((phase, phaseIdx) => (
          <div
            key={phase.id}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden"
          >
            {/* Phase header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
              <input
                value={phase.name}
                onChange={(e) => updatePhase(phase.id, { name: e.target.value })}
                placeholder="Phase name"
                className="flex-1 border-0 bg-transparent font-semibold focus:outline-none"
              />
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => movePhase(phaseIdx, -1)}
                  disabled={phaseIdx === 0}
                  className="text-slate-400 hover:text-slate-600 disabled:opacity-25"
                  title="Move phase up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => movePhase(phaseIdx, 1)}
                  disabled={phaseIdx === phases.length - 1}
                  className="text-slate-400 hover:text-slate-600 disabled:opacity-25"
                  title="Move phase down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                {phases.length > 1 && (
                  <button
                    onClick={() => removePhase(phase.id)}
                    className="text-slate-300 hover:text-red-500 ml-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 space-y-3">
              <input
                value={phase.description}
                onChange={(e) => updatePhase(phase.id, { description: e.target.value })}
                placeholder="Phase description (optional)"
                className="w-full border border-slate-200 rounded px-2 py-1 text-sm"
              />

              {/* Deliverables */}
              {phase.deliverables.map((d, delivIdx) => {
                const lineCents = computeLineCents(d)
                const suffix = CADENCE_SUFFIX[d.cadence]
                return (
                  <div
                    key={d.id}
                    className={`border border-slate-100 rounded p-3 space-y-2 text-sm ${
                      d.service_id ? 'bg-teal-50/30' : ''
                    }`}
                  >
                    <div className="flex gap-2 items-start">
                      {d.service_id && (
                        <span title="From catalog" className="pt-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                        </span>
                      )}
                      <input
                        value={d.name}
                        onChange={(e) => updateDeliverable(phase.id, d.id, { name: e.target.value })}
                        placeholder="Item name"
                        className="flex-1 border border-slate-200 rounded px-2 py-1 font-medium"
                      />
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => moveDeliverable(phase.id, delivIdx, -1)}
                          disabled={delivIdx === 0}
                          className="text-slate-400 hover:text-slate-600 disabled:opacity-25"
                          title="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveDeliverable(phase.id, delivIdx, 1)}
                          disabled={delivIdx === phase.deliverables.length - 1}
                          className="text-slate-400 hover:text-slate-600 disabled:opacity-25"
                          title="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeDeliverable(phase.id, d.id)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={d.description}
                      onChange={(e) => updateDeliverable(phase.id, d.id, { description: e.target.value })}
                      placeholder="Description"
                      rows={2}
                      className="w-full border border-slate-200 rounded px-2 py-1"
                    />
                    <div className="grid grid-cols-5 gap-2">
                      <label className="text-xs">
                        Cadence
                        <select
                          value={d.cadence}
                          onChange={(e) =>
                            updateDeliverable(phase.id, d.id, { cadence: e.target.value as Cadence })
                          }
                          className="w-full border border-slate-200 rounded px-2 py-1 mt-0.5"
                        >
                          {(Object.keys(CADENCE_LABELS) as Cadence[]).map((c) => (
                            <option key={c} value={c}>
                              {CADENCE_LABELS[c]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs">
                        Qty
                        <input
                          type="number"
                          min="1"
                          value={d.quantity}
                          onChange={(e) =>
                            updateDeliverable(phase.id, d.id, {
                              quantity: Math.max(1, parseInt(e.target.value) || 1),
                            })
                          }
                          className="w-full border border-slate-200 rounded px-2 py-1 mt-0.5"
                        />
                      </label>
                      <label className="text-xs">
                        Hours (optional)
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          value={d.hours ?? ''}
                          placeholder="—"
                          onChange={(e) =>
                            updateDeliverable(phase.id, d.id, {
                              hours: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          className="w-full border border-slate-200 rounded px-2 py-1 mt-0.5"
                        />
                      </label>
                      <label className="text-xs">
                        {d.hours != null ? 'Rate $/hr' : 'Unit $'}
                        {suffix && <span className="text-teal-600 ml-1">{suffix}</span>}
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={d.unit_price_input}
                          onChange={(e) =>
                            updateDeliverable(phase.id, d.id, {
                              unit_price_input: e.target.value,
                            })
                          }
                          onBlur={(e) => {
                            const cents = Math.round(parseFloat(e.target.value || '0') * 100)
                            updateDeliverable(phase.id, d.id, {
                              unit_price_cents: cents,
                              unit_price_input: (cents / 100).toFixed(2),
                            })
                          }}
                          className="w-full border border-slate-200 rounded px-2 py-1 mt-0.5"
                        />
                      </label>
                      <div className="text-xs">
                        Line total
                        <div className="pt-1.5 font-semibold">
                          {lineCents > 0 ? (
                            <>
                              {formatCents(lineCents)}
                              {suffix && <span className="text-teal-600 ml-0.5">{suffix}</span>}
                            </>
                          ) : (
                            '—'
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Add deliverable actions */}
              <div className="space-y-2">
                <div className="text-xs text-slate-400 font-semibold uppercase">
                  Add from catalog
                </div>
                <CatalogPicker
                  onPick={(item) => handleCatalogPick(phase.id, item)}
                  placeholder="Search catalog to add as a deliverable…"
                />
                <button
                  onClick={() => addDeliverable(phase.id)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  + ad-hoc deliverable
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Pricing summary */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 text-sm">
        <h2 className="font-semibold">Pricing</h2>
        <div className="space-y-1 text-sm">
          {oneTimeTotalCents > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">One-time project total</span>
              <span className="font-semibold">{formatCents(oneTimeTotalCents)}</span>
            </div>
          )}
          {monthlyTotalCents > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">Monthly recurring</span>
              <span className="font-semibold text-teal-700">{formatCents(monthlyTotalCents)}/mo</span>
            </div>
          )}
          {quarterlyTotalCents > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">Quarterly recurring</span>
              <span className="font-semibold text-teal-700">{formatCents(quarterlyTotalCents)}/qtr</span>
            </div>
          )}
          {annualTotalCents > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">Annual recurring</span>
              <span className="font-semibold text-teal-700">{formatCents(annualTotalCents)}/yr</span>
            </div>
          )}
        </div>
        {/* TIK block */}
        <div className="pt-4 border-t border-slate-100">
          <div className="text-xs uppercase text-slate-500 mb-2">Trade-in-Kind (TIK)</div>
          <p className="text-xs text-slate-500 mb-2">
            Amount the client will pay in trade (goods/services delivered to DSIG) instead of cash.
            Reduces cash owed. Recorded as a credit until client delivers the trade.
          </p>
          <div className="grid grid-cols-[1fr_180px] gap-3">
            <label className="text-xs">
              Trade description
              <input
                type="text"
                value={tradeDescription}
                onChange={(e) => setTradeDescription(e.target.value)}
                placeholder="e.g. 10 hours mobile mechanic work"
                className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
              />
            </label>
            <label className="text-xs">
              Trade amount ($)
              <input
                type="text"
                inputMode="decimal"
                value={tradeAmountInput}
                onChange={(e) => setTradeAmountInput(e.target.value)}
                onBlur={() => {
                  const cents = Math.round(parseFloat(tradeAmountInput || '0') * 100)
                  setTradeCents(cents)
                  setTradeAmountInput((cents / 100).toFixed(2))
                }}
                className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
              />
            </label>
          </div>
        </div>

        {/* Pricing totals */}
        {oneTimeTotalCents > 0 && (
          <div className="space-y-1 text-sm pt-2 border-t border-slate-100">
            <div className="flex justify-between">
              <span className="text-slate-600">One-time project total</span>
              <span className="font-semibold">{formatCents(oneTimeTotalCents)}</span>
            </div>
            {tradeCents > 0 && (
              <>
                <div className="flex justify-between text-amber-700">
                  <span>Trade-in-Kind credit</span>
                  <span className="font-semibold">−{formatCents(tradeCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Cash project total</span>
                  <span className="font-semibold">{formatCents(cashTotalCents)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-slate-500">
              <span>Deposit ({pct}%)</span>
              <span>{formatCents(depositCents)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Balance on delivery</span>
              <span>{formatCents(balanceCents)}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label>
            Deposit %
            <input
              type="number"
              value={depositPct}
              onChange={(e) => setDepositPct(e.target.value)}
              className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
            />
          </label>
          <div>
            Deposit amount
            <div className="mt-1 font-semibold">{formatCents(depositCents)}</div>
          </div>
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
          disabled={busy || !title}
          className="bg-slate-100 hover:bg-slate-200 rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save as draft'}
        </button>
        <button
          onClick={() => save(true)}
          disabled={busy || !title}
          className="bg-teal-500 text-white rounded-lg px-4 py-2 font-semibold hover:bg-teal-600 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Send'}
        </button>
      </div>

      {/* Cadence picker modal */}
      {pendingCatalogItem && (
        <CadencePickModal
          item={pendingCatalogItem.item}
          onConfirm={(cadence, unitPrice) => {
            addDeliverableFromCatalog(pendingCatalogItem.phaseId, pendingCatalogItem.item, cadence, unitPrice)
            setPendingCatalogItem(null)
          }}
          onCancel={() => setPendingCatalogItem(null)}
        />
      )}
    </div>
  )
}
