// ── GET /api/admin/trade-credits — list all trade credits ─────────────
// ── POST /api/admin/trade-credits — create a trade credit manually ────

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

const postSchema = z.object({
  prospect_id: z.string().uuid(),
  sow_document_id: z.string().uuid().nullable().optional(),
  invoice_id: z.string().uuid().nullable().optional(),
  original_amount_cents: z.number().int().nonnegative(),
  description: z.string().min(1),
  notes: z.string().nullable().optional(),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const sp = request.nextUrl.searchParams
  const prospectId = sp.get('prospect_id')
  const status = sp.get('status')

  let q = supabaseAdmin
    .from('trade_credits')
    .select('*, prospect:prospects(business_name)')
    .order('opened_at', { ascending: false })

  if (prospectId) q = q.eq('prospect_id', prospectId)
  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ trade_credits: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  let parsed: z.infer<typeof postSchema>
  try {
    parsed = postSchema.parse(await request.json())
  } catch (e) {
    const msg = e instanceof z.ZodError
      ? e.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
      : 'Invalid request body'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('trade_credits')
    .insert({
      prospect_id: parsed.prospect_id,
      sow_document_id: parsed.sow_document_id ?? null,
      invoice_id: parsed.invoice_id ?? null,
      original_amount_cents: parsed.original_amount_cents,
      remaining_cents: parsed.original_amount_cents,
      description: parsed.description,
      status: 'outstanding',
      notes: parsed.notes ?? null,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ trade_credit: data }, { status: 201 })
}
