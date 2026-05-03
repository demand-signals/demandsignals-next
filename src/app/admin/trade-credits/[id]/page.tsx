'use client'

import { useEffect, useState, use, useCallback } from 'react'
import Link from 'next/link'
import { Loader2, Trash2, Coins, FileText } from 'lucide-react'
import { formatCents } from '@/lib/format'
import type { TradeCreditStatus } from '@/lib/invoice-types'
import { InlineEditText } from '@/components/admin/inline-edit-text'

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

// Result shape returned by the trade-payment endpoint after recording.
interface TradePaymentResult {
  receipt: { id: string; receipt_number: string } | null
  send_channel: 'email' | 'sms' | 'both' | 'none'
  email: { success: boolean; error?: string } | null
  sms: { success: boolean; error?: string } | null
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

  // Record-trade-payment form state. The DB row is still called a
  // "drawdown" — UI copy reflects the canonical model: client paying
  // their TIK balance with services/labor/goods.
  const [ddAmountInput, setDdAmountInput] = useState('0.00')
  const [ddAmountCents, setDdAmountCents] = useState(0)
  const [ddDescription, setDdDescription] = useState('')
  const [ddDeliveredOn, setDdDeliveredOn] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [ddNotes, setDdNotes] = useState('')
  const [ddSendChannel, setDdSendChannel] = useState<'email' | 'sms' | 'both' | 'none'>('both')
  const [ddBusy, setDdBusy] = useState(false)
  const [ddError, setDdError] = useState<string | null>(null)
  const [ddResult, setDdResult] = useState<TradePaymentResult | null>(null)

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

  async function recordTradePayment(e: React.FormEvent) {
    e.preventDefault()
    if (!ddDescription || ddAmountCents <= 0) {
      setDdError('Description and value are required.')
      return
    }
    setDdBusy(true)
    setDdError(null)
    setDdResult(null)
    try {
      const res = await fetch(`/api/admin/trade-credits/${id}/drawdowns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_cents: ddAmountCents,
          description: ddDescription,
          delivered_on: ddDeliveredOn,
          notes: ddNotes || null,
          send_channel: ddSendChannel,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setDdResult({
        receipt: data.receipt ?? null,
        send_channel: data.send_channel ?? 'none',
        email: data.email ?? null,
        sms: data.sms ?? null,
      })
      // Reset form (keep delivered_on at today and channel as-is)
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
    if (!confirm('Undo this trade payment? The amount will be added back to the TIK balance. The associated receipt is NOT auto-voided — handle that separately if needed.')) return
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

  async function saveDescription(description: string) {
    const res = await fetch(`/api/admin/trade-credits/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? 'Update failed')
    }
    // Optimistic local update so the title renders the new name immediately.
    setTc((prev) => (prev ? { ...prev, description } : prev))
    load()
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
          {/* Description is the live working name. SOW's trade_credit_description
              is the snapshot at acceptance — they can drift, that's fine. */}
          <InlineEditText
            as="h1"
            className="text-xl font-bold text-slate-900"
            value={tc.description}
            onSave={saveDescription}
            placeholder="Untitled trade credit"
          />
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
            <div className="text-xs uppercase text-slate-400 font-semibold mb-1">Paid by trade</div>
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

      {/* Trade payment history */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-slate-900">Trade payments</h2>
        {drawdowns.length === 0 ? (
          <p className="text-sm text-slate-400">No trade payments recorded yet.</p>
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
                      title="Undo this trade payment"
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

      {/* Record trade payment form */}
      {isActive && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-slate-900">Record trade payment</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              The client paid down their TIK balance with services, labor, or goods.
              We&apos;ll mint a receipt and send it to them.
            </p>
          </div>
          <form onSubmit={recordTradePayment} className="space-y-3 text-sm">
            <div className="grid grid-cols-[1fr_160px] gap-3">
              <label>
                <span className="text-xs uppercase font-semibold text-slate-400">What did the client deliver?</span>
                <input
                  type="text"
                  value={ddDescription}
                  onChange={(e) => setDdDescription(e.target.value)}
                  placeholder="e.g. Mechanic services on team van — 3 hrs labor"
                  className="w-full border border-slate-200 rounded px-2 py-1.5 mt-1"
                  required
                />
              </label>
              <label>
                <span className="text-xs uppercase font-semibold text-slate-400">In-kind value ($)</span>
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
                <span className="text-xs uppercase font-semibold text-slate-400">Send receipt via</span>
                <select
                  value={ddSendChannel}
                  onChange={(e) => setDdSendChannel(e.target.value as 'email' | 'sms' | 'both' | 'none')}
                  className="w-full border border-slate-200 rounded px-2 py-1.5 mt-1 bg-white"
                >
                  <option value="both">Email + SMS</option>
                  <option value="email">Email only</option>
                  <option value="sms">SMS only</option>
                  <option value="none">Don&apos;t send (record only)</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-xs uppercase font-semibold text-slate-400">Internal notes (optional)</span>
              <input
                type="text"
                value={ddNotes}
                onChange={(e) => setDdNotes(e.target.value)}
                placeholder="Anything for the file — not shown to client"
                className="w-full border border-slate-200 rounded px-2 py-1.5 mt-1"
              />
            </label>

            {ddError && <div className="text-red-600 text-sm">{ddError}</div>}

            {ddResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm space-y-1.5">
                {ddResult.receipt && (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <Link
                      href={`/admin/receipts/${ddResult.receipt.id}`}
                      className="font-semibold text-emerald-800 hover:underline"
                    >
                      {ddResult.receipt.receipt_number}
                    </Link>
                    <span className="text-emerald-700">issued</span>
                  </div>
                )}
                {ddResult.email && (
                  <div className="text-xs text-emerald-700">
                    Email: {ddResult.email.success
                      ? '✓ sent'
                      : <span className="text-red-600">failed — {ddResult.email.error}</span>}
                  </div>
                )}
                {ddResult.sms && (
                  <div className="text-xs text-emerald-700">
                    SMS: {ddResult.sms.success
                      ? '✓ sent'
                      : <span className="text-red-600">failed — {ddResult.sms.error}</span>}
                  </div>
                )}
                {ddResult.send_channel === 'none' && (
                  <div className="text-xs text-slate-500">No send dispatched (record-only).</div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={ddBusy}
                className="bg-teal-500 text-white rounded-lg px-4 py-2 font-semibold hover:bg-teal-600 disabled:opacity-50 flex items-center gap-2"
              >
                {ddBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                Record trade payment
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
            without recording a trade payment. No receipt is sent.
          </p>
        </div>
      )}
    </div>
  )
}
