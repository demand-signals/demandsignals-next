// PATCH /api/admin/projects/[id]/phases/[phaseId]
// Update a phase's status (and set completed_at) in the phases jsonb array.
// When status becomes 'completed', fire any payment_installments whose
// trigger_type='milestone' AND trigger_milestone_id=phaseId.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { firePaymentInstallment } from '@/lib/payment-plans'
import { activateSubscriptionsForPhase } from '@/lib/subscription-activation'
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

  const { status, force, name, description } = body as {
    status?: ProjectPhase['status']
    force?: boolean
    name?: string
    description?: string
  }

  // Validate status if present
  const isStatusUpdate = status !== undefined
  if (isStatusUpdate && !['pending', 'in_progress', 'completed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Validate name/description if present (string-only patches; no side effects)
  const isTextUpdate = name !== undefined || description !== undefined
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 })
  }
  if (description !== undefined && typeof description !== 'string') {
    return NextResponse.json({ error: 'description must be a string' }, { status: 400 })
  }
  if (!isStatusUpdate && !isTextUpdate) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
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

  const targetPhase = phases[phaseIdx]
  const wasCompleted = targetPhase.status === 'completed'

  // Text-only update path — patch name/description and return early.
  // No status change → no milestone firing, no auto-advance, no
  // un-delivered guard.
  if (!isStatusUpdate) {
    const updatedPhases = phases.map((p, i) => {
      if (i !== phaseIdx) return p
      return {
        ...p,
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description } : {}),
      }
    })
    const { error: textErr } = await supabaseAdmin
      .from('projects')
      .update({ phases: updatedPhases, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (textErr) return NextResponse.json({ error: textErr.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── Status update path ──────────────────────────────────────────
  // status is guaranteed defined here (early-returned above if !isStatusUpdate)
  const newStatus = status as ProjectPhase['status']

  // Guard: cannot complete a phase with un-delivered deliverables.
  // This protects against accidental phase completion that would otherwise
  // fire any milestone-triggered payment installments prematurely.
  // Admin can pass force=true to override (e.g. backfilling historical data).
  if (newStatus === 'completed' && !wasCompleted && !force) {
    const undelivered = (targetPhase.deliverables ?? []).filter(
      (d) => d.status !== 'delivered',
    )
    if (undelivered.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot complete phase: deliverables are not yet delivered',
          undelivered_count: undelivered.length,
          undelivered_names: undelivered.map((d) => d.name),
          hint: 'Mark each deliverable as Delivered first, or pass force=true to override.',
        },
        { status: 409 },
      )
    }
  }

  const updatedPhases = phases.map((p, i) => {
    if (i !== phaseIdx) return p
    return {
      ...p,
      status: newStatus,
      // Allow text fields to update in same call as status if both provided
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description } : {}),
      completed_at: newStatus === 'completed' ? new Date().toISOString() : p.completed_at ?? null,
    }
  })

  // ── Auto-advance project status from phase progression ──
  // planning → in_progress when any phase moves to in_progress or completed
  // in_progress → completed when ALL phases are completed
  const anyActive = updatedPhases.some((p) => p.status === 'in_progress' || p.status === 'completed')
  const allCompleted = updatedPhases.length > 0 && updatedPhases.every((p) => p.status === 'completed')

  const projectUpdate: Record<string, unknown> = {
    phases: updatedPhases,
    updated_at: new Date().toISOString(),
  }

  // Pull current project status to decide whether to advance.
  const { data: currentProj } = await supabaseAdmin
    .from('projects')
    .select('status, completed_at, start_date')
    .eq('id', id)
    .maybeSingle()

  const currentStatus = currentProj?.status ?? 'planning'
  if (allCompleted && currentStatus !== 'completed') {
    projectUpdate.status = 'completed'
    projectUpdate.completed_at = new Date().toISOString()
  } else if (!allCompleted && anyActive && currentStatus === 'planning') {
    projectUpdate.status = 'in_progress'
    if (!currentProj?.start_date) {
      projectUpdate.start_date = new Date().toISOString().slice(0, 10)
    }
  } else if (!anyActive && currentStatus === 'completed') {
    // Reverting (e.g. force-uncomplete): drop back to in_progress.
    projectUpdate.status = 'in_progress'
    projectUpdate.completed_at = null
  }

  const { error: updateErr } = await supabaseAdmin
    .from('projects')
    .update(projectUpdate)
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // ── Fire milestone-triggered installments ──────────────────────────
  // Only when transitioning into 'completed' (avoids re-firing on idempotent re-PATCH).
  const firedInstallments: string[] = []
  const activatedSubscriptions: Array<{ id: string; stripe_subscription_id: string | null; error: string | null }> = []
  if (newStatus === 'completed' && !wasCompleted) {
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

    // ── Activate deferred-start subscriptions ────────────────────────
    // Any subscriptions with activation_phase_id = phaseId AND
    // status='trialing' AND no Stripe linkage get activated now:
    // Stripe sub created, status flipped to 'active'.
    const subResults = await activateSubscriptionsForPhase(phaseId)
    activatedSubscriptions.push(...subResults)
  }

  return NextResponse.json({
    ok: true,
    fired_installments: firedInstallments,
    activated_subscriptions: activatedSubscriptions,
  })
}
