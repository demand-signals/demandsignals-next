// ── POST /api/admin/subscriptions/[id]/pause ────────────────────────
// Pauses a subscription's collection in Stripe AND pushes its end_date
// out by the pause duration (preserves total contract value).
// Body: { duration_days: number, reason?: string }

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { pauseStripeSubscription } from '@/lib/stripe-subscriptions'
import { stripe } from '@/lib/stripe-client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const duration_days = typeof body.duration_days === 'number' ? body.duration_days : 30
  const reason = typeof body.reason === 'string' ? body.reason : null

  if (duration_days <= 0 || duration_days > 365) {
    return NextResponse.json({ error: 'duration_days must be between 1 and 365' }, { status: 400 })
  }

  const { data: sub, error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .select('id, status, stripe_subscription_id, end_date, paused_until')
    .eq('id', id)
    .single()

  if (subErr || !sub) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  }

  if (sub.status === 'canceled' || sub.status === 'paused') {
    return NextResponse.json(
      { error: `Subscription is ${sub.status} — cannot pause` },
      { status: 409 },
    )
  }

  // Push end_date out by duration_days (preserves total contract value).
  let newEndDateISO: string | null = null
  if (sub.end_date) {
    const end = new Date(sub.end_date)
    end.setDate(end.getDate() + duration_days)
    newEndDateISO = end.toISOString()
  }

  // Compute paused_until (today + duration_days).
  const pausedUntil = new Date()
  pausedUntil.setDate(pausedUntil.getDate() + duration_days)
  const pausedUntilDate = pausedUntil.toISOString().slice(0, 10)

  if (sub.stripe_subscription_id) {
    try {
      await pauseStripeSubscription(sub.stripe_subscription_id)
      if (newEndDateISO) {
        const cancelAtUnix = Math.floor(new Date(newEndDateISO).getTime() / 1000)
        await stripe().subscriptions.update(sub.stripe_subscription_id, {
          cancel_at: cancelAtUnix,
        })
      }
    } catch (e) {
      return NextResponse.json(
        { error: `Stripe pause failed: ${e instanceof Error ? e.message : e}` },
        { status: 502 },
      )
    }
  }

  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'paused',
      paused_until: pausedUntilDate,
      end_date: newEndDateISO,
      notes: reason ? `Paused: ${reason}` : 'Paused',
    })
    .eq('id', id)

  return NextResponse.json({
    ok: true,
    paused_until: pausedUntilDate,
    new_end_date: newEndDateISO,
  })
}
