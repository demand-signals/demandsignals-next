'use client'

import { useEffect, useState, use, useCallback } from 'react'
import Link from 'next/link'
import { Loader2, ChevronDown, ChevronRight, ExternalLink, CheckCircle2, Circle, Clock } from 'lucide-react'
import { formatCents } from '@/lib/format'
import type { ProjectRow, ProjectPhase, ProjectPhaseDeliverable } from '@/lib/invoice-types'
import { OutstandingObligations } from './OutstandingObligations'

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
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/projects/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setProject(d.project)
      })
      .catch(() => setError('Failed to load project'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  async function updatePhase(phaseId: string, status: ProjectPhase['status']) {
    const res = await fetch(`/api/admin/projects/${id}/phases/${phaseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) load()
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

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          {project.notes && (
            <p className="text-sm text-slate-500 mt-1">{project.notes}</p>
          )}
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            PROJECT_STATUS_COLORS[project.status] ?? 'bg-slate-100 text-slate-600'
          }`}
        >
          {project.status.replace('_', ' ')}
        </span>
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">Monthly Value</div>
          <div className="font-semibold text-slate-800">
            {project.monthly_value != null
              ? formatCents(Math.round(project.monthly_value * 100)) + '/mo'
              : '—'}
          </div>
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
    </div>
  )
}
