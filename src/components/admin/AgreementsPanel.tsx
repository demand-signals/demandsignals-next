'use client'

// ── AgreementsPanel ──────────────────────────────────────────────────
// Shows a prospect/client's Master Service Agreements with status + a
// link to the signed PDF. Mounted on both the prospect and client pages
// so executed agreements are always accessible from either surface.

import { useEffect, useState } from 'react'
import { FileSignature, ExternalLink, Loader2, Check } from 'lucide-react'

interface MsaRow {
  id: string
  msa_number: string
  status: string
  client_code: string | null
  effective_date: string | null
  sent_at: string | null
  executed_at: string | null
  created_at: string
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

export function AgreementsPanel({ prospectId }: { prospectId: string }) {
  const [msas, setMsas] = useState<MsaRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/msa?prospect_id=${prospectId}`)
      .then((r) => r.json())
      .then((d) => setMsas(d.msas ?? []))
      .finally(() => setLoading(false))
  }, [prospectId])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <FileSignature className="h-4 w-4 text-teal-600" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Agreements</h3>
      </div>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
      ) : msas.length === 0 ? (
        <p className="text-sm text-slate-400">No agreements yet.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {msas.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-2.5">
              <span className="font-mono text-xs text-slate-500">{m.msa_number}</span>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[m.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {m.status === 'executed' && <Check className="mr-1 inline h-3 w-3" />}
                {m.status}
              </span>
              <span className="text-xs text-slate-400">
                {m.status === 'executed' ? `signed ${fmt(m.executed_at)}` : m.sent_at ? `sent ${fmt(m.sent_at)}` : `created ${fmt(m.created_at)}`}
              </span>
              <a
                href={`/api/admin/msa/${m.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-sm text-teal-600 hover:underline"
              >
                PDF <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
