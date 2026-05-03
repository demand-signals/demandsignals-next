'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { ProspectPicker, type ProspectPickerOption } from '@/components/admin/prospect-picker'

interface Prospect extends ProspectPickerOption {
  id: string
  business_name: string
  owner_email: string | null
}
interface Plan {
  id: string
  slug: string
  name: string
  price_cents: number
  billing_interval: string
  trial_days: number
  stripe_price_id: string | null
}

export default function NewSubscriptionPage() {
  const router = useRouter()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [prospectId, setProspectId] = useState('')
  const [planId, setPlanId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [createInStripe, setCreateInStripe] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/prospects?limit=200')
      .then((r) => r.json())
      .then((d) => setProspects(d.data ?? []))
    fetch('/api/admin/subscription-plans')
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
  }, [])

  const plan = plans.find((p) => p.id === planId)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_id: prospectId,
          plan_id: planId,
          start_date: startDate || undefined,
          create_in_stripe: createInStripe,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      router.push(`/admin/subscriptions/${data.subscription.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setBusy(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">New Subscription</h1>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-sm">
        <label className="block">
          Prospect
          <ProspectPicker
            options={prospects}
            value={prospectId}
            onChange={setProspectId}
            placeholder="Search by name, owner, code, or city…"
            required
          />
        </label>

        <label className="block">
          Plan
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
          >
            <option value="">— select —</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (${(p.price_cents / 100).toFixed(2)}/{p.billing_interval})
                {p.trial_days > 0 ? ` · ${p.trial_days}d trial` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          Start date (optional)
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-slate-200 rounded px-2 py-1 mt-1"
          />
        </label>

        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={createInStripe}
            onChange={(e) => setCreateInStripe(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Also create in Stripe (enables auto-billing).
            {plan && !plan.stripe_price_id && (
              <span className="text-red-600 block text-xs mt-0.5">
                ⚠️ Selected plan has no Stripe Price ID — set one on the plan first.
              </span>
            )}
          </span>
        </label>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={busy || !prospectId || !planId}
            className="bg-teal-500 text-white rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Subscription'}
          </button>
        </div>
      </div>
    </div>
  )
}
