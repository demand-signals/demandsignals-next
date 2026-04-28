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
  channels: z.record(z.string(), z.any()).optional(),
  is_client: z.boolean().optional(),
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

  // Side-effect: keep became_client_at in sync with is_client toggles.
  if ('is_client' in updates) {
    if (updates.is_client === true) {
      // Only set the timestamp if not already a client (preserve original anniversary).
      const { data: existing } = await supabaseAdmin
        .from('prospects')
        .select('is_client, became_client_at')
        .eq('id', id)
        .maybeSingle()
      if (!existing?.is_client && !existing?.became_client_at) {
        updates.became_client_at = new Date().toISOString()
      }
    } else if (updates.is_client === false) {
      updates.became_client_at = null
    }
  }

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

// Delete a prospect and all CRM child rows. Document tables (sow_documents,
// invoices, receipts) hold ON DELETE SET NULL FKs to prospects.id and stay
// intact — the documents remain searchable by client_code/notes even after
// the prospect is gone. Use with care; this is destructive.
export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await ctx.params

  // CRM child rows — explicit cleanup (CASCADE not set everywhere).
  await supabaseAdmin.from('activities').delete().eq('prospect_id', id)
  await supabaseAdmin.from('demos').delete().eq('prospect_id', id)
  await supabaseAdmin.from('deals').delete().eq('prospect_id', id)
  await supabaseAdmin.from('prospect_notes').delete().eq('prospect_id', id)
  await supabaseAdmin.from('prospect_inquiries').delete().eq('prospect_id', id)

  const { error } = await supabaseAdmin.from('prospects').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
