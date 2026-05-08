import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET /api/admin/portal-view-as/[id]
// Admin-only. Sets the dsig_portal_view_as cookie so subsequent
// /portal/* requests render that prospect's portal. The portal
// layout shows a "Viewing as client" banner when the cookie is
// present and the requester is an admin.
//
// 302 → /portal after setting the cookie.
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md (rev) — admin "view as"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://demandsignals.co'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await params

  // Confirm the prospect exists + is_client (don't allow view-as for
  // a non-client record — there's no portal context to render).
  const { data } = await supabaseAdmin
    .from('prospects')
    .select('id')
    .eq('id', id)
    .eq('is_client', true)
    .maybeSingle()
  if (!data) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const res = NextResponse.redirect(new URL('/portal', SITE_URL))
  res.cookies.set('dsig_portal_view_as', id, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    domain: 'demandsignals.co',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours — admin session-scoped, not persistent
  })
  return res
}
