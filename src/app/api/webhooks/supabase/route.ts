import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { calculateProspectScore } from '@/lib/scoring'

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
    await scoreProspect(record.id)
  }

  // Route: prospects UPDATE with new research_data → trigger scorer
  if (
    table === 'prospects' &&
    type === 'UPDATE' &&
    record.research_data !== null &&
    record.research_data !== old_record?.research_data
  ) {
    await scoreProspect(record.id)
  }

  return NextResponse.json({ received: true })
}

async function scoreProspect(prospectId: string) {
  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('*')
    .eq('id', prospectId)
    .single()

  if (!prospect) {
    console.error('[webhook] Prospect not found for scoring:', prospectId)
    return
  }

  const { score, factors } = calculateProspectScore(prospect)

  await supabaseAdmin
    .from('prospects')
    .update({
      prospect_score: score,
      score_factors: factors,
      auto_demo_eligible: score >= 70,
    })
    .eq('id', prospectId)

  await supabaseAdmin.from('activities').insert({
    prospect_id: prospectId,
    type: 'note',
    channel: 'system',
    direction: 'internal',
    subject: `Auto-scored: ${score}/100${score >= 70 ? ' (demo eligible)' : ''}`,
    body: JSON.stringify(factors),
    created_by: 'agent:scorer',
  })
}
