'use client'

import { cn } from '@/lib/utils'

interface ProspectScoreBadgeProps {
  score: number | null
  className?: string
}

export function ProspectScoreBadge({ score, className }: ProspectScoreBadgeProps) {
  if (score === null || score === undefined) {
    return (
      <span className={cn('text-white/30 text-sm font-mono', className)}>—</span>
    )
  }

  const colorClass =
    score >= 80
      ? 'bg-green-500/20 text-green-400'
      : score >= 60
      ? 'bg-yellow-500/20 text-yellow-400'
      : score >= 40
      ? 'bg-orange-500/20 text-orange-400'
      : 'bg-red-500/20 text-red-400'

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold font-mono',
        colorClass,
        className
      )}
    >
      {score}
    </span>
  )
}
