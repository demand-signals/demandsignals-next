import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizeSession } from '@/lib/quote-session'
import { checkVerificationCode, lookupPhone } from '@/lib/quote-twilio'
import { preparePhoneForStorage, toE164 } from '@/lib/quote-crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const bodySchema = z.object({
  phone: z.string().min(7).max(25),
  code: z.string().regex(/^\d{4,10}$/, 'Code must be digits only.'),
})

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
    const msg = e instanceof Error ? e.message : 'invalid body'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const e164 = toE164(body.phone)
  if (!e164) {
    return NextResponse.json({ error: 'Invalid phone number.' }, { status: 400 })
  }

  const result = await checkVerificationCode(e164, body.code)
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Verification failed.' }, { status: 502 })
  }
  if (!result.approved) {
    await supabaseAdmin.from('quote_events').insert({
      session_id: session.id,
      event_type: 'phone_verify_failed',
      event_data: { e164_last4: e164.slice(-4), status: result.status },
    })
    return NextResponse.json({ ok: true, approved: false, error: 'That code didn\'t match. Try again.' })
  }

  // Approved — persist encrypted phone + hash, flip phone_verified, do VOIP lookup.
  const prepared = preparePhoneForStorage(e164)
  if (!prepared) {
    return NextResponse.json({ error: 'Failed to prepare phone for storage.' }, { status: 500 })
  }

  // VOIP lookup — best effort, don't block the happy path.
  const lookup = await lookupPhone(e164)
  const phone_is_voip = lookup.ok ? Boolean(lookup.is_voip) : null

  const { error: upErr } = await supabaseAdmin
    .from('quote_sessions')
    .update({
      phone_encrypted: prepared.phone_encrypted,
      phone_last_four: prepared.phone_last_four,
      phone_e164_hash: prepared.phone_e164_hash,
      phone_verified: true,
      phone_is_voip,
    })
    .eq('id', session.id)
  if (upErr) {
    return NextResponse.json({ error: 'Failed to save verified phone.' }, { status: 500 })
  }

  await supabaseAdmin.from('quote_events').insert({
    session_id: session.id,
    event_type: 'phone_verified',
    event_data: { e164_last4: prepared.phone_last_four, is_voip: phone_is_voip },
  })

  // Auto-match to prospects by phone hash (if an existing prospect has this phone).
  // For MVP we skip the merge — Stage C will add it.

  return NextResponse.json({ ok: true, approved: true, phone_last_four: prepared.phone_last_four })
}
