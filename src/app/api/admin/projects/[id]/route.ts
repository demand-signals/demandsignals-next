// GET /api/admin/projects/[id]   — fetch project detail
// PATCH /api/admin/projects/[id] — update project top-level fields

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getProjectFinancials } from '@/lib/project-financials'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  const { id } = await params

  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select(`
      id, name, type, status, start_date, target_date, completed_at,
      monthly_value, notes, phases, created_at, updated_at,
      prospect_id, deal_id, sow_document_id,
      prospects ( id, business_name, owner_name, owner_email, owner_phone, is_client ),
      sow_documents ( sow_number )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Flatten sow_number for convenience
  const { sow_documents, ...rest } = project as any
  const projectOut = { ...rest, sow_number: sow_documents?.sow_number ?? null }

  // Aggregate invoices, receipts, subscriptions, monthly rollup.
  const financials = await getProjectFinancials({
    projectId: id,
    prospectId: rest.prospect_id,
    sowDocumentId: rest.sow_document_id,
  })

  return NextResponse.json({ project: projectOut, financials })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const allowed = ['name', 'type', 'status', 'start_date', 'target_date', 'completed_at', 'monthly_value', 'notes']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  // Phases jsonb edit path — for the full-page edit form. Lets admin
  // restructure phases + deliverables (rename, reorder, add/remove,
  // change pricing) in one save. Status changes are intentionally
  // BLOCKED here: phase + deliverable status flips must go through
  // /api/admin/projects/[id]/phases/[phaseId] and /deliverables/[id]
  // which fire milestone-triggered payment_installments and run the
  // project auto-advance state machine. A bulk write that bypassed
  // those endpoints would lose those side effects.
  if ('phases' in body) {
    if (!Array.isArray(body.phases)) {
      return NextResponse.json({ error: 'phases must be an array' }, { status: 400 })
    }

    // Load existing phases for status diff
    const { data: current, error: loadErr } = await supabaseAdmin
      .from('projects')
      .select('phases')
      .eq('id', id)
      .maybeSingle()
    if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 })
    if (!current) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const existing = (current.phases ?? []) as Array<{
      id: string
      status?: string
      completed_at?: string | null
      deliverables?: Array<{ id: string; status?: string; delivered_at?: string | null }>
    }>
    const existingPhaseById = new Map(existing.map((p) => [p.id, p]))
    const existingDelivById = new Map<string, { status?: string; delivered_at?: string | null }>()
    for (const p of existing) {
      for (const d of p.deliverables ?? []) {
        existingDelivById.set(d.id, { status: d.status, delivered_at: d.delivered_at })
      }
    }

    // Sanitize the submitted phases: preserve status + completed_at
    // from existing rows by id; never trust client-supplied status.
    type SubmittedPhase = {
      id?: string
      name?: string
      description?: string
      deliverables?: Array<{
        id?: string
        service_id?: string | null
        name?: string
        description?: string
        cadence?: string
        quantity?: number
        hours?: number | null
        unit_price_cents?: number
        line_total_cents?: number
      }>
    }
    const submitted = body.phases as SubmittedPhase[]
    const sanitizedPhases = submitted.map((p) => {
      const existingP = p.id ? existingPhaseById.get(p.id) : null
      return {
        id: p.id || crypto.randomUUID(),
        name: typeof p.name === 'string' ? p.name : '',
        description: typeof p.description === 'string' ? p.description : '',
        // Status + completion always inherited from existing row (or
        // 'pending' for newly-added phases). Never trust submitted value.
        status: existingP?.status ?? 'pending',
        completed_at: existingP?.completed_at ?? null,
        deliverables: (p.deliverables ?? []).map((d) => {
          const existingD = d.id ? existingDelivById.get(d.id) : null
          return {
            id: d.id || crypto.randomUUID(),
            service_id: d.service_id ?? null,
            name: typeof d.name === 'string' ? d.name : '',
            description: typeof d.description === 'string' ? d.description : '',
            cadence: d.cadence ?? 'one_time',
            quantity: d.quantity ?? 1,
            hours: d.hours ?? null,
            unit_price_cents: d.unit_price_cents ?? 0,
            line_total_cents: d.line_total_cents ?? 0,
            status: existingD?.status ?? 'pending',
            delivered_at: existingD?.delivered_at ?? null,
          }
        }),
      }
    })

    updates.phases = sanitizedPhases
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  const { error } = await supabaseAdmin.from('projects').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// Delete a project. Cascades child rows (time entries) explicitly. Linked
// payment_schedules.project_id, sow_documents.id, and invoices stay intact —
// money artifacts must survive project deletion for accounting.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error
  const { id } = await params

  // Time entries are CASCADE on FK already, but be explicit for clarity.
  await supabaseAdmin.from('project_time_entries').delete().eq('project_id', id)

  // Detach payment schedules (don't delete them — they belong to the SOW).
  await supabaseAdmin.from('payment_schedules').update({ project_id: null }).eq('project_id', id)

  const { error } = await supabaseAdmin.from('projects').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
