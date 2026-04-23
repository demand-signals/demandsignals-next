'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Trash2, Loader2, Sparkles, Eye } from 'lucide-react'
import { CatalogPicker, type CatalogPickerItem } from '@/components/admin/catalog-picker'
import ProspectContactEditor, { type ProspectContact } from '@/components/admin/ProspectContactEditor'
import DocumentPreview from '@/components/admin/DocumentPreview'
import { formatCents } from '@/lib/format'

interface Prospect {
  id: string
  business_name: string
  owner_name: string | null
  owner_email: string | null
  business_email: string | null
  owner_phone: string | null
  business_phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
}

interface LineItemDraft {
  catalog_item_id: string | null // non-null = catalog-backed; null = custom ad-hoc
  description: string
  quantity: number
  unit_price_cents: number
  unit_price_input: string  // raw string for the price input; committed to cents on blur
  discount_pct: number
  discount_label: string
}

const EMPTY_LINE: LineItemDraft = {
  catalog_item_id: null,
  description: '',
  quantity: 1,
  unit_price_cents: 0,
  unit_price_input: '0.00',
  discount_pct: 0,
  discount_label: '',
}

function fromCatalogItem(item: CatalogPickerItem): LineItemDraft {
  return {
    catalog_item_id: item.id,
    description: item.name,
    quantity: 1,
    unit_price_cents: item.display_price_cents,
    unit_price_input: (item.display_price_cents / 100).toFixed(2),
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
  const [sendDate, setSendDate] = useState('')
  const [lateFeeDollars, setLateFeeDollars] = useState('')
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState('0')
  const [categoryHint, setCategoryHint] = useState('service_revenue')
  const [busy, setBusy] = useState(false)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Selected prospect object (for ProspectContactEditor)
  const selectedProspect: Prospect | null =
    prospectId ? (prospects.find((p) => p.id === prospectId) ?? null) : null

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

  // When prospect changes, reset draft so stale preview is hidden
  useEffect(() => {
    setDraftId(null)
    setShowPreview(false)
  }, [prospectId])

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
        unit_price_input: (-subtotal / 100).toFixed(2),
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

  function buildPostBody() {
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

    const lateFeeCents = Math.round(parseFloat(lateFeeDollars || '0') * 100)

    return {
      kind,
      prospect_id: prospectId || undefined,
      line_items: finalLines,
      notes: notes || undefined,
      due_date: dueDate || undefined,
      send_date: sendDate || undefined,
      late_fee_cents: lateFeeCents > 0 ? lateFeeCents : undefined,
      late_fee_grace_days: parseInt(lateFeeGraceDays || '0') || undefined,
      category_hint: categoryHint,
    }
  }

  async function handlePreviewClick() {
    if (lines.length === 0) {
      setError('Add at least one line item before previewing.')
      return
    }
    setError(null)
    setPreviewBusy(true)
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPostBody()),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save draft')
      setDraftId(data.invoice.id)
      setShowPreview(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save draft for preview')
    } finally {
      setPreviewBusy(false)
    }
  }

  async function save(andSend: boolean) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPostBody()),
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
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">New Invoice</h1>
        <button
          onClick={handlePreviewClick}
          disabled={previewBusy || lines.length === 0}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {previewBusy
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Eye className="w-4 h-4" />}
          Show preview
        </button>
      </div>

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

        {/* ProspectContactEditor — shown when a prospect is selected */}
        {selectedProspect && (
          <div className="border border-slate-100 rounded-lg p-3 bg-slate-50">
            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Bill-to contact</div>
            <ProspectContactEditor
              prospect={selectedProspect as ProspectContact}
              onSaved={(updated) => {
                setProspects((prev) =>
                  prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
                )
              }}
            />
          </div>
        )}

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
                    {s.name} — {formatCents(s.display_price_cents)}
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
                        value={l.unit_price_input}
                        onChange={(e) =>
                          updateLine(idx, { unit_price_input: e.target.value })
                        }
                        onBlur={(e) => {
                          const cents = Math.round(parseFloat(e.target.value || '0') * 100)
                          updateLine(idx, {
                            unit_price_cents: cents,
                            unit_price_input: (cents / 100).toFixed(2),
                          })
                        }}
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
                    <td className="text-right pr-2">{formatCents(lineTotal)}</td>
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
            <div>Subtotal: {formatCents(Math.round(subtotal * 100))}</div>
            <div className="font-bold text-lg">Total: {formatCents(Math.round(total * 100))}</div>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Details</h2>

        {/* Send date + Due date — side by side */}
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            Send date
            <input
              type="date"
              value={sendDate}
              onChange={(e) => setSendDate(e.target.value)}
              className="block border border-slate-200 rounded px-3 py-1 mt-1"
            />
          </label>
          <label className="block text-sm">
            Due date
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="block border border-slate-200 rounded px-3 py-1 mt-1"
            />
          </label>
        </div>

        {/* Late fee config — side by side */}
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            Late fee ($, optional)
            <input
              type="number"
              step="0.01"
              min="0"
              value={lateFeeDollars}
              onChange={(e) => setLateFeeDollars(e.target.value)}
              placeholder="0.00"
              className="block border border-slate-200 rounded px-3 py-1 mt-1 w-full"
            />
          </label>
          <label className="block text-sm">
            Grace days (0 = due date)
            <input
              type="number"
              min="0"
              value={lateFeeGraceDays}
              onChange={(e) => setLateFeeGraceDays(e.target.value)}
              placeholder="0"
              className="block border border-slate-200 rounded px-3 py-1 mt-1 w-full"
            />
          </label>
        </div>

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

      {/* ── Preview panel — shown after save-as-draft ── */}
      {showPreview && draftId && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">Invoice preview</h2>
            <button
              onClick={() => setShowPreview(false)}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Hide
            </button>
          </div>
          <p className="text-xs text-slate-500">
            This draft was saved as <span className="font-mono">{draftId}</span>.{' '}
            <a
              href={`/admin/invoices/${draftId}`}
              className="text-teal-600 hover:underline"
            >
              Open full invoice
            </a>{' '}
            or continue editing below then save again to create a new invoice.
          </p>
          <DocumentPreview
            src={`/api/admin/invoices/${draftId}/preview`}
            title="Invoice preview"
          />
        </section>
      )}
    </div>
  )
}
