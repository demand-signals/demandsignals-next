'use client'

// ── SendMsaButton ────────────────────────────────────────────────────
// "Send MSA" button + customer search typeahead. Lets an admin send the
// onboarding kit (MSA + disclosures) to any prospect/client that hasn't
// signed — from the Master Agreements page, without navigating to the
// prospect's detail page.

import { useState, useEffect, useRef } from 'react'
import { FileSignature, Search, Loader2, Check, X } from 'lucide-react'

interface Prospect {
  id: string
  business_name: string
  owner_email: string | null
  business_email: string | null
  client_code: string | null
  has_executed_msa: boolean | null
}

export function SendMsaButton({ onSent }: { onSent?: () => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Prospect[]>([])
  const [searching, setSearching] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sentMsg, setSentMsg] = useState<string | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open || q.trim().length < 2) { setResults([]); return }
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/admin/prospects?search=${encodeURIComponent(q.trim())}&include_clients=1&limit=15`)
        const data = await res.json()
        setResults((data.prospects ?? data.data ?? []) as Prospect[])
      } finally {
        setSearching(false)
      }
    }, 250)
  }, [q, open])

  async function send(p: Prospect) {
    setSendingId(p.id); setSentMsg(null)
    try {
      const res = await fetch('/api/admin/onboarding/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: p.id, force: p.has_executed_msa ?? false }),
      })
      const data = await res.json()
      if (!res.ok) { setSentMsg(`Failed: ${data.error ?? 'send error'}`); return }
      if (data.already_executed) { setSentMsg(`${p.business_name} already has an executed MSA.`); return }
      setSentMsg(`Sent ${data.msa_number ?? ''} to ${p.business_name} — email ${data.email?.success ? '✓' : '✗'} · SMS ${data.sms?.success ? '✓' : '✗'}`)
      onSent?.()
    } catch (e) {
      setSentMsg(e instanceof Error ? e.message : 'Network error')
    } finally {
      setSendingId(null)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700"
      >
        <FileSignature className="h-4 w-4" /> Send MSA
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-96 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Search className="h-4 w-4" /> Send onboarding kit
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
          </div>

          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customer by name…"
            className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />

          <div className="mt-2 max-h-72 overflow-auto">
            {searching ? (
              <div className="p-3 text-sm text-slate-400"><Loader2 className="inline h-4 w-4 animate-spin" /> Searching…</div>
            ) : results.length === 0 ? (
              <div className="p-3 text-xs text-slate-400">{q.trim().length < 2 ? 'Type at least 2 characters.' : 'No matches.'}</div>
            ) : (
              results.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded px-2 py-2 hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800">
                      {p.business_name}
                      {p.client_code && <span className="ml-1 text-xs text-slate-400">{p.client_code}</span>}
                      {p.has_executed_msa && <span className="ml-1 inline-flex items-center text-xs text-emerald-600"><Check className="h-3 w-3" /> MSA</span>}
                    </div>
                    <div className="truncate text-xs text-slate-400">{p.owner_email ?? p.business_email ?? 'no email'}</div>
                  </div>
                  <button
                    onClick={() => send(p)}
                    disabled={sendingId === p.id}
                    className="shrink-0 rounded bg-teal-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {sendingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : p.has_executed_msa ? 'Re-send' : 'Send'}
                  </button>
                </div>
              ))
            )}
          </div>

          {sentMsg && (
            <div className="mt-2 rounded bg-slate-50 px-3 py-2 text-xs text-slate-600">{sentMsg}</div>
          )}
        </div>
      )}
    </div>
  )
}
