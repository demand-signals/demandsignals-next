'use client'

import type { RetainerMenuItem, RetainerPlan } from '@/lib/retainer'
import { formatCents } from '@/lib/quote-engine'

interface Props {
  plan: RetainerPlan
  menu: RetainerMenuItem[]
  customItems: Array<{ service_id: string; quantity: number; included: boolean }>
  onChange: (next: Array<{ service_id: string; quantity: number; included: boolean }>) => void
  onClose: () => void
}

export default function RetainerCustomizeDrawer({
  plan,
  menu,
  customItems,
  onChange,
  onClose,
}: Props) {
  const planItemIds = new Set(plan.items.map((i) => i.service_id))

  function effectiveIncluded(serviceId: string): boolean {
    const override = customItems.find((c) => c.service_id === serviceId)
    if (override) return override.included
    return planItemIds.has(serviceId)
  }

  function toggle(serviceId: string) {
    const currently = effectiveIncluded(serviceId)
    const existing = customItems.find((c) => c.service_id === serviceId)
    if (existing) {
      onChange(
        customItems.map((c) =>
          c.service_id === serviceId ? { ...c, included: !currently } : c
        )
      )
    } else {
      onChange([
        ...customItems,
        { service_id: serviceId, quantity: 1, included: !currently },
      ])
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Customize {plan.name}</h3>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1 bg-blue-600 text-white rounded"
          >
            Done
          </button>
        </div>
        <div className="divide-y divide-slate-200">
          {menu.map((m) => (
            <label
              key={m.id}
              className="flex items-center gap-3 py-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={effectiveIncluded(m.id)}
                onChange={() => toggle(m.id)}
              />
              <span className="flex-1">
                <span className="font-medium">{m.name}</span>
                <span className="text-xs text-slate-500 ml-2">[{m.category}]</span>
              </span>
              <span className="text-sm">
                {formatCents(m.monthly_cents)}/mo
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
