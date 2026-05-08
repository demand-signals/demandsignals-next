'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Key, Plus, Loader2, Eye, Ban } from 'lucide-react'
import { CreateTokenModal } from './CreateTokenModal'

interface AdminInfo {
  display_name: string | null
  email: string | null
}

interface CliTokenRow {
  id: string
  name: string
  prefix: string
  last4: string
  created_at: string
  expires_at: string | null
  last_used_at: string | null
  revoked_at: string | null
  revoked_reason: string | null
  created_by: string
  created_by_admin: AdminInfo | null
  revoked_by_admin: AdminInfo | null
}

type StatusKey = 'active' | 'expires_soon' | 'expired' | 'revoked'

function tokenStatus(t: CliTokenRow): StatusKey {
  if (t.revoked_at) return 'revoked'
  if (t.expires_at) {
    const expMs = new Date(t.expires_at).getTime()
    if (Number.isFinite(expMs)) {
      if (expMs <= Date.now()) return 'expired'
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
      if (expMs - Date.now() < sevenDaysMs) return 'expires_soon'
    }
  }
  return 'active'
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function adminLabel(a: AdminInfo | null): string {
  if (!a) return '—'
  return a.display_name ?? a.email ?? '—'
}

const STATUS_TINTS: Record<StatusKey, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  expires_soon: 'bg-amber-100 text-amber-700',
  expired: 'bg-slate-100 text-slate-500',
  revoked: 'bg-slate-100 text-slate-400 line-through',
}
const STATUS_LABELS: Record<StatusKey, string> = {
  active: 'ACTIVE',
  expires_soon: 'EXPIRES SOON',
  expired: 'EXPIRED',
  revoked: 'REVOKED',
}

export default function CliTokensPage() {
  const [tokens, setTokens] = useState<CliTokenRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/cli-tokens')
      .then((r) => r.json())
      .then((d) => setTokens(d.tokens ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this token? It will be denied immediately. You\'ll need to generate a new one and update Y:\\.credentials\\dsig.env if anything was using it.')) {
      return
    }
    setBusyId(id)
    const res = await fetch(`/api/admin/cli-tokens/${id}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    setBusyId(null)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(j.error ?? 'Revoke failed')
      return
    }
    load()
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Key className="w-6 h-6 text-[var(--teal)]" />
            CLI Tokens
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Bearer tokens for <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">/handoff</code> Step 11.D and similar admin tooling. Stored in
            {' '}<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">Y:\.credentials\dsig.env</code>{' '}
            as <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">DSIG_CLI_TOKEN</code>. Shared across all admin workstations.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--teal)] text-white text-sm font-semibold hover:bg-[var(--teal-dark)]"
        >
          <Plus className="w-4 h-4" /> Generate token
        </button>
      </div>

      {showCreate && (
        <CreateTokenModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            load()
          }}
        />
      )}

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin inline" />
        </div>
      ) : tokens.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-500">
          No CLI tokens yet. Click <strong>Generate token</strong> to create one.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Prefix · Last4</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-left px-4 py-3">Expires</th>
                <th className="text-left px-4 py-3">Last used</th>
                <th className="text-left px-4 py-3">Created by</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => {
                const status = tokenStatus(t)
                return (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/account/cli-tokens/${t.id}`}
                        className="font-medium text-teal-600 hover:underline"
                      >
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                      {t.prefix}…{t.last4}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(t.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {t.expires_at ? fmtDate(t.expires_at) : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(t.last_used_at)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{adminLabel(t.created_by_admin)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${STATUS_TINTS[status]}`}>
                        {STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/admin/account/cli-tokens/${t.id}`}
                          className="inline-flex items-center justify-center w-7 h-7 rounded text-slate-400 hover:text-teal-600 hover:bg-teal-50"
                          title="View audit log"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        {!t.revoked_at && (
                          <button
                            onClick={() => handleRevoke(t.id)}
                            disabled={busyId === t.id}
                            className="inline-flex items-center justify-center w-7 h-7 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                            title="Revoke"
                          >
                            {busyId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
