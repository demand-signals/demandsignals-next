// ── POST /api/admin/invoices/[id]/void-and-reissue ──────────────────
// Atomic void + new draft with copied line items.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const voidReason: string = (body.void_reason ?? '').trim()
  if (voidReason.length < 5) {
    return NextResponse.json(
      { error: 'void_reason must be at least 5 characters' },
      { status: 400 },
    )
  }

  const { data: oldInv } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!oldInv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['sent', 'viewed', 'paid'].includes(oldInv.status)) {
    return NextResponse.json(
      { error: 'Only sent/viewed/paid invoices can be re-issued' },
      { status: 409 },
    )
  }

  const { data: oldLineItems } = await supabaseAdmin
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sort_order', { ascending: true })

  const { data: newNumber, error: numErr } = await supabaseAdmin.rpc('generate_invoice_number')
  if (numErr || !newNumber) {
    return NextResponse.json(
      { error: `Number generation failed: ${numErr?.message}` },
      { status: 500 },
    )
  }

  const { data: newInv, error: newErr } = await supabaseAdmin
    .from('invoices')
    .insert({
      invoice_number: newNumber,
      kind: oldInv.kind,
      prospect_id: oldInv.prospect_id,
      quote_session_id: oldInv.quote_session_id,
      subscription_id: oldInv.subscription_id,
      supersedes_invoice_id: oldInv.id,
      status: 'draft',
      subtotal_cents: oldInv.subtotal_cents,
      discount_cents: oldInv.discount_cents,
      total_due_cents: oldInv.total_due_cents,
      currency: oldInv.currency,
      due_date: oldInv.due_date,
      category_hint: oldInv.category_hint,
      notes: oldInv.notes,
      created_by: auth.user.id,
    })
    .select('*')
    .single()

  if (newErr) {
    return NextResponse.json(
      { error: `New invoice insert: ${newErr.message}` },
      { status: 500 },
    )
  }

  if (oldLineItems && oldLineItems.length > 0) {
    const copies = oldLineItems.map((li) => ({
      invoice_id: newInv.id,
      description: li.description,
      quantity: li.quantity,
      unit_price_cents: li.unit_price_cents,
      subtotal_cents: li.subtotal_cents,
      discount_pct: li.discount_pct,
      discount_cents: li.discount_cents,
      discount_label: li.discount_label,
      line_total_cents: li.line_total_cents,
      sort_order: li.sort_order,
    }))
    const { error: copyErr } = await supabaseAdmin.from('invoice_line_items').insert(copies)
    if (copyErr) {
      await supabaseAdmin.from('invoices').delete().eq('id', newInv.id)
      return NextResponse.json({ error: `Line item copy: ${copyErr.message}` }, { status: 500 })
    }
  }

  const { error: voidErr } = await supabaseAdmin
    .from('invoices')
    .update({
      status: 'void',
      voided_at: new Date().toISOString(),
      voided_by: auth.user.id,
      void_reason: voidReason,
      superseded_by_invoice_id: newInv.id,
    })
    .eq('id', id)

  if (voidErr) {
    await supabaseAdmin.from('invoice_line_items').delete().eq('invoice_id', newInv.id)
    await supabaseAdmin.from('invoices').delete().eq('id', newInv.id)
    return NextResponse.json(
      { error: `Void old invoice: ${voidErr.message}` },
      { status: 500 },
    )
  }

  return NextResponse.json({ new_invoice: newInv, voided_invoice_id: id })
}
