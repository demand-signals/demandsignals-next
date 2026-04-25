// ── POST /api/admin/subscriptions/[id]/resume ───────────────────────
// Resumes a paused subscription. Clears pause_collection in Stripe and
// paused_until in DSIG. Does not touch end_date (already pushed forward
// when paused).

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resumeStripeSubscription } from '@/lib/stripe-subscriptions'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: sub, error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .select('id, status, stripe_subscription_id, end_date')
    .eq('id', id)
    .single()

  if (subErr || !sub) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  }

  if (sub.status !== 'paused') {
    return NextResponse.json(
      { error: `Subscription is ${sub.status}, not paused — cannot resume` },
      { status: 409 },
    )
  }

  if (sub.stripe_subscription_id) {
    try {
      await resumeStripeSubscription(sub.stripe_subscription_id, sub.end_date)
    } catch (e) {
      return NextResponse.json(
        { error: `Stripe resume failed: ${e instanceof Error ? e.message : e}` },
        { status: 502 },
      )
    }
  }

  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'active',
      paused_until: null,
    })
    .eq('id', id)

  return NextResponse.json({ ok: true })
}
