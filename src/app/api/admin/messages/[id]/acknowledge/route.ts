// ── POST /api/admin/messages/[id]/acknowledge ───────────────────────
// Marks a system_notifications row as acknowledged. Stamps
// acknowledged_at + acknowledged_by (current admin user).

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { error } = await supabaseAdmin
    .from('system_notifications')
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: auth.user?.id ?? null,
    })
    .eq('id', id)
    .is('acknowledged_at', null) // idempotent: only ack unack'd rows

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
