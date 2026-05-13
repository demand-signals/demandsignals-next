// ── POST /api/admin/projects/[id]/installments/[instId]/fire ─────────
// Manually fire a pending payment installment. Used as the safety valve
// when an installment's natural trigger (milestone phase complete, time
// schedule, on_completion_of_payment cascade) hasn't fired automatically
// — e.g. a backfilled project, or the admin wants to bill ahead of the
// trigger.
//
// Idempotent: firePaymentInstallment() no-ops if status != 'pending'.
// The installment's trigger_type is irrelevant to manual firing — this
// just calls the same orchestrator the cron / phase-complete handler
// would call.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { firePaymentInstallment } from '@/lib/payment-plans'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; instId: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id: projectId, instId } = await params

  // Verify installment belongs to this project (via schedule.project_id)
  const { data: installment } = await supabaseAdmin
    .from('payment_installments')
    .select('id, status, schedule:payment_schedules(project_id)')
    .eq('id', instId)
    .single()

  if (!installment) {
    return NextResponse.json({ error: 'Installment not found' }, { status: 404 })
  }

  // schedule comes back as either object or array depending on supabase-js version
  const schedule = Array.isArray(installment.schedule) ? installment.schedule[0] : installment.schedule
  if (schedule?.project_id !== projectId) {
    return NextResponse.json({ error: 'Installment does not belong to this project' }, { status: 400 })
  }

  if (installment.status !== 'pending') {
    return NextResponse.json(
      { error: `Installment status is "${installment.status}" — only pending installments can be fired` },
      { status: 409 },
    )
  }

  try {
    await firePaymentInstallment(instId, { sendInvoice: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Return the updated installment + new invoice
  const { data: updated } = await supabaseAdmin
    .from('payment_installments')
    .select('*, invoice:invoices!payment_installments_invoice_id_fkey(invoice_number, public_uuid, status)')
    .eq('id', instId)
    .single()

  return NextResponse.json({ ok: true, installment: updated })
}
