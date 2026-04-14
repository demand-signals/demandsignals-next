import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const stage = searchParams.get('stage')
  const industry = searchParams.get('industry')
  const city = searchParams.get('city')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const sort = searchParams.get('sort') || 'prospect_score'
  const order = searchParams.get('order') || 'desc'

  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('prospects')
    .select('*, demos(id, demo_url, status), deals(id, stage, value_estimate)', { count: 'exact' })

  if (stage) query = query.eq('stage', stage)
  if (industry) query = query.eq('industry', industry)
  if (city) query = query.ilike('city', `%${city}%`)
  if (search) {
    query = query.or(`business_name.ilike.%${search}%,owner_name.ilike.%${search}%`)
  }

  const { data, error, count } = await query
    .order(sort, { ascending: order === 'asc' })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, total: count, page, limit })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json()

  const { data, error } = await supabaseAdmin
    .from('prospects')
    .insert(body)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log activity
  await supabaseAdmin.from('activities').insert({
    prospect_id: data.id,
    type: 'note',
    subject: 'Prospect created',
    created_by: auth.admin.id,
  })

  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  // Fetch current prospect to check for stage change
  const { data: current } = await supabaseAdmin
    .from('prospects')
    .select('stage')
    .eq('id', id)
    .single()

  const { data, error } = await supabaseAdmin
    .from('prospects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log stage change if stage changed
  if (current && updates.stage && current.stage !== updates.stage) {
    await supabaseAdmin.from('activities').insert({
      prospect_id: id,
      type: 'stage_change',
      subject: `Stage changed: ${current.stage} → ${updates.stage}`,
      created_by: auth.admin.id,
    })
  }

  return NextResponse.json({ data })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  // Delete related records first
  await supabaseAdmin.from('activities').delete().eq('prospect_id', id)
  await supabaseAdmin.from('demos').delete().eq('prospect_id', id)
  await supabaseAdmin.from('deals').delete().eq('prospect_id', id)

  const { error } = await supabaseAdmin.from('prospects').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
