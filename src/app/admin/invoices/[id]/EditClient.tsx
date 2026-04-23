'use client'

import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'

interface LineItem {
  description: string
  quantity: number
  unit_price_cents: number
  discount_pct: number
  discount_label: string | null
}

interface Props {
  invoiceId: string
  invoiceStatus: string
  initial: {
    notes: string | null
    due_date: string | null
    send_date: string | null
    late_fee_cents: number
    late_fee_grace_days: number
    line_items: LineItem[]
  }
  onSaved: () => void
  onCancel: () => void
}

export default function InvoiceEditClient({
  invoiceId,
  invoiceStatus,
  initial,
  onSaved,
  onCancel,
}: Props) {
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [dueDate, setDueDate] = useState(initial.due_date ?? '')
  const [sendDate, setSendDate] = useState(initial.send_date ?? '')
  const [lateFeeCents, setLateFeeCents] = useState(initial.late_fee_cents)
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState(initial.late_fee_grace_days)
  const [lines, setLines] = useState<LineItem[]>(initial.line_items)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save(forceEdit = false) {
    setBusy(true)
    setErr(null)
    try {
      const body: Record<string, unknown> = {
        notes: notes || null,
        due_date: dueDate || null,
        send_date: sendDate || null,
        late_fee_cents: lateFeeCents,
        late_fee_grace_days: lateFeeGraceDays,
        line_items: lines.filter((l) => l.description.trim()),
      }
      if (forceEdit) body.force_edit = true
      const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409 && !forceEdit) {
        if (confirm(`Invoice is ${invoiceStatus}. Force edit?`)) return save(true)
        setBusy(false)
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          Send date
          <input
            type="date"
            value={sendDate}
            onChange={(e) => setSendDate(e.target.value)}
            className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
          />
        </label>
        <label className="block">
          Due date
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
          />
        </label>
        <label className="block">
          Late fee ($)
          <input
            type="number"
            step="0.01"
            min="0"
            value={(lateFeeCents / 100).toFixed(2)}
            onChange={(e) =>
              setLateFeeCents(Math.round(parseFloat(e.target.value || '0') * 100))
            }
            className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
          />
        </label>
        <label className="block">
          Grace days
          <input
            type="number"
            min="0"
            value={lateFeeGraceDays}
            onChange={(e) => setLateFeeGraceDays(parseInt(e.target.value || '0'))}
            className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
          />
        </label>
      </div>

      <div>
        <div className="font-semibold mb-2">Line items</div>
        {lines.map((l, idx) => (
          <div
            key={idx}
            className="border border-slate-100 rounded p-3 mb-2 grid grid-cols-12 gap-2 items-center"
          >
            <input
              className="col-span-5 border border-slate-200 rounded px-2 py-1 text-sm"
              placeholder="Description"
              value={l.description}
              onChange={(e) =>
                setLines((ls) =>
                  ls.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)),
                )
              }
            />
            <input
              type="number"
              min="1"
              className="col-span-1 border border-slate-200 rounded px-2 py-1 text-sm"
              value={l.quantity}
              onChange={(e) =>
                setLines((ls) =>
                  ls.map((x, i) =>
                    i === idx
                      ? { ...x, quantity: Math.max(1, parseInt(e.target.value) || 1) }
                      : x,
                  ),
                )
              }
            />
            <input
              type="number"
              step="0.01"
              min="0"
              className="col-span-2 border border-slate-200 rounded px-2 py-1 text-sm"
              placeholder="Unit $"
              value={(l.unit_price_cents / 100).toFixed(2)}
              onChange={(e) =>
                setLines((ls) =>
                  ls.map((x, i) =>
                    i === idx
                      ? { ...x, unit_price_cents: Math.round(parseFloat(e.target.value || '0') * 100) }
                      : x,
                  ),
                )
              }
            />
            <input
              type="number"
              min="0"
              max="100"
              className="col-span-1 border border-slate-200 rounded px-2 py-1 text-sm"
              placeholder="% off"
              value={l.discount_pct}
              onChange={(e) =>
                setLines((ls) =>
                  ls.map((x, i) =>
                    i === idx ? { ...x, discount_pct: parseFloat(e.target.value) || 0 } : x,
                  ),
                )
              }
            />
            <input
              className="col-span-2 border border-slate-200 rounded px-2 py-1 text-xs"
              placeholder="Discount label"
              value={l.discount_label ?? ''}
              onChange={(e) =>
                setLines((ls) =>
                  ls.map((x, i) =>
                    i === idx ? { ...x, discount_label: e.target.value || null } : x,
                  ),
                )
              }
            />
            <button
              onClick={() => setLines((ls) => ls.filter((_, i) => i !== idx))}
              className="col-span-1 text-slate-400 hover:text-red-500 flex justify-center"
              title="Remove line"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={() =>
            setLines((ls) => [
              ...ls,
              { description: '', quantity: 1, unit_price_cents: 0, discount_pct: 0, discount_label: null },
            ])
          }
          className="text-xs bg-slate-100 hover:bg-slate-200 rounded px-3 py-1 inline-flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add line
        </button>
      </div>

      <label className="block">
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
        />
      </label>

      {err && <div className="text-red-600 text-xs">{err}</div>}

      <div className="flex gap-2">
        <button
          onClick={() => save(false)}
          disabled={busy}
          className="bg-teal-500 text-white rounded px-4 py-2 font-semibold disabled:opacity-50 inline-flex items-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
        </button>
        <button onClick={onCancel} className="bg-slate-100 rounded px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </div>
  )
}
