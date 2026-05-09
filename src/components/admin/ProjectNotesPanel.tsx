'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Plus, EyeOff, Trash2, Pencil, MailCheck, Clock, ChevronDown, ChevronUp, Check, X } from 'lucide-react'
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
  const [expandedBodies, setExpandedBodies] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [editTitle, setEditTitle] = useState('')

  function toggleBody(id: string) {
    setExpandedBodies((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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

  function startEdit(note: AdminProjectNote) {
    setEditingId(note.id)
    setEditBody(note.body)
    setEditTitle(note.title ?? '')
  }
  function cancelEdit() {
    setEditingId(null)
    setEditBody('')
    setEditTitle('')
  }
  async function saveEdit(noteId: string) {
    setBusyId(noteId)
    const res = await fetch(`/api/admin/project-notes/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: editBody,
        title: editTitle.trim() || null,
      }),
    })
    setBusyId(null)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(j.error ?? 'Edit failed')
      return
    }
    cancelEdit()
    load()
  }

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
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <h2 className="text-base font-semibold text-slate-800 inline-flex items-center gap-2">
              Project notes
              {notes.length > 0 && (
                <span className="text-xs text-slate-400 font-normal">({notes.length})</span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Client-visible notes appear on the portal and feed the daily digest.
            </p>
          </div>
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
          {notes.map((note) => {
            const isEditing = editingId === note.id
            const canEdit = !note.client_sent_at
            const bodyLineCount = note.body.split('\n').length
            const bodyIsLong = bodyLineCount > 6 || note.body.length > 400
            const bodyExpanded = expandedBodies.has(note.id)
            const showFullBody = isEditing || bodyExpanded || !bodyIsLong
            return (
              <li key={note.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <VisibilityBadge visibility={note.visibility} />
                    <SendStatusBadge note={note} />
                    <SourceBadge source={note.source} />
                    <span className="text-xs text-slate-400">{formatDate(note.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canEdit && !isEditing && (
                      <button
                        title="Edit note"
                        onClick={() => startEdit(note)}
                        className="p-1.5 rounded text-slate-400 hover:text-teal-600 hover:bg-teal-50"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!note.client_sent_at && !note.suppressed && !isEditing && (
                      <button
                        title="Suppress (hold out of next digest)"
                        onClick={() => handleSuppress(note)}
                        disabled={busyId === note.id}
                        className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                      >
                        {busyId === note.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {note.suppressed && !isEditing && (
                      <button
                        title="Un-suppress"
                        onClick={() => handleSuppress(note)}
                        disabled={busyId === note.id}
                        className="p-1.5 rounded text-amber-600 hover:bg-amber-50 disabled:opacity-50 text-xs"
                      >
                        Un-suppress
                      </button>
                    )}
                    {!note.client_sent_at && !isEditing && (
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

                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Title (optional)"
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-300"
                    />
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={Math.max(4, Math.min(20, editBody.split('\n').length + 1))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-300"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded text-slate-600 hover:bg-slate-100"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(note.id)}
                        disabled={busyId === note.id || !editBody.trim()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-[var(--teal)] text-white font-medium disabled:opacity-50 hover:bg-[var(--teal-dark)]"
                      >
                        {busyId === note.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {note.title && (
                      <h3 className="text-sm font-semibold text-slate-900 mb-1 inline-flex items-center gap-2">
                        <span>{note.title}</span>
                        {bodyIsLong && (
                          <button
                            onClick={() => toggleBody(note.id)}
                            title={bodyExpanded ? 'Collapse' : 'Expand'}
                            className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          >
                            {bodyExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </h3>
                    )}
                    {!note.title && bodyIsLong && (
                      <button
                        onClick={() => toggleBody(note.id)}
                        className="mb-1 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700"
                      >
                        {bodyExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" /> Collapse
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" /> Expand
                          </>
                        )}
                      </button>
                    )}
                    {showFullBody ? (
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {note.body}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                        {note.body.split('\n').slice(0, 2).join(' ').slice(0, 200)}
                        {note.body.length > 200 ? '…' : ''}
                      </p>
                    )}
                  </>
                )}

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
            )
          })}
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
