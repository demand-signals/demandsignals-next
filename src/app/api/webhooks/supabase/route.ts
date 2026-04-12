import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const authHeader = request.headers.get('Authorization')
  const expectedSecret = process.env.SUPABASE_WEBHOOK_SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await request.json() as {
    type: string
    table: string
    record: Record<string, any>
    old_record: Record<string, any> | null
  }

  const { type, table, record, old_record } = payload

  // Route: prospects INSERT → trigger scorer
  if (table === 'prospects' && type === 'INSERT') {
    await callScorer(record.id)
  }

  // Route: prospects UPDATE with new research_data → trigger scorer
  if (
    table === 'prospects' &&
    type === 'UPDATE' &&
    record.research_data !== null &&
    record.research_data !== old_record?.research_data
  ) {
    await callScorer(record.id)
  }

  return NextResponse.json({ received: true })
}

async function callScorer(prospectId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  await fetch(`${baseUrl}/api/agents/scorer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prospect_id: prospectId }),
  }).catch(err => {
    console.error('[webhook] Failed to call scorer agent:', err)
  })
}
