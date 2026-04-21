import { supabaseAdmin } from '@/lib/supabase/admin'

export interface PlanItem {
  service_id: string
  name: string
  monthly_cents: number
  quantity: number
}

export interface CustomItem {
  service_id: string
  quantity: number
  included: boolean
  monthly_cents?: number
}

export interface RetainerPlan {
  id: string
  slug: string
  name: string
  tier: 'essential' | 'growth' | 'full' | 'site_only'
  sort_order: number
  items: PlanItem[]
}

export interface RetainerMenuItem {
  id: string
  category: string
  name: string
  description: string | null
  monthly_cents: number
}

/**
 * Compute the total monthly cost in cents for a retainer plan, applying any
 * custom item overrides (inclusions/exclusions/quantity changes).
 */
export function computeMonthlyTotal(
  planItems: PlanItem[],
  customItems: CustomItem[]
): number {
  // Seed map from plan defaults
  const itemMap = new Map<string, { monthly_cents: number; quantity: number; included: boolean }>()

  for (const pi of planItems) {
    itemMap.set(pi.service_id, {
      monthly_cents: pi.monthly_cents,
      quantity: pi.quantity,
      included: true,
    })
  }

  // Apply custom overrides (toggle inclusion, change quantity, add net-new items)
  for (const ci of customItems) {
    const existing = itemMap.get(ci.service_id)
    itemMap.set(ci.service_id, {
      monthly_cents: existing?.monthly_cents ?? ci.monthly_cents ?? 0,
      quantity: ci.quantity,
      included: ci.included,
    })
  }

  let total = 0
  for (const [, v] of itemMap) {
    if (v.included) total += v.monthly_cents * v.quantity
  }
  return total
}

/**
 * Fetch all active retainer plans with their included services from Supabase.
 */
export async function getRetainerPlans(): Promise<RetainerPlan[]> {
  const { data: plans, error: pErr } = await supabaseAdmin
    .from('subscription_plans')
    .select('id, slug, name, tier, sort_order')
    .eq('is_retainer', true)
    .eq('active', true)
    .order('sort_order', { ascending: true })
  if (pErr) throw pErr

  const planIds = (plans ?? []).map((p) => p.id)
  if (planIds.length === 0) return []

  const { data: items, error: iErr } = await supabaseAdmin
    .from('subscription_plan_items')
    .select('plan_id, service_id, quantity, services_catalog(name, monthly_range_low_cents)')
    .in('plan_id', planIds)
  if (iErr) throw iErr

  return (plans ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    tier: p.tier as RetainerPlan['tier'],
    sort_order: p.sort_order,
    items: (items ?? [])
      .filter((i) => i.plan_id === p.id)
      .map((i) => ({
        service_id: i.service_id,
        name: (i.services_catalog as { name?: string; monthly_range_low_cents?: number } | null)?.name ?? i.service_id,
        monthly_cents: (i.services_catalog as { name?: string; monthly_range_low_cents?: number } | null)?.monthly_range_low_cents ?? 0,
        quantity: i.quantity,
      })),
  }))
}

/**
 * Fetch all services available to add to a retainer (monthly or both pricing types).
 */
export async function getRetainerMenu(): Promise<RetainerMenuItem[]> {
  const { data, error } = await supabaseAdmin
    .from('services_catalog')
    .select('id, category, name, description, monthly_range_low_cents')
    .in('pricing_type', ['monthly', 'both'])
    .eq('active', true)
    .order('category', { ascending: true })
  if (error) throw error
  return (data ?? []).map((d) => ({
    id: d.id,
    category: d.category,
    name: d.name,
    description: d.description ?? null,
    monthly_cents: d.monthly_range_low_cents ?? 0,
  }))
}

/**
 * Activate a retainer for a quote session. Creates a subscription record and
 * stamps retainer_activated_at + launched_at on the quote.
 *
 * For site_only tier plans no recurring subscription is created — returns
 * { subscription_id: null }.
 */
export async function activateRetainer(quoteId: string): Promise<{ subscription_id: string | null }> {
  const { data: q, error: qErr } = await supabaseAdmin
    .from('quote_sessions')
    .select('id, prospect_id, selected_plan_id, retainer_custom_items, retainer_monthly_cents, retainer_activated_at, retainer_cancelled_at')
    .eq('id', quoteId)
    .single()
  if (qErr) throw qErr
  if (!q) throw new Error('Quote not found')
  if (q.retainer_activated_at) throw new Error('Retainer already activated')
  if (q.retainer_cancelled_at) throw new Error('Retainer cancelled')
  if (!q.selected_plan_id) throw new Error('No plan selected')
  if (!q.prospect_id) throw new Error('No prospect linked — cannot activate subscription')

  const { data: plan, error: pErr } = await supabaseAdmin
    .from('subscription_plans')
    .select('id, tier')
    .eq('id', q.selected_plan_id)
    .single()
  if (pErr) throw pErr

  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  // Site-only tier: one-time build, no recurring subscription needed
  if (plan.tier === 'site_only') {
    const { error: uErr } = await supabaseAdmin
      .from('quote_sessions')
      .update({ retainer_activated_at: now.toISOString(), launched_at: now.toISOString() })
      .eq('id', quoteId)
    if (uErr) throw uErr
    return { subscription_id: null }
  }

  // Recurring retainer: create subscription row
  const { data: sub, error: sErr } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      prospect_id: q.prospect_id,
      plan_id: q.selected_plan_id,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_invoice_date: periodEnd.toISOString().slice(0, 10),
    })
    .select('id')
    .single()
  if (sErr) throw sErr

  const { error: uErr } = await supabaseAdmin
    .from('quote_sessions')
    .update({
      retainer_activated_at: now.toISOString(),
      launched_at: now.toISOString(),
      retainer_subscription_id: sub.id,
    })
    .eq('id', quoteId)
  if (uErr) throw uErr

  return { subscription_id: sub.id }
}
