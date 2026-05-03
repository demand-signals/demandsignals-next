// ── Receipt email composition + sender ──────────────────────────────
// Mirrors invoice-email.ts and sow-email.ts. Uses the unified
// @/lib/email helper.
//
// Kill switch: quote_config.email_delivery_enabled must be 'true'.
//
// TIK awareness: when payment_method='tik' (or legacy 'trade'), the
// copy switches from "payment received" to "trade payment recorded"
// and surfaces the remaining TIK balance the client owes us. The
// caller passes the TIK ledger context via `tikLedger`.

import { sendEmail } from '@/lib/email'
import { isEmailEnabled } from '@/lib/invoice-email'

export interface ReceiptEmailRow {
  id: string
  receipt_number: string
  /** Null for TIK payments not tied to a specific invoice. */
  invoice_id: string | null
  amount_cents: number
  currency: string
  payment_method: string
  payment_reference: string | null
  paid_at: string
  prospect_id: string
  notes?: string | null
}

export interface ReceiptTikLedgerContext {
  description: string
  original_amount_cents: number
  remaining_cents: number
}

export function buildReceiptEmail(
  receipt: ReceiptEmailRow,
  /** Invoice number — pass null for TIK receipts not tied to an invoice. */
  invoiceNumber: string | null,
  prospect: { business_name?: string; owner_name?: string | null },
  /** TIK ledger snapshot — required for trade-in-kind receipts. */
  tikLedger?: ReceiptTikLedgerContext | null,
): { subject: string; html: string; text: string } {
  const firstName = prospect.owner_name?.split(' ')[0] ?? 'there'
  const amountStr = `$${(receipt.amount_cents / 100).toFixed(2)}`
  const isTik = receipt.payment_method === 'tik' || receipt.payment_method === 'trade'
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

  if (isTik) {
    // ── TIK receipt template ─────────────────────────────────────────
    const subject = `Receipt ${receipt.receipt_number} — trade payment recorded (${amountStr})`
    const remainingStr = tikLedger
      ? `$${(tikLedger.remaining_cents / 100).toFixed(2)}`
      : null
    const remainingLine = tikLedger
      ? tikLedger.remaining_cents === 0
        ? 'Your trade-in-kind balance is now PAID IN FULL — thank you!'
        : `Your remaining trade-in-kind balance: ${remainingStr}.`
      : ''

    const text = `Hi ${firstName},

Thanks — we've recorded your trade payment of ${amountStr} (in-kind value).

${receipt.notes ? `Services delivered: ${receipt.notes}\n\n` : ''}Receipt number: ${receipt.receipt_number}
Payment type: ${method}
Recorded: ${new Date(receipt.paid_at).toLocaleString('en-US')}
${tikLedger ? `\nTrade-in-Kind ledger:\n  Original balance: $${(tikLedger.original_amount_cents / 100).toFixed(2)}\n  This payment:     ${amountStr}\n  Remaining:        ${remainingStr}\n` : ''}
${remainingLine}

Keep this email for your records.

— Hunter
Demand Signals
demandsignals.co
`

    const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#333;line-height:1.6;max-width:600px;margin:0 auto;padding:20px;">
  <p>Hi ${firstName},</p>
  <p>Thanks — we've recorded your <strong>trade payment of ${amountStr}</strong> (in-kind value).</p>
  ${receipt.notes ? `<p style="background:#f4f6f9;border-left:3px solid #68c5ad;padding:10px 14px;margin:16px 0;font-size:14px"><strong style="color:#68c5ad;font-size:11px;letter-spacing:0.08em;text-transform:uppercase">Services delivered</strong><br/>${receipt.notes}</p>` : ''}
  <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
    <tbody>
      <tr><td style="padding:8px 0;color:#5d6780">Receipt number</td><td style="padding:8px 0;text-align:right;font-weight:600">${receipt.receipt_number}</td></tr>
      <tr><td style="padding:8px 0;color:#5d6780">Payment type</td><td style="padding:8px 0;text-align:right;font-weight:600">${method}</td></tr>
      <tr><td style="padding:8px 0;color:#5d6780">Recorded</td><td style="padding:8px 0;text-align:right">${new Date(receipt.paid_at).toLocaleString('en-US')}</td></tr>
    </tbody>
  </table>
  ${tikLedger ? `
  <div style="background:#f4f6f9;border-radius:8px;padding:16px 18px;margin:24px 0">
    <p style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;color:#5d6780;margin:0 0 10px">Trade-in-Kind balance</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tbody>
        <tr><td style="padding:4px 0;color:#5d6780">Original balance</td><td style="padding:4px 0;text-align:right;font-variant-numeric:tabular-nums">$${(tikLedger.original_amount_cents / 100).toFixed(2)}</td></tr>
        <tr><td style="padding:4px 0;color:#5d6780">This payment</td><td style="padding:4px 0;text-align:right;color:#68c5ad;font-weight:600;font-variant-numeric:tabular-nums">${amountStr}</td></tr>
        <tr><td style="padding:4px 0 0;color:#1d2330;font-weight:700;border-top:1px solid #d8dce5">Remaining</td><td style="padding:4px 0 0;text-align:right;font-weight:700;color:${tikLedger.remaining_cents === 0 ? '#68c5ad' : '#1d2330'};font-variant-numeric:tabular-nums;border-top:1px solid #d8dce5">${remainingStr}${tikLedger.remaining_cents === 0 ? ' ✓' : ''}</td></tr>
      </tbody>
    </table>
    ${tikLedger.remaining_cents === 0 ? `<p style="margin:12px 0 0;font-size:13px;color:#68c5ad;font-weight:600">PAID IN FULL — thank you!</p>` : ''}
  </div>` : ''}
  <p style="font-size:14px;color:#666;">Keep this email for your records. Questions? Just reply or call (916) 542-2423.</p>
  <p style="font-size:14px;color:#666;">— Hunter<br/>Demand Signals<br/><a href="https://demandsignals.co">demandsignals.co</a></p>
</body></html>`

    return { subject, html, text }
  }

  // ── Cash receipt template (unchanged) ─────────────────────────────
  const subject = `Receipt ${receipt.receipt_number} — payment received (${amountStr})`
  const invoiceLine = invoiceNumber ? ` for invoice ${invoiceNumber}` : ''
  const invoiceLineHtml = invoiceNumber ? ` for invoice <strong>${invoiceNumber}</strong>` : ''

  const text = `Hi ${firstName},

Thanks — we received your payment of ${amountStr}${invoiceLine}.

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
  <p>Thanks — we received your payment of <strong>${amountStr}</strong>${invoiceLineHtml}.</p>
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
  /** Invoice number — pass null for TIK receipts not tied to an invoice. */
  invoiceNumber: string | null,
  to: string,
  prospect: { business_name?: string; owner_name?: string | null },
  // PDF attachment is optional so legacy callers don't break, but in
  // practice the Stripe webhook path now always passes one. Without
  // a PDF the email looks like just an inline summary — clients have
  // nothing to file. Hunter's directive 2026-04-29: receipt email
  // MUST attach the rendered PDF for clients to keep on file.
  pdfBuffer?: Buffer,
  /** TIK ledger snapshot — pass when payment_method='tik'. */
  tikLedger?: ReceiptTikLedgerContext | null,
): Promise<{ success: boolean; message_id?: string; error?: string }> {
  if (!(await isEmailEnabled())) {
    return { success: false, error: 'Email delivery disabled in config' }
  }

  const send_id = crypto.randomUUID()
  const { subject, html, text } = buildReceiptEmail(receipt, invoiceNumber, prospect, tikLedger ?? null)

  const result = await sendEmail({
    to,
    kind: 'receipt',
    subject,
    html,
    text,
    send_id,
    link: {
      receipt_id: receipt.id,
      invoice_id: receipt.invoice_id ?? undefined,
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
