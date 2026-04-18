// ── Services Catalog Data Access ────────────────────────────────────
// Reads from Supabase services_catalog table (DB-canonical, admin-editable
// via /admin/services). In-memory cache per serverless invocation.
//
// Compatible API with src/lib/quote-pricing.ts helpers so existing callers
// keep working while we migrate them over.

import { supabaseAdmin } from '@/lib/supabase/admin'

export interface ServicesCatalogRow {
  id: string
  category: string
  name: string
  description: string | null
  benefit: string | null
  ai_badge: string | null
  pricing_type: 'one-time' | 'monthly' | 'both'
  base_range_low_cents: number
  base_range_high_cents: number
  monthly_range_low_cents: number | null
  monthly_range_high_cents: number | null
  display_price_cents: number
  quantifiable: boolean
  quantity_label: string | null
  per_unit_range_low_cents: number | null
  per_unit_range_high_cents: number | null
  default_quantity: number | null
  min_quantity: number | null
  max_quantity: number | null
  narrowing_factors: Array<Record<string, unknown>>
  timeline_weeks_low: number
  timeline_weeks_high: number
  parallel_group: string | null
  depends_on: string[]
  financeable: boolean
  financing_term_months: number | null
  suggests_with: string[]
  requires_base: boolean
  excludes: string[]
  phase: 1 | 2 | 3
  available_for_bid: boolean
  active: boolean
  included_with_paid_project: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

let cache: ServicesCatalogRow[] | null = null
let cacheLoadedAt = 0
const CACHE_TTL_MS = 60_000 // 1 minute — plenty short for admin edits to propagate

/** Fetch the full catalog, cached per serverless invocation. */
export async function getServicesCatalog(
  options: { activeOnly?: boolean; forceRefresh?: boolean } = {},
): Promise<ServicesCatalogRow[]> {
  const now = Date.now()
  if (options.forceRefresh || !cache || now - cacheLoadedAt > CACHE_TTL_MS) {
    const { data, error } = await supabaseAdmin
      .from('services_catalog')
      .select('*')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true })

    if (error) throw new Error(`services_catalog read failed: ${error.message}`)
    cache = (data ?? []) as ServicesCatalogRow[]
    cacheLoadedAt = now
  }
  return options.activeOnly ? cache.filter((r) => r.active) : cache
}

/** Look up a single catalog item by id. */
export async function getServiceById(id: string): Promise<ServicesCatalogRow | null> {
  const all = await getServicesCatalog()
  return all.find((r) => r.id === id) ?? null
}

/** Items flagged for auto-inclusion on paid-project deposit invoices. */
export async function getValueStackItems(): Promise<ServicesCatalogRow[]> {
  const all = await getServicesCatalog({ activeOnly: true })
  return all.filter((r) => r.included_with_paid_project)
}

/**
 * Search the catalog by name/description/benefit substring.
 * Case-insensitive. Used by admin type-ahead pickers.
 */
export async function searchCatalog(
  query: string,
  limit: number = 20,
): Promise<ServicesCatalogRow[]> {
  const all = await getServicesCatalog({ activeOnly: true })
  if (!query.trim()) return all.slice(0, limit)

  const q = query.toLowerCase()
  return all
    .filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q) ||
        (r.benefit ?? '').toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q),
    )
    .slice(0, limit)
}

/** Force a cache invalidation after admin CRUD operations. */
export function invalidateCatalogCache(): void {
  cache = null
  cacheLoadedAt = 0
}

/** Category labels for grouping in the admin UI. */
export const CATEGORY_LABELS: Record<string, string> = {
  'your-website': 'Your Website',
  'existing-site': 'Existing Site',
  'features-integrations': 'Features & Integrations',
  'get-found': 'Get Found (SEO)',
  'content-social': 'Content & Social',
  'ai-automation': 'AI Automation',
  'research-strategy': 'Research & Strategy',
  'monthly-services': 'Monthly Services',
  hosting: 'Hosting',
  'team-rates': 'Team Rates',
}
