'use client'

import { useState } from 'react'
import { Loader2, X, Copy, Check, AlertTriangle } from 'lucide-react'

type ExpiryChoice = 'never' | '7d' | '30d' | '90d' | 'custom'

interface CreateTokenModalProps {
  onClose: () => void
  onCreated: () => void
}

function expiryToIso(choice: ExpiryChoice, customDate: string): string | null {
  if (choice === 'never') return null
  if (choice === 'custom') {
    if (!customDate) return null
    // customDate is YYYY-MM-DD; expire at end of that day in admin's local TZ
    return new Date(`${customDate}T23:59:59`).toISOString()
  }
  const days = choice === '7d' ? 7 : choice === '30d' ? 30 : 90
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

export function CreateTokenModal({ onClose, onCreated }: CreateTokenModalProps) {
  const [name, setName] = useState('')
  const [expiryChoice, setExpiryChoice] = useState<ExpiryChoice>('never')
  const [customDate, setCustomDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // After successful create:
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!name.trim()) {
      setErr('Name is required')
      return
    }
    if (expiryChoice === 'custom' && !customDate) {
      setErr('Pick a custom expiry date')
      return
    }
    setSaving(true)
    const res = await fetch('/api/admin/cli-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        expires_at: expiryToIso(expiryChoice, customDate),
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j.error ?? 'Create failed')
      return
    }
    const j = await res.json()
    setCreatedToken(j.plaintext)
  }

  async function handleCopy() {
    if (!createdToken) return
    await navigator.clipboard.writeText(createdToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    if (createdToken) {
      onCreated()
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto pt-16 pb-12 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            {createdToken ? 'Token created' : 'Generate CLI token'}
          </h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!createdToken ? (
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                  Name *
                </span>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  placeholder="e.g. DSIG shared CLI"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  Descriptive only. Doesn&apos;t affect routing or visibility.
                </span>
              </label>

              <fieldset>
                <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Expiry
                </legend>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(['never', '7d', '30d', '90d', 'custom'] as const).map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setExpiryChoice(c)}
                      className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                        expiryChoice === c
                          ? 'bg-[var(--teal)] text-white border-[var(--teal)]'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {c === 'never' ? 'Never' : c === '7d' ? '7 days' : c === '30d' ? '30 days' : c === '90d' ? '90 days' : 'Custom'}
                    </button>
                  ))}
                </div>
                {expiryChoice === 'custom' && (
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                  />
                )}
              </fieldset>

              {err && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {err}
                </p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
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
                Generate
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <strong>This is your only chance to copy this token.</strong> After you close this dialog, only the prefix and last 4 chars will be visible. The token is shared across all admin workstations via the NAS.
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                Token (copy NOW)
              </span>
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2 bg-slate-100 rounded-lg text-xs font-mono break-all">
                  {createdToken}
                </code>
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 rounded-lg bg-[var(--teal)] text-white text-sm font-medium hover:bg-[var(--teal-dark)] inline-flex items-center gap-1.5 shrink-0"
                >
                  {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>
            </label>

            <div className="text-sm text-slate-600 space-y-2">
              <div>Paste this into <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">Y:\.credentials\dsig.env</code> as:</div>
              <code className="block bg-slate-100 rounded p-2 text-xs font-mono break-all">
                DSIG_CLI_TOKEN={createdToken}
              </code>
              <div className="text-xs text-slate-500 pt-1">
                Save the file. The /handoff slash command will pick it up next session.
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={handleClose}
                className="px-5 py-2 text-sm rounded-lg bg-slate-700 text-white hover:bg-slate-800"
              >
                I&apos;ve copied it — close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
