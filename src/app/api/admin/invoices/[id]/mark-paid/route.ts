// ── POST /api/admin/invoices/[id]/mark-paid ─────────────────────────
// Marks an invoice paid and creates a receipt record (RCT-...) for the
// payment event.
//
// Partial payment note: if amount_paid_cents < invoice.total_due_cents,
// the invoice status stays 'sent' (not flipped to 'paid') and a receipt
// is created for the partial amount. Sum of receipts vs total_due_cents
// tracks outstanding balance in the UI. We intentionally skip adding a
// 'partial' status to avoid a constraint migration — comment explains the
// trade-off in the payment flow.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { allocateDocNumber } from '@/lib/doc-numbering'

const VALID_METHODS = ['check', 'wire', 'stripe', 'cash', 'trade', 'zero_balance', 'other'] as const

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const paid_method: string = body.paid_method ?? 'other'
  const paid_note: string | null = body.paid_note ?? null
  const payment_reference: string | null = body.payment_reference ?? null
  const amount_paid_cents: number | null = typeof body.amount_paid_cents === 'number'
    ? body.amount_paid_cents
    : null

  if (!VALID_METHODS.includes(paid_method as typeof VALID_METHODS[number])) {
    return NextResponse.json({ error: 'Invalid paid_method' }, { status: 400 })
  }

  // Fetch the invoice first to know total_due_cents and prospect_id.
  const { data: inv, error: fetchErr } = await supabaseAdmin
    .from('invoices')
    .select('id, prospect_id, total_due_cents, status')
    .eq('id', id)
    .single()

  if (fetchErr || !inv) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  if (!['sent', 'viewed'].includes(inv.status)) {
    return NextResponse.json({ error: 'Invoice is not in a payable state' }, { status: 409 })
  }

  const effectiveAmountCents = amount_paid_cents ?? inv.total_due_cents
  const isFullPayment = effectiveAmountCents >= inv.total_due_cents

  // Only flip invoice to 'paid' when the amount covers the full balance.
  const newStatus = isFullPayment ? 'paid' : 'sent'
  const paidAt = new Date().toISOString()

  const { data: updatedInvoice, error: updateErr } = await supabaseAdmin
    .from('invoices')
    .update({
      status: newStatus,
      ...(isFullPayment ? { paid_at: paidAt, paid_method, paid_note } : {}),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  if (!updatedInvoice) return NextResponse.json({ error: 'Not found or not markable' }, { status: 404 })

  // ── Create receipt record ───────────────────────────────────────────
  // Receipts are an immutable payment-event audit log. Even if the invoice
  // is only partially paid, we create a receipt for the amount received.
  // Failures here are non-fatal — the payment is already recorded on the invoice.
  let receipt: Record<string, unknown> | null = null
  if (inv.prospect_id) {
    try {
      const tempRct = `PENDING-${crypto.randomUUID()}`
      const { data: rctRow, error: rctErr } = await supabaseAdmin
        .from('receipts')
        .insert({
          receipt_number: tempRct,
          invoice_id: id,
          prospect_id: inv.prospect_id,
          amount_cents: effectiveAmountCents,
          currency: 'USD',
          payment_method: paid_method,
          payment_reference: payment_reference ?? null,
          paid_at: paidAt,
          notes: paid_note ?? null,
        })
        .select('*')
        .single()

      if (!rctErr && rctRow) {
        // Allocate RCT-CLIENT-MMDDYY{SUFFIX} number.
        try {
          const rctNumber = await allocateDocNumber({
            doc_type: 'RCT',
            prospect_id: inv.prospect_id,
            ref_table: 'receipts',
            ref_id: rctRow.id,
          })
          await supabaseAdmin
            .from('receipts')
            .update({ receipt_number: rctNumber })
            .eq('id', rctRow.id)
          rctRow.receipt_number = rctNumber
        } catch (numErr) {
          // Prospect may not have a client_code. Receipt keeps PENDING number —
          // visible in admin and fixable manually. Do not fail mark-paid.
          console.error('[mark-paid] Receipt numbering failed:', numErr instanceof Error ? numErr.message : numErr)
        }
        receipt = rctRow
      } else if (rctErr) {
        console.error('[mark-paid] Receipt insert failed:', rctErr.message)
      }
    } catch (rctError) {
      console.error('[mark-paid] Receipt creation failed:', rctError)
    }
  }

  return NextResponse.json({
    invoice: updatedInvoice,
    receipt,
    partial: !isFullPayment,
  })
}
