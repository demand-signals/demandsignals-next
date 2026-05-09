// GET    /api/admin/projects/[id]/time-entries — list + rollup
// POST   /api/admin/projects/[id]/time-entries — create one entry

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  createTimeEntry,
  listProjectTimeEntries,
  rollupTimeEntries,
} from '@/lib/time-entries'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error
  const { id } = await params

  const entries = await listProjectTimeEntries(id)
  const rollup = rollupTimeEntries(entries)

  return NextResponse.json({ entries, rollup })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const hours = Number(body.hours)
  if (!hours || hours <= 0 || hours > 24) {
    return NextResponse.json(
      { error: 'hours must be a number between 0 and 24' },
      { status: 400 },
    )
  }

  // Resolve admin email for audit
  const adminEmail = (auth as any).user?.email ?? null

  // Optional category + coverage refs. Default = 'billable'. The DB
  // CHECK constraint enforces consistency between the two; we trust it.
  const validCategories = ['billable', 'non_billable', 'bulk_payment', 'services_contract', 'internal'] as const
  const category =
    typeof body.category === 'string' && (validCategories as readonly string[]).includes(body.category)
      ? (body.category as typeof validCategories[number])
      : undefined

  try {
    const entry = await createTimeEntry({
      project_id:        id,
      phase_id:          body.phase_id || null,
      deliverable_id:    body.deliverable_id || null,
      hours,
      description:       typeof body.description === 'string' ? body.description.slice(0, 1000) : null,
      billable:          body.billable !== false,
      category,
      covered_by_invoice_id:
        typeof body.covered_by_invoice_id === 'string' ? body.covered_by_invoice_id : null,
      covered_by_subscription_id:
        typeof body.covered_by_subscription_id === 'string' ? body.covered_by_subscription_id : null,
      hourly_rate_cents: typeof body.hourly_rate_cents === 'number' ? body.hourly_rate_cents : null,
      logged_at:         typeof body.logged_at === 'string' ? body.logged_at : undefined,
      logged_by:         adminEmail,
    })
    return NextResponse.json({ entry })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Insert failed' },
      { status: 500 },
    )
  }
}
