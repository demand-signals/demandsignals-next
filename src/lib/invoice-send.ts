// ── invoice-send.ts ─────────────────────────────────────────────────
// Shared dispatch for invoice email + SMS. Used by:
//   - /api/admin/invoices/[id]/send-email (synchronous admin send)
//   - /api/admin/invoices/[id]/send-sms (synchronous admin send)
//   - /api/cron/scheduled-sends (deferred dispatch from invoice_scheduled_sends)
//
// Why a shared lib:
//   1. Cron path can't internal-fetch /send-email — that route is admin-gated
//      via requireAdmin(). Server-to-server doesn't have a session cookie.
//      Calling the dispatch function directly bypasses the auth dance entirely.
//   2. Activity log writes (Part D) live in one place — invoice sends always
//      surface on the prospect record, regardless of caller.
//   3. Resend-only policy is enforced once. No silent SMTP fallback. If
//      RESEND_API_KEY is missing, dispatch fails loudly, the activity log
//      shows FAILED, and the cron row goes to status='failed'.
//
// Resend policy: outbound is Resend, never SMTP, per CLAUDE.md feedback.
// dispatchInvoiceEmail() asserts RESEND_API_KEY is set. The shared
// sendEmail() helper at @/lib/email retains its SMTP fallback for other
// callers (booking, contact, subscribe) — that's a wider cleanup.

import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendInvoiceEmail } from '@/lib/invoice-email'
import { sendSms } from '@/lib/twilio-sms'
import { trackLink } from '@/lib/track-link'
import { getPrivateSignedUrl } from '@/lib/r2-storage'
import type { Invoice } from '@/lib/invoice-types'

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

interface InvoiceWithProspect extends Invoice {
  prospect?: {
    business_name?: string | null
    owner_name?: string | null
    owner_email?: string | null
    business_email?: string | null
    owner_phone?: string | null
    business_phone?: string | null
  } | null
  bill_to?: { email?: string | null } | null
}

/* ── Activity log helper ────────────────────────────────────────────── */

async function logInvoiceActivity(args: {
  invoice: InvoiceWithProspect
  channel: 'email' | 'sms'
  recipient: string
  success: boolean
  errorMessage?: string
  scheduledFor?: string
  createdBy?: string
}) {
  if (!args.invoice.prospect_id) return
  const { invoice, channel, recipient, success, errorMessage, scheduledFor, createdBy } = args

  // Type 'email' | 'sms' lights up the right icon in ActivityTimeline.
  // For failures we still write the channel type — the status='failed'
  // and FAILED in the subject communicate the outcome.
  const subject = success
    ? `Invoice ${invoice.invoice_number} sent via ${channel}`
    : `Invoice ${invoice.invoice_number} send FAILED via ${channel}`

  const bodyLines: string[] = [`Recipient: ${recipient}`]
  if (scheduledFor) {
    bodyLines.unshift(`Scheduled for ${scheduledFor} → fired ${new Date().toISOString()}`)
  }
  if (errorMessage) bodyLines.push(`Error: ${errorMessage}`)

  try {
    await supabaseAdmin.from('activities').insert({
      prospect_id: invoice.prospect_id,
      type: channel,
      channel,
      direction: 'outbound',
      subject,
      body: bodyLines.join('\n'),
      status: success ? 'sent' : 'failed',
      created_by: createdBy ?? 'system',
    })
  } catch (e) {
    console.error('[invoice-send] activity log failed:', e instanceof Error ? e.message : e)
  }
}

/** Logs a "scheduled" activity row when an admin schedules a future send. */
export async function logInvoiceScheduledActivity(args: {
  invoice: { id: string; invoice_number: string; prospect_id?: string | null }
  channel: 'email' | 'sms' | 'both'
  sendAt: string
  recipient?: string | null
  createdBy?: string
}) {
  if (!args.invoice.prospect_id) return
  try {
    await supabaseAdmin.from('activities').insert({
      prospect_id: args.invoice.prospect_id,
      type: 'note',
      channel: args.channel === 'both' ? 'email' : args.channel,
      direction: 'outbound',
      subject: `Invoice ${args.invoice.invoice_number} scheduled to send via ${args.channel} at ${args.sendAt}`,
      body: args.recipient ? `Recipient: ${args.recipient}` : null,
      status: 'scheduled',
      created_by: args.createdBy ?? 'system',
    })
  } catch (e) {
    console.error('[invoice-send] schedule activity log failed:', e instanceof Error ? e.message : e)
  }
}

/** Logs a "scheduled send cancelled" activity row. */
export async function logInvoiceScheduleCancelledActivity(args: {
  invoice: { invoice_number: string; prospect_id?: string | null }
  channel: 'email' | 'sms' | 'both'
  sendAt: string
  createdBy?: string
}) {
  if (!args.invoice.prospect_id) return
  try {
    await supabaseAdmin.from('activities').insert({
      prospect_id: args.invoice.prospect_id,
      type: 'note',
      channel: args.channel === 'both' ? 'email' : args.channel,
      direction: 'outbound',
      subject: `Invoice ${args.invoice.invoice_number} scheduled send cancelled (was ${args.sendAt})`,
      body: null,
      status: 'cancelled',
      created_by: args.createdBy ?? 'system',
    })
  } catch (e) {
    console.error('[invoice-send] schedule-cancel activity log failed:', e instanceof Error ? e.message : e)
  }
}

/* ── Email dispatch ─────────────────────────────────────────────────── */

export async function dispatchInvoiceEmail(
  invoiceId: string,
  options: DispatchEmailOptions = {},
): Promise<DispatchResult> {
  // Resend-only policy. If misconfigured, fail loudly — do NOT fall back to SMTP.
  if (!process.env.RESEND_API_KEY) {
    return {
      success: false,
      error: 'RESEND_API_KEY not configured — refusing to fall back to SMTP per policy',
    }
  }

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select('*, prospect:prospects(business_name, owner_name, owner_email, business_email)')
    .eq('id', invoiceId)
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  if (!invoice) return { success: false, error: 'Invoice not found' }
  if (!['sent', 'viewed', 'paid'].includes(invoice.status)) {
    return { success: false, error: `Cannot email an invoice in status ${invoice.status}` }
  }

  const inv = invoice as InvoiceWithProspect
  const billToEmail = (inv.bill_to as { email?: string | null } | null)?.email ?? null
  const email =
    options.overrideEmail ??
    billToEmail ??
    inv.prospect?.owner_email ??
    inv.prospect?.business_email ??
    null
  if (!email) {
    return {
      success: false,
      error:
        'No email on invoice bill_to, prospect.owner_email, or prospect.business_email',
    }
  }

  // Fetch PDF from R2 for attachment (best-effort).
  let pdfBuffer: Buffer | undefined
  if (inv.pdf_storage_path) {
    try {
      const signed = await getPrivateSignedUrl(inv.pdf_storage_path, 60)
      const res = await fetch(signed)
      if (res.ok) {
        const ab = await res.arrayBuffer()
        pdfBuffer = Buffer.from(ab)
      }
    } catch {
      /* fall through — email still carries the link */
    }
  }

  const result = await sendInvoiceEmail(
    inv,
    email,
    {
      business_name: inv.prospect?.business_name ?? undefined,
      owner_email: inv.prospect?.owner_email ?? undefined,
      owner_name: inv.prospect?.owner_name ?? undefined,
    },
    pdfBuffer,
  )

  // Detail logs — invoice_delivery_log + invoice_email_log (per-send diagnostics).
  await supabaseAdmin.from('invoice_delivery_log').insert({
    invoice_id: invoiceId,
    channel: 'email',
    recipient: email,
    success: result.success,
    provider_message_id: result.message_id ?? null,
    error_message: result.error ?? null,
  })
  await supabaseAdmin.from('invoice_email_log').insert({
    invoice_id: invoiceId,
    sent_to: email,
    success: result.success,
    smtp_message_id: result.message_id ?? null,
    error_message: result.error ?? null,
  })

  // Activity timeline row — prospect-level rollup.
  await logInvoiceActivity({
    invoice: inv,
    channel: 'email',
    recipient: email,
    success: result.success,
    errorMessage: result.error,
    scheduledFor: options.scheduledFor,
    createdBy: options.createdBy,
  })

  if (result.success) {
    await supabaseAdmin
      .from('invoices')
      .update({
        sent_via_channel: inv.sent_via_channel === 'sms' ? 'both' : 'email',
        sent_via_email_to: email,
      })
      .eq('id', invoiceId)
  }

  return {
    success: result.success,
    recipient: email,
    message_id: result.message_id,
    error: result.error,
  }
}

/* ── SMS dispatch ───────────────────────────────────────────────────── */

export async function dispatchInvoiceSms(
  invoiceId: string,
  options: DispatchSmsOptions = {},
): Promise<DispatchResult> {
  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select('*, prospect:prospects(business_name, owner_phone, business_phone)')
    .eq('id', invoiceId)
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  if (!invoice) return { success: false, error: 'Invoice not found' }
  if (!['sent', 'viewed', 'paid'].includes(invoice.status)) {
    return { success: false, error: `Cannot SMS an invoice in status ${invoice.status}` }
  }

  const inv = invoice as InvoiceWithProspect
  const phone =
    options.overridePhone ??
    inv.prospect?.owner_phone ??
    inv.prospect?.business_phone ??
    null
  if (!phone) {
    return {
      success: false,
      error: 'No phone on prospect.owner_phone or prospect.business_phone',
    }
  }

  const businessName = inv.prospect?.business_name ?? 'your business'
  const url = trackLink(
    `https://demandsignals.co/invoice/${inv.invoice_number}/${inv.public_uuid}`,
    { medium: 'sms', campaign: 'invoice', content: inv.invoice_number },
  )
  const totalStr =
    inv.total_due_cents === 0
      ? 'complimentary'
      : `$${(inv.total_due_cents / 100).toFixed(2)}`
  const message = `${businessName}: Your Demand Signals invoice ${inv.invoice_number} (${totalStr}) — ${url}`

  const result = await sendSms(phone, message)

  await supabaseAdmin.from('invoice_delivery_log').insert({
    invoice_id: invoiceId,
    channel: 'sms',
    recipient: phone,
    success: result.success,
    provider_message_id: result.message_id ?? null,
    error_message: result.error ?? null,
  })

  await logInvoiceActivity({
    invoice: inv,
    channel: 'sms',
    recipient: phone,
    success: result.success,
    errorMessage: result.error,
    scheduledFor: options.scheduledFor,
    createdBy: options.createdBy,
  })

  if (result.success) {
    await supabaseAdmin
      .from('invoices')
      .update({ sent_via_channel: inv.sent_via_channel === 'email' ? 'both' : 'sms' })
      .eq('id', invoiceId)
  }

  return {
    success: result.success,
    recipient: phone,
    message_id: result.message_id,
    error: result.error,
  }
}
