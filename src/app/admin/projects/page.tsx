'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, FolderKanban } from 'lucide-react'
import { formatCents } from '@/lib/format'

interface ProjectRow {
  id: string
  name: string
  status: string
  start_date: string | null
  monthly_value: number | null
  created_at: string
  prospects: { business_name: string; is_client: boolean } | null
  invoice_count: number
  paid_invoice_count: number
  total_invoiced_cents: number
  total_paid_cents: number
  active_monthly_cents: number
}

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  on_hold: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700 opacity-60',
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/admin/projects')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FolderKanban className="w-6 h-6 text-[var(--teal)]" />
          Projects
        </h1>
      </div>

      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      ) : projects.length === 0 ? (
        <div className="text-center p-16 text-slate-400">
          No projects yet — projects are auto-created when a client accepts a SOW.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left px-4 py-3">Project</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Invoiced / Paid</th>
                <th className="text-right px-4 py-3">Monthly</th>
                <th className="text-left px-4 py-3">Started</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/admin/projects/${p.id}`} className="text-teal-600 hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {p.prospects?.business_name ?? '—'}
                    {p.prospects?.is_client && (
                      <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--teal)]/10 text-[var(--teal)]">
                        CLIENT
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                        STATUS_COLORS[p.status] ?? 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    <div className="text-sm">{formatCents(p.total_invoiced_cents)}</div>
                    <div className="text-[11px] text-slate-500">
                      {formatCents(p.total_paid_cents)} paid
                      {p.invoice_count > 0 && (
                        <span className="ml-1 text-slate-400">
                          ({p.paid_invoice_count}/{p.invoice_count})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {p.active_monthly_cents > 0
                      ? <span>{formatCents(p.active_monthly_cents)}<span className="text-[11px] text-slate-400">/mo</span></span>
                      : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {p.start_date ? new Date(p.start_date).toLocaleDateString() : '—'}
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
