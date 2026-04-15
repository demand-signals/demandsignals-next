'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronLeft, ChevronRight, ExternalLink, FileText, Star, Tag, Calendar, Send } from 'lucide-react'
import { StatCard } from './stat-card'
import { SyndicationModal } from './syndication-modal'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 25

type BlogRow = {
  slug: string
  title: string
  date: string
  author: string
  category: string
  readTime: string
  featured: boolean
  serviceCategories: string[]
  excerpt: string
}

type BlogResponse = {
  data: BlogRow[]
  total: number
  page: number
  limit: number
  stats: {
    totalPosts: number
    featuredCount: number
    latestPostDate: string | null
    byCategory: { category: string; label: string; color: string; count: number }[]
    byServiceCategory: { category: string; count: number }[]
  }
}

async function fetchBlog(params: { search: string; category: string; featured: string; page: number }): Promise<BlogResponse> {
  const sp = new URLSearchParams()
  if (params.search) sp.set('search', params.search)
  if (params.category) sp.set('category', params.category)
  if (params.featured) sp.set('featured', params.featured)
  sp.set('page', String(params.page))
  sp.set('limit', String(PAGE_SIZE))
  const res = await fetch(`/api/admin/blog?${sp}`)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

const CATEGORY_LABELS: Record<string, string> = {
  'search-updates': 'Search Updates',
  'core-updates': 'Core Updates',
  'ai-engineering': 'AI Engineering',
  'search-central': 'Search Central',
  'industry-trends': 'Industry Trends',
  'how-to': 'How-To',
  'case-studies': 'Case Studies',
}

const CATEGORY_COLORS: Record<string, string> = {
  'search-updates': '#2563EB',
  'core-updates': '#DC2626',
  'ai-engineering': '#7C3AED',
  'search-central': '#059669',
  'industry-trends': '#D97706',
  'how-to': '#0891B2',
  'case-studies': '#DB2777',
}

export function BlogTable() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [category, setCategory] = useState('')
  const [featured, setFeatured] = useState('')
  const [page, setPage] = useState(1)
  const [syndicatePost, setSyndicatePost] = useState<{ slug: string; title: string } | null>(null)

  function handleSearchChange(val: string) {
    setSearch(val)
    if (searchTimer) clearTimeout(searchTimer)
    const t = setTimeout(() => { setDebouncedSearch(val); setPage(1) }, 300)
    setSearchTimer(t)
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['blog-admin', debouncedSearch, category, featured, page],
    queryFn: () => fetchBlog({ search: debouncedSearch, category, featured, page }),
  })

  const posts = data?.data ?? []
  const total = data?.total ?? 0
  const stats = data?.stats
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const selectClass = 'bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--teal)] appearance-none min-w-[140px]'

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Posts" value={stats.totalPosts.toString()} icon={FileText} color="#68c5ad" />
          <StatCard label="Featured" value={stats.featuredCount.toString()} icon={Star} color="#eab308" />
          <StatCard label="Categories" value={stats.byCategory.length.toString()} icon={Tag} color="#7C3AED" />
          <StatCard label="Latest Post" value={stats.latestPostDate ? new Date(stats.latestPostDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'} icon={Calendar} color="#3b82f6" />
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
            placeholder="Search posts…"
            className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg pl-9 pr-3 py-2 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
          />
        </div>
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1) }} className={selectClass}>
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <select value={featured} onChange={e => { setFeatured(e.target.value); setPage(1) }} className={selectClass}>
          <option value="">All Posts</option>
          <option value="true">Featured</option>
          <option value="false">Not Featured</option>
        </select>
        <span className="text-slate-400 text-sm ml-auto">{total} posts</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Title</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Date</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Category</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Read</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium w-10"></th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Links</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
              )}
              {isError && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-red-500">Failed to load.</td></tr>
              )}
              {!isLoading && !isError && posts.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No posts found.</td></tr>
              )}
              {posts.map(post => (
                <tr key={post.slug} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-slate-800 font-medium max-w-[320px] truncate" title={post.title}>
                      {post.title}
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5">{post.author}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex px-2 py-0.5 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: CATEGORY_COLORS[post.category] || '#6b7280' }}
                    >
                      {CATEGORY_LABELS[post.category] || post.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{post.readTime}</td>
                  <td className="px-4 py-3 text-center">
                    {post.featured ? (
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400 inline-block" />
                    ) : (
                      <Star className="w-4 h-4 text-slate-200 inline-block" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-[var(--teal-dark)] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> View
                      </a>
                      <a
                        href={`/feeds/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-400 hover:underline"
                      >
                        Feed
                      </a>
                      <button
                        onClick={() => setSyndicatePost({ slug: post.slug, title: post.title })}
                        className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 transition-colors"
                        title="Syndicate to external platforms"
                      >
                        <Send className="w-3 h-3" /> Syndicate
                      </button>
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

      {/* Syndication Modal */}
      {syndicatePost && (
        <SyndicationModal
          slug={syndicatePost.slug}
          title={syndicatePost.title}
          onClose={() => setSyndicatePost(null)}
        />
      )}
    </div>
  )
}
