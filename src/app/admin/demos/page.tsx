'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type DemoRow = {
  id: string
  prospect_id: string
  demo_url: string
  platform: string
  status: string
  view_count: number
  generation_method: string
  prospects?: {
    business_name: string
    city: string | null
    industry: string | null
  }
}

async function fetchDemos(): Promise<DemoRow[]> {
  const res = await fetch('/api/admin/demos')
  if (!res.ok) throw new Error('Failed to fetch demos')
  const json = await res.json()
  return json.data ?? []
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-white/10 text-white/50',
  ready: 'bg-blue-500/20 text-blue-400',
  sent: 'bg-orange-500/20 text-orange-400',
  viewed: 'bg-green-500/20 text-green-400',
}

export default function DemosPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data: demos = [], isLoading, isError } = useQuery({
    queryKey: ['demos'],
    queryFn: fetchDemos,
  })

  async function handleCopy(id: string, url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      // fallback: ignore
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Demos</h1>
        {!isLoading && (
          <span className="text-white/40 text-sm">{demos.length} demos</span>
        )}
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="text-left px-4 py-3 text-white/50 font-medium">Business</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium">Demo URL</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium">Platform</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium">Views</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium">Method</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                    Loading…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-red-400">
                    Failed to load demos.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && demos.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                    No demos yet.
                  </td>
                </tr>
              )}
              {demos.map(d => (
                <tr
                  key={d.id}
                  className="border-b border-white/5 hover:bg-white/3 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">
                      {d.prospects?.business_name ?? '—'}
                    </div>
                    {d.prospects?.city && (
                      <div className="text-white/40 text-xs">{d.prospects.city}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={d.demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-[var(--teal)] hover:underline max-w-[260px] truncate"
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{d.demo_url}</span>
                    </a>
                  </td>
                  <td className="px-4 py-3 text-white/60 capitalize">
                    {d.platform ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize',
                        STATUS_COLORS[d.status] ?? 'bg-white/10 text-white/50'
                      )}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/60 font-mono text-xs">
                    {d.view_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-white/50 capitalize text-xs">
                    {d.generation_method ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleCopy(d.id, d.demo_url)}
                      title="Copy link"
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      {copiedId === d.id ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
