import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET /api/admin/agent-runs — list recent agent runs
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const limit = Number(request.nextUrl.searchParams.get('limit') || '20')

  const { data, error } = await supabaseAdmin
    .from('agent_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(Math.min(limit, 100))

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// POST /api/admin/agent-runs — manually trigger the daily agent
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  // Call the daily agent endpoint with the cron secret
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/agents/daily`, {
      method: 'GET',
      headers: { authorization: `Bearer ${cronSecret}` },
    })

    const result = await res.json()
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to trigger daily agent' },
      { status: 500 }
    )
  }
}
