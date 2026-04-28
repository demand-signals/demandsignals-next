import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface Params { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: quote } = await supabaseAdmin
    .from('quote_sessions')
    .select('id, doc_number, status, share_token, estimate_low, estimate_high, monthly_low, monthly_high, missed_leads_monthly, avg_customer_value, business_type, person_role, build_path, research_findings, created_at')
    .eq('prospect_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (quote) {
    // scope_summary lives on prospects, not quote_sessions — fold it in for the panel.
    const { data: prospect } = await supabaseAdmin
      .from('prospects').select('scope_summary').eq('id', id).single()
    ;(quote as Record<string, unknown>).scope_summary = prospect?.scope_summary ?? null
  }
  return NextResponse.json({ quote: quote ?? null })
}
