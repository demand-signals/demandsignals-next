// PATCH /api/admin/projects/[id]/phases/[phaseId]
// Update a phase's status (and set completed_at) in the phases jsonb array.
// When status becomes 'completed', fire any payment_installments whose
// trigger_type='milestone' AND trigger_milestone_id=phaseId.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { firePaymentInstallment } from '@/lib/payment-plans'
import type { ProjectPhase } from '@/lib/invoice-types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; phaseId: string }> },
) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  const { id, phaseId } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { status } = body as { status: ProjectPhase['status'] }
  if (!['pending', 'in_progress', 'completed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { data: project, error: fetchErr } = await supabaseAdmin
    .from('projects')
    .select('phases')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const phases = (project.phases ?? []) as ProjectPhase[]
  const phaseIdx = phases.findIndex((p) => p.id === phaseId)
  if (phaseIdx === -1) return NextResponse.json({ error: 'Phase not found' }, { status: 404 })

  const wasCompleted = phases[phaseIdx].status === 'completed'

  const updatedPhases = phases.map((p, i) => {
    if (i !== phaseIdx) return p
    return {
      ...p,
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : p.completed_at ?? null,
    }
  })

  const { error: updateErr } = await supabaseAdmin
    .from('projects')
    .update({ phases: updatedPhases, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // ── Fire milestone-triggered installments ──────────────────────────
  // Only when transitioning into 'completed' (avoids re-firing on idempotent re-PATCH).
  const firedInstallments: string[] = []
  if (status === 'completed' && !wasCompleted) {
    const { data: pendingInstallments } = await supabaseAdmin
      .from('payment_installments')
      .select('id')
      .eq('trigger_type', 'milestone')
      .eq('trigger_milestone_id', phaseId)
      .eq('status', 'pending')

    for (const inst of pendingInstallments ?? []) {
      try {
        await firePaymentInstallment(inst.id, { sendInvoice: true })
        firedInstallments.push(inst.id)
      } catch (e) {
        console.error('[phase-complete] fire installment failed', inst.id, e)
      }
    }
  }

  return NextResponse.json({ ok: true, fired_installments: firedInstallments })
}
