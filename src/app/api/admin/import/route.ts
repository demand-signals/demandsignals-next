import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { calculateProspectScore } from '@/lib/scoring'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  let body: { prospects: Record<string, any>[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { prospects } = body
  if (!Array.isArray(prospects) || prospects.length === 0) {
    return NextResponse.json({ error: 'prospects array is required' }, { status: 400 })
  }

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 0; i < prospects.length; i++) {
    const raw = prospects[i]

    // Extract demo_url before inserting (not a column on prospects)
    const demo_url = raw.demo_url ?? null

    // Build prospect record
    const {
      id: _id,
      created_at: _ca,
      updated_at: _ua,
      demos: _demos,
      deals: _deals,
      activities: _activities,
      demo_url: _du,
      ...rest
    } = raw

    // Normalise numeric fields
    if (rest.google_rating) rest.google_rating = parseFloat(rest.google_rating)
    if (rest.google_review_count) rest.google_review_count = parseInt(rest.google_review_count, 10)
    if (rest.yelp_rating) rest.yelp_rating = parseFloat(rest.yelp_rating)
    if (rest.yelp_review_count) rest.yelp_review_count = parseInt(rest.yelp_review_count, 10)
    if (rest.site_quality_score) rest.site_quality_score = parseFloat(rest.site_quality_score)

    if (!rest.business_name) {
      errors.push(`Row ${i + 1}: missing business_name`)
      skipped++
      continue
    }

    // Calculate score with full intelligence signals
    const { score, tier, factors } = calculateProspectScore({
      google_rating: rest.google_rating,
      google_review_count: rest.google_review_count,
      yelp_rating: rest.yelp_rating,
      yelp_review_count: rest.yelp_review_count,
      site_quality_score: rest.site_quality_score,
      industry: rest.industry,
      stage: rest.stage,
      tags: rest.tags,
      research_data: rest.research_data,
      owner_name: rest.owner_name,
      business_email: rest.business_email,
      business_phone: rest.business_phone,
      notes: rest.notes,
    })

    const stage = demo_url ? 'demo_built' : (rest.stage ?? 'researched')

    const prospectData = {
      ...rest,
      prospect_score: score,
      score_factors: factors,
      stage,
      source: rest.source ?? 'import',
      auto_demo_eligible: rest.auto_demo_eligible ?? false,
      tags: Array.isArray(rest.tags) ? rest.tags : [],
    }

    try {
      const { data: prospect, error: upsertError } = await supabaseAdmin
        .from('prospects')
        .upsert(prospectData, {
          onConflict: 'business_name,city',
          ignoreDuplicates: false,
        })
        .select()
        .single()

      if (upsertError) {
        errors.push(`Row ${i + 1} (${rest.business_name}): ${upsertError.message}`)
        skipped++
        continue
      }

      // If demo_url present, check-then-insert demo record
      if (demo_url && prospect) {
        const { data: existingDemo } = await supabaseAdmin
          .from('demos')
          .select('id')
          .eq('prospect_id', prospect.id)
          .eq('demo_url', demo_url)
          .maybeSingle()

        if (!existingDemo) {
          const { error: demoError } = await supabaseAdmin
            .from('demos')
            .insert({
              prospect_id: prospect.id,
              demo_url,
              platform: raw.platform ?? 'unknown',
              status: raw.demo_status ?? 'ready',
              version: 1,
              page_count: raw.page_count ? parseInt(raw.page_count, 10) : 0,
              generation_method: raw.generation_method ?? 'manual',
              view_count: 0,
              unique_visitors: 0,
            })

          if (demoError) {
            errors.push(`Row ${i + 1} demo (${rest.business_name}): ${demoError.message}`)
          }
        }
      }

      imported++
    } catch (err) {
      errors.push(`Row ${i + 1} (${rest.business_name}): unexpected error`)
      skipped++
    }
  }

  return NextResponse.json({ imported, skipped, errors })
}
