'use client'

// Lists invoices generated FROM this project (migration 054: invoices.project_id).
// Distinct from OutstandingObligations, which tracks installment schedules
// and TIK ledgers for SOW-driven invoices. This panel only shows invoices
// that carry the project_id back-link — i.e. invoices born from the
// "New Invoice" button on /admin/projects/[id].

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, FileText, ExternalLink } from 'lucide-react'
import { formatCents } from '@/lib/format'

interface InvoiceSummary {
  id: string
  invoice_number: string
  status: string
  total_due_cents: number
  currency: string
  created_at: string
  send_date: string | null
  due_date: string | null
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  issued: 'bg-blue-100 text-blue-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-slate-200 text-slate-500 line-through',
  refunded: 'bg-purple-100 text-purple-700',
}

export function ProjectInvoicesPanel({ projectId }: { projectId: string }) {
  const [invoices, setInvoices] = useState<InvoiceSummary[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/invoices?project_id=${encodeURIComponent(projectId)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (cancelled) return
        setInvoices(data.invoices ?? [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [projectId])

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading invoices…
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Invoices from this project</div>
        <div className="text-sm text-red-600">Error: {error}</div>
      </div>
    )
  }

  // Empty state — don't render the panel at all; cleaner than an empty card.
  if (!invoices || invoices.length === 0) return null

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Invoices from this project
        </div>
        <div className="text-xs text-slate-400">
          {invoices.length} invoice{invoices.length === 1 ? '' : 's'}
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {invoices.map((inv) => (
          <Link
            key={inv.id}
            href={`/admin/invoices/${inv.id}`}
            className="flex items-center justify-between py-2 hover:bg-slate-50 -mx-2 px-2 rounded transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">{inv.invoice_number}</div>
                <div className="text-xs text-slate-500">
                  {inv.send_date ? new Date(inv.send_date).toLocaleDateString() : 'unsent'}
                  {inv.due_date && <> · due {new Date(inv.due_date).toLocaleDateString()}</>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${STATUS_COLORS[inv.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {inv.status}
              </span>
              <span className="text-sm font-semibold text-slate-700 tabular-nums">
                {formatCents(inv.total_due_cents)}
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
