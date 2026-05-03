// ── sow-send.ts ─────────────────────────────────────────────────────
// Shared dispatch for SOW email + SMS. Mirrors invoice-send.ts.
//
// Used by:
//   - /api/admin/sow/[id]/send-email (synchronous admin send)
//   - /api/admin/sow/[id]/send-sms (synchronous admin send)
//   - /api/admin/sow/[id]/resend (re-send via the channel originally used)
//   - future: /api/cron/scheduled-sends (deferred dispatch from sow_scheduled_sends — not yet built)
//
// Why a shared lib: same reason as invoice-send.ts (CLAUDE.md §12).
// Internal fetch from one Vercel Function to another fails the
// downstream requireAdmin() CSRF guard — server-to-server fetches
// don't carry browser headers. Calling these dispatch functions
// directly bypasses the auth dance entirely.

import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendSowEmail, buildSowEmail } from '@/lib/sow-email'
import { sendSms } from '@/lib/twilio-sms'
import { trackLink } from '@/lib/track-link'
import { getPrivateSignedUrl, uploadPrivate, deletePrivate } from '@/lib/r2-storage'
import { renderSowPdf } from '@/lib/pdf/sow'
import type { SowDocument } from '@/lib/invoice-types'

interface DispatchEmailOptions {
  /** Override recipient (admin can re-route). */
  overrideEmail?: string
  /** Schedule UUID if dispatched from cron — surfaces in activity body. */
  scheduledSendId?: string
  /** Original schedule time if dispatched from cron — for "Scheduled X → fired Y". */
  scheduledFor?: string
  /** Who triggered this — 'system' for cron, admin user id otherwise. */
  createdBy?: string
}

interface DispatchSmsOptions {
  overridePhone?: string
  scheduledSendId?: string
  scheduledFor?: string
  createdBy?: string
}

interface DispatchResult {
  success: boolean
  recipient?: string
  message_id?: string
  error?: string
}

interface SowWithProspect extends SowDocument {
  prospect?: {
    business_name?: string | null
    owner_name?: string | null
    owner_email?: string | null
    business_email?: string | null
    owner_phone?: string | null
    business_phone?: string | null
  } | null
}

/* ── Activity log helper ────────────────────────────────────────────── */

async function logSowActivity(args: {
  sow: SowWithProspect
  channel: 'email' | 'sms'
  recipient: string
  success: boolean
  errorMessage?: string
  scheduledFor?: string
  createdBy?: string
}) {
  if (!args.sow.prospect_id) return
  const { sow, channel, recipient, success, errorMessage, scheduledFor, createdBy } = args

  const subject = success
    ? `SOW ${sow.sow_number} sent via ${channel}`
    : `SOW ${sow.sow_number} send FAILED via ${channel}`

  const bodyLines: string[] = [`Recipient: ${recipient}`]
  if (scheduledFor) {
    bodyLines.unshift(`Scheduled for ${scheduledFor} → fired ${new Date().toISOString()}`)
  }
  if (errorMessage) bodyLines.push(`Error: ${errorMessage}`)

  try {
    await supabaseAdmin.from('activities').insert({
      prospect_id: sow.prospect_id,
      type: channel,
      channel,
      direction: 'outbound',
      subject,
      body: bodyLines.join('\n'),
      status: success ? 'sent' : 'failed',
      created_by: createdBy ?? 'system',
    })
  } catch (e) {
    console.error('[sow-send] activity log failed:', e instanceof Error ? e.message : e)
  }
}

/** Logs a "scheduled" activity row when an admin schedules a future SOW send. */
export async function logSowScheduledActivity(args: {
  sow: { id: string; sow_number: string; prospect_id?: string | null }
  channel: 'email' | 'sms' | 'both'
  sendAt: string
  recipient?: string | null
  createdBy?: string
}) {
  if (!args.sow.prospect_id) return
  try {
    await supabaseAdmin.from('activities').insert({
      prospect_id: args.sow.prospect_id,
      type: 'note',
      channel: args.channel === 'both' ? 'email' : args.channel,
      direction: 'outbound',
      subject: `SOW ${args.sow.sow_number} scheduled to send via ${args.channel} at ${args.sendAt}`,
      body: args.recipient ? `Recipient: ${args.recipient}` : null,
      status: 'scheduled',
      created_by: args.createdBy ?? 'system',
    })
  } catch (e) {
    console.error('[sow-send] schedule activity log failed:', e instanceof Error ? e.message : e)
  }
}

/** Logs a "scheduled send cancelled" activity row for SOWs. */
export async function logSowScheduleCancelledActivity(args: {
  sow: { sow_number: string; prospect_id?: string | null }
  channel: 'email' | 'sms' | 'both'
  sendAt: string
  createdBy?: string
}) {
  if (!args.sow.prospect_id) return
  try {
    await supabaseAdmin.from('activities').insert({
      prospect_id: args.sow.prospect_id,
      type: 'note',
      channel: args.channel === 'both' ? 'email' : args.channel,
      direction: 'outbound',
      subject: `SOW ${args.sow.sow_number} scheduled send cancelled (was ${args.sendAt})`,
      body: null,
      status: 'cancelled',
      created_by: args.createdBy ?? 'system',
    })
  } catch (e) {
    console.error('[sow-send] schedule-cancel activity log failed:', e instanceof Error ? e.message : e)
  }
}

/* ── Email dispatch ─────────────────────────────────────────────────── */

export async function dispatchSowEmail(
  sowId: string,
  options: DispatchEmailOptions = {},
): Promise<DispatchResult> {
  if (!process.env.RESEND_API_KEY) {
    return {
      success: false,
      error: 'RESEND_API_KEY not configured — refusing to fall back to SMTP per policy',
    }
  }

  const { data: sowRow, error } = await supabaseAdmin
    .from('sow_documents')
    .select('*, prospect:prospects(business_name, owner_name, owner_email, business_email)')
    .eq('id', sowId)
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  if (!sowRow) return { success: false, error: 'SOW not found' }

  const sow = sowRow as SowWithProspect

  // Drafts must be issued before email can be dispatched (the email
  // attaches the PDF, which gets rendered+uploaded during issuance).
  // Callers route drafts through issueSow first; this guard catches
  // misuse only.
  if (!['sent', 'viewed', 'accepted', 'declined'].includes(sow.status)) {
    return { success: false, error: `Cannot email an SOW in status ${sow.status}. Issue the draft first.` }
  }

  const email =
    options.overrideEmail ??
    sow.prospect?.owner_email ??
    sow.prospect?.business_email ??
    null
  if (!email) {
    return {
      success: false,
      error: 'No email on prospect.owner_email or prospect.business_email',
    }
  }

  // Fetch PDF from R2 for attachment (best-effort). If the PDF was never
  // rendered (rare — first-time send always renders), the email still
  // carries the magic-link URL.
  let pdfBuffer: Buffer | undefined
  if (sow.pdf_storage_path) {
    try {
      const signed = await getPrivateSignedUrl(sow.pdf_storage_path, 60)
      const res = await fetch(signed)
      if (res.ok) {
        const ab = await res.arrayBuffer()
        pdfBuffer = Buffer.from(ab)
      }
    } catch {
      /* fall through — email still carries the link */
    }
  }

  const result = await sendSowEmail(
    sow,
    email,
    {
      business_name: sow.prospect?.business_name ?? undefined,
      owner_email: sow.prospect?.owner_email ?? undefined,
      owner_name: sow.prospect?.owner_name ?? undefined,
    },
    pdfBuffer,
  )

  await logSowActivity({
    sow,
    channel: 'email',
    recipient: email,
    success: result.success,
    errorMessage: result.error,
    scheduledFor: options.scheduledFor,
    createdBy: options.createdBy,
  })

  return {
    success: result.success,
    recipient: email,
    message_id: result.message_id,
    error: result.error,
  }
}

/* ── SMS dispatch ───────────────────────────────────────────────────── */

export async function dispatchSowSms(
  sowId: string,
  options: DispatchSmsOptions = {},
): Promise<DispatchResult> {
  const { data: sowRow, error } = await supabaseAdmin
    .from('sow_documents')
    .select('*, prospect:prospects(business_name, owner_phone, business_phone)')
    .eq('id', sowId)
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  if (!sowRow) return { success: false, error: 'SOW not found' }

  const sow = sowRow as SowWithProspect

  if (!['sent', 'viewed', 'accepted', 'declined'].includes(sow.status)) {
    return { success: false, error: `Cannot SMS an SOW in status ${sow.status}. Issue the draft first.` }
  }

  const phone =
    options.overridePhone ??
    sow.prospect?.owner_phone ??
    sow.prospect?.business_phone ??
    null
  if (!phone) {
    return {
      success: false,
      error: 'No phone on prospect.owner_phone or prospect.business_phone',
    }
  }

  const businessName = sow.prospect?.business_name ?? 'your business'
  const url = trackLink(
    `https://demandsignals.co/sow/${sow.sow_number}/${sow.public_uuid}`,
    { medium: 'sms', campaign: 'sow', content: sow.sow_number },
  )
  const totalCents = (sow as SowDocument).pricing?.total_cents ?? 0
  const totalStr =
    totalCents === 0 ? 'review' : `$${(totalCents / 100).toFixed(2)}`
  const message = `${businessName}: Your Demand Signals SOW ${sow.sow_number} (${totalStr}) — ${url}`

  const result = await sendSms(phone, message)

  await logSowActivity({
    sow,
    channel: 'sms',
    recipient: phone,
    success: result.success,
    errorMessage: result.error,
    scheduledFor: options.scheduledFor,
    createdBy: options.createdBy,
  })

  return {
    success: result.success,
    recipient: phone,
    message_id: result.message_id,
    error: result.error,
  }
}

/* ── Preview helpers (no-send) ──────────────────────────────────────── */

export interface SowEmailPreview {
  ok: true
  channel: 'email'
  recipient: string
  subject: string
  text: string
  html: string
  public_url: string
  has_pdf_attachment: boolean
  pdf_filename: string | null
}

export interface SowSmsPreview {
  ok: true
  channel: 'sms'
  recipient: string
  message: string
  public_url: string
}

export interface SowPreviewError {
  ok: false
  error: string
}

export async function previewSowEmail(
  sowId: string,
  overrideEmail?: string,
): Promise<SowEmailPreview | SowPreviewError> {
  const { data: sowRow, error } = await supabaseAdmin
    .from('sow_documents')
    .select('*, prospect:prospects(business_name, owner_name, owner_email, business_email)')
    .eq('id', sowId)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!sowRow) return { ok: false, error: 'SOW not found' }

  const sow = sowRow as SowWithProspect
  // Drafts are previewable — confirming will issue then dispatch.
  if (!['draft', 'sent', 'viewed', 'accepted', 'declined'].includes(sow.status)) {
    return { ok: false, error: `Cannot preview email for an SOW in status ${sow.status}` }
  }

  const recipient =
    overrideEmail ??
    sow.prospect?.owner_email ??
    sow.prospect?.business_email ??
    null
  if (!recipient) {
    return {
      ok: false,
      error: 'No email on prospect.owner_email or prospect.business_email',
    }
  }

  const { subject, html, text, publicUrl } = buildSowEmail(
    sow,
    {
      business_name: sow.prospect?.business_name ?? undefined,
      owner_email: sow.prospect?.owner_email ?? undefined,
      owner_name: sow.prospect?.owner_name ?? undefined,
    },
  )

  return {
    ok: true,
    channel: 'email',
    recipient,
    subject,
    text,
    html,
    public_url: publicUrl,
    has_pdf_attachment: !!sow.pdf_storage_path,
    pdf_filename: sow.pdf_storage_path ? `SOW-${sow.sow_number}.pdf` : null,
  }
}

export async function previewSowSms(
  sowId: string,
  overridePhone?: string,
): Promise<SowSmsPreview | SowPreviewError> {
  const { data: sowRow, error } = await supabaseAdmin
    .from('sow_documents')
    .select('*, prospect:prospects(business_name, owner_phone, business_phone)')
    .eq('id', sowId)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!sowRow) return { ok: false, error: 'SOW not found' }

  const sow = sowRow as SowWithProspect
  // Drafts are previewable — confirming will issue then dispatch.
  if (!['draft', 'sent', 'viewed', 'accepted', 'declined'].includes(sow.status)) {
    return { ok: false, error: `Cannot preview SMS for an SOW in status ${sow.status}` }
  }

  const recipient =
    overridePhone ??
    sow.prospect?.owner_phone ??
    sow.prospect?.business_phone ??
    null
  if (!recipient) {
    return {
      ok: false,
      error: 'No phone on prospect.owner_phone or prospect.business_phone',
    }
  }

  const businessName = sow.prospect?.business_name ?? 'your business'
  const url = trackLink(
    `https://demandsignals.co/sow/${sow.sow_number}/${sow.public_uuid}`,
    { medium: 'sms', campaign: 'sow', content: sow.sow_number },
  )
  const totalCents = (sow as SowDocument).pricing?.total_cents ?? 0
  const totalStr = totalCents === 0 ? 'review' : `$${(totalCents / 100).toFixed(2)}`
  const message = `${businessName}: Your Demand Signals SOW ${sow.sow_number} (${totalStr}) — ${url}`

  return {
    ok: true,
    channel: 'sms',
    recipient,
    message,
    public_url: url,
  }
}

/* ── Issue (draft → sent) ───────────────────────────────────────────── */
//
// Renders the SOW PDF, uploads to R2, flips status from 'draft' to
// 'sent'. Idempotent — no-op if status is past 'draft'.

export interface SowIssueResult {
  success: boolean
  status?: 'sent'
  pdf_storage_path?: string
  error?: string
  already_issued?: boolean
}

export async function issueSow(
  sowId: string,
  options: { createdBy?: string } = {},
): Promise<SowIssueResult> {
  const { data: sowRow, error: fetchErr } = await supabaseAdmin
    .from('sow_documents')
    .select('*, prospect:prospects(business_name, owner_name, owner_email, business_email, owner_phone)')
    .eq('id', sowId)
    .maybeSingle()

  if (fetchErr) return { success: false, error: fetchErr.message }
  if (!sowRow) return { success: false, error: 'SOW not found' }

  if (sowRow.status !== 'draft') {
    return {
      success: true,
      status: sowRow.status as 'sent',
      pdf_storage_path: sowRow.pdf_storage_path ?? undefined,
      already_issued: true,
    }
  }

  const sow = sowRow as SowDocument & {
    prospect?: {
      business_name?: string | null
      owner_name?: string | null
      owner_email?: string | null
    } | null
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderSowPdf(sow, {
      business_name: sow.prospect?.business_name ?? 'Client',
      owner_name: null,
      owner_email: sow.prospect?.owner_email ?? null,
    })
  } catch (e) {
    return { success: false, error: `PDF render failed: ${e instanceof Error ? e.message : e}` }
  }

  const pdfKey = `sow/${sow.sow_number}.pdf`
  try {
    await uploadPrivate(pdfKey, pdfBuffer, 'application/pdf')
  } catch (e) {
    return { success: false, error: `R2 upload failed: ${e instanceof Error ? e.message : e}` }
  }

  const now = new Date().toISOString()
  const { error: updateErr } = await supabaseAdmin
    .from('sow_documents')
    .update({
      status: 'sent',
      sent_at: now,
      pdf_storage_path: pdfKey,
      pdf_rendered_at: now,
    })
    .eq('id', sowId)

  if (updateErr) {
    await deletePrivate(pdfKey).catch(() => {})
    return { success: false, error: updateErr.message }
  }

  if (sow.prospect_id) {
    try {
      await supabaseAdmin.from('activities').insert({
        prospect_id: sow.prospect_id,
        type: 'sow_issued',
        channel: 'system',
        direction: 'outbound',
        subject: `SOW ${sow.sow_number} issued`,
        body: sow.title ? `Title: ${sow.title}` : null,
        status: 'sent',
        created_by: options.createdBy ?? 'system',
      })
    } catch (e) {
      console.error('[issueSow] activity log failed:', e instanceof Error ? e.message : e)
    }
  }

  return { success: true, status: 'sent', pdf_storage_path: pdfKey }
}

