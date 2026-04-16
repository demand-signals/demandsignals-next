'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Globe, ExternalLink, Trash2, Pencil, Plus, X,
  Newspaper, Rss, FileText, CircleDot,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── Types ─────────────────────────────────────────────────────────── */

interface ChangelogSource {
  id: string
  name: string
  url: string
  type: 'html' | 'rss'
  active: boolean
}

interface BlogPost {
  slug: string
  title: string
  date: string
}

/* ── Helpers ───────────────────────────────────────────────────────── */

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/* ── Modal ─────────────────────────────────────────────────────────── */

function SourceModal({
  source,
  onSave,
  onClose,
}: {
  source: ChangelogSource | null
  onSave: (src: ChangelogSource) => void
  onClose: () => void
}) {
  const isEdit = !!source
  const [name, setName] = useState(source?.name ?? '')
  const [id, setId] = useState(source?.id ?? '')
  const [url, setUrl] = useState(source?.url ?? '')
  const [type, setType] = useState<'html' | 'rss'>(source?.type ?? 'html')
  const [active, setActive] = useState(source?.active ?? true)
  const [saving, setSaving] = useState(false)

  // Auto-generate id from name (only for new sources)
  useEffect(() => {
    if (!isEdit) {
      setId(slugify(name))
    }
  }, [name, isEdit])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !url.trim() || !id.trim()) return
    setSaving(true)
    onSave({ id, name: name.trim(), url: url.trim(), type, active })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">
            {isEdit ? 'Edit Source' : 'Add Source'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. OpenAI"
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--teal)] focus:border-transparent"
            />
          </div>

          {/* ID */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ID / Slug
            </label>
            <input
              type="text"
              value={id}
              onChange={e => setId(e.target.value)}
              placeholder="auto-generated-from-name"
              required
              disabled={isEdit}
              className={cn(
                'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--teal)] focus:border-transparent',
                isEdit && 'bg-slate-50 text-slate-500 cursor-not-allowed'
              )}
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--teal)] focus:border-transparent"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as 'html' | 'rss')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--teal)] focus:border-transparent appearance-none bg-white"
            >
              <option value="html">HTML</option>
              <option value="rss">RSS</option>
            </select>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                active ? 'bg-[var(--teal)]' : 'bg-slate-300'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  active ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
            <span className="text-sm text-slate-700">Active</span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim() || !url.trim()}
              className="px-4 py-2 text-sm text-white bg-[var(--teal)] hover:bg-[var(--teal-dark)] rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : isEdit ? 'Update Source' : 'Add Source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Main Page ─────────────────────────────────────────────────────── */

export default function ChangelogAdminPage() {
  const [sources, setSources] = useState<ChangelogSource[]>([])
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalSource, setModalSource] = useState<ChangelogSource | null | undefined>(undefined)
  // undefined = closed, null = new, ChangelogSource = edit
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const isModalOpen = modalSource !== undefined

  /* ── Fetch sources ──────────────────────────────────────────────── */

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/changelog')
      if (!res.ok) throw new Error('Failed to fetch sources')
      const data = await res.json()
      setSources(data.sources)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load sources')
    }
  }, [])

  /* ── Fetch recent changelog posts ───────────────────────────────── */

  const fetchRecentPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/blog?category=ai-changelog&limit=10')
      if (!res.ok) return
      const data = await res.json()
      setRecentPosts(
        data.data.map((p: { slug: string; title: string; date: string }) => ({
          slug: p.slug,
          title: p.title,
          date: p.date,
        }))
      )
    } catch {
      // Not critical — silently ignore
    }
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([fetchSources(), fetchRecentPosts()])
      setLoading(false)
    }
    init()
  }, [fetchSources, fetchRecentPosts])

  /* ── Save (add / update) ────────────────────────────────────────── */

  async function handleSave(src: ChangelogSource) {
    const isEdit = sources.some(s => s.id === src.id)
    const method = isEdit ? 'PUT' : 'POST'

    try {
      const res = await fetch('/api/admin/changelog', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(src),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Save failed')
      }

      const data = await res.json()
      setSources(data.sources)
      setModalSource(undefined)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Save failed')
    }
  }

  /* ── Delete ─────────────────────────────────────────────────────── */

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/changelog?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Delete failed')
      }

      const data = await res.json()
      setSources(data.sources)
      setDeleteConfirm(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  /* ── Render ─────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">The AI ChangeLog</h1>
          <p className="text-slate-500 text-sm mt-1">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">The AI ChangeLog</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage changelog sources, LLM platforms, and scraping configuration
          </p>
        </div>
        <button
          onClick={() => setModalSource(null)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Source
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--teal)]/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-[var(--teal)]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{sources.length}</div>
            <div className="text-xs text-slate-500">Total Sources</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <CircleDot className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{sources.filter(s => s.active).length}</div>
            <div className="text-xs text-slate-500">Active</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{sources.filter(s => s.type === 'html').length}</div>
            <div className="text-xs text-slate-500">HTML Sources</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
            <Rss className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{sources.filter(s => s.type === 'rss').length}</div>
            <div className="text-xs text-slate-500">RSS Sources</div>
          </div>
        </div>
      </div>

      {/* Sources table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">URL</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sources.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No sources configured. Click &quot;Add Source&quot; to get started.
                  </td>
                </tr>
              )}
              {sources.map(src => (
                <tr
                  key={src.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{src.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{src.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[var(--teal-dark)] hover:underline text-sm max-w-[320px] truncate"
                      title={src.url}
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{src.url}</span>
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                        src.type === 'rss'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                      )}
                    >
                      {src.type === 'rss' ? (
                        <Rss className="w-3 h-3" />
                      ) : (
                        <Globe className="w-3 h-3" />
                      )}
                      {src.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          src.active ? 'bg-emerald-500' : 'bg-slate-300'
                        )}
                      />
                      <span className={cn(
                        'text-xs',
                        src.active ? 'text-emerald-600' : 'text-slate-400'
                      )}>
                        {src.active ? 'Active' : 'Inactive'}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setModalSource(src)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Edit source"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {deleteConfirm === src.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(src.id)}
                            className="px-2 py-1 text-xs text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(src.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete source"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent ChangeLog Posts */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-[var(--teal)]" />
          Recent ChangeLog Posts
        </h2>
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          {recentPosts.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-400 text-sm">
              No changelog posts found. Posts with category &quot;ai-changelog&quot; will appear here.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentPosts.map(post => (
                <div
                  key={post.slug}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="text-sm font-medium text-slate-800 truncate">
                      {post.title}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {new Date(post.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <a
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-[var(--teal-dark)] hover:underline flex-shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <SourceModal
          source={modalSource}
          onSave={handleSave}
          onClose={() => setModalSource(undefined)}
        />
      )}
    </div>
  )
}
