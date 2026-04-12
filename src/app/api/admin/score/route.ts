import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { calculateProspectScore } from '@/lib/scoring'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json()
  const { prospect_id } = body

  if (prospect_id) {
    // Score single prospect — fetch all fields for full intelligence scoring
    const { data: prospect, error: fetchError } = await supabaseAdmin
      .from('prospects')
      .select('*')
      .eq('id', prospect_id)
      .single()

    if (fetchError || !prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    }

    const { score, tier, factors } = calculateProspectScore(prospect)

    const { error: updateError } = await supabaseAdmin
      .from('prospects')
      .update({ prospect_score: score, score_factors: factors })
      .eq('id', prospect_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ scored: 1, score, tier })
  }

  // Batch score all prospects — fetch all fields for full intelligence scoring
  const { data: prospects, error: fetchError } = await supabaseAdmin
    .from('prospects')
    .select('*')

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!prospects || prospects.length === 0) {
    return NextResponse.json({ scored: 0 })
  }

  let scored = 0
  const tierCounts: Record<string, number> = {}
  for (const prospect of prospects) {
    const { score, tier, factors } = calculateProspectScore(prospect)
    const { error: updateError } = await supabaseAdmin
      .from('prospects')
      .update({ prospect_score: score, score_factors: factors })
      .eq('id', prospect.id)

    if (!updateError) {
      scored++
      tierCounts[tier] = (tierCounts[tier] || 0) + 1
    }
  }

  return NextResponse.json({ scored, tiers: tierCounts })
}
