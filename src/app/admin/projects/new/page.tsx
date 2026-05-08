'use client'

// /admin/projects/new — thin wrapper that mounts NewProjectModal.
//
// Pre-fills prospect_id from the ?prospect_id= query param so links from
// the client view (/admin/clients/[id]) auto-scope the new project to
// that client. On close (cancel or successful create) we route back to
// the projects list — the modal itself handles the redirect to the
// new project's detail page on save.

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { NewProjectModal } from '../NewProjectModal'

export default function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ prospect_id?: string }>
}) {
  const sp = use(searchParams)
  const router = useRouter()
  return (
    <NewProjectModal
      defaultProspectId={sp.prospect_id ?? ''}
      onClose={() => router.push('/admin/projects')}
    />
  )
}
