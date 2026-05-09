// /admin/projects/[id]/edit — full-page project edit form.
//
// Server component. Fetches the project + phases jsonb server-side
// and hands them to <EditProjectForm> as initial state. Mirrors
// /admin/projects/new shape — same UI as the create flow, just
// pre-populated and PATCHing instead of POSTing.

import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { ProjectPhase } from '@/lib/invoice-types'
import { EditProjectForm } from '../EditProjectForm'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditProjectPage({ params }: PageProps) {
  const { id } = await params

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id, name, type, status, start_date, target_date, completed_at, monthly_value, notes, phases')
    .eq('id', id)
    .maybeSingle()

  if (!project) notFound()

  return (
    <EditProjectForm
      initial={{
        id: project.id,
        name: project.name,
        type: project.type,
        status: project.status,
        start_date: project.start_date,
        target_date: project.target_date,
        completed_at: project.completed_at,
        monthly_value: project.monthly_value,
        notes: project.notes,
        phases: (project.phases ?? []) as ProjectPhase[],
      }}
    />
  )
}

