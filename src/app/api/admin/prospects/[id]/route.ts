import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

const patchSchema = z.object({
  owner_name: z.string().nullable().optional(),
  owner_email: z.string().email().nullable().optional().or(z.literal('')),
  business_email: z.string().email().nullable().optional().or(z.literal('')),
  owner_phone: z.string().nullable().optional(),
  business_phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  client_code: z
    .string()
    .regex(/^[A-Z]{4}$/, 'client_code must be exactly 4 uppercase letters')
    .nullable()
    .optional(),
})

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await ctx.params
  let parsed
  try { parsed = patchSchema.parse(await request.json()) } catch (e) {
    const msg = e instanceof z.ZodError ? e.issues[0]?.message : 'invalid body'
    return NextResponse.json({ error: msg ?? 'invalid body' }, { status: 400 })
  }
  // strip undefined (keep nulls — null means explicit clear)
  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(parsed)) if (v !== undefined) updates[k] = v === '' ? null : v
  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true })

  // client_code collision check — reject before hitting the unique index
  if (updates.client_code != null) {
    const { data: conflict } = await supabaseAdmin
      .from('prospects')
      .select('id, business_name')
      .eq('client_code', updates.client_code as string)
      .neq('id', id)
      .limit(1)
    if (conflict && conflict.length > 0) {
      return NextResponse.json(
        {
          error: `Client code "${updates.client_code}" is already used by "${conflict[0].business_name}". Choose a different code.`,
          conflict: { id: conflict[0].id, business_name: conflict[0].business_name },
        },
        { status: 409 },
      )
    }
  }

  const { error } = await supabaseAdmin.from('prospects').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
