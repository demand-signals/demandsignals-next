// Document-level discount math. Used by SOW + invoice rendering, PDFs,
// and accept/conversion flows. Migration 036 added these fields.
//
// Discounts apply to one-time totals only. Stack with Trade-in-Kind:
//   subtotal → minus discount → minus TIK → cash total
// Final cash total is clamped at 0.

export interface DiscountInput {
  discount_kind?: 'percent' | 'amount' | null
  discount_value_bps?: number | null
  discount_amount_cents?: number | null
}

/**
 * Compute the discount in cents given a doc's discount fields and the
 * subtotal (one-time total before any reductions). Returns 0 when no
 * discount is configured. Clamps to subtotal so we never produce a
 * negative cash total just from the discount alone.
 */
export function computeDiscountCents(doc: DiscountInput, subtotalCents: number): number {
  if (!doc.discount_kind) return 0
  if (subtotalCents <= 0) return 0

  if (doc.discount_kind === 'percent') {
    const bps = Math.max(0, Math.min(10000, doc.discount_value_bps ?? 0))
    if (bps === 0) return 0
    // 1 bp = 0.01%, so cents = subtotal * bps / 10000
    return Math.min(subtotalCents, Math.round(subtotalCents * bps / 10000))
  }

  if (doc.discount_kind === 'amount') {
    const amt = Math.max(0, doc.discount_amount_cents ?? 0)
    return Math.min(subtotalCents, amt)
  }

  return 0
}

/**
 * Render a discount as a human-readable label like "Loyalty discount (10%)"
 * or "Loyalty discount ($1,500.00)". Returns the description alone if
 * no kind/value is set.
 */
export function formatDiscountLabel(doc: DiscountInput & { discount_description?: string | null }): string {
  const desc = doc.discount_description?.trim() || 'Discount'
  if (doc.discount_kind === 'percent') {
    const bps = doc.discount_value_bps ?? 0
    const pct = (bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)
    return `${desc} (${pct}%)`
  }
  if (doc.discount_kind === 'amount') {
    const amt = doc.discount_amount_cents ?? 0
    const dollars = (amt / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return `${desc} ($${dollars})`
  }
  return desc
}

/**
 * Inheritance helper: when a SOW spawns an invoice, copy the discount
 * fields. Used by SOW accept (deposit invoice creation) and SOW
 * conversion (milestone invoices).
 */
export function inheritDiscountFromSow(sow: DiscountInput & { discount_description?: string | null }): {
  discount_kind: 'percent' | 'amount' | null
  discount_value_bps: number
  discount_amount_cents: number
  discount_description: string | null
} {
  return {
    discount_kind: sow.discount_kind ?? null,
    discount_value_bps: sow.discount_value_bps ?? 0,
    discount_amount_cents: sow.discount_amount_cents ?? 0,
    discount_description: sow.discount_description ?? null,
  }
}
