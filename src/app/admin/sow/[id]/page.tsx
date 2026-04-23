'use client'

import { useEffect, useState, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Loader2,
  ExternalLink,
  Copy,
  Plus,
  Trash2,
  Save,
  FileText,
  Send,
} from 'lucide-react'
import { formatCents } from '@/lib/format'
import ProspectContactEditor, { type ProspectContact } from '@/components/admin/ProspectContactEditor'

// ── Types ────────────────────────────────────────────────────────────

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
  sow_number: string
  public_uuid: string
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
  computed_from_deliverables?: boolean
  payment_terms: string | null
  guarantees: string | null
  notes: string | null
  send_date: string | null
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  accepted_signature: string | null
  deposit_invoice_id: string | null
  prospect: ProspectContact & { business_name: string } | null
  deposit_invoice: { invoice_number: string; total_due_cents: number; status: string } | null
}

// ── Money helpers ─────────────────────────────────────────────────────

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

function inputToCents(val: string): number {
  return Math.round(parseFloat(val || '0') * 100)
}

function computeLineCents(d: Deliverable): number {
  const qty = d.hours != null ? d.hours : d.quantity
  return Math.round((qty || 0) * (d.unit_price_cents || 0))
}

// ── Sub-components for the branded document ───────────────────────────

function FieldInput({
  value,
  onChange,
  placeholder,
  className,
  type = 'text',
  step,
  min,
  readOnly,
}: {
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  className?: string
  type?: string
  step?: string
  min?: string
  readOnly?: boolean
}) {
  return (
    <input
      type={type}
      step={step}
      min={min}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      className={[
        'border-0 border-b border-dashed border-slate-300 bg-transparent px-0 py-0.5 focus:outline-none focus:border-teal-400 w-full',
        readOnly ? 'text-slate-500 cursor-default' : '',
        className ?? '',
      ].join(' ')}
    />
  )
}

function FieldTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  className?: string
}) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className={[
        'border border-dashed border-slate-300 bg-transparent px-2 py-1 rounded focus:outline-none focus:border-teal-400 w-full resize-y',
        className ?? '',
      ].join(' ')}
    />
  )
}

// ── Main page ─────────────────────────────────────────────────────────

export default function SowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  // Raw data from API
  const [sow, setSow] = useState<SowData | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [sentModalUrl, setSentModalUrl] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Editable field state
  const [title, setTitle] = useState('')
  const [scopeSummary, setScopeSummary] = useState('')
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [computeFromDeliverables, setComputeFromDeliverables] = useState(true)
  const [totalDollars, setTotalDollars] = useState('0.00')
  const [depositPct, setDepositPct] = useState('25')
  const [timeline, setTimeline] = useState<Phase[]>([])
  const [paymentTerms, setPaymentTerms] = useState('')
  const [guarantees, setGuarantees] = useState('')
  const [notes, setNotes] = useState('')
  const [sendDate, setSendDate] = useState('')
  const [dirty, setDirty] = useState(false)

  function markDirty() {
    setDirty(true)
    setSaveError(null)
  }

  function initState(s: SowData) {
    setTitle(s.title)
    setScopeSummary(s.scope_summary ?? '')
    setDeliverables(
      s.deliverables.map((d) => ({
        name: d.name,
        description: d.description,
        acceptance_criteria: d.acceptance_criteria ?? '',
        quantity: d.quantity ?? 1,
        hours: d.hours ?? null,
        unit_price_cents: d.unit_price_cents ?? 0,
      })),
    )
    setComputeFromDeliverables(s.computed_from_deliverables !== false)
    setTotalDollars(centsToInput(s.pricing?.total_cents ?? 0))
    setDepositPct(String(s.pricing?.deposit_pct ?? 25))
    setTimeline(
      s.timeline.map((p) => ({
        name: p.name,
        duration_weeks: p.duration_weeks,
        description: p.description,
      })),
    )
    setPaymentTerms(s.payment_terms ?? '')
    setGuarantees(s.guarantees ?? '')
    setNotes(s.notes ?? '')
    setSendDate(s.send_date ?? '')
    setDirty(false)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/sow/${id}`)
    const data = await res.json()
    if (res.ok && data.sow) {
      setSow(data.sow)
      initState(data.sow)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  // ── Computed values ───────────────────────────────────────────────

  const deliverablesTotalCents = deliverables.reduce((s, d) => s + computeLineCents(d), 0)
  const effectiveTotalCents = computeFromDeliverables
    ? deliverablesTotalCents
    : inputToCents(totalDollars)
  const pct = parseFloat(depositPct) || 25
  const depositCents = Math.round(effectiveTotalCents * pct / 100)
  const balanceCents = effectiveTotalCents - depositCents

  // ── Actions ───────────────────────────────────────────────────────

  async function save(forceEdit = false) {
    setBusy(true)
    setSaveError(null)
    try {
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
        pricing: {
          total_cents: effectiveTotalCents,
          deposit_cents: depositCents,
          deposit_pct: pct,
        },
        payment_terms: paymentTerms,
        guarantees,
        notes,
        send_date: sendDate || null,
      }
      if (forceEdit) body.force_edit = true

      const res = await fetch(`/api/admin/sow/${id}`, {
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
        setSaveError(d.error ?? 'Save failed')
        setBusy(false)
        return
      }

      setDirty(false)
      await load()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function send() {
    setBusy(true)
    const res = await fetch(`/api/admin/sow/${id}/send`, { method: 'POST' })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      alert(data.error)
      return
    }
    setSentModalUrl(data.public_url)
    await load()
  }

  async function deleteDraft() {
    if (!confirm('Delete this draft?')) return
    setBusy(true)
    await fetch(`/api/admin/sow/${id}`, { method: 'DELETE' })
    router.push('/admin/sow')
  }

  // ── Deliverable helpers ───────────────────────────────────────────

  function addDeliverable() {
    setDeliverables((d) => [
      ...d,
      { name: '', description: '', acceptance_criteria: '', quantity: 1, hours: null, unit_price_cents: 0 },
    ])
    markDirty()
  }

  function updateDeliverable(idx: number, patch: Partial<Deliverable>) {
    setDeliverables((d) => d.map((x, i) => (i === idx ? { ...x, ...patch } : x)))
    markDirty()
  }

  function removeDeliverable(idx: number) {
    setDeliverables((d) => d.filter((_, i) => i !== idx))
    markDirty()
  }

  // ── Timeline helpers ──────────────────────────────────────────────

  function addPhase() {
    setTimeline((t) => [...t, { name: '', duration_weeks: 1, description: '' }])
    markDirty()
  }

  function updatePhase(idx: number, patch: Partial<Phase>) {
    setTimeline((t) => t.map((x, i) => (i === idx ? { ...x, ...patch } : x)))
    markDirty()
  }

  function removePhase(idx: number) {
    setTimeline((t) => t.filter((_, i) => i !== idx))
    markDirty()
  }

  // ── Render ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    )
  }
  if (!sow) return <div className="p-6">Not found</div>

  const publicUrl = `https://demandsignals.co/sow/${sow.sow_number}/${sow.public_uuid}`
  const isDraft = sow.status === 'draft'
  const p = sow.prospect

  return (
    <div className="pb-24">
      {/* Sticky toolbar */}
      <div
        className="sticky top-0 z-30 flex items-center gap-2 flex-wrap px-6 py-3 border-b border-slate-200 bg-white/95 backdrop-blur-sm"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      >
        <Link href="/admin/sow" className="text-sm text-teal-600 mr-2">
          ← All SOWs
        </Link>
        <span className="text-xs font-mono text-slate-400 mr-2">{sow.sow_number}</span>

        <span
          className={`text-xs px-2 py-0.5 rounded-full font-semibold mr-2 ${
            sow.status === 'draft'
              ? 'bg-slate-100 text-slate-600'
              : sow.status === 'accepted'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-blue-100 text-blue-700'
          }`}
        >
          {sow.status}
        </span>

        <div className="flex-1" />

        {saveError && (
          <span className="text-xs text-red-600 mr-2">{saveError}</span>
        )}

        {/* Save */}
        <button
          onClick={() => save()}
          disabled={!dirty || busy}
          className="inline-flex items-center gap-1.5 bg-teal-500 text-white rounded px-3 py-1.5 text-sm font-semibold disabled:opacity-40 hover:bg-teal-600"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>

        {/* Preview PDF */}
        <a
          href={`/api/admin/sow/${id}/pdf`}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-3 py-1.5 text-sm"
        >
          <FileText className="w-3.5 h-3.5" /> Preview PDF
        </a>

        {/* Send — draft only */}
        {isDraft && (
          <>
            <button
              onClick={deleteDraft}
              disabled={busy}
              className="bg-red-100 text-red-700 rounded px-3 py-1.5 text-sm"
            >
              Delete
            </button>
            <button
              onClick={send}
              disabled={busy}
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white rounded px-3 py-1.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </>
        )}

        {/* Client view — non-draft */}
        {!isDraft && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-3 py-1.5 text-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Client view
          </a>
        )}
      </div>

      {/* Branded document */}
      <div
        className="max-w-3xl mx-auto my-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      >
        {/* Document header */}
        <div
          className="flex items-start justify-between px-10 py-8"
          style={{ borderBottom: '3px solid #68c5ad' }}
        >
          <div>
            <Image
              src="https://demandsignals.us/assets/logos/dsig_logo_v2b.png"
              alt="Demand Signals"
              width={160}
              height={50}
              className="h-12 w-auto object-contain"
              unoptimized
            />
            <div className="text-xs mt-1" style={{ color: '#5d6780' }}>
              Demand Signals · demandsignals.co
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: '#1d2330' }}>
              Statement of Work
            </div>
            <div className="font-mono text-sm mt-1" style={{ color: '#5d6780' }}>
              {sow.sow_number}
            </div>
            <div className="mt-1">
              <FieldInput
                type="date"
                value={sendDate}
                onChange={(v) => { setSendDate(v); markDirty() }}
                className="text-sm text-right"
                placeholder="Issued date"
              />
            </div>
          </div>
        </div>

        <div className="px-10 py-8 space-y-8" style={{ color: '#1d2330' }}>
          {/* Client block */}
          {p && (
            <div
              className="rounded-lg p-4"
              style={{ background: '#f4f6f9' }}
            >
              <div
                className="text-xs uppercase tracking-wide mb-2"
                style={{ color: '#5d6780' }}
              >
                Bill to
              </div>
              <div className="font-semibold text-base mb-1">{p.business_name}</div>
              <ProspectContactEditor prospect={p} />
            </div>
          )}

          {/* Title + Scope */}
          <section>
            <div
              className="text-xs uppercase tracking-wide font-semibold pb-1.5 mb-3"
              style={{ color: '#5d6780', borderBottom: '1px solid #e2e8f0' }}
            >
              Project overview
            </div>
            <div className="mb-3">
              <div className="text-xs text-slate-500 mb-1">Title</div>
              <FieldInput
                value={title}
                onChange={(v) => { setTitle(v); markDirty() }}
                className="text-lg font-bold"
                placeholder="Project title"
              />
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Scope summary</div>
              <FieldTextarea
                value={scopeSummary}
                onChange={(v) => { setScopeSummary(v); markDirty() }}
                placeholder="Describe the scope of work..."
                rows={3}
              />
            </div>
          </section>

          {/* Deliverables */}
          <section>
            <div
              className="text-xs uppercase tracking-wide font-semibold pb-1.5 mb-4"
              style={{ color: '#5d6780', borderBottom: '1px solid #e2e8f0' }}
            >
              Deliverables
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th
                    className="text-left p-2 text-xs uppercase font-semibold"
                    style={{ background: '#f4f6f9', color: '#5d6780' }}
                  >
                    Item
                  </th>
                  <th
                    className="text-right p-2 text-xs uppercase font-semibold w-20"
                    style={{ background: '#f4f6f9', color: '#5d6780' }}
                  >
                    Qty/Hrs
                  </th>
                  <th
                    className="text-right p-2 text-xs uppercase font-semibold w-24"
                    style={{ background: '#f4f6f9', color: '#5d6780' }}
                  >
                    Rate
                  </th>
                  <th
                    className="text-right p-2 text-xs uppercase font-semibold w-24"
                    style={{ background: '#f4f6f9', color: '#5d6780' }}
                  >
                    Total
                  </th>
                  <th className="w-8" style={{ background: '#f4f6f9' }} />
                </tr>
              </thead>
              <tbody>
                {deliverables.map((d, idx) => {
                  const lineCents = computeLineCents(d)
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td className="p-2 align-top">
                        <FieldInput
                          value={d.name}
                          onChange={(v) => updateDeliverable(idx, { name: v })}
                          placeholder="Item name"
                          className="font-semibold mb-1"
                        />
                        <FieldInput
                          value={d.description}
                          onChange={(v) => updateDeliverable(idx, { description: v })}
                          placeholder="Description"
                          className="text-xs"
                        />
                        <FieldInput
                          value={d.acceptance_criteria}
                          onChange={(v) => updateDeliverable(idx, { acceptance_criteria: v })}
                          placeholder="Acceptance criteria (optional)"
                          className="text-xs mt-1"
                        />
                      </td>
                      <td className="p-2 align-top">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-400">
                            {d.hours != null ? 'Hours' : 'Qty'}
                          </label>
                          {d.hours != null ? (
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              value={d.hours}
                              onChange={(e) => updateDeliverable(idx, { hours: parseFloat(e.target.value) || 0 })}
                              className="w-full border border-slate-200 rounded px-1.5 py-1 text-right text-sm"
                            />
                          ) : (
                            <input
                              type="number"
                              min="1"
                              value={d.quantity}
                              onChange={(e) => updateDeliverable(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                              className="w-full border border-slate-200 rounded px-1.5 py-1 text-right text-sm"
                            />
                          )}
                          <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={d.hours != null}
                              onChange={(e) => updateDeliverable(idx, { hours: e.target.checked ? (d.quantity || 1) : null })}
                            />
                            hourly
                          </label>
                        </div>
                      </td>
                      <td className="p-2 align-top">
                        <div className="text-xs text-slate-400 mb-1">
                          {d.hours != null ? '$/hr' : 'unit $'}
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={centsToInput(d.unit_price_cents)}
                          onChange={(e) => updateDeliverable(idx, { unit_price_cents: inputToCents(e.target.value) })}
                          className="w-full border border-slate-200 rounded px-1.5 py-1 text-right text-sm"
                        />
                      </td>
                      <td className="p-2 text-right align-top font-semibold text-sm">
                        {lineCents > 0 ? formatCents(lineCents) : '—'}
                      </td>
                      <td className="p-2 align-top">
                        <button
                          onClick={() => removeDeliverable(idx)}
                          className="text-slate-300 hover:text-red-500"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <button
              onClick={addDeliverable}
              className="mt-3 inline-flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 rounded px-3 py-1.5"
            >
              <Plus className="w-3 h-3" /> Add deliverable
            </button>
          </section>

          {/* Timeline */}
          <section>
            <div
              className="text-xs uppercase tracking-wide font-semibold pb-1.5 mb-4"
              style={{ color: '#5d6780', borderBottom: '1px solid #e2e8f0' }}
            >
              Timeline
            </div>
            {timeline.map((ph, idx) => (
              <div key={idx} className="flex gap-3 mb-3 items-start">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <FieldInput
                    value={ph.name}
                    onChange={(v) => updatePhase(idx, { name: v })}
                    placeholder="Phase name"
                    className="font-semibold"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      value={ph.duration_weeks}
                      onChange={(e) => updatePhase(idx, { duration_weeks: parseInt(e.target.value) || 1 })}
                      className="w-16 border border-slate-200 rounded px-1.5 py-1 text-right text-sm"
                    />
                    <span className="text-xs text-slate-400">weeks</span>
                  </div>
                  <FieldInput
                    value={ph.description}
                    onChange={(v) => updatePhase(idx, { description: v })}
                    placeholder="Description"
                  />
                </div>
                <button
                  onClick={() => removePhase(idx)}
                  className="text-slate-300 hover:text-red-500 mt-0.5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={addPhase}
              className="inline-flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 rounded px-3 py-1.5"
            >
              <Plus className="w-3 h-3" /> Add phase
            </button>
          </section>

          {/* Pricing */}
          <section>
            <div
              className="text-xs uppercase tracking-wide font-semibold pb-1.5 mb-4"
              style={{ color: '#5d6780', borderBottom: '1px solid #e2e8f0' }}
            >
              Pricing
            </div>
            <div className="mb-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={computeFromDeliverables}
                  onChange={(e) => { setComputeFromDeliverables(e.target.checked); markDirty() }}
                />
                <span className="text-slate-600">Compute total from deliverables</span>
                {computeFromDeliverables && (
                  <span className="text-xs text-slate-400">
                    ({formatCents(deliverablesTotalCents)})
                  </span>
                )}
              </label>
            </div>
            <table className="w-full max-w-xs ml-auto text-sm">
              <tbody>
                <tr>
                  <td className="py-1 text-slate-600">Total</td>
                  <td className="py-1 text-right font-semibold">
                    {computeFromDeliverables ? (
                      <span>{formatCents(deliverablesTotalCents)}</span>
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={totalDollars}
                        onChange={(e) => { setTotalDollars(e.target.value); markDirty() }}
                        className="w-32 border border-slate-200 rounded px-2 py-1 text-right"
                      />
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 text-slate-600">
                    Deposit (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={depositPct}
                      onChange={(e) => { setDepositPct(e.target.value); markDirty() }}
                      className="w-12 border border-slate-200 rounded px-1 py-0 text-center inline"
                    />
                    %)
                  </td>
                  <td className="py-1 text-right font-semibold">{formatCents(depositCents)}</td>
                </tr>
                <tr style={{ borderTop: '2px solid #1d2330' }}>
                  <td className="pt-3 font-bold">Balance on delivery</td>
                  <td className="pt-3 text-right font-bold text-base">{formatCents(balanceCents)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Payment terms */}
          <section>
            <div
              className="text-xs uppercase tracking-wide font-semibold pb-1.5 mb-3"
              style={{ color: '#5d6780', borderBottom: '1px solid #e2e8f0' }}
            >
              Payment terms
            </div>
            <FieldTextarea
              value={paymentTerms}
              onChange={(v) => { setPaymentTerms(v); markDirty() }}
              placeholder="e.g. 50% deposit due on signing; balance due on delivery..."
              rows={2}
            />
          </section>

          {/* Guarantees */}
          <section>
            <div
              className="text-xs uppercase tracking-wide font-semibold pb-1.5 mb-3"
              style={{ color: '#5d6780', borderBottom: '1px solid #e2e8f0' }}
            >
              Guarantees
            </div>
            <FieldTextarea
              value={guarantees}
              onChange={(v) => { setGuarantees(v); markDirty() }}
              placeholder="Service guarantees, revision policy, etc."
              rows={2}
            />
          </section>

          {/* Notes */}
          <section>
            <div
              className="text-xs uppercase tracking-wide font-semibold pb-1.5 mb-3"
              style={{ color: '#5d6780', borderBottom: '1px solid #e2e8f0' }}
            >
              Notes
            </div>
            <FieldTextarea
              value={notes}
              onChange={(v) => { setNotes(v); markDirty() }}
              placeholder="Additional notes..."
              rows={2}
            />
          </section>

          {/* Accepted block */}
          {sow.accepted_at && sow.accepted_signature && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="text-xs uppercase font-semibold text-emerald-900 mb-1">Accepted</div>
              <div className="text-sm">
                {sow.accepted_signature} on{' '}
                {new Date(sow.accepted_at).toLocaleString()}
              </div>
              {sow.deposit_invoice && (
                <div className="mt-2 text-sm">
                  Deposit invoice:{' '}
                  <Link
                    href={`/admin/invoices/${sow.deposit_invoice_id}`}
                    className="text-teal-600 hover:underline font-mono"
                  >
                    {sow.deposit_invoice.invoice_number}
                  </Link>{' '}
                  — {formatCents(sow.deposit_invoice.total_due_cents)} · {sow.deposit_invoice.status}
                </div>
              )}
            </div>
          )}

          {/* Signature block */}
          <div
            className="pt-10 mt-10"
            style={{ borderTop: '1px dashed #5d6780' }}
          >
            <div className="flex gap-10">
              <div>
                <div className="text-xs mb-1" style={{ color: '#5d6780' }}>Client signature</div>
                <div
                  className="inline-block min-w-48 h-8"
                  style={{ borderBottom: '1px solid #1d2330' }}
                />
                <div className="text-xs mt-1" style={{ color: '#5d6780' }}>Date</div>
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: '#5d6780' }}>DSIG signature</div>
                <div
                  className="inline-block min-w-48 h-8"
                  style={{ borderBottom: '1px solid #1d2330' }}
                />
                <div className="text-xs mt-1" style={{ color: '#5d6780' }}>Date</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="text-xs pt-4 mt-4"
            style={{ color: '#5d6780', borderTop: '1px solid #e2e8f0' }}
          >
            Demand Signals · DemandSignals@gmail.com · (916) 542-2423 · demandsignals.co
          </div>
        </div>
      </div>

      {/* Sent modal */}
      {sentModalUrl && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full space-y-4">
            <h2 className="text-lg font-bold">SOW sent</h2>
            <p className="text-sm text-slate-600">
              Share this URL with the prospect. They can review, download PDF, and click Accept.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 flex items-center gap-2">
              <code className="flex-1 text-xs truncate">{sentModalUrl}</code>
              <button
                onClick={() => navigator.clipboard.writeText(sentModalUrl)}
                className="text-teal-600 hover:text-teal-700"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setSentModalUrl(null)}
                className="bg-teal-500 text-white rounded-lg px-4 py-2 font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
