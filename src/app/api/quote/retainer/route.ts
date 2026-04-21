import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { computeMonthlyTotal, getRetainerPlans, type CustomItem } from '@/lib/retainer'

export const runtime = 'nodejs'

// PATCH /api/quote/retainer — select a retainer plan for a quote session.
// Body: { session_token, plan_id, custom_items?, start_date? }
// Returns: { ok: true, monthly_cents: number }
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const { session_token, plan_id, custom_items, start_date } = body as {
      session_token?: string
      plan_id?: string
      custom_items?: CustomItem[]
      start_date?: string
    }

    if (!session_token || !plan_id) {
      return NextResponse.json({ error: 'session_token and plan_id required' }, { status: 400 })
    }

    const { data: session, error: sErr } = await supabaseAdmin
      .from('quote_sessions')
      .select('id')
      .eq('session_token', session_token)
      .single()
    if (sErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const plans = await getRetainerPlans()
    const plan = plans.find((p) => p.id === plan_id)
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    const monthly = computeMonthlyTotal(plan.items, custom_items ?? [])

    const { error: uErr } = await supabaseAdmin
      .from('quote_sessions')
      .update({
        selected_plan_id: plan_id,
        retainer_custom_items: custom_items ?? [],
        retainer_monthly_cents: monthly,
        retainer_start_date: start_date ?? null,
      })
      .eq('id', session.id)
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, monthly_cents: monthly })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
