import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'

// GET /api/admin/cli-tokens/[id]
// Returns a single token's display fields. NEVER returns plaintext or hash.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await params

  const { data: token } = await supabaseAdmin
    .from('cli_tokens')
    .select(
      'id, name, prefix, last4, created_at, expires_at, last_used_at, revoked_at, revoked_by, revoked_reason, created_by',
    )
    .eq('id', id)
    .maybeSingle()

  if (!token) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Join admin display names
  const adminIds = [token.created_by, token.revoked_by].filter((v): v is string => !!v)
  let adminMap = new Map<string, { display_name: string | null; email: string | null }>()
  if (adminIds.length > 0) {
    const { data: admins } = await supabaseAdmin
      .from('admin_users')
      .select('id, display_name, email')
      .in('id', adminIds)
    adminMap = new Map((admins ?? []).map((a) => [a.id, { display_name: a.display_name, email: a.email }]))
  }

  return NextResponse.json({
    token: {
      ...token,
      created_by_admin: adminMap.get(token.created_by) ?? null,
      revoked_by_admin: token.revoked_by ? adminMap.get(token.revoked_by) ?? null : null,
    },
  })
}
