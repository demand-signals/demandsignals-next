'use client'

// ── DocumentsPanel ───────────────────────────────────────────────────
// Unified collapsible list of ALL documents for a prospect/client —
// MSAs, SOWs, invoices, receipts — each with status + a link to its PDF.

import { useEffect, useState } from 'react'
import { FileText, FileSignature, Receipt, FileCheck, ExternalLink, Loader2, ChevronDown } from 'lucide-react'

interface DocRow {
  kind: 'MSA' | 'SOW' | 'Invoice' | 'Receipt'
  id: string
  number: string
  status: string
  at: string | null
  pdfHref: string
}

function fmt(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const KIND_ICON = {
  MSA: FileSignature,
  SOW: FileText,
  Invoice: Receipt,
  Receipt: FileCheck,
}

export function DocumentsPanel({ prospectId }: { prospectId: string }) {
  const [docs, setDocs] = useState<DocRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const q = `prospect_id=${prospectId}`
    Promise.all([
      fetch(`/api/admin/msa?${q}`).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/admin/sow?${q}`).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/admin/invoices?${q}`).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/admin/receipts?${q}`).then((r) => r.json()).catch(() => ({})),
    ]).then(([msa, sow, inv, rec]) => {
      const rows: DocRow[] = []
      for (const m of msa.msas ?? []) rows.push({ kind: 'MSA', id: m.id, number: m.msa_number, status: m.status, at: m.executed_at ?? m.sent_at ?? m.created_at, pdfHref: `/api/admin/msa/${m.id}/pdf` })
      for (const s of sow.sows ?? []) rows.push({ kind: 'SOW', id: s.id, number: s.sow_number, status: s.status, at: s.accepted_at ?? s.sent_at ?? s.created_at, pdfHref: `/api/admin/sow/${s.id}/pdf` })
      for (const i of inv.invoices ?? []) rows.push({ kind: 'Invoice', id: i.id, number: i.invoice_number, status: i.status, at: i.paid_at ?? i.sent_at ?? i.created_at, pdfHref: `/api/admin/invoices/${i.id}/pdf` })
      for (const r of rec.receipts ?? []) rows.push({ kind: 'Receipt', id: r.id, number: r.receipt_number, status: r.status ?? 'issued', at: r.created_at, pdfHref: `/api/admin/receipts/${r.id}/pdf` })
      rows.sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
      setDocs(rows)
    }).finally(() => setLoading(false))
  }, [prospectId])

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 select-none">
        <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Documents {!loading && docs.length > 0 && <span className="text-slate-400">({docs.length})</span>}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </summary>

      <div className="px-4 pb-4">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
        ) : docs.length === 0 ? (
          <p className="text-sm text-slate-400">No documents yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {docs.map((d) => {
              const Icon = KIND_ICON[d.kind]
              return (
                <div key={`${d.kind}-${d.id}`} className="flex items-center gap-3 py-2.5 text-sm">
                  <Icon className="h-4 w-4 text-slate-400" />
                  <span className="w-16 text-xs font-medium text-slate-500">{d.kind}</span>
                  <span className="font-mono text-xs text-slate-600">{d.number}</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{d.status}</span>
                  <span className="text-xs text-slate-400">{fmt(d.at)}</span>
                  <a href={d.pdfHref} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-teal-600 hover:underline">
                    PDF <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </details>
  )
}
