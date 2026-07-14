import Link from 'next/link'
import { Pencil } from 'lucide-react'

// Links to the full-page client editor. (Was a modal launcher; the edit
// surface is now a dedicated page at /admin/clients/[id]/edit.)
export function EditClientButton({ prospectId }: { prospectId: string }) {
  return (
    <Link
      href={`/admin/clients/${prospectId}/edit`}
      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-teal-600"
    >
      <Pencil className="w-3 h-3" />
      Edit details
    </Link>
  )
}
