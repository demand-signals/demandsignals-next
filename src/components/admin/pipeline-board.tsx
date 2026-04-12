'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { STAGES, STAGE_LABELS } from '@/types/database'
import { ProspectScoreBadge } from './prospect-score-badge'
import { cn } from '@/lib/utils'

type PipelineProspect = {
  id: string
  business_name: string
  city: string | null
  industry: string | null
  stage: string
  prospect_score: number | null
  demos?: { id: string }[]
  deals?: { id: string; value_estimate: number | null }[]
}

async function fetchAllProspects(): Promise<PipelineProspect[]> {
  const res = await fetch('/api/admin/prospects?limit=500&sort=prospect_score&order=desc')
  if (!res.ok) throw new Error('Failed to fetch prospects')
  const json = await res.json()
  return json.data ?? []
}

async function updateProspectStage(id: string, stage: string) {
  const res = await fetch('/api/admin/prospects', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, stage }),
  })
  if (!res.ok) throw new Error('Failed to update stage')
  return res.json()
}

const VISIBLE_STAGES = STAGES.filter(s => s !== 'lost')

const STAGE_COLORS: Record<string, string> = {
  researched: 'border-slate-200',
  demo_built: 'border-blue-200',
  outreach: 'border-purple-200',
  engaged: 'border-yellow-200',
  meeting: 'border-orange-200',
  proposal: 'border-teal-200',
  won: 'border-green-200',
}

const STAGE_HEADER_COLORS: Record<string, string> = {
  researched: 'text-slate-500',
  demo_built: 'text-blue-600',
  outreach: 'text-purple-600',
  engaged: 'text-yellow-600',
  meeting: 'text-orange-600',
  proposal: 'text-teal-600',
  won: 'text-green-600',
}

export function PipelineBoard() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: prospects = [], isLoading, isError } = useQuery({
    queryKey: ['pipeline-prospects'],
    queryFn: fetchAllProspects,
  })

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      updateProspectStage(id, stage),
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: ['pipeline-prospects'] })
      const prev = queryClient.getQueryData<PipelineProspect[]>(['pipeline-prospects'])
      queryClient.setQueryData<PipelineProspect[]>(['pipeline-prospects'], old =>
        (old ?? []).map(p => p.id === id ? { ...p, stage } : p)
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['pipeline-prospects'], ctx.prev)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-prospects'] })
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
    },
  })

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData('prospect-id', id)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function handleDrop(e: React.DragEvent, targetStage: string) {
    e.preventDefault()
    const id = e.dataTransfer.getData('prospect-id')
    if (!id) return
    const prospect = prospects.find(p => p.id === id)
    if (prospect && prospect.stage !== targetStage) {
      stageMutation.mutate({ id, stage: targetStage })
    }
  }

  const grouped = VISIBLE_STAGES.reduce<Record<string, PipelineProspect[]>>((acc, s) => {
    acc[s] = prospects.filter(p => p.stage === s)
    return acc
  }, {} as Record<string, PipelineProspect[]>)

  if (isLoading) {
    return <div className="text-slate-400 text-sm py-10 text-center">Loading pipeline…</div>
  }

  if (isError) {
    return <div className="text-red-500 text-sm py-10 text-center">Failed to load pipeline.</div>
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {VISIBLE_STAGES.map(stage => {
        const cols = grouped[stage] ?? []
        return (
          <div
            key={stage}
            className={cn(
              'flex-shrink-0 w-64 flex flex-col rounded-xl border bg-slate-50',
              STAGE_COLORS[stage] ?? 'border-slate-200'
            )}
            onDragOver={handleDragOver}
            onDrop={e => handleDrop(e, stage)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-3 py-3 border-b border-slate-200">
              <span className={cn('text-sm font-semibold', STAGE_HEADER_COLORS[stage] ?? 'text-slate-600')}>
                {STAGE_LABELS[stage]}
              </span>
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                {cols.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 min-h-[200px]">
              {cols.map(p => {
                const dealValue = p.deals?.[0]?.value_estimate
                const demoCount = p.demos?.length ?? 0
                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={e => handleDragStart(e, p.id)}
                    onClick={() => router.push(`/admin/prospects/${p.id}`)}
                    className="bg-white border border-slate-200 rounded-lg p-3 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all select-none space-y-1.5"
                  >
                    <div className="text-slate-800 text-sm font-medium leading-tight line-clamp-2">
                      {p.business_name}
                    </div>
                    {(p.city || p.industry) && (
                      <div className="text-slate-400 text-xs truncate">
                        {[p.city, p.industry].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <ProspectScoreBadge score={p.prospect_score} />
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        {dealValue != null && (
                          <span className="text-[var(--teal-dark)]">
                            ${dealValue.toLocaleString()}
                          </span>
                        )}
                        {demoCount > 0 && (
                          <span>{demoCount} demo{demoCount !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {cols.length === 0 && (
                <div className="py-6 text-center text-slate-300 text-xs">Drop here</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
