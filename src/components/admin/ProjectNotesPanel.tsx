'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Plus, EyeOff, Trash2, Pencil, MailCheck, Clock } from 'lucide-react'
import { AddProjectNoteModal } from './AddProjectNoteModal'

// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §11
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 10.6

interface AdminProjectNote {
  id: string
  title: string | null
  body: string
  visibility: 'internal' | 'client'
  source: 'handoff' | 'manual' | 'import'
  client_sent_at: string | null
  suppressed: boolean
  suppressed_reason: string | null
  created_at: string
  hunter_minutes: number
  claude_minutes: number
}

function formatTimeLabel(min: number): string {
  if (min <= 0) return '0m'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ProjectNotesPanel({ projectId }: { projectId: string }) {
  const [notes, setNotes] = useState<AdminProjectNote[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/project-notes?project_id=${projectId}`)
      .then((r) => r.json())
      .then((d) => setNotes(d.notes ?? []))
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  async function handleSuppress(note: AdminProjectNote) {
    setBusyId(note.id)
    await fetch(`/api/admin/project-notes/${note.id}/suppress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suppressed: !note.suppressed }),
    })
    setBusyId(null)
    load()
  }

  async function handleDelete(note: AdminProjectNote) {
    if (!confirm('Delete this note? This cannot be undone.')) return
    setBusyId(note.id)
    const res = await fetch(`/api/admin/project-notes/${note.id}`, {
      method: 'DELETE',
    })
    setBusyId(null)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(j.error ?? 'Delete failed')
      return
    }
    load()
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Project notes</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Client-visible notes appear on the portal and feed the daily digest.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--teal)] text-white text-sm font-medium hover:bg-[var(--teal-dark)]"
        >
          <Plus className="w-4 h-4" />
          Add note
        </button>
      </div>

      {showAdd && (
        <AddProjectNoteModal
          projectId={projectId}
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false)
            load()
          }}
        />
      )}

      {loading ? (
        <div className="px-5 py-12 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : notes.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-500">
          No notes yet. Notes will be auto-created from <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">/handoff</code> sessions or by adding one manually.
        </div>
      ) : (
        <ol className="divide-y divide-slate-100">
          {notes.map((note) => (
            <li key={note.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <VisibilityBadge visibility={note.visibility} />
                  <SendStatusBadge note={note} />
                  <SourceBadge source={note.source} />
                  <span className="text-xs text-slate-400">{formatDate(note.created_at)}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!note.client_sent_at && !note.suppressed && (
                    <button
                      title="Suppress (hold out of next digest)"
                      onClick={() => handleSuppress(note)}
                      disabled={busyId === note.id}
                      className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                    >
                      {busyId === note.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  {note.suppressed && (
                    <button
                      title="Un-suppress"
                      onClick={() => handleSuppress(note)}
                      disabled={busyId === note.id}
                      className="p-1.5 rounded text-amber-600 hover:bg-amber-50 disabled:opacity-50 text-xs"
                    >
                      Un-suppress
                    </button>
                  )}
                  {!note.client_sent_at && (
                    <button
                      title="Delete"
                      onClick={() => handleDelete(note)}
                      disabled={busyId === note.id}
                      className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {note.title && (
                <h3 className="text-sm font-semibold text-slate-900 mb-1">{note.title}</h3>
              )}
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {note.body}
              </p>

              {(note.hunter_minutes > 0 || note.claude_minutes > 0) && (
                <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>
                    Hunter <strong className="text-slate-700">{formatTimeLabel(note.hunter_minutes)}</strong>
                  </span>
                  <span>
                    Claude <strong className="text-slate-700">{formatTimeLabel(note.claude_minutes)}</strong>
                  </span>
                </div>
              )}

              {note.suppressed && note.suppressed_reason && (
                <div className="mt-2 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                  Suppressed: {note.suppressed_reason}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function VisibilityBadge({ visibility }: { visibility: 'internal' | 'client' }) {
  if (visibility === 'client') {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wide font-medium bg-emerald-50 text-emerald-700">
        Client
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wide font-medium bg-slate-100 text-slate-600">
      Internal
    </span>
  )
}

function SendStatusBadge({ note }: { note: AdminProjectNote }) {
  if (note.visibility !== 'client') return null
  if (note.suppressed) {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wide font-medium bg-amber-50 text-amber-700 inline-flex items-center gap-1">
        <EyeOff className="w-3 h-3" /> Suppressed
      </span>
    )
  }
  if (note.client_sent_at) {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wide font-medium bg-teal-50 text-teal-700 inline-flex items-center gap-1">
        <MailCheck className="w-3 h-3" /> Sent {formatDate(note.client_sent_at)}
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wide font-medium bg-amber-50 text-amber-700">
      Pending digest
    </span>
  )
}

function SourceBadge({ source }: { source: 'handoff' | 'manual' | 'import' }) {
  const tints: Record<string, string> = {
    handoff: 'bg-violet-50 text-violet-700',
    manual: 'bg-slate-50 text-slate-600',
    import: 'bg-slate-50 text-slate-500',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wide font-medium ${tints[source]}`}>
      {source}
    </span>
  )
}
