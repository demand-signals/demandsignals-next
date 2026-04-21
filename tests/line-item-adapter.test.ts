import { describe, it, expect, vi } from 'vitest'

// Stub out the Supabase admin client so module-level initialization
// doesn't fail when env vars are absent in the test environment.
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {},
}))

import { toInvoiceLineItem } from '@/lib/quote-engine'

describe('toInvoiceLineItem', () => {
  it('produces canonical InvoiceLineItem shape with no discount', () => {
    const result = toInvoiceLineItem({
      service_id: 'gbp-mgmt',
      description: 'Google Business Profile Management (monthly)',
      quantity: 1,
      unit_price_cents: 29900,
    })
    expect(result).toMatchObject({
      description: 'Google Business Profile Management (monthly)',
      quantity: 1,
      unit_price_cents: 29900,
      subtotal_cents: 29900,
      discount_pct: 0,
      discount_cents: 0,
      discount_label: null,
      line_total_cents: 29900,
    })
  })

  it('applies percent discount correctly', () => {
    const result = toInvoiceLineItem({
      service_id: 'content-pub',
      description: 'AI Blog Posts (monthly, x4)',
      quantity: 4,
      unit_price_cents: 15000,
      discount_pct: 25,
      discount_label: 'Launch promo',
    })
    expect(result.subtotal_cents).toBe(60000)
    expect(result.discount_cents).toBe(15000)
    expect(result.line_total_cents).toBe(45000)
    expect(result.discount_label).toBe('Launch promo')
  })

  it('honors provided sort_order', () => {
    const result = toInvoiceLineItem(
      { service_id: 'x', description: 'X', quantity: 1, unit_price_cents: 100 },
      42,
    )
    expect(result.sort_order).toBe(42)
  })
})
