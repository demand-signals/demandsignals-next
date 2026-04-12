import { Suspense } from 'react'
import { LtpTable } from '@/components/admin/ltp-table'

export default function LongTailsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Long-Tail Pages</h1>
        <p className="text-slate-500 text-sm mt-1">All city + service landing pages</p>
      </div>
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading…</div>}>
        <LtpTable />
      </Suspense>
    </div>
  )
}
