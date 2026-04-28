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

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  const { error } = await supabaseAdmin.from('projects').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
