// ── Credit memo email composition + sender ─────────────────────────
// Mirrors receipt-email.ts. Notifies the client when a credit memo
// (refund / goodwill / dispute / write-off) is issued against an invoice.
//
// Kill switch: quote_config.email_delivery_enabled must be 'true'.

import { sendEmail } from '@/lib/email'
import { isEmailEnabled } from '@/lib/invoice-email'
import type { CreditMemo, CreditMemoKind } from '@/lib/credit-memos'

const KIND_HEADLINE: Record<CreditMemoKind, string> = {
  refund:    'A refund has been issued',
  goodwill:  'A goodwill credit has been applied',
  dispute:   'A dispute credit has been recorded',
  write_off: 'A balance has been written off',
}

const KIND_BLURB: Record<CreditMemoKind, string> = {
  refund:    'The amount below has been refunded to your original payment method.',
  goodwill:  'The amount below has been credited to your account as a goodwill gesture. No money has been moved.',
  dispute:   'The amount below has been credited following a payment dispute.',
  write_off: 'The amount below has been written off and is no longer due. No money has been moved.',
}

const METHOD_LABEL: Record<string, string> = {
  stripe_refund: 'Stripe refund (back to original card)',
  check:         'Check',
  wire:          'Wire transfer',
  cash:          'Cash',
  tik:           'Trade-in-kind',
  zero_balance:  'Zero balance',
  other:         'Manual entry',
}

export function buildCreditMemoEmail(
  memo: CreditMemo,
  invoiceNumber: string,
  prospect: { business_name?: string; owner_name?: string | null },
): { subject: string; html: string; text: string } {
  const firstName = prospect.owner_name?.split(' ')[0] ?? 'there'
  const amountStr = `$${(memo.amount_cents / 100).toFixed(2)}`
  const headline = KIND_HEADLINE[memo.kind]
  const blurb = KIND_BLURB[memo.kind]
  const methodLine = memo.payment_method
    ? (METHOD_LABEL[memo.payment_method] ?? memo.payment_method)
    : '—'
  const refLine =
    memo.stripe_refund_id ?? memo.payment_reference ?? null

  const subject = `Credit memo ${memo.credit_memo_number} — ${amountStr} (${headline.toLowerCase()})`

  const text = `Hi ${firstName},

${headline}.

${blurb}

Credit memo:   ${memo.credit_memo_number}
Amount:        ${amountStr}
Applied to:    ${invoiceNumber}
Method:        ${methodLine}
${refLine ? `Reference:     ${refLine}\n` : ''}Issued:        ${new Date(memo.issued_at).toLocaleString('en-US')}

Reason: ${memo.reason}

Keep this email for your records. Questions? Just reply or call (916) 542-2423.

— Hunter
Demand Signals
demandsignals.co
`

  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#333;line-height:1.6;max-width:600px;margin:0 auto;padding:20px;">
  <p>Hi ${firstName},</p>
  <p style="font-size:16px;font-weight:600;color:#1d2330">${headline}.</p>
  <p>${blurb}</p>
  <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px;">
    <tbody>
      <tr><td style="padding:8px 0;color:#5d6780">Credit memo</td><td style="padding:8px 0;text-align:right;font-weight:600">${memo.credit_memo_number}</td></tr>
      <tr><td style="padding:8px 0;color:#5d6780">Amount</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#f28500">−${amountStr}</td></tr>
      <tr><td style="padding:8px 0;color:#5d6780">Applied to invoice</td><td style="padding:8px 0;text-align:right;font-weight:600">${invoiceNumber}</td></tr>
      <tr><td style="padding:8px 0;color:#5d6780">Method</td><td style="padding:8px 0;text-align:right">${methodLine}</td></tr>
      ${refLine ? `<tr><td style="padding:8px 0;color:#5d6780">Reference</td><td style="padding:8px 0;text-align:right;font-family:monospace;font-size:12px">${refLine}</td></tr>` : ''}
      <tr><td style="padding:8px 0;color:#5d6780">Issued</td><td style="padding:8px 0;text-align:right">${new Date(memo.issued_at).toLocaleString('en-US')}</td></tr>
    </tbody>
  </table>
  <p style="font-size:14px;background:#fff4ec;border-left:3px solid #f28500;padding:12px 16px;margin:0 0 20px;">
    <strong style="color:#f28500;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">Reason</strong><br/>
    ${memo.reason}
  </p>
  <p style="font-size:14px;color:#666;">Keep this email for your records. Questions? Just reply or call (916) 542-2423.</p>
  <p style="font-size:14px;color:#666;">— Hunter<br/>Demand Signals<br/><a href="https://demandsignals.co">demandsignals.co</a></p>
</body></html>`

  return { subject, html, text }
}

export async function sendCreditMemoEmail(
  memo: CreditMemo,
  invoiceNumber: string,
  to: string,
  prospect: { business_name?: string; owner_name?: string | null },
  pdfBuffer?: Buffer,
): Promise<{ success: boolean; message_id?: string; error?: string }> {
  if (!(await isEmailEnabled())) {
    return { success: false, error: 'Email delivery disabled in config' }
  }

  const send_id = crypto.randomUUID()
  const { subject, html, text } = buildCreditMemoEmail(memo, invoiceNumber, prospect)

  const result = await sendEmail({
    to,
    kind: 'credit_memo',
    subject,
    html,
    text,
    send_id,
    link: {
      credit_memo_id: memo.id,
      invoice_id: memo.invoice_id,
      prospect_id: memo.prospect_id,
    },
    attachments: pdfBuffer
      ? [
          {
            filename: `CreditMemo-${memo.credit_memo_number}.pdf`,
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
