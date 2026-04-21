import { describe, it, expect, vi } from 'vitest'

// Stub out the Supabase admin client so module-level initialization
// doesn't fail when env vars are absent in the test environment.
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {},
}))

import { computeMonthlyTotal } from '@/lib/retainer'

describe('computeMonthlyTotal', () => {
  it('returns sum of plan default items when no custom overrides', () => {
    const planItems = [
      { service_id: 'a', name: 'Service A', monthly_cents: 10000, quantity: 1 },
      { service_id: 'b', name: 'Service B', monthly_cents: 5000, quantity: 1 },
    ]
    const customItems: Array<{ service_id: string; quantity: number; included: boolean }> = []
    expect(computeMonthlyTotal(planItems, customItems)).toBe(15000)
  })

  it('excludes items when custom override sets included=false', () => {
    const planItems = [
      { service_id: 'a', name: 'Service A', monthly_cents: 10000, quantity: 1 },
      { service_id: 'b', name: 'Service B', monthly_cents: 5000, quantity: 1 },
    ]
    const customItems = [{ service_id: 'b', quantity: 1, included: false }]
    expect(computeMonthlyTotal(planItems, customItems)).toBe(10000)
  })

  it('adds items not in plan when custom override sets included=true', () => {
    const planItems = [{ service_id: 'a', name: 'Service A', monthly_cents: 10000, quantity: 1 }]
    const customItems = [{ service_id: 'c', quantity: 1, included: true, monthly_cents: 7500 }]
    expect(computeMonthlyTotal(planItems, customItems)).toBe(17500)
  })

  it('respects quantity in custom overrides', () => {
    const planItems = [{ service_id: 'a', name: 'Service A', monthly_cents: 10000, quantity: 1 }]
    const customItems = [{ service_id: 'a', quantity: 3, included: true }]
    expect(computeMonthlyTotal(planItems, customItems)).toBe(30000)
  })
})
