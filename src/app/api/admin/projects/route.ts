// GET /api/admin/projects — list projects (most recent first)
// Each row is enriched with invoice/receipt rollups for the index view:
//   • invoice_count, paid_invoice_count
//   • total_invoiced_cents, total_paid_cents
//   • active_monthly_cents (live sum of active subscriptions on this prospect)

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getProjectFinancials } from '@/lib/project-financials'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('id, name, status, start_date, monthly_value, created_at, prospect_id, sow_document_id, prospects(business_name, is_client)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich each project with financials. Run in parallel — these are
  // small reads and Supabase pooler handles fan-out fine for the project
  // counts admin is likely to have (tens, not thousands).
  const projects = await Promise.all(
    (data ?? []).map(async (p: any) => {
      const f = await getProjectFinancials({
        projectId: p.id,
        prospectId: p.prospect_id,
        sowDocumentId: p.sow_document_id,
      })
      return {
        ...p,
        invoice_count: f.invoices.length,
        paid_invoice_count: f.invoices.filter((i) => i.status === 'paid').length,
        total_invoiced_cents: f.total_invoiced_cents,
        total_paid_cents: f.total_paid_cents,
        active_monthly_cents: f.active_monthly_cents,
      }
    }),
  )

  return NextResponse.json({ projects })
}

// Create a project standalone (not via SOW accept). Useful for retro-loading
// existing engagements or starting a project before any SOW exists.
const ALLOWED_TYPES = new Set(['website', 'mobile_app', 'webapp', 'content', 'seo', 'ads', 'consulting', 'other'])
const ALLOWED_STATUSES = new Set(['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'])

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const prospect_id = typeof body.prospect_id === 'string' ? body.prospect_id : null
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!prospect_id) return NextResponse.json({ error: 'prospect_id is required' }, { status: 400 })

  const type = typeof body.type === 'string' && ALLOWED_TYPES.has(body.type) ? body.type : 'website'
  const status = typeof body.status === 'string' && ALLOWED_STATUSES.has(body.status) ? body.status : 'planning'

  const insert: Record<string, unknown> = {
    name,
    prospect_id,
    type,
    status,
    start_date:    typeof body.start_date === 'string' && body.start_date ? body.start_date : null,
    target_date:   typeof body.target_date === 'string' && body.target_date ? body.target_date : null,
    monthly_value: typeof body.monthly_value === 'number' ? body.monthly_value : null,
    notes:         typeof body.notes === 'string' ? body.notes : null,
    sow_document_id: typeof body.sow_document_id === 'string' && body.sow_document_id ? body.sow_document_id : null,
    deal_id:       typeof body.deal_id === 'string' && body.deal_id ? body.deal_id : null,
    phases:        Array.isArray(body.phases) ? body.phases : [],
  }

  const { data, error } = await supabaseAdmin
    .from('projects')
    .insert(insert)
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id }, { status: 201 })
}
