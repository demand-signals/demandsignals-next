'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Coins } from 'lucide-react'
import { formatCents } from '@/lib/format'
import { cn } from '@/lib/utils'

interface TradeCreditRow {
  id: string
  prospect_id: string
  sow_document_id: string | null
  invoice_id: string | null
  original_amount_cents: number
  remaining_cents: number
  description: string
  status: 'outstanding' | 'partial' | 'fulfilled' | 'written_off'
  opened_at: string
  closed_at: string | null
  notes: string | null
  prospect: { business_name: string } | null
}

const STATUS_BADGE: Record<string, string> = {
  outstanding: 'bg-amber-100 text-amber-700',
  partial:     'bg-blue-100 text-blue-700',
  fulfilled:   'bg-emerald-100 text-emerald-700',
  written_off: 'bg-slate-200 text-slate-600',
}

const STATUS_LABEL: Record<string, string> = {
  outstanding: 'Outstanding',
  partial:     'Partially drawn',
  fulfilled:   'Fulfilled',
  written_off: 'Written off',
}

export default function TradeCreditsPage() {
  const [rows, setRows] = useState<TradeCreditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  function load() {
    setLoading(true)
    const url = statusFilter === 'all'
      ? '/api/admin/trade-credits'
      : `/api/admin/trade-credits?status=${statusFilter}`
    fetch(url)
      .then((r) => r.json())
      .then((d) => setRows(d.trade_credits ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [statusFilter])

  // Summary aggregates
  const totalOutstandingCents = rows
    .filter((r) => r.status === 'outstanding' || r.status === 'partial')
    .reduce((s, r) => s + r.remaining_cents, 0)
  const totalDrawnCents = rows.reduce(
    (s, r) => s + (r.original_amount_cents - r.remaining_cents),
    0,
  )
  const activeCount = rows.filter((r) => r.status === 'outstanding' || r.status === 'partial').length

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Coins className="w-6 h-6 text-[var(--teal)]" />
            Trade Credits
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Trade-in-Kind balances clients owe us. Each ledger tracks original value, remaining balance, and the trade payments (services, labor, goods) clients deliver against it.
          </p>
        </div>
        <Link
          href="/admin/trade-credits/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--teal)] text-white text-sm font-semibold hover:bg-[var(--teal-dark)]"
        >
          <Plus className="w-4 h-4" /> New Trade Credit
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Outstanding balance" value={formatCents(totalOutstandingCents)} accent="text-amber-700" />
        <SummaryCard label="Active ledgers" value={String(activeCount)} accent="text-slate-800" />
        <SummaryCard label="Paid by trade (all time)" value={formatCents(totalDrawnCents)} accent="text-slate-800" />
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'outstanding', 'partial', 'fulfilled', 'written_off'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-colors',
              statusFilter === s
                ? 'bg-[var(--teal)] text-white border-[var(--teal)]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
            )}
          >
            {s === 'all' ? 'All' : STATUS_LABEL[s] ?? s}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-slate-400 text-sm py-12 text-center">Loading trade credits…</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-400 text-sm">
            {statusFilter === 'all'
              ? 'No trade credits yet.'
              : `No ${STATUS_LABEL[statusFilter] ?? statusFilter} credits.`}
          </p>
          <p className="text-slate-400 text-xs mt-1">
            Click <strong>New Trade Credit</strong> to open a TIK ledger against a prospect.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Original</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Remaining</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const drawnPct = r.original_amount_cents > 0
                  ? Math.round(((r.original_amount_cents - r.remaining_cents) / r.original_amount_cents) * 100)
                  : 0
                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/trade-credits/${r.id}`}
                        className="font-medium text-[var(--teal)] hover:underline"
                      >
                        {r.prospect?.business_name ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-md truncate" title={r.description}>
                      {r.description}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs tabular-nums">
                      {formatCents(r.original_amount_cents)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-semibold tabular-nums" style={{ color: r.remaining_cents > 0 ? '#1d2330' : '#94a0b8' }}>
                        {formatCents(r.remaining_cents)}
                      </div>
                      {r.original_amount_cents > 0 && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{drawnPct}% drawn</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                        STATUS_BADGE[r.status] ?? 'bg-slate-100 text-slate-600',
                      )}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(r.opened_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={cn('text-xl font-bold tabular-nums', accent)}>{value}</div>
    </div>
  )
}
