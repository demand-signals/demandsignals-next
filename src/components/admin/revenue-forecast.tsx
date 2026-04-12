'use client'

import { DollarSign, TrendingUp, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RevenueForecastProps {
  revenue: {
    won: number
    pipeline: number
    untapped: number
  }
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n}`
}

export function RevenueForecast({ revenue }: RevenueForecastProps) {
  const total = revenue.won + revenue.pipeline + revenue.untapped
  const wonPct = total > 0 ? (revenue.won / total) * 100 : 0
  const pipePct = total > 0 ? (revenue.pipeline / total) * 100 : 0
  const untappedPct = total > 0 ? (revenue.untapped / total) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-xs text-slate-500 font-medium">Won</span>
          </div>
          <div className="text-lg font-bold text-green-600">{formatMoney(revenue.won)}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-slate-500 font-medium">Pipeline</span>
          </div>
          <div className="text-lg font-bold text-blue-600">{formatMoney(revenue.pipeline)}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-slate-500 font-medium">Untapped</span>
          </div>
          <div className="text-lg font-bold text-amber-600">{formatMoney(revenue.untapped)}</div>
        </div>
      </div>

      {/* Stacked bar */}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="flex h-4 rounded-full overflow-hidden bg-slate-100">
            {wonPct > 0 && (
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${wonPct}%` }}
                title={`Won: ${formatMoney(revenue.won)}`}
              />
            )}
            {pipePct > 0 && (
              <div
                className="bg-blue-500 transition-all"
                style={{ width: `${pipePct}%` }}
                title={`Pipeline: ${formatMoney(revenue.pipeline)}`}
              />
            )}
            {untappedPct > 0 && (
              <div
                className="bg-amber-400 transition-all"
                style={{ width: `${untappedPct}%` }}
                title={`Untapped: ${formatMoney(revenue.untapped)}`}
              />
            )}
          </div>
          <div className="flex justify-between text-[0.6rem] text-slate-400">
            <span>Total Potential: {formatMoney(total)}</span>
            <span>{Math.round(untappedPct)}% untapped</span>
          </div>
        </div>
      )}
    </div>
  )
}
