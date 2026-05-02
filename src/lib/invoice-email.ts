// ── Invoice email composition + sender ──────────────────────────────
// Uses the unified @/lib/email helper (Resend + SMTP fallback).
// See spec §6.
//
// Kill switch: quote_config.email_delivery_enabled must be 'true'.

import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import type { Invoice } from './invoice-types'

export async function isEmailEnabled(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('quote_config')
    .select('value')
    .eq('key', 'email_delivery_enabled')
    .maybeSingle()
  // quote_config.value is JSONB — could be boolean true OR string "true"
  // depending on how it was inserted. Accept both.
  return data?.value === true || data?.value === 'true'
}

/**
 * Reminder-flavored variant of buildInvoiceEmail. Subject + body are
 * tuned to be a nudge, not a first-time issuance. Same magic link,
 * same UTM tagging.
 *
 * `tone`:
 *   - 'preemptive' = "due in N days" (friendly nudge before due)
 *   - 'past_due'   = "past due — please settle" (stronger ask, after due)
 *   - 'day_of'     = "due today"
 */
export function buildInvoiceReminderEmail(
  invoice: Invoice,
  prospect: { business_name?: string; owner_email?: string | null; owner_name?: string | null },
  reminderLabel: string,
  tone: 'preemptive' | 'past_due' | 'day_of',
  send_id?: string,
): { subject: string; html: string; text: string; publicUrl: string } {
  const baseUrl = `https://demandsignals.co/invoice/${invoice.invoice_number}/${invoice.public_uuid}`
  const trackedBase = send_id ? `${baseUrl}?e=${send_id}` : baseUrl
  const { trackLink } = require('@/lib/track-link') as typeof import('@/lib/track-link')
  const publicUrl = trackLink(trackedBase, {
    medium: 'email',
    campaign: tone === 'past_due' ? 'invoice_chase' : 'invoice_reminder',
    content: invoice.invoice_number,
    send_id,
  })
  const totalStr = `$${(invoice.total_due_cents / 100).toFixed(2)}`
  const firstName = prospect.owner_name?.split(' ')[0] ?? 'there'
  const businessName = prospect.business_name ?? 'your business'

  const subject =
    tone === 'past_due'
      ? `Past due: invoice ${invoice.invoice_number} (${totalStr})`
      : tone === 'day_of'
        ? `Due today: invoice ${invoice.invoice_number} (${totalStr})`
        : `Reminder: invoice ${invoice.invoice_number} due ${invoice.due_date ?? 'soon'} (${totalStr})`

  const intro =
    tone === 'past_due'
      ? `This is a friendly nudge — invoice ${invoice.invoice_number} for ${businessName} is past due.

Amount owed: ${totalStr}${invoice.due_date ? `\nWas due: ${invoice.due_date}` : ''}

You can settle online below — takes about 30 seconds.`
      : tone === 'day_of'
        ? `Just a heads-up that invoice ${invoice.invoice_number} for ${businessName} is due today.

Amount: ${totalStr}

Quickest way to settle:`
        : `Quick reminder — invoice ${invoice.invoice_number} for ${businessName} is coming up.

Amount: ${totalStr}${invoice.due_date ? `\nDue: ${invoice.due_date}` : ''}

You can pay online below whenever convenient:`

  const text = `Hi ${firstName},

${intro}

${publicUrl}

Questions or already paid? Just reply to this email or call (916) 542-2423.

— Hunter
Demand Signals
demandsignals.co
`

  const ctaColor = tone === 'past_due' ? '#F26419' : '#68c5ad'
  const ctaLabel = tone === 'past_due' ? 'Settle Invoice' : 'View & Pay Invoice'

  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#333;line-height:1.6;max-width:600px;margin:0 auto;padding:20px;">
  <p>Hi ${firstName},</p>
  <p>${intro.replace(/\n/g, '<br/>')}</p>
  <p style="text-align:center;margin:32px 0;">
    <a href="${publicUrl}" style="background:${ctaColor};color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
      ${ctaLabel}
    </a>
  </p>
  <p style="font-size:12px;color:#999;text-align:center;">${reminderLabel}</p>
  <p style="font-size:14px;color:#666;">Questions or already paid? Just reply or call (916) 542-2423.</p>
  <p style="font-size:14px;color:#666;">— Hunter<br/>Demand Signals<br/><a href="https://demandsignals.co">demandsignals.co</a></p>
</body></html>`

  return { subject, html, text, publicUrl }
}

export function buildInvoiceEmail(
  invoice: Invoice,
  prospect: { business_name?: string; owner_email?: string | null; owner_name?: string | null },
  send_id?: string,
): { subject: string; html: string; text: string; publicUrl: string } {
  const baseUrl = `https://demandsignals.co/invoice/${invoice.invoice_number}/${invoice.public_uuid}`
  // If a send_id is provided, embed it for tracking (?e=<send_id>).
  const trackedBase = send_id ? `${baseUrl}?e=${send_id}` : baseUrl
  // UTM-tag the URL so the destination's ClientTracker session_start
  // event can attribute the visit to email + this specific invoice.
  // Hunter directive 2026-04-29: UTM the links.
  const { trackLink } = require('@/lib/track-link') as typeof import('@/lib/track-link')
  const publicUrl = trackLink(trackedBase, {
    medium: 'email',
    campaign: 'invoice',
    content: invoice.invoice_number,
    send_id,
  })
  const isZero = invoice.total_due_cents === 0
  const totalStr = `$${(invoice.total_due_cents / 100).toFixed(2)}`
  const firstName = prospect.owner_name?.split(' ')[0] ?? 'there'

  const subject = isZero
    ? `Your complimentary research from Demand Signals — ${invoice.invoice_number}`
    : `Your Demand Signals Invoice — ${invoice.invoice_number}`

  const bodyIntro = isZero
    ? `This is your complimentary research invoice — no payment required.
We're excited to dig into ${prospect.business_name ?? 'your business'} and share what we find.`
    : `Here's your invoice from Demand Signals.

Total due: ${totalStr}${invoice.due_date ? `\nDue date: ${invoice.due_date}` : ''}

You can view the full invoice and pay online at:`

  const text = `Hi ${firstName},

${bodyIntro}

${publicUrl}

Questions? Just reply to this email or call us at (916) 542-2423.

— Hunter
Demand Signals
demandsignals.co
`

  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#333;line-height:1.6;max-width:600px;margin:0 auto;padding:20px;">
  <p>Hi ${firstName},</p>
  <p>${bodyIntro.replace(/\n/g, '<br/>')}</p>
  <p style="text-align:center;margin:32px 0;">
    <a href="${publicUrl}" style="background:#68c5ad;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
      ${isZero ? 'View Invoice' : 'View & Pay Invoice'}
    </a>
  </p>
  <p style="font-size:14px;color:#666;">Questions? Just reply to this email or call (916) 542-2423.</p>
  <p style="font-size:14px;color:#666;">— Hunter<br/>Demand Signals<br/><a href="https://demandsignals.co">demandsignals.co</a></p>
</body></html>`

  return { subject, html, text, publicUrl }
}

export async function sendInvoiceEmail(
  invoice: Invoice,
  to: string,
  prospect: { business_name?: string; owner_email?: string | null; owner_name?: string | null },
  pdfBuffer?: Buffer,
): Promise<{ success: boolean; message_id?: string; error?: string }> {
  if (!(await isEmailEnabled())) {
    return { success: false, error: 'Email delivery disabled in config' }
  }

  // Pre-generate send_id so we can embed ?e=<send_id> in the URL inside the body.
  const send_id = crypto.randomUUID()
  const { subject, html, text } = buildInvoiceEmail(invoice, prospect, send_id)

  const result = await sendEmail({
    to,
    kind: 'invoice',
    subject,
    html,
    text,
    send_id,
    link: {
      invoice_id: invoice.id,
      prospect_id: invoice.prospect_id ?? undefined,
    },
    attachments: pdfBuffer
      ? [
          {
            filename: `Invoice-${invoice.invoice_number}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ]
      : undefined,
  })

  return {
    success: result.success,
    message_id: result.message_id,
    error: result.error,
  }
}

/**
 * Reminder-flavored sender. Same wire format as sendInvoiceEmail, but
 * the body comes from buildInvoiceReminderEmail (different subject,
 * different intro). PDF attachment is intentionally optional and
 * defaulted off — reminders are a nudge, not a re-issuance, so we
 * don't blast the PDF every time. Magic link with payment is what
 * matters.
 */
export async function sendInvoiceReminderEmail(
  invoice: Invoice,
  to: string,
  prospect: { business_name?: string; owner_email?: string | null; owner_name?: string | null },
  reminderLabel: string,
  tone: 'preemptive' | 'past_due' | 'day_of',
): Promise<{ success: boolean; message_id?: string; error?: string }> {
  if (!(await isEmailEnabled())) {
    return { success: false, error: 'Email delivery disabled in config' }
  }

  const send_id = crypto.randomUUID()
  const { subject, html, text } = buildInvoiceReminderEmail(invoice, prospect, reminderLabel, tone, send_id)

  const result = await sendEmail({
    to,
    kind: 'invoice',
    subject,
    html,
    text,
    send_id,
    link: {
      invoice_id: invoice.id,
      prospect_id: invoice.prospect_id ?? undefined,
    },
  })

  return {
    success: result.success,
    message_id: result.message_id,
    error: result.error,
  }
}
