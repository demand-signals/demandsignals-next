// ── POST /api/admin/subscriptions/[id]/cancel ───────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { stripe, isStripeEnabled } from '@/lib/stripe-client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const reason: string = body.reason ?? 'admin_requested'
  const atPeriodEnd: boolean = body.at_period_end !== false // default true

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (sub.status === 'canceled') {
    return NextResponse.json({ error: 'Already canceled' }, { status: 409 })
  }

  // Cancel in Stripe too if it exists there.
  if (sub.stripe_subscription_id && (await isStripeEnabled())) {
    try {
      if (atPeriodEnd) {
        await stripe().subscriptions.update(sub.stripe_subscription_id, {
          cancel_at_period_end: true,
          cancellation_details: { comment: reason },
        })
      } else {
        await stripe().subscriptions.cancel(sub.stripe_subscription_id, {
          cancellation_details: { comment: reason },
        })
      }
    } catch (e) {
      // Log but don't fail the DSIG-side cancel.
      console.warn('Stripe cancel failed:', e instanceof Error ? e.message : e)
    }
  }

  const updates: Record<string, unknown> = {
    cancel_reason: reason,
  }
  if (!atPeriodEnd) {
    updates.status = 'canceled'
    updates.canceled_at = new Date().toISOString()
  }
  // If cancel_at_period_end, leave status 'active' — webhook will flip when Stripe fires.

  const { data: updated, error } = await supabaseAdmin
    .from('subscriptions')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ subscription: updated })
}
