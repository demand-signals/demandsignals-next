import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizeSession } from '@/lib/quote-session'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const bodySchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
})

// POST /api/quote/email-plan
// Low-friction alternative to phone verify. Prospect provides email, we flag
// the session and a human follows up within 24-48 hours with the plan PDF.
// Does NOT unlock pricing in the UI (that still requires phone verify) —
// this is a safety-net for prospects who won't verify phone.
export async function POST(request: NextRequest) {
  const auth = await authorizeSession(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status })
  }
  const { session } = auth

  let body
  try {
    body = bodySchema.parse(await request.json())
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'invalid email'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  await supabaseAdmin
    .from('quote_sessions')
    .update({
      email: body.email,
      email_verified: false,
      conversion_action: 'sent_estimate',
    })
    .eq('id', session.id)

  await supabaseAdmin.from('quote_events').insert({
    session_id: session.id,
    event_type: 'email_plan_requested',
    event_data: { email: body.email },
  })

  // TODO: trigger admin notification (Stage C — hot-walkaway notify covers this too)
  return NextResponse.json({ ok: true })
}
