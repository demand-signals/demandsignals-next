// ── /api/admin/invoices/[id]/payment-plan ────────────────────────────
//
// POST: split an invoice into N installments. Body: {
//   installments: Array<{
//     sequence: number,
//     amount_cents: number,
//     description?: string,
//     trigger_type: 'time' | 'on_acceptance',
//     trigger_date?: string,            // YYYY-MM-DD when trigger_type='time'
//     currency_type: 'cash' | 'tik',
//     expected_payment_method?: 'card' | 'check' | 'wire' | 'ach' | 'unspecified',
//   }>
// }
// Validates that:
//   - installments sum to invoice.total_due_cents
//   - sequence is unique and starts at 1
//   - time-triggered installments have trigger_date set
//   - invoice has no existing payment_schedule
//
// Creates one payment_schedule (parent_invoice_id = invoice.id) +
// N payment_installments rows. Returns the created schedule.
//
// GET: returns the existing schedule + installments for this invoice
// (or { schedule: null } if none).

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface InstallmentRequest {
  sequence: number
  amount_cents: number
  description?: string
  trigger_type: 'time' | 'on_acceptance'
  trigger_date?: string
  currency_type: 'cash' | 'tik'
  expected_payment_method?: 'card' | 'check' | 'wire' | 'ach' | 'unspecified'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const installments: InstallmentRequest[] = Array.isArray(body.installments) ? body.installments : []

  if (installments.length < 2) {
    return NextResponse.json(
      { error: 'A payment plan needs at least 2 installments. For a one-off invoice, just send the invoice.' },
      { status: 400 },
    )
  }

  // Pre-validate sequences are unique 1..N.
  const seqs = installments.map((i) => i.sequence).sort((a, b) => a - b)
  for (let i = 0; i < seqs.length; i++) {
    if (seqs[i] !== i + 1) {
      return NextResponse.json(
        { error: 'sequence must be 1..N with no gaps or duplicates' },
        { status: 400 },
      )
    }
  }

  // Time-triggered installments need a trigger_date.
  for (const inst of installments) {
    if (inst.trigger_type === 'time' && !inst.trigger_date) {
      return NextResponse.json(
        { error: `Installment ${inst.sequence} is time-triggered but has no trigger_date` },
        { status: 400 },
      )
    }
    if (inst.amount_cents <= 0) {
      return NextResponse.json(
        { error: `Installment ${inst.sequence} amount_cents must be positive` },
        { status: 400 },
      )
    }
    if (!['cash', 'tik'].includes(inst.currency_type)) {
      return NextResponse.json(
        { error: `Installment ${inst.sequence} currency_type must be cash or tik` },
        { status: 400 },
      )
    }
  }

  // Load invoice + verify state.
  const { data: invoice } = await supabaseAdmin
    .from('invoices')
    .select('id, invoice_number, status, total_due_cents, prospect_id')
    .eq('id', id)
    .maybeSingle()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (!['draft', 'sent', 'viewed'].includes(invoice.status)) {
    return NextResponse.json(
      { error: `Cannot apply a payment plan to an invoice in status ${invoice.status}` },
      { status: 409 },
    )
  }

  // Sum check.
  const sum = installments.reduce((s, i) => s + i.amount_cents, 0)
  if (sum !== invoice.total_due_cents) {
    return NextResponse.json(
      { error: `Installments sum to ${sum} cents but invoice total is ${invoice.total_due_cents} cents` },
      { status: 400 },
    )
  }

  // Reject if a schedule already exists for this invoice.
  const { data: existing } = await supabaseAdmin
    .from('payment_schedules')
    .select('id')
    .eq('parent_invoice_id', id)
    .maybeSingle()
  if (existing) {
    return NextResponse.json(
      { error: 'A payment plan already exists for this invoice. Delete it first to create a new one.' },
      { status: 409 },
    )
  }

  // Create the schedule.
  const { data: schedule, error: schedErr } = await supabaseAdmin
    .from('payment_schedules')
    .insert({
      parent_invoice_id: id,
      total_cents: invoice.total_due_cents,
    })
    .select('id')
    .single()

  if (schedErr || !schedule) {
    return NextResponse.json({ error: schedErr?.message ?? 'Failed to create schedule' }, { status: 500 })
  }

  // Create installments.
  const installmentRows = installments.map((inst) => ({
    schedule_id: schedule.id,
    sequence: inst.sequence,
    amount_cents: inst.amount_cents,
    currency_type: inst.currency_type,
    expected_payment_method: inst.expected_payment_method ?? null,
    trigger_type: inst.trigger_type,
    trigger_date: inst.trigger_type === 'time' ? inst.trigger_date : null,
    description: inst.description ?? `Installment ${inst.sequence} of ${installments.length} for ${invoice.invoice_number}`,
    status: 'pending',
  }))

  const { data: insertedInst, error: instErr } = await supabaseAdmin
    .from('payment_installments')
    .insert(installmentRows)
    .select('*')

  if (instErr) {
    // Compensating delete: don't leave an orphan schedule.
    await supabaseAdmin.from('payment_schedules').delete().eq('id', schedule.id)
    return NextResponse.json({ error: instErr.message }, { status: 500 })
  }

  return NextResponse.json({
    schedule_id: schedule.id,
    installments: insertedInst ?? [],
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: schedule } = await supabaseAdmin
    .from('payment_schedules')
    .select('id, total_cents, locked_at, created_at')
    .eq('parent_invoice_id', id)
    .maybeSingle()

  if (!schedule) return NextResponse.json({ schedule: null, installments: [] })

  const { data: installments } = await supabaseAdmin
    .from('payment_installments')
    .select('*')
    .eq('schedule_id', schedule.id)
    .order('sequence', { ascending: true })

  return NextResponse.json({ schedule, installments: installments ?? [] })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: schedule } = await supabaseAdmin
    .from('payment_schedules')
    .select('id, locked_at')
    .eq('parent_invoice_id', id)
    .maybeSingle()

  if (!schedule) return NextResponse.json({ ok: true, deleted: false })
  if (schedule.locked_at) {
    return NextResponse.json(
      { error: 'Payment plan is locked (an installment has been paid). Cannot delete.' },
      { status: 409 },
    )
  }

  // ON DELETE CASCADE on payment_installments.schedule_id removes the children.
  const { error } = await supabaseAdmin
    .from('payment_schedules')
    .delete()
    .eq('id', schedule.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, deleted: true })
}
