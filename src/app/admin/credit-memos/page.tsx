'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { formatCents } from '@/lib/format'
import { cn } from '@/lib/utils'
import { NewCreditMemoModal } from './NewCreditMemoModal'

interface CreditMemoRow {
  id: string
  credit_memo_number: string
  invoice_id: string
  prospect_id: string
  amount_cents: number
  currency: string
  kind: 'refund' | 'goodwill' | 'dispute' | 'write_off'
  reason: string
  payment_method: string | null
  payment_reference: string | null
  stripe_refund_id: string | null
  issued_at: string
  prospects: { business_name: string } | null
  invoices: { invoice_number: string } | null
}

const KIND_BADGE: Record<string, string> = {
  refund:    'bg-orange-100 text-orange-700',
  goodwill:  'bg-teal-100 text-teal-700',
  dispute:   'bg-red-100 text-red-700',
  write_off: 'bg-slate-200 text-slate-700',
}

const KIND_LABEL: Record<string, string> = {
  refund:    'Refund',
  goodwill:  'Goodwill',
  dispute:   'Dispute',
  write_off: 'Write-off',
}

export default function CreditMemosPage() {
  const [rows, setRows] = useState<CreditMemoRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  function load() {
    setLoading(true)
    fetch('/api/admin/credit-memos?limit=100')
      .then((r) => r.json())
      .then((d) => {
        setRows(d.credit_memos ?? [])
        setTotal(d.total ?? 0)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const totalAmountCents = rows.reduce((sum, r) => sum + r.amount_cents, 0)

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Credit Memos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Refunds, goodwill credits, dispute records, and write-offs.
            Each memo applies against an invoice.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {total > 0 && (
            <div className="text-right">
              <div className="text-lg font-bold text-slate-800">{formatCents(totalAmountCents)}</div>
              <div className="text-xs text-slate-400">{total} memo{total !== 1 ? 's' : ''}</div>
            </div>
          )}
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--teal)] text-white text-sm font-semibold hover:bg-[var(--teal-dark)]"
          >
            <Plus className="w-4 h-4" /> New Credit Memo
          </button>
        </div>
      </div>

      {showNew && (
        <NewCreditMemoModal
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load() }}
        />
      )}

      {loading && (
        <div className="text-slate-400 text-sm py-12 text-center">Loading credit memos…</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-400 text-sm">No credit memos yet.</p>
          <p className="text-slate-400 text-xs mt-1">
            Click <strong>New Credit Memo</strong> to issue a refund, goodwill credit, or write-off against an invoice.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Memo #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice #</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Kind</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Issued</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/credit-memos/${r.id}`}
                      className="font-mono text-xs text-[var(--teal)] hover:underline font-semibold"
                    >
                      {r.credit_memo_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.prospects?.business_name ?? <span className="text-slate-400">—</span>}
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
                  <td className="px-4 py-3 text-right font-mono font-semibold text-orange-600">
                    −{formatCents(r.amount_cents)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                      KIND_BADGE[r.kind] ?? 'bg-slate-100 text-slate-600',
                    )}>
                      {KIND_LABEL[r.kind] ?? r.kind}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(r.issued_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {total > rows.length && (
            <div className="px-4 py-3 border-t border-slate-100 text-center text-xs text-slate-400">
              Showing {rows.length} of {total} memos
            </div>
          )}
        </div>
      )}
    </div>
  )
}
