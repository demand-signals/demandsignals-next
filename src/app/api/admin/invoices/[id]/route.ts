// ── /api/admin/invoices/[id] — detail / update / delete ────────────

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

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

  const { data: existing } = await supabaseAdmin
    .from('invoices')
    .select('status')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.status !== 'draft') {
    return NextResponse.json(
      { error: 'Can only edit drafts. Use void-and-reissue to change sent invoices.' },
      { status: 409 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}
  if (typeof body.notes === 'string') updates.notes = body.notes
  if (typeof body.due_date === 'string' || body.due_date === null) updates.due_date = body.due_date
  if (typeof body.category_hint === 'string') updates.category_hint = body.category_hint

  if (Array.isArray(body.line_items)) {
    // Line-item rewrite: delete + re-insert for simplicity.
    // (Totals recomputed here would require duplicating POST logic — instead,
    // callers should DELETE the draft and POST a new one for line-item changes.)
    return NextResponse.json(
      { error: 'Line-item editing via PATCH not supported — delete draft and recreate' },
      { status: 501 },
    )
  }

  const { data, error } = await supabaseAdmin
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoice: data })
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
