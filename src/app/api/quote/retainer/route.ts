import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { computeMonthlyTotal, getRetainerPlans } from '@/lib/retainer'

export const runtime = 'nodejs'

// PATCH /api/quote/retainer — select a retainer plan for a quote session.
// Body: { session_token, plan_id, custom_items?, start_date? }
// Returns: { ok: true, monthly_cents: number }
const bodySchema = z.object({
  session_token: z.string().min(1),
  plan_id: z.string().min(1),
  custom_items: z.array(z.object({
    service_id: z.string().min(1),
    quantity: z.number().int().positive(),
    included: z.boolean(),
    monthly_cents: z.number().int().nonnegative().optional(),
  })).optional(),
  start_date: z.string().optional(), // YYYY-MM-DD — not strict-parsed here
})

export async function PATCH(req: NextRequest) {
  let parsed
  try {
    parsed = bodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const { session_token, plan_id, custom_items, start_date } = parsed

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
}
