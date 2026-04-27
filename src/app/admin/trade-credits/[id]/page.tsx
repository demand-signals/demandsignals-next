'use client'

import { useEffect, useState, use, useCallback } from 'react'
import Link from 'next/link'
import { Loader2, Trash2, Coins } from 'lucide-react'
import { formatCents } from '@/lib/format'
import type { TradeCreditStatus } from '@/lib/invoice-types'

interface TradeCredit {
  id: string
  prospect_id: string
  sow_document_id: string | null
  invoice_id: string | null
  original_amount_cents: number
  remaining_cents: number
  description: string
  status: TradeCreditStatus
  opened_at: string
  closed_at: string | null
  notes: string | null
  prospect: { business_name: string; id: string } | null
}

interface Drawdown {
  id: string
  trade_credit_id: string
  amount_cents: number
  description: string
  delivered_on: string
  notes: string | null
  created_at: string
}

const STATUS_BADGE: Record<TradeCreditStatus, string> = {
  outstanding: 'bg-amber-100 text-amber-800',
  partial: 'bg-blue-100 text-blue-800',
  fulfilled: 'bg-emerald-100 text-emerald-800',
  written_off: 'bg-slate-100 text-slate-600',
}

export default function TradeCreditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [tc, setTc] = useState<TradeCredit | null>(null)
  const [drawdowns, setDrawdowns] = useState<Drawdown[]>([])
  const [loading, setLoading] = useState(true)

  // Record drawdown form state
  const [ddAmountInput, setDdAmountInput] = useState('0.00')
  const [ddAmountCents, setDdAmountCents] = useState(0)
  const [ddDescription, setDdDescription] = useState('')
  const [ddDeliveredOn, setDdDeliveredOn] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [ddNotes, setDdNotes] = useState('')
  const [ddBusy, setDdBusy] = useState(false)
  const [ddError, setDdError] = useState<string | null>(null)

  // Write-off state
  const [writeOffBusy, setWriteOffBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/trade-credits/${id}`)
    const data = await res.json()
    if (res.ok) {
      setTc(data.trade_credit)
      setDrawdowns(data.drawdowns ?? [])
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function recordDrawdown(e: React.FormEvent) {
    e.preventDefault()
    if (!ddDescription || ddAmountCents <= 0) {
      setDdError('Description and amount are required.')
      return
    }
    setDdBusy(true)
    setDdError(null)
    try {
      const res = await fetch(`/api/admin/trade-credits/${id}/drawdowns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_cents: ddAmountCents,
          description: ddDescription,
          delivered_on: ddDeliveredOn,
          notes: ddNotes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      // Reset form
      setDdAmountInput('0.00')
      setDdAmountCents(0)
      setDdDescription('')
      setDdNotes('')
      setDdDeliveredOn(new Date().toISOString().slice(0, 10))
      await load()
    } catch (e) {
      setDdError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setDdBusy(false)
    }
  }

  async function deleteDrawdown(drawdownId: string) {
    if (!confirm('Undo this draw-down? The amount will be added back to remaining.')) return
    const res = await fetch(`/api/admin/trade-credits/${id}/drawdowns/${drawdownId}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? 'Failed')
      return
    }
    await load()
  }

  async function writeOff() {
    if (!confirm('Write off the remaining balance? This marks the credit as written_off.')) return
    setWriteOffBusy(true)
    const res = await fetch(`/api/admin/trade-credits/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'written_off' }),
    })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? 'Failed')
    }
    setWriteOffBusy(false)
    await load()
  }

  if (loading) {
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    )
  }

  if (!tc) return <div className="p-6">Trade credit not found.</div>

  const drawnDown = tc.original_amount_cents - tc.remaining_cents
  const isActive = tc.status === 'outstanding' || tc.status === 'partial'

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/trade-credits" className="text-sm text-teal-600 hover:underline">
            ← Trade Credits
          </Link>
          <Coins className="w-5 h-5 text-amber-500" />
          <h1 className="text-xl font-bold text-slate-900">{tc.description}</h1>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[tc.status]}`}>
          {tc.status}
        </span>
      </div>

      {/* Summary card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs uppercase text-slate-400 font-semibold mb-1">Client</div>
            <Link
              href={`/admin/prospects/${tc.prospect_id}`}
              className="font-semibold text-teal-700 hover:underline"
            >
              {tc.prospect?.business_name ?? tc.prospect_id}
            </Link>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-400 font-semibold mb-1">Opened</div>
            <div>{new Date(tc.opened_at).toLocaleDateString()}</div>
          </div>
          {tc.closed_at && (
            <div>
              <div className="text-xs uppercase text-slate-400 font-semibold mb-1">Closed</div>
              <div>{new Date(tc.closed_at).toLocaleDateString()}</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm pt-3 border-t border-slate-100">
          <div>
            <div className="text-xs uppercase text-slate-400 font-semibold mb-1">Original</div>
            <div className="font-bold text-lg">{formatCents(tc.original_amount_cents)}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-400 font-semibold mb-1">Drawn down</div>
            <div className="font-bold text-lg text-emerald-700">
              {drawnDown > 0 ? formatCents(drawnDown) : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-400 font-semibold mb-1">Remaining</div>
            <div className="font-bold text-lg text-amber-700">
              {tc.remaining_cents > 0 ? formatCents(tc.remaining_cents) : '—'}
            </div>
          </div>
        </div>

        {/* Source links */}
        {(tc.sow_document_id || tc.invoice_id) && (
          <div className="pt-3 border-t border-slate-100 text-sm space-y-1">
            {tc.sow_document_id && (
              <div>
                <span className="text-slate-400">SOW: </span>
                <Link
                  href={`/admin/sow/${tc.sow_document_id}`}
                  className="text-teal-600 hover:underline"
                >
                  View SOW
                </Link>
              </div>
            )}
            {tc.invoice_id && (
              <div>
                <span className="text-slate-400">Invoice: </span>
                <Link
                  href={`/admin/invoices/${tc.invoice_id}`}
                  className="text-teal-600 hover:underline"
                >
                  View Invoice
                </Link>
              </div>
            )}
          </div>
        )}

        {tc.notes && (
          <div className="pt-3 border-t border-slate-100">
            <div className="text-xs uppercase text-slate-400 font-semibold mb-1">Notes</div>
            <p className="text-sm text-slate-700">{tc.notes}</p>
          </div>
        )}
      </div>

      {/* Drawdown history */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-slate-900">Trade deliveries</h2>
        {drawdowns.length === 0 ? (
          <p className="text-sm text-slate-400">No deliveries recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-xs uppercase text-slate-400 font-semibold">
                  Date
                </th>
                <th className="text-left py-2 text-xs uppercase text-slate-400 font-semibold">
                  Description
                </th>
                <th className="text-right py-2 text-xs uppercase text-slate-400 font-semibold">
                  Amount
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {drawdowns.map((dd) => (
                <tr key={dd.id} className="border-b border-slate-50">
                  <td className="py-2 text-slate-500 text-xs">
                    {new Date(dd.delivered_on).toLocaleDateString()}
                  </td>
                  <td className="py-2 text-slate-700">
                    {dd.description}
                    {dd.notes && (
                      <div className="text-xs text-slate-400">{dd.notes}</div>
                    )}
                  </td>
                  <td className="py-2 text-right font-semibold text-emerald-700">
                    {formatCents(dd.amount_cents)}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => deleteDrawdown(dd.id)}
                      className="text-slate-300 hover:text-red-500"
                      title="Undo this delivery"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Record delivery form */}
      {isActive && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">Record trade delivery</h2>
          <form onSubmit={recordDrawdown} className="space-y-3 text-sm">
            <div className="grid grid-cols-[1fr_160px] gap-3">
              <label>
                <span className="text-xs uppercase font-semibold text-slate-400">Description</span>
                <input
                  type="text"
                  value={ddDescription}
                  onChange={(e) => setDdDescription(e.target.value)}
                  placeholder="What did the client deliver?"
                  className="w-full border border-slate-200 rounded px-2 py-1.5 mt-1"
                  required
                />
              </label>
              <label>
                <span className="text-xs uppercase font-semibold text-slate-400">Amount ($)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={ddAmountInput}
                  onChange={(e) => setDdAmountInput(e.target.value)}
                  onBlur={() => {
                    const cents = Math.round(parseFloat(ddAmountInput || '0') * 100)
                    setDdAmountCents(cents)
                    setDdAmountInput((cents / 100).toFixed(2))
                  }}
                  className="w-full border border-slate-200 rounded px-2 py-1.5 mt-1"
                  required
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="text-xs uppercase font-semibold text-slate-400">Delivered on</span>
                <input
                  type="date"
                  value={ddDeliveredOn}
                  onChange={(e) => setDdDeliveredOn(e.target.value)}
                  className="w-full border border-slate-200 rounded px-2 py-1.5 mt-1"
                />
              </label>
              <label>
                <span className="text-xs uppercase font-semibold text-slate-400">Notes (optional)</span>
                <input
                  type="text"
                  value={ddNotes}
                  onChange={(e) => setDdNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded px-2 py-1.5 mt-1"
                />
              </label>
            </div>

            {ddError && <div className="text-red-600 text-sm">{ddError}</div>}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={ddBusy}
                className="bg-teal-500 text-white rounded-lg px-4 py-2 font-semibold hover:bg-teal-600 disabled:opacity-50 flex items-center gap-2"
              >
                {ddBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                Record delivery
              </button>
              <span className="text-xs text-slate-400">
                Max: {formatCents(tc.remaining_cents)}
              </span>
            </div>
          </form>
        </div>
      )}

      {/* Write-off */}
      {isActive && (
        <div className="pt-2">
          <button
            onClick={writeOff}
            disabled={writeOffBusy}
            className="text-sm text-slate-400 hover:text-red-600 underline flex items-center gap-1"
          >
            {writeOffBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Write off remaining balance
          </button>
          <p className="text-xs text-slate-400 mt-1">
            Use this if the trade is no longer expected — marks the credit as written_off
            without recording a delivery.
          </p>
        </div>
      )}
    </div>
  )
}
