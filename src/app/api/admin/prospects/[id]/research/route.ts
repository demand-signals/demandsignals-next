import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getAnthropicClient, logAgentActivity } from '@/lib/agent-utils'
import { calculateProspectScore } from '@/lib/scoring'
import { normalizeReviewChannel, normalizeSimpleChannel, isReviewChannel } from '@/lib/prospect-channels'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await params

  // Fetch prospect
  const { data: prospect, error: fetchError } = await supabaseAdmin
    .from('prospects')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !prospect) {
    return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  try {
    const anthropic = getAnthropicClient()

    // Build context from existing data
    const existingData = prospect.research_data || {}
    const existingNotes = prospect.notes || ''

    // Use web search + web fetch tools for real research
    const tools: any[] = [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 10,
      },
    ]

    // Add web_fetch if website URL is available
    if (prospect.website_url) {
      tools.push({
        type: 'web_fetch_20250910',
        name: 'web_fetch',
        max_uses: 3,
      })
    }

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      tools,
      messages: [{
        role: 'user',
        content: `You are a business intelligence researcher for a web agency CRM (Demand Signals). Conduct a comprehensive deep-dive on this prospect using web search.

CRITICAL: You MUST use the web_search tool to look up real information about this business. Search for their website, reviews, social media profiles, and any other relevant data. Do NOT guess or hallucinate — only report what you actually find via search.

## VERIFIED PROSPECT DATA (TRUST THIS — DO NOT OVERRIDE)
- Business Name: ${prospect.business_name}
- Industry: ${prospect.industry || 'unknown'}
- **CONFIRMED Location: ${prospect.city || 'unknown'}, ${prospect.state || 'CA'}** (this is their REAL location — do not change it)
- Address: ${prospect.address || 'unknown'}
- ZIP: ${prospect.zip || 'unknown'}
- Website: ${prospect.website_url || 'unknown'}
- Current Google Rating: ${prospect.google_rating ?? 'unknown'}
- Current Google Reviews: ${prospect.google_review_count ?? 'unknown'}
- Current Yelp Rating: ${prospect.yelp_rating ?? 'unknown'}
- Current Yelp Reviews: ${prospect.yelp_review_count ?? 'unknown'}
- Existing Notes: ${existingNotes || 'none'}

## RESEARCH INSTRUCTIONS
1. Search for "${prospect.business_name}" in ${prospect.city || 'their city'}, ${prospect.state || 'CA'}
2. ${prospect.website_url ? `Fetch and analyze their website at ${prospect.website_url}` : 'Search for their website'}
3. Search for their Google Business profile and reviews
4. Search for their Yelp profile and reviews
5. Search for their social media profiles (Facebook, Instagram, LinkedIn, etc.)
6. Search for industry-specific review platforms (${prospect.industry === 'dental' || prospect.industry === 'medical' ? 'Healthgrades, Zocdoc, Vitals' : prospect.industry === 'legal' ? 'Avvo, Martindale-Hubbell' : prospect.industry === 'contractor' || prospect.industry === 'hvac' || prospect.industry === 'plumbing' ? 'HomeAdvisor, Angi, BBB, Houzz' : 'BBB, industry directories'})
7. Search for competitors in their area
8. For each platform below, search for this business's direct profile URL and include it in the "channels" object:
   Simple channels (return string URL or null):
   - website: official site URL
   - linkedin: LinkedIn company page
   - tiktok: TikTok profile
   - youtube: YouTube channel
   - instagram: Instagram profile
   - twitter_x: Twitter/X profile
   - pinterest: Pinterest profile

   Review-capable channels (return an object or null):
   - google_business, yelp, facebook, trustpilot, bbb, angi, nextdoor
   For each review channel, return: { "url": string|null, "rating": number|null, "review_count": integer|null }
   If you find the profile but cannot confirm current rating/count, return url with rating and review_count as null.
   If the business has no presence on a platform, return null for the entire key.

   If you find any OTHER directories or profiles (chamber of commerce, industry-specific directories, forum presence), include them in the channels.other array as [{label, url}].

After completing your research, provide your findings.

## RETURN FORMAT
Return ONLY a JSON object (no markdown, no explanation) with these fields:

{
  "owner_name": "string or null — owner/decision maker name",
  "owner_email": "string or null — business contact email if findable",
  "owner_phone": "string or null — direct/cell phone if findable",
  "business_phone": "string or null — main business phone",
  "business_email": "string or null — general business email",

  "reviews": {
    "google": { "rating": number, "count": number },
    "yelp": { "rating": number, "count": number },
    "other": [
      { "platform": "string", "rating": number, "count": number }
    ]
  },

  "website": {
    "platform": "string — CMS/platform (wordpress, wix, squarespace, godaddy, custom, etc.)",
    "ssl_valid": true/false,
    "mobile_friendly": true/false,
    "design_age": "modern/dated/ancient",
    "page_speed": "fast/average/slow/unknown",
    "has_blog": true/false,
    "has_forms": true/false,
    "has_chat": true/false,
    "has_scheduling": true/false,
    "issues": ["array of specific issues: no_seo, dated_design, no_mobile, broken_contact, template_site, no_blog, slow_load, no_schema, no_sitemap, stock_photos, etc."]
  },

  "social": {
    "facebook": true/false/null,
    "instagram": true/false/null,
    "linkedin": true/false/null,
    "twitter": true/false/null,
    "youtube": true/false/null,
    "tiktok": true/false/null,
    "google_business": true/false/null,
    "nextdoor": true/false/null
  },

  "business_details": {
    "established": "year or null",
    "employees_estimate": "number or null",
    "hours": "string or null — e.g. Mon-Fri 8am-5pm",
    "services": ["array of services offered"],
    "service_area": "string — geographic service area",
    "specialties": ["array of specialties/differentiators"],
    "licenses": ["array of licenses/certifications if applicable"],
    "associations": ["industry associations/memberships"]
  },

  "competitors": [
    { "name": "string", "strength": "strong/moderate/weak", "notes": "string" }
  ],

  "opportunities": ["website_redesign", "local_seo", "social_media", "content_marketing", "gmb_optimization", "review_management", "ai_chatbot", "online_scheduling", "email_marketing", "reputation_management", "video_marketing", "paid_ads"],

  "vulnerabilities": ["array of specific digital weaknesses — be specific: 'No Google Business profile optimization', 'Website uses dated GoDaddy template', etc."],

  "pitch_angle": "string — the single most compelling reason they need our services, written as a sales talking point",

  "deal_estimate": "string — estimated deal value range, e.g. '$8K-$15K build + $1.5K/mo'",

  "urgency": "high/medium/low — based on competitive pressure, digital gaps, market timing",

  "executive_summary": "string — 2-3 sentence overview of this prospect's digital situation and why they're a good fit for Demand Signals",

  "risk_factors": ["array of reasons they might NOT close — already has agency, family member does marketing, cheap industry, etc."],

  "recommended_approach": "string — how to approach this prospect (cold email, demo drop, referral, etc.)",

  "site_quality_score": number, // 0-100, lower = worse site = better prospect for us

  "channels": {
    "website": "string or null — official site URL",
    "linkedin": "string or null — LinkedIn company page URL",
    "tiktok": "string or null — TikTok profile URL",
    "youtube": "string or null — YouTube channel URL",
    "instagram": "string or null — Instagram profile URL",
    "twitter_x": "string or null — Twitter/X profile URL",
    "pinterest": "string or null — Pinterest profile URL",
    "google_business": {"url": "string or null", "rating": "number or null", "review_count": "integer or null"},
    "yelp": {"url": "string or null", "rating": "number or null", "review_count": "integer or null"},
    "facebook": {"url": "string or null", "rating": "number or null", "review_count": "integer or null"},
    "trustpilot": {"url": "string or null", "rating": "number or null", "review_count": "integer or null"},
    "bbb": {"url": "string or null", "rating": "number or null", "review_count": "integer or null"},
    "angi": {"url": "string or null", "rating": "number or null", "review_count": "integer or null"},
    "nextdoor": {"url": "string or null", "rating": "number or null", "review_count": "integer or null"},
    "other": [{"label": "string — directory/platform name", "url": "string — full URL"}]
  }
}

IMPORTANT REMINDERS:
- The business is located in **${prospect.city || 'unknown'}, ${prospect.state || 'CA'}** — do NOT confuse with businesses in other locations
- Only report facts you verified through search. Use null for things you couldn't find.
- If you find conflicting information, note it in the executive_summary`,
      }],
    })

    // Server-side tools (web_search, web_fetch) are executed by the API itself.
    // The response contains search results inline + text output.
    // Extract all text blocks from the response.
    const allText = msg.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')

    if (!allText) {
      return NextResponse.json({ error: 'No text response from research' }, { status: 500 })
    }

    // Parse Claude's research — find JSON in the response
    let research: Record<string, any>
    try {
      // Try to extract JSON from the response (may be wrapped in markdown code blocks or explanation text)
      const jsonMatch = allText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found in response')
      const cleaned = jsonMatch[0]
        .replace(/```json?\n?/g, '')
        .replace(/```/g, '')
        .trim()
      research = JSON.parse(cleaned)
    } catch (e) {
      return NextResponse.json({
        error: 'Failed to parse research response',
        raw: allText.slice(0, 500),
      }, { status: 500 })
    }

    // Build updated research_data by merging with existing
    const rd: Record<string, any> = { ...existingData }
    rd.reviews = research.reviews || rd.reviews || {}
    rd.website = { ...(rd.website || {}), ...(research.website || {}) }
    rd.social = { ...(rd.social || {}), ...(research.social || {}) }
    rd.business_details = research.business_details || rd.business_details || {}
    rd.competitors = research.competitors || rd.competitors || []
    rd.opportunities = research.opportunities || rd.opportunities || []
    rd.vulnerabilities = research.vulnerabilities || rd.vulnerabilities || []
    rd.pitch_angle = research.pitch_angle || rd.pitch_angle
    rd.deal_estimate = research.deal_estimate || rd.deal_estimate
    rd.urgency = research.urgency || rd.urgency || 'medium'
    rd.executive_summary = research.executive_summary || rd.executive_summary
    rd.risk_factors = research.risk_factors || rd.risk_factors || []
    rd.recommended_approach = research.recommended_approach || rd.recommended_approach
    rd.enriched = true
    rd.enriched_at = new Date().toISOString()
    rd.deep_dive_at = new Date().toISOString()
    rd.deep_dive_by = auth.admin.id

    // Parse channels from research response (admin edits win; Claude fills what's missing)
    const now = new Date().toISOString()
    let channelsUpdate: Record<string, any> | undefined
    if (research.channels && typeof research.channels === 'object') {
      try {
        const existingChannels: Record<string, any> = (prospect as any).channels || {}
        const newChannels: Record<string, any> = { ...existingChannels }

        const simpleKeys = ['website', 'linkedin', 'tiktok', 'youtube', 'instagram', 'twitter_x', 'pinterest']
        const reviewKeys = ['google_business', 'yelp', 'facebook', 'trustpilot', 'bbb', 'angi', 'nextdoor']

        // Simple channels: only fill when admin hasn't set a value
        for (const key of simpleKeys) {
          const claudeVal = normalizeSimpleChannel(research.channels[key])
          if (claudeVal && !existingChannels[key]) {
            newChannels[key] = claudeVal
          }
        }

        // Review channels: merge per-field; admin-set fields win, Claude fills nulls
        for (const key of reviewKeys) {
          if (!isReviewChannel(key)) continue
          const claudeRaw = research.channels[key]
          if (!claudeRaw) continue // Claude found nothing — don't touch admin's entry

          const claudeEntry = normalizeReviewChannel(claudeRaw)
          const existingEntry = existingChannels[key]
            ? normalizeReviewChannel(existingChannels[key])
            : { url: null, rating: null, review_count: null, last_synced_at: null }

          // Admin value wins per field, Claude fills nulls
          const mergedEntry = {
            url: existingEntry.url ?? claudeEntry.url,
            rating: existingEntry.rating !== null ? existingEntry.rating : claudeEntry.rating,
            review_count: existingEntry.review_count !== null ? existingEntry.review_count : claudeEntry.review_count,
            last_synced_at: now,
          }

          // Only write if Claude brought something new
          const hasNewData = claudeEntry.url || claudeEntry.rating !== null || claudeEntry.review_count !== null
          if (hasNewData) {
            newChannels[key] = mergedEntry
          }
        }

        // Merge other[] — append new entries not already present
        const existingOther: Array<{ label: string; url: string }> = existingChannels.other || []
        const newOther: Array<{ label: string; url: string }> = research.channels.other || []
        const existingUrls = new Set(existingOther.map((o: any) => o.url))
        const mergedOther = [...existingOther, ...newOther.filter((o: any) => o?.url && !existingUrls.has(o.url))]
        if (mergedOther.length > 0) newChannels.other = mergedOther

        channelsUpdate = newChannels
      } catch {
        // channels parse failed — skip, don't break research flow
      }
    }

    // Build prospect updates
    const updates: Record<string, any> = {
      research_data: rd,
      ...(channelsUpdate ? { channels: channelsUpdate } : {}),
      updated_at: new Date().toISOString(),
    }

    // Fill in missing contact fields from research
    if (research.owner_name && !prospect.owner_name) updates.owner_name = research.owner_name
    if (research.owner_email && !prospect.owner_email) updates.owner_email = research.owner_email
    if (research.owner_phone && !prospect.owner_phone) updates.owner_phone = research.owner_phone
    if (research.business_phone && !prospect.business_phone) updates.business_phone = research.business_phone
    if (research.business_email && !prospect.business_email) updates.business_email = research.business_email

    // Update ratings if research has them and current are missing
    if (research.reviews?.google?.rating && !prospect.google_rating) {
      updates.google_rating = research.reviews.google.rating
      updates.google_review_count = research.reviews.google.count || 0
    }
    if (research.reviews?.yelp?.rating && !prospect.yelp_rating) {
      updates.yelp_rating = research.reviews.yelp.rating
      updates.yelp_review_count = research.reviews.yelp.count || 0
    }

    // Update site quality score
    if (research.site_quality_score != null) {
      updates.site_quality_score = research.site_quality_score
    }

    // Update prospect
    const { error: updateError } = await supabaseAdmin
      .from('prospects')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Re-score with full data
    const fullProspect = { ...prospect, ...updates, research_data: rd }
    const { score, tier, factors } = calculateProspectScore({
      google_rating: fullProspect.google_rating,
      google_review_count: fullProspect.google_review_count,
      yelp_rating: fullProspect.yelp_rating,
      yelp_review_count: fullProspect.yelp_review_count,
      site_quality_score: fullProspect.site_quality_score,
      industry: fullProspect.industry,
      city: fullProspect.city,
      stage: fullProspect.stage,
      tags: fullProspect.tags,
      research_data: rd,
      owner_name: fullProspect.owner_name,
      business_email: fullProspect.business_email,
      business_phone: fullProspect.business_phone,
      notes: fullProspect.notes,
    })

    await supabaseAdmin
      .from('prospects')
      .update({
        prospect_score: score,
        score_factors: factors,
        auto_demo_eligible: score >= 70,
      })
      .eq('id', id)

    // Log comprehensive activity
    const fieldsFilled = Object.keys(updates).filter(k => k !== 'research_data' && k !== 'updated_at').length
    const reviewPlatforms = Object.keys(rd.reviews || {}).length
    const socialChannels = Object.values(rd.social || {}).filter(v => v === true).length
    const opportunityCount = (rd.opportunities || []).length

    await logAgentActivity(
      'deep-dive',
      id,
      `Deep dive research completed — Score: ${score} (${tier})`,
      [
        `Research by: ${auth.admin.id}`,
        `Fields populated: ${fieldsFilled}`,
        `Review platforms: ${reviewPlatforms}`,
        `Social channels active: ${socialChannels}`,
        `Opportunities identified: ${opportunityCount}`,
        `Site quality: ${updates.site_quality_score ?? prospect.site_quality_score ?? 'N/A'}/100`,
        `Urgency: ${rd.urgency}`,
        rd.pitch_angle ? `Pitch: ${rd.pitch_angle}` : null,
        rd.deal_estimate ? `Deal estimate: ${rd.deal_estimate}` : null,
        rd.executive_summary ? `Summary: ${rd.executive_summary}` : null,
      ].filter(Boolean).join('\n'),
    )

    return NextResponse.json({
      ok: true,
      score,
      tier,
      factors,
      fields_updated: fieldsFilled,
      opportunities: rd.opportunities,
      pitch_angle: rd.pitch_angle,
      deal_estimate: rd.deal_estimate,
      urgency: rd.urgency,
      executive_summary: rd.executive_summary,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Research failed'
    console.error('[research] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
