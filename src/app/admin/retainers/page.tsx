'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatCents } from '@/lib/format'
import { cn } from '@/lib/utils'

interface LedgerRow {
  id: string
  prospect_id: string
  business_name: string
  client_code: string | null
  balance_cents: number
  lifetime_credited_cents: number
  lifetime_debited_cents: number
  notify_pct: number
  reup_pct: number
  auto_reup_enabled: boolean
  status: string
  pct_depleted: number
}

function depletionColor(pct: number, notify: number, reup: number): string {
  if (pct >= reup) return 'bg-red-500'
  if (pct >= notify) return 'bg-amber-500'
  return 'bg-[var(--teal)]'
}

export default function RetainersPage() {
  const [ledgers, setLedgers] = useState<LedgerRow[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/retainers')
      .then((r) => r.json())
      .then((d) => {
        setLedgers(d.ledgers ?? [])
        setPendingCount(d.pending_count ?? 0)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const totalOnBooks = ledgers
    .filter((l) => l.status === 'active')
    .reduce((s, l) => s + l.balance_cents, 0)

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Retainers</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Prepaid client balances. Work draws down the pool; low balances notify + auto-draft a
            re-up invoice.
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-slate-800">{formatCents(totalOnBooks)}</div>
          <div className="text-xs text-slate-400">on the books</div>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm flex items-center justify-between">
          <span>
            <strong>{pendingCount}</strong> pending debit{pendingCount !== 1 ? 's' : ''} awaiting
            approval across all clients.
          </span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm py-12 text-center">Loading retainers…</div>
      ) : ledgers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-400 text-sm">No retainers open yet.</p>
          <p className="text-slate-400 text-xs mt-1">
            Open a retainer from a client&rsquo;s detail page, or on SOW accept for a retainer
            engagement.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-48">Depletion</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Auto re-up</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledgers.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/prospects/${l.prospect_id}#retainer`}
                      className="font-semibold text-slate-800 hover:text-[var(--teal)]"
                    >
                      {l.business_name}
                    </Link>
                    {l.client_code && (
                      <span className="ml-2 text-xs text-slate-400 font-mono">{l.client_code}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                    {formatCents(l.balance_cents)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', depletionColor(l.pct_depleted, l.notify_pct, l.reup_pct))}
                          style={{ width: `${Math.min(100, l.pct_depleted)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 w-9 text-right">{l.pct_depleted}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('text-xs', l.auto_reup_enabled ? 'text-[var(--teal)]' : 'text-slate-400')}>
                      {l.auto_reup_enabled ? 'on' : 'off'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                        l.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500',
                      )}
                    >
                      {l.status}
                    </span>
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
