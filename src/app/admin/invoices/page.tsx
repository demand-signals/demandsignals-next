'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Plus } from 'lucide-react'
import { formatCents } from '@/lib/format'

interface InvoiceRow {
  id: string
  invoice_number: string
  kind: string
  status: string
  total_due_cents: number
  auto_generated: boolean
  auto_trigger: string | null
  created_at: string
  sent_at: string | null
  viewed_at: string | null
  paid_at: string | null
  stripe_payment_link_url: string | null
  subscription_intent: 'none' | 'pending' | 'created'
  term_months: number | null
  until_cancelled: boolean
  prospects: { business_name: string } | null
  // Computed server-side per migration 043:
  //   project_cents = sum of one_time line totals
  //   subscriptions_cents = sum of monthly+annual line totals at full per-cycle price
  // total_due_cents stays as-is (= project + first cycle of recurring) and feeds $ Total.
  project_cents: number
  subscriptions_cents: number
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-700',
  void: 'bg-red-100 text-red-700 opacity-60',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString()
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [autoOnly, setAutoOnly] = useState(false)

  useEffect(() => {
    setLoading(true)
    const sp = new URLSearchParams()
    if (statusFilter) sp.set('status', statusFilter)
    if (autoOnly) sp.set('auto_generated', 'true')
    fetch(`/api/admin/invoices?${sp}`)
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices ?? []))
      .finally(() => setLoading(false))
  }, [statusFilter, autoOnly])

  const needsReview = invoices.filter((i) => i.auto_generated && i.status === 'draft').length
  const outstanding = invoices
    .filter((i) => ['sent', 'viewed'].includes(i.status))
    .reduce((s, i) => s + i.total_due_cents, 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <div className="text-sm text-slate-500 mt-1">
            Outstanding:{' '}
            <span className="font-semibold text-slate-800">{formatCents(outstanding)}</span>
          </div>
        </div>
        <Link
          href="/admin/invoices/new"
          className="inline-flex items-center gap-2 bg-[var(--teal,#68c5ad)] text-white rounded-lg px-4 py-2 font-semibold hover:bg-teal-600"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </Link>
      </div>

      {needsReview > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900">
          🍽️ {needsReview} auto-generated draft{needsReview === 1 ? '' : 's'} ready for review
        </div>
      )}

      <div className="flex gap-4 items-center text-sm flex-wrap">
        <label>
          Status:&nbsp;
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded px-2 py-1"
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoOnly}
            onChange={(e) => setAutoOnly(e.target.checked)}
          />
          Auto-generated only
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center p-16 text-slate-400">No invoices yet</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Invoice #</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-right px-4 py-3">$ Project</th>
                <th className="text-right px-4 py-3">$ Subscriptions</th>
                <th className="text-right px-4 py-3">$ Total</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Sent</th>
                <th className="text-left px-4 py-3">Last Viewed</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono">
                    <Link
                      href={`/admin/invoices/${inv.id}`}
                      className="text-teal-600 hover:underline"
                    >
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{inv.prospects?.business_name ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {inv.project_cents > 0 ? formatCents(inv.project_cents) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {inv.subscriptions_cents > 0
                      ? <>
                          {formatCents(inv.subscriptions_cents)}
                          <span className="text-xs text-slate-400">/cycle</span>
                          {inv.subscription_intent === 'created' && (
                            <span className="ml-1 text-[10px] text-emerald-700" title="Stripe subscription is live">●</span>
                          )}
                          {inv.subscription_intent === 'pending' && (
                            <span className="ml-1 text-[10px] text-amber-600" title="Stripe subscription will be created on payment">○</span>
                          )}
                        </>
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatCents(inv.total_due_cents)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                        STATUS_COLORS[inv.status]
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(inv.sent_at)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(inv.viewed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
