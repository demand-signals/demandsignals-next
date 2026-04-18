'use client'

// Client-side Accept flow. Shows a modal with signature field,
// POSTs to /api/sow/public/[number]/accept, then redirects to deposit invoice.

import { useState } from 'react'

export function SowAcceptClient({
  sowNumber,
  publicUuid,
  depositCents,
}: {
  sowNumber: string
  publicUuid: string
  depositCents: number
}) {
  const [open, setOpen] = useState(false)
  const [signature, setSignature] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/sow/public/${sowNumber}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: publicUuid, signature: signature.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Acceptance failed')
        setBusy(false)
        return
      }
      // Redirect to deposit invoice.
      if (data.deposit_invoice?.pay_url) {
        window.location.href = data.deposit_invoice.pay_url
      } else if (data.deposit_invoice?.public_url) {
        window.location.href = data.deposit_invoice.public_url
      } else {
        window.location.reload()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
      setBusy(false)
    }
  }

  const depositStr = `$${(depositCents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-emerald-600 text-white rounded-lg px-6 py-2 text-base font-bold hover:bg-emerald-700 shadow-lg"
      >
        Accept & Pay Deposit ({depositStr}) →
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4">
            <h2 className="text-xl font-bold">Accept Statement of Work</h2>
            <p className="text-sm text-slate-600">
              By typing your full name below, you agree to the scope, deliverables,
              timeline, and pricing in this SOW. A deposit invoice for{' '}
              <span className="font-bold text-slate-900">{depositStr}</span> will be
              generated immediately.
            </p>
            <label className="block text-sm">
              <span className="text-slate-700 font-medium">Type your full name</span>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Jane Smith"
                autoFocus
                disabled={busy}
              />
            </label>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={busy || signature.trim().length < 2}
                className="bg-emerald-600 text-white rounded-lg px-5 py-2 text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? 'Processing…' : 'Accept & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
