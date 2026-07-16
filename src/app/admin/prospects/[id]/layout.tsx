import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Lifecycle redirect: if this prospect has been promoted to a client,
// the canonical URL is /admin/clients/[id]. Bookmarks and old links
// keep working — they redirect here. The detail UI for clients lives
// at the clients route; this prospect route renders only when
// is_client = false.
//
// Spec: docs/superpowers/specs/2026-05-08-prospect-client-lifecycle-views-design.md
export default async function ProspectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Honor ?keepView=1 — lets admins open the full prospect view for a
  // promoted client (e.g. the "Open full prospect view" link on the client
  // page). Layouts don't receive searchParams, so read the query string from
  // the x-search header set by middleware.
  const hdrs = await headers()
  const search = hdrs.get('x-search') ?? ''
  const keepView = /[?&]keepView=1(&|$)/.test(search)

  const { data } = await supabaseAdmin
    .from('prospects')
    .select('is_client')
    .eq('id', id)
    .maybeSingle()
  if (data?.is_client === true && !keepView) {
    redirect(`/admin/clients/${id}`)
  }
  return <>{children}</>
}
