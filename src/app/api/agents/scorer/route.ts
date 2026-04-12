import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { calculateProspectScore } from '@/lib/scoring'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const internalSecret = process.env.SUPABASE_WEBHOOK_SECRET
  if (authHeader !== `Bearer ${internalSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { prospect_id } = await request.json() as { prospect_id: string }

  if (!prospect_id) {
    return NextResponse.json({ error: 'prospect_id is required' }, { status: 400 })
  }

  // Fetch prospect
  const { data: prospect, error: fetchError } = await supabaseAdmin
    .from('prospects')
    .select('*')
    .eq('id', prospect_id)
    .single()

  if (fetchError || !prospect) {
    return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
  }

  // Calculate score with full intelligence signals
  const { score, tier, factors } = calculateProspectScore({
    google_rating: prospect.google_rating,
    google_review_count: prospect.google_review_count,
    yelp_rating: prospect.yelp_rating,
    yelp_review_count: prospect.yelp_review_count,
    site_quality_score: prospect.site_quality_score,
    industry: prospect.industry,
    stage: prospect.stage,
    tags: prospect.tags,
    research_data: prospect.research_data,
    owner_name: prospect.owner_name,
    business_email: prospect.business_email,
    business_phone: prospect.business_phone,
    notes: prospect.notes,
  })

  const auto_demo_eligible = score >= 70

  // Update prospect with new score
  const { error: updateError } = await supabaseAdmin
    .from('prospects')
    .update({
      prospect_score: score,
      score_factors: factors,
      auto_demo_eligible,
      updated_at: new Date().toISOString(),
    })
    .eq('id', prospect_id)

  if (updateError) {
    console.error('[scorer] Failed to update prospect:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Log activity
  await supabaseAdmin.from('activities').insert({
    prospect_id,
    type: 'note',
    subject: `Score updated: ${score}${auto_demo_eligible ? ' (auto-demo eligible)' : ''}`,
    body: `Tier: ${tier} | Review: ${factors.review_authority} | Vulnerability: ${factors.digital_vulnerability} | Close: ${factors.close_probability} | Revenue: ${factors.revenue_potential}`,
    created_by: 'agent:scorer',
  })

  return NextResponse.json({ prospect_id, score, factors, auto_demo_eligible })
}
