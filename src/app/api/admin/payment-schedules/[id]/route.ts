// ── GET / PATCH /api/admin/payment-schedules/[id] ───────────────────
// GET returns schedule + installments. PATCH allows editing pending
// installments only when the schedule is not locked (locked_at is null).

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

  const { data: schedule, error: schedErr } = await supabaseAdmin
    .from('payment_schedules')
    .select('*, sow:sow_documents(sow_number, title), project:projects(name)')
    .eq('id', id)
    .single()

  if (schedErr || !schedule) {
    return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
  }

  const { data: installments } = await supabaseAdmin
    .from('payment_installments')
    .select('*, invoice:invoices!payment_installments_invoice_id_fkey(invoice_number, status, public_uuid, total_due_cents)')
    .eq('schedule_id', id)
    .order('sequence', { ascending: true })

  return NextResponse.json({ schedule, installments: installments ?? [] })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: schedule } = await supabaseAdmin
    .from('payment_schedules')
    .select('id, locked_at')
    .eq('id', id)
    .single()

  if (!schedule) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (schedule.locked_at) {
    return NextResponse.json(
      { error: 'Schedule is locked (a payment has been received). Issue a change-order SOW for further changes.' },
      { status: 409 },
    )
  }

  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.installments)) {
    return NextResponse.json({ error: 'Body must include installments[]' }, { status: 400 })
  }

  for (const patch of body.installments as Array<{
    id: string
    amount_cents?: number
    trigger_date?: string
    description?: string
  }>) {
    const { data: row } = await supabaseAdmin
      .from('payment_installments')
      .select('status')
      .eq('id', patch.id)
      .single()
    if (!row || row.status !== 'pending') continue

    const updates: Record<string, unknown> = {}
    if (typeof patch.amount_cents === 'number') updates.amount_cents = patch.amount_cents
    if (patch.trigger_date !== undefined) updates.trigger_date = patch.trigger_date
    if (patch.description !== undefined) updates.description = patch.description

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin.from('payment_installments').update(updates).eq('id', patch.id)
    }
  }

  return NextResponse.json({ ok: true })
}
