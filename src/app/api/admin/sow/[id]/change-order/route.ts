// ── POST /api/admin/sow/[id]/change-order ───────────────────────────
// Creates a mini-SOW with parent_sow_id pointing at the original.
// Admin then converts the mini-SOW via /api/admin/sow/[newId]/convert.
//
// Body: { title: string, scope_summary?: string, total_cents: number,
//         deliverables?: SowDeliverable[] }

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { allocateDocNumber } from '@/lib/doc-numbering'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => null)
  if (!body || !body.title || typeof body.total_cents !== 'number') {
    return NextResponse.json({ error: 'title and total_cents required' }, { status: 400 })
  }

  const { data: parent } = await supabaseAdmin
    .from('sow_documents')
    .select('*')
    .eq('id', id)
    .single()

  if (!parent) return NextResponse.json({ error: 'Parent SOW not found' }, { status: 404 })

  const tempNum = `PENDING-CO-${crypto.randomUUID()}`
  const { data: child, error: insErr } = await supabaseAdmin
    .from('sow_documents')
    .insert({
      sow_number: tempNum,
      parent_sow_id: parent.id,
      prospect_id: parent.prospect_id,
      quote_session_id: parent.quote_session_id,
      status: 'draft',
      title: body.title,
      scope_summary: body.scope_summary ?? null,
      phases: [],
      deliverables: body.deliverables ?? [],
      timeline: [],
      pricing: {
        total_cents: body.total_cents,
        deposit_cents: body.total_cents,
        deposit_pct: 100,
      },
    })
    .select('*')
    .single()

  if (insErr || !child) {
    return NextResponse.json({ error: `Insert failed: ${insErr?.message}` }, { status: 500 })
  }

  if (parent.prospect_id) {
    try {
      const sowNumber = await allocateDocNumber({
        doc_type: 'SOW',
        prospect_id: parent.prospect_id,
        ref_table: 'sow_documents',
        ref_id: child.id,
      })
      await supabaseAdmin.from('sow_documents').update({ sow_number: sowNumber }).eq('id', child.id)
      child.sow_number = sowNumber
    } catch (e) {
      console.error('[change-order] number allocation failed:', e)
    }
  }

  return NextResponse.json({
    sow: child,
    message: `Change-order SOW ${child.sow_number} created. Open it in /admin/sow and click Convert to issue installments.`,
  })
}
