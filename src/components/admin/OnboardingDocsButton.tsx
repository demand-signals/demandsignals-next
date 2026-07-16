'use client'

// ── [Send Onboarding Docs] button ────────────────────────────────────
// Sends the client-specific Master Service Agreement + incorporated
// disclosures (the onboarding kit) to the prospect via email + SMS.
// Decoupled from SOW/project — can be sent any time. Calls
// POST /api/admin/onboarding/send { prospect_id }.

import { useState } from 'react'
import { FileSignature, Loader2, Check, AlertTriangle } from 'lucide-react'

interface Props {
  prospectId: string
  hasExecutedMsa?: boolean
}

type State =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; msaNumber?: string; email?: boolean; sms?: boolean }
  | { kind: 'already' }
  | { kind: 'error'; message: string }

export function OnboardingDocsButton({ prospectId, hasExecutedMsa }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' })

  async function send(force: boolean) {
    setState({ kind: 'sending' })
    try {
      const res = await fetch('/api/admin/onboarding/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: prospectId, force }),
      })
      const data = await res.json()
      if (!res.ok) {
        setState({ kind: 'error', message: data.error ?? 'Send failed' })
        return
      }
      if (data.already_executed) {
        setState({ kind: 'already' })
        return
      }
      setState({
        kind: 'sent',
        msaNumber: data.msa_number,
        email: data.email?.success,
        sms: data.sms?.success,
      })
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : 'Network error' })
    }
  }

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <FileSignature className="h-4 w-4 text-teal-600" />
            Onboarding Kit
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Master Service Agreement + disclosures. Sent via email &amp; SMS for e-signature.
            {hasExecutedMsa && (
              <span className="ml-1 inline-flex items-center gap-1 text-emerald-600">
                <Check className="h-3 w-3" /> MSA on file
              </span>
            )}
          </p>
        </div>

        <button
          onClick={() => send(hasExecutedMsa ?? false)}
          disabled={state.kind === 'sending'}
          className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {state.kind === 'sending' ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
          ) : (
            <><FileSignature className="h-4 w-4" /> {hasExecutedMsa ? 'Re-send Onboarding Docs' : 'Send Onboarding Docs'}</>
          )}
        </button>
      </div>

      {state.kind === 'sent' && (
        <div className="mt-3 flex items-center gap-2 rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <Check className="h-3.5 w-3.5" />
          Sent {state.msaNumber ? `(${state.msaNumber})` : ''} —
          email {state.email ? '✓' : '✗'} · SMS {state.sms ? '✓' : '✗'}
        </div>
      )}
      {state.kind === 'already' && (
        <div className="mt-3 flex items-center gap-2 rounded bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <Check className="h-3.5 w-3.5" /> This client already has an executed MSA. Use re-send to send a fresh copy.
        </div>
      )}
      {state.kind === 'error' && (
        <div className="mt-3 flex items-center gap-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="h-3.5 w-3.5" /> {state.message}
        </div>
      )}
    </div>
  )
}
