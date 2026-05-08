import { redirect } from 'next/navigation'
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
  const { data } = await supabaseAdmin
    .from('prospects')
    .select('is_client')
    .eq('id', id)
    .maybeSingle()
  if (data?.is_client === true) {
    redirect(`/admin/clients/${id}`)
  }
  return <>{children}</>
}
