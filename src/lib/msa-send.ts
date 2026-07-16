// ── msa-send.ts ─────────────────────────────────────────────────────
// Render → R2 → send for Master Service Agreements. Mirrors sow-send.ts.
//
// The MSA is the relationship contract sent as an "onboarding kit" — MSA +
// its incorporated disclosures — to first-time clients (or on demand via the
// [Send Onboarding Docs] button). It rides the exact same rails as SOWs:
//   issueMsa()          render → uploadPrivate → flip draft→sent
//   dispatchMsaEmail()  fetch PDF from R2 → email (with PDF attachment)
//   dispatchMsaSms()    magic-link SMS
//   sendOnboardingDocs() shared entry point: ensures a draft MSA exists for a
//                        client, issues it, and dispatches via BOTH email + SMS.

import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { sendSms } from '@/lib/twilio-sms'
import { trackLink } from '@/lib/track-link'
import { getPrivateSignedUrl, uploadPrivate, deletePrivate } from '@/lib/r2-storage'
import { renderMsaPdf, type MsaDocument, type MsaIncorporatedDisclosure } from '@/lib/pdf/msa'

interface DispatchResult {
  success: boolean
  recipient?: string
  message_id?: string
  error?: string
}

interface MsaRow extends MsaDocument {
  id: string
  prospect_id: string | null
  pdf_storage_path: string | null
  prospect?: {
    business_name?: string | null
    owner_name?: string | null
    owner_email?: string | null
    business_email?: string | null
    owner_phone?: string | null
    business_phone?: string | null
  } | null
}

const SELECT =
  '*, prospect:prospects(business_name, owner_name, owner_email, business_email, owner_phone, business_phone)'

/* ── Activity log ───────────────────────────────────────────────────── */

async function logMsaActivity(args: {
  msa: MsaRow
  type: string
  channel: 'email' | 'sms' | 'system'
  recipient?: string
  success: boolean
  errorMessage?: string
  createdBy?: string
}) {
  if (!args.msa.prospect_id) return
  const { msa, type, channel, recipient, success, errorMessage, createdBy } = args
  const subject = success
    ? `MSA ${msa.msa_number} ${type === 'msa_issued' ? 'issued' : `sent via ${channel}`}`
    : `MSA ${msa.msa_number} send FAILED via ${channel}`
  const bodyLines: string[] = []
  if (recipient) bodyLines.push(`Recipient: ${recipient}`)
  if (errorMessage) bodyLines.push(`Error: ${errorMessage}`)
  try {
    await supabaseAdmin.from('activities').insert({
      prospect_id: msa.prospect_id,
      type,
      channel,
      direction: 'outbound',
      subject,
      body: bodyLines.join('\n') || null,
      status: success ? 'sent' : 'failed',
      created_by: createdBy ?? 'system',
    })
  } catch (e) {
    console.error('[msa-send] activity log failed:', e instanceof Error ? e.message : e)
  }
}

/* ── Prospect → render props ────────────────────────────────────────── */

function prospectProps(msa: MsaRow) {
  return {
    business_name: msa.prospect?.business_name ?? msa.client_legal_name ?? 'Client',
    owner_name: msa.prospect?.owner_name ?? null,
    owner_email: msa.prospect?.owner_email ?? null,
  }
}

/* ── Regenerate cached PDF (fresh-state guarantee, mirrors SOW) ──────── */

export async function regenerateMsaPdf(msaId: string): Promise<{
  ok: boolean
  pdf_storage_path?: string
  error?: string
}> {
  const { data: msaRow, error } = await supabaseAdmin
    .from('msa_documents').select(SELECT).eq('id', msaId).maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!msaRow) return { ok: false, error: 'MSA not found' }
  const msa = msaRow as MsaRow
  try {
    const buf = await renderMsaPdf(msa, prospectProps(msa))
    const key = `msa/${msa.msa_number}.pdf`
    await uploadPrivate(key, buf, 'application/pdf')
    await supabaseAdmin.from('msa_documents')
      .update({ pdf_storage_path: key, pdf_rendered_at: new Date().toISOString() })
      .eq('id', msaId)
    return { ok: true, pdf_storage_path: key }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/* ── Issue (draft → sent) ───────────────────────────────────────────── */

export interface MsaIssueResult {
  success: boolean
  status?: 'sent'
  pdf_storage_path?: string
  error?: string
  already_issued?: boolean
}

export async function issueMsa(
  msaId: string,
  options: { createdBy?: string } = {},
): Promise<MsaIssueResult> {
  const { data: msaRow, error } = await supabaseAdmin
    .from('msa_documents').select(SELECT).eq('id', msaId).maybeSingle()
  if (error) return { success: false, error: error.message }
  if (!msaRow) return { success: false, error: 'MSA not found' }

  const msa = msaRow as MsaRow
  if (msa.status !== 'draft') {
    return { success: true, status: msa.status as 'sent', pdf_storage_path: msa.pdf_storage_path ?? undefined, already_issued: true }
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderMsaPdf(msa, prospectProps(msa))
  } catch (e) {
    return { success: false, error: `PDF render failed: ${e instanceof Error ? e.message : e}` }
  }

  const pdfKey = `msa/${msa.msa_number}.pdf`
  try {
    await uploadPrivate(pdfKey, pdfBuffer, 'application/pdf')
  } catch (e) {
    return { success: false, error: `R2 upload failed: ${e instanceof Error ? e.message : e}` }
  }

  const now = new Date().toISOString()
  const { error: updateErr } = await supabaseAdmin
    .from('msa_documents')
    .update({ status: 'sent', sent_at: now, pdf_storage_path: pdfKey, pdf_rendered_at: now })
    .eq('id', msaId)
  if (updateErr) {
    await deletePrivate(pdfKey).catch(() => {})
    return { success: false, error: updateErr.message }
  }

  await logMsaActivity({ msa, type: 'msa_issued', channel: 'system', success: true, createdBy: options.createdBy })
  return { success: true, status: 'sent', pdf_storage_path: pdfKey }
}

/* ── Email dispatch ─────────────────────────────────────────────────── */

export async function dispatchMsaEmail(
  msaId: string,
  options: { overrideEmail?: string; skipRegen?: boolean; createdBy?: string } = {},
): Promise<DispatchResult> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: 'RESEND_API_KEY not configured — refusing SMTP fallback per policy' }
  }
  const { data: msaRow, error } = await supabaseAdmin
    .from('msa_documents').select(SELECT).eq('id', msaId).maybeSingle()
  if (error) return { success: false, error: error.message }
  if (!msaRow) return { success: false, error: 'MSA not found' }
  const msa = msaRow as MsaRow

  if (!['sent', 'viewed', 'executed'].includes(msa.status)) {
    return { success: false, error: `Cannot email an MSA in status ${msa.status}. Issue the draft first.` }
  }

  if (!options.skipRegen) {
    const r = await regenerateMsaPdf(msaId)
    if (r.ok && r.pdf_storage_path) msa.pdf_storage_path = r.pdf_storage_path
    else if (!r.ok) console.warn('[dispatchMsaEmail] regen failed:', r.error)
  }

  const email = options.overrideEmail ?? msa.prospect?.owner_email ?? msa.prospect?.business_email ?? null
  if (!email) return { success: false, error: 'No email on prospect.owner_email or prospect.business_email' }

  // Attach the PDF from R2 (best-effort; email still carries the magic link).
  let pdfBuffer: Buffer | undefined
  if (msa.pdf_storage_path) {
    try {
      const signed = await getPrivateSignedUrl(msa.pdf_storage_path, 60)
      const res = await fetch(signed)
      if (res.ok) pdfBuffer = Buffer.from(await res.arrayBuffer())
    } catch { /* link still delivered */ }
  }

  const publicUrl = `https://demandsignals.co/msa/${msa.msa_number}/${msa.public_uuid}`
  const businessName = msa.prospect?.business_name ?? msa.client_legal_name ?? 'your business'
  const subject = `Your Demand Signals Onboarding Agreement (${msa.msa_number})`
  const html = onboardingEmailHtml(businessName, publicUrl, msa)
  const text = `${businessName},\n\nWelcome to Demand Signals. Please review and sign your Master Service Agreement and the incorporated disclosures:\n\n${publicUrl}\n\nThe agreement PDF is attached. Reply to this email with any questions.\n\n— Demand Signals`

  const result = await sendEmail({
    to: email,
    kind: 'msa',
    subject,
    html,
    text,
    isClientFacing: true,
    attachments: pdfBuffer ? [{ filename: `${msa.msa_number}.pdf`, content: pdfBuffer }] : undefined,
  })

  await logMsaActivity({ msa, type: 'msa_sent', channel: 'email', recipient: email, success: result.success, errorMessage: result.error, createdBy: options.createdBy })
  return { success: result.success, recipient: email, message_id: result.message_id, error: result.error }
}

/* ── SMS dispatch ───────────────────────────────────────────────────── */

export async function dispatchMsaSms(
  msaId: string,
  options: { overridePhone?: string; skipRegen?: boolean; createdBy?: string } = {},
): Promise<DispatchResult> {
  const { data: msaRow, error } = await supabaseAdmin
    .from('msa_documents').select(SELECT).eq('id', msaId).maybeSingle()
  if (error) return { success: false, error: error.message }
  if (!msaRow) return { success: false, error: 'MSA not found' }
  const msa = msaRow as MsaRow

  if (!['sent', 'viewed', 'executed'].includes(msa.status)) {
    return { success: false, error: `Cannot SMS an MSA in status ${msa.status}. Issue the draft first.` }
  }

  if (!options.skipRegen) {
    const r = await regenerateMsaPdf(msaId)
    if (!r.ok) console.warn('[dispatchMsaSms] regen failed:', r.error)
  }

  const phone = options.overridePhone ?? msa.prospect?.owner_phone ?? msa.prospect?.business_phone ?? null
  if (!phone) return { success: false, error: 'No phone on prospect.owner_phone or prospect.business_phone' }

  const businessName = msa.prospect?.business_name ?? msa.client_legal_name ?? 'your business'
  const url = trackLink(
    `https://demandsignals.co/msa/${msa.msa_number}/${msa.public_uuid}`,
    { medium: 'sms', campaign: 'msa', content: msa.msa_number },
  )
  const message = `${businessName}: Your Demand Signals onboarding agreement ${msa.msa_number} is ready to review & sign — ${url}`

  const result = await sendSms(phone, message)
  await logMsaActivity({ msa, type: 'msa_sent', channel: 'sms', recipient: phone, success: result.success, errorMessage: result.error, createdBy: options.createdBy })
  return { success: result.success, recipient: phone, message_id: result.message_id, error: result.error }
}

/* ── Onboarding kit: ensure MSA exists → issue → email + SMS ─────────── */

export interface OnboardingResult {
  success: boolean
  msa_id?: string
  msa_number?: string
  email?: DispatchResult
  sms?: DispatchResult
  error?: string
  already_executed?: boolean
}

/**
 * Shared entry point for the [Send Onboarding Docs] button AND the
 * first-time-client SOW-accept path. Ensures a draft MSA exists for the
 * prospect (auto-filled with the current disclosure versions + client
 * fields), issues it (render → R2), and dispatches via BOTH email and SMS.
 */
export async function sendOnboardingDocs(
  prospectId: string,
  options: { createdBy?: string; force?: boolean } = {},
): Promise<OnboardingResult> {
  // 1. Load client
  const { data: prospect, error: pErr } = await supabaseAdmin
    .from('prospects')
    .select('id, business_name, owner_name, owner_email, business_email, owner_phone, business_phone, client_code, has_executed_msa')
    .eq('id', prospectId)
    .maybeSingle()
  if (pErr) return { success: false, error: pErr.message }
  if (!prospect) return { success: false, error: 'Prospect not found' }

  if (prospect.has_executed_msa && !options.force) {
    return { success: true, already_executed: true }
  }

  // 2. Reuse an existing draft/sent MSA for this client, or create one.
  const { data: existing } = await supabaseAdmin
    .from('msa_documents')
    .select('id, msa_number, status')
    .eq('prospect_id', prospectId)
    .in('status', ['draft', 'sent', 'viewed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let msaId: string
  let msaNumber: string

  if (existing) {
    msaId = existing.id
    msaNumber = existing.msa_number
  } else {
    // Current disclosure versions the MSA incorporates.
    const { data: discs } = await supabaseAdmin
      .from('disclosure_versions')
      .select('kind, code, title, public_url')
      .eq('is_current', true)
      .in('kind', ['STSD', 'SRPD', 'MCD'])
    const incorporated: MsaIncorporatedDisclosure[] = (discs ?? []).map((d) => ({
      code: d.code, title: d.title, public_url: d.public_url,
    }))

    const { data: numRow, error: numErr } = await supabaseAdmin.rpc('generate_msa_number')
    if (numErr) return { success: false, error: `MSA number allocation failed: ${numErr.message}` }
    msaNumber = numRow as unknown as string

    const { data: created, error: cErr } = await supabaseAdmin
      .from('msa_documents')
      .insert({
        msa_number: msaNumber,
        prospect_id: prospectId,
        status: 'draft',
        client_legal_name: prospect.business_name,
        client_code: prospect.client_code ?? null,
        // client_entity_type stays null here — set on the MSA row by an admin
        // when the exact registered entity/state is known (no prospects column).
        incorporated_disclosures: incorporated,
        created_by: null,
      })
      .select('id, msa_number')
      .single()
    if (cErr) return { success: false, error: `MSA create failed: ${cErr.message}` }
    msaId = created.id
    msaNumber = created.msa_number
  }

  // 3. Issue (render → R2 → draft→sent). Idempotent if already sent.
  const issued = await issueMsa(msaId, { createdBy: options.createdBy })
  if (!issued.success) return { success: false, msa_id: msaId, msa_number: msaNumber, error: issued.error }

  // 4. Dispatch via BOTH channels (skipRegen — issue already rendered fresh).
  const email = await dispatchMsaEmail(msaId, { skipRegen: true, createdBy: options.createdBy })
  const sms = await dispatchMsaSms(msaId, { skipRegen: true, createdBy: options.createdBy })

  return {
    success: email.success || sms.success,
    msa_id: msaId,
    msa_number: msaNumber,
    email,
    sms,
  }
}

/* ── Onboarding email HTML ──────────────────────────────────────────── */

function onboardingEmailHtml(businessName: string, url: string, msa: MsaRow): string {
  const rows = (msa.incorporated_disclosures ?? [])
    .map((d) => `<li style="margin:4px 0;"><a href="${d.public_url}" style="color:#2BA98E;">${d.title} (${d.code})</a></li>`)
    .join('')
  return `<!doctype html><html><body style="font-family:Helvetica,Arial,sans-serif;color:#1f2733;line-height:1.6;">
    <p>${businessName},</p>
    <p>Welcome to Demand Signals. Before we begin, please review and sign your <strong>Master Service Agreement</strong> — the one-time agreement that governs our working relationship. It incorporates the following standing disclosures, which you can review at any time:</p>
    <ul>${rows}</ul>
    <p><a href="${url}" style="display:inline-block;background:#2BA98E;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;">Review &amp; Sign Your Agreement →</a></p>
    <p>The agreement is also attached to this email as a PDF. Just reply if you have any questions.</p>
    <p>— Demand Signals</p>
  </body></html>`
}
