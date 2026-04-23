// ── /api/admin/invoices/[id] — detail / update / delete ────────────

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

const patchSchema = z.object({
  notes: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  send_date: z.string().nullable().optional(),
  late_fee_cents: z.number().int().nonnegative().optional(),
  late_fee_grace_days: z.number().int().nonnegative().optional(),
  line_items: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().int().positive(),
        unit_price_cents: z.number().int().nonnegative(),
        discount_pct: z.number().min(0).max(100).optional(),
        discount_label: z.string().nullable().optional(),
      }),
    )
    .optional(),
  force_edit: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select('*, prospect:prospects(*), session:quote_sessions(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: lineItems } = await supabaseAdmin
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sort_order', { ascending: true })

  let supersedes_number: string | null = null
  let superseded_by_number: string | null = null
  if (invoice.supersedes_invoice_id) {
    const { data } = await supabaseAdmin
      .from('invoices')
      .select('invoice_number')
      .eq('id', invoice.supersedes_invoice_id)
      .maybeSingle()
    supersedes_number = data?.invoice_number ?? null
  }
  if (invoice.superseded_by_invoice_id) {
    const { data } = await supabaseAdmin
      .from('invoices')
      .select('invoice_number')
      .eq('id', invoice.superseded_by_invoice_id)
      .maybeSingle()
    superseded_by_number = data?.invoice_number ?? null
  }

  return NextResponse.json({
    invoice,
    line_items: lineItems ?? [],
    supersedes_number,
    superseded_by_number,
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  let body: z.infer<typeof patchSchema>
  try {
    body = patchSchema.parse(await request.json().catch(() => ({})))
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('invoices')
    .select('status')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if ((existing.status === 'paid' || existing.status === 'void') && !body.force_edit) {
    return NextResponse.json(
      { error: `Invoice is ${existing.status}. Pass force_edit: true to override.` },
      { status: 409 },
    )
  }

  const updates: Record<string, unknown> = {}
  if (body.notes !== undefined) updates.notes = body.notes
  if (body.due_date !== undefined) updates.due_date = body.due_date
  if (body.send_date !== undefined) updates.send_date = body.send_date
  if (body.late_fee_cents !== undefined) updates.late_fee_cents = body.late_fee_cents
  if (body.late_fee_grace_days !== undefined) updates.late_fee_grace_days = body.late_fee_grace_days

  if (body.line_items !== undefined) {
    // Delete all existing line items and reinsert.
    const { error: delErr } = await supabaseAdmin
      .from('invoice_line_items')
      .delete()
      .eq('invoice_id', id)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    const newRows = body.line_items.map((item, idx) => {
      const subtotal_cents = item.quantity * item.unit_price_cents
      const discount_cents = Math.round(subtotal_cents * ((item.discount_pct ?? 0) / 100))
      const line_total_cents = subtotal_cents - discount_cents
      return {
        invoice_id: id,
        description: item.description,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        subtotal_cents,
        discount_pct: item.discount_pct ?? 0,
        discount_label: item.discount_label ?? null,
        discount_cents,
        line_total_cents,
        sort_order: idx,
      }
    })

    if (newRows.length > 0) {
      const { error: insErr } = await supabaseAdmin
        .from('invoice_line_items')
        .insert(newRows)
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    // Recompute totals on the invoice row.
    updates.subtotal_cents = newRows.reduce((s, r) => s + r.subtotal_cents, 0)
    updates.discount_cents = newRows.reduce((s, r) => s + r.discount_cents, 0)
    updates.total_due_cents = newRows.reduce((s, r) => s + r.line_total_cents, 0)
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabaseAdmin
      .from('invoices')
      .update(updates)
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: existing } = await supabaseAdmin
    .from('invoices')
    .select('status')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.status !== 'draft') {
    return NextResponse.json(
      { error: 'Can only delete drafts. Use void on sent invoices.' },
      { status: 409 },
    )
  }

  const { error } = await supabaseAdmin.from('invoices').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
