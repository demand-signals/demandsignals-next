import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Circle, Clock } from 'lucide-react'
import {
  getProjectByIdForProspect,
  getPaymentInstallmentsForProject,
} from '@/lib/portal-data'
import { resolvePortalContext } from '@/lib/portal-session'
import { ProjectNotesTimeline } from '@/components/portal/ProjectNotesTimeline'
import { formatCents } from '@/lib/format'

// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §13
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 9.6

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

interface ProjectPhase {
  id: string
  name: string
  description?: string
  status?: string
  deliverables?: ProjectDeliverable[]
}

interface ProjectDeliverable {
  id: string
  title: string
  description?: string
  status?: string
  cents?: number
  cadence?: string
}

function shortDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function PhaseStatusIcon({ status }: { status?: string }) {
  if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
  if (status === 'in_progress') return <Clock className="w-4 h-4 text-amber-500" />
  return <Circle className="w-4 h-4 text-slate-300" />
}

export default async function PortalProjectDetailPage({ params }: PageProps) {
  const cookieStore = await cookies()
  const overrideProspectId = cookieStore.get('dsig_portal_view_as')?.value ?? null
  const ctx = await resolvePortalContext(overrideProspectId)
  if (!ctx) redirect('/admin-login')

  const { id } = await params
  const project = await getProjectByIdForProspect(ctx.prospectId, id)
  if (!project) notFound()

  const phases = (project.phases ?? []) as ProjectPhase[]
  const installments = await getPaymentInstallmentsForProject(project.id)

  return (
    <div className="space-y-6">
      <Link
        href="/portal/projects"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All projects
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
        <div className="mt-1 text-sm text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[11px] uppercase tracking-wide font-medium text-slate-700">
            {project.status}
          </span>
          {project.start_date && <span>Started {shortDate(project.start_date)}</span>}
          {project.target_date && <span>Targeting {shortDate(project.target_date)}</span>}
          {project.monthly_value && Number(project.monthly_value) > 0 && (
            <span className="text-emerald-700 font-medium">
              {formatCents(Math.round(Number(project.monthly_value) * 100))}
              <span className="text-slate-400">/mo</span>
            </span>
          )}
        </div>
      </div>

      {/* Phases + deliverables */}
      {phases.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Phases</h2>
          <ol className="space-y-5">
            {phases.map((phase, idx) => (
              <li key={phase.id ?? idx} className="border-l-2 border-slate-100 pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <PhaseStatusIcon status={phase.status} />
                  <h3 className="text-base font-semibold text-slate-900">{phase.name}</h3>
                </div>
                {phase.description && (
                  <p className="text-sm text-slate-600 mb-2">{phase.description}</p>
                )}
                {phase.deliverables && phase.deliverables.length > 0 && (
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {phase.deliverables.map((d, di) => (
                      <li key={d.id ?? di} className="flex items-start gap-2 text-slate-700">
                        <PhaseStatusIcon status={d.status} />
                        <span className="flex-1">
                          {d.title}
                          {d.cadence && d.cadence !== 'one_time' && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-400">
                              {d.cadence}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Payment schedule */}
      {installments.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Payment schedule
          </h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left pb-2">#</th>
                <th className="text-left pb-2">Description</th>
                <th className="text-left pb-2">Trigger</th>
                <th className="text-right pb-2">Amount</th>
                <th className="text-right pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {installments.map((it) => (
                <tr key={it.id} className="border-t border-slate-100">
                  <td className="py-2.5 text-slate-500">{it.sequence}</td>
                  <td className="py-2.5 text-slate-900">{it.description ?? '—'}</td>
                  <td className="py-2.5 text-slate-600 text-xs">
                    {it.trigger_type.replace(/_/g, ' ')}
                    {it.trigger_date && <> · {shortDate(it.trigger_date)}</>}
                  </td>
                  <td className="py-2.5 text-right tabular-nums font-medium text-slate-900">
                    {formatCents(it.amount_cents)}
                    {it.currency_type === 'tik' && (
                      <span className="ml-1 text-[10px] uppercase text-amber-600">TIK</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right text-xs uppercase tracking-wide text-slate-500">
                    {it.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Notes timeline */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Updates</h2>
        <ProjectNotesTimeline notes={project.notes_timeline} />
      </section>
    </div>
  )
}
