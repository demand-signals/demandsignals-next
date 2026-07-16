// ── /api/admin/msa — list Master Service Agreements ──────────────────

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const sp = request.nextUrl.searchParams
  const status = sp.get('status')
  const prospectId = sp.get('prospect_id')

  // Note: two FKs between msa_documents and prospects (prospect_id +
  // prospects.executed_msa_id) → must name the FK explicitly.
  let q = supabaseAdmin
    .from('msa_documents')
    .select(
      'id, msa_number, status, client_legal_name, client_code, effective_date, ' +
      'prospect_id, sent_at, viewed_at, executed_at, created_at, ' +
      'prospects!prospect_id(business_name)',
    )
    .order('created_at', { ascending: false })

  if (status) q = q.eq('status', status)
  if (prospectId) q = q.eq('prospect_id', prospectId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ msas: data ?? [] })
}
