'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
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
  score_factors: Record<string, any> | null
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
  researched: 'bg-slate-100 text-slate-500',
  demo_built: 'bg-blue-100 text-blue-700',
  outreach: 'bg-purple-100 text-purple-700',
  engaged: 'bg-yellow-100 text-yellow-700',
  meeting: 'bg-orange-100 text-orange-700',
  proposal: 'bg-teal-100 text-teal-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
}

export function ProspectTable() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Seed initial filter state from URL params (for dashboard click-through)
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [stage, setStage] = useState(searchParams.get('stage') ?? '')
  const [industry, setIndustry] = useState(searchParams.get('industry') ?? '')
  const [page, setPage] = useState(1)

  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') ?? '')
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
    'bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--teal)] appearance-none min-w-[140px]'

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search business or owner…"
            className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg pl-9 pr-3 py-2 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
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

        <span className="text-slate-400 text-sm ml-auto">
          {total.toLocaleString()} prospects
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Business</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Owner</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Industry</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">City</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Reviews</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Score</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Stage</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Demos</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-red-500">
                    Failed to load prospects.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && prospects.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No prospects found.
                  </td>
                </tr>
              )}
              {prospects.map(p => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/admin/prospects/${p.id}`)}
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-slate-800 font-medium">{p.business_name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.owner_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 capitalize">{p.industry ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{p.city ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.google_rating != null ? (
                      <span>
                        {p.google_rating}★{' '}
                        <span className="text-slate-400 text-xs">
                          ({p.google_review_count ?? 0})
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ProspectScoreBadge score={p.prospect_score} tier={p.score_factors?.tier} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                        STAGE_BADGE_COLORS[p.stage] ?? 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {STAGE_LABELS[p.stage as keyof typeof STAGE_LABELS] ?? p.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
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
        <span className="text-slate-400 text-sm">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
