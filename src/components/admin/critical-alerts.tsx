'use client'

import { useRouter } from 'next/navigation'
import { ShieldAlert, Clock, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type CriticalAlert = {
  type: string
  prospect_id: string
  business_name: string
  detail: string
  score: number
}

interface CriticalAlertsProps {
  alerts: CriticalAlert[]
  onStartOutreach?: (id: string) => void
}

const ALERT_CONFIG: Record<string, { icon: typeof ShieldAlert; color: string; bg: string; border: string }> = {
  ssl_broken: { icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  stale_demo: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
}

export function CriticalAlerts({ alerts, onStartOutreach }: CriticalAlertsProps) {
  const router = useRouter()

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm py-4">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        No critical issues right now.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => {
        const config = ALERT_CONFIG[alert.type] || ALERT_CONFIG.ssl_broken
        const Icon = config.icon

        return (
          <div
            key={`${alert.prospect_id}-${alert.type}-${i}`}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm',
              config.bg, config.border
            )}
            onClick={() => router.push(`/admin/prospects/${alert.prospect_id}`)}
          >
            <Icon className={cn('w-5 h-5 flex-shrink-0', config.color)} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-800">{alert.business_name}</div>
              <div className="text-xs text-slate-500">{alert.detail}</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
              {alert.type === 'stale_demo' && onStartOutreach && (
                <button
                  onClick={() => onStartOutreach(alert.prospect_id)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors"
                >
                  <ArrowRight className="w-3 h-3" />
                  Outreach
                </button>
              )}
              <span className="text-xs font-mono text-slate-400">{alert.score}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
