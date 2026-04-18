'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Trash2, Loader2, Sparkles } from 'lucide-react'
import { CatalogPicker, type CatalogPickerItem } from '@/components/admin/catalog-picker'

interface Prospect {
  id: string
  business_name: string
  owner_email: string | null
}

interface LineItemDraft {
  catalog_item_id: string | null // non-null = catalog-backed; null = custom ad-hoc
  description: string
  quantity: number
  unit_price_cents: number
  discount_pct: number
  discount_label: string
}

const EMPTY_LINE: LineItemDraft = {
  catalog_item_id: null,
  description: '',
  quantity: 1,
  unit_price_cents: 0,
  discount_pct: 0,
  discount_label: '',
}

function fromCatalogItem(item: CatalogPickerItem): LineItemDraft {
  return {
    catalog_item_id: item.id,
    description: item.name,
    quantity: 1,
    unit_price_cents: item.display_price_cents,
    discount_pct: 0,
    discount_label: '',
  }
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
  const [includeValueStack, setIncludeValueStack] = useState(false)
  const [valueStackItems, setValueStackItems] = useState<CatalogPickerItem[]>([])
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

  // Preload value stack items (active, included_with_paid_project=true) so
  // the toggle can be rendered with meaningful labels + totals.
  useEffect(() => {
    fetch('/api/admin/services-catalog?active=true')
      .then((r) => r.json())
      .then((d) => {
        const all = (d.services ?? []) as CatalogPickerItem[]
        setValueStackItems(all.filter((s) => (s as CatalogPickerItem & { included_with_paid_project?: boolean }).included_with_paid_project))
      })
      .catch(() => {})
  }, [])

  const valueStackTotalCents = valueStackItems.reduce(
    (sum, s) => sum + s.display_price_cents,
    0,
  )

  function updateLine(idx: number, patch: Partial<LineItemDraft>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }
  function addCatalogLine(item: CatalogPickerItem) {
    setLines((prev) => [...prev, fromCatalogItem(item)])
  }
  function addCustomLine() {
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
        catalog_item_id: null,
        description: 'New Client Appreciation — included with your engagement',
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
      // Build final line items list. If value-stack toggle is on, append
      // the stack items at full price plus a single 100% appreciation
      // discount line. Frontend sends the lines already computed so the
      // invoice PDF reflects the full stack + the discount.
      const finalLines = lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unit_price_cents: l.unit_price_cents,
        discount_pct: l.discount_pct,
        discount_label: l.discount_label || undefined,
      }))

      if (includeValueStack && valueStackItems.length > 0) {
        for (const s of valueStackItems) {
          finalLines.push({
            description: s.name + (s.description ? ` — ${s.description}` : ''),
            quantity: 1,
            unit_price_cents: s.display_price_cents,
            discount_pct: 0,
            discount_label: undefined,
          })
        }
        finalLines.push({
          description: 'New Client Appreciation — included with your engagement',
          quantity: 1,
          unit_price_cents: -valueStackTotalCents,
          discount_pct: 0,
          discount_label: 'New Client Appreciation',
        })
      }

      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          prospect_id: prospectId || undefined,
          line_items: finalLines,
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

      {valueStackItems.length > 0 && (
        <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={includeValueStack}
              onChange={(e) => setIncludeValueStack(e.target.checked)}
              className="mt-0.5"
            />
            <div className="flex-1 text-sm">
              <div className="font-semibold text-emerald-900">
                Include paid-project value stack ($
                {(valueStackTotalCents / 100).toFixed(0)} New Client Appreciation)
              </div>
              <div className="text-xs text-emerald-800 mt-1">
                Auto-adds these items at full price with a single 100% discount line so the
                prospect sees real day-one value:
              </div>
              <ul className="text-xs text-emerald-800 mt-1 ml-4 list-disc">
                {valueStackItems.map((s) => (
                  <li key={s.id}>
                    {s.name} — ${(s.display_price_cents / 100).toFixed(0)}
                  </li>
                ))}
              </ul>
            </div>
          </label>
        </section>
      )}

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Line items</h2>
          <button
            onClick={add100Discount}
            className="text-xs bg-orange-100 hover:bg-orange-200 rounded px-3 py-1 text-orange-900"
          >
            + 100% discount line
          </button>
        </div>

        {/* Catalog picker — primary add path */}
        <div className="space-y-2">
          <div className="text-xs text-slate-500 font-semibold uppercase">Add from catalog</div>
          <CatalogPicker
            onPick={addCatalogLine}
            placeholder="Search catalog… (e.g. 'React', 'SEO', 'logo')"
          />
          <button
            onClick={addCustomLine}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Or add an ad-hoc custom line (use only if no catalog match)
          </button>
        </div>

        {lines.length > 0 && (
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
                const isCustom = l.catalog_item_id === null
                return (
                  <tr
                    key={idx}
                    className={`border-t border-slate-100 ${
                      isCustom && l.unit_price_cents >= 0 ? 'bg-amber-50/60' : ''
                    }`}
                  >
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-2">
                        {!isCustom && (
                          <span title="From catalog">
                            <Sparkles className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                          </span>
                        )}
                        <input
                          type="text"
                          value={l.description}
                          onChange={(e) => updateLine(idx, { description: e.target.value })}
                          className="w-full border border-slate-200 rounded px-2 py-1"
                          placeholder={isCustom ? 'Ad-hoc description' : 'Description'}
                        />
                      </div>
                      {isCustom && l.unit_price_cents >= 0 && (
                        <div className="text-[10px] text-amber-800 mt-0.5 ml-5">
                          Ad-hoc line — breaks catalog alignment. Consider adding to catalog
                          via the picker above.
                        </div>
                      )}
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
        )}

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
