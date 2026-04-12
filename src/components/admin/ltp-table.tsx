'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronLeft, ChevronRight, ExternalLink, MapPin, Building2, Wrench, Layers } from 'lucide-react'
import { StatCard } from './stat-card'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 50

type LtpRow = {
  slug: string
  cityName: string
  citySlug: string
  population: string
  serviceName: string
  serviceSlug: string
  serviceCategory: string
  serviceCategoryLabel: string
  serviceCategoryColor: string
}

type LtpResponse = {
  data: LtpRow[]
  total: number
  page: number
  limit: number
  stats: {
    totalPages: number
    citiesCount: number
    servicesCount: number
    byCategory: { category: string; label: string; color: string; count: number }[]
  }
}

async function fetchLtps(params: { search: string; city: string; category: string; page: number }): Promise<LtpResponse> {
  const sp = new URLSearchParams()
  if (params.search) sp.set('search', params.search)
  if (params.city) sp.set('city', params.city)
  if (params.category) sp.set('category', params.category)
  sp.set('page', String(params.page))
  sp.set('limit', String(PAGE_SIZE))
  const res = await fetch(`/api/admin/long-tails?${sp}`)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

const CATEGORY_COLORS: Record<string, string> = {
  'websites-apps': 'bg-blue-50 text-blue-700',
  'demand-generation': 'bg-teal-50 text-teal-700',
  'content-social': 'bg-purple-50 text-purple-700',
  'ai-services': 'bg-orange-50 text-orange-700',
}

export function LtpTable() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)

  function handleSearchChange(val: string) {
    setSearch(val)
    if (searchTimer) clearTimeout(searchTimer)
    const t = setTimeout(() => { setDebouncedSearch(val); setPage(1) }, 300)
    setSearchTimer(t)
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['long-tails', debouncedSearch, city, category, page],
    queryFn: () => fetchLtps({ search: debouncedSearch, city, category, page }),
  })

  const ltps = data?.data ?? []
  const total = data?.total ?? 0
  const stats = data?.stats
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const selectClass = 'bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--teal)] appearance-none min-w-[140px]'

  // Collect unique cities for dropdown from first full load
  const { data: allData } = useQuery({
    queryKey: ['long-tails-cities'],
    queryFn: () => fetchLtps({ search: '', city: '', category: '', page: 1 }),
    staleTime: 300_000,
  })

  const cityOptions = allData ? [...new Set(allData.data.map(d => d.cityName))].sort().map(name => {
    const slug = allData.data.find(d => d.cityName === name)?.citySlug ?? ''
    return { name, slug }
  }) : []

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Pages" value={stats.totalPages.toLocaleString()} icon={MapPin} color="#68c5ad" />
          <StatCard label="Cities" value={stats.citiesCount.toString()} icon={Building2} color="#3b82f6" />
          <StatCard label="Services" value={stats.servicesCount.toString()} icon={Wrench} color="#f28500" />
          <StatCard label="Categories" value={stats.byCategory.length.toString()} icon={Layers} color="#7C3AED" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search city or service…"
            className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg pl-9 pr-3 py-2 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
          />
        </div>
        <select value={city} onChange={e => { setCity(e.target.value); setPage(1) }} className={selectClass}>
          <option value="">All Cities</option>
          {cityOptions.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1) }} className={selectClass}>
          <option value="">All Categories</option>
          <option value="websites-apps">Websites & Apps</option>
          <option value="demand-generation">Demand Generation</option>
          <option value="content-social">Content & Social</option>
          <option value="ai-services">AI & Agents</option>
        </select>
        <span className="text-slate-400 text-sm ml-auto">{total.toLocaleString()} pages</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-slate-500 font-medium">City</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Service</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Category</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Population</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Links</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
              )}
              {isError && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-red-500">Failed to load.</td></tr>
              )}
              {!isLoading && !isError && ltps.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No pages found.</td></tr>
              )}
              {ltps.map(ltp => (
                <tr key={ltp.slug} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-800 font-medium">{ltp.cityName}</td>
                  <td className="px-4 py-3 text-slate-600">{ltp.serviceName}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                      CATEGORY_COLORS[ltp.serviceCategory] ?? 'bg-slate-100 text-slate-500'
                    )}>
                      {ltp.serviceCategoryLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{ltp.population}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <a
                        href={`/${ltp.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-[var(--teal-dark)] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> Live
                      </a>
                      <a
                        href={`/feeds/ltp/${ltp.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-400 hover:underline"
                      >
                        Feed
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-slate-400 text-sm">Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
