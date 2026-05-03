// ── POST /api/admin/trade-credits/[id]/drawdowns ─────────────────────
// Record a TIK trade payment (the client delivered services/goods/labor
// against their TIK obligation). Decrements remaining_cents on parent.
// Sets status='partial' if remaining > 0, 'fulfilled' + closed_at if 0.
//
// Auto-issues an RCT receipt with payment_method='tik', then dispatches
// email + SMS to the prospect (PDF attached on email).
//
// Body:
//   { amount_cents: number,
//     description: string,
//     delivered_on?: 'YYYY-MM-DD' (default today),
//     notes?: string | null,
//     send_channel?: 'email' | 'sms' | 'both' | 'none'  (default 'both')
//   }

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { allocateDocNumber } from '@/lib/doc-numbering'
import { renderReceiptPdf } from '@/lib/pdf/receipt'
import { sendReceiptEmail } from '@/lib/receipt-email'
import { sendReceiptSms } from '@/lib/receipt-sms'

const postSchema = z.object({
  amount_cents: z.number().int().positive(),
  description: z.string().min(1),
  delivered_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().nullable().optional(),
  send_channel: z.enum(['email', 'sms', 'both', 'none']).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  let parsed: z.infer<typeof postSchema>
  try {
    parsed = postSchema.parse(await request.json())
  } catch (e) {
    const msg = e instanceof z.ZodError
      ? e.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
      : 'Invalid request body'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const sendChannel = parsed.send_channel ?? 'both'

  // Load current trade credit + parent prospect for dispatch.
  const { data: tc, error: tcErr } = await supabaseAdmin
    .from('trade_credits')
    .select('id, prospect_id, sow_document_id, remaining_cents, original_amount_cents, status, description, prospect:prospects(id, business_name, owner_name, owner_email, business_email, owner_phone, business_phone, client_code)')
    .eq('id', id)
    .maybeSingle()

  if (tcErr) return NextResponse.json({ error: tcErr.message }, { status: 500 })
  if (!tc) return NextResponse.json({ error: 'Trade credit not found' }, { status: 404 })
  if (tc.status === 'fulfilled' || tc.status === 'written_off') {
    return NextResponse.json(
      { error: `Trade credit is already ${tc.status}` },
      { status: 409 },
    )
  }

  if (parsed.amount_cents > tc.remaining_cents) {
    return NextResponse.json(
      {
        error: `Trade payment ($${(parsed.amount_cents / 100).toFixed(2)}) exceeds remaining TIK balance ($${(tc.remaining_cents / 100).toFixed(2)})`,
      },
      { status: 409 },
    )
  }

  const deliveredOn = parsed.delivered_on ?? new Date().toISOString().slice(0, 10)

  // ── Insert draw-down (the trade payment ledger row) ──────────────
  const { data: drawdown, error: ddErr } = await supabaseAdmin
    .from('trade_credit_drawdowns')
    .insert({
      trade_credit_id: id,
      amount_cents: parsed.amount_cents,
      description: parsed.description,
      delivered_on: deliveredOn,
      recorded_by: auth.admin.id,
      notes: parsed.notes ?? null,
    })
    .select('*')
    .single()

  if (ddErr) return NextResponse.json({ error: ddErr.message }, { status: 500 })

  // ── Decrement parent + flip status ───────────────────────────────
  const newRemaining = tc.remaining_cents - parsed.amount_cents
  const newStatus = newRemaining === 0 ? 'fulfilled' : 'partial'
  const parentUpdate: Record<string, unknown> = {
    remaining_cents: newRemaining,
    status: newStatus,
  }
  if (newStatus === 'fulfilled') {
    parentUpdate.closed_at = new Date().toISOString()
  }
  const { error: updateErr } = await supabaseAdmin
    .from('trade_credits')
    .update(parentUpdate)
    .eq('id', id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // ── Mint RCT receipt ─────────────────────────────────────────────
  const paidAtIso = new Date(`${deliveredOn}T12:00:00.000Z`).toISOString()
  const tempRctNumber = `PENDING-${crypto.randomUUID()}`
  // payment_reference encodes the TIK ledger id so the receipt PDF +
  // email can resolve the ledger context for the running-balance card.
  const paymentReference = `trade_credit:${id}`
  // Notes get the description so the receipt PDF "SERVICES DELIVERED"
  // section reads the right copy. Keep the explicit "Services rendered:"
  // prefix off — let the template handle that label.
  const receiptNotes = parsed.notes
    ? `${parsed.description}\n\n${parsed.notes}`
    : parsed.description

  const { data: rctRow, error: rctErr } = await supabaseAdmin
    .from('receipts')
    .insert({
      receipt_number: tempRctNumber,
      invoice_id: null,
      prospect_id: tc.prospect_id,
      amount_cents: parsed.amount_cents,
      currency: 'USD',
      payment_method: 'tik',
      payment_reference: paymentReference,
      paid_at: paidAtIso,
      notes: receiptNotes,
    })
    .select('*')
    .single()

  let receiptNumber = tempRctNumber
  if (rctErr || !rctRow) {
    console.error('[trade-payment] receipt insert failed:', rctErr?.message)
  } else {
    try {
      receiptNumber = await allocateDocNumber({
        doc_type: 'RCT',
        prospect_id: tc.prospect_id,
        ref_table: 'receipts',
        ref_id: rctRow.id,
      })
      await supabaseAdmin
        .from('receipts')
        .update({ receipt_number: receiptNumber })
        .eq('id', rctRow.id)
    } catch (numErr) {
      console.error('[trade-payment] receipt numbering failed:', numErr)
    }
  }

  // ── Dispatch email + SMS (best-effort; never rolls back the ledger) ─
  // Prospect type narrowing — supabase select returns object or array.
  const prospect = (Array.isArray(tc.prospect) ? tc.prospect[0] : tc.prospect) as
    | { business_name?: string; owner_name?: string | null; owner_email?: string | null; business_email?: string | null; owner_phone?: string | null; business_phone?: string | null; client_code?: string | null }
    | null
  const recipientEmail =
    prospect?.owner_email ?? prospect?.business_email ?? null
  const recipientPhone =
    prospect?.owner_phone ?? prospect?.business_phone ?? null

  // SOW number lookup for the receipt context cards.
  let sowNumber: string | null = null
  if (tc.sow_document_id) {
    const { data: sow } = await supabaseAdmin
      .from('sow_documents')
      .select('sow_number')
      .eq('id', tc.sow_document_id)
      .maybeSingle()
    sowNumber = sow?.sow_number ?? null
  }

  const tikLedgerCtx = {
    description: tc.description,
    original_amount_cents: tc.original_amount_cents,
    remaining_cents: newRemaining,
  }

  let emailResult: { success: boolean; message_id?: string; error?: string } | null = null
  let smsResult: { success: boolean; message_id?: string; error?: string } | null = null

  if (rctRow) {
    // Render PDF once (used by email attachment + admin link).
    let pdfBuffer: Buffer | undefined
    try {
      pdfBuffer = await renderReceiptPdf(
        {
          id: rctRow.id,
          receipt_number: receiptNumber,
          invoice_id: null,
          prospect_id: tc.prospect_id,
          amount_cents: parsed.amount_cents,
          currency: 'USD',
          payment_method: 'tik',
          payment_reference: paymentReference,
          paid_at: paidAtIso,
          notes: receiptNotes,
          created_at: rctRow.created_at,
        },
        null, // no parent invoice
        {
          business_name: prospect?.business_name ?? 'Client',
          client_code: prospect?.client_code ?? null,
          owner_name: prospect?.owner_name ?? null,
          owner_email: prospect?.owner_email ?? null,
        },
        { ...tikLedgerCtx, sow_number: sowNumber },
      )
    } catch (e) {
      console.error('[trade-payment] PDF render failed:', e instanceof Error ? e.message : e)
    }

    // Email
    if ((sendChannel === 'email' || sendChannel === 'both') && recipientEmail) {
      try {
        emailResult = await sendReceiptEmail(
          {
            id: rctRow.id,
            receipt_number: receiptNumber,
            invoice_id: null,
            amount_cents: parsed.amount_cents,
            currency: 'USD',
            payment_method: 'tik',
            payment_reference: paymentReference,
            paid_at: paidAtIso,
            prospect_id: tc.prospect_id,
            notes: receiptNotes,
          },
          null,
          recipientEmail,
          { business_name: prospect?.business_name, owner_name: prospect?.owner_name },
          pdfBuffer,
          tikLedgerCtx,
        )
      } catch (e) {
        emailResult = { success: false, error: e instanceof Error ? e.message : 'email threw' }
      }
    }

    // SMS
    if ((sendChannel === 'sms' || sendChannel === 'both') && recipientPhone) {
      try {
        smsResult = await sendReceiptSms(
          {
            id: rctRow.id,
            receipt_number: receiptNumber,
            amount_cents: parsed.amount_cents,
            payment_method: 'tik',
            paid_at: paidAtIso,
            prospect_id: tc.prospect_id,
            notes: receiptNotes,
          },
          recipientPhone,
          { business_name: prospect?.business_name },
          tikLedgerCtx,
        )
      } catch (e) {
        smsResult = { success: false, error: e instanceof Error ? e.message : 'sms threw' }
      }
    }
  }

  return NextResponse.json(
    {
      drawdown,
      remaining_cents: newRemaining,
      status: newStatus,
      receipt: rctRow
        ? {
            id: rctRow.id,
            receipt_number: receiptNumber,
          }
        : null,
      send_channel: sendChannel,
      email: emailResult,
      sms: smsResult,
    },
    { status: 201 },
  )
}
