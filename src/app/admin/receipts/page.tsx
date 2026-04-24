'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatCents } from '@/lib/format'
import { cn } from '@/lib/utils'

interface ReceiptRow {
  id: string
  receipt_number: string
  invoice_id: string
  prospect_id: string
  amount_cents: number
  currency: string
  payment_method: string
  payment_reference: string | null
  paid_at: string
  notes: string | null
  prospects: { business_name: string } | null
  invoices: { invoice_number: string } | null
}

const METHOD_BADGE: Record<string, string> = {
  stripe: 'bg-violet-100 text-violet-700',
  check: 'bg-amber-100 text-amber-700',
  wire: 'bg-blue-100 text-blue-700',
  cash: 'bg-green-100 text-green-700',
  trade: 'bg-teal-100 text-teal-700',
  zero_balance: 'bg-slate-100 text-slate-600',
  other: 'bg-slate-100 text-slate-600',
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/receipts?limit=100')
      .then((r) => r.json())
      .then((d) => {
        setReceipts(d.receipts ?? [])
        setTotal(d.total ?? 0)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const totalAmountCents = receipts.reduce((sum, r) => sum + r.amount_cents, 0)

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Receipts</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Immutable payment audit log. One receipt per payment event.
          </p>
        </div>
        {total > 0 && (
          <div className="text-right">
            <div className="text-lg font-bold text-slate-800">{formatCents(totalAmountCents)}</div>
            <div className="text-xs text-slate-400">{total} receipt{total !== 1 ? 's' : ''}</div>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-slate-400 text-sm py-12 text-center">Loading receipts…</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && receipts.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-400 text-sm">No receipts yet.</p>
          <p className="text-slate-400 text-xs mt-1">
            Receipts are created automatically when an invoice is marked paid.
          </p>
        </div>
      )}

      {receipts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Receipt #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice #</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Method</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipts.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/receipts/${r.id}`}
                      className="font-mono text-xs text-[var(--teal)] hover:underline font-semibold"
                    >
                      {r.receipt_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.prospects?.business_name ?? (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.invoices?.invoice_number ? (
                      <Link
                        href={`/admin/invoices/${r.invoice_id}`}
                        className="font-mono text-xs text-slate-500 hover:text-slate-800"
                      >
                        {r.invoices.invoice_number}
                      </Link>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                    {formatCents(r.amount_cents)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                      METHOD_BADGE[r.payment_method] ?? 'bg-slate-100 text-slate-600',
                    )}>
                      {r.payment_method.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(r.paid_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {total > receipts.length && (
            <div className="px-4 py-3 border-t border-slate-100 text-center text-xs text-slate-400">
              Showing {receipts.length} of {total} receipts
            </div>
          )}
        </div>
      )}
    </div>
  )
}
