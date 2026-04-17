'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Phone, PhoneOff, Flame } from 'lucide-react'

interface QuoteRow {
  id: string
  business_name: string | null
  business_type: string | null
  business_location: string | null
  phone_verified: boolean
  phone_last_four: string | null
  estimate_low: number | null
  estimate_high: number | null
  monthly_low: number | null
  monthly_high: number | null
  accuracy_pct: number
  status: string
  conversion_action: string | null
  handoff_offered: boolean
  selected_items: unknown[]
  total_cost_cents: number
  device: string | null
  created_at: string
  updated_at: string
}

function formatCents(cents: number | null): string {
  if (!cents) return '—'
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}

function formatRange(low: number | null, high: number | null): string {
  if (!low && !high) return '—'
  if (low === high) return formatCents(low)
  return `${formatCents(low)}–${formatCents(high)}`
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function AdminQuotesPage() {
  const [rows, setRows] = useState<QuoteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<string>('')
  const [search, setSearch] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/quotes?${params}`)
      const data = await res.json()
      if (cancelled) return
      setRows(data.data ?? [])
      setTotal(data.total ?? 0)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [status, search])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotes</h1>
          <p className="text-sm text-slate-500">{total} sessions</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search business or phone last 4…"
          className="px-3 py-2 border border-slate-200 rounded-md text-sm w-64"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-md text-sm"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="abandoned">Abandoned</option>
          <option value="converted">Converted</option>
          <option value="expired">Expired</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--teal)]" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-slate-400">No quote sessions yet.</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Estimate</th>
                <th className="px-4 py-3">Monthly</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/quotes/${r.id}`} className="font-medium text-[var(--teal)] hover:underline">
                      {r.business_name ?? '(anonymous)'}
                    </Link>
                    {r.business_location && (
                      <div className="text-xs text-slate-500">{r.business_location}</div>
                    )}
                    {r.handoff_offered && (
                      <span className="inline-flex items-center gap-1 text-xs text-orange-600 mt-1">
                        <Flame className="w-3 h-3" /> hot signal
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {Array.isArray(r.selected_items) ? r.selected_items.length : 0}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatRange(r.estimate_low, r.estimate_high)}
                    {r.accuracy_pct > 0 && (
                      <div className="text-xs text-slate-400">{r.accuracy_pct}% detail</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.monthly_high ? `${formatRange(r.monthly_low, r.monthly_high)}/mo` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.phone_verified ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <Phone className="w-3 h-3" />
                        …{r.phone_last_four}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <PhoneOff className="w-3 h-3" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs ${
                        r.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : r.status === 'converted'
                            ? 'bg-blue-50 text-blue-700'
                            : r.status === 'blocked'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {r.status}
                    </span>
                    {r.conversion_action && (
                      <div className="text-xs text-slate-500 mt-0.5">{r.conversion_action}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatCents(r.total_cost_cents)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{timeAgo(r.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
