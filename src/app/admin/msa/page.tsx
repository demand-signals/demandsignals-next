'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, FileSignature, ExternalLink } from 'lucide-react'

interface MsaRow {
  id: string
  msa_number: string
  status: string
  client_legal_name: string | null
  client_code: string | null
  effective_date: string | null
  prospect_id: string | null
  sent_at: string | null
  viewed_at: string | null
  executed_at: string | null
  created_at: string
  prospects: { business_name: string } | null
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-amber-100 text-amber-700',
  executed: 'bg-emerald-100 text-emerald-700',
  void: 'bg-red-100 text-red-700',
}

function fmt(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminMsaPage() {
  const [msas, setMsas] = useState<MsaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    setLoading(true)
    const sp = new URLSearchParams()
    if (statusFilter) sp.set('status', statusFilter)
    fetch(`/api/admin/msa?${sp}`)
      .then((r) => r.json())
      .then((d) => setMsas(d.msas ?? []))
      .finally(() => setLoading(false))
  }, [statusFilter])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Master Service Agreements</h1>
          <p className="mt-1 text-sm text-slate-500">
            The relationship contract, signed once per client. Send the onboarding kit (MSA +
            disclosures) from a prospect&rsquo;s page &rarr; <span className="font-medium">Onboarding Kit</span> card.
          </p>
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
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="viewed">Viewed</option>
          <option value="executed">Executed</option>
          <option value="void">Void</option>
        </select>
      </label>

      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      ) : msas.length === 0 ? (
        <div className="text-center p-16 text-slate-400">
          <FileSignature className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          No agreements yet. Send an onboarding kit from a prospect&rsquo;s page to create one.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left px-4 py-3">MSA #</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Sent</th>
                <th className="text-left px-4 py-3">Executed</th>
                <th className="text-right px-4 py-3">PDF</th>
              </tr>
            </thead>
            <tbody>
              {msas.map((m) => (
                <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{m.msa_number}</td>
                  <td className="px-4 py-3">
                    {m.prospect_id ? (
                      <Link href={`/admin/prospects/${m.prospect_id}`} className="text-teal-600 hover:underline">
                        {m.prospects?.business_name ?? m.client_legal_name ?? '—'}
                      </Link>
                    ) : (
                      m.client_legal_name ?? '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{m.client_code ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[m.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{fmt(m.sent_at)}</td>
                  <td className="px-4 py-3 text-slate-500">{fmt(m.executed_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/api/admin/msa/${m.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-teal-600 hover:underline"
                    >
                      PDF <ExternalLink className="h-3 w-3" />
                    </a>
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
