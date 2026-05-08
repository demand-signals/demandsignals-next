'use client'

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Key } from 'lucide-react'

interface AdminInfo {
  display_name: string | null
  email: string | null
}

interface CliToken {
  id: string
  name: string
  prefix: string
  last4: string
  created_at: string
  expires_at: string | null
  last_used_at: string | null
  revoked_at: string | null
  revoked_reason: string | null
  created_by_admin: AdminInfo | null
  revoked_by_admin: AdminInfo | null
}

interface AuditRow {
  id: string
  method: string
  path: string
  status_code: number
  ip: string | null
  user_agent: string | null
  failure_reason: string | null
  created_at: string
}

const STATUS_TINT: Record<number, string> = {
  200: 'text-emerald-700 bg-emerald-50',
  401: 'text-red-700 bg-red-50',
  429: 'text-amber-700 bg-amber-50',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function adminLabel(a: AdminInfo | null): string {
  if (!a) return '—'
  return a.display_name ?? a.email ?? '—'
}

export default function CliTokenAuditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [token, setToken] = useState<CliToken | null>(null)
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const limit = 50

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/admin/cli-tokens/${id}`).then((r) => r.json()),
      fetch(`/api/admin/cli-tokens/${id}/audit?limit=${limit}&offset=${offset}`).then((r) => r.json()),
    ])
      .then(([tokenRes, auditRes]) => {
        setToken(tokenRes.token ?? null)
        setAudit(auditRes.audit ?? [])
        setTotal(auditRes.total ?? 0)
      })
      .finally(() => setLoading(false))
  }, [id, offset])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <Link
        href="/admin/account/cli-tokens"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All CLI tokens
      </Link>

      {loading && !token ? (
        <div className="text-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400 inline" />
        </div>
      ) : token ? (
        <>
          {/* Token info card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-[var(--teal)]" />
                  {token.name}
                </h1>
                <div className="mt-2 font-mono text-xs text-slate-500">
                  {token.prefix}…{token.last4}
                </div>
              </div>
              {token.revoked_at && (
                <span className="px-2 py-1 rounded text-[11px] font-semibold tracking-wide bg-slate-100 text-slate-500">
                  REVOKED
                </span>
              )}
            </div>
            <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Field label="Created" value={fmtDate(token.created_at)} />
              <Field label="Expires" value={token.expires_at ? fmtDate(token.expires_at) : 'Never'} />
              <Field label="Last used" value={fmtDate(token.last_used_at)} />
              <Field label="Created by" value={adminLabel(token.created_by_admin)} />
              {token.revoked_at && (
                <>
                  <Field label="Revoked at" value={fmtDate(token.revoked_at)} />
                  <Field label="Revoked by" value={adminLabel(token.revoked_by_admin)} />
                  {token.revoked_reason && <Field label="Reason" value={token.revoked_reason} />}
                </>
              )}
            </dl>
          </div>

          {/* Audit log */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">
                Audit log ({total} total)
              </h2>
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-2 py-1 rounded border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
                >
                  Prev
                </button>
                <span className="text-slate-500">
                  {offset + 1}–{Math.min(offset + limit, total)}
                </span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="px-2 py-1 rounded border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
            {loading ? (
              <div className="px-4 py-8 text-center">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400 inline" />
              </div>
            ) : audit.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-slate-500">
                No audit rows yet. Hit the CLI endpoint to generate activity.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="text-left px-4 py-2">Time</th>
                    <th className="text-left px-4 py-2">Method</th>
                    <th className="text-left px-4 py-2">Path</th>
                    <th className="text-right px-4 py-2">Status</th>
                    <th className="text-left px-4 py-2">IP</th>
                    <th className="text-left px-4 py-2">Failure reason</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((a) => (
                    <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 text-xs text-slate-500">{fmtDate(a.created_at)}</td>
                      <td className="px-4 py-2 text-xs font-mono text-slate-600">{a.method}</td>
                      <td className="px-4 py-2 text-xs font-mono text-slate-700">{a.path}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_TINT[a.status_code] ?? 'text-slate-500 bg-slate-50'}`}>
                          {a.status_code}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500">{a.ip ?? '—'}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">{a.failure_reason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-500">
          Token not found.
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-slate-700 mt-0.5">{value}</dd>
    </div>
  )
}
