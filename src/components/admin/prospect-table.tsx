'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
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

function AddProspectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [form, setForm] = useState({
    business_name: '', industry: '', website_url: '',
    city: '', state: '', address: '', zip: '',
    owner_name: '', owner_email: '', owner_phone: '',
    business_phone: '', business_email: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))
  const ic = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-[var(--teal)] bg-white'
  const sc = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-[var(--teal)] bg-white appearance-none'

  async function save() {
    if (!form.business_name.trim()) { setError('Business name is required'); return }
    setSaving(true); setError('')
    try {
      const body: Record<string, any> = {}
      for (const [k, v] of Object.entries(form)) { if (v.trim()) body[k] = v.trim() }
      body.stage = 'researched'
      body.source = 'manual'
      const res = await fetch('/api/admin/prospects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to create') }
      const { data } = await res.json()
      onCreated(data.id)
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-8">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[calc(100vh-6rem)] overflow-y-auto border border-slate-200">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-800">Add Prospect</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Business Name *</label>
            <input className={ic} value={form.business_name} onChange={e => set('business_name', e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Industry</label>
              <select className={sc} value={form.industry} onChange={e => set('industry', e.target.value)}>
                <option value="">— Select —</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Website</label>
              <input className={ic} value={form.website_url} onChange={e => set('website_url', e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Address</label>
            <input className={ic} value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">City</label>
              <input className={ic} value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">State</label>
              <input className={ic} value={form.state} onChange={e => set('state', e.target.value)} maxLength={2} placeholder="CA" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">ZIP</label>
              <input className={ic} value={form.zip} onChange={e => set('zip', e.target.value)} maxLength={10} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Owner Name</label>
              <input className={ic} value={form.owner_name} onChange={e => set('owner_name', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Owner Email</label>
              <input className={ic} type="email" value={form.owner_email} onChange={e => set('owner_email', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Owner Phone</label>
              <input className={ic} value={form.owner_phone} onChange={e => set('owner_phone', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Business Phone</label>
              <input className={ic} value={form.business_phone} onChange={e => set('business_phone', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Business Email</label>
            <input className={ic} type="email" value={form.business_email} onChange={e => set('business_email', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Notes</label>
            <textarea className={cn(ic, 'resize-y')} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-end gap-2 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 bg-[var(--teal)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-50">
            {saving ? 'Creating…' : 'Create Prospect'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ProspectTable() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Seed initial filter state from URL params (for dashboard click-through)
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [stage, setStage] = useState(searchParams.get('stage') ?? '')
  const [industry, setIndustry] = useState(searchParams.get('industry') ?? '')
  const [page, setPage] = useState(1)

  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

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

        <div className="flex items-center gap-3 ml-auto">
          <span className="text-slate-400 text-sm">
            {total.toLocaleString()} prospects
          </span>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--teal)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--teal-dark)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Prospect
          </button>
        </div>
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

      {/* Add Prospect Modal */}
      {showAdd && (
        <AddProspectModal
          onClose={() => setShowAdd(false)}
          onCreated={(id) => {
            setShowAdd(false)
            queryClient.invalidateQueries({ queryKey: ['prospects'] })
            router.push(`/admin/prospects/${id}`)
          }}
        />
      )}
    </div>
  )
}
