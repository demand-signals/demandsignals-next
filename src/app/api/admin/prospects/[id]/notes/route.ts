import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

// GET /api/admin/prospects/[id]/notes — list notes newest-first
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('prospect_notes')
    .select('*')
    .eq('prospect_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notes: data ?? [] })
}

const postSchema = z.object({
  body: z.string().min(1, 'Note body is required'),
})

// POST /api/admin/prospects/[id]/notes — create a note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await params

  let parsed
  try {
    parsed = postSchema.parse(await request.json())
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.issues[0]?.message : 'invalid body'
    return NextResponse.json({ error: msg ?? 'invalid body' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('prospect_notes')
    .insert({
      prospect_id: id,
      body: parsed.body,
      created_by: auth.admin.email ?? auth.admin.id ?? 'admin',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data }, { status: 201 })
}
