'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Plus } from 'lucide-react'

interface SowRow {
  id: string
  sow_number: string
  title: string
  status: string
  pricing: { total_cents: number; deposit_cents: number; deposit_pct: number }
  prospects: { business_name: string } | null
  created_at: string
  sent_at: string | null
  accepted_at: string | null
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-amber-100 text-amber-800',
  accepted: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-slate-200 text-slate-600',
  void: 'bg-red-100 text-red-700 opacity-60',
}

export default function AdminSowPage() {
  const [sows, setSows] = useState<SowRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    setLoading(true)
    const sp = new URLSearchParams()
    if (statusFilter) sp.set('status', statusFilter)
    fetch(`/api/admin/sow?${sp}`)
      .then((r) => r.json())
      .then((d) => setSows(d.sows ?? []))
      .finally(() => setLoading(false))
  }, [statusFilter])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Statements of Work</h1>
        <Link
          href="/admin/sow/new"
          className="inline-flex items-center gap-2 bg-teal-500 text-white rounded-lg px-4 py-2 font-semibold hover:bg-teal-600"
        >
          <Plus className="w-4 h-4" />
          New SOW
        </Link>
      </div>

      <label className="text-sm">
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
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
          <option value="void">Void</option>
        </select>
      </label>

      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      ) : sows.length === 0 ? (
        <div className="text-center p-16 text-slate-400">No SOWs yet</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left px-4 py-3">SOW #</th>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Sent</th>
              </tr>
            </thead>
            <tbody>
              {sows.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono">
                    <Link href={`/admin/sow/${s.id}`} className="text-teal-600 hover:underline">
                      {s.sow_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{s.title}</td>
                  <td className="px-4 py-3">{s.prospects?.business_name ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    ${(s.pricing.total_cents / 100).toFixed(2)}
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
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {s.sent_at ? new Date(s.sent_at).toLocaleDateString() : '—'}
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
