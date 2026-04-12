import { Suspense } from 'react'
import { AnalyticsDashboard } from '@/components/admin/analytics-dashboard'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Visitor Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Pageviews, traffic sources, and visitor insights</p>
      </div>
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading…</div>}>
        <AnalyticsDashboard />
      </Suspense>
    </div>
  )
}
