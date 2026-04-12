'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ExternalLink, Copy, Check } from 'lucide-react'
import { ProspectScoreBadge } from '@/components/admin/prospect-score-badge'
import { cn } from '@/lib/utils'

type DemoRow = {
  id: string
  prospect_id: string
  demo_url: string
  status: string
  view_count: number
  generation_method: string
  prospects?: {
    business_name: string
    city: string | null
    industry: string | null
    prospect_score: number | null
    score_factors: Record<string, any> | null
  }
}

async function fetchDemos(): Promise<DemoRow[]> {
  const res = await fetch('/api/admin/demos')
  if (!res.ok) throw new Error('Failed to fetch demos')
  const json = await res.json()
  return json.data ?? []
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500',
  ready: 'bg-blue-100 text-blue-700',
  sent: 'bg-orange-100 text-orange-700',
  viewed: 'bg-green-100 text-green-700',
}

export default function DemosPage() {
  const router = useRouter()
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
        <h1 className="text-2xl font-bold text-slate-800">Demos</h1>
        {!isLoading && (
          <span className="text-slate-400 text-sm">{demos.length} demos</span>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Business</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Demo URL</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Score</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Views</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Method</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-red-500">
                    Failed to load demos.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && demos.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No demos yet.
                  </td>
                </tr>
              )}
              {demos.map(d => (
                <tr
                  key={d.id}
                  onClick={() => router.push(`/admin/prospects/${d.prospect_id}`)}
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="text-slate-800 font-medium">
                      {d.prospects?.business_name ?? '—'}
                    </div>
                    <div className="text-slate-400 text-xs">
                      {[d.prospects?.industry, d.prospects?.city].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <a
                      href={d.demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[var(--teal-dark)] hover:underline max-w-[260px] truncate"
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{d.demo_url}</span>
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <ProspectScoreBadge
                      score={d.prospects?.prospect_score ?? null}
                      tier={d.prospects?.score_factors?.tier}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize',
                        STATUS_COLORS[d.status] ?? 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                    {d.view_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-slate-500 capitalize text-xs">
                    {d.generation_method ?? '—'}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleCopy(d.id, d.demo_url)}
                      title="Copy link"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      {copiedId === d.id ? (
                        <Check className="w-4 h-4 text-green-500" />
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
