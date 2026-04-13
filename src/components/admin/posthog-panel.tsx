'use client'

import { ExternalLink, Video, MousePointerClick, BarChart3, Flame, Activity } from 'lucide-react'

const POSTHOG_APP = 'https://us.posthog.com'

const links = [
  {
    label: 'Dashboard',
    desc: 'Overview of events, pageviews, and key metrics',
    href: `${POSTHOG_APP}/home`,
    icon: BarChart3,
    color: '#1D4AFF',
  },
  {
    label: 'Session Replays',
    desc: 'Watch visitor sessions — clicks, scrolls, rage clicks, dead clicks',
    href: `${POSTHOG_APP}/replay/recent`,
    icon: Video,
    color: '#F54E00',
  },
  {
    label: 'Heatmaps',
    desc: 'Click heatmaps and scroll depth for any page',
    href: `${POSTHOG_APP}/heatmaps`,
    icon: Flame,
    color: '#E5383B',
  },
  {
    label: 'Events',
    desc: 'Raw event stream — pageviews, clicks, custom events',
    href: `${POSTHOG_APP}/events`,
    icon: Activity,
    color: '#68c5ad',
  },
  {
    label: 'Web Analytics',
    desc: 'Pageview trends, top pages, referrers, devices, geography',
    href: `${POSTHOG_APP}/web`,
    icon: MousePointerClick,
    color: '#8B5CF6',
  },
]

export function PostHogPanel() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map((l) => {
          const Icon = l.icon
          return (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${l.color}18` }}
                >
                  <Icon className="w-5 h-5" style={{ color: l.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800 text-sm">{l.label}</span>
                    <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{l.desc}</p>
                </div>
              </div>
            </a>
          )
        })}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
        <p className="text-xs text-slate-500">
          <strong className="text-slate-600">PostHog Cloud</strong> captures session replays, heatmaps, and behavioral events.
          Free tier: 1M events/month, 5K session recordings.
          {' '}
          <a href={`${POSTHOG_APP}/settings/project`} target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] font-medium hover:underline">
            Project Settings
          </a>
        </p>
      </div>
    </div>
  )
}
