'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface Prospect {
  id: string
  business_name: string
}

export default function NewTradeCreditPage() {
  const router = useRouter()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [prospectId, setProspectId] = useState('')
  const [description, setDescription] = useState('')
  const [amountInput, setAmountInput] = useState('0.00')
  const [amountCents, setAmountCents] = useState(0)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/prospects?limit=200')
      .then((r) => r.json())
      .then((d) => setProspects(d.data ?? []))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prospectId || !description || amountCents <= 0) {
      setError('Prospect, description, and amount are required.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/trade-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_id: prospectId,
          original_amount_cents: amountCents,
          description,
          notes: notes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      router.push(`/admin/trade-credits/${data.trade_credit.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setBusy(false)
    }
  }

  return (
    <div className="p-6 max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">New Trade Credit</h1>
      <p className="text-sm text-slate-600">
        Manually open a trade-in-kind credit. Use this when a TIK discount was agreed on
        outside of a SOW/invoice flow.
      </p>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 text-sm">
        <label className="block">
          <span className="text-xs font-semibold text-slate-500 uppercase">Client</span>
          <select
            value={prospectId}
            onChange={(e) => setProspectId(e.target.value)}
            className="w-full border border-slate-200 rounded px-2 py-1.5 mt-1"
            required
          >
            <option value="">— select prospect —</option>
            {prospects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.business_name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Trade description
          </span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 10 hours mobile mechanic work"
            className="w-full border border-slate-200 rounded px-2 py-1.5 mt-1"
            required
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500 uppercase">Amount ($)</span>
          <input
            type="text"
            inputMode="decimal"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            onBlur={() => {
              const cents = Math.round(parseFloat(amountInput || '0') * 100)
              setAmountCents(cents)
              setAmountInput((cents / 100).toFixed(2))
            }}
            className="w-full border border-slate-200 rounded px-2 py-1.5 mt-1"
            required
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500 uppercase">Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full border border-slate-200 rounded px-2 py-1.5 mt-1"
          />
        </label>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={busy}
            className="bg-teal-500 text-white rounded-lg px-4 py-2 font-semibold hover:bg-teal-600 disabled:opacity-50 flex items-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Credit
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-slate-100 hover:bg-slate-200 rounded-lg px-4 py-2 font-semibold"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
