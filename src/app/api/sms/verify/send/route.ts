import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizeSession } from '@/lib/quote-session'
import { sendVerificationCode, isTwilioConfigured } from '@/lib/quote-twilio'
import { toE164 } from '@/lib/quote-crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const bodySchema = z.object({
  phone: z.string().min(7).max(25),
  tcpa_consent: z.literal(true, { message: 'TCPA consent required.' }),
})

// Simple per-phone / per-session rate limit using quote_events as the counter.
async function withinRateLimit(session_id: string, e164: string): Promise<{ ok: boolean; reason?: string }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data } = await supabaseAdmin
    .from('quote_events')
    .select('id')
    .eq('session_id', session_id)
    .eq('event_type', 'phone_verify_send')
    .gte('created_at', oneHourAgo)
  if ((data?.length ?? 0) >= 3) return { ok: false, reason: 'Too many attempts. Try again in an hour.' }
  // Also check same phone across sessions (prevent enumeration via many sessions).
  // Using phone_e164_hash would require computing and joining; for MVP we gate at session level.
  return { ok: true }
}

export async function POST(request: NextRequest) {
  if (!isTwilioConfigured()) {
    return NextResponse.json({ error: 'SMS verification is not configured. Please book a call instead.' }, { status: 503 })
  }

  const auth = await authorizeSession(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status })
  }
  const { session } = auth

  let body
  try {
    body = bodySchema.parse(await request.json())
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'invalid body'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const e164 = toE164(body.phone)
  if (!e164) {
    return NextResponse.json({ error: 'Please provide a valid phone number (e.g., 916-555-1234).' }, { status: 400 })
  }

  const rate = await withinRateLimit(session.id, e164)
  if (!rate.ok) {
    return NextResponse.json({ error: rate.reason }, { status: 429 })
  }

  const result = await sendVerificationCode(e164)
  if (!result.ok) {
    await supabaseAdmin.from('quote_events').insert({
      session_id: session.id,
      event_type: 'phone_verify_send_failed',
      event_data: { e164_last4: e164.slice(-4), error: result.error },
    })
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  await supabaseAdmin.from('quote_events').insert({
    session_id: session.id,
    event_type: 'phone_verify_send',
    event_data: { e164_last4: e164.slice(-4), status: result.status },
  })

  return NextResponse.json({ ok: true, status: result.status })
}
