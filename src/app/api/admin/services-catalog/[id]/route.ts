// ── /api/admin/services-catalog/[id] — detail + update + delete ─────

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { invalidateCatalogCache } from '@/lib/services-catalog'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('services_catalog')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ service: data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))

  // Whitelist editable fields.
  const allowedFields = [
    'name',
    'category',
    'description',
    'benefit',
    'ai_badge',
    'pricing_type',
    'base_range_low_cents',
    'base_range_high_cents',
    'monthly_range_low_cents',
    'monthly_range_high_cents',
    'display_price_cents',
    'quantifiable',
    'quantity_label',
    'timeline_weeks_low',
    'timeline_weeks_high',
    'parallel_group',
    'financeable',
    'financing_term_months',
    'requires_base',
    'phase',
    'available_for_bid',
    'active',
    'included_with_paid_project',
    'sort_order',
  ]

  const updates: Record<string, unknown> = {}
  for (const k of allowedFields) {
    if (body[k] !== undefined) updates[k] = body[k]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('services_catalog')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  invalidateCatalogCache()
  return NextResponse.json({ service: data })
}

/**
 * DELETE — soft delete by setting active=false. Hard delete would orphan
 * historical invoice line items that reference this service by id.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('services_catalog')
    .update({ active: false })
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  invalidateCatalogCache()
  return NextResponse.json({ ok: true, service: data })
}
