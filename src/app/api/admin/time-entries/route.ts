// ── GET /api/admin/time-entries ──────────────────────────────────────
// Cross-project time-entry list with summary stats. Per-project entries
// are fetched via /api/admin/projects/[id]/time-entries; THIS endpoint is
// the global timekeeping view used by /admin/timekeeping.
//
// Filters (all optional, AND-combined):
//   ?project_id=<uuid>      — limit to one project
//   ?prospect_id=<uuid>     — limit to all projects for one prospect
//   ?from=YYYY-MM-DD        — entries logged_at >= from
//   ?to=YYYY-MM-DD          — entries logged_at <= to
//   ?billable=true|false    — filter on billable flag
//   ?logged_by=<email>      — filter on the admin who logged the entry
//   ?limit, ?offset         — pagination (default limit 100, max 500)
//
// Response shape:
//   {
//     entries: [...],
//     total: number,
//     summary: {
//       total_hours, billable_hours, non_billable_hours,
//       distinct_projects, distinct_clients, last_entry_date
//     }
//   }

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const sp = request.nextUrl.searchParams
  const projectId = sp.get('project_id')
  const prospectId = sp.get('prospect_id')
  const from = sp.get('from')
  const to = sp.get('to')
  const billableParam = sp.get('billable')
  const loggedBy = sp.get('logged_by')
  const limit = Math.min(parseInt(sp.get('limit') || '100', 10) || 100, 500)
  const offset = Math.max(parseInt(sp.get('offset') || '0', 10) || 0, 0)

  // Base query — include project + prospect for client column on the table.
  let q = supabaseAdmin
    .from('project_time_entries')
    .select(
      `id, project_id, phase_id, deliverable_id, hours, description, billable,
       hourly_rate_cents, logged_at, logged_by, created_at,
       project:projects!inner(id, name, prospect_id, prospects:prospects!inner(business_name))`,
      { count: 'exact' },
    )
    .order('logged_at', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (projectId) q = q.eq('project_id', projectId)
  if (from) q = q.gte('logged_at', from)
  if (to) q = q.lte('logged_at', to)
  if (billableParam === 'true') q = q.eq('billable', true)
  if (billableParam === 'false') q = q.eq('billable', false)
  if (loggedBy) q = q.eq('logged_by', loggedBy)

  // Prospect filter requires walking through the project join.
  if (prospectId) {
    // Resolve prospect_id → projects → use IN filter on project_id.
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('prospect_id', prospectId)
    const ids = (projects ?? []).map((p) => p.id)
    if (ids.length === 0) {
      return NextResponse.json({
        entries: [],
        total: 0,
        summary: emptySummary(),
        limit,
        offset,
      })
    }
    q = q.in('project_id', ids)
  }

  const { data, error, count } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Compute summary across the (possibly truncated) page. For accurate global
  // numbers we run a parallel aggregate query without pagination.
  const aggregateRows = await fetchAggregateRows({
    projectId, prospectId, from, to, billableParam, loggedBy,
  })
  const summary = computeSummary(aggregateRows)

  return NextResponse.json({
    entries: data ?? [],
    total: count ?? 0,
    summary,
    limit,
    offset,
  })
}

function emptySummary() {
  return {
    total_hours: 0,
    billable_hours: 0,
    non_billable_hours: 0,
    distinct_projects: 0,
    distinct_clients: 0,
    entry_count: 0,
    last_entry_date: null as string | null,
  }
}

interface AggregateRow {
  hours: number
  billable: boolean
  project_id: string
  logged_at: string
  project: { prospect_id: string } | null
}

async function fetchAggregateRows(args: {
  projectId: string | null
  prospectId: string | null
  from: string | null
  to: string | null
  billableParam: string | null
  loggedBy: string | null
}): Promise<AggregateRow[]> {
  let q = supabaseAdmin
    .from('project_time_entries')
    .select('hours, billable, project_id, logged_at, project:projects(prospect_id)')

  if (args.projectId) q = q.eq('project_id', args.projectId)
  if (args.from) q = q.gte('logged_at', args.from)
  if (args.to) q = q.lte('logged_at', args.to)
  if (args.billableParam === 'true') q = q.eq('billable', true)
  if (args.billableParam === 'false') q = q.eq('billable', false)
  if (args.loggedBy) q = q.eq('logged_by', args.loggedBy)

  if (args.prospectId) {
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('prospect_id', args.prospectId)
    const ids = (projects ?? []).map((p) => p.id)
    if (ids.length === 0) return []
    q = q.in('project_id', ids)
  }

  const { data } = await q
  return (data ?? []) as unknown as AggregateRow[]
}

function computeSummary(rows: AggregateRow[]) {
  let total = 0
  let billable = 0
  const projectIds = new Set<string>()
  const prospectIds = new Set<string>()
  let last: string | null = null
  for (const e of rows) {
    const h = Number(e.hours)
    total += h
    if (e.billable) billable += h
    projectIds.add(e.project_id)
    if (e.project?.prospect_id) prospectIds.add(e.project.prospect_id)
    if (!last || e.logged_at > last) last = e.logged_at
  }
  const r2 = (n: number) => Math.round(n * 100) / 100
  return {
    total_hours: r2(total),
    billable_hours: r2(billable),
    non_billable_hours: r2(total - billable),
    distinct_projects: projectIds.size,
    distinct_clients: prospectIds.size,
    entry_count: rows.length,
    last_entry_date: last,
  }
}
