'use client'

// Client-side MSA execution: per-disclosure e-initials + typed signature →
// POST /api/msa/public/[number]/execute (E-SIGN).

import { useState } from 'react'
import { Loader2, Check, AlertTriangle } from 'lucide-react'

interface Disclosure {
  code: string
  title: string
  public_url: string
}

interface Props {
  number: string
  publicUuid: string
  disclosures: Disclosure[]
  alreadyExecuted: boolean
  executedSignature?: string | null
}

export function MsaSignClient({ number, publicUuid, disclosures, alreadyExecuted, executedSignature }: Props) {
  const [initials, setInitials] = useState<Record<string, string>>({})
  const [signature, setSignature] = useState('')
  const [state, setState] = useState<'idle' | 'signing' | 'done' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  if (alreadyExecuted) {
    return (
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-5 text-emerald-800">
        <div className="flex items-center gap-2 font-semibold"><Check className="h-5 w-5" /> Agreement signed</div>
        <p className="mt-1 text-sm">Signed by {executedSignature}. Thank you — you&rsquo;re all set.</p>
      </div>
    )
  }

  const allInitialed = disclosures.every((d) => (initials[d.code] ?? '').trim().length > 0)
  const canSign = allInitialed && signature.trim().length > 0 && state !== 'signing'

  async function sign() {
    setState('signing')
    setErrMsg('')
    try {
      const res = await fetch(`/api/msa/public/${number}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: publicUuid,
          signature: signature.trim(),
          initials: disclosures.map((d) => ({ code: d.code, initials: (initials[d.code] ?? '').trim() })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setState('error'); setErrMsg(data.error ?? 'Signing failed'); return }
      setState('done')
    } catch (e) {
      setState('error'); setErrMsg(e instanceof Error ? e.message : 'Network error')
    }
  }

  if (state === 'done') {
    return (
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-5 text-emerald-800">
        <div className="flex items-center gap-2 font-semibold"><Check className="h-5 w-5" /> Agreement signed</div>
        <p className="mt-1 text-sm">Thank you, {signature.trim()} — you&rsquo;re all set. We&rsquo;ll be in touch to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Review &amp; acknowledge each disclosure</h2>
        <p className="mt-1 text-sm text-slate-500">Enter your initials beside each. Click a title to read it.</p>
        <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {disclosures.map((d) => (
            <div key={d.code} className="flex items-center gap-4 p-3">
              <input
                aria-label={`Initials for ${d.title}`}
                value={initials[d.code] ?? ''}
                onChange={(e) => setInitials((s) => ({ ...s, [d.code]: e.target.value.slice(0, 5).toUpperCase() }))}
                placeholder="__"
                className="w-16 rounded border border-slate-300 px-2 py-1.5 text-center font-semibold uppercase tracking-widest text-slate-800"
              />
              <div className="flex-1">
                <a href={d.public_url} target="_blank" rel="noreferrer" className="font-medium text-teal-600 hover:underline">
                  {d.title}
                </a>
                <div className="text-xs text-slate-400">{d.code}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Sign</h2>
        <p className="mt-1 text-sm text-slate-500">Type your full name as your electronic signature (E-SIGN Act).</p>
        <input
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="Your full name"
          className="mt-2 w-full max-w-md rounded border border-slate-300 px-3 py-2 text-lg"
          style={{ fontFamily: "'Brush Script MT','Segoe Script',cursive" }}
        />
      </div>

      {state === 'error' && (
        <div className="flex items-center gap-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" /> {errMsg}
        </div>
      )}
      {!allInitialed && (
        <p className="text-xs text-slate-400">Please initial all {disclosures.length} disclosures to continue.</p>
      )}

      <button
        onClick={sign}
        disabled={!canSign}
        className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-5 py-2.5 font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {state === 'signing' ? (<><Loader2 className="h-4 w-4 animate-spin" /> Signing…</>) : 'Sign Agreement'}
      </button>
    </div>
  )
}
