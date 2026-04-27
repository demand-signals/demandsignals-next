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
  return data?.value === 'true'
}

export function buildInvoiceEmail(
  invoice: Invoice,
  prospect: { business_name?: string; owner_email?: string | null; owner_name?: string | null },
  send_id?: string,
): { subject: string; html: string; text: string; publicUrl: string } {
  const baseUrl = `https://demandsignals.co/invoice/${invoice.invoice_number}/${invoice.public_uuid}`
  // If a send_id is provided, embed it for tracking (?e=<send_id>).
  const publicUrl = send_id ? `${baseUrl}?e=${send_id}` : baseUrl
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
