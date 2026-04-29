// ── POST /api/admin/invoices/[id]/refund ─────────────────────────────
// Issues a Stripe refund against the original payment intent + flips
// the invoice to void + regenerates the PDF so the VOID stamp shows.
//
// Stripe-paid invoices: full automation — refund posts to Stripe, the
// charge reverses, customer's card is credited, DB updated.
//
// Non-Stripe payments (check / wire / cash): the Stripe call is
// skipped (there's nothing to reverse) — admin must refund manually
// via the original payment channel. The DB still flips to void with
// a note explaining the manual step.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createStripeRefund } from '@/lib/stripe-sync'
import { z } from 'zod'

const bodySchema = z.object({
  amount_cents: z.number().int().positive().optional(),
  reason: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await ctx.params

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json().catch(() => ({})))
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const { data: inv } = await supabaseAdmin
    .from('invoices')
    .select('id, total_due_cents, status')
    .eq('id', id)
    .single()

  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (inv.status !== 'paid') {
    return NextResponse.json(
      { error: `Cannot refund invoice in status ${inv.status}` },
      { status: 409 },
    )
  }

  const refundAmount = parsed.amount_cents ?? inv.total_due_cents
  const voidedBy = auth.user?.id ?? null

  // Look up the most recent receipt to determine if this was Stripe.
  // Receipts carry payment_method ('stripe' | 'check' | 'wire' | …)
  // and (for Stripe) the payment_intent id in payment_reference.
  const { data: receipt } = await supabaseAdmin
    .from('receipts')
    .select('payment_method, payment_reference')
    .eq('invoice_id', id)
    .order('paid_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Step 1: if Stripe-paid, issue the refund. Throws on Stripe error
  // — surface it back to admin so they can retry or fall back to
  // manual. We do NOT flip the DB to void if Stripe refused.
  let stripeRefundId: string | null = null
  let manualNote: string | null = null
  if (receipt?.payment_method === 'stripe') {
    try {
      const refund = await createStripeRefund({
        invoiceId: id,
        amountCents: refundAmount,
        reason: 'requested_by_customer',
        idempotencyKey: `dsig_refund_inv_${id}_${refundAmount}`,
        metadata: {
          dsig_invoice_id: id,
          dsig_admin_user: voidedBy ?? 'unknown',
        },
      })
      stripeRefundId = refund.id
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown Stripe error'
      return NextResponse.json(
        { error: `Stripe refund failed: ${msg}. Invoice NOT voided. Retry or refund manually in Stripe.` },
        { status: 502 },
      )
    }
  } else {
    // Non-Stripe payment — admin handles the refund out-of-band.
    manualNote = `Original payment was ${receipt?.payment_method ?? 'unknown'} — refund manually via that channel.`
  }

  // Step 2: flip the invoice to void with the refund recorded.
  const reasonStr = parsed.reason ?? 'admin-initiated'
  const voidReasonText = stripeRefundId
    ? `Refund (Stripe ${stripeRefundId}): ${reasonStr} · ${refundAmount} cents`
    : `Refund (manual): ${reasonStr} · ${refundAmount} cents`

  const { error } = await supabaseAdmin
    .from('invoices')
    .update({
      status: 'void',
      void_reason: voidReasonText,
      voided_at: new Date().toISOString(),
      voided_by: voidedBy,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Step 3: regenerate the cached invoice PDF so it reflects the
  // void state (VOID stamp + voided notice). Best-effort — failures
  // here don't unwind the refund.
  try {
    const { regenerateInvoicePdf } = await import('@/lib/invoice-pdf-regenerate')
    const result = await regenerateInvoicePdf(id)
    if (!result.ok) {
      console.error('[refund] PDF regeneration failed:', result.error)
    }
  } catch (e) {
    console.error('[refund] PDF regeneration threw:', e instanceof Error ? e.message : e)
  }

  return NextResponse.json({
    ok: true,
    refund_amount_cents: refundAmount,
    stripe_refund_id: stripeRefundId,
    note: stripeRefundId
      ? `Stripe refund ${stripeRefundId} issued for ${refundAmount} cents. Invoice voided.`
      : manualNote ?? 'Invoice voided.',
  })
}
