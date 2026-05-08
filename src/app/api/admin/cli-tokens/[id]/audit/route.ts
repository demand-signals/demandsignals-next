import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'

// GET /api/admin/cli-tokens/[id]/audit?limit=50&offset=0
// Returns paginated cli_token_audit rows for the given token.

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await params
  const sp = request.nextUrl.searchParams
  const limit = Math.min(parseInt(sp.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, MAX_LIMIT)
  const offset = Math.max(parseInt(sp.get('offset') || '0', 10) || 0, 0)

  const { data, count, error } = await supabaseAdmin
    .from('cli_token_audit')
    .select('id, method, path, status_code, ip, user_agent, failure_reason, created_at', {
      count: 'exact',
    })
    .eq('cli_token_id', id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    audit: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  })
}
