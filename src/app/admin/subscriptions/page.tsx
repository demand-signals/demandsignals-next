'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Plus } from 'lucide-react'

interface SubscriptionRow {
  id: string
  status: string
  current_period_start: string
  current_period_end: string
  next_invoice_date: string
  canceled_at: string | null
  prospect: { business_name: string; owner_email: string | null } | null
  plan: { name: string; price_cents: number; billing_interval: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  trialing: 'bg-blue-100 text-blue-700',
  past_due: 'bg-red-100 text-red-700',
  canceled: 'bg-slate-200 text-slate-600',
  paused: 'bg-amber-100 text-amber-800',
}

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<SubscriptionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    setLoading(true)
    const sp = new URLSearchParams()
    if (statusFilter) sp.set('status', statusFilter)
    fetch(`/api/admin/subscriptions?${sp}`)
      .then((r) => r.json())
      .then((d) => setSubs(d.subscriptions ?? []))
      .finally(() => setLoading(false))
  }, [statusFilter])

  const mrr = subs
    .filter((s) => s.status === 'active' && s.plan?.billing_interval === 'month')
    .reduce((total, s) => total + (s.plan?.price_cents ?? 0), 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscriptions</h1>
          <div className="text-sm text-slate-500 mt-1">
            MRR: <span className="font-semibold text-slate-800">${(mrr / 100).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/subscription-plans"
            className="bg-slate-100 hover:bg-slate-200 rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Plans
          </Link>
          <Link
            href="/admin/subscriptions/new"
            className="inline-flex items-center gap-2 bg-teal-500 text-white rounded-lg px-4 py-2 font-semibold hover:bg-teal-600"
          >
            <Plus className="w-4 h-4" />
            New Subscription
          </Link>
        </div>
      </div>

      <label className="text-sm">
        Status:&nbsp;
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded px-2 py-1"
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="past_due">Past Due</option>
          <option value="paused">Paused</option>
          <option value="canceled">Canceled</option>
        </select>
      </label>

      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      ) : subs.length === 0 ? (
        <div className="text-center p-16 text-slate-400">No subscriptions yet</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-right px-4 py-3">Price</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Next invoice</th>
                <th className="text-left px-4 py-3">Period ends</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/subscriptions/${s.id}`} className="text-teal-600 hover:underline">
                      {s.prospect?.business_name ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{s.plan?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    ${((s.plan?.price_cents ?? 0) / 100).toFixed(2)}
                    <span className="text-xs text-slate-400"> / {s.plan?.billing_interval ?? ''}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                        STATUS_COLORS[s.status] ?? 'bg-slate-100'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{s.next_invoice_date}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(s.current_period_end).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
