// ── Receipt SMS dispatch ─────────────────────────────────────────────
// Sends a short-form text confirmation when a receipt is issued. Used
// by the TIK-payment recording flow (no public receipt URL exists, so
// the SMS is a body-only confirmation — the PDF rides along with the
// email channel).
//
// Kill switch: quote_config.sms_delivery_enabled must be 'true'
// (enforced inside sendSms).

import { sendSms } from '@/lib/twilio-sms'

export interface ReceiptSmsRow {
  id: string
  receipt_number: string
  amount_cents: number
  payment_method: string
  paid_at: string
  prospect_id: string
  notes?: string | null
}

export interface ReceiptSmsTikLedger {
  description: string
  remaining_cents: number
}

export function buildReceiptSmsBody(
  receipt: ReceiptSmsRow,
  prospect: { business_name?: string },
  tikLedger?: ReceiptSmsTikLedger | null,
): string {
  const isTik = receipt.payment_method === 'tik' || receipt.payment_method === 'trade'
  const amountStr = `$${(receipt.amount_cents / 100).toFixed(2)}`
  const businessName = prospect.business_name ?? 'Demand Signals'

  if (isTik) {
    const remainingStr = tikLedger
      ? `$${(tikLedger.remaining_cents / 100).toFixed(2)}`
      : null
    const tail = tikLedger
      ? tikLedger.remaining_cents === 0
        ? ` TIK PAID IN FULL — thank you!`
        : ` TIK remaining: ${remainingStr}.`
      : ''
    // Keep it short — single segment if possible. Receipt # + amount +
    // remaining balance is the highest-value info per character.
    return `${businessName}: Trade payment of ${amountStr} recorded.${tail} Receipt ${receipt.receipt_number} emailed.`
  }

  return `${businessName}: Payment of ${amountStr} received. Receipt ${receipt.receipt_number} emailed for your records.`
}

export async function sendReceiptSms(
  receipt: ReceiptSmsRow,
  to: string,
  prospect: { business_name?: string },
  tikLedger?: ReceiptSmsTikLedger | null,
): Promise<{ success: boolean; message_id?: string; error?: string }> {
  const body = buildReceiptSmsBody(receipt, prospect, tikLedger)
  const result = await sendSms(to, body)
  return {
    success: result.success,
    message_id: result.message_id,
    error: result.error,
  }
}
