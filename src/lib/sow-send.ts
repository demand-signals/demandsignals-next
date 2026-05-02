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
import { sendSowEmail } from '@/lib/sow-email'
import { sendSms } from '@/lib/twilio-sms'
import { trackLink } from '@/lib/track-link'
import { getPrivateSignedUrl } from '@/lib/r2-storage'
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

  // Allow re-send for any SOW that's been sent (sent / viewed / accepted /
  // declined). Drafts can't be re-sent — they need to go through the
  // first-time send flow which renders+uploads the PDF.
  if (!['sent', 'viewed', 'accepted', 'declined'].includes(sow.status)) {
    return { success: false, error: `Cannot email an SOW in status ${sow.status}. Use the Send button to dispatch a draft for the first time.` }
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
    return { success: false, error: `Cannot SMS an SOW in status ${sow.status}. Use the Send button to dispatch a draft for the first time.` }
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
