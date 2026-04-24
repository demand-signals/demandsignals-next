'use client'

// Inline accept form rendered inside the dark Accept section.
// POSTs to /api/sow/public/[number]/accept with { key, signature }.
// On success: redirects to deposit invoice. Preserves all existing API wiring.

import { useState } from 'react'

export function SowAcceptClient({
  sowNumber,
  publicUuid,
  depositCents,
  downloadUrl,
  isOpen,
}: {
  sowNumber: string
  publicUuid: string
  depositCents: number
  downloadUrl: string
  isOpen: boolean
}) {
  const [signature, setSignature] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const depositStr = `$${(depositCents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  async function submit() {
    if (!signature.trim() || signature.trim().length < 2) return
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
      // Redirect to deposit invoice pay URL or public URL.
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

  if (!isOpen) {
    // SOW is not in a signable state — show download only
    return (
      <a
        href={downloadUrl}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-colors"
      >
        ↓ Download PDF
      </a>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Signature field */}
      <div className="mb-4 text-left">
        <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#94a0b8' }}>
          Type your full name to sign
        </label>
        <input
          type="text"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="Jane Smith"
          autoComplete="name"
          disabled={busy}
          className="w-full rounded-xl px-4 py-3 text-base text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#68c5ad] disabled:opacity-60"
          style={{ border: '1.5px solid #e2e8f0' }}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        />
      </div>

      {/* Date display */}
      <p className="text-xs mb-6 text-left" style={{ color: '#94a0b8' }}>
        Date: <span className="text-white">{today}</span>
      </p>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/30 border border-red-500/40 text-red-300 text-sm text-left">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
        <button
          onClick={submit}
          disabled={busy || signature.trim().length < 2}
          className="w-full sm:w-auto px-8 py-3.5 rounded-full text-base font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: busy ? '#c05522' : '#FF6B2B' }}
        >
          {busy ? 'Processing…' : `Accept & Pay Deposit (${depositStr}) →`}
        </button>
        <a
          href={downloadUrl}
          className="w-full sm:w-auto px-6 py-3.5 rounded-full text-sm font-semibold text-white text-center border border-white/20 hover:bg-white/10 transition-colors"
        >
          ↓ Download PDF
        </a>
      </div>

      {/* Compliance microcopy */}
      <p className="mt-6 text-xs leading-relaxed" style={{ color: 'rgba(148,160,184,0.7)' }}>
        By accepting, you authorize Demand Signals to invoice per the terms above.
        Your signature above constitutes electronic consent under the E-SIGN Act.
      </p>
    </div>
  )
}
