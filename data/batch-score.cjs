// Batch-score all prospects using the 5-signal intelligence engine v2.1
// Run: node data/batch-score.cjs

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) {
    let val = match[2].trim()
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    env[match[1].trim()] = val
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// === SCORING ENGINE v2.1 (mirrors src/lib/scoring.ts) ===

const INDUSTRY_VALUES = {
  dental: 90, medical: 90, medspa: 85, legal: 85,
  chiropractic: 75, hvac: 75, plumbing: 75,
  restaurant: 70, financial: 70, firearms: 65, veterinary: 65,
  auto: 60, fitness: 55, contractor: 55, retail: 40, other: 30,
}

const PLATFORM_WEAKNESS = {
  none: 100, godaddy: 85, weebly: 80, clickfunnels: 75,
  prosites: 70, petsites: 70, imagepro: 70, demandforce: 65,
  wix: 55, squarespace: 40, wordpress: 30, custom: 15,
}

function calcReviewAuthority(p) {
  const rd = p.research_data || {}
  const reviews = rd.reviews || {}
  let totalCount = 0, weightedRatingSum = 0, totalWeight = 0, platformCount = 0
  const add = (rating, count) => {
    const c = count || 0
    totalCount += c
    if (rating && c > 0) { weightedRatingSum += rating * c; totalWeight += c }
    if (c > 0) platformCount++
  }
  const gRating = reviews.google?.rating ?? p.google_rating
  const gCount = reviews.google?.count ?? p.google_review_count ?? 0
  add(gRating, gCount)
  const yRating = reviews.yelp?.rating ?? p.yelp_rating
  const yCount = reviews.yelp?.count ?? p.yelp_review_count ?? 0
  add(yRating, yCount)
  // Other platforms (handles both object and array formats)
  for (const [key, val] of Object.entries(reviews)) {
    if (key === 'google' || key === 'yelp' || !val || typeof val !== 'object') continue
    if (Array.isArray(val)) {
      for (const entry of val) {
        if (entry && typeof entry === 'object') add(entry.rating, entry.count)
      }
    } else {
      add(val.rating, val.count)
    }
  }
  const avgRating = totalWeight > 0 ? weightedRatingSum / totalWeight : 0
  // Logarithmic volume: 50 reviews=20, 100=28, 200=33, 500=40
  const volumeScore = totalCount > 0 ? Math.min(40, Math.round(8 * Math.log2(totalCount))) : 0
  const ratingScore = avgRating * 8
  const diversityBonus = Math.min(20, platformCount * 5)
  const score = Math.min(100, Math.round(volumeScore + ratingScore + diversityBonus))
  return { score, detail: { total_reviews: totalCount, avg_rating: Math.round(avgRating * 10) / 10, platforms: platformCount, google_rating: gRating ?? null, google_count: gCount, yelp_rating: yRating ?? null, yelp_count: yCount } }
}

function calcDigitalVulnerability(p) {
  const rd = p.research_data || {}
  const website = rd.website || {}
  const social = rd.social || {}
  const notes = (p.notes || '').toLowerCase()
  let platformName = website.platform || null
  if (platformName) platformName = platformName.toLowerCase().split(' ')[0]
  const platformScore = PLATFORM_WEAKNESS[platformName] ?? 50
  const issues = website.issues || rd.opportunities || []
  const issueStr = issues.join(' ').toLowerCase()
  let issueScore = 0
  // Critical issues (from structured data)
  if (issueStr.includes('broken_ssl') || issueStr.includes('ssl') || issueStr.includes('no_website') || issueStr.includes('no website')) issueScore += 30
  if (issueStr.includes('broken_contact') || issueStr.includes('contact form')) issueScore += 20
  // Moderate issues (from structured data)
  if (issueStr.includes('dated') || issueStr.includes('template') || issueStr.includes('placeholder') || issueStr.includes('stock')) issueScore += 15
  if (issueStr.includes('no_mobile') || issueStr.includes('not mobile') || issueStr.includes('no_seo')) issueScore += 10
  if (issueStr.includes('unprofessional') || issueStr.includes('gmail') || issueStr.includes('comcast') || issueStr.includes('yahoo')) issueScore += 8
  // Notes-based issue detection (catches signals that research_data missed)
  if (notes.includes('broken ssl') || notes.includes('ssl broken')) issueScore += 25
  if (notes.includes('no website') || notes.includes('no site')) issueScore += 25
  if (notes.includes('zero blog') || notes.includes('no blog') || notes.includes('no content')) issueScore += 15
  if (notes.includes('no social') || notes.includes('no instagram') || notes.includes('no facebook')) issueScore += 10
  if (notes.includes('no gmb') || notes.includes('no google business')) issueScore += 15
  if ((notes.includes('no local seo') || notes.includes('no seo') || notes.includes('zero seo')) && !issueStr.includes('no_seo')) issueScore += 10
  if ((notes.includes('dated') || notes.includes('outdated') || notes.includes('basic template')) && !issueStr.includes('dated')) issueScore += 10
  // Missing channels — when social data was never researched, assume worst case
  const hasSocialData = social.facebook !== undefined || social.instagram !== undefined || social.google_business !== undefined
  let missingChannels = 0
  if (hasSocialData) {
    if (!social.facebook && social.facebook !== true) missingChannels++
    if (!social.instagram && social.instagram !== true) missingChannels++
    if (social.google_business === false) missingChannels += 2
  } else {
    missingChannels = 3 // No social data collected — assume all channels missing
  }
  const channelScore = missingChannels * 10
  let score = Math.min(100, Math.round(platformScore * 0.30 + Math.min(80, issueScore) * 0.35 + channelScore * 0.35))
  // Research completeness floor: sparse data = unknown vulnerabilities
  const hasWebsiteData = !!website.platform
  const hasReviews = !!(rd.reviews && Object.keys(rd.reviews).length > 0)
  const researchDimensions = [hasWebsiteData, hasSocialData, hasReviews].filter(Boolean).length
  if (researchDimensions <= 1) score = Math.max(score, 35)
  // Critical override: broken SSL = customers can't reach the site
  const sslBroken = website.ssl_valid === false || issueStr.includes('broken_ssl') || notes.includes('broken ssl') || notes.includes('ssl broken')
  if (sslBroken) score = Math.max(score, 70)
  return { score, detail: { platform: platformName, platform_weakness: platformScore, issue_count: issues.length, missing_channels: missingChannels, ssl_broken: sslBroken } }
}

function calcIndustryValue(p) {
  const base = INDUSTRY_VALUES[p.industry || 'other'] || 30
  const rd = p.research_data || {}
  let geoPremium = 0
  const city = (p.city || rd.city || '').toLowerCase()
  if (city === 'el dorado hills' || city === 'folsom') geoPremium = 10
  else if (city === 'cameron park' || city === 'shingle springs') geoPremium = 5
  return { score: Math.min(100, base + geoPremium), detail: { industry: p.industry, base_value: base, geo_premium: geoPremium } }
}

function calcCloseProbability(p) {
  const tags = p.tags || []
  const rd = p.research_data || {}
  const notes = (p.notes || '').toLowerCase()
  let score = 20
  if (p.stage === 'demo_built') score += 25
  if (tags.includes('whale')) score += 20
  if (tags.includes('whale') && p.stage === 'demo_built') score += 5
  if (tags.includes('platt-group')) score += 10
  if (tags.includes('top-10')) score += 10
  if (p.owner_name) score += 5
  if (p.business_email || p.business_phone) score += 5
  if (p.business_email && p.business_phone) score += 5
  if (rd.urgency === 'high' || tags.includes('urgent')) score += 10
  if (notes.includes('time sensitive') || notes.includes('time-sensitive')) score += 10
  if (notes.includes('broken ssl') || notes.includes('ssl broken')) score += 5
  if (notes.includes('ownership change') || notes.includes('replaced') || notes.includes('new ownership')) score += 5
  if (p.stage === 'won') score = 100
  const signals = []
  if (p.stage === 'demo_built') signals.push('demo_built')
  if (tags.includes('whale')) signals.push('whale')
  if (tags.includes('top-10')) signals.push('top_10')
  if (rd.urgency === 'high' || tags.includes('urgent')) signals.push('urgency')
  if (p.owner_name && (p.business_email || p.business_phone)) signals.push('contact_complete')
  return { score: Math.min(100, score), detail: { signals, contact_completeness: [p.owner_name, p.business_email, p.business_phone].filter(Boolean).length } }
}

function calcRevenuePotential(p) {
  const rd = p.research_data || {}
  const notes = (p.notes || '').toLowerCase()
  const tags = p.tags || []
  let score = 30
  const opps = rd.opportunities || []
  // Infer additional opportunities from notes text
  let inferredCount = opps.length
  if ((notes.includes('zero blog') || notes.includes('no blog') || notes.includes('no content')) && !opps.includes('content_marketing')) inferredCount++
  if ((notes.includes('no social') || notes.includes('no instagram') || notes.includes('no facebook')) && !opps.includes('social_media')) inferredCount++
  if ((notes.includes('no local seo') || notes.includes('no seo') || notes.includes('zero seo')) && !opps.includes('local_seo')) inferredCount++
  if ((notes.includes('no gmb') || notes.includes('no google business')) && !opps.includes('gmb_optimization')) inferredCount++
  // Multiple services listed = complex site opportunity
  const serviceKeywords = notes.match(/\b(grading|excavat|driveway|pond|septic|retaining|remodel|deck|fence|roof|plumb|hvac|electrical|paint|floor|landscape|hardscape|demolit|concrete|foundation|framing|paving|pool|spa|kitchen|bathroom|solar|gutter|siding|window|door|carpet|tile|counter|cabinet)\w*/gi) || []
  if (serviceKeywords.length >= 3 && !opps.includes('website_redesign')) inferredCount++
  if (serviceKeywords.length >= 5) inferredCount++
  score += Math.min(25, Math.max(inferredCount, opps.length) * 5)
  // Deal estimate from research_data or notes
  const dealStr = (rd.deal_estimate || '') + ' ' + notes
  const dealMatch = dealStr.match(/\$([\d,]+)\s*[kK]?\s*[-\u2013]\s*\$([\d,]+)\s*[kK]/i) || dealStr.match(/deal value:\s*\$?([\d,]+)/i) || dealStr.match(/\$([\d,]+)\s*[kK]/i)
  if (dealMatch) {
    const nums = dealStr.match(/\$(\d[\d,]*)\s*[kK]?/g)?.map(m => {
      const n = parseInt(m.replace(/[$,kK]/g, ''), 10)
      return m.toLowerCase().includes('k') ? n : (n >= 100 ? n / 1000 : n)
    }) || []
    const maxVal = Math.max(...nums, 0)
    if (maxVal >= 15) score += 25
    else if (maxVal >= 8) score += 15
    else if (maxVal >= 3) score += 8
  }
  if (tags.includes('platt-group') || notes.includes('group deal') || notes.includes('multiple location')) score += 15
  const estMatch = notes.match(/(\d+)\+?\s*years/i) || notes.match(/since\s*(19|20)\d{2}/i)
  if (estMatch) score += 5
  if (tags.includes('whale')) score += 10
  if (tags.includes('whale') && !dealMatch) score += 15
  return { score: Math.min(100, score), detail: { opportunity_count: opps.length, has_deal_estimate: !!dealMatch } }
}

function calculateProspectScore(p) {
  const review = calcReviewAuthority(p)
  const vulnerability = calcDigitalVulnerability(p)
  const industry = calcIndustryValue(p)
  const close = calcCloseProbability(p)
  const revenue = calcRevenuePotential(p)
  const composite = Math.round(
    review.score * 0.15 + vulnerability.score * 0.30 + industry.score * 0.15 +
    close.score * 0.25 + revenue.score * 0.15
  )
  const score = Math.min(100, Math.max(0, composite))
  let tier
  if (score >= 75 && close.score >= 60) tier = 'diamond'
  else if (score >= 60) tier = 'gold'
  else if (score >= 40) tier = 'silver'
  else tier = 'bronze'
  return {
    score, tier,
    factors: {
      review_authority: review.score, digital_vulnerability: vulnerability.score,
      industry_value: industry.score, close_probability: close.score, revenue_potential: revenue.score,
      tier,
      review_detail: review.detail, vulnerability_detail: vulnerability.detail,
      close_signals: close.detail.signals, opportunity_count: revenue.detail.opportunity_count,
      review_signal: review.score, site_gap: vulnerability.score,
      google_rating: p.google_rating || 0, google_review_count: p.google_review_count || 0,
      site_quality_score: p.site_quality_score ?? 50,
    },
  }
}

// === MAIN ===

async function main() {
  console.log('Fetching all prospects...')
  const { data: prospects, error } = await supabase.from('prospects').select('*')
  if (error) { console.error('Failed:', error.message); process.exit(1) }
  console.log(`Found ${prospects.length} prospects to score\n`)

  const tierCounts = {}
  let scored = 0, errors = 0
  const diamonds = []
  const golds = []

  for (const p of prospects) {
    const { score, tier, factors } = calculateProspectScore(p)
    const { error: ue } = await supabase.from('prospects')
      .update({ prospect_score: score, score_factors: factors, auto_demo_eligible: score >= 70 })
      .eq('id', p.id)
    if (ue) {
      console.error(`  ERROR ${p.business_name}: ${ue.message}`)
      errors++
    } else {
      scored++
      tierCounts[tier] = (tierCounts[tier] || 0) + 1
      if (tier === 'diamond') diamonds.push({ name: p.business_name, score, close: factors.close_probability, rev: factors.revenue_potential, industry: p.industry, city: p.city })
      else if (tier === 'gold') golds.push({ name: p.business_name, score, industry: p.industry, city: p.city })
    }
  }

  console.log('=== INTELLIGENCE ENGINE v2.1 — SCORING COMPLETE ===')
  console.log(`Scored: ${scored}  |  Errors: ${errors}`)
  console.log('\nTier Distribution:')
  for (const t of ['diamond', 'gold', 'silver', 'bronze']) {
    const c = tierCounts[t] || 0
    const bar = '\u2588'.repeat(Math.ceil(c / 2))
    console.log(`  ${t.toUpperCase().padEnd(8)} ${String(c).padStart(3)} ${bar}`)
  }

  if (diamonds.length > 0) {
    console.log(`\n\u2666 DIAMOND PROSPECTS — pitch these FIRST (${diamonds.length}):`)
    diamonds.sort((a, b) => b.score - a.score)
    for (const d of diamonds) {
      console.log(`  ${d.score}/100  ${d.name} [${d.industry}] ${d.city || ''} (close: ${d.close}, rev: ${d.rev})`)
    }
  }

  if (golds.length > 0) {
    console.log(`\n\u2605 GOLD PROSPECTS — strong candidates (${golds.length}):`)
    golds.sort((a, b) => b.score - a.score)
    for (const d of golds.slice(0, 20)) {
      console.log(`  ${d.score}/100  ${d.name} [${d.industry}] ${d.city || ''}`)
    }
    if (golds.length > 20) console.log(`  ... and ${golds.length - 20} more`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
