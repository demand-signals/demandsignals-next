// GET /api/admin/clients
// Lists prospects where is_client = true, enriched with project + subscription rollups.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ACTIVE_SUB_STATUSES = ['active', 'trialing']

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  const { data: clients, error } = await supabaseAdmin
    .from('prospects')
    .select(`
      id, business_name, owner_name, owner_email, owner_phone, business_phone,
      city, state, client_code, became_client_at, last_contacted_at, tags
    `)
    .eq('is_client', true)
    .order('became_client_at', { ascending: false, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (clients ?? []).map((c) => c.id)
  if (ids.length === 0) return NextResponse.json({ clients: [] })

  // Bulk-fetch projects + subscriptions, group in-memory.
  const [{ data: projects }, { data: subs }] = await Promise.all([
    supabaseAdmin
      .from('projects')
      .select('id, prospect_id, status, name')
      .in('prospect_id', ids),
    supabaseAdmin
      .from('subscriptions')
      .select(`
        id, prospect_id, status, override_monthly_amount_cents,
        plan:subscription_plans ( price_cents, billing_interval, name )
      `)
      .in('prospect_id', ids),
  ])

  const projectsBy = new Map<string, Array<{ status: string; name: string }>>()
  for (const p of projects ?? []) {
    if (!projectsBy.has(p.prospect_id)) projectsBy.set(p.prospect_id, [])
    projectsBy.get(p.prospect_id)!.push({ status: p.status, name: p.name })
  }

  const subsBy = new Map<string, Array<{ status: string; monthly_cents: number; plan_name: string | null }>>()
  for (const s of (subs ?? []) as any[]) {
    let monthly = s.override_monthly_amount_cents ?? 0
    if (!monthly && s.plan) {
      const interval = s.plan.billing_interval ?? 'month'
      const price = s.plan.price_cents ?? 0
      monthly = interval === 'month' ? price : interval === 'quarter' ? Math.round(price / 3) : interval === 'year' ? Math.round(price / 12) : 0
    }
    if (!subsBy.has(s.prospect_id)) subsBy.set(s.prospect_id, [])
    subsBy.get(s.prospect_id)!.push({ status: s.status, monthly_cents: monthly, plan_name: s.plan?.name ?? null })
  }

  const enriched = (clients ?? []).map((c) => {
    const projList = projectsBy.get(c.id) ?? []
    const subList = subsBy.get(c.id) ?? []
    const activeProjects = projList.filter((p) => p.status === 'in_progress' || p.status === 'planning').length
    const activeSubs = subList.filter((s) => ACTIVE_SUB_STATUSES.includes(s.status))
    const activeMonthly = activeSubs.reduce((sum, s) => sum + s.monthly_cents, 0)
    return {
      ...c,
      project_count: projList.length,
      active_project_count: activeProjects,
      subscription_count: subList.length,
      active_subscription_count: activeSubs.length,
      active_monthly_cents: activeMonthly,
    }
  })

  return NextResponse.json({ clients: enriched })
}
