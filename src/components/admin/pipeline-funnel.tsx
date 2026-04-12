'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PipelineFunnelProps {
  stageCounts: Record<string, number>
}

const FUNNEL_STAGES = [
  { key: 'researched', label: 'Researched', color: '#6b7280' },
  { key: 'demo_built', label: 'Demo Built', color: '#3b82f6' },
  { key: 'outreach', label: 'Outreach', color: '#a855f7' },
  { key: 'engaged', label: 'Engaged', color: '#eab308' },
  { key: 'meeting', label: 'Meeting', color: '#f97316' },
  { key: 'proposal', label: 'Proposal', color: '#68c5ad' },
  { key: 'won', label: 'Won', color: '#22c55e' },
]

export function PipelineFunnel({ stageCounts }: PipelineFunnelProps) {
  const router = useRouter()
  const maxCount = Math.max(1, ...Object.values(stageCounts))

  // Detect bottlenecks (stage with 0 count between non-zero stages)
  const bottleneckKeys = new Set<string>()
  for (let i = 1; i < FUNNEL_STAGES.length - 1; i++) {
    const count = stageCounts[FUNNEL_STAGES[i].key] ?? 0
    const prev = stageCounts[FUNNEL_STAGES[i - 1].key] ?? 0
    if (count === 0 && prev > 0) {
      bottleneckKeys.add(FUNNEL_STAGES[i].key)
    }
  }

  return (
    <div className="flex items-end gap-1 overflow-x-auto pb-1">
      {FUNNEL_STAGES.map((stage, i) => {
        const count = stageCounts[stage.key] ?? 0
        const barHeight = Math.max(8, (count / maxCount) * 100)
        const isBottleneck = bottleneckKeys.has(stage.key)

        return (
          <div key={stage.key} className="flex items-end gap-1">
            <button
              onClick={() => router.push(`/admin/prospects?stage=${stage.key}`)}
              className={cn(
                'flex flex-col items-center gap-1 group transition-all min-w-[72px]',
                isBottleneck && 'animate-pulse'
              )}
            >
              <span
                className="text-sm font-bold transition-transform group-hover:scale-110"
                style={{ color: stage.color }}
              >
                {count}
              </span>
              <div
                className="w-full rounded-t-lg transition-all group-hover:opacity-80"
                style={{
                  height: `${barHeight}px`,
                  backgroundColor: stage.color,
                  opacity: count === 0 ? 0.2 : 1,
                }}
              />
              <span className={cn(
                'text-[0.6rem] text-slate-500 leading-tight text-center',
                isBottleneck && 'text-red-500 font-semibold'
              )}>
                {stage.label}
              </span>
            </button>
            {i < FUNNEL_STAGES.length - 1 && (
              <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0 mb-4" />
            )}
          </div>
        )
      })}
    </div>
  )
}
