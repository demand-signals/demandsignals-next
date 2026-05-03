'use client'

// ── InlineEditText ──────────────────────────────────────────────────
// Click-to-edit text. Used for fields like project.name and
// trade_credit.description that are snapshots from the SOW at
// acceptance time but should be editable as the live working title
// without disturbing the SOW source-of-truth contract.
//
// Behavior:
//   - Renders the value as a styled <span> (or <h1>, etc. via `as`)
//   - Click → swaps to <input> seeded with current value, focused
//   - Enter or blur → calls onSave(newValue). Empty / unchanged → cancel.
//   - Esc → cancel without save
//   - While saving: shows spinner, blocks further edits
//   - On error: surfaces alert + reverts to original value

import { useEffect, useRef, useState } from 'react'
import { Loader2, Pencil } from 'lucide-react'

interface Props {
  value: string
  /** Called with the new trimmed value. Caller persists + returns the
   *  saved value (or throws on error). */
  onSave: (next: string) => Promise<void>
  /** Display-only className applied to the rendered text element. */
  className?: string
  /** Tag to render as (default 'span'). Pass 'h1', 'h2', etc. as needed. */
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'div' | 'p'
  /** Placeholder when value is empty. */
  placeholder?: string
  /** Pencil icon next to the value (default true). Click target is the
   *  whole element either way. */
  showPencil?: boolean
}

export function InlineEditText({
  value,
  onSave,
  className = '',
  as = 'span',
  placeholder = 'Click to edit',
  showPencil = true,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep draft in sync if parent re-renders with a new value (e.g.
  // after a load() refetch).
  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  async function commit() {
    const next = draft.trim()
    if (!next || next === value) {
      setDraft(value)
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(next)
      setEditing(false)
    } catch (e) {
      alert(`Save failed: ${e instanceof Error ? e.message : String(e)}`)
      setDraft(value)
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setDraft(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-2 w-full">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Escape') {
              cancel()
            }
          }}
          disabled={saving}
          className={`flex-1 border border-teal-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-200 ${className}`}
          placeholder={placeholder}
        />
        {saving && <Loader2 className="w-4 h-4 animate-spin text-teal-500" />}
      </span>
    )
  }

  // Display state — single render branch with the right tag.
  const Tag = as
  return (
    <Tag
      onClick={() => setEditing(true)}
      className={`group cursor-pointer inline-flex items-center gap-2 hover:bg-slate-50 rounded px-1 -mx-1 ${className}`}
      title="Click to edit"
    >
      {value || <span className="italic text-slate-400">{placeholder}</span>}
      {showPencil && (
        <Pencil className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </Tag>
  )
}
