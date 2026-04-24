import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

const postSchema = z.object({
  demo_url: z.string().url('Must be a valid URL'),
  platform: z.enum(['verpex', 'vercel', 'netlify', 'other']).default('other'),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
  page_count: z.number().int().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
})

// POST /api/admin/prospects/[id]/demos — link a demo to this prospect
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
    .from('demos')
    .insert({
      prospect_id: id,
      demo_url: parsed.demo_url,
      platform: parsed.platform,
      status: parsed.status,
      page_count: parsed.page_count ?? null,
      notes: parsed.notes ?? null,
      generation_method: 'manual',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ demo: data }, { status: 201 })
}
