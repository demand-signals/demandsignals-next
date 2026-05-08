import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'

// POST /api/admin/cli-tokens/[id]/revoke
// Marks the token revoked. Idempotent — revoking an already-revoked
// token returns 200 with current state (no change).

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await params

  // Check current state (so we can no-op on already-revoked)
  const { data: existing } = await supabaseAdmin
    .from('cli_tokens')
    .select('id, revoked_at')
    .eq('id', id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (existing.revoked_at) {
    return NextResponse.json({ ok: true, already_revoked: true })
  }

  const { error } = await supabaseAdmin
    .from('cli_tokens')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: auth.admin.id,
      revoked_reason: 'manual',
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
