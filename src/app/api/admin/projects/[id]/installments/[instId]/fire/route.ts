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
//
// 2026-05-13: Creates the invoice as `status='draft'` (not 'sent'). The
// admin reviews the PDF + line items + totals on /admin/invoices/[id]
// and clicks Issue & Send to flip status='sent' + dispatch the email.
// Prevents the SSMM-051326A class of bug (auto-send with wrong data;
// magic link goes live before admin notices). The response includes
// admin_review_url so the caller (OutstandingObligations Send-now
// button) can redirect immediately.

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
    await firePaymentInstallment(instId, { mode: 'draft' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Return the updated installment + new invoice + admin review URL so the
  // OutstandingObligations Send-now button can redirect immediately.
  const { data: updated } = await supabaseAdmin
    .from('payment_installments')
    .select('*, invoice:invoices!payment_installments_invoice_id_fkey(id, invoice_number, public_uuid, status)')
    .eq('id', instId)
    .single()

  const invoiceId = updated?.invoice?.id
  const adminReviewUrl = invoiceId ? `/admin/invoices/${invoiceId}` : null

  return NextResponse.json({
    ok: true,
    installment: updated,
    admin_review_url: adminReviewUrl,
    message: 'Draft invoice created — review on the admin page and click Issue & Send when ready.',
  })
}
