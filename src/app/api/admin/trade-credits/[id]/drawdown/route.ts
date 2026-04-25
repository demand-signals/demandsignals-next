// ── POST /api/admin/trade-credits/[id]/drawdown ─────────────────────
// Records a drawdown against a TIK ledger. Decrements remaining_cents,
// inserts a trade_credit_drawdowns row, and issues an RCT receipt with
// payment_method='tik'.
//
// Body:
//   { amount_cents: number, description: string, delivered_on: string,
//     overage_action?: 'cash_invoice' | 'new_tik_ledger' }
//
// If amount_cents > remaining_cents and overage_action is not provided,
// returns 409 with the overage amount so admin can re-submit with a choice.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { allocateDocNumber } from '@/lib/doc-numbering'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { amount_cents, description, delivered_on, overage_action } = body as {
    amount_cents: number
    description: string
    delivered_on: string
    overage_action?: 'cash_invoice' | 'new_tik_ledger'
  }

  if (typeof amount_cents !== 'number' || amount_cents <= 0) {
    return NextResponse.json({ error: 'amount_cents must be positive' }, { status: 400 })
  }
  if (!description || typeof description !== 'string') {
    return NextResponse.json({ error: 'description required' }, { status: 400 })
  }
  if (!delivered_on) {
    return NextResponse.json({ error: 'delivered_on required (ISO date)' }, { status: 400 })
  }

  const { data: tc, error: tcErr } = await supabaseAdmin
    .from('trade_credits')
    .select('*, prospect:prospects(id, business_name)')
    .eq('id', id)
    .single()

  if (tcErr || !tc) {
    return NextResponse.json({ error: 'Trade credit not found' }, { status: 404 })
  }

  if (tc.status !== 'outstanding' && tc.status !== 'partial') {
    return NextResponse.json(
      { error: `Trade credit status is ${tc.status} — cannot draw down` },
      { status: 409 },
    )
  }

  const remaining = tc.remaining_cents
  const isOverage = amount_cents > remaining
  const overageCents = isOverage ? amount_cents - remaining : 0

  if (isOverage && !overage_action) {
    return NextResponse.json(
      {
        error: 'Overage detected',
        kind: 'overage',
        remaining_cents: remaining,
        overage_cents: overageCents,
        message: `Service value exceeds remaining TIK by $${(overageCents / 100).toFixed(2)}. Re-submit with overage_action: 'cash_invoice' or 'new_tik_ledger'.`,
      },
      { status: 409 },
    )
  }

  // ── Apply drawdown to existing TIK ─────────────────────────────────
  const drawdownAmount = isOverage ? remaining : amount_cents
  const newRemaining = Math.max(0, remaining - drawdownAmount)
  const newStatus = newRemaining === 0 ? 'fulfilled' : 'partial'
  const closedAt = newRemaining === 0 ? new Date().toISOString() : null

  const { error: ddErr } = await supabaseAdmin.from('trade_credit_drawdowns').insert({
    trade_credit_id: id,
    amount_cents: drawdownAmount,
    description,
    delivered_on,
  })
  if (ddErr) {
    return NextResponse.json({ error: `Drawdown insert: ${ddErr.message}` }, { status: 500 })
  }

  await supabaseAdmin
    .from('trade_credits')
    .update({
      remaining_cents: newRemaining,
      status: newStatus,
      closed_at: closedAt,
    })
    .eq('id', id)

  // Issue RCT receipt for services rendered.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let receipt: any = null
  if (tc.prospect_id) {
    const tempRct = `PENDING-${crypto.randomUUID()}`
    const { data: rct } = await supabaseAdmin
      .from('receipts')
      .insert({
        receipt_number: tempRct,
        invoice_id: null,
        prospect_id: tc.prospect_id,
        amount_cents: drawdownAmount,
        currency: 'USD',
        payment_method: 'tik',
        payment_reference: `TIK-${id.slice(0, 8)}`,
        paid_at: delivered_on,
        notes: `Services rendered: ${description}`,
      })
      .select('*')
      .single()

    if (rct) {
      try {
        const rctNumber = await allocateDocNumber({
          doc_type: 'RCT',
          prospect_id: tc.prospect_id,
          ref_table: 'receipts',
          ref_id: rct.id,
        })
        await supabaseAdmin.from('receipts').update({ receipt_number: rctNumber }).eq('id', rct.id)
        rct.receipt_number = rctNumber
      } catch (numErr) {
        console.error('[tik-drawdown] receipt numbering failed:', numErr)
      }
      receipt = rct
    }
  }

  // ── Handle overage if requested ────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let overageResult: any = null
  if (isOverage && overage_action) {
    if (overage_action === 'new_tik_ledger') {
      const { data: newTC } = await supabaseAdmin
        .from('trade_credits')
        .insert({
          prospect_id: tc.prospect_id,
          sow_document_id: tc.sow_document_id,
          original_amount_cents: overageCents,
          remaining_cents: overageCents,
          description: `Overage from TIK ${id.slice(0, 8)}: ${description}`,
          status: 'outstanding',
        })
        .select('id, remaining_cents')
        .single()
      overageResult = { kind: 'new_tik_ledger', trade_credit_id: newTC?.id, amount_cents: overageCents }
    } else if (overage_action === 'cash_invoice') {
      const tempInvNum = `PENDING-${crypto.randomUUID()}`
      const { data: inv } = await supabaseAdmin
        .from('invoices')
        .insert({
          invoice_number: tempInvNum,
          kind: 'business',
          prospect_id: tc.prospect_id,
          status: 'sent',
          subtotal_cents: overageCents,
          discount_cents: 0,
          total_due_cents: overageCents,
          currency: 'USD',
          auto_generated: true,
          auto_trigger: 'tik_overage',
          notes: `Overage on TIK service delivery: ${description}`,
        })
        .select('*')
        .single()
      if (inv) {
        try {
          const invNum = await allocateDocNumber({
            doc_type: 'INV',
            prospect_id: tc.prospect_id,
            ref_table: 'invoices',
            ref_id: inv.id,
          })
          await supabaseAdmin.from('invoices').update({ invoice_number: invNum }).eq('id', inv.id)
          inv.invoice_number = invNum
        } catch (e) {
          console.error('[tik-overage] invoice numbering failed:', e)
        }
        await supabaseAdmin.from('invoice_line_items').insert({
          invoice_id: inv.id,
          description: `TIK overage: ${description}`,
          quantity: 1,
          unit_price_cents: overageCents,
          subtotal_cents: overageCents,
          discount_pct: 0,
          discount_cents: 0,
          line_total_cents: overageCents,
          sort_order: 0,
        })
        overageResult = { kind: 'cash_invoice', invoice_id: inv.id, invoice_number: inv.invoice_number, amount_cents: overageCents }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    trade_credit: { id, remaining_cents: newRemaining, status: newStatus },
    drawdown: { amount_cents: drawdownAmount, description, delivered_on },
    receipt,
    overage: overageResult,
  })
}
