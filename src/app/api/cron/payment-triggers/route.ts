// ── GET /api/cron/payment-triggers ──────────────────────────────────
// Daily cron. Finds payment_installments with trigger_type='time' AND
// trigger_date <= today AND status='pending', and fires each.
//
// Auth: Bearer token matches CRON_SECRET. Vercel Cron supplies this header.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { firePaymentInstallment } from '@/lib/payment-plans'
import { verifyBearerSecret } from '@/lib/bearer-auth'

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  if (!verifyBearerSecret(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)

  const { data: due, error } = await supabaseAdmin
    .from('payment_installments')
    .select('id, sequence, amount_cents, trigger_date')
    .eq('trigger_type', 'time')
    .eq('status', 'pending')
    .lte('trigger_date', today)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const fired: Array<{ id: string; result: 'fired' | 'error'; message?: string }> = []
  for (const row of due ?? []) {
    try {
      await firePaymentInstallment(row.id, { sendInvoice: true })
      fired.push({ id: row.id, result: 'fired' })
    } catch (e) {
      fired.push({
        id: row.id,
        result: 'error',
        message: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return NextResponse.json({
    ran_at: new Date().toISOString(),
    today,
    found: due?.length ?? 0,
    fired,
  })
}
