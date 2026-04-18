// ── POST /api/sow/public/[number]/accept ────────────────────────────
// Client-side SOW acceptance. Client POSTs their typed signature name.
// We:
//   1. Transition SOW: sent/viewed → accepted, stamp accepted_at/signature/ip
//   2. Auto-generate the deposit invoice (25% by default, per pricing.deposit_cents)
//   3. Link deposit_invoice_id back on the SOW row
//   4. Return the deposit invoice's public URL so client can pay immediately

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { SowPricing } from '@/lib/invoice-types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { key, signature }: { key?: string; signature?: string } = body
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!signature || signature.trim().length < 2) {
    return NextResponse.json(
      { error: 'Signature required (type your full name)' },
      { status: 400 },
    )
  }

  const { data: sow } = await supabaseAdmin
    .from('sow_documents')
    .select('*, prospect:prospects(*)')
    .eq('sow_number', number)
    .eq('public_uuid', key)
    .maybeSingle()

  if (!sow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['sent', 'viewed'].includes(sow.status)) {
    return NextResponse.json(
      { error: `SOW is ${sow.status} — cannot accept` },
      { status: 409 },
    )
  }

  // Capture IP for audit trail.
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    null

  const acceptedAt = new Date().toISOString()

  // Generate deposit invoice.
  const pricing = sow.pricing as SowPricing
  const depositCents = pricing.deposit_cents ?? Math.round(pricing.total_cents * 0.25)

  const { data: invNum, error: numErr } = await supabaseAdmin.rpc('generate_invoice_number')
  if (numErr || !invNum) {
    return NextResponse.json(
      { error: `Invoice number generation: ${numErr?.message}` },
      { status: 500 },
    )
  }

  const { data: depositInvoice, error: invErr } = await supabaseAdmin
    .from('invoices')
    .insert({
      invoice_number: invNum,
      kind: 'business',
      prospect_id: sow.prospect_id,
      quote_session_id: sow.quote_session_id,
      status: 'sent',
      sent_at: acceptedAt,
      sent_via_channel: 'manual',
      subtotal_cents: depositCents,
      discount_cents: 0,
      total_due_cents: depositCents,
      currency: 'USD',
      auto_generated: true,
      auto_trigger: 'sow_deposit',
      auto_sent: true,
      category_hint: 'service_revenue',
      notes: `Deposit invoice for SOW ${sow.sow_number} — ${sow.title}. Remaining balance: $${((pricing.total_cents - depositCents) / 100).toFixed(2)}`,
    })
    .select('*')
    .single()

  if (invErr || !depositInvoice) {
    return NextResponse.json(
      { error: `Deposit invoice insert: ${invErr?.message}` },
      { status: 500 },
    )
  }

  await supabaseAdmin.from('invoice_line_items').insert({
    invoice_id: depositInvoice.id,
    description: `Deposit for ${sow.title} (SOW ${sow.sow_number})`,
    quantity: 1,
    unit_price_cents: depositCents,
    subtotal_cents: depositCents,
    discount_pct: 0,
    discount_cents: 0,
    line_total_cents: depositCents,
    sort_order: 0,
  })

  // Flip SOW status.
  await supabaseAdmin
    .from('sow_documents')
    .update({
      status: 'accepted',
      accepted_at: acceptedAt,
      accepted_signature: signature.trim(),
      accepted_ip: ip,
      deposit_invoice_id: depositInvoice.id,
    })
    .eq('id', sow.id)

  const depositPublicUrl = `https://demandsignals.co/invoice/${depositInvoice.invoice_number}/${depositInvoice.public_uuid}`

  return NextResponse.json({
    accepted: true,
    deposit_invoice: {
      number: depositInvoice.invoice_number,
      amount_cents: depositCents,
      public_url: depositPublicUrl,
      pay_url: `https://demandsignals.co/invoice/${depositInvoice.invoice_number}/${depositInvoice.public_uuid}#pay`,
    },
  })
}
