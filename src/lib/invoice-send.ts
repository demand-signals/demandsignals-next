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
import { sendInvoiceEmail, sendInvoiceReminderEmail, buildInvoiceEmail } from '@/lib/invoice-email'
import { sendSms } from '@/lib/twilio-sms'
import { trackLink } from '@/lib/track-link'
import { getPrivateSignedUrl, uploadPrivate, deletePrivate } from '@/lib/r2-storage'
import { renderInvoicePdf } from '@/lib/pdf/invoice'
import { getInvoicePaymentSummary, getInvoiceProjectMeta } from '@/lib/invoice-context'
import type { Invoice, InvoiceWithLineItems } from '@/lib/invoice-types'

interface DispatchEmailOptions {
  /** Override recipient (admin can re-route). */
  overrideEmail?: string
  /** Schedule UUID if dispatched from cron — surfaces in activity body. */
  scheduledSendId?: string
  /** Original schedule time if dispatched from cron — for "Scheduled X → fired Y". */
  scheduledFor?: string
  /** Who triggered this — 'system' for cron, admin user id otherwise. */
  createdBy?: string
  /**
   * If set, dispatch uses the reminder-flavored email template instead
   * of the standard issuance template. Only the cron path passes this
   * (when kind='reminder' on the queue row).
   */
  reminder?: {
    label: string
    tone: 'preemptive' | 'past_due' | 'day_of'
  }
}

interface DispatchSmsOptions {
  overridePhone?: string
  scheduledSendId?: string
  scheduledFor?: string
  createdBy?: string
  reminder?: {
    label: string
    tone: 'preemptive' | 'past_due' | 'day_of'
  }
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

  const prospectArg = {
    business_name: inv.prospect?.business_name ?? undefined,
    owner_email: inv.prospect?.owner_email ?? undefined,
    owner_name: inv.prospect?.owner_name ?? undefined,
  }
  // Reminder dispatches use the reminder-flavored template (no PDF
  // attachment by default — reminders are nudges, not re-issuances).
  // Standard sends carry the PDF for the client's records.
  const result = options.reminder
    ? await sendInvoiceReminderEmail(inv, email, prospectArg, options.reminder.label, options.reminder.tone)
    : await sendInvoiceEmail(inv, email, prospectArg, pdfBuffer)

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
    {
      medium: 'sms',
      campaign: options.reminder?.tone === 'past_due'
        ? 'invoice_chase'
        : options.reminder
          ? 'invoice_reminder'
          : 'invoice',
      content: inv.invoice_number,
    },
  )
  const totalStr =
    inv.total_due_cents === 0
      ? 'complimentary'
      : `$${(inv.total_due_cents / 100).toFixed(2)}`
  const message = options.reminder
    ? options.reminder.tone === 'past_due'
      ? `${businessName}: Past due — invoice ${inv.invoice_number} (${totalStr}). Settle: ${url}`
      : options.reminder.tone === 'day_of'
        ? `${businessName}: Invoice ${inv.invoice_number} (${totalStr}) is due today. Pay: ${url}`
        : `${businessName}: Reminder — invoice ${inv.invoice_number} (${totalStr})${inv.due_date ? ` due ${inv.due_date}` : ''}. ${url}`
    : `${businessName}: Your Demand Signals invoice ${inv.invoice_number} (${totalStr}) — ${url}`

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

/* ── Preview helpers (no-send) ──────────────────────────────────────── */
//
// Resolve recipient + build the subject/body/URL that WOULD fire if
// dispatch* were called. Used by the admin preview-before-send modal
// so what's previewed is the exact bytes that go out on confirm — no
// drift between preview and actual.

export interface InvoiceEmailPreview {
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

export interface InvoiceSmsPreview {
  ok: true
  channel: 'sms'
  recipient: string
  message: string
  public_url: string
}

export interface InvoicePreviewError {
  ok: false
  error: string
}

export async function previewInvoiceEmail(
  invoiceId: string,
  overrideEmail?: string,
): Promise<InvoiceEmailPreview | InvoicePreviewError> {
  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select('*, prospect:prospects(business_name, owner_name, owner_email, business_email)')
    .eq('id', invoiceId)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!invoice) return { ok: false, error: 'Invoice not found' }
  // Drafts are previewable — confirming the preview will issue the
  // invoice (draft→sent) THEN dispatch in the same server hop.
  if (!['draft', 'sent', 'viewed', 'paid'].includes(invoice.status)) {
    return { ok: false, error: `Cannot preview email for an invoice in status ${invoice.status}` }
  }

  const inv = invoice as InvoiceWithProspect
  const billToEmail = (inv.bill_to as { email?: string | null } | null)?.email ?? null
  const recipient =
    overrideEmail ??
    billToEmail ??
    inv.prospect?.owner_email ??
    inv.prospect?.business_email ??
    null
  if (!recipient) {
    return {
      ok: false,
      error: 'No email on invoice bill_to, prospect.owner_email, or prospect.business_email',
    }
  }

  const { subject, html, text, publicUrl } = buildInvoiceEmail(
    inv,
    {
      business_name: inv.prospect?.business_name ?? undefined,
      owner_email: inv.prospect?.owner_email ?? undefined,
      owner_name: inv.prospect?.owner_name ?? undefined,
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
    has_pdf_attachment: !!inv.pdf_storage_path,
    pdf_filename: inv.pdf_storage_path
      ? `Invoice-${inv.invoice_number}.pdf`
      : null,
  }
}

export async function previewInvoiceSms(
  invoiceId: string,
  overridePhone?: string,
): Promise<InvoiceSmsPreview | InvoicePreviewError> {
  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select('*, prospect:prospects(business_name, owner_phone, business_phone)')
    .eq('id', invoiceId)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!invoice) return { ok: false, error: 'Invoice not found' }
  // Drafts are previewable — confirming the preview will issue.
  if (!['draft', 'sent', 'viewed', 'paid'].includes(invoice.status)) {
    return { ok: false, error: `Cannot preview SMS for an invoice in status ${invoice.status}` }
  }

  const inv = invoice as InvoiceWithProspect
  const recipient =
    overridePhone ??
    inv.prospect?.owner_phone ??
    inv.prospect?.business_phone ??
    null
  if (!recipient) {
    return {
      ok: false,
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
// Renders the PDF, uploads to R2, flips status from 'draft' to 'sent'
// (or 'paid' for $0 invoices). Idempotent: returns success without
// re-rendering if status is already past 'draft'.
//
// Used by:
//   - /api/admin/invoices/[id]/send (one-click issuance + auto-fire)
//   - /api/admin/invoices/[id]/send-email (auto-issue if status='draft')
//   - /api/admin/invoices/[id]/send-sms   (auto-issue if status='draft')
//
// Why this lives here and not in /send/route.ts: the email/SMS buttons
// on a draft invoice need to issue-then-dispatch in one server hop.
// Moving the issuance logic into a shared helper means /send-email and
// /send-sms can call issueInvoice() directly without an internal HTTP
// roundtrip (which would fail the requireAdmin CSRF guard — same
// failure mode as the resend regression in commit 0cc9cf1).

export interface IssueResult {
  success: boolean
  status?: 'sent' | 'paid'
  is_zero?: boolean
  pdf_storage_path?: string
  error?: string
  /** True if the invoice was already past draft when called — no work done. */
  already_issued?: boolean
}

export async function issueInvoice(
  invoiceId: string,
  options: { createdBy?: string } = {},
): Promise<IssueResult> {
  const { data: invoice, error: fetchErr } = await supabaseAdmin
    .from('invoices')
    .select('*, prospect:prospects(business_name, owner_name, owner_email, business_email, owner_phone, business_phone, address, city, state, zip)')
    .eq('id', invoiceId)
    .maybeSingle()

  if (fetchErr) return { success: false, error: fetchErr.message }
  if (!invoice) return { success: false, error: 'Invoice not found' }

  // Idempotent: if it's already issued, just succeed.
  if (invoice.status !== 'draft') {
    return {
      success: true,
      status: invoice.status as 'sent' | 'paid',
      is_zero: invoice.total_due_cents === 0,
      pdf_storage_path: invoice.pdf_storage_path ?? undefined,
      already_issued: true,
    }
  }

  const { data: lineItems } = await supabaseAdmin
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: true })

  if (!lineItems || lineItems.length === 0) {
    return { success: false, error: 'Invoice has no line items' }
  }

  const renderInput: InvoiceWithLineItems = {
    ...invoice,
    line_items: lineItems,
    bill_to: {
      business_name: invoice.prospect?.business_name ?? 'Client',
      contact_name: invoice.prospect?.owner_name ?? null,
      email: invoice.prospect?.owner_email ?? null,
    },
  }

  const [paymentSummary, project] = await Promise.all([
    getInvoicePaymentSummary(invoice.id, invoice.total_due_cents),
    getInvoiceProjectMeta(invoice.id),
  ])

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderInvoicePdf(renderInput, {
      prospect: {
        business_name: invoice.prospect?.business_name ?? 'Client',
        owner_name: invoice.prospect?.owner_name ?? null,
        owner_email: invoice.prospect?.owner_email ?? null,
        address: invoice.prospect?.address ?? null,
        city: invoice.prospect?.city ?? null,
        state: invoice.prospect?.state ?? null,
        zip: invoice.prospect?.zip ?? null,
      },
      project,
      paymentSummary,
    })
  } catch (e) {
    return { success: false, error: `PDF render failed: ${e instanceof Error ? e.message : e}` }
  }

  const pdfKey = `invoices/${invoice.invoice_number}_v${invoice.pdf_version}.pdf`
  try {
    await uploadPrivate(pdfKey, pdfBuffer, 'application/pdf')
  } catch (e) {
    return { success: false, error: `R2 upload failed: ${e instanceof Error ? e.message : e}` }
  }

  const isZero = invoice.total_due_cents === 0
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {
    status: isZero ? 'paid' : 'sent',
    sent_at: now,
    sent_via_channel: 'manual',
    sent_via_email_to: invoice.prospect?.owner_email ?? null,
    pdf_storage_path: pdfKey,
    pdf_rendered_at: now,
  }
  if (isZero) {
    updates.paid_at = now
    updates.paid_method = 'zero_balance'
    updates.paid_note = 'Complimentary — no payment required'
  }

  const { error: updateErr } = await supabaseAdmin
    .from('invoices')
    .update(updates)
    .eq('id', invoiceId)

  if (updateErr) {
    await deletePrivate(pdfKey).catch(() => {})
    return { success: false, error: updateErr.message }
  }

  await supabaseAdmin.from('invoice_delivery_log').insert({
    invoice_id: invoiceId,
    channel: 'manual',
    recipient: invoice.prospect?.owner_email ?? invoice.prospect?.owner_phone ?? 'admin',
    success: true,
  })

  // Activity-log: mark issuance on the prospect's timeline (CLAUDE.md §D).
  // Best-effort — failures don't block the issuance itself.
  if (invoice.prospect_id) {
    try {
      await supabaseAdmin.from('activities').insert({
        prospect_id: invoice.prospect_id,
        type: 'invoice_issued',
        channel: 'system',
        direction: 'outbound',
        subject: `Invoice ${invoice.invoice_number} issued`,
        body: isZero
          ? `Complimentary invoice — no payment required.`
          : `Total: $${(invoice.total_due_cents / 100).toFixed(2)}${invoice.due_date ? ` · Due ${invoice.due_date}` : ''}`,
        status: 'sent',
        created_by: options.createdBy ?? 'system',
      })
    } catch (e) {
      console.error('[issueInvoice] activity log failed:', e instanceof Error ? e.message : e)
    }
  }

  // Admin alert on issuance — fan-out to ADMIN_TEAM_PHONES. Best-effort.
  if (!isZero) {
    try {
      const { notifyAdminsBySms } = await import('@/lib/admin-sms')
      const businessName = invoice.prospect?.business_name ?? 'a client'
      const amountStr = `$${(invoice.total_due_cents / 100).toFixed(2)}`
      await notifyAdminsBySms({
        source: 'invoice_send',
        body: `DSIG: invoice ${invoice.invoice_number} (${amountStr}) issued to ${businessName}.`,
      })
    } catch (e) {
      console.error('[issueInvoice] admin SMS pipeline threw:', e instanceof Error ? e.message : e)
    }
  }

  return {
    success: true,
    status: isZero ? 'paid' : 'sent',
    is_zero: isZero,
    pdf_storage_path: pdfKey,
  }
}
