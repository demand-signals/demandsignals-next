import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@googlemaps/google-maps-services-js'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { calculateProspectScore } from '@/lib/scoring'
import {
  verifyCronSecret,
  getAnthropicClient,
  logAgentActivity,
  startAgentRun,
  completeAgentRun,
  failAgentRun,
  pickSearchCombo,
  ICP,
} from '@/lib/agent-utils'

const mapsClient = new Client({})

// ─── DISCOVERY PHASE ───
// Find new prospects via Google Places API, analyze with Claude
async function runDiscovery(): Promise<{ created: number; details: string[] }> {
  const combo = await pickSearchCombo()
  if (!combo) return { created: 0, details: ['All city+industry combos searched in last 30 days'] }

  const runId = await startAgentRun('discovery', combo)
  if (!runId) return { created: 0, details: ['Failed to start agent run'] }

  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      await failAgentRun(runId, 'GOOGLE_PLACES_API_KEY not configured')
      return { created: 0, details: ['GOOGLE_PLACES_API_KEY not configured'] }
    }

    // Search Google Places
    const query = `${combo.industry} in ${combo.city}`
    const response = await mapsClient.textSearch({
      params: { query, key: apiKey },
    })

    const places = (response.data.results || []).filter(p =>
      (p.rating ?? 0) >= ICP.minRating && (p.user_ratings_total ?? 0) >= ICP.minReviews
    )

    if (places.length === 0) {
      await completeAgentRun(runId, { query, results: 0 }, 0, 0)
      return { created: 0, details: [`No qualifying results for "${query}"`] }
    }

    // Deduplicate against existing prospects
    const placeNames = places.map(p => p.name?.toLowerCase() || '')
    const { data: existing } = await supabaseAdmin
      .from('prospects')
      .select('business_name')
      .ilike('city', `%${combo.city.split(',')[0]}%`)

    const existingNames = new Set(
      (existing || []).map(p => p.business_name.toLowerCase())
    )

    const newPlaces = places.filter(p => !existingNames.has((p.name || '').toLowerCase()))

    let created = 0
    const details: string[] = [`Searched: "${query}" → ${places.length} results, ${newPlaces.length} new`]

    // Process up to 5 new prospects per run
    for (const place of newPlaces.slice(0, 5)) {
      try {
        // Use Claude to analyze the business website
        let websiteAnalysis = ''
        const websiteUrl = place.website || null
        if (websiteUrl) {
          const anthropic = getAnthropicClient()
          const msg = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 500,
            messages: [{
              role: 'user',
              content: `Analyze this business website for a web agency prospecting system. URL: ${websiteUrl}

Return a brief JSON object with:
- platform: detected CMS/platform (wordpress, wix, squarespace, custom, etc.)
- issues: array of issues found (no_seo, dated_design, no_mobile, no_social, no_blog, template_site, etc.)
- opportunities: array of services we could sell (website_redesign, local_seo, social_media, content_marketing, gmb_optimization, etc.)
- quality_score: 0-100 (lower = worse site = better prospect for us)

Only return the JSON object, nothing else.`,
            }],
          })

          const textContent = msg.content.find(c => c.type === 'text')
          websiteAnalysis = textContent?.text || ''
        }

        // Parse Claude's analysis
        let researchData: Record<string, any> = {
          website: {},
          opportunities: ['website_redesign', 'local_seo'],
          urgency: 'medium',
          enriched: false,
        }
        let siteQualityScore = 50

        if (websiteAnalysis) {
          try {
            const parsed = JSON.parse(websiteAnalysis.replace(/```json?\n?/g, '').replace(/```/g, '').trim())
            researchData = {
              website: { platform: parsed.platform, issues: parsed.issues || [] },
              opportunities: parsed.opportunities || ['website_redesign', 'local_seo'],
              urgency: 'medium',
              enriched: false,
            }
            siteQualityScore = parsed.quality_score ?? 50
          } catch { /* keep defaults */ }
        }

        // Parse address from Google Places
        const addressComponents = place.formatted_address || ''
        const cityName = combo.city.split(',')[0].trim()

        // Insert new prospect
        const { error: insertError } = await supabaseAdmin
          .from('prospects')
          .insert({
            business_name: place.name || 'Unknown',
            industry: combo.industry,
            address: addressComponents,
            city: cityName,
            state: 'CA',
            website_url: websiteUrl,
            google_rating: place.rating || null,
            google_review_count: place.user_ratings_total || null,
            site_quality_score: siteQualityScore,
            research_data: researchData,
            source: 'agent:discovery',
            stage: 'researched',
            tags: [],
            notes: `Auto-discovered via Google Places. ${place.rating}★ (${place.user_ratings_total} reviews). ${websiteUrl || 'No website found.'}`,
          })

        if (!insertError) {
          created++
          details.push(`+ ${place.name} (${place.rating}★, ${place.user_ratings_total} reviews)`)
        }
      } catch (err) {
        details.push(`! Error processing ${place.name}: ${err instanceof Error ? err.message : 'unknown'}`)
      }
    }

    await completeAgentRun(runId, { query, found: places.length, new: newPlaces.length, created }, created, 0)
    await logAgentActivity('discovery', null, `Discovered ${created} new prospects`, details.join('\n'))

    return { created, details }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    await failAgentRun(runId, msg)
    return { created: 0, details: [`Discovery failed: ${msg}`] }
  }
}

// ─── ENRICHMENT PHASE ───
// Enrich sparse prospect profiles with Claude web research
async function runEnrichment(): Promise<{ updated: number; details: string[] }> {
  const runId = await startAgentRun('enrichment', {})
  if (!runId) return { updated: 0, details: ['Failed to start agent run'] }

  try {
    // Find prospects with sparse research_data (no social info, not yet enriched)
    const { data: sparse, error } = await supabaseAdmin
      .from('prospects')
      .select('*')
      .or('research_data->enriched.is.null,research_data->enriched.eq.false')
      .not('research_data', 'is', null)
      .order('prospect_score', { ascending: false })
      .limit(5)

    if (error || !sparse || sparse.length === 0) {
      await completeAgentRun(runId, { message: 'No sparse prospects found' }, 0, 0)
      return { updated: 0, details: ['No prospects need enrichment'] }
    }

    const anthropic = getAnthropicClient()
    let updated = 0
    const details: string[] = [`Found ${sparse.length} prospects to enrich`]

    for (const prospect of sparse) {
      try {
        const msg = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          messages: [{
            role: 'user',
            content: `Research this business for a web agency CRM. Return a JSON object.

Business: ${prospect.business_name}
City: ${prospect.city || 'Unknown'}, ${prospect.state || 'CA'}
Industry: ${prospect.industry || 'unknown'}
Website: ${prospect.website_url || 'unknown'}
Current notes: ${prospect.notes || 'none'}

Return JSON with:
- social: { facebook: true/false/null, instagram: true/false/null, google_business: true/false/null }
- reviews: { google: { rating: number, count: number }, yelp: { rating: number, count: number } } (use null if unknown)
- owner_name: string or null (owner/decision maker if findable)
- website_details: { mobile_friendly: boolean, ssl_valid: boolean, design_age: "modern"/"dated"/"ancient", cms: string }
- additional_opportunities: string[] (any new service opportunities spotted)

Only return the JSON object.`,
          }],
        })

        const textContent = msg.content.find(c => c.type === 'text')
        if (!textContent?.text) continue

        let enriched: Record<string, any>
        try {
          enriched = JSON.parse(textContent.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim())
        } catch { continue }

        // Merge enrichment into existing research_data
        const rd = { ...(prospect.research_data || {}) }
        if (enriched.social) rd.social = enriched.social
        if (enriched.reviews) rd.reviews = enriched.reviews
        if (enriched.website_details) {
          rd.website = { ...rd.website, ...enriched.website_details }
        }
        if (enriched.additional_opportunities?.length) {
          const existing = new Set(rd.opportunities || [])
          for (const opp of enriched.additional_opportunities) {
            existing.add(opp)
          }
          rd.opportunities = [...existing]
        }
        rd.enriched = true
        rd.enriched_at = new Date().toISOString()

        // Update the prospect
        const updateData: Record<string, any> = {
          research_data: rd,
          updated_at: new Date().toISOString(),
        }
        if (enriched.owner_name && !prospect.owner_name) {
          updateData.owner_name = enriched.owner_name
        }

        const { error: updateError } = await supabaseAdmin
          .from('prospects')
          .update(updateData)
          .eq('id', prospect.id)

        if (!updateError) {
          updated++
          details.push(`~ ${prospect.business_name}: enriched (social, reviews, website details)`)

          // Re-score after enrichment
          const fullProspect = { ...prospect, ...updateData, research_data: rd }
          const { score, tier, factors } = calculateProspectScore({
            google_rating: fullProspect.google_rating,
            google_review_count: fullProspect.google_review_count,
            yelp_rating: fullProspect.yelp_rating,
            yelp_review_count: fullProspect.yelp_review_count,
            site_quality_score: fullProspect.site_quality_score,
            industry: fullProspect.industry,
            stage: fullProspect.stage,
            tags: fullProspect.tags,
            research_data: rd,
            owner_name: fullProspect.owner_name,
            business_email: fullProspect.business_email,
            business_phone: fullProspect.business_phone,
            notes: fullProspect.notes,
            city: fullProspect.city,
          })

          await supabaseAdmin
            .from('prospects')
            .update({ prospect_score: score, score_factors: factors, auto_demo_eligible: score >= 70 })
            .eq('id', prospect.id)

          details.push(`  → Re-scored: ${score} (${tier})`)
        }
      } catch (err) {
        details.push(`! Error enriching ${prospect.business_name}: ${err instanceof Error ? err.message : 'unknown'}`)
      }
    }

    await completeAgentRun(runId, { enriched: updated }, 0, updated)
    await logAgentActivity('enrichment', null, `Enriched ${updated} prospects`, details.join('\n'))

    return { updated, details }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    await failAgentRun(runId, msg)
    return { updated: 0, details: [`Enrichment failed: ${msg}`] }
  }
}

// ─── MAIN HANDLER ───
// Combined daily cron endpoint: runs discovery then enrichment
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, any> = {}

  // Phase 1: Discovery
  const discovery = await runDiscovery()
  results.discovery = discovery

  // Phase 2: Enrichment
  const enrichment = await runEnrichment()
  results.enrichment = enrichment

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    discovery: { created: discovery.created, details: discovery.details },
    enrichment: { updated: enrichment.updated, details: enrichment.details },
  })
}
