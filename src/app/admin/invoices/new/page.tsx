'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Trash2, Loader2 } from 'lucide-react'

interface Prospect {
  id: string
  business_name: string
  owner_email: string | null
}

interface LineItemDraft {
  description: string
  quantity: number
  unit_price_cents: number
  discount_pct: number
  discount_label: string
}

const EMPTY_LINE: LineItemDraft = {
  description: '',
  quantity: 1,
  unit_price_cents: 0,
  discount_pct: 0,
  discount_label: '',
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="p-6"><Loader2 className="w-6 h-6 animate-spin text-teal-500" /></div>}>
      <NewInvoiceForm />
    </Suspense>
  )
}

function NewInvoiceForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetProspectId = searchParams.get('prospect_id') ?? ''

  const [prospects, setProspects] = useState<Prospect[]>([])
  const [prospectId, setProspectId] = useState(presetProspectId)
  const [kind, setKind] = useState<'quote_driven' | 'business' | 'restaurant_rule'>('business')
  const [lines, setLines] = useState<LineItemDraft[]>([{ ...EMPTY_LINE }])
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [categoryHint, setCategoryHint] = useState('service_revenue')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/prospects?limit=100')
      .then((r) => r.json())
      .then((d) => setProspects(d.data ?? []))
      .catch(() => {})
  }, [])

  function updateLine(idx: number, patch: Partial<LineItemDraft>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }
  function addLine() {
    setLines((prev) => [...prev, { ...EMPTY_LINE }])
  }
  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx))
  }
  function add100Discount() {
    const subtotal = lines.reduce((s, l) => s + l.unit_price_cents * l.quantity, 0)
    setLines((prev) => [
      ...prev,
      {
        description: 'Complimentary (100% off)',
        quantity: 1,
        unit_price_cents: -subtotal,
        discount_pct: 0,
        discount_label: 'Complimentary',
      },
    ])
  }

  const subtotal = lines.reduce((s, l) => s + Math.max(0, l.unit_price_cents * l.quantity), 0) / 100
  const total = lines.reduce((s, l) => {
    const sub = l.unit_price_cents * l.quantity
    const disc = Math.round((sub * l.discount_pct) / 100)
    return s + (sub - disc)
  }, 0) / 100

  async function save(andSend: boolean) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          prospect_id: prospectId || undefined,
          line_items: lines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unit_price_cents: l.unit_price_cents,
            discount_pct: l.discount_pct,
            discount_label: l.discount_label || undefined,
          })),
          notes: notes || undefined,
          due_date: dueDate || undefined,
          category_hint: categoryHint,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      if (andSend) {
        const sendRes = await fetch(`/api/admin/invoices/${data.invoice.id}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        const sendData = await sendRes.json()
        if (!sendRes.ok) throw new Error(sendData.error ?? 'Send failed')
      }
      router.push(`/admin/invoices/${data.invoice.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setBusy(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900">New Invoice</h1>

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Client + Kind</h2>
        <label className="block text-sm">
          Prospect
          <select
            value={prospectId}
            onChange={(e) => setProspectId(e.target.value)}
            className="w-full border border-slate-200 rounded px-3 py-2 mt-1"
          >
            <option value="">— none (ad-hoc) —</option>
            {prospects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.business_name}
                {p.owner_email ? ` (${p.owner_email})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Kind
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            className="border border-slate-200 rounded px-3 py-2 mt-1"
          >
            <option value="business">Business (ad-hoc)</option>
            <option value="quote_driven">Quote-driven</option>
            <option value="restaurant_rule">Restaurant Rule ($0)</option>
          </select>
        </label>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Line items</h2>
          <div className="flex gap-2">
            <button
              onClick={addLine}
              className="text-xs bg-slate-100 hover:bg-slate-200 rounded px-3 py-1"
            >
              <Plus className="w-3 h-3 inline" /> Add line
            </button>
            <button
              onClick={add100Discount}
              className="text-xs bg-orange-100 hover:bg-orange-200 rounded px-3 py-1 text-orange-900"
            >
              + 100% discount
            </button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 uppercase">
            <tr>
              <th className="text-left py-1">Description</th>
              <th className="text-right py-1 w-16">Qty</th>
              <th className="text-right py-1 w-28">Unit ($)</th>
              <th className="text-right py-1 w-16">Disc %</th>
              <th className="text-right py-1 w-24">Total</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx) => {
              const sub = l.unit_price_cents * l.quantity
              const lineTotal = sub - Math.round((sub * l.discount_pct) / 100)
              return (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="py-1 pr-2">
                    <input
                      type="text"
                      value={l.description}
                      onChange={(e) => updateLine(idx, { description: e.target.value })}
                      className="w-full border border-slate-200 rounded px-2 py-1"
                      placeholder="Description"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={l.quantity}
                      onChange={(e) =>
                        updateLine(idx, { quantity: parseInt(e.target.value) || 1 })
                      }
                      className="w-full border border-slate-200 rounded px-2 py-1 text-right"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={l.unit_price_cents / 100}
                      onChange={(e) =>
                        updateLine(idx, {
                          unit_price_cents: Math.round(parseFloat(e.target.value || '0') * 100),
                        })
                      }
                      className="w-full border border-slate-200 rounded px-2 py-1 text-right"
                      step="0.01"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={l.discount_pct}
                      onChange={(e) =>
                        updateLine(idx, { discount_pct: parseInt(e.target.value) || 0 })
                      }
                      className="w-full border border-slate-200 rounded px-2 py-1 text-right"
                      min="0"
                      max="100"
                    />
                  </td>
                  <td className="text-right pr-2">${(lineTotal / 100).toFixed(2)}</td>
                  <td>
                    <button
                      onClick={() => removeLine(idx)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="flex justify-end text-sm space-y-1">
          <div className="text-right">
            <div>Subtotal: ${subtotal.toFixed(2)}</div>
            <div className="font-bold text-lg">Total: ${total.toFixed(2)}</div>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Details</h2>
        <label className="block text-sm">
          Due date
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="block border border-slate-200 rounded px-3 py-1 mt-1"
          />
        </label>
        <label className="block text-sm">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-slate-200 rounded px-3 py-2 mt-1"
            rows={3}
          />
        </label>
        <label className="block text-sm">
          Category hint
          <select
            value={categoryHint}
            onChange={(e) => setCategoryHint(e.target.value)}
            className="block border border-slate-200 rounded px-3 py-1 mt-1"
          >
            <option value="service_revenue">Service Revenue</option>
            <option value="subscription_revenue">Subscription Revenue</option>
            <option value="marketing_expense">Marketing Expense</option>
            <option value="research_credit">Research Credit</option>
            <option value="other">Other</option>
          </select>
        </label>
      </section>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="flex gap-3">
        <button
          onClick={() => save(false)}
          disabled={busy || lines.length === 0}
          className="bg-slate-100 hover:bg-slate-200 rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save as draft'}
        </button>
        <button
          onClick={() => save(true)}
          disabled={busy || lines.length === 0}
          className="bg-teal-500 text-white rounded-lg px-4 py-2 font-semibold hover:bg-teal-600 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Send'}
        </button>
      </div>
    </div>
  )
}
