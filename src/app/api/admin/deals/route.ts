import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { data, error } = await supabaseAdmin
    .from('deals')
    .select('*, prospects(business_name)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json()

  const { data, error } = await supabaseAdmin
    .from('deals')
    .insert(body)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log activity
  if (data.prospect_id) {
    await supabaseAdmin.from('activities').insert({
      prospect_id: data.prospect_id,
      type: 'update',
      subject: 'Deal created',
      body: [
        data.stage && `Stage: ${data.stage}`,
        data.value_estimate && `Value: $${data.value_estimate}`,
        data.service_type && `Service: ${data.service_type}`,
      ].filter(Boolean).join('\n'),
      created_by: auth.admin.id,
    })
  }

  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id, ...updates } = await request.json()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { data: current } = await supabaseAdmin.from('deals').select('*').eq('id', id).single()

  const { data, error } = await supabaseAdmin
    .from('deals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log deal changes
  if (current && data.prospect_id) {
    const changes: string[] = []
    for (const [key, newVal] of Object.entries(updates)) {
      if (['id', 'created_at', 'updated_at', 'prospect_id'].includes(key)) continue
      const oldVal = (current as any)[key]
      const oldStr = oldVal == null ? '' : String(oldVal)
      const newStr = newVal == null ? '' : String(newVal)
      if (oldStr !== newStr) {
        const label = key.replace(/_/g, ' ')
        changes.push(oldStr ? `${label}: ${oldStr} → ${newStr}` : `Added ${label}: ${newStr}`)
      }
    }
    if (changes.length > 0) {
      await supabaseAdmin.from('activities').insert({
        prospect_id: data.prospect_id,
        type: 'update',
        subject: `Deal updated`,
        body: changes.join('\n'),
        created_by: auth.admin.id,
      })
    }
  }

  return NextResponse.json({ data })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { data: deal } = await supabaseAdmin.from('deals').select('prospect_id, stage, value_estimate').eq('id', id).single()

  const { error } = await supabaseAdmin.from('deals').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (deal?.prospect_id) {
    await supabaseAdmin.from('activities').insert({
      prospect_id: deal.prospect_id,
      type: 'update',
      subject: `Deal deleted${deal.value_estimate ? ` ($${deal.value_estimate})` : ''}`,
      created_by: auth.admin.id,
    })
  }

  return NextResponse.json({ ok: true })
}
