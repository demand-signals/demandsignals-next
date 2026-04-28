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
