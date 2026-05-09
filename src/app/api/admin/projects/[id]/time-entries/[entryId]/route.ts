// PATCH  /api/admin/projects/[id]/time-entries/[entryId]
// DELETE /api/admin/projects/[id]/time-entries/[entryId]

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { deleteTimeEntry } from '@/lib/time-entries'

// Editable fields. Hours decimal mirrors hunter+claude minutes when
// either of those changes; admin can also edit hours directly for
// non-handoff (manual) entries that don't carry minute splits.
const PatchSchema = z.object({
  hunter_minutes: z.number().int().min(0).max(60 * 24 * 7).optional(),
  claude_minutes: z.number().int().min(0).max(60 * 24 * 7).optional(),
  hours: z.number().min(0).max(24).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  billable: z.boolean().optional(),
  logged_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error
  const { entryId } = await params

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

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.data.hunter_minutes !== undefined) updates.hunter_minutes = parsed.data.hunter_minutes
  if (parsed.data.claude_minutes !== undefined) updates.claude_minutes = parsed.data.claude_minutes
  if (parsed.data.hours !== undefined) updates.hours = parsed.data.hours
  if (parsed.data.description !== undefined) updates.description = parsed.data.description
  if (parsed.data.billable !== undefined) updates.billable = parsed.data.billable
  if (parsed.data.logged_at !== undefined) updates.logged_at = parsed.data.logged_at

  // Auto-mirror hours from hunter+claude when minutes change but hours wasn't set explicitly
  if (
    (parsed.data.hunter_minutes !== undefined || parsed.data.claude_minutes !== undefined) &&
    parsed.data.hours === undefined
  ) {
    // Need the row's current minute counts to compute correctly when only
    // one side was patched
    const { data: current } = await supabaseAdmin
      .from('project_time_entries')
      .select('hunter_minutes, claude_minutes')
      .eq('id', entryId)
      .maybeSingle()
    const newH = parsed.data.hunter_minutes ?? current?.hunter_minutes ?? 0
    const newC = parsed.data.claude_minutes ?? current?.claude_minutes ?? 0
    const totalMin = newH + newC
    updates.hours = totalMin > 0 ? Math.round((totalMin / 60) * 100) / 100 : null
  }

  const { data: updated, error } = await supabaseAdmin
    .from('project_time_entries')
    .update(updates)
    .eq('id', entryId)
    .select('id, hours, hunter_minutes, claude_minutes, description, billable, logged_at, logged_by, source')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ entry: updated })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error
  const { entryId } = await params

  try {
    await deleteTimeEntry(entryId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Delete failed' },
      { status: 500 },
    )
  }
}
