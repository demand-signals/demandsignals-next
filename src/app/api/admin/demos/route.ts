import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { data, error } = await supabaseAdmin
    .from('demos')
    .select('*, prospects(business_name, city, industry, prospect_score, score_factors)')
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
    .from('demos')
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
      subject: 'Demo site added',
      body: [
        data.demo_url && `URL: ${data.demo_url}`,
        data.platform && `Platform: ${data.platform}`,
        data.status && `Status: ${data.status}`,
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

  // Fetch current to diff
  const { data: current } = await supabaseAdmin.from('demos').select('*').eq('id', id).single()

  const { data, error } = await supabaseAdmin
    .from('demos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log demo changes
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
        subject: `Demo updated (${data.demo_url || id.slice(0, 8)})`,
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

  // Fetch before delete to log
  const { data: demo } = await supabaseAdmin.from('demos').select('prospect_id, demo_url').eq('id', id).single()

  const { error } = await supabaseAdmin.from('demos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log deletion
  if (demo?.prospect_id) {
    await supabaseAdmin.from('activities').insert({
      prospect_id: demo.prospect_id,
      type: 'update',
      subject: `Demo deleted${demo.demo_url ? `: ${demo.demo_url}` : ''}`,
      created_by: auth.admin.id,
    })
  }

  return NextResponse.json({ ok: true })
}
