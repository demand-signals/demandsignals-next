import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'

// /api/admin/project-notes/[id]
//   PATCH  → edit body/title/visibility (rejected once client_sent_at IS NOT NULL)
//   DELETE → remove (rejected once client_sent_at IS NOT NULL)
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §11
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 10.3–10.4

const PatchSchema = z.object({
  body: z.string().min(1).max(20_000).optional(),
  title: z.string().max(200).nullable().optional(),
  visibility: z.enum(['internal', 'client']).optional(),
})

export async function PATCH(
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
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  // Lock check: once a note has been sent in the digest, it's append-only.
  const { data: existing } = await supabaseAdmin
    .from('project_notes')
    .select('id, client_sent_at')
    .eq('id', id)
    .maybeSingle()
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (existing.client_sent_at) {
    return NextResponse.json(
      { error: 'Note already sent to client. Add a follow-up note instead.' },
      { status: 409 },
    )
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.data.body !== undefined) updates.body = parsed.data.body
  if (parsed.data.title !== undefined) updates.title = parsed.data.title
  if (parsed.data.visibility !== undefined) updates.visibility = parsed.data.visibility

  const { data: updated, error } = await supabaseAdmin
    .from('project_notes')
    .update(updates)
    .eq('id', id)
    .select(
      'id, title, body, visibility, source, client_sent_at, suppressed, created_at, updated_at',
    )
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ note: updated })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: existing } = await supabaseAdmin
    .from('project_notes')
    .select('id, client_sent_at')
    .eq('id', id)
    .maybeSingle()
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (existing.client_sent_at) {
    return NextResponse.json(
      { error: 'Cannot delete a note already sent to client.' },
      { status: 409 },
    )
  }

  const { error } = await supabaseAdmin.from('project_notes').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
