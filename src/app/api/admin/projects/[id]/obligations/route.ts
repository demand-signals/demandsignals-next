// ── GET /api/admin/projects/[id]/obligations ────────────────────────
// Returns the project's outstanding obligations: pending payment installments
// (cash + TIK) and open trade_credits ledgers.

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

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id, prospect_id')
    .eq('id', id)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { data: schedule } = await supabaseAdmin
    .from('payment_schedules')
    .select('id')
    .eq('project_id', id)
    .maybeSingle()

  let installments: unknown[] = []
  if (schedule) {
    const { data: rows } = await supabaseAdmin
      .from('payment_installments')
      .select('*, invoice:invoices!payment_installments_invoice_id_fkey(invoice_number, public_uuid, status)')
      .eq('schedule_id', schedule.id)
      .order('sequence', { ascending: true })
    installments = rows ?? []
  }

  const { data: tradeCredits } = await supabaseAdmin
    .from('trade_credits')
    .select('id, original_amount_cents, remaining_cents, description, status')
    .eq('prospect_id', project.prospect_id)
    .in('status', ['outstanding', 'partial'])

  return NextResponse.json({
    installments,
    trade_credits: tradeCredits ?? [],
  })
}
