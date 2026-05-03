'use client'

// ── Prospect Picker ──────────────────────────────────────────────────
// Type-ahead search over prospects. Replaces the plain <select> dropdown
// on /admin/sow/new and similar forms. Lets admin type a fragment of
// the business name (or owner / client_code / city) and pick from a
// filtered list, instead of scrolling through hundreds of <option>s.
//
// Behavior:
//   - Click the field → input becomes editable + dropdown opens
//   - Type to filter (case-insensitive substring match across multiple fields)
//   - Click a result → fires onChange with id + selected prospect
//   - "× Clear" reverts to "— none —"
//   - Click outside → dropdown closes; if user typed without picking,
//     reverts to the last committed selection (so we don't ship a
//     half-typed string as a prospect_id)

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'

export interface ProspectPickerOption {
  id: string
  business_name: string
  owner_name?: string | null
  owner_email?: string | null
  client_code?: string | null
  city?: string | null
  country?: string | null  // ISO 3166-1 alpha-2 (migration 046a)
}

interface Props {
  options: ProspectPickerOption[]
  /** Currently-selected prospect id, or empty string for "none". */
  value: string
  onChange: (id: string) => void
  placeholder?: string
  /** Loading state from the parent's fetch. */
  loading?: boolean
  /** When true, hides the "— none —" option so admin must pick one. */
  required?: boolean
}

function matchesQuery(p: ProspectPickerOption, q: string): boolean {
  if (!q) return true
  const lower = q.toLowerCase()
  return (
    p.business_name.toLowerCase().includes(lower) ||
    (p.owner_name ?? '').toLowerCase().includes(lower) ||
    (p.owner_email ?? '').toLowerCase().includes(lower) ||
    (p.client_code ?? '').toLowerCase().includes(lower) ||
    (p.city ?? '').toLowerCase().includes(lower)
  )
}

export function ProspectPicker({
  options,
  value,
  onChange,
  placeholder = 'Search prospects…',
  loading = false,
  required = false,
}: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = useMemo(
    () => options.find((p) => p.id === value) ?? null,
    [options, value],
  )

  // Filtered list. Limit to 50 results to keep the dropdown snappy
  // even with hundreds of prospects.
  const results = useMemo(() => {
    return options.filter((p) => matchesQuery(p, query)).slice(0, 50)
  }, [options, query])

  // Click-outside collapses the dropdown and resets any typed-but-
  // not-picked query back to empty so the displayed name is always
  // the committed selection (not a half-typed search string).
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    if (open) {
      document.addEventListener('mousedown', onClick)
      return () => document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  // Auto-focus the input when the dropdown opens.
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function pick(id: string) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger: shows selected name OR placeholder. Click to open. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between border border-slate-200 rounded px-2 py-1 mt-1 bg-white text-left text-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-200"
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>
          {selected
            ? selected.business_name
            : (loading ? 'Loading…' : placeholder)}
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          {selected && !required && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleClear(e as unknown as React.MouseEvent)
                }
              }}
              className="hover:text-red-500 cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-50 max-h-80 overflow-y-auto">
          {/* Search input */}
          <div className="sticky top-0 bg-white border-b border-slate-100 p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a name, owner, code, or city…"
                className="w-full pl-7 pr-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
              />
            </div>
          </div>

          {/* Results */}
          <ul className="py-1">
            {!required && (
              <li>
                <button
                  type="button"
                  onClick={() => pick('')}
                  className="w-full text-left px-3 py-1.5 text-sm text-slate-500 italic hover:bg-slate-50"
                >
                  — none —
                </button>
              </li>
            )}
            {results.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-400 italic">
                {options.length === 0
                  ? (loading ? 'Loading prospects…' : 'No prospects loaded')
                  : `No matches for "${query}"`}
              </li>
            )}
            {results.map((p) => {
              const sub = [p.owner_name, p.client_code, p.city].filter(Boolean).join(' · ')
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => pick(p.id)}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-teal-50 ${
                      p.id === value ? 'bg-teal-50' : ''
                    }`}
                  >
                    <div className="font-medium text-slate-900">{p.business_name}</div>
                    {sub && <div className="text-xs text-slate-500">{sub}</div>}
                  </button>
                </li>
              )
            })}
            {options.length > 50 && results.length === 50 && (
              <li className="px-3 py-1.5 text-xs text-slate-400 italic border-t border-slate-100">
                Showing first 50 — refine your search to see more.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
