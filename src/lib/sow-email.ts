// ── SOW email composition + sender ──────────────────────────────────
// Mirrors invoice-email.ts. Uses the unified @/lib/email helper.
//
// Kill switch: quote_config.email_delivery_enabled must be 'true'.

import { sendEmail } from '@/lib/email'
import { isEmailEnabled } from '@/lib/invoice-email'
import type { SowDocument } from './invoice-types'

export function buildSowEmail(
  sow: SowDocument,
  prospect: { business_name?: string; owner_email?: string | null; owner_name?: string | null },
  send_id?: string,
): { subject: string; html: string; text: string; publicUrl: string } {
  const baseUrl = `https://demandsignals.co/sow/${sow.sow_number}/${sow.public_uuid}`
  const trackedBase = send_id ? `${baseUrl}?e=${send_id}` : baseUrl
  // UTM-tag for email attribution (Hunter directive 2026-04-29).
  const { trackLink } = require('@/lib/track-link') as typeof import('@/lib/track-link')
  const publicUrl = trackLink(trackedBase, {
    medium: 'email',
    campaign: 'sow',
    content: sow.sow_number,
    send_id,
  })
  const firstName = prospect.owner_name?.split(' ')[0] ?? 'there'
  const totalCents = sow.pricing?.total_cents ?? 0
  const totalStr = `$${(totalCents / 100).toFixed(2)}`
  const depositCents = sow.pricing?.deposit_cents ?? 0
  const depositStr = depositCents > 0 ? `$${(depositCents / 100).toFixed(2)}` : null

  const subject = `Your Statement of Work — ${sow.title}`

  const intro = `Here's the Statement of Work for ${sow.title}.

Project total: ${totalStr}${depositStr ? `\nDeposit on acceptance: ${depositStr}` : ''}

Review the full scope and accept it (you can sign and pay the deposit in one step):`

  const text = `Hi ${firstName},

${intro}

${publicUrl}

Questions? Just reply to this email or call (916) 542-2423.

— Hunter
Demand Signals
demandsignals.co
`

  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#333;line-height:1.6;max-width:600px;margin:0 auto;padding:20px;">
  <p>Hi ${firstName},</p>
  <p>${intro.replace(/\n/g, '<br/>')}</p>
  <p style="text-align:center;margin:32px 0;">
    <a href="${publicUrl}" style="background:#68c5ad;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
      View &amp; Accept SOW
    </a>
  </p>
  <p style="font-size:14px;color:#666;">Questions? Just reply to this email or call (916) 542-2423.</p>
  <p style="font-size:14px;color:#666;">— Hunter<br/>Demand Signals<br/><a href="https://demandsignals.co">demandsignals.co</a></p>
</body></html>`

  return { subject, html, text, publicUrl }
}

export async function sendSowEmail(
  sow: SowDocument,
  to: string,
  prospect: { business_name?: string; owner_email?: string | null; owner_name?: string | null },
  pdfBuffer?: Buffer,
): Promise<{ success: boolean; message_id?: string; error?: string }> {
  if (!(await isEmailEnabled())) {
    return { success: false, error: 'Email delivery disabled in config' }
  }

  const send_id = crypto.randomUUID()
  const { subject, html, text } = buildSowEmail(sow, prospect, send_id)

  const result = await sendEmail({
    to,
    kind: 'sow',
    subject,
    html,
    text,
    send_id,
    link: {
      sow_document_id: sow.id,
      prospect_id: sow.prospect_id ?? undefined,
    },
    attachments: pdfBuffer
      ? [
          {
            filename: `SOW-${sow.sow_number}.pdf`,
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
