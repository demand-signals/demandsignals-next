// DELETE /api/admin/projects/[id]/time-entries/[entryId]

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { deleteTimeEntry } from '@/lib/time-entries'

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
