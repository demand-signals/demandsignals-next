// ── /api/admin/services-catalog — list + create ─────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { invalidateCatalogCache } from '@/lib/services-catalog'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const sp = request.nextUrl.searchParams
  const activeOnly = sp.get('active') !== 'false'
  const category = sp.get('category')
  const search = sp.get('search')

  let q = supabaseAdmin
    .from('services_catalog')
    .select('*')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })

  if (activeOnly) q = q.eq('active', true)
  if (category) q = q.eq('category', category)
  if (search) {
    q = q.or(
      `name.ilike.%${search}%,description.ilike.%${search}%,benefit.ilike.%${search}%,id.ilike.%${search}%`,
    )
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ services: data ?? [] })
}

/**
 * POST — create a new catalog item (often from the "Save to catalog" quick-add
 * on invoice/SOW line items).
 *
 * Body supports a minimum shape for quick-add:
 *   { id, name, category, description?, display_price_cents, pricing_type? }
 * Optional richer fields can also be set.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const {
    id,
    name,
    category,
    description,
    benefit,
    display_price_cents,
    pricing_type,
    base_range_low_cents,
    base_range_high_cents,
    timeline_weeks_low,
    timeline_weeks_high,
    included_with_paid_project,
  } = body

  if (!id || !name || !category || typeof display_price_cents !== 'number') {
    return NextResponse.json(
      { error: 'Required: id, name, category, display_price_cents' },
      { status: 400 },
    )
  }

  const insertData = {
    id,
    name,
    category,
    description: description ?? null,
    benefit: benefit ?? null,
    pricing_type: pricing_type ?? 'one-time',
    base_range_low_cents: base_range_low_cents ?? display_price_cents,
    base_range_high_cents: base_range_high_cents ?? display_price_cents,
    display_price_cents,
    timeline_weeks_low: timeline_weeks_low ?? 0,
    timeline_weeks_high: timeline_weeks_high ?? 0,
    included_with_paid_project: !!included_with_paid_project,
    active: true,
  }

  const { data, error } = await supabaseAdmin
    .from('services_catalog')
    .insert(insertData)
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `Catalog item with id '${id}' already exists` },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  invalidateCatalogCache()
  return NextResponse.json({ service: data })
}
