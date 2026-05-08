import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'

// /api/admin/project-notes/[id]/suppress
//   POST  → toggle suppressed flag (holds note out of next digest)
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §11
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 10.5

const Schema = z.object({
  suppressed: z.boolean(),
  reason: z.string().max(500).optional().nullable(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { error } = await supabaseAdmin
    .from('project_notes')
    .update({
      suppressed: parsed.data.suppressed,
      suppressed_reason: parsed.data.suppressed ? parsed.data.reason ?? null : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
