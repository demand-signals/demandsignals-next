import { Suspense } from 'react'
import { ProspectTable } from '@/components/admin/prospect-table'

export default function ProspectsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Prospects</h1>
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading…</div>}>
        <ProspectTable />
      </Suspense>
    </div>
  )
}
