// ── /api/admin/sow/[id]/preview — GET HTML preview ─────────────────

import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { renderSowHtml } from '@/lib/doc-preview'

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await ctx.params

  const { data: sow } = await supabaseAdmin
    .from('sow_documents').select('*, prospect:prospect_id(*)')
    .eq('id', id).single()
  if (!sow) return new Response('Not found', { status: 404 })

  const prospect = (sow as any).prospect ?? {}
  const html = renderSowHtml(sow, {
    business_name: prospect.business_name ?? '—',
    owner_name: prospect.owner_name,
    owner_email: prospect.owner_email,
    business_email: prospect.business_email,
    owner_phone: prospect.owner_phone,
    business_phone: prospect.business_phone,
    address: prospect.address,
    city: prospect.city,
    state: prospect.state,
    zip: prospect.zip,
  })
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
