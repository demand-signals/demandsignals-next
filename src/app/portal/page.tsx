import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolvePortalContext } from '@/lib/portal-session'
import { formatCents } from '@/lib/format'

// Portal dashboard: welcome + outstanding balance + active project +
// recent invoices. Read-only. All queries scoped by prospect_id from
// middleware-set header.
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §13
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 8.6

export const dynamic = 'force-dynamic'

const INVOICE_OPEN_STATUSES = ['sent', 'viewed']

function shortDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function PortalDashboardPage() {
  const cookieStore = await cookies()
  const overrideProspectId = cookieStore.get('dsig_portal_view_as')?.value ?? null
  const ctx = await resolvePortalContext(overrideProspectId)
  if (!ctx) redirect('/login')
  const prospectId = ctx.prospectId

  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('id, business_name, owner_name, became_client_at')
    .eq('id', prospectId)
    .maybeSingle()

  if (!prospect) redirect('/login')

  // Outstanding balance — sum total_due_cents across open invoices
  const { data: openInvoices } = await supabaseAdmin
    .from('invoices')
    .select('id, total_due_cents')
    .eq('prospect_id', prospectId)
    .in('status', INVOICE_OPEN_STATUSES)
  const outstandingCents =
    openInvoices?.reduce((s, inv) => s + (inv.total_due_cents ?? 0), 0) ?? 0

  // Active project: most recently updated active project
  const { data: activeProjects } = await supabaseAdmin
    .from('projects')
    .select('id, name, status, monthly_value, updated_at')
    .eq('prospect_id', prospectId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
  const activeProject = activeProjects?.[0] ?? null

  // Most recent client-visible note across all projects
  let latestNotePreview: { body: string; created_at: string } | null = null
  if (activeProject) {
    const { data: latestNote } = await supabaseAdmin
      .from('project_notes')
      .select('body, created_at')
      .eq('project_id', activeProject.id)
      .eq('visibility', 'client')
      .eq('suppressed', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latestNote) {
      latestNotePreview = {
        body: (latestNote.body ?? '').slice(0, 280),
        created_at: latestNote.created_at,
      }
    }
  }

  // Recent invoices: last 3
  const { data: recentInvoices } = await supabaseAdmin
    .from('invoices')
    .select('id, invoice_number, total_due_cents, status, issued_at, created_at')
    .eq('prospect_id', prospectId)
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back{prospect.owner_name ? `, ${prospect.owner_name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {prospect.business_name}
          {prospect.became_client_at && (
            <span className="text-slate-400">
              {' '}· client since {shortDate(prospect.became_client_at)}
            </span>
          )}
        </p>
      </div>

      {/* Outstanding balance */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Outstanding balance
        </div>
        {outstandingCents > 0 ? (
          <>
            <div className="text-3xl font-bold text-slate-900 tabular-nums mb-3">
              {formatCents(outstandingCents)}
            </div>
            <Link
              href="/portal/invoices"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--teal)] text-white text-sm font-semibold hover:bg-[var(--teal-dark)]"
            >
              View &amp; pay
              <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        ) : (
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">All paid up. Thanks!</span>
          </div>
        )}
      </div>

      {/* Active project */}
      {activeProject && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Active project
          </div>
          <div className="text-lg font-semibold text-slate-900 mb-1">
            {activeProject.name}
          </div>
          {latestNotePreview && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-400 mb-1">
                Latest update · {shortDate(latestNotePreview.created_at)}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {latestNotePreview.body}
                {(latestNotePreview.body?.length ?? 0) >= 280 && '…'}
              </p>
            </div>
          )}
          <Link
            href={`/portal/projects/${activeProject.id}`}
            className="inline-flex items-center gap-1 mt-4 text-sm text-teal-600 hover:underline"
          >
            View project <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Recent invoices */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Recent invoices
          </div>
          <Link
            href="/portal/invoices"
            className="text-xs text-teal-600 hover:underline inline-flex items-center gap-1"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {recentInvoices && recentInvoices.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {recentInvoices.map((inv) => (
              <li key={inv.id} className="py-3 flex items-center justify-between">
                <div>
                  <Link
                    href={`/portal/invoices/${inv.invoice_number}`}
                    className="text-sm font-medium text-slate-900 hover:text-teal-600"
                  >
                    {inv.invoice_number}
                  </Link>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Issued {shortDate(inv.issued_at ?? inv.created_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900 tabular-nums">
                    {formatCents(inv.total_due_cents)}
                  </div>
                  <div className="text-xs uppercase tracking-wide mt-0.5">
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No invoices yet.</p>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    paid: 'text-emerald-700',
    sent: 'text-amber-700',
    viewed: 'text-amber-700',
    draft: 'text-slate-500',
    void: 'text-slate-400',
  }
  return <span className={variants[status] ?? 'text-slate-500'}>{status}</span>
}
