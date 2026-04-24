import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

const patchSchema = z.object({
  body: z.string().min(1, 'Note body is required'),
})

// PATCH /api/admin/prospects/[id]/notes/[noteId] — update note body
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id, noteId } = await params

  let parsed
  try {
    parsed = patchSchema.parse(await request.json())
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.issues[0]?.message : 'invalid body'
    return NextResponse.json({ error: msg ?? 'invalid body' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('prospect_notes')
    .update({ body: parsed.body, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .eq('prospect_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/prospects/[id]/notes/[noteId] — delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id, noteId } = await params

  const { error } = await supabaseAdmin
    .from('prospect_notes')
    .delete()
    .eq('id', noteId)
    .eq('prospect_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
