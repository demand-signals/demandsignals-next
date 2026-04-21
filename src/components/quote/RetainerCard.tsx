'use client'

import type { RetainerPlan } from '@/lib/retainer'
import { formatCents } from '@/lib/quote-engine'

interface Props {
  plan: RetainerPlan
  selected: boolean
  monthlyCents: number
  onSelect: () => void
  onCustomize: () => void
}

export default function RetainerCard({
  plan,
  selected,
  monthlyCents,
  onSelect,
  onCustomize,
}: Props) {
  const isSiteOnly = plan.tier === 'site_only'
  return (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition ${
        selected
          ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
          : 'border-slate-300 hover:border-slate-400'
      }`}
      onClick={onSelect}
    >
      <h3 className="font-semibold">{plan.name}</h3>
      <p className="text-2xl font-bold mt-2">
        {isSiteOnly ? formatCents(0) : formatCents(monthlyCents)}
        <span className="text-sm font-normal text-slate-500">/mo</span>
      </p>
      <ul className="mt-3 text-sm space-y-1">
        {plan.items.length === 0 ? (
          <li className="text-slate-500 italic">No ongoing services</li>
        ) : (
          plan.items.slice(0, 6).map((i) => (
            <li key={i.service_id} className="text-slate-700">✓ {i.name}</li>
          ))
        )}
      </ul>
      {!isSiteOnly && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onCustomize()
          }}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          Customize
        </button>
      )}
    </div>
  )
}
