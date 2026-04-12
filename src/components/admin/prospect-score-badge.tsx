'use client'

import { cn } from '@/lib/utils'

interface ProspectScoreBadgeProps {
  score: number | null
  className?: string
}

export function ProspectScoreBadge({ score, className }: ProspectScoreBadgeProps) {
  if (score === null || score === undefined) {
    return (
      <span className={cn('text-slate-300 text-sm font-mono', className)}>—</span>
    )
  }

  const colorClass =
    score >= 80
      ? 'bg-green-100 text-green-700'
      : score >= 60
      ? 'bg-yellow-100 text-yellow-700'
      : score >= 40
      ? 'bg-orange-100 text-orange-700'
      : 'bg-red-100 text-red-700'

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
