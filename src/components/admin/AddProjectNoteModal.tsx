'use client'

import { useState } from 'react'
import { Loader2, X } from 'lucide-react'

interface AddProjectNoteModalProps {
  projectId: string
  onClose: () => void
  onCreated: () => void
}

export function AddProjectNoteModal({
  projectId,
  onClose,
  onCreated,
}: AddProjectNoteModalProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState<'client' | 'internal'>('client')
  const [hunterMin, setHunterMin] = useState('')
  const [claudeMin, setClaudeMin] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!body.trim()) {
      setErr('Body is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/project-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          title: title.trim() || null,
          body: body.trim(),
          visibility,
          source: 'manual',
          hunter_minutes: hunterMin ? Math.max(0, parseInt(hunterMin, 10)) : 0,
          claude_minutes: claudeMin ? Math.max(0, parseInt(claudeMin, 10)) : 0,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr(j.error ?? 'Save failed')
        setSaving(false)
        return
      }
      setSaving(false)
      onCreated()
    } catch {
      setErr('Save failed')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto pt-12 pb-12 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Add project note</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              Title (optional)
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Short headline for this update"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              Body (markdown)
            </span>
            <textarea
              required
              autoFocus
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="What did we ship today? What's next?"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
            <span className="block mt-1 text-[11px] text-slate-400">
              Supports markdown — bold, italic, links, lists, code.
            </span>
          </label>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Visibility
            </legend>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value="client"
                checked={visibility === 'client'}
                onChange={() => setVisibility('client')}
                className="mt-0.5"
              />
              <span className="text-sm text-slate-700">
                <strong>Client</strong> — appears on the portal, included in tomorrow&apos;s 9am digest
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value="internal"
                checked={visibility === 'internal'}
                onChange={() => setVisibility('internal')}
                className="mt-0.5"
              />
              <span className="text-sm text-slate-700">
                <strong>Internal</strong> — admin only, never shown to client
              </span>
            </label>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                Hunter minutes
              </span>
              <input
                type="number"
                min="0"
                value={hunterMin}
                onChange={(e) => setHunterMin(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                Claude minutes
              </span>
              <input
                type="number"
                min="0"
                value={claudeMin}
                onChange={(e) => setClaudeMin(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </label>
          </div>

          {err && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {err}
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-sm rounded-lg bg-[var(--teal)] text-white hover:bg-[var(--teal-dark)] disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Add note
          </button>
        </div>
      </form>
    </div>
  )
}
