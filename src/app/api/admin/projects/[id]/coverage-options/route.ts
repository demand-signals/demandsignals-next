// GET /api/admin/projects/[id]/coverage-options
//
// Returns the candidate invoices + subscriptions a time entry on this
// project can be attached to via category=bulk_payment / services_contract
// (see migration 051). Project-scoped: invoices come from the project's
// SOW + the prospect's standalone invoices; subscriptions come from the
// project's prospect.

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

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id, prospect_id, sow_document_id')
    .eq('id', id)
    .maybeSingle()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const fin = await getProjectFinancials({
    projectId: project.id,
    prospectId: project.prospect_id,
    sowDocumentId: project.sow_document_id,
  })

  const invoices = fin.invoices.map((i) => ({
    id: i.id,
    label: `${i.invoice_number} · $${(i.total_due_cents / 100).toFixed(2)} · ${i.status}`,
  }))
  const subscriptions = fin.subscriptions.map((s) => ({
    id: s.id,
    label: `${s.plan_name ?? 'Subscription'} · $${(s.monthly_value_cents / 100).toFixed(2)}/mo · ${s.status}`,
  }))

  return NextResponse.json({ invoices, subscriptions })
}
