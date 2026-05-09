'use client'

// /admin/projects/new — thin wrapper that mounts the unified ProjectForm
// modal. Project creation supports phases + deliverables (matching the
// data model and SOW form), but skips the client-acceptance / PDF send
// dance. Used both standalone (link from client view) and from
// shortcuts ("Log support contact" -> ?type=customer_service).

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { NewProjectModal } from '../NewProjectModal'

const VALID_TYPES = new Set([
  'website', 'mobile_app', 'webapp', 'content', 'seo', 'ads', 'consulting',
  'customer_service', 'bug_report', 'internal', 'courtesy', 'other',
])

export default function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ prospect_id?: string; type?: string }>
}) {
  const sp = use(searchParams)
  const router = useRouter()
  const validType = sp.type && VALID_TYPES.has(sp.type) ? sp.type : undefined
  return (
    <NewProjectModal
      defaultProspectId={sp.prospect_id ?? ''}
      defaultType={validType as any}
      onClose={() => router.push('/admin/projects')}
    />
  )
}
