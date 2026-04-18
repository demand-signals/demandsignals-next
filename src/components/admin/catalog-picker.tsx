'use client'

// ── Catalog Picker ──────────────────────────────────────────────────
// Type-ahead search over services_catalog. Used by invoice + SOW line
// item forms. Selecting an item returns the full service row so callers
// can populate description + unit_price_cents from displayPriceCents.
//
// Also exposes a "+ Add new to catalog" quick-add modal so if a needed
// service is missing, admin can add it without leaving the page.

import { useEffect, useRef, useState } from 'react'
import { Search, Plus, CheckCircle2, Loader2 } from 'lucide-react'

export interface CatalogPickerItem {
  id: string
  name: string
  category: string
  description: string | null
  benefit: string | null
  display_price_cents: number
  base_range_low_cents: number
  base_range_high_cents: number
  included_with_paid_project: boolean
  pricing_type: string
}

const CATEGORY_LABELS: Record<string, string> = {
  'your-website': 'Your Website',
  'existing-site': 'Existing Site',
  'features-integrations': 'Features & Integrations',
  'get-found': 'Get Found (SEO)',
  'content-social': 'Content & Social',
  'ai-automation': 'AI Automation',
  'research-strategy': 'Research & Strategy',
  'monthly-services': 'Monthly Services',
  hosting: 'Hosting',
  'team-rates': 'Team Rates',
}

export function CatalogPicker({
  onPick,
  placeholder = 'Search catalog… (type to filter)',
  compact = false,
}: {
  onPick: (item: CatalogPickerItem) => void
  placeholder?: string
  compact?: boolean
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CatalogPickerItem[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      if (query.length === 0 && !open) {
        setResults([])
        return
      }
      setLoading(true)
      const sp = new URLSearchParams()
      sp.set('active', 'true')
      if (query) sp.set('search', query)
      fetch(`/api/admin/services-catalog?${sp}`)
        .then((r) => r.json())
        .then((d) => setResults(d.services ?? []))
        .finally(() => setLoading(false))
    }, 150)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [query, open])

  // Close on click-outside.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', onClick)
      return () => document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`w-full border border-slate-200 rounded pl-8 pr-3 ${
            compact ? 'py-1 text-sm' : 'py-2'
          } focus:outline-none focus:ring-2 focus:ring-teal-500`}
        />
      </div>

      {open && (
        <div className="absolute z-40 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-slate-500 text-center">
              {query ? 'No matching services' : 'Start typing to search…'}
            </div>
          ) : (
            <>
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onPick(item)
                    setQuery('')
                    setOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-teal-50 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm flex items-center gap-2">
                        {item.name}
                        {item.included_with_paid_project && (
                          <span title="Included with paid project">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {CATEGORY_LABELS[item.category] ?? item.category}
                        {item.description ? ` · ${item.description}` : item.benefit ? ` · ${item.benefit}` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-sm">
                        ${(item.display_price_cents / 100).toFixed(0)}
                      </div>
                      {item.base_range_low_cents !== item.base_range_high_cents && (
                        <div className="text-[10px] text-slate-400">
                          ${(item.base_range_low_cents / 100).toFixed(0)} –{' '}
                          ${(item.base_range_high_cents / 100).toFixed(0)}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              <button
                onClick={() => {
                  setShowQuickAdd(true)
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-teal-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add new service to catalog…
              </button>
            </>
          )}
        </div>
      )}

      {showQuickAdd && (
        <QuickAddModal
          initialName={query}
          onClose={(newService) => {
            setShowQuickAdd(false)
            if (newService) {
              onPick(newService)
              setQuery('')
              setResults([])
            }
          }}
        />
      )}
    </div>
  )
}

function QuickAddModal({
  initialName,
  onClose,
}: {
  initialName: string
  onClose: (created: CatalogPickerItem | null) => void
}) {
  const [data, setData] = useState({
    id: initialName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'new-service',
    name: initialName || '',
    category: 'your-website',
    description: '',
    display_price_cents: 0,
    pricing_type: 'one-time',
    included_with_paid_project: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/services-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Failed')
      onClose(result.service)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={() => onClose(null)}
    >
      <div
        className="bg-white rounded-xl p-6 max-w-md w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">Add Service to Catalog</h2>
        <p className="text-xs text-slate-600">
          Quick-add new service. You can edit the full details later at{' '}
          <b>/admin/services</b>.
        </p>

        <div className="space-y-3 text-sm">
          <label className="block">
            Name
            <input
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
              autoFocus
            />
          </label>
          <label className="block">
            ID (url-safe slug, permanent)
            <input
              value={data.id}
              onChange={(e) => setData({ ...data, id: e.target.value })}
              className="w-full border border-slate-200 rounded px-2 py-1 mt-1 font-mono text-xs"
            />
          </label>
          <label className="block">
            Category
            <select
              value={data.category}
              onChange={(e) => setData({ ...data, category: e.target.value })}
              className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
            >
              {Object.entries(CATEGORY_LABELS).map(([slug, label]) => (
                <option key={slug} value={slug}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Description
            <input
              value={data.description}
              onChange={(e) => setData({ ...data, description: e.target.value })}
              className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
              placeholder="What the client is getting."
            />
          </label>
          <label className="block">
            Price ($)
            <input
              type="number"
              step="1"
              value={data.display_price_cents / 100}
              onChange={(e) =>
                setData({
                  ...data,
                  display_price_cents: Math.round(parseFloat(e.target.value || '0') * 100),
                })
              }
              className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
            />
          </label>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex justify-end gap-2">
          <button onClick={() => onClose(null)} className="px-3 py-1.5 text-sm">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !data.name || !data.id}
            className="bg-teal-500 text-white rounded px-4 py-1.5 text-sm font-bold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Add & Use'}
          </button>
        </div>
      </div>
    </div>
  )
}
