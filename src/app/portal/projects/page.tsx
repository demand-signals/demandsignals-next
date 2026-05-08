import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { getProjectsForProspect } from '@/lib/portal-data'
import { resolvePortalContext } from '@/lib/portal-session'
import { formatCents } from '@/lib/format'

// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §13
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 9.5

export const dynamic = 'force-dynamic'

const STATUS_TINTS: Record<string, string> = {
  active:    'bg-emerald-50 text-emerald-700',
  planning:  'bg-amber-50 text-amber-700',
  completed: 'bg-slate-50 text-slate-500',
  paused:    'bg-slate-50 text-slate-500',
  cancelled: 'bg-slate-50 text-slate-400',
}

function shortDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function PortalProjectsPage() {
  const cookieStore = await cookies()
  const overrideProspectId = cookieStore.get('dsig_portal_view_as')?.value ?? null
  const ctx = await resolvePortalContext(overrideProspectId)
  if (!ctx) redirect('/login')

  const projects = await getProjectsForProspect(ctx.prospectId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
        <p className="text-sm text-slate-500 mt-1">
          Active and completed engagements with Demand Signals.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
          No projects yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/portal/projects/${p.id}`}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-teal-300 hover:shadow-sm transition group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-slate-900 group-hover:text-teal-600">
                    {p.name}
                  </h2>
                  <div className="mt-1 text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] uppercase tracking-wide font-medium ${
                        STATUS_TINTS[p.status] ?? 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      {p.status}
                    </span>
                    {p.start_date && <span>· started {shortDate(p.start_date)}</span>}
                    {p.target_date && <span>· targeting {shortDate(p.target_date)}</span>}
                    {p.completed_at && <span>· completed {shortDate(p.completed_at)}</span>}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2 shrink-0">
                  {p.monthly_value && p.monthly_value > 0 && (
                    <div className="text-sm font-semibold text-emerald-700 tabular-nums">
                      {formatCents(Math.round(Number(p.monthly_value) * 100))}
                      <span className="text-[10px] text-slate-400">/mo</span>
                    </div>
                  )}
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
