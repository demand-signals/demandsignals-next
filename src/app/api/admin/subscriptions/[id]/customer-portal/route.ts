// ── POST /api/admin/subscriptions/[id]/customer-portal ──────────────
// Generates a Stripe Customer Portal session URL for adding/updating
// payment methods. Used to send a magic link to the client when a
// subscription has a future start date and no card on file yet.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createCustomerPortalSession } from '@/lib/stripe-subscriptions'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('id, prospect_id, stripe_subscription_id')
    .eq('id', id)
    .single()

  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })

  try {
    const url = await createCustomerPortalSession(
      sub.prospect_id,
      `https://demandsignals.co/admin/subscriptions/${id}`,
    )
    return NextResponse.json({ url })
  } catch (e) {
    return NextResponse.json(
      { error: `Portal session failed: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    )
  }
}
