// ── Receipt email composition + sender ──────────────────────────────
// Mirrors invoice-email.ts and sow-email.ts. Uses the unified
// @/lib/email helper.
//
// Kill switch: quote_config.email_delivery_enabled must be 'true'.

import { sendEmail } from '@/lib/email'
import { isEmailEnabled } from '@/lib/invoice-email'

export interface ReceiptEmailRow {
  id: string
  receipt_number: string
  invoice_id: string
  amount_cents: number
  currency: string
  payment_method: string
  payment_reference: string | null
  paid_at: string
  prospect_id: string
}

export function buildReceiptEmail(
  receipt: ReceiptEmailRow,
  invoiceNumber: string,
  prospect: { business_name?: string; owner_name?: string | null },
  send_id?: string,
): { subject: string; html: string; text: string } {
  const firstName = prospect.owner_name?.split(' ')[0] ?? 'there'
  const amountStr = `$${(receipt.amount_cents / 100).toFixed(2)}`
  const methodLabel: Record<string, string> = {
    stripe: 'Credit/debit card (via Stripe)',
    check: 'Check',
    wire: 'Wire transfer',
    cash: 'Cash',
    other: 'Manual entry',
    trade: 'Trade-in-kind',
    tik: 'Trade-in-kind',
    zero_balance: 'Zero balance',
  }
  const method = methodLabel[receipt.payment_method] ?? receipt.payment_method

  const subject = `Receipt ${receipt.receipt_number} — payment received (${amountStr})`

  const text = `Hi ${firstName},

Thanks — we received your payment of ${amountStr} for invoice ${invoiceNumber}.

Receipt number: ${receipt.receipt_number}
Payment method: ${method}
${receipt.payment_reference ? `Reference: ${receipt.payment_reference}\n` : ''}Paid: ${new Date(receipt.paid_at).toLocaleString('en-US')}

Keep this email for your records.

— Hunter
Demand Signals
demandsignals.co
`

  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#333;line-height:1.6;max-width:600px;margin:0 auto;padding:20px;">
  <p>Hi ${firstName},</p>
  <p>Thanks — we received your payment of <strong>${amountStr}</strong> for invoice <strong>${invoiceNumber}</strong>.</p>
  <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px;">
    <tbody>
      <tr><td style="padding:8px 0;color:#5d6780">Receipt number</td><td style="padding:8px 0;text-align:right;font-weight:600">${receipt.receipt_number}</td></tr>
      <tr><td style="padding:8px 0;color:#5d6780">Amount</td><td style="padding:8px 0;text-align:right;font-weight:600">${amountStr}</td></tr>
      <tr><td style="padding:8px 0;color:#5d6780">Payment method</td><td style="padding:8px 0;text-align:right;font-weight:600">${method}</td></tr>
      ${receipt.payment_reference ? `<tr><td style="padding:8px 0;color:#5d6780">Reference</td><td style="padding:8px 0;text-align:right;font-family:monospace;font-size:12px">${receipt.payment_reference}</td></tr>` : ''}
      <tr><td style="padding:8px 0;color:#5d6780">Paid at</td><td style="padding:8px 0;text-align:right">${new Date(receipt.paid_at).toLocaleString('en-US')}</td></tr>
    </tbody>
  </table>
  <p style="font-size:14px;color:#666;">Keep this email for your records. Questions? Just reply or call (916) 542-2423.</p>
  <p style="font-size:14px;color:#666;">— Hunter<br/>Demand Signals<br/><a href="https://demandsignals.co">demandsignals.co</a></p>
</body></html>`

  return { subject, html, text }
}

export async function sendReceiptEmail(
  receipt: ReceiptEmailRow,
  invoiceNumber: string,
  to: string,
  prospect: { business_name?: string; owner_name?: string | null },
  // PDF attachment is optional so legacy callers don't break, but in
  // practice the Stripe webhook path now always passes one. Without
  // a PDF the email looks like just an inline summary — clients have
  // nothing to file. Hunter's directive 2026-04-29: receipt email
  // MUST attach the rendered PDF for clients to keep on file.
  pdfBuffer?: Buffer,
): Promise<{ success: boolean; message_id?: string; error?: string }> {
  if (!(await isEmailEnabled())) {
    return { success: false, error: 'Email delivery disabled in config' }
  }

  const send_id = crypto.randomUUID()
  const { subject, html, text } = buildReceiptEmail(receipt, invoiceNumber, prospect, send_id)

  const result = await sendEmail({
    to,
    kind: 'receipt',
    subject,
    html,
    text,
    send_id,
    link: {
      receipt_id: receipt.id,
      invoice_id: receipt.invoice_id,
      prospect_id: receipt.prospect_id,
    },
    attachments: pdfBuffer
      ? [
          {
            filename: `Receipt-${receipt.receipt_number}.pdf`,
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
