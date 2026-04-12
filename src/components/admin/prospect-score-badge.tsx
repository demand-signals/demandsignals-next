'use client'

import { cn } from '@/lib/utils'
import type { ProspectTier } from '@/lib/scoring'

interface ProspectScoreBadgeProps {
  score: number | null
  tier?: ProspectTier | string | null
  className?: string
  showTier?: boolean
}

const TIER_CONFIG: Record<string, { label: string; icon: string; bg: string; text: string; glow: string }> = {
  diamond: { label: 'Diamond', icon: '\u2666', bg: 'bg-cyan-50 border-cyan-300', text: 'text-cyan-700', glow: 'shadow-cyan-200/60' },
  gold: { label: 'Gold', icon: '\u2605', bg: 'bg-amber-50 border-amber-300', text: 'text-amber-700', glow: 'shadow-amber-200/60' },
  silver: { label: 'Silver', icon: '\u25CF', bg: 'bg-slate-50 border-slate-300', text: 'text-slate-600', glow: '' },
  bronze: { label: 'Bronze', icon: '\u25CB', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-500', glow: '' },
}

function getTierFromScore(score: number): ProspectTier {
  if (score >= 75) return 'diamond'
  if (score >= 60) return 'gold'
  if (score >= 40) return 'silver'
  return 'bronze'
}

export function ProspectScoreBadge({ score, tier, className, showTier = true }: ProspectScoreBadgeProps) {
  if (score === null || score === undefined) {
    return (
      <span className={cn('text-slate-300 text-sm font-mono', className)}>--</span>
    )
  }

  const resolvedTier = (tier as ProspectTier) || getTierFromScore(score)
  const config = TIER_CONFIG[resolvedTier] || TIER_CONFIG.bronze

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold font-mono',
        config.bg,
        config.text,
        config.glow && `shadow-sm ${config.glow}`,
        className
      )}
    >
      {showTier && <span className="text-[0.65rem]">{config.icon}</span>}
      {score}
    </span>
  )
}

export function TierBadge({ tier }: { tier: ProspectTier | string | null }) {
  if (!tier) return null
  const config = TIER_CONFIG[tier] || TIER_CONFIG.bronze
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[0.65rem] font-semibold uppercase tracking-wider', config.bg, config.text)}>
      {config.icon} {config.label}
    </span>
  )
}
