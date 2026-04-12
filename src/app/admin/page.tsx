'use client'

import { useQuery } from '@tanstack/react-query'
import { Users, Monitor, TrendingUp, DollarSign } from 'lucide-react'
import { StatCard } from '@/components/admin/stat-card'
import { STAGES, STAGE_LABELS } from '@/types/database'
import { cn } from '@/lib/utils'

type DashProspect = {
  id: string
  stage: string
  demos?: { id: string }[]
  deals?: { id: string; value_estimate: number | null }[]
}

async function fetchAllProspects(): Promise<DashProspect[]> {
  const res = await fetch('/api/admin/prospects?limit=500')
  if (!res.ok) throw new Error('Failed to fetch')
  const json = await res.json()
  return json.data ?? []
}

const PIPELINE_STAGES = new Set(['outreach', 'engaged', 'meeting', 'proposal'])

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

export default function AdminDashboardPage() {
  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ['dashboard-prospects'],
    queryFn: fetchAllProspects,
  })

  const total = prospects.length
  const withDemos = prospects.filter(p => (p.demos?.length ?? 0) > 0).length
  const inPipeline = prospects.filter(p => PIPELINE_STAGES.has(p.stage)).length
  const totalValue = prospects.reduce((sum, p) => {
    const deal = p.deals?.[0]
    return sum + (deal?.value_estimate ?? 0)
  }, 0)

  const stageCounts = STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = prospects.filter(p => p.stage === s).length
    return acc
  }, {} as Record<string, number>)

  function formatValue(n: number) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
    return `$${n}`
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Agency OS overview</p>
      </div>

      {isLoading ? (
        <div className="text-white/40 text-sm">Loading…</div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Prospects"
              value={total.toLocaleString()}
              icon={Users}
              color="#68c5ad"
            />
            <StatCard
              label="With Demos"
              value={withDemos.toLocaleString()}
              icon={Monitor}
              color="#3b82f6"
            />
            <StatCard
              label="In Pipeline"
              value={inPipeline.toLocaleString()}
              icon={TrendingUp}
              color="#f28500"
            />
            <StatCard
              label="Total Deal Value"
              value={formatValue(totalValue)}
              icon={DollarSign}
              color="#22c55e"
            />
          </div>

          {/* Stage Breakdown */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
              Stage Breakdown
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {STAGES.map(stage => (
                <div
                  key={stage}
                  className="rounded-xl border border-white/10 p-3 text-center space-y-1"
                  style={{
                    backgroundColor: `${STAGE_BOX_COLORS[stage] ?? '#6b7280'}14`,
                    borderColor: `${STAGE_BOX_COLORS[stage] ?? '#6b7280'}30`,
                  }}
                >
                  <div
                    className="text-2xl font-bold"
                    style={{ color: STAGE_BOX_COLORS[stage] ?? '#fff' }}
                  >
                    {stageCounts[stage] ?? 0}
                  </div>
                  <div className="text-xs text-white/50 leading-tight">
                    {STAGE_LABELS[stage]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
