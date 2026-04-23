// ── /api/admin/subscriptions/[id] — detail, edit, delete ─────────────

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

// ── GET ──────────────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select(
      `*,
       prospect:prospects(
         id, business_name, owner_name, owner_email, business_email,
         owner_phone, business_phone, address, city, state, zip
       ),
       plan:subscription_plans(*)`,
    )
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: invoices } = await supabaseAdmin
    .from('invoices')
    .select('id, invoice_number, total_due_cents, status, sent_at, paid_at, created_at')
    .eq('subscription_id', id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ subscription: data, invoices: invoices ?? [] })
}

// ── PATCH ─────────────────────────────────────────────────────────────
const patchSchema = z.object({
  status: z.enum(['active', 'trialing', 'past_due', 'canceled', 'paused']).optional(),
  end_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  override_monthly_amount_cents: z.number().int().nonnegative().nullable().optional(),
  next_invoice_date: z.string().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  // Build updates object with only keys present in the body
  const updates: Record<string, unknown> = {}
  const input = parsed.data
  if ('status' in input) updates.status = input.status
  if ('end_date' in input) updates.end_date = input.end_date
  if ('notes' in input) updates.notes = input.notes
  if ('override_monthly_amount_cents' in input)
    updates.override_monthly_amount_cents = input.override_monthly_amount_cents
  if ('next_invoice_date' in input) updates.next_invoice_date = input.next_invoice_date

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabaseAdmin.from('subscriptions').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// ── DELETE (soft — marks canceled_by_admin) ───────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      cancel_reason: 'deleted_by_admin',
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
