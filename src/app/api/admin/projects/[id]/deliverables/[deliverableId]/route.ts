// PATCH /api/admin/projects/[id]/deliverables/[deliverableId]
// Update a deliverable's status in the phases jsonb array.
// Body must include: { phase_id: string, status: 'pending' | 'delivered' }

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { ProjectPhase, ProjectPhaseDeliverable } from '@/lib/invoice-types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; deliverableId: string }> },
) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  const { id, deliverableId } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { phase_id, status } = body as {
    phase_id: string
    status: ProjectPhaseDeliverable['status']
  }
  if (!phase_id) return NextResponse.json({ error: 'phase_id required' }, { status: 400 })
  if (!['pending', 'delivered'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Fetch current phases
  const { data: project, error: fetchErr } = await supabaseAdmin
    .from('projects')
    .select('phases')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const phases = (project.phases ?? []) as ProjectPhase[]
  const phaseIdx = phases.findIndex((p) => p.id === phase_id)
  if (phaseIdx === -1) return NextResponse.json({ error: 'Phase not found' }, { status: 404 })

  const delivIdx = phases[phaseIdx].deliverables.findIndex((d) => d.id === deliverableId)
  if (delivIdx === -1) return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 })

  const updatedPhases = phases.map((phase, pi) => {
    if (pi !== phaseIdx) return phase
    return {
      ...phase,
      deliverables: phase.deliverables.map((d, di) => {
        if (di !== delivIdx) return d
        return {
          ...d,
          status,
          delivered_at: status === 'delivered' ? new Date().toISOString() : null,
        }
      }),
    }
  })

  const { error: updateErr } = await supabaseAdmin
    .from('projects')
    .update({ phases: updatedPhases, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
