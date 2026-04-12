'use client'

import { Mail, MessageSquare, Phone, FileText, ArrowRight } from 'lucide-react'
import { Activity } from '@/types/database'

function getActivityIcon(type: string) {
  switch (type) {
    case 'email':
      return Mail
    case 'sms':
    case 'chat':
      return MessageSquare
    case 'call':
      return Phone
    case 'note':
    case 'stage_change':
      return FileText
    default:
      return ArrowRight
  }
}

function formatTimestamp(ts: string) {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHr = Math.floor(diffMs / 3_600_000)
  const diffDay = Math.floor(diffMs / 86_400_000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface ActivityTimelineProps {
  activities: Activity[]
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (!activities || activities.length === 0) {
    return (
      <p className="text-white/30 text-sm py-4 text-center">No activity yet</p>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, idx) => {
        const Icon = getActivityIcon(activity.type)
        return (
          <div key={activity.id} className="flex gap-3">
            {/* Icon column */}
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-white/60" />
              </div>
              {idx < activities.length - 1 && (
                <div className="w-px flex-1 bg-white/10 mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-4">
              {activity.subject && (
                <p className="text-sm text-white font-medium leading-snug">
                  {activity.subject}
                </p>
              )}
              {activity.body && (
                <p className="text-xs text-white/50 mt-0.5 line-clamp-2 leading-relaxed">
                  {activity.body}
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs text-white/30">
                  {formatTimestamp(activity.created_at)}
                </span>
                {activity.created_by && (
                  <>
                    <span className="text-white/20 text-xs">·</span>
                    <span className="text-xs text-white/30 truncate max-w-[120px]">
                      {activity.created_by}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
