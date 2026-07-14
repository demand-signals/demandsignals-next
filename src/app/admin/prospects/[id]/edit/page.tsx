// /admin/prospects/[id]/edit — full-page prospect edit form.
//
// Server component. Fetches the prospect + demos and hands them to
// <ProspectEditForm>. Replaces the old modal edit surface. If the row is
// already a client, redirect to the client edit page.

import { notFound, redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ProspectEditForm } from '@/components/admin/prospect-edit-form'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditProspectPage({ params }: PageProps) {
  const { id } = await params

  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!prospect) notFound()
  if (prospect.is_client) redirect(`/admin/clients/${id}/edit`)

  const [demosRes, dealsRes] = await Promise.all([
    supabaseAdmin.from('demos').select('*').eq('prospect_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('deals').select('*').eq('prospect_id', id).order('created_at', { ascending: false }),
  ])

  return (
    <ProspectEditForm
      prospect={{ ...prospect, demos: demosRes.data ?? [], deals: dealsRes.data ?? [] }}
      returnTo={`/admin/prospects/${id}`}
    />
  )
}
