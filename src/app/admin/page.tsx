'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Users, Monitor, TrendingUp, DollarSign, Target, Anchor, AlertTriangle, BarChart3 } from 'lucide-react'
import { StatCard } from '@/components/admin/stat-card'
import { PriorityQueue } from '@/components/admin/priority-queue'
import { WhaleDeals } from '@/components/admin/whale-deals'
import { CriticalAlerts } from '@/components/admin/critical-alerts'
import { PipelineFunnel } from '@/components/admin/pipeline-funnel'
import { RevenueForecast } from '@/components/admin/revenue-forecast'
import { STAGES, STAGE_LABELS } from '@/types/database'
import { cn } from '@/lib/utils'

type DashboardData = {
  total: number
  demoCount: number
  inPipeline: number
  stageCounts: Record<string, number>
  tierCounts: Record<string, number>
  priority: any[]
  whales: any[]
  criticalAlerts: { type: string; prospect_id: string; business_name: string; detail: string; score: number }[]
  revenue: { won: number; pipeline: number; untapped: number }
  dealTotal: number
}

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch('/api/admin/dashboard')
  if (!res.ok) throw new Error('Failed to fetch dashboard')
  return res.json()
}

async function startOutreach(prospectId: string) {
  const res = await fetch(`/api/admin/prospects/${prospectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: 'outreach', last_contacted_at: new Date().toISOString() }),
  })
  if (!res.ok) throw new Error('Failed to update stage')
  return res.json()
}

const STAGE_BOX_COLORS: Record<string, string> = {
  researched: '#6b7280',
  demo_built: '#3b82f6',
  outreach: '#a855f7',
  engaged: '#eab308',
  meeting: '#f97316',
  proposal: '#68c5ad',
  won: '#22c55e',
  lost: '#ef4444',
}

function formatValue(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  })

  const outreachMutation = useMutation({
    mutationFn: startOutreach,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  function handleStartOutreach(id: string) {
    if (confirm('Move this prospect to Outreach stage?')) {
      outreachMutation.mutate(id)
    }
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Command Center</h1>
          <p className="text-slate-500 text-sm mt-1">Loading dashboard…</p>
        </div>
        <div className="text-slate-400 text-sm animate-pulse">Loading…</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Command Center</h1>
        <p className="text-slate-500 text-sm mt-1">
          {data.total} prospects · {data.inPipeline} in pipeline · {data.criticalAlerts.length} alert{data.criticalAlerts.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Stat Cards — all clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Prospects"
          value={data.total.toLocaleString()}
          icon={Users}
          color="#68c5ad"
          href="/admin/prospects"
        />
        <StatCard
          label="With Demos"
          value={data.demoCount.toLocaleString()}
          icon={Monitor}
          color="#3b82f6"
          href="/admin/demos"
        />
        <StatCard
          label="In Pipeline"
          value={data.inPipeline.toLocaleString()}
          icon={TrendingUp}
          color="#f28500"
          href="/admin/prospects?stage=outreach"
        />
        <StatCard
          label="Total Deal Value"
          value={formatValue(data.dealTotal)}
          icon={DollarSign}
          color="#22c55e"
          href="/admin/prospects"
        />
      </div>

      {/* Critical Alerts — only show if there are any */}
      {data.criticalAlerts.length > 0 && (
        <DashboardSection
          title="Critical Alerts"
          icon={AlertTriangle}
          iconColor="text-red-500"
          badge={data.criticalAlerts.length}
          badgeColor="bg-red-100 text-red-600"
        >
          <CriticalAlerts
            alerts={data.criticalAlerts}
            onStartOutreach={handleStartOutreach}
          />
        </DashboardSection>
      )}

      {/* Two-column layout: Priority Queue + Whale Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardSection
          title="Priority Queue"
          subtitle="Top prospects by score — pitch these first"
          icon={Target}
          iconColor="text-cyan-500"
        >
          <PriorityQueue
            prospects={data.priority}
            onStartOutreach={handleStartOutreach}
          />
        </DashboardSection>

        <DashboardSection
          title="Whale Deals"
          subtitle="High-value tagged prospects"
          icon={Anchor}
          iconColor="text-amber-500"
          badge={data.whales.length}
          badgeColor="bg-amber-100 text-amber-600"
        >
          <WhaleDeals whales={data.whales} />
        </DashboardSection>
      </div>

      {/* Pipeline Funnel */}
      <DashboardSection
        title="Pipeline Funnel"
        subtitle="Conversion flow — click any stage to filter"
        icon={BarChart3}
        iconColor="text-purple-500"
      >
        <PipelineFunnel stageCounts={data.stageCounts} />
      </DashboardSection>

      {/* Two-column: Revenue + Stage Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardSection
          title="Revenue Potential"
          icon={DollarSign}
          iconColor="text-green-500"
        >
          <RevenueForecast revenue={data.revenue} />
        </DashboardSection>

        {/* Stage Breakdown — clickable tiles */}
        <DashboardSection
          title="Stage Breakdown"
          icon={BarChart3}
          iconColor="text-slate-400"
        >
          <div className="grid grid-cols-4 gap-2">
            {STAGES.map(stage => (
              <button
                key={stage}
                onClick={() => router.push(`/admin/prospects?stage=${stage}`)}
                className="rounded-lg border bg-white p-2.5 text-center space-y-0.5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer active:scale-[0.97]"
                style={{
                  borderColor: `${STAGE_BOX_COLORS[stage] ?? '#6b7280'}40`,
                }}
              >
                <div
                  className="text-xl font-bold"
                  style={{ color: STAGE_BOX_COLORS[stage] ?? '#6b7280' }}
                >
                  {data.stageCounts[stage] ?? 0}
                </div>
                <div className="text-[0.6rem] text-slate-500 leading-tight">
                  {STAGE_LABELS[stage]}
                </div>
              </button>
            ))}
          </div>
        </DashboardSection>
      </div>
    </div>
  )
}

/* Reusable section wrapper */
function DashboardSection({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  badge,
  badgeColor,
  children,
}: {
  title: string
  subtitle?: string
  icon: typeof Users
  iconColor: string
  badge?: number
  badgeColor?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={cn('w-4 h-4', iconColor)} />
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
          {title}
        </h2>
        {badge !== undefined && (
          <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-full', badgeColor)}>
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-slate-400 -mt-1">{subtitle}</p>}
      {children}
    </div>
  )
}
