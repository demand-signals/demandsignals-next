// ── POST /api/admin/services-catalog/bulk-import ────────────────────
//
// Bulk UPSERT for services_catalog. Accepts JSON array of service rows
// (same shape as single-POST, just more of them at once). Each row runs
// through the same minimum-viable validation as single-create (id, name,
// category, display_price_cents required). Returns per-row status so
// partial success is visible.
//
// Body shape:
//   {
//     services: [
//       { id, name, category, display_price_cents, ...optional fields },
//       ...
//     ]
//   }

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { invalidateCatalogCache } from '@/lib/services-catalog'

interface BulkRow {
  id?: string
  name?: string
  category?: string
  description?: string | null
  benefit?: string | null
  ai_badge?: string | null
  pricing_type?: 'one-time' | 'monthly' | 'both'
  base_range_low_cents?: number
  base_range_high_cents?: number
  monthly_range_low_cents?: number | null
  monthly_range_high_cents?: number | null
  display_price_cents?: number
  timeline_weeks_low?: number
  timeline_weeks_high?: number
  included_with_paid_project?: boolean
  active?: boolean
  sort_order?: number
}

interface RowResult {
  index: number
  id: string | null
  status: 'inserted' | 'updated' | 'skipped' | 'error'
  error?: string
}

const VALID_CATEGORIES = new Set([
  'your-website',
  'existing-site',
  'features-integrations',
  'get-found',
  'content-social',
  'ai-automation',
  'research-strategy',
  'monthly-services',
  'hosting',
  'team-rates',
])

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.services)) {
    return NextResponse.json(
      { error: 'Body must be {services: [...]}' },
      { status: 400 },
    )
  }

  const rows: BulkRow[] = body.services
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No rows to import' }, { status: 400 })
  }
  if (rows.length > 500) {
    return NextResponse.json(
      { error: 'Max 500 rows per bulk import. Split into multiple calls.' },
      { status: 400 },
    )
  }

  const results: RowResult[] = []
  let insertedCount = 0
  let updatedCount = 0
  let errorCount = 0

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]

    // Validation.
    if (!r.id || typeof r.id !== 'string') {
      results.push({ index: i, id: null, status: 'error', error: 'missing id' })
      errorCount++
      continue
    }
    if (!r.name || typeof r.name !== 'string') {
      results.push({ index: i, id: r.id, status: 'error', error: 'missing name' })
      errorCount++
      continue
    }
    if (!r.category || typeof r.category !== 'string') {
      results.push({ index: i, id: r.id, status: 'error', error: 'missing category' })
      errorCount++
      continue
    }
    if (!VALID_CATEGORIES.has(r.category)) {
      results.push({
        index: i,
        id: r.id,
        status: 'error',
        error: `invalid category '${r.category}' (valid: ${Array.from(VALID_CATEGORIES).join(', ')})`,
      })
      errorCount++
      continue
    }
    if (typeof r.display_price_cents !== 'number') {
      results.push({
        index: i,
        id: r.id,
        status: 'error',
        error: 'display_price_cents must be a number (cents, e.g. 50000 for $500)',
      })
      errorCount++
      continue
    }

    const insertData = {
      id: r.id,
      name: r.name,
      category: r.category,
      description: r.description ?? null,
      benefit: r.benefit ?? null,
      ai_badge: r.ai_badge ?? null,
      pricing_type: r.pricing_type ?? 'one-time',
      base_range_low_cents: r.base_range_low_cents ?? r.display_price_cents,
      base_range_high_cents: r.base_range_high_cents ?? r.display_price_cents,
      monthly_range_low_cents: r.monthly_range_low_cents ?? null,
      monthly_range_high_cents: r.monthly_range_high_cents ?? null,
      display_price_cents: r.display_price_cents,
      timeline_weeks_low: r.timeline_weeks_low ?? 0,
      timeline_weeks_high: r.timeline_weeks_high ?? 0,
      included_with_paid_project: r.included_with_paid_project ?? false,
      active: r.active ?? true,
      sort_order: r.sort_order ?? 999,
    }

    // Check if exists first to report insert vs update.
    const { data: existing } = await supabaseAdmin
      .from('services_catalog')
      .select('id')
      .eq('id', r.id)
      .maybeSingle()

    if (existing) {
      const { error } = await supabaseAdmin
        .from('services_catalog')
        .update(insertData)
        .eq('id', r.id)
      if (error) {
        results.push({ index: i, id: r.id, status: 'error', error: error.message })
        errorCount++
      } else {
        results.push({ index: i, id: r.id, status: 'updated' })
        updatedCount++
      }
    } else {
      const { error } = await supabaseAdmin.from('services_catalog').insert(insertData)
      if (error) {
        results.push({ index: i, id: r.id, status: 'error', error: error.message })
        errorCount++
      } else {
        results.push({ index: i, id: r.id, status: 'inserted' })
        insertedCount++
      }
    }
  }

  invalidateCatalogCache()

  return NextResponse.json({
    total: rows.length,
    inserted: insertedCount,
    updated: updatedCount,
    errors: errorCount,
    results,
  })
}
