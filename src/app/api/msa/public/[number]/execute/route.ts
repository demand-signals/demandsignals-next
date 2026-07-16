// ── POST /api/msa/public/[number]/execute ────────────────────────────
// Client-side MSA execution via the magic link. The client provides:
//   - signature: typed full name (E-SIGN electronic signature)
//   - initials:  [{ code, initials }] — one per incorporated disclosure
//
// We:
//   1. Validate the public_uuid (key) matches the msa_number
//   2. Require an initial for EVERY incorporated disclosure
//   3. Stamp executed_at / signature / ip + per-disclosure initials (with
//      the disclosure's code — the acknowledged version — and timestamp/ip)
//   4. Flip status sent/viewed → executed
//   5. Set prospect.has_executed_msa = true, msa_executed_at, executed_msa_id

export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface ExecuteBody {
  key: string // public_uuid
  signature: string
  initials: Array<{ code: string; initials: string }>
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ number: string }> },
) {
  const { number } = await ctx.params
  let body: ExecuteBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.key || !body.signature?.trim()) {
    return NextResponse.json({ error: 'signature and key required' }, { status: 400 })
  }

  const { data: msa, error } = await supabaseAdmin
    .from('msa_documents')
    .select('id, prospect_id, public_uuid, status, incorporated_disclosures')
    .eq('msa_number', number)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!msa) return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
  if (msa.public_uuid !== body.key) {
    return NextResponse.json({ error: 'Invalid link' }, { status: 403 })
  }
  if (msa.status === 'executed') {
    return NextResponse.json({ ok: true, already_executed: true })
  }
  if (!['sent', 'viewed'].includes(msa.status)) {
    return NextResponse.json({ error: `Cannot execute an agreement in status ${msa.status}` }, { status: 409 })
  }

  // Require an initial for every incorporated disclosure.
  const required = (msa.incorporated_disclosures as Array<{ code: string }>) ?? []
  const provided = new Map((body.initials ?? []).map((i) => [i.code, i.initials?.trim()]))
  const missing = required.filter((d) => !provided.get(d.code))
  if (missing.length > 0) {
    return NextResponse.json(
      { error: 'Each disclosure must be initialed', missing: missing.map((d) => d.code) },
      { status: 400 },
    )
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    null
  const now = new Date().toISOString()

  const disclosureInitials = required.map((d) => ({
    code: d.code,
    initials: provided.get(d.code),
    at: now,
    ip,
  }))

  const { error: updErr } = await supabaseAdmin
    .from('msa_documents')
    .update({
      status: 'executed',
      executed_at: now,
      executed_signature: body.signature.trim(),
      executed_ip: ip,
      disclosure_initials: disclosureInitials,
    })
    .eq('id', msa.id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  // Flip the client-level flag so any flow (SOW-accept, button) can check it.
  if (msa.prospect_id) {
    await supabaseAdmin
      .from('prospects')
      .update({ has_executed_msa: true, msa_executed_at: now, executed_msa_id: msa.id })
      .eq('id', msa.prospect_id)
    // Regenerate the PDF so the stored copy shows the signature + initials.
    try {
      const { regenerateMsaPdf } = await import('@/lib/msa-send')
      await regenerateMsaPdf(msa.id)
    } catch (e) {
      console.warn('[msa/execute] post-exec regen failed:', e instanceof Error ? e.message : e)
    }
    // Log activity.
    try {
      await supabaseAdmin.from('activities').insert({
        prospect_id: msa.prospect_id,
        type: 'msa_executed',
        channel: 'system',
        direction: 'inbound',
        subject: `MSA ${number} executed`,
        body: `Signed by: ${body.signature.trim()}`,
        status: 'sent',
        created_by: 'system',
      })
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ ok: true, executed_at: now })
}
