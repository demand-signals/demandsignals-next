'use client'

import { useState } from 'react'
import { Mail, MessageSquare, Phone, FileText, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import { Activity } from '@/types/database'
import { cn } from '@/lib/utils'

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

function formatAbsolute(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

interface ActivityTimelineProps {
  activities: Activity[]
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!activities || activities.length === 0) {
    return (
      <p className="text-slate-400 text-sm py-4 text-center">No activity yet</p>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, idx) => {
        const Icon = getActivityIcon(activity.type)
        const isOpen = expanded.has(activity.id)
        const hasDetail = !!(activity.body || activity.channel || activity.direction || activity.status)

        return (
          <div key={activity.id} className="flex gap-3">
            {/* Icon column */}
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-slate-500" />
              </div>
              {idx < activities.length - 1 && (
                <div className="w-px flex-1 bg-slate-200 mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-4">
              {/* Collapsed header row */}
              <div
                className={cn(
                  'flex items-start justify-between gap-2',
                  hasDetail && 'cursor-pointer',
                )}
                onClick={() => hasDetail && toggle(activity.id)}
              >
                <div className="flex-1 min-w-0">
                  {activity.subject && (
                    <p className="text-sm text-slate-800 font-medium leading-snug">
                      {activity.subject}
                    </p>
                  )}
                  {/* Show first line of body when collapsed */}
                  {!isOpen && activity.body && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                      {activity.body}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs text-slate-400">
                      {formatTimestamp(activity.created_at)}
                    </span>
                    {activity.created_by && (
                      <>
                        <span className="text-slate-300 text-xs">·</span>
                        <span className="text-xs text-slate-400 truncate max-w-[120px]">
                          {activity.created_by}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {hasDetail && (
                  <button
                    onClick={e => { e.stopPropagation(); toggle(activity.id) }}
                    className="text-slate-400 hover:text-slate-600 flex-shrink-0 mt-0.5"
                    aria-label={isOpen ? 'Collapse' : 'Expand'}
                  >
                    {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Expanded details */}
              {isOpen && (
                <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                  {activity.body && (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{activity.body}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500 pt-1 border-t border-slate-200">
                    {activity.channel && (
                      <span>Channel: <span className="text-slate-700 font-medium">{activity.channel}</span></span>
                    )}
                    {activity.direction && (
                      <span>Direction: <span className="text-slate-700 font-medium">{activity.direction}</span></span>
                    )}
                    {activity.status && (
                      <span>Status: <span className="text-slate-700 font-medium">{activity.status}</span></span>
                    )}
                    <span title={formatAbsolute(activity.created_at)} className="cursor-default">
                      {formatAbsolute(activity.created_at)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
