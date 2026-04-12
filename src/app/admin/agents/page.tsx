'use client'

import { useQuery } from '@tanstack/react-query'
import { Bot, Search, Hammer } from 'lucide-react'
import { ActivityTimeline } from '@/components/admin/activity-timeline'
import type { Activity } from '@/types/database'
import { cn } from '@/lib/utils'

type AgentStatus = 'active' | 'planned'

interface AgentCard {
  icon: React.ElementType
  name: string
  description: string
  trigger: string
  status: AgentStatus
}

const AGENTS: AgentCard[] = [
  {
    icon: Bot,
    name: 'Scorer',
    description: 'Calculates prospect scores based on Google reviews, site quality, and industry value. Flags high-potential leads as auto-demo eligible.',
    trigger: 'Fires on prospect INSERT or when research_data updates via Supabase webhook.',
    status: 'active',
  },
  {
    icon: Search,
    name: 'Researcher',
    description: 'Enriches prospect profiles with web research: site quality analysis, contact discovery, and competitor intel.',
    trigger: 'Planned — will fire after scoring identifies high-value prospects.',
    status: 'planned',
  },
  {
    icon: Hammer,
    name: 'Builder',
    description: 'Automatically generates demo sites for auto-demo-eligible prospects using their brand assets and industry templates.',
    trigger: 'Planned — will fire when auto_demo_eligible becomes true.',
    status: 'planned',
  },
]

const STATUS_STYLES: Record<AgentStatus, string> = {
  active: 'bg-green-100 text-green-700',
  planned: 'bg-slate-100 text-slate-400',
}

async function fetchAgentActivities(): Promise<Activity[]> {
  const res = await fetch('/api/admin/activities')
  if (!res.ok) throw new Error('Failed to fetch activities')
  const { data } = await res.json() as { data: Activity[] }
  return (data ?? []).filter(a => a.created_by?.startsWith('agent:'))
}

export default function AgentsPage() {
  const { data: agentActivities = [], isLoading } = useQuery({
    queryKey: ['agent-activities'],
    queryFn: fetchAgentActivities,
    refetchInterval: 30_000,
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Agents</h1>
        <p className="text-slate-500 text-sm mt-1">Autonomous micro-agents that run in the background to research, score, and build demos.</p>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {AGENTS.map(agent => {
          const Icon = agent.icon
          return (
            <div
              key={agent.name}
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-slate-500" />
                </div>
                <span
                  className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    STATUS_STYLES[agent.status]
                  )}
                >
                  {agent.status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-800">{agent.name}</h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{agent.description}</p>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-400 leading-relaxed">{agent.trigger}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent agent activity */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Recent Agent Activity
        </h2>
        {isLoading ? (
          <p className="text-slate-400 text-sm text-center py-4">Loading…</p>
        ) : agentActivities.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">
            No agent activity yet. Import prospects to trigger the scorer.
          </p>
        ) : (
          <ActivityTimeline activities={agentActivities} />
        )}
      </div>
    </div>
  )
}
