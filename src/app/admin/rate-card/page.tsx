'use client'

import { useEffect, useState } from 'react'
import { formatCents } from '@/lib/format'
import { cn } from '@/lib/utils'

interface RateCardRole {
  id: string
  key: string
  name: string
  hourly_rate_cents: number
  when_applied: string | null
  sort_order: number
  active: boolean
  no_discounts: boolean
}

interface RateCardMarkup {
  id: string
  key: string
  name: string
  markup_bps: number
  description: string | null
  sort_order: number
  active: boolean
}

export default function RateCardPage() {
  const [roles, setRoles] = useState<RateCardRole[]>([])
  const [markups, setMarkups] = useState<RateCardMarkup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  // Local edit buffers keyed by role/markup key.
  const [rateEdits, setRateEdits] = useState<Record<string, string>>({})
  const [markupEdits, setMarkupEdits] = useState<Record<string, string>>({})

  function load() {
    setLoading(true)
    fetch('/api/admin/rate-card')
      .then((r) => r.json())
      .then((d) => {
        setRoles(d.roles ?? [])
        setMarkups(d.markups ?? [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function saveRole(key: string) {
    const raw = rateEdits[key]
    if (raw == null) return
    const dollars = Number(raw)
    if (!Number.isFinite(dollars) || dollars < 0) {
      setError('Rate must be a non-negative number')
      return
    }
    setSavingKey(key)
    setError(null)
    try {
      const res = await fetch('/api/admin/rate-card', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'role', key, hourly_rate_cents: Math.round(dollars * 100) }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Save failed')
      setRoles((prev) => prev.map((r) => (r.key === key ? d.role : r)))
      setRateEdits((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingKey(null)
    }
  }

  async function saveMarkup(key: string) {
    const raw = markupEdits[key]
    if (raw == null) return
    const pct = Number(raw)
    if (!Number.isFinite(pct) || pct < 0) {
      setError('Markup must be a non-negative percent')
      return
    }
    setSavingKey(key)
    setError(null)
    try {
      const res = await fetch('/api/admin/rate-card', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'markup', key, markup_bps: Math.round(pct * 100) }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Save failed')
      setMarkups((prev) => prev.map((m) => (m.key === key ? d.markup : m)))
      setMarkupEdits((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Rate Card</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Single source of truth for role-based hourly rates + pass-through markups. Drives
          retainer drawdown, invoices, SOWs, and the client rate sheet. LLM token cost basis
          stays internal (not shown here).
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm py-12 text-center">Loading rate card…</div>
      ) : (
        <>
          {/* ── Roles ── */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Role-based hourly rates
            </h2>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">When applied</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate ($/hr)</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roles.map((r) => {
                    const editing = rateEdits[r.key] != null
                    const dirty = editing && Number(rateEdits[r.key]) !== r.hourly_rate_cents / 100
                    return (
                      <tr key={r.key} className={cn('hover:bg-slate-50', !r.active && 'opacity-50')}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{r.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{r.key}
                            {r.no_discounts && <span className="ml-2 text-amber-600">no discounts</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-md">{r.when_applied}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <span className="text-slate-400">$</span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={editing ? rateEdits[r.key] : String(r.hourly_rate_cents / 100)}
                              onChange={(e) =>
                                setRateEdits((prev) => ({ ...prev, [r.key]: e.target.value }))
                              }
                              className="w-20 text-right font-mono border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-[var(--teal)]"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            disabled={!dirty || savingKey === r.key}
                            onClick={() => saveRole(r.key)}
                            className={cn(
                              'text-xs font-semibold px-3 py-1 rounded transition-colors',
                              dirty
                                ? 'bg-[var(--teal)] text-white hover:opacity-90'
                                : 'bg-slate-100 text-slate-400 cursor-default',
                            )}
                          >
                            {savingKey === r.key ? 'Saving…' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Markups ── */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pass-through markup tiers
            </h2>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tier</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Covers</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Markup (%)</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {markups.map((m) => {
                    const editing = markupEdits[m.key] != null
                    const dirty = editing && Number(markupEdits[m.key]) !== m.markup_bps / 100
                    return (
                      <tr key={m.key} className={cn('hover:bg-slate-50', !m.active && 'opacity-50')}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{m.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{m.key}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-md">{m.description}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <span className="text-slate-400">+</span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={editing ? markupEdits[m.key] : String(m.markup_bps / 100)}
                              onChange={(e) =>
                                setMarkupEdits((prev) => ({ ...prev, [m.key]: e.target.value }))
                              }
                              className="w-16 text-right font-mono border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-[var(--teal)]"
                            />
                            <span className="text-slate-400">%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            disabled={!dirty || savingKey === m.key}
                            onClick={() => saveMarkup(m.key)}
                            className={cn(
                              'text-xs font-semibold px-3 py-1 rounded transition-colors',
                              dirty
                                ? 'bg-[var(--teal)] text-white hover:opacity-90'
                                : 'bg-slate-100 text-slate-400 cursor-default',
                            )}
                          >
                            {savingKey === m.key ? 'Saving…' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400">
              Note: the raw LLM token cost basis and internal margin stay in{' '}
              <span className="font-mono">llm-rates.json</span> — never stored in the database or
              shown to clients. Only the disclosed markup percentage lives here.
            </p>
          </section>
        </>
      )}
    </div>
  )
}
