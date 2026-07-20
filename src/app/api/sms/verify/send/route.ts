import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizeSession } from '@/lib/quote-session'
import { sendVerificationCode, isTwilioConfigured } from '@/lib/quote-twilio'
import { toE164, hashPhone } from '@/lib/quote-crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const bodySchema = z.object({
  phone: z.string().min(7).max(25),
  tcpa_consent: z.literal(true, { message: 'TCPA consent required.' }),
})

// Per-phone / per-session rate limit using quote_events as the counter.
//
// Two independent caps, both hourly, both DB-backed (survive Lambda churn):
//   - per SESSION: max 3 sends/hr (stops one session hammering).
//   - per PHONE across ALL sessions: max 5 sends/hr (stops SMS-pump / toll
//     fraud where an attacker mints fresh sessions to keep texting the same
//     victim number). Counts on the SHA-256 phone hash stored in event_data,
//     so no raw number is compared. Security audit 2026-07-20 — closes the
//     "for MVP we gate at session level" gap noted in the prior code.
const MAX_PER_SESSION_PER_HOUR = 3
const MAX_PER_PHONE_PER_HOUR = 5

async function withinRateLimit(session_id: string, e164: string): Promise<{ ok: boolean; reason?: string }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data: sessionSends } = await supabaseAdmin
    .from('quote_events')
    .select('id')
    .eq('session_id', session_id)
    .eq('event_type', 'phone_verify_send')
    .gte('created_at', oneHourAgo)
  if ((sessionSends?.length ?? 0) >= MAX_PER_SESSION_PER_HOUR) {
    return { ok: false, reason: 'Too many attempts. Try again in an hour.' }
  }

  // Cross-session per-phone counter. Filters quote_events by the hashed number
  // inside event_data (jsonb ->> match). Prevents a fresh-session SMS pump.
  const phoneHash = hashPhone(e164)
  const { data: phoneSends } = await supabaseAdmin
    .from('quote_events')
    .select('id')
    .eq('event_type', 'phone_verify_send')
    .eq('event_data->>e164_hash', phoneHash)
    .gte('created_at', oneHourAgo)
  if ((phoneSends?.length ?? 0) >= MAX_PER_PHONE_PER_HOUR) {
    return { ok: false, reason: 'Too many attempts for this number. Try again in an hour.' }
  }

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
    // e164_hash powers the cross-session per-phone rate limit (see
    // withinRateLimit). Only last-4 + the SHA-256 hash are stored — never the
    // raw number.
    event_data: { e164_last4: e164.slice(-4), e164_hash: hashPhone(e164), status: result.status },
  })

  return NextResponse.json({ ok: true, status: result.status })
}
