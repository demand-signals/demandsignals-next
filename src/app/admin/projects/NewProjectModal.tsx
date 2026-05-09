'use client'

// /admin/projects/new — modal-style project creation form.
//
// Shape: project = SOW minus client-acceptance step. Same phases +
// nested deliverables data model (ProjectPhase[] / ProjectPhaseDeliverable[]
// in invoice-types.ts), populated through a UI modeled on /admin/sow/new.
//
// What this form DOES:
//   - Capture name, type, status, dates, prospect, scope summary, notes
//   - Capture phases ordered with up/down/remove
//   - Per-phase deliverables (catalog-picked or ad-hoc) with cadence,
//     quantity, hours, unit price; computes line totals client-side
//   - POST to /api/admin/projects with phases jsonb populated
//
// What this form does NOT do:
//   - No payment plan / deposit / installment configuration. SOWs do
//     that. Direct-entry projects fall under existing subscriptions or
//     get one-off invoices created separately.
//   - No client send / approval. Admin enters, project is active.
//   - No PDF render. Reports are generated separately when needed.
//
// type='customer_service' / 'bug_report' / 'internal' / 'courtesy' are
// valid values per /api/admin/projects ALLOWED_TYPES expansion.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Trash2, Sparkles, ChevronUp, ChevronDown } from 'lucide-react'
import { CatalogPicker, type CatalogPickerItem } from '@/components/admin/catalog-picker'
import { formatCents } from '@/lib/format'
import type { Cadence } from '@/lib/invoice-types'

const TYPES = [
  'website', 'mobile_app', 'webapp', 'content', 'seo', 'ads', 'consulting',
  'customer_service', 'bug_report', 'internal', 'courtesy', 'other',
] as const
const STATUSES = ['active', 'planning', 'in_progress', 'on_hold', 'completed', 'cancelled'] as const

const TYPE_LABELS: Record<(typeof TYPES)[number], string> = {
  website: 'Website',
  mobile_app: 'Mobile App',
  webapp: 'Web App',
  content: 'Content',
  seo: 'SEO',
  ads: 'Ads',
  consulting: 'Consulting',
  customer_service: 'Customer Service',
  bug_report: 'Bug Report',
  internal: 'Internal',
  courtesy: 'Courtesy',
  other: 'Other',
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

interface ProspectOption {
  id: string
  business_name: string
  client_code: string | null
  is_client: boolean
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
  unit_price_input: string
  status: 'pending' | 'delivered'
}

interface ProjectPhase {
  id: string
  name: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  deliverables: PhaseDeliverable[]
}

function newId(): string {
  return crypto.randomUUID()
}

function computeLineCents(d: PhaseDeliverable): number {
  const qty = d.hours != null ? d.hours : d.quantity
  return Math.round((qty || 0) * (d.unit_price_cents || 0))
}

// Build the jsonb shape the projects API expects (matches ProjectPhase /
// ProjectPhaseDeliverable in invoice-types.ts — `unit_price_input` is
// stripped since it's a UI-only field).
function buildPhasesPayload(phases: ProjectPhase[]) {
  return phases.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    deliverables: p.deliverables.map((d) => ({
      id: d.id,
      service_id: d.service_id ?? null,
      name: d.name,
      description: d.description,
      cadence: d.cadence,
      quantity: d.quantity,
      hours: d.hours ?? undefined,
      unit_price_cents: d.unit_price_cents,
      line_total_cents: computeLineCents(d),
      status: d.status,
    })),
  }))
}

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4">
        <h3 className="text-base font-bold">Choose cadence for "{item.name}"</h3>
        <div className="space-y-2 text-sm">
          {(['one_time', 'monthly', 'quarterly', 'annual'] as Cadence[]).map((c) => (
            <label key={c} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="cadence" value={c} checked={cadence === c} onChange={() => setCadence(c)} />
              <span>{CADENCE_LABELS[c]}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-slate-500">Cancel</button>
          <button onClick={() => onConfirm(cadence, price)} className="bg-teal-500 text-white rounded px-4 py-1.5 text-sm font-bold">
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

interface NewProjectModalProps {
  onClose: () => void
  defaultProspectId?: string
  defaultType?: (typeof TYPES)[number]
}

export function NewProjectModal({
  onClose,
  defaultProspectId = '',
  defaultType,
}: NewProjectModalProps) {
  const router = useRouter()
  const [prospects, setProspects] = useState<ProspectOption[]>([])
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState({
    name: '',
    prospect_id: defaultProspectId,
    type: (defaultType ?? 'website') as (typeof TYPES)[number],
    status: 'active' as (typeof STATUSES)[number],
    start_date: new Date().toISOString().slice(0, 10),
    target_date: '',
    notes: '',
  })
  const [phases, setPhases] = useState<ProjectPhase[]>([
    {
      id: newId(),
      name: 'Phase 1',
      description: '',
      status: 'pending',
      deliverables: [],
    },
  ])
  const [pendingCatalogItem, setPendingCatalogItem] = useState<{
    item: CatalogPickerItem
    phaseId: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    // Project creation needs clients in the dropdown (clients can have
     // direct-entry projects). API filters them out by default; opt back in.
    fetch('/api/admin/prospects?limit=500&sort=updated_at&order=desc&include_clients=1')
      .then((r) => r.json())
      .then((d) => {
        const list = (d.data ?? []) as ProspectOption[]
        list.sort((a, b) => Number(b.is_client) - Number(a.is_client))
        setProspects(list)
      })
      .catch(() => setProspects([]))
  }, [])

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  // ── Phase + deliverable helpers ──────────────────────────────────

  function addPhase() {
    setPhases((prev) => [
      ...prev,
      { id: newId(), name: `Phase ${prev.length + 1}`, description: '', status: 'pending', deliverables: [] },
    ])
  }
  function updatePhase(phaseId: string, patch: Partial<Omit<ProjectPhase, 'deliverables'>>) {
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
                  status: 'pending',
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
                  status: 'pending',
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
          ? { ...p, deliverables: p.deliverables.map((d) => (d.id === delivId ? { ...d, ...patch } : d)) }
          : p,
      ),
    )
  }
  function removeDeliverable(phaseId: string, delivId: string) {
    setPhases((prev) =>
      prev.map((p) =>
        p.id === phaseId ? { ...p, deliverables: p.deliverables.filter((d) => d.id !== delivId) } : p,
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
      cadence === 'monthly' ? item.monthly_range_low_cents ?? item.display_price_cents : item.display_price_cents
    addDeliverableFromCatalog(phaseId, item, cadence, unitPrice)
  }

  // ── Pricing rollup (reference values, not committed for invoicing) ──

  const allDeliverables = phases.flatMap((p) => p.deliverables)
  const oneTimeTotal = allDeliverables.filter((d) => d.cadence === 'one_time').reduce((s, d) => s + computeLineCents(d), 0)
  const monthlyTotal = allDeliverables.filter((d) => d.cadence === 'monthly').reduce((s, d) => s + computeLineCents(d), 0)
  const quarterlyTotal = allDeliverables.filter((d) => d.cadence === 'quarterly').reduce((s, d) => s + computeLineCents(d), 0)
  const annualTotal = allDeliverables.filter((d) => d.cadence === 'annual').reduce((s, d) => s + computeLineCents(d), 0)

  const filteredProspects = prospects.filter((p) => {
    if (!filter) return true
    const f = filter.toLowerCase()
    return (
      p.business_name.toLowerCase().includes(f) ||
      (p.client_code ?? '').toLowerCase().includes(f)
    )
  })

  // ── Submit ──────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!form.name.trim() || !form.prospect_id) {
      setErr('Project name and a prospect are required')
      return
    }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      prospect_id: form.prospect_id,
      type: form.type,
      status: form.status,
      start_date: form.start_date || null,
      target_date: form.target_date || null,
      monthly_value: monthlyTotal > 0 ? monthlyTotal : null,
      notes: form.notes.trim() || null,
      phases: buildPhasesPayload(phases),
    }
    const res = await fetch('/api/admin/projects', {
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
    router.push(`/admin/projects/${j.id}`)
  }

  return (
    <div className="p-6 max-w-4xl">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">New Project</h1>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-800 underline"
          >
            Cancel
          </button>
        </div>

        <div className="space-y-5 bg-white border border-slate-200 rounded-xl p-6">
          {/* Basics */}
          <section className="space-y-3">
            <Field label="Project name *">
              <input
                autoFocus
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className={inputCls}
                placeholder="e.g. Demand Generation Phase 1, or Bug: Site down on /checkout"
              />
            </Field>

            <Field label="Client / prospect *">
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by name or client code"
                className={inputCls + ' mb-2'}
              />
              <select
                value={form.prospect_id}
                onChange={(e) => set('prospect_id', e.target.value)}
                className={inputCls}
                size={6}
              >
                <option value="">— select a prospect —</option>
                {filteredProspects.slice(0, 200).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.is_client ? '[CLIENT] ' : ''}
                    {p.business_name}
                    {p.client_code ? ` (${p.client_code})` : ''}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select value={form.type} onChange={(e) => set('type', e.target.value as (typeof TYPES)[number])} className={inputCls}>
                  {TYPES.map((t) => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(e) => set('status', e.target.value as (typeof STATUSES)[number])} className={inputCls}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date">
                <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Target date">
                <input type="date" value={form.target_date} onChange={(e) => set('target_date', e.target.value)} className={inputCls} />
              </Field>
            </div>
          </section>

          {/* Phases */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Phases &amp; Deliverables</h3>
              <button
                type="button"
                onClick={addPhase}
                className="text-xs bg-slate-100 hover:bg-slate-200 rounded px-3 py-1.5 inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add phase
              </button>
            </div>

            {phases.map((phase, phaseIdx) => (
              <div key={phase.id} className="border border-slate-200 rounded-lg">
                {/* Phase header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
                  <input
                    value={phase.name}
                    onChange={(e) => updatePhase(phase.id, { name: e.target.value })}
                    placeholder="Phase name"
                    className="flex-1 border-0 bg-transparent font-semibold text-sm focus:outline-none"
                  />
                  <select
                    value={phase.status}
                    onChange={(e) => updatePhase(phase.id, { status: e.target.value as ProjectPhase['status'] })}
                    className="text-xs border border-slate-200 rounded px-1 py-0.5 bg-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => movePhase(phaseIdx, -1)}
                      disabled={phaseIdx === 0}
                      className="text-slate-400 hover:text-slate-600 disabled:opacity-25"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => movePhase(phaseIdx, 1)}
                      disabled={phaseIdx === phases.length - 1}
                      className="text-slate-400 hover:text-slate-600 disabled:opacity-25"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {phases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePhase(phase.id)}
                        className="text-slate-300 hover:text-red-500 ml-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 space-y-3">
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
                        className={`border border-slate-100 rounded p-2 space-y-2 text-sm ${
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
                            placeholder="Deliverable name"
                            className="flex-1 border border-slate-200 rounded px-2 py-1 font-medium"
                          />
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => moveDeliverable(phase.id, delivIdx, -1)}
                              disabled={delivIdx === 0}
                              className="text-slate-400 hover:text-slate-600 disabled:opacity-25"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveDeliverable(phase.id, delivIdx, 1)}
                              disabled={delivIdx === phase.deliverables.length - 1}
                              className="text-slate-400 hover:text-slate-600 disabled:opacity-25"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
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
                          placeholder="Description / scope"
                          rows={2}
                          className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
                        />
                        <div className="grid grid-cols-5 gap-2">
                          <label className="text-xs">
                            Cadence
                            <select
                              value={d.cadence}
                              onChange={(e) => updateDeliverable(phase.id, d.id, { cadence: e.target.value as Cadence })}
                              className="w-full border border-slate-200 rounded px-2 py-1 mt-0.5"
                            >
                              {(Object.keys(CADENCE_LABELS) as Cadence[]).map((c) => (
                                <option key={c} value={c}>{CADENCE_LABELS[c]}</option>
                              ))}
                            </select>
                          </label>
                          <label className="text-xs">
                            Qty
                            <input
                              type="number"
                              min="1"
                              value={d.quantity}
                              onChange={(e) => updateDeliverable(phase.id, d.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                              className="w-full border border-slate-200 rounded px-2 py-1 mt-0.5"
                            />
                          </label>
                          <label className="text-xs">
                            Hours
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              value={d.hours ?? ''}
                              placeholder="—"
                              onChange={(e) => updateDeliverable(phase.id, d.id, { hours: e.target.value ? parseFloat(e.target.value) : null })}
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
                              onChange={(e) => updateDeliverable(phase.id, d.id, { unit_price_input: e.target.value })}
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
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Add deliverable from catalog</div>
                    <CatalogPicker
                      onPick={(item) => handleCatalogPick(phase.id, item)}
                      placeholder="Search catalog…"
                    />
                    <button
                      type="button"
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

          {/* Reference pricing rollup */}
          {(oneTimeTotal > 0 || monthlyTotal > 0 || quarterlyTotal > 0 || annualTotal > 0) && (
            <section className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Reference values (not auto-invoiced)
              </div>
              {oneTimeTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">One-time</span>
                  <span className="font-semibold">{formatCents(oneTimeTotal)}</span>
                </div>
              )}
              {monthlyTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Monthly</span>
                  <span className="font-semibold text-teal-700">{formatCents(monthlyTotal)}/mo</span>
                </div>
              )}
              {quarterlyTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Quarterly</span>
                  <span className="font-semibold text-teal-700">{formatCents(quarterlyTotal)}/qtr</span>
                </div>
              )}
              {annualTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Annual</span>
                  <span className="font-semibold text-teal-700">{formatCents(annualTotal)}/yr</span>
                </div>
              )}
              <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-200">
                Billing for direct-entry projects happens via existing client subscription, separate invoice (/admin/invoices/new), or hourly true-up against tracked time. This pricing is reference only.
              </div>
            </section>
          )}

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>

          {err && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-sm rounded-lg bg-[var(--teal)] text-white hover:bg-[var(--teal-dark)] disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Create project
          </button>
        </div>
      </form>

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

const inputCls =
  'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">{label}</span>
      {children}
    </label>
  )
}
