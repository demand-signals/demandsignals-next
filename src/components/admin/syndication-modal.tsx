'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Send, CheckCircle2, XCircle, Loader2, ExternalLink, RefreshCw, Link2 } from 'lucide-react'

type Platform = 'blogger' | 'tumblr'

type SyndicationLog = {
  id: string
  slug: string
  platform: Platform
  platform_url: string | null
  status: 'pending' | 'success' | 'failed'
  error_message: string | null
  created_at: string
}

type SyndicationResult = {
  status: string
  url?: string
  error?: string
}

const PLATFORMS: { id: Platform; name: string; color: string; icon: string; authPath: string | null }[] = [
  { id: 'blogger', name: 'Blogger', color: '#FF5722', icon: 'B', authPath: '/api/admin/auth/blogger' },
  { id: 'tumblr', name: 'Tumblr', color: '#36465D', icon: 'T', authPath: null }, // OAuth 1.0a via env vars
]

export function SyndicationModal({
  slug,
  title,
  onClose,
}: {
  slug: string
  title: string
  onClose: () => void
}) {
  const [logs, setLogs] = useState<SyndicationLog[]>([])
  const [connections, setConnections] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<Set<Platform>>(new Set())
  const [syndicating, setSyndicating] = useState(false)
  const [results, setResults] = useState<Record<string, SyndicationResult> | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      // Fetch syndication logs for this post
      const logsRes = await fetch(`/api/admin/syndicate?slug=${encodeURIComponent(slug)}`)
      if (logsRes.ok) {
        const data = await logsRes.json()
        setLogs(data.logs ?? [])
      }
      // Fetch connection status
      const connRes = await fetch('/api/admin/syndicate')
      if (connRes.ok) {
        const data = await connRes.json()
        setConnections(data.connections ?? {})
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [slug])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function togglePlatform(p: Platform) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  function selectAllUnsyndicated() {
    const syndicated = new Set(logs.filter(l => l.status === 'success').map(l => l.platform))
    const connected = new Set(Object.entries(connections).filter(([, v]) => v).map(([k]) => k))
    const unsyndicated = PLATFORMS
      .filter(p => !syndicated.has(p.id) && (connected.has(p.id) || !p.authPath))
      .map(p => p.id)
    setSelected(new Set(unsyndicated))
  }

  async function handleSyndicate() {
    if (selected.size === 0) return
    setSyndicating(true)
    setResults(null)

    try {
      const res = await fetch('/api/admin/syndicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, platforms: Array.from(selected) }),
      })
      const data = await res.json()
      setResults(data.results ?? {})
      setSelected(new Set())
      // Refresh status
      await fetchStatus()
    } catch (err) {
      setResults({ _error: { status: 'failed', error: String(err) } })
    }
    setSyndicating(false)
  }

  function getLogForPlatform(platformId: Platform): SyndicationLog | undefined {
    return logs.find(l => l.platform === platformId)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Syndicate Post</h2>
            <p className="text-sm text-slate-500 mt-0.5 max-w-[360px] truncate" title={title}>{title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* Platform cards */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Platforms</span>
                  <button
                    onClick={selectAllUnsyndicated}
                    className="text-xs text-[var(--teal-dark)] hover:underline"
                  >
                    Select all available
                  </button>
                </div>

                <div className="space-y-2">
                  {PLATFORMS.map(platform => {
                    const log = getLogForPlatform(platform.id)
                    const isSyndicated = log?.status === 'success'
                    const isFailed = log?.status === 'failed'
                    const isConnected = connections[platform.id] || !platform.authPath
                    const isSelected = selected.has(platform.id)

                    return (
                      <div key={platform.id} className="flex items-center gap-2">
                        <button
                          onClick={() => isConnected ? togglePlatform(platform.id) : undefined}
                          disabled={syndicating || !isConnected}
                          className={`
                            relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left flex-1
                            ${isSelected
                              ? 'border-[var(--teal)] bg-[var(--teal-light)]'
                              : !isConnected
                                ? 'border-slate-100 bg-slate-50 opacity-60'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }
                            ${syndicating || !isConnected ? 'cursor-not-allowed' : 'cursor-pointer'}
                          `}
                        >
                          {/* Platform icon */}
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                            style={{ backgroundColor: isConnected ? platform.color : '#94a3b8' }}
                          >
                            {platform.icon}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-800">{platform.name}</div>
                            {isSyndicated && log?.platform_url && (
                              <a
                                href={log.platform_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="flex items-center gap-1 text-xs text-green-600 hover:underline mt-0.5"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Live
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            {isSyndicated && !log?.platform_url && (
                              <span className="flex items-center gap-1 text-xs text-green-600 mt-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Syndicated
                              </span>
                            )}
                            {isFailed && (
                              <span className="flex items-center gap-1 text-xs text-red-500 mt-0.5" title={log?.error_message ?? ''}>
                                <XCircle className="w-3 h-3" /> Failed — retry?
                              </span>
                            )}
                            {!log && isConnected && (
                              <span className="text-xs text-slate-400 mt-0.5">Ready to syndicate</span>
                            )}
                            {!isConnected && (
                              <span className="text-xs text-amber-500 mt-0.5">Not connected</span>
                            )}
                          </div>

                          {/* Selection indicator */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--teal)] flex items-center justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                        </button>

                        {/* Connect button for unconnected platforms */}
                        {!isConnected && platform.authPath && (
                          <a
                            href={platform.authPath}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-600 transition-colors shrink-0"
                            title={`Connect ${platform.name}`}
                          >
                            <Link2 className="w-3.5 h-3.5" /> Connect
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Results from latest syndication */}
              {results && (
                <div className="rounded-xl bg-slate-50 p-4 space-y-2">
                  <span className="text-sm font-medium text-slate-700">Results</span>
                  {Object.entries(results).map(([key, result]) => {
                    if (key === '_error') {
                      return (
                        <div key={key} className="flex items-center gap-2 text-sm text-red-600">
                          <XCircle className="w-4 h-4" /> {result.error}
                        </div>
                      )
                    }
                    const platform = PLATFORMS.find(p => p.id === key)
                    return (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        {result.status === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <span className="font-medium text-slate-700">{platform?.name ?? key}</span>
                        {result.status === 'success' && result.url && (
                          <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-[var(--teal-dark)] hover:underline flex items-center gap-1 ml-auto">
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {result.status === 'failed' && (
                          <span className="text-red-500 text-xs ml-auto truncate max-w-[200px]" title={result.error}>{result.error}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Canonical URL info */}
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
                <p className="text-xs text-blue-700">
                  All syndicated posts include a <strong>canonical URL</strong> pointing back to{' '}
                  <code className="bg-blue-100 px-1 rounded">demandsignals.co/blog/{slug}</code> — Google treats your site as the original source.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={fetchStatus}
            disabled={syndicating || loading}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-30"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSyndicate}
              disabled={selected.size === 0 || syndicating}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ backgroundColor: selected.size > 0 && !syndicating ? '#68c5ad' : '#94a3b8' }}
            >
              {syndicating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Syndicating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Syndicate ({selected.size})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
