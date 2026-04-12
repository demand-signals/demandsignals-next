'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { STAGES, STAGE_LABELS, INDUSTRIES } from '@/types/database'
import { ProspectScoreBadge } from './prospect-score-badge'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 50

type ProspectRow = {
  id: string
  business_name: string
  owner_name: string | null
  industry: string | null
  city: string | null
  google_rating: number | null
  google_review_count: number | null
  prospect_score: number | null
  stage: string
  demos?: { id: string }[]
}

async function fetchProspects(params: {
  search: string
  stage: string
  industry: string
  page: number
}) {
  const sp = new URLSearchParams()
  if (params.search) sp.set('search', params.search)
  if (params.stage) sp.set('stage', params.stage)
  if (params.industry) sp.set('industry', params.industry)
  sp.set('page', String(params.page))
  sp.set('limit', String(PAGE_SIZE))
  sp.set('sort', 'prospect_score')
  sp.set('order', 'desc')

  const res = await fetch(`/api/admin/prospects?${sp}`)
  if (!res.ok) throw new Error('Failed to fetch prospects')
  return res.json() as Promise<{ data: ProspectRow[]; total: number; page: number; limit: number }>
}

const STAGE_BADGE_COLORS: Record<string, string> = {
  researched: 'bg-white/10 text-white/60',
  demo_built: 'bg-blue-500/20 text-blue-400',
  outreach: 'bg-purple-500/20 text-purple-400',
  engaged: 'bg-yellow-500/20 text-yellow-400',
  meeting: 'bg-orange-500/20 text-orange-400',
  proposal: 'bg-teal-500/20 text-teal-400',
  won: 'bg-green-500/20 text-green-400',
  lost: 'bg-red-500/20 text-red-400',
}

export function ProspectTable() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('')
  const [industry, setIndustry] = useState('')
  const [page, setPage] = useState(1)

  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  function handleSearchChange(val: string) {
    setSearch(val)
    if (searchTimer) clearTimeout(searchTimer)
    const t = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 300)
    setSearchTimer(t)
  }

  function handleStageChange(val: string) {
    setStage(val)
    setPage(1)
  }

  function handleIndustryChange(val: string) {
    setIndustry(val)
    setPage(1)
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['prospects', debouncedSearch, stage, industry, page],
    queryFn: () => fetchProspects({ search: debouncedSearch, stage, industry, page }),
  })

  const prospects = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const selectClass =
    'bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--teal)] appearance-none min-w-[140px]'

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search business or owner…"
            className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg pl-9 pr-3 py-2 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
          />
        </div>

        <select
          value={stage}
          onChange={e => handleStageChange(e.target.value)}
          className={selectClass}
        >
          <option value="">All Stages</option>
          {STAGES.map(s => (
            <option key={s} value={s}>{STAGE_LABELS[s]}</option>
          ))}
        </select>

        <select
          value={industry}
          onChange={e => handleIndustryChange(e.target.value)}
          className={selectClass}
        >
          <option value="">All Industries</option>
          {INDUSTRIES.map(i => (
            <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>
          ))}
        </select>

        <span className="text-white/40 text-sm ml-auto">
          {total.toLocaleString()} prospects
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="text-left px-4 py-3 text-white/50 font-medium">Business</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium">Owner</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium">Industry</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium">City</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium">Reviews</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium">Score</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium">Stage</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium">Demos</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-white/40">
                    Loading…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-red-400">
                    Failed to load prospects.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && prospects.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-white/40">
                    No prospects found.
                  </td>
                </tr>
              )}
              {prospects.map(p => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/admin/prospects/${p.id}`)}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-white font-medium">{p.business_name}</td>
                  <td className="px-4 py-3 text-white/70">{p.owner_name ?? '—'}</td>
                  <td className="px-4 py-3 text-white/60 capitalize">{p.industry ?? '—'}</td>
                  <td className="px-4 py-3 text-white/60">{p.city ?? '—'}</td>
                  <td className="px-4 py-3 text-white/70">
                    {p.google_rating != null ? (
                      <span>
                        {p.google_rating}★{' '}
                        <span className="text-white/40 text-xs">
                          ({p.google_review_count ?? 0})
                        </span>
                      </span>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ProspectScoreBadge score={p.prospect_score} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                        STAGE_BADGE_COLORS[p.stage] ?? 'bg-white/10 text-white/60'
                      )}
                    >
                      {STAGE_LABELS[p.stage as keyof typeof STAGE_LABELS] ?? p.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {p.demos?.length ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-white/40 text-sm">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
