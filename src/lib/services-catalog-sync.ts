// ── Sync-access bridge for services_catalog ─────────────────────────
//
// The quote engine (calculateTotals, contributionFor, narrowing math, etc.)
// is fully synchronous and can't be made async without a 10-file cascade
// through QuotePageClient, prices route, and recompute_session_state callers.
//
// This bridge solves it:
//   - Module-scoped snapshot of the full catalog, populated on first
//     async call (usually from a route handler that already awaits).
//   - `getServiceSync(id)` returns from the snapshot instantly.
//   - If the snapshot hasn't been hydrated yet (very first serverless
//     invocation, mid-request before any async lookup has fired), falls
//     back to the legacy TS CATALOG — guaranteed to exist, guaranteed
//     to be structurally identical to the DB row (same schema source).
//
// Callers that care about freshness (admin pages, invoice flows) keep
// using the async getServicesCatalog() from services-catalog.ts.
// Callers that need sync access (quote engine) use this bridge.
//
// Refresh: every serverless invocation refreshes on first async touch.
// Admin edits via /admin/services propagate within seconds because
// handlers that mutate invalidate caches and the next request re-fetches.

import type { ServicesCatalogRow } from './services-catalog'
import { getServicesCatalog } from './services-catalog'
import { getItem as getLegacyItem, getCatalog as getLegacyCatalog } from './quote-pricing'
import type { PricingItem } from './quote-pricing'

let snapshot: Map<string, ServicesCatalogRow> | null = null
let hydrationPromise: Promise<void> | null = null

/**
 * Async hydrator — pulls the current catalog into the module-scope snapshot.
 * Safe to call multiple times; subsequent calls are no-ops while fetch in-flight.
 */
export async function hydrateCatalogSnapshot(): Promise<void> {
  if (hydrationPromise) return hydrationPromise
  hydrationPromise = (async () => {
    try {
      const rows = await getServicesCatalog({ activeOnly: true })
      const map = new Map<string, ServicesCatalogRow>()
      for (const r of rows) map.set(r.id, r)
      snapshot = map
    } catch {
      // Leave snapshot null — callers fall back to legacy TS CATALOG.
      snapshot = null
    } finally {
      hydrationPromise = null
    }
  })()
  return hydrationPromise
}

/**
 * Sync lookup. Returns a PricingItem-shaped object for quote-engine compat.
 * If the DB snapshot isn't ready yet, falls back to the legacy TS CATALOG.
 *
 * Important: never returns null for a catalog item that exists in TS
 * CATALOG — this guarantees zero regression on the quote flow, even
 * during cold-start race windows.
 */
export function getServiceSync(id: string): PricingItem | undefined {
  const row = snapshot?.get(id)
  if (row) return rowToPricingItem(row)
  return getLegacyItem(id)
}

/**
 * Sync full-catalog accessor. Used by code paths that iterate the catalog
 * (rare). Falls back to legacy if snapshot absent.
 */
export function getCatalogSync(): readonly PricingItem[] {
  if (snapshot && snapshot.size > 0) {
    return Array.from(snapshot.values()).map(rowToPricingItem)
  }
  return getLegacyCatalog()
}

/**
 * Force the snapshot to refresh on next hydrateCatalogSnapshot() call.
 * Called by admin CRUD endpoints so the next /quote request sees edits.
 */
export function invalidateSnapshot(): void {
  snapshot = null
  hydrationPromise = null
}

/** Convert a DB row to the legacy PricingItem shape so quote-engine works unchanged. */
function rowToPricingItem(row: ServicesCatalogRow): PricingItem {
  return {
    id: row.id,
    category: row.category as PricingItem['category'],
    name: row.name,
    benefit: row.benefit ?? '',
    aiBadge: row.ai_badge ?? '',
    description: row.description ?? undefined,

    type: row.pricing_type as PricingItem['type'],
    baseRange: [row.base_range_low_cents, row.base_range_high_cents] as readonly [number, number],
    monthlyRange:
      row.monthly_range_low_cents !== null && row.monthly_range_high_cents !== null
        ? ([row.monthly_range_low_cents, row.monthly_range_high_cents] as readonly [number, number])
        : undefined,

    quantifiable: row.quantifiable,
    quantityLabel: row.quantity_label ?? undefined,
    perUnitRange:
      row.per_unit_range_low_cents !== null && row.per_unit_range_high_cents !== null
        ? ([row.per_unit_range_low_cents, row.per_unit_range_high_cents] as readonly [number, number])
        : undefined,
    defaultQuantity: row.default_quantity ?? undefined,
    minQuantity: row.min_quantity ?? undefined,
    maxQuantity: row.max_quantity ?? undefined,

    // narrowing_factors stored as JSONB — cast via unknown to readonly shape
    narrowingFactors: (row.narrowing_factors ?? []) as unknown as PricingItem['narrowingFactors'],

    timelineWeeks: [row.timeline_weeks_low, row.timeline_weeks_high] as readonly [number, number],
    parallelGroup: (row.parallel_group ?? 'build') as PricingItem['parallelGroup'],
    dependsOn: (row.depends_on ?? []) as readonly string[],

    financeable: row.financeable,
    financingTermMonths: row.financing_term_months ?? undefined,

    suggestsWith: (row.suggests_with ?? []) as readonly string[],
    requiresBase: row.requires_base,
    excludes: (row.excludes ?? []) as readonly string[],

    phase: row.phase as PricingItem['phase'],
    availableForBid: row.available_for_bid,
    available: row.active,
    displayPriceCents: row.display_price_cents,
    // Legacy compat: the existing /quote UI renders "FREE" badges based on
    // PricingItem.isFree. In the new catalog semantics, "free" items are
    // actually "included with paid project" — they're invoiced at full
    // price with a 100% "New Client Appreciation" discount line. But the
    // UI still shows FREE for these. Keep the legacy flag flowing through
    // until /quote is rewritten to use the new framing.
    isFree: row.included_with_paid_project,
  }
}
