'use client'

// RetainerLedgerPanel — attorney-style prepaid retainer surface for the client
// detail page. Distinct from RetainerPanel.tsx (the /quote monthly-retainer
// launch panel). Shows the balance, the pending-debits approval queue (with the
// role picker that prices human hours from the rate card), manual funding, and
// depletion status.
//
// Opt-in: if the client has no ledger, shows an "Open retainer" affordance.

import { useCallback, useEffect, useState } from 'react'
import { formatCents } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Role {
  key: string
  name: string
  hourly_rate_cents: number
}
interface Ledger {
  id: string
  balance_cents: number
  lifetime_credited_cents: number
  lifetime_debited_cents: number
  hourly_rate_cents: number | null
  notify_pct: number
  reup_pct: number
  auto_reup_enabled: boolean
  status: string
}
interface Txn {
  id: string
  direction: 'credit' | 'debit'
  status: 'pending' | 'approved' | 'waived' | 'void'
  amount_cents: number
  source: string
  role: string | null
  hours: number | null
  description: string
  created_at: string
}
interface Summary {
  ledger: Ledger | null
  pending: Txn[]
  history: Txn[]
  pct_depleted: number
}

export default function RetainerLedgerPanel({ prospectId }: { prospectId: string }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, rc] = await Promise.all([
        fetch(`/api/admin/prospects/${prospectId}/retainer`).then((r) => r.json()),
        fetch('/api/admin/rate-card').then((r) => r.json()),
      ])
      setSummary(s)
      setRoles(rc.roles ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [prospectId])
  useEffect(() => {
    load()
  }, [load])

  async function post(url: string, body: unknown, tag: string) {
    setBusy(tag)
    setError(null)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Request failed')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <div className="text-slate-400 text-sm py-6">Loading retainer…</div>

  const ledger = summary?.ledger

  // ── No ledger: opt-in affordance ──
  if (!ledger) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6" id="retainer">
        <h3 className="font-semibold text-slate-800">Retainer</h3>
        <p className="text-sm text-slate-500 mt-1 mb-4">
          This client has no retainer. Open one to bill work against a prepaid balance.
        </p>
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        <button
          onClick={() => post(`/api/admin/prospects/${prospectId}/retainer`, {}, 'open')}
          disabled={busy === 'open'}
          className="text-sm font-semibold px-4 py-2 rounded-lg bg-[var(--teal)] text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy === 'open' ? 'Opening…' : 'Open retainer'}
        </button>
      </div>
    )
  }

  const roleRate = (key: string | null) =>
    roles.find((r) => r.key === key)?.hourly_rate_cents ?? null

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5" id="retainer">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Retainer</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {summary!.pct_depleted}% depleted · notify {ledger.notify_pct}% · re-up {ledger.reup_pct}%
            {' · auto re-up '}
            {ledger.auto_reup_enabled ? 'on' : 'off'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-800">{formatCents(ledger.balance_cents)}</div>
          <div className="text-xs text-slate-400">balance</div>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {/* Add funds */}
      <AddFunds prospectId={prospectId} busy={busy} onPost={post} />

      {/* Pending debits queue */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Pending debits ({summary!.pending.length})
        </h4>
        {summary!.pending.length === 0 ? (
          <p className="text-sm text-slate-400">No pending debits.</p>
        ) : (
          <div className="space-y-2">
            {summary!.pending.map((tx) => (
              <PendingDebitRow
                key={tx.id}
                tx={tx}
                roles={roles}
                roleRate={roleRate}
                busy={busy}
                onAction={(body) => post(`/api/admin/retainer-transactions/${tx.id}`, body, tx.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* History (compact) */}
      {summary!.history.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-500 hover:text-slate-800">
            History ({summary!.history.length})
          </summary>
          <div className="mt-2 space-y-1">
            {summary!.history.slice(0, 30).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between text-xs py-1 border-b border-slate-50"
              >
                <span className="text-slate-600 truncate max-w-xs">{tx.description}</span>
                <span className="flex items-center gap-2">
                  <StatusChip status={tx.status} />
                  <span
                    className={cn(
                      'font-mono',
                      tx.direction === 'credit' ? 'text-green-600' : 'text-slate-700',
                      tx.status === 'waived' || tx.status === 'void' ? 'line-through text-slate-300' : '',
                    )}
                  >
                    {tx.direction === 'credit' ? '+' : '−'}
                    {formatCents(tx.amount_cents)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function AddFunds({
  prospectId,
  busy,
  onPost,
}: {
  prospectId: string
  busy: string | null
  onPost: (url: string, body: unknown, tag: string) => void
}) {
  const [amount, setAmount] = useState('')
  const dollars = Number(amount)
  const valid = Number.isFinite(dollars) && dollars > 0
  return (
    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
      <span className="text-sm text-slate-500">Add funds $</span>
      <input
        type="number"
        min={0}
        step={100}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00"
        className="w-28 text-right font-mono border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-[var(--teal)]"
      />
      <button
        disabled={!valid || busy === 'credit'}
        onClick={() => {
          onPost(
            `/api/admin/prospects/${prospectId}/retainer/credit`,
            { amount_cents: Math.round(dollars * 100), description: 'Retainer funding' },
            'credit',
          )
          setAmount('')
        }}
        className="text-sm font-semibold px-3 py-1.5 rounded bg-[var(--teal)] text-white hover:opacity-90 disabled:opacity-40"
      >
        {busy === 'credit' ? 'Adding…' : 'Add to balance'}
      </button>
    </div>
  )
}

function PendingDebitRow({
  tx,
  roles,
  roleRate,
  busy,
  onAction,
}: {
  tx: Txn
  roles: Role[]
  roleRate: (key: string | null) => number | null
  busy: string | null
  onAction: (body: unknown) => void
}) {
  const [role, setRole] = useState<string>(tx.role ?? '')
  const [waiveReason, setWaiveReason] = useState('')
  const [showWaive, setShowWaive] = useState(false)

  const hours = Number(tx.hours ?? 0)
  const rate = roleRate(role || null)
  // Preview: human hours × role rate + the LLM baseline already in amount_cents
  // (a role-less handoff debit stores the LLM-only baseline as amount_cents).
  const humanCents = rate != null ? Math.round(hours * rate) : 0
  const previewCents = humanCents + tx.amount_cents

  const isBusy = busy === tx.id

  return (
    <div className="border border-slate-200 rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-sm text-slate-800 truncate">{tx.description}</div>
          <div className="text-xs text-slate-400">
            {hours > 0 && <>{hours} hrs · </>}
            {tx.source}
            {tx.amount_cents > 0 && <> · LLM {formatCents(tx.amount_cents)}</>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-[var(--teal)]"
        >
          <option value="">Pick role…</option>
          {roles.map((r) => (
            <option key={r.key} value={r.key}>
              {r.name} (${(r.hourly_rate_cents / 100).toFixed(0)}/hr)
            </option>
          ))}
        </select>

        {role && (
          <span className="text-xs text-slate-500">
            → <span className="font-mono font-semibold text-slate-800">{formatCents(previewCents)}</span>
            {hours > 0 && rate != null && (
              <span className="text-slate-400">
                {' '}({hours}h × ${(rate / 100).toFixed(0)}
                {tx.amount_cents > 0 && ` + ${formatCents(tx.amount_cents)} LLM`})
              </span>
            )}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          disabled={!role || isBusy}
          onClick={() => onAction({ action: 'approve', role })}
          className="text-xs font-semibold px-3 py-1 rounded bg-[var(--teal)] text-white hover:opacity-90 disabled:opacity-40"
        >
          {isBusy ? '…' : 'Approve'}
        </button>
        <button
          disabled={isBusy}
          onClick={() => setShowWaive((v) => !v)}
          className="text-xs font-semibold px-3 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
        >
          Waive
        </button>
        <button
          disabled={isBusy}
          onClick={() => {
            const reason = prompt('Void reason (wrong/duplicate entry):')
            if (reason) onAction({ action: 'void', reason })
          }}
          className="text-xs font-semibold px-3 py-1 rounded text-red-500 hover:bg-red-50"
        >
          Void
        </button>
      </div>

      {showWaive && (
        <div className="flex items-center gap-2 pt-1">
          <input
            value={waiveReason}
            onChange={(e) => setWaiveReason(e.target.value)}
            placeholder="Reason — e.g. rework on our error"
            className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-[var(--teal)]"
          />
          <button
            disabled={!waiveReason.trim() || isBusy}
            onClick={() => onAction({ action: 'waive', reason: waiveReason })}
            className="text-xs font-semibold px-3 py-1 rounded bg-amber-500 text-white hover:opacity-90 disabled:opacity-40"
          >
            Confirm waive
          </button>
        </div>
      )}
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  const cls =
    status === 'approved'
      ? 'bg-green-100 text-green-700'
      : status === 'waived'
        ? 'bg-amber-100 text-amber-700'
        : status === 'void'
          ? 'bg-slate-100 text-slate-400'
          : 'bg-blue-100 text-blue-700'
  return <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', cls)}>{status}</span>
}
