'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot, Search, Hammer, Sparkles, Play, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { ActivityTimeline } from '@/components/admin/activity-timeline'
import type { Activity, AgentRun } from '@/types/database'
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
    description: 'Calculates prospect scores using 5-signal intelligence engine. Fires automatically on prospect changes.',
    trigger: 'Fires on prospect INSERT or when research_data updates via Supabase webhook.',
    status: 'active',
  },
  {
    icon: Search,
    name: 'Discovery',
    description: 'Finds new prospects via Google Places API. Analyzes their websites with Claude. Filters by ICP criteria.',
    trigger: 'Daily cron (weekdays 7 AM Pacific) + manual trigger. Picks unsearched city+industry combos.',
    status: 'active',
  },
  {
    icon: Sparkles,
    name: 'Enrichment',
    description: 'Enriches sparse prospect profiles with Claude research: social media, reviews, website details, owner info.',
    trigger: 'Daily cron (after discovery) + manual trigger. Targets top-scored prospects with incomplete data.',
    status: 'active',
  },
  {
    icon: Hammer,
    name: 'Builder',
    description: 'Auto-generates demo sites for auto-demo-eligible prospects using brand assets and industry templates.',
    trigger: 'Planned — will fire when auto_demo_eligible becomes true.',
    status: 'planned',
  },
]

const STATUS_STYLES: Record<AgentStatus, string> = {
  active: 'bg-green-100 text-green-700',
  planned: 'bg-slate-100 text-slate-400',
}

const RUN_STATUS_ICON: Record<string, React.ElementType> = {
  running: Loader2,
  completed: CheckCircle,
  failed: XCircle,
}

const RUN_STATUS_STYLE: Record<string, string> = {
  running: 'text-blue-500',
  completed: 'text-green-500',
  failed: 'text-red-500',
}

async function fetchAgentActivities(): Promise<Activity[]> {
  const res = await fetch('/api/admin/activities')
  if (!res.ok) throw new Error('Failed to fetch activities')
  const { data } = await res.json() as { data: Activity[] }
  return (data ?? []).filter(a => a.created_by?.startsWith('agent:'))
}

async function fetchAgentRuns(): Promise<AgentRun[]> {
  const res = await fetch('/api/admin/agent-runs?limit=20')
  if (!res.ok) return [] // table may not exist yet
  const { data } = await res.json() as { data: AgentRun[] }
  return data ?? []
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return 'running…'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 1000) return `${ms}ms`
  const secs = Math.round(ms / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

export default function AgentsPage() {
  const queryClient = useQueryClient()

  const { data: agentActivities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['agent-activities'],
    queryFn: fetchAgentActivities,
    refetchInterval: 30_000,
  })

  const { data: agentRuns = [], isLoading: runsLoading } = useQuery({
    queryKey: ['agent-runs'],
    queryFn: fetchAgentRuns,
    refetchInterval: 15_000,
  })

  const triggerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/agent-runs', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to trigger')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-runs'] })
      queryClient.invalidateQueries({ queryKey: ['agent-activities'] })
    },
  })

  // Today's stats from runs
  const today = new Date().toISOString().split('T')[0]
  const todayRuns = agentRuns.filter(r => r.started_at?.startsWith(today))
  const todayDiscovered = todayRuns.filter(r => r.agent_name === 'discovery').reduce((sum, r) => sum + (r.prospects_created || 0), 0)
  const todayEnriched = todayRuns.filter(r => r.agent_name === 'enrichment').reduce((sum, r) => sum + (r.prospects_updated || 0), 0)
  const todayFailed = todayRuns.filter(r => r.status === 'failed').length

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agents</h1>
          <p className="text-slate-500 text-sm mt-1">Autonomous micro-agents that discover, research, score, and build demos.</p>
        </div>
        <button
          onClick={() => triggerMutation.mutate()}
          disabled={triggerMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {triggerMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          Run Now
        </button>
      </div>

      {/* Today's stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{todayDiscovered}</div>
          <div className="text-xs text-slate-500 mt-1">Discovered Today</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{todayEnriched}</div>
          <div className="text-xs text-slate-500 mt-1">Enriched Today</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className={cn("text-2xl font-bold", todayFailed > 0 ? 'text-red-500' : 'text-slate-800')}>{todayFailed}</div>
          <div className="text-xs text-slate-500 mt-1">Failed Today</div>
        </div>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Agent runs history */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Run History
        </h2>
        {runsLoading ? (
          <p className="text-slate-400 text-sm text-center py-4">Loading…</p>
        ) : agentRuns.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">
            No agent runs yet. Click &ldquo;Run Now&rdquo; or wait for the daily cron.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left font-medium text-slate-500 pb-2 pr-4">Agent</th>
                  <th className="text-left font-medium text-slate-500 pb-2 pr-4">Status</th>
                  <th className="text-left font-medium text-slate-500 pb-2 pr-4">Started</th>
                  <th className="text-left font-medium text-slate-500 pb-2 pr-4">Duration</th>
                  <th className="text-right font-medium text-slate-500 pb-2 pr-4">Created</th>
                  <th className="text-right font-medium text-slate-500 pb-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {agentRuns.map(run => {
                  const StatusIcon = RUN_STATUS_ICON[run.status] || Clock
                  return (
                    <tr key={run.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 pr-4">
                        <span className="font-medium text-slate-700 capitalize">{run.agent_name}</span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={cn('flex items-center gap-1.5', RUN_STATUS_STYLE[run.status])}>
                          <StatusIcon className={cn('w-3.5 h-3.5', run.status === 'running' && 'animate-spin')} />
                          {run.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-500">{formatRelativeTime(run.started_at)}</td>
                      <td className="py-2.5 pr-4 text-slate-500">{formatDuration(run.started_at, run.completed_at)}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-700 font-medium">{run.prospects_created || 0}</td>
                      <td className="py-2.5 text-right text-slate-700 font-medium">{run.prospects_updated || 0}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent agent activity */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Recent Agent Activity
        </h2>
        {activitiesLoading ? (
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
