'use client'

// /admin/projects/[id]/GenerateInvoiceModal.tsx
//
// Generates a new invoice from a completed project. Source workflow: a
// customer-service or one-off project that bypassed the SOW step now
// needs to be billed. The existing /admin/invoices/new flow expects you
// to manually pick a prospect and line items; this modal short-circuits
// that by seeding everything from the project.
//
// Three seed sources, user picks one:
//   1. Deliverables — every status='delivered' deliverable becomes a line
//   2. Time entries — uncovered entries grouped by phase, summed, one line each
//   3. Blank — only prospect_id + project_id pass through; user fills lines
//
// Submits to existing POST /api/admin/invoices with project_id +
// covered_time_entry_ids carried through. On success, navigates to the
// new invoice's detail page where the standard send/PDF/payment-link
// surfaces take over.

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, X, FileText, Clock, FilePlus } from 'lucide-react'
import { formatCents } from '@/lib/format'

interface CreateLineItem {
  description: string
  quantity: number
  unit_price_cents: number
  cadence: 'one_time' | 'monthly' | 'quarterly' | 'annual'
}

interface SeedResponse {
  project: { id: string; name: string; prospect_id: string }
  prospect: { id: string; business_name: string; owner_name: string | null; owner_email: string | null } | null
  deliverables_seed: { lines: CreateLineItem[] }
  time_entries_seed: { lines: CreateLineItem[]; entry_ids: string[] }
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
  const [seed, setSeed] = useState<SeedResponse | null>(null)
  const [source, setSource] = useState<SourceChoice>('deliverables')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Load seed on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/projects/${projectId}/invoice-seed`)
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error ?? `Failed to load seed (${res.status})`)
        }
        const data = (await res.json()) as SeedResponse
        if (cancelled) return
        setSeed(data)
        // Auto-pick the source that actually has lines, in priority order.
        if (data.deliverables_seed.lines.length > 0) setSource('deliverables')
        else if (data.time_entries_seed.lines.length > 0) setSource('time_entries')
        else setSource('blank')
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Load failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [projectId])

  const linesForSource = useCallback((): CreateLineItem[] => {
    if (!seed) return []
    if (source === 'deliverables') return seed.deliverables_seed.lines
    if (source === 'time_entries') return seed.time_entries_seed.lines
    return []
  }, [seed, source])

  const lines = linesForSource()
  const totalCents = lines.reduce(
    (s, l) => s + Math.max(0, l.unit_price_cents * l.quantity),
    0,
  )

  async function handleSubmit() {
    if (!seed) return
    setErr(null)
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        kind: 'business',
        prospect_id: seed.project.prospect_id,
        project_id: seed.project.id,
        line_items: lines,
        notes: `Generated from project: ${seed.project.name}`,
      }
      if (source === 'time_entries') {
        payload.covered_time_entry_ids = seed.time_entries_seed.entry_ids
      }
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `Invoice creation failed (${res.status})`)
      }
      const j = await res.json()
      const newId = j?.invoice?.id
      if (!newId) throw new Error('Invoice created but no ID returned')
      router.push(`/admin/invoices/${newId}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Submit failed')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto pt-12 pb-12 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Generate Invoice from Project</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading project data…
            </div>
          )}

          {!loading && seed && (
            <>
              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                <div className="font-semibold text-slate-800">{seed.project.name}</div>
                {seed.prospect && (
                  <div className="text-xs text-slate-500 mt-1">
                    Client: {seed.prospect.business_name}
                    {seed.prospect.owner_name && <> · {seed.prospect.owner_name}</>}
                  </div>
                )}
              </div>

              {/* Source picker */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">Seed line items from</label>

                <SourceOption
                  icon={<FileText className="w-4 h-4" />}
                  title="Delivered phases & deliverables"
                  subtitle={
                    seed.deliverables_seed.lines.length > 0
                      ? `${seed.deliverables_seed.lines.length} line${seed.deliverables_seed.lines.length === 1 ? '' : 's'} from delivered work`
                      : 'No delivered deliverables on this project'
                  }
                  selected={source === 'deliverables'}
                  disabled={seed.deliverables_seed.lines.length === 0}
                  onSelect={() => setSource('deliverables')}
                />

                <SourceOption
                  icon={<Clock className="w-4 h-4" />}
                  title="Time entries (uncovered)"
                  subtitle={
                    seed.time_entries_seed.lines.length > 0
                      ? `${seed.time_entries_seed.lines.length} phase bucket${seed.time_entries_seed.lines.length === 1 ? '' : 's'} · ${seed.time_entries_seed.entry_ids.length} entr${seed.time_entries_seed.entry_ids.length === 1 ? 'y' : 'ies'} will be marked covered`
                      : 'No uncovered time entries on this project'
                  }
                  selected={source === 'time_entries'}
                  disabled={seed.time_entries_seed.lines.length === 0}
                  onSelect={() => setSource('time_entries')}
                />

                <SourceOption
                  icon={<FilePlus className="w-4 h-4" />}
                  title="Blank — prefill prospect only"
                  subtitle="Open the invoice editor and add lines manually"
                  selected={source === 'blank'}
                  disabled={false}
                  onSelect={() => setSource('blank')}
                />
              </div>

              {/* Preview */}
              {source !== 'blank' && (
                <div className="border border-slate-200 rounded-lg">
                  <div className="px-3 py-2 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Preview ({lines.length} line{lines.length === 1 ? '' : 's'})
                  </div>
                  {lines.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-slate-400 italic">Nothing to bill from this source.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {lines.map((l, i) => (
                        <div key={i} className="px-3 py-2 flex items-center justify-between gap-3 text-sm">
                          <div className="flex-1 min-w-0">
                            <div className="text-slate-800 truncate">{l.description}</div>
                            <div className="text-xs text-slate-400">
                              {l.quantity} × {formatCents(l.unit_price_cents)}
                              {l.cadence !== 'one_time' && <> · {l.cadence}</>}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                            {formatCents(l.unit_price_cents * l.quantity)}
                          </div>
                        </div>
                      ))}
                      <div className="px-3 py-2 flex items-center justify-between bg-slate-50 text-sm font-semibold text-slate-800">
                        <span>Subtotal</span>
                        <span>{formatCents(totalCents)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {err && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</p>
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
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || loading || !seed || (source !== 'blank' && lines.length === 0)}
            className="px-5 py-2 text-sm rounded-lg bg-[var(--teal)] text-white hover:bg-[var(--teal-dark)] disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Create invoice
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
  selected,
  disabled,
  onSelect,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  selected: boolean
  disabled: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`w-full text-left px-3 py-3 rounded-lg border flex items-start gap-3 transition-colors ${
        selected
          ? 'border-teal-500 bg-teal-50'
          : disabled
          ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
          : 'border-slate-200 hover:bg-slate-50'
      }`}
    >
      <div className={`mt-0.5 ${selected ? 'text-teal-600' : 'text-slate-400'}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${selected ? 'text-teal-700' : 'text-slate-800'}`}>{title}</div>
        <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>
      </div>
      <div className={`w-4 h-4 rounded-full border-2 mt-1 flex-shrink-0 ${
        selected ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
      }`}>
        {selected && <div className="w-1.5 h-1.5 bg-white rounded-full mx-auto mt-0.5" />}
      </div>
    </button>
  )
}
