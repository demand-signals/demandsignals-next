'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Loader2, UserCheck, Search, Plus, UserMinus, Trash2 } from 'lucide-react'
import { formatCents } from '@/lib/format'
import { NewClientModal } from './NewClientModal'

interface ClientRow {
  id: string
  business_name: string
  owner_name: string | null
  owner_email: string | null
  owner_phone: string | null
  business_phone: string | null
  city: string | null
  state: string | null
  client_code: string | null
  became_client_at: string | null
  last_contacted_at: string | null
  tags: string[]
  project_count: number
  active_project_count: number
  subscription_count: number
  active_subscription_count: number
  active_monthly_cents: number
}

export default function ManageClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/clients')
      .then((r) => r.json())
      .then((d) => setClients(d.clients ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDemote(id: string) {
    if (!confirm('Demote this client back to prospect? Subscriptions and projects stay intact; only the client flag is removed.')) return
    setBusyId(id)
    const res = await fetch(`/api/admin/prospects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_client: false }),
    })
    setBusyId(null)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(j.error ?? 'Demote failed')
      return
    }
    load()
  }

  async function handleDelete(id: string) {
    setBusyId(id)
    const res = await fetch(`/api/admin/prospects/${id}`, { method: 'DELETE' })
    setBusyId(null)
    setConfirmDelete(null)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(j.error ?? 'Delete failed')
      return
    }
    load()
  }

  const filtered = clients.filter((c) => {
    if (!filter) return true
    const f = filter.toLowerCase()
    return (
      c.business_name.toLowerCase().includes(f) ||
      (c.owner_name ?? '').toLowerCase().includes(f) ||
      (c.owner_email ?? '').toLowerCase().includes(f) ||
      (c.client_code ?? '').toLowerCase().includes(f)
    )
  })

  const totalMrr = clients.reduce((s, c) => s + c.active_monthly_cents, 0)
  const activeClients = clients.filter((c) => c.active_subscription_count > 0).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-[var(--teal)]" />
          Manage Clients
        </h1>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--teal)] text-white text-sm font-semibold hover:bg-[var(--teal-dark)]"
        >
          <Plus className="w-4 h-4" /> New Client
        </button>
      </div>

      {showNew && (
        <NewClientModal
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load() }}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total clients" value={String(clients.length)} />
        <StatCard label="With active subs" value={String(activeClients)} accent="text-emerald-700" />
        <StatCard label="MRR" value={formatCents(totalMrr)} accent="text-emerald-700" />
        <StatCard
          label="Avg client value"
          value={clients.length > 0 ? formatCents(Math.round(totalMrr / clients.length)) : '—'}
          accent="text-slate-700"
        />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name, email, or client code"
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
        />
      </div>

      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      ) : filtered.length === 0 ? (
        <div className="text-center p-16 text-slate-400">
          {clients.length === 0
            ? 'No clients yet — clients are created when prospects accept a SOW.'
            : 'No clients match this filter.'}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Contact</th>
                <th className="text-right px-4 py-3">Projects</th>
                <th className="text-right px-4 py-3">Subs</th>
                <th className="text-right px-4 py-3">MRR</th>
                <th className="text-left px-4 py-3">Since</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/prospects/${c.id}`} className="font-medium text-teal-600 hover:underline">
                      {c.business_name}
                    </Link>
                    {(c.city || c.state) && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {[c.city, c.state].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.client_code ? (
                      <span className="text-[11px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                        {c.client_code}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {c.owner_name && <div className="text-slate-700 text-sm">{c.owner_name}</div>}
                    {c.owner_email && (
                      <a href={`mailto:${c.owner_email}`} className="text-teal-600 hover:underline">
                        {c.owner_email}
                      </a>
                    )}
                    {c.owner_phone && (
                      <div className="text-slate-500">
                        <a href={`tel:${c.owner_phone}`} className="hover:underline">{c.owner_phone}</a>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 text-sm">
                    <div>{c.project_count}</div>
                    {c.active_project_count > 0 && (
                      <div className="text-[10px] text-emerald-600">{c.active_project_count} active</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 text-sm">
                    <div>{c.subscription_count}</div>
                    {c.active_subscription_count > 0 && (
                      <div className="text-[10px] text-emerald-600">{c.active_subscription_count} active</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.active_monthly_cents > 0 ? (
                      <span className="font-semibold text-emerald-700 tabular-nums">
                        {formatCents(c.active_monthly_cents)}<span className="text-[10px] text-slate-400">/mo</span>
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {c.became_client_at ? new Date(c.became_client_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {confirmDelete === c.id ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={busyId === c.id}
                          className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                        >
                          {busyId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleDemote(c.id)}
                          disabled={busyId === c.id}
                          className="inline-flex items-center justify-center w-7 h-7 rounded text-slate-400 hover:text-amber-500 hover:bg-amber-50 disabled:opacity-50"
                          title="Demote back to prospect"
                        >
                          {busyId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(c.id)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
                          title="Delete client (and underlying prospect)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
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

function StatCard({ label, value, accent = 'text-slate-800' }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${accent}`}>{value}</div>
    </div>
  )
}
