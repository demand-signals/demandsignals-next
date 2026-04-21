'use client'

import { useEffect, useState } from 'react'
import type { RetainerPlan, RetainerMenuItem } from '@/lib/retainer'
import RetainerCard from './RetainerCard'
import RetainerCustomizeDrawer from './RetainerCustomizeDrawer'

interface Props {
  sessionToken: string
  onContinue: () => void
}

export default function RetainerStep({ sessionToken, onContinue }: Props) {
  const [plans, setPlans] = useState<RetainerPlan[]>([])
  const [menu, setMenu] = useState<RetainerMenuItem[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [customItems, setCustomItems] = useState<
    Array<{ service_id: string; quantity: number; included: boolean }>
  >([])
  const [customizingPlanId, setCustomizingPlanId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [pRes, mRes] = await Promise.all([
          fetch('/api/quote/retainer-plans'),
          fetch('/api/quote/retainer-menu'),
        ])
        if (!pRes.ok || !mRes.ok) throw new Error('Failed to load retainer options')
        const pJson = await pRes.json()
        const mJson = await mRes.json()
        if (cancelled) return
        setPlans(pJson.plans ?? [])
        setMenu(mJson.menu ?? [])
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Load failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function computeMonthlyFor(plan: RetainerPlan): number {
    const customByPlan = plan.id === selectedPlanId ? customItems : []
    const map = new Map<string, { cents: number; qty: number; inc: boolean }>()
    for (const pi of plan.items) {
      map.set(pi.service_id, { cents: pi.monthly_cents, qty: pi.quantity, inc: true })
    }
    for (const ci of customByPlan) {
      const menuItem = menu.find((m) => m.id === ci.service_id)
      const existing = map.get(ci.service_id)
      map.set(ci.service_id, {
        cents: existing?.cents ?? menuItem?.monthly_cents ?? 0,
        qty: ci.quantity,
        inc: ci.included,
      })
    }
    let total = 0
    for (const [, v] of map) if (v.inc) total += v.cents * v.qty
    return total
  }

  async function continueAfterSelect() {
    if (!selectedPlanId) return
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch('/api/quote/retainer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_token: sessionToken,
          plan_id: selectedPlanId,
          custom_items: customItems,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed')
      onContinue()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="py-6 text-slate-500">Loading retainer options…</div>
  }

  return (
    <div className="py-6">
      <h2 className="text-xl font-semibold mb-1">Ongoing management after launch</h2>
      <p className="text-slate-600 mb-4">
        Pick your ongoing service level. Activates on launch day. Change or cancel anytime.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {plans.map((p) => (
          <RetainerCard
            key={p.id}
            plan={p}
            selected={selectedPlanId === p.id}
            monthlyCents={computeMonthlyFor(p)}
            onSelect={() => {
              setSelectedPlanId(p.id)
              if (p.id !== selectedPlanId) setCustomItems([])
            }}
            onCustomize={() => setCustomizingPlanId(p.id)}
          />
        ))}
      </div>

      {customizingPlanId && (
        <RetainerCustomizeDrawer
          plan={plans.find((p) => p.id === customizingPlanId)!}
          menu={menu}
          customItems={customizingPlanId === selectedPlanId ? customItems : []}
          onChange={(next) => {
            setSelectedPlanId(customizingPlanId)
            setCustomItems(next)
          }}
          onClose={() => setCustomizingPlanId(null)}
        />
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={continueAfterSelect}
          disabled={!selectedPlanId || saving}
          className="px-6 py-3 bg-orange-500 text-white rounded font-medium disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Continue'}
        </button>
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </div>
  )
}
