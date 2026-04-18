// ── Invoice email composition + sender ──────────────────────────────
// Uses Nodemailer + SMTP (Gmail app password in SMTP_PASS).
//
// Env vars:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
//   CONTACT_EMAIL — BCC recipient for audit trail
//
// Kill switch: quote_config.email_delivery_enabled must be 'true'.

import nodemailer from 'nodemailer'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Invoice } from './invoice-types'

let transporter: nodemailer.Transporter | null = null

function smtpTransport(): nodemailer.Transporter {
  if (transporter) return transporter
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT ?? '587')
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) {
    throw new Error('SMTP_HOST/SMTP_USER/SMTP_PASS not fully configured')
  }
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
  return transporter
}

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
): { subject: string; html: string; text: string; publicUrl: string } {
  const publicUrl = `https://demandsignals.co/invoice/${invoice.invoice_number}/${invoice.public_uuid}`
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

  const { subject, html, text } = buildInvoiceEmail(invoice, prospect)
  const from = process.env.SMTP_USER ?? 'DemandSignals@gmail.com'
  const bcc = process.env.CONTACT_EMAIL ?? 'DemandSignals@gmail.com'

  const attachments = pdfBuffer
    ? [
        {
          filename: `Invoice-${invoice.invoice_number}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ]
    : []

  try {
    const info = await smtpTransport().sendMail({
      from: `Demand Signals <${from}>`,
      to,
      bcc,
      replyTo: from,
      subject,
      html,
      text,
      attachments,
    })
    return { success: true, message_id: info.messageId }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
