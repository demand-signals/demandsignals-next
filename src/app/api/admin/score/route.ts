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
    // Score single prospect
    const { data: prospect, error: fetchError } = await supabaseAdmin
      .from('prospects')
      .select('id, google_rating, google_review_count, site_quality_score, industry, score_factors')
      .eq('id', prospect_id)
      .single()

    if (fetchError || !prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    }

    const { score, factors } = calculateProspectScore(prospect)

    const { error: updateError } = await supabaseAdmin
      .from('prospects')
      .update({ prospect_score: score, score_factors: factors })
      .eq('id', prospect_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ scored: 1, score })
  }

  // Batch score all prospects
  const { data: prospects, error: fetchError } = await supabaseAdmin
    .from('prospects')
    .select('id, google_rating, google_review_count, site_quality_score, industry, score_factors')

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!prospects || prospects.length === 0) {
    return NextResponse.json({ scored: 0 })
  }

  let scored = 0
  for (const prospect of prospects) {
    const { score, factors } = calculateProspectScore(prospect)
    const { error: updateError } = await supabaseAdmin
      .from('prospects')
      .update({ prospect_score: score, score_factors: factors })
      .eq('id', prospect.id)

    if (!updateError) scored++
  }

  return NextResponse.json({ scored })
}
