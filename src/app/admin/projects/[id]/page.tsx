'use client'

import { useEffect, useState, use, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronDown, ChevronRight, ExternalLink, CheckCircle2, Circle, Clock, Trash2 } from 'lucide-react'
import { formatCents } from '@/lib/format'
import type { ProjectRow, ProjectPhase, ProjectPhaseDeliverable } from '@/lib/invoice-types'
import { OutstandingObligations } from './OutstandingObligations'
import { TimeEntriesPanel } from './TimeEntriesPanel'
import { InlineEditText } from '@/components/admin/inline-edit-text'

// Extended with joined prospect data
interface ProjectDetail extends ProjectRow {
  prospects: {
    id: string
    business_name: string
    owner_name: string | null
    owner_email: string | null
    owner_phone: string | null
    is_client: boolean
  } | null
  sow_number?: string | null
}

interface ProjectFinancials {
  invoices: Array<{
    id: string
    invoice_number: string
    status: string
    total_due_cents: number
    paid_at: string | null
    send_date: string | null
    kind: string
  }>
  receipts: Array<{
    id: string
    receipt_number: string
    invoice_id: string
    amount_cents: number
    payment_method: string
    paid_at: string
  }>
  subscriptions: Array<{
    id: string
    status: string
    monthly_value_cents: number
    next_invoice_date: string | null
    plan_name: string | null
  }>
  active_monthly_cents: number
  total_invoiced_cents: number
  total_paid_cents: number
}

const PHASE_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
}

const PHASE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
}

const PROJECT_STATUS_COLORS: Record<string, string> = {
  planning: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  on_hold: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
}

function PhaseCard({
  phase,
  onUpdatePhase,
  onUpdateDeliverable,
}: {
  phase: ProjectPhase
  onUpdatePhase: (phaseId: string, status: ProjectPhase['status']) => Promise<void>
  onUpdateDeliverable: (phaseId: string, delivId: string, status: ProjectPhaseDeliverable['status']) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(phase.status === 'in_progress')
  const [saving, setSaving] = useState(false)

  async function handlePhaseAction(newStatus: ProjectPhase['status']) {
    setSaving(true)
    try {
      await onUpdatePhase(phase.id, newStatus)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeliverableDeliver(deliv: ProjectPhaseDeliverable) {
    setSaving(true)
    try {
      await onUpdateDeliverable(phase.id, deliv.id, 'delivered')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Phase header */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800">{phase.name}</span>
            <span
              className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                PHASE_STATUS_COLORS[phase.status] ?? 'bg-slate-100 text-slate-600'
              }`}
            >
              {PHASE_STATUS_LABELS[phase.status] ?? phase.status}
            </span>
          </div>
          {phase.description && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{phase.description}</p>
          )}
        </div>

        {/* Phase action buttons */}
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {phase.status === 'pending' && (
            <button
              disabled={saving}
              onClick={() => handlePhaseAction('in_progress')}
              className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Start'}
            </button>
          )}
          {phase.status === 'in_progress' && (
            <button
              disabled={saving}
              onClick={() => handlePhaseAction('completed')}
              className="text-xs px-3 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Complete'}
            </button>
          )}
          {phase.completed_at && (
            <span className="text-[10px] text-slate-400">
              {new Date(phase.completed_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Deliverables */}
      {expanded && (
        <div className="divide-y divide-slate-100">
          {phase.deliverables.length === 0 && (
            <div className="px-4 py-3 text-xs text-slate-400 italic">No deliverables</div>
          )}
          {phase.deliverables.map((d) => (
            <div key={d.id} className="px-4 py-3 flex items-center gap-3">
              {d.status === 'delivered' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-slate-300 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-slate-800 font-medium">{d.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded capitalize">
                    {d.cadence?.replace('_', ' ')}
                  </span>
                  {d.line_total_cents != null && d.line_total_cents > 0 && (
                    <span className="text-[10px] text-slate-400">
                      {formatCents(d.line_total_cents)}
                    </span>
                  )}
                </div>
                {d.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{d.description}</p>
                )}
                {d.delivered_at && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Delivered {new Date(d.delivered_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              {d.status === 'pending' && phase.status !== 'pending' && (
                <button
                  disabled={saving}
                  onClick={() => handleDeliverableDeliver(d)}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors shrink-0"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Mark Delivered'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [financials, setFinancials] = useState<ProjectFinancials | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(j.error ?? 'Delete failed')
      return
    }
    router.push('/admin/projects')
  }

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/projects/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else {
          setProject(d.project)
          setFinancials(d.financials ?? null)
        }
      })
      .catch(() => setError('Failed to load project'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  async function updateProjectName(name: string) {
    const res = await fetch(`/api/admin/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? 'Update failed')
    }
    // Optimistic local update so the title renders the new name without
    // waiting for the full project reload. load() still fires for the
    // canonical refresh.
    setProject((prev) => (prev ? { ...prev, name } : prev))
    load()
  }

  async function updatePhase(phaseId: string, status: ProjectPhase['status']) {
    const res = await fetch(`/api/admin/projects/${id}/phases/${phaseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      load()
      return
    }
    // Handle 409 (un-delivered deliverables block phase completion).
    if (res.status === 409) {
      const data = await res.json().catch(() => ({}))
      const names = Array.isArray(data.undelivered_names) ? data.undelivered_names.join(', ') : ''
      const proceed = confirm(
        `Cannot complete this phase yet — ${data.undelivered_count ?? ''} deliverable(s) are not marked delivered:\n\n${names}\n\nClick OK to mark the phase complete anyway (force override), or Cancel to mark deliverables first.`,
      )
      if (proceed) {
        const r2 = await fetch(`/api/admin/projects/${id}/phases/${phaseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, force: true }),
        })
        if (r2.ok) load()
        else alert(`Force update failed: ${(await r2.json()).error ?? r2.statusText}`)
      }
      return
    }
    const errBody = await res.json().catch(() => ({}))
    alert(`Failed to update phase: ${errBody.error ?? res.statusText}`)
  }

  async function updateDeliverable(
    phaseId: string,
    delivId: string,
    status: ProjectPhaseDeliverable['status'],
  ) {
    const res = await fetch(`/api/admin/projects/${id}/deliverables/${delivId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase_id: phaseId, status }),
    })
    if (res.ok) load()
  }

  if (loading) return <div className="p-6"><Loader2 className="w-6 h-6 animate-spin text-teal-500" /></div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!project) return <div className="p-6 text-slate-400">Project not found.</div>

  const phases = project.phases ?? []

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="text-sm text-slate-500">
        <Link href="/admin/projects" className="hover:underline text-teal-600">Projects</Link>
        {' / '}
        <span>{project.name}</span>
      </div>

      {/* Header — name is inline-editable. The SOW's title is the
          original contract name (snapshot at acceptance); this is the
          live working name for execution + display on docs/admin. */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <InlineEditText
            as="h1"
            className="text-2xl font-bold text-slate-900"
            value={project.name}
            onSave={updateProjectName}
            placeholder="Untitled project"
          />
          {project.notes && (
            <p className="text-sm text-slate-500 mt-1">{project.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              PROJECT_STATUS_COLORS[project.status] ?? 'bg-slate-100 text-slate-600'
            }`}
          >
            {project.status.replace('_', ' ')}
          </span>
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 inline-flex items-center gap-1"
              >
                {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                Confirm delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1 text-xs rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
              title="Delete project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">Monthly Value</div>
          <div className="font-semibold text-slate-800">
            {financials && financials.active_monthly_cents > 0
              ? formatCents(financials.active_monthly_cents) + '/mo'
              : project.monthly_value != null
                ? formatCents(Math.round(project.monthly_value * 100)) + '/mo'
                : '—'}
          </div>
          {financials && financials.subscriptions.length > 0 && (
            <div className="text-[10px] text-slate-400 mt-1">
              {financials.subscriptions.filter((s) => s.status === 'active').length} active sub{financials.subscriptions.filter((s) => s.status === 'active').length === 1 ? '' : 's'}
            </div>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">Start Date</div>
          <div className="font-semibold text-slate-800">
            {project.start_date ? new Date(project.start_date).toLocaleDateString() : '—'}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">Target Date</div>
          <div className="font-semibold text-slate-800">
            {project.target_date ? new Date(project.target_date).toLocaleDateString() : '—'}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">Phases</div>
          <div className="font-semibold text-slate-800">
            {phases.filter((p) => p.status === 'completed').length} / {phases.length} done
          </div>
        </div>
      </div>

      {/* Outstanding Obligations (cash installments + TIK ledgers) */}
      {project.prospects && (
        <OutstandingObligations
          projectId={project.id}
          prospectId={project.prospects.id}
        />
      )}

      {/* Client block */}
      {project.prospects && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Client</div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">{project.prospects.business_name}</span>
                {project.prospects.is_client && (
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--teal)]/10 text-[var(--teal)]">
                    CLIENT
                  </span>
                )}
              </div>
              {project.prospects.owner_name && (
                <div className="text-sm text-slate-600 mt-0.5">{project.prospects.owner_name}</div>
              )}
              <div className="flex gap-4 mt-1">
                {project.prospects.owner_email && (
                  <a href={`mailto:${project.prospects.owner_email}`} className="text-xs text-teal-600 hover:underline">
                    {project.prospects.owner_email}
                  </a>
                )}
                {project.prospects.owner_phone && (
                  <a href={`tel:${project.prospects.owner_phone}`} className="text-xs text-slate-500 hover:underline">
                    {project.prospects.owner_phone}
                  </a>
                )}
              </div>
            </div>
            <Link
              href={`/admin/prospects/${project.prospects.id}`}
              className="text-xs text-teal-600 hover:underline flex items-center gap-1"
            >
              View Prospect <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Linked SOW */}
      {project.sow_document_id && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Linked SOW
            </div>
            <span className="text-sm text-slate-700">
              {project.sow_number ?? project.sow_document_id}
            </span>
          </div>
          <Link
            href={`/admin/sow/${project.sow_document_id}`}
            className="text-xs text-teal-600 hover:underline flex items-center gap-1"
          >
            View SOW <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Financials — invoices, receipts, subscriptions */}
      {financials && (financials.invoices.length > 0 || financials.subscriptions.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Invoices */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Invoices ({financials.invoices.length})
              </div>
              <div className="text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{formatCents(financials.total_paid_cents)}</span>
                <span className="text-slate-400"> / {formatCents(financials.total_invoiced_cents)} paid</span>
              </div>
            </div>
            {financials.invoices.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 italic">No invoices issued yet.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {financials.invoices.map((inv) => (
                  <li key={inv.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50">
                    <Link href={`/admin/invoices/${inv.id}`} className="text-sm font-medium text-teal-600 hover:underline shrink-0">
                      {inv.invoice_number}
                    </Link>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        inv.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : inv.status === 'void'
                          ? 'bg-slate-100 text-slate-500'
                          : inv.status === 'sent' || inv.status === 'viewed'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {inv.status.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0 text-xs text-slate-500 truncate">
                      {inv.send_date ? new Date(inv.send_date).toLocaleDateString() : 'draft'}
                    </div>
                    <div className="text-sm font-semibold text-slate-700 shrink-0 tabular-nums">
                      {formatCents(inv.total_due_cents)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Receipts + Subscriptions stack */}
          <div className="space-y-4">
            {financials.receipts.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Receipts ({financials.receipts.length})
                </div>
                <ul className="divide-y divide-slate-100">
                  {financials.receipts.map((rc) => (
                    <li key={rc.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50">
                      <Link href={`/admin/receipts/${rc.id}`} className="text-sm font-medium text-teal-600 hover:underline shrink-0">
                        {rc.receipt_number}
                      </Link>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-100 text-slate-600 capitalize">
                        {rc.payment_method}
                      </span>
                      <div className="flex-1 min-w-0 text-xs text-slate-500 truncate">
                        {new Date(rc.paid_at).toLocaleDateString()}
                      </div>
                      <div className="text-sm font-semibold text-emerald-700 shrink-0 tabular-nums">
                        {formatCents(rc.amount_cents)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {financials.subscriptions.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Subscriptions ({financials.subscriptions.length})
                  </div>
                  {financials.active_monthly_cents > 0 && (
                    <div className="text-xs font-semibold text-slate-700 tabular-nums">
                      {formatCents(financials.active_monthly_cents)}/mo active
                    </div>
                  )}
                </div>
                <ul className="divide-y divide-slate-100">
                  {financials.subscriptions.map((s) => (
                    <li key={s.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50">
                      <Link href={`/admin/subscriptions/${s.id}`} className="text-sm font-medium text-teal-600 hover:underline truncate flex-1 min-w-0">
                        {s.plan_name ?? 'Subscription'}
                      </Link>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : s.status === 'paused' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s.status.toUpperCase()}
                      </span>
                      <div className="text-sm font-semibold text-slate-700 shrink-0 tabular-nums">
                        {formatCents(s.monthly_value_cents)}<span className="text-[10px] text-slate-400">/mo</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phases */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--teal)]" />
          Phases
        </h2>
        {phases.length === 0 ? (
          <div className="text-slate-400 text-sm italic">No phases defined for this project.</div>
        ) : (
          <div className="space-y-3">
            {phases.map((phase) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                onUpdatePhase={updatePhase}
                onUpdateDeliverable={updateDeliverable}
              />
            ))}
          </div>
        )}
      </div>

      {/* Time Entries */}
      <TimeEntriesPanel projectId={project.id} phases={phases} />
    </div>
  )
}
