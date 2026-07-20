// ── POST /api/msa/public/[number]/execute ────────────────────────────
// Client-side MSA execution via the magic link. Captures:
//   - signature: typed full name (E-SIGN electronic signature)
//   - approver: name / title / email / cell
//   - esignConsent: explicit checkbox agreement to electronic signature
//   - initials: [{ code, initials }] — one per incorporated disclosure
//   - fingerprint: full client-side signal blob (screen, tz, geolocation,
//     canvas, webgl, etc.), merged with server-side signals (IP + Vercel geo).
//
// On success: stamp execution + fingerprint, flip status → executed, set
// prospect.has_executed_msa, regenerate the PDF (now includes the certificate).

export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface ExecuteBody {
  key: string
  signature: string
  approver?: { name?: string; title?: string; email?: string; cell?: string }
  esignConsent?: boolean
  initials: Array<{ code: string; initials: string }>
  msaInitials?: string
  fingerprint?: Record<string, unknown>
}

function initialsFromName(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]!.toUpperCase()).join('').slice(0, 5)
}
function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}
function digitsOnly(v: string): string {
  return v.replace(/\D/g, '')
}

function num(v: string | null): number | undefined {
  if (!v) return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
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

  // ── Identity gate FIRST (before any status/field validation) ──
  // Fetch by number AND public_uuid in the SAME query, and return a uniform
  // 404 on any miss. The previous code fetched by msa_number alone, then
  // compared public_uuid in app code — which returned 404 for a bad number
  // but 403 for a valid number with a wrong key. That divergence was an
  // existence oracle over the guessable MSA-CLIENT-MMDDYY{SUFFIX} space,
  // letting an attacker enumerate which MSA numbers exist without any UUID.
  // Matching the invoice/SOW routes closes it. Security audit 2026-07-20.
  const { data: msa, error } = await supabaseAdmin
    .from('msa_documents')
    .select('id, prospect_id, public_uuid, status, incorporated_disclosures')
    .eq('msa_number', number)
    .eq('public_uuid', body.key)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!msa) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (msa.status === 'executed') {
    return NextResponse.json({ ok: true, already_executed: true })
  }
  if (!['sent', 'viewed'].includes(msa.status)) {
    return NextResponse.json({ error: `Cannot execute an agreement in status ${msa.status}` }, { status: 409 })
  }

  if (!body.esignConsent) {
    return NextResponse.json({ error: 'Electronic signature consent is required' }, { status: 400 })
  }

  // ── Server-side validation (defense in depth; client validates too) ──
  // ALL signer fields are required — name, title, email, cell. The executed
  // agreement is a legal instrument; no field may be left blank.
  const approverName = (body.approver?.name ?? '').trim()
  const approverTitle = (body.approver?.title ?? '').trim()
  const approverEmail = (body.approver?.email ?? '').trim()
  const approverCell = (body.approver?.cell ?? '').trim()
  if (!approverName) {
    return NextResponse.json({ error: 'Signer name is required' }, { status: 400 })
  }
  if (!approverTitle) {
    return NextResponse.json({ error: 'Signer title is required' }, { status: 400 })
  }
  if (!approverEmail) {
    return NextResponse.json({ error: 'Signer email is required' }, { status: 400 })
  }
  if (!isEmail(approverEmail)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }
  if (!approverCell || digitsOnly(approverCell).length < 10) {
    return NextResponse.json({ error: 'A valid signer cell phone is required' }, { status: 400 })
  }
  if (body.signature.trim().toLowerCase() !== approverName.toLowerCase()) {
    return NextResponse.json({ error: 'Signature must match the signer name' }, { status: 400 })
  }
  const expectedInitials = initialsFromName(approverName)
  // Every provided initial (disclosures + MSA) must equal the name's initials.
  const allInitialVals = [...(body.initials ?? []).map((i) => i.initials), body.msaInitials]
  for (const v of allInitialVals) {
    if ((v ?? '').trim().toUpperCase() !== expectedInitials) {
      return NextResponse.json({ error: `Initials must be "${expectedInitials}" on every document and match the signer name` }, { status: 400 })
    }
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

  const h = request.headers
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null
  const now = new Date().toISOString()

  // Server-side geolocation from Vercel edge headers (no external API).
  const ipGeo = {
    city: h.get('x-vercel-ip-city') ? decodeURIComponent(h.get('x-vercel-ip-city')!) : undefined,
    region: h.get('x-vercel-ip-country-region') ?? undefined,
    country: h.get('x-vercel-ip-country') ?? undefined,
    lat: num(h.get('x-vercel-ip-latitude')),
    lon: num(h.get('x-vercel-ip-longitude')),
    timezone: h.get('x-vercel-ip-timezone') ?? undefined,
  }

  // Merge client fingerprint with server signals.
  const fingerprint = {
    ...(body.fingerprint ?? {}),
    ip,
    ip_geo: ipGeo,
    user_agent: h.get('user-agent') ?? (body.fingerprint?.user_agent as string | undefined) ?? null,
    collected_at: now,
  }

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
      approver_name: approverName,
      approver_title: approverTitle,
      approver_email: approverEmail,
      approver_cell: approverCell,
      esign_consent: true,
      esign_consent_at: now,
      disclosure_initials: disclosureInitials,
      signer_fingerprint: fingerprint,
    })
    .eq('id', msa.id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  if (msa.prospect_id) {
    await supabaseAdmin
      .from('prospects')
      .update({ has_executed_msa: true, msa_executed_at: now, executed_msa_id: msa.id })
      .eq('id', msa.prospect_id)
    // Regenerate the PDF (now fully executed + certificate), then deliver the
    // countersigned copy to the signer and alert the DSIG team.
    try {
      const { regenerateMsaPdf, sendExecutedMsa } = await import('@/lib/msa-send')
      await regenerateMsaPdf(msa.id)
      await sendExecutedMsa(msa.id)   // email (PDF attached) + SMS to the signer
    } catch (e) {
      console.warn('[msa/execute] post-exec delivery failed:', e instanceof Error ? e.message : e)
    }
    try {
      await supabaseAdmin.from('activities').insert({
        prospect_id: msa.prospect_id,
        type: 'msa_executed',
        channel: 'system',
        direction: 'inbound',
        subject: `MSA ${number} executed`,
        body: `Signed by: ${approverName}${approverTitle ? ` (${approverTitle})` : ''}`,
        status: 'sent',
        created_by: 'system',
      })
    } catch { /* non-fatal */ }
  }

  // Admin SMS alert — MSA signed.
  try {
    const { notifyAdminsBySms } = await import('@/lib/admin-sms')
    await notifyAdminsBySms({
      source: 'msa-executed',
      body: `✅ MSA ${number} signed by ${approverName}. Fully executed & delivered to the signer.`,
    })
  } catch (e) {
    console.warn('[msa/execute] admin alert failed:', e instanceof Error ? e.message : e)
  }

  return NextResponse.json({ ok: true, executed_at: now })
}
