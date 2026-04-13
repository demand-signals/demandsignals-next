import { Suspense } from 'react'
import { AnalyticsDashboard } from '@/components/admin/analytics-dashboard'
import { PostHogPanel } from '@/components/admin/posthog-panel'

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Pageviews, traffic sources, behavioral analytics, and session replays</p>
      </div>

      {/* Self-hosted analytics */}
      <section>
        <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--teal)]" />
          Visitor Analytics
        </h2>
        <Suspense fallback={<div className="text-slate-400 text-sm">Loading...</div>}>
          <AnalyticsDashboard />
        </Suspense>
      </section>

      {/* PostHog */}
      <section>
        <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          PostHog Behavioral Analytics
        </h2>
        <PostHogPanel />
      </section>
    </div>
  )
}
