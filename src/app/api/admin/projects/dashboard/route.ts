// GET /api/admin/projects/dashboard
// Aggregates for the Projects → Dashboard view:
//   • status counts (planning / in_progress / on_hold / completed / cancelled)
//   • total active monthly recurring revenue (sum of active subscriptions across all client prospects)
//   • upcoming deliverables (pending across in-progress phases) with project + phase
//   • recent project activity (10 most recently updated projects)

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface PhaseLite {
  id: string
  name: string
  status: 'pending' | 'in_progress' | 'completed'
  deliverables?: Array<{ id: string; name: string; status: 'pending' | 'delivered' }>
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  // 1. Pull all projects with phases + prospect (one query — no N+1)
  const { data: projects, error } = await supabaseAdmin
    .from('projects')
    .select(`
      id, name, status, monthly_value, start_date, target_date, completed_at,
      created_at, updated_at, phases, prospect_id,
      prospects ( business_name, is_client )
    `)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const all = projects ?? []

  // 2. Status counts
  const statusCounts: Record<string, number> = {
    planning: 0,
    in_progress: 0,
    on_hold: 0,
    completed: 0,
    cancelled: 0,
  }
  for (const p of all) statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1

  // 3. Active monthly recurring revenue across all client prospects.
  const clientProspectIds = Array.from(
    new Set(all.filter((p) => (p.prospects as any)?.is_client).map((p) => p.prospect_id)),
  )
  let activeMonthlyCents = 0
  let activeSubCount = 0
  if (clientProspectIds.length > 0) {
    const { data: subs } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        status, override_monthly_amount_cents,
        plan:subscription_plans ( price_cents, billing_interval )
      `)
      .in('prospect_id', clientProspectIds)
      .in('status', ['active', 'trialing'])
    for (const s of (subs ?? []) as any[]) {
      let monthly = s.override_monthly_amount_cents ?? 0
      if (!monthly && s.plan) {
        const interval = s.plan.billing_interval ?? 'month'
        const price = s.plan.price_cents ?? 0
        monthly = interval === 'month' ? price : interval === 'quarter' ? Math.round(price / 3) : interval === 'year' ? Math.round(price / 12) : 0
      }
      activeMonthlyCents += monthly
      activeSubCount++
    }
  }

  // 4. Upcoming deliverables: pending deliverables in in_progress phases of active projects.
  type Upcoming = {
    project_id: string
    project_name: string
    client_name: string
    phase_id: string
    phase_name: string
    deliverable_id: string
    deliverable_name: string
  }
  const upcoming: Upcoming[] = []
  for (const p of all) {
    if (p.status !== 'in_progress' && p.status !== 'planning') continue
    const phases = (p.phases ?? []) as PhaseLite[]
    for (const ph of phases) {
      if (ph.status !== 'in_progress') continue
      for (const d of ph.deliverables ?? []) {
        if (d.status === 'pending') {
          upcoming.push({
            project_id: p.id,
            project_name: p.name,
            client_name: (p.prospects as any)?.business_name ?? '—',
            phase_id: ph.id,
            phase_name: ph.name,
            deliverable_id: d.id,
            deliverable_name: d.name,
          })
        }
      }
    }
  }

  // 5. Recent activity: most recently updated 10 projects
  const recent = all.slice(0, 10).map((p) => ({
    id: p.id,
    name: p.name,
    client_name: (p.prospects as any)?.business_name ?? '—',
    status: p.status,
    updated_at: p.updated_at,
  }))

  // 6. Phase progress overview: total / completed across all active projects
  let totalPhases = 0
  let completedPhases = 0
  let totalDeliverables = 0
  let deliveredDeliverables = 0
  for (const p of all) {
    if (p.status === 'cancelled') continue
    const phases = (p.phases ?? []) as PhaseLite[]
    for (const ph of phases) {
      totalPhases++
      if (ph.status === 'completed') completedPhases++
      for (const d of ph.deliverables ?? []) {
        totalDeliverables++
        if (d.status === 'delivered') deliveredDeliverables++
      }
    }
  }

  return NextResponse.json({
    status_counts: statusCounts,
    total_projects: all.length,
    active_monthly_cents: activeMonthlyCents,
    active_subscription_count: activeSubCount,
    phase_progress: {
      total: totalPhases,
      completed: completedPhases,
    },
    deliverable_progress: {
      total: totalDeliverables,
      delivered: deliveredDeliverables,
    },
    upcoming_deliverables: upcoming.slice(0, 12),
    upcoming_deliverable_total: upcoming.length,
    recent_activity: recent,
  })
}
