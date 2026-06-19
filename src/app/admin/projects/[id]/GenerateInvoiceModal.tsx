'use client'

// /admin/projects/[id]/GenerateInvoiceModal.tsx
//
// v2 (2026-06-19): thin source chooser. Each option redirects to
// /admin/invoices/new?project_id=<id>&source=<bucket>. The full editor
// owns the line-item editing, catalog picker, discounts, payment terms,
// TIK, etc. — this modal just decides which seed bucket gets pre-loaded.
//
// Why: the original modal was opinionated and fast (3 clicks), but
// couldn't expose the rest of the invoice editor's controls (catalog,
// per-line discount, due date, late fees, TIK, subscription term). The
// /admin/invoices/new surface already has all of those, plus draft +
// preview + save flow. Routing the project flow into it consolidates on
// ONE creation surface, two entry points.
//
// Seed mechanics live in /api/admin/projects/[id]/invoice-seed — the
// editor calls it on mount when project_id is in the URL.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, X, FileText, Clock, FilePlus } from 'lucide-react'

interface SeedSummary {
  project: { id: string; name: string; prospect_id: string }
  prospect: { id: string; business_name: string; owner_name: string | null } | null
  deliverables_seed: { lines: unknown[] }
  time_entries_seed: { lines: unknown[]; entry_ids: string[] }
}

type SourceChoice = 'deliverables' | 'time_entries' | 'blank'

export function GenerateInvoiceModal({
  projectId,
  onClose,
}: {
  projectId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<SeedSummary | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/projects/${projectId}/invoice-seed`)
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error ?? `Failed to load seed (${res.status})`)
        }
        const data = (await res.json()) as SeedSummary
        if (!cancelled) setSummary(data)
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Load failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [projectId])

  function go(source: SourceChoice) {
    const qs = new URLSearchParams({ project_id: projectId, source })
    router.push(`/admin/invoices/new?${qs.toString()}`)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto pt-12 pb-12 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">New Invoice from Project</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading project data…
            </div>
          )}

          {err && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</p>
          )}

          {!loading && summary && (
            <>
              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                <div className="font-semibold text-slate-800">{summary.project.name}</div>
                {summary.prospect && (
                  <div className="text-xs text-slate-500 mt-1">
                    Client: {summary.prospect.business_name}
                    {summary.prospect.owner_name && <> · {summary.prospect.owner_name}</>}
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500">
                Choose a seed source. The full invoice editor will open with line items pre-populated — you can edit, add lines, set discounts, due date, payment terms before issuing.
              </p>

              <div className="space-y-2 pt-1">
                <SourceOption
                  icon={<FileText className="w-4 h-4" />}
                  title="Delivered phases & deliverables"
                  subtitle={
                    summary.deliverables_seed.lines.length > 0
                      ? `${summary.deliverables_seed.lines.length} line${summary.deliverables_seed.lines.length === 1 ? '' : 's'} from delivered work`
                      : 'No delivered deliverables on this project'
                  }
                  disabled={summary.deliverables_seed.lines.length === 0}
                  onClick={() => go('deliverables')}
                />

                <SourceOption
                  icon={<Clock className="w-4 h-4" />}
                  title="Time entries (uncovered)"
                  subtitle={
                    summary.time_entries_seed.lines.length > 0
                      ? `${summary.time_entries_seed.lines.length} phase bucket${summary.time_entries_seed.lines.length === 1 ? '' : 's'} · ${summary.time_entries_seed.entry_ids.length} entr${summary.time_entries_seed.entry_ids.length === 1 ? 'y' : 'ies'} will be marked covered on save`
                      : 'No uncovered time entries on this project'
                  }
                  disabled={summary.time_entries_seed.lines.length === 0}
                  onClick={() => go('time_entries')}
                />

                <SourceOption
                  icon={<FilePlus className="w-4 h-4" />}
                  title="Blank — prefill prospect + project link only"
                  subtitle="Open the invoice editor and add lines manually"
                  disabled={false}
                  onClick={() => go('blank')}
                />
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function SourceOption({
  icon,
  title,
  subtitle,
  disabled,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-3 rounded-lg border flex items-start gap-3 transition-colors ${
        disabled
          ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
          : 'border-slate-200 hover:border-teal-500 hover:bg-teal-50/40'
      }`}
    >
      <div className={disabled ? 'text-slate-400 mt-0.5' : 'text-teal-600 mt-0.5'}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>
      </div>
    </button>
  )
}
