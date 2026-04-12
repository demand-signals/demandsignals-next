// ─── Demand Signals Intelligence Engine v2 ───
// 5-signal composite scoring with diamond classification

type ScoreInput = {
  google_rating?: number | null
  google_review_count?: number | null
  yelp_rating?: number | null
  yelp_review_count?: number | null
  site_quality_score?: number | null
  industry?: string | null
  city?: string | null
  stage?: string | null
  tags?: string[] | null
  research_data?: Record<string, any> | null
  owner_name?: string | null
  business_email?: string | null
  business_phone?: string | null
  notes?: string | null
}

// Diamond classification tiers
export type ProspectTier = 'diamond' | 'gold' | 'silver' | 'bronze'

export const TIER_LABELS: Record<ProspectTier, string> = {
  diamond: 'Diamond',
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
}

const INDUSTRY_VALUES: Record<string, number> = {
  dental: 90, medical: 90, medspa: 85,
  legal: 85,
  chiropractic: 75, hvac: 75, plumbing: 75,
  restaurant: 70, financial: 70,
  firearms: 65, veterinary: 65,
  auto: 60,
  fitness: 55, contractor: 55,
  retail: 40, other: 30,
}

// Platforms ranked by weakness (higher = worse for them = better for us)
const PLATFORM_WEAKNESS: Record<string, number> = {
  none: 100,         // no website at all
  godaddy: 85,       // template sites
  weebly: 80,        // end of life
  'clickfunnels': 75, // landing page tool
  prosites: 70,      // dental template
  petsites: 70,      // vet template
  imagepro: 70,      // real estate template
  demandforce: 65,   // dated template
  wix: 55,           // ok but limited
  squarespace: 40,   // decent
  wordpress: 30,     // flexible
  custom: 15,        // likely has dev team
}

// Premium zip codes (El Dorado Hills, Folsom, etc.)
const PREMIUM_ZIPS = new Set([
  '95762', // El Dorado Hills
  '95630', // Folsom
])

// ─── Signal 1: Review Authority (0-100) ───
// Cross-platform review presence and strength
function calcReviewAuthority(p: ScoreInput): { score: number; detail: Record<string, any> } {
  const rd = p.research_data || {}
  const reviews = rd.reviews || {}

  // Gather all review sources
  let totalCount = 0
  let weightedRatingSum = 0
  let totalWeight = 0
  let platformCount = 0

  const addReviewSource = (rating: number | null | undefined, count: number | null | undefined) => {
    const c = count || 0
    totalCount += c
    if (rating && c > 0) {
      weightedRatingSum += rating * c
      totalWeight += c
    }
    if (c > 0) platformCount++
  }

  // Google
  const gRating = reviews.google?.rating ?? p.google_rating
  const gCount = reviews.google?.count ?? p.google_review_count ?? 0
  addReviewSource(gRating, gCount)

  // Yelp
  const yRating = reviews.yelp?.rating ?? p.yelp_rating
  const yCount = reviews.yelp?.count ?? p.yelp_review_count ?? 0
  addReviewSource(yRating, yCount)

  // Other platforms from research (handles both object and array formats)
  for (const [key, val] of Object.entries(reviews)) {
    if (key === 'google' || key === 'yelp' || !val || typeof val !== 'object') continue
    if (Array.isArray(val)) {
      // reviews.other: [{platform: "Birdeye", rating: 4.9, count: 171}, ...]
      for (const entry of val) {
        if (entry && typeof entry === 'object') {
          addReviewSource(entry.rating, entry.count)
        }
      }
    } else {
      const rv = val as Record<string, any>
      addReviewSource(rv.rating, rv.count)
    }
  }

  const avgRating = totalWeight > 0 ? weightedRatingSum / totalWeight : 0

  // Score: volume matters, rating matters, diversity matters
  // Logarithmic curve: 50 reviews=20, 100=28, 200=33, 500=40
  const volumeScore = totalCount > 0 ? Math.min(40, Math.round(8 * Math.log2(totalCount))) : 0
  const ratingScore = avgRating * 8 // max 40 for 5.0
  const diversityBonus = Math.min(20, platformCount * 5) // up to 4 platforms

  const score = Math.min(100, Math.round(volumeScore + ratingScore + diversityBonus))

  return {
    score,
    detail: {
      total_reviews: totalCount,
      avg_rating: Math.round(avgRating * 10) / 10,
      platforms: platformCount,
      google_rating: gRating ?? null,
      google_count: gCount,
      yelp_rating: yRating ?? null,
      yelp_count: yCount,
    },
  }
}

// ─── Signal 2: Digital Vulnerability (0-100) ───
// How broken/weak their online presence is. HIGHER = more opportunity for us
function calcDigitalVulnerability(p: ScoreInput): { score: number; detail: Record<string, any> } {
  const rd = p.research_data || {}
  const website = rd.website || {}
  const social = rd.social || {}
  const notes = (p.notes || '').toLowerCase()

  // Platform weakness (0-100)
  let platformName = website.platform || null
  if (platformName) platformName = platformName.toLowerCase().split(' ')[0] // "PatientConnect365 (dental template)" → "patientconnect365"
  const platformScore = PLATFORM_WEAKNESS[platformName as string] ?? 50

  // Issue severity scoring (structured data + notes)
  const issues: string[] = website.issues || rd.opportunities || []
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
    if (social.google_business === false) missingChannels += 2 // no GMB is critical
  } else {
    // No social data collected — assume all channels missing
    missingChannels = 3
  }
  const channelScore = missingChannels * 10

  let score = Math.min(100, Math.round(
    platformScore * 0.30 +
    Math.min(80, issueScore) * 0.35 +
    channelScore * 0.35
  ))

  // Research completeness floor: sparse data = unknown vulnerabilities
  const hasWebsiteData = !!website.platform
  const hasReviews = !!(rd.reviews && Object.keys(rd.reviews).length > 0)
  const researchDimensions = [hasWebsiteData, hasSocialData, hasReviews].filter(Boolean).length
  if (researchDimensions <= 1) score = Math.max(score, 35)

  // Critical override: broken SSL = customers literally can't reach the site
  const sslBroken = website.ssl_valid === false ||
    issueStr.includes('broken_ssl') ||
    notes.includes('broken ssl') ||
    notes.includes('ssl broken')
  if (sslBroken) score = Math.max(score, 70)

  return {
    score,
    detail: {
      platform: platformName,
      platform_weakness: platformScore,
      issue_count: issues.length,
      missing_channels: missingChannels,
      ssl_broken: sslBroken,
    },
  }
}

// ─── Signal 3: Industry & Market Value (0-100) ───
function calcIndustryValue(p: ScoreInput): { score: number; detail: Record<string, any> } {
  const base = INDUSTRY_VALUES[p.industry || 'other'] || 30

  // Geographic premium
  const rd = p.research_data || {}
  let geoPremium = 0
  const city = (p.city || rd.city || '').toLowerCase()
  if (city === 'el dorado hills' || city === 'folsom') geoPremium = 10
  else if (city === 'cameron park' || city === 'shingle springs') geoPremium = 5

  const score = Math.min(100, base + geoPremium)
  return { score, detail: { industry: p.industry, base_value: base, geo_premium: geoPremium } }
}

// ─── Signal 4: Close Probability (0-100) ───
// Signals that predict likelihood of closing the deal
function calcCloseProbability(p: ScoreInput): { score: number; detail: Record<string, any> } {
  const tags = p.tags || []
  const rd = p.research_data || {}
  const notes = (p.notes || '').toLowerCase()

  let score = 20 // baseline

  // Demo built = massive signal (+25)
  if (p.stage === 'demo_built') score += 25

  // Whale tag (+20, was +15)
  if (tags.includes('whale')) score += 20
  // Whale + demo = hot lead
  if (tags.includes('whale') && p.stage === 'demo_built') score += 5
  // Group deal (Platt Group etc.) = higher close likelihood
  if (tags.includes('platt-group')) score += 10
  // Top-10 tag (+10)
  if (tags.includes('top-10')) score += 10

  // Contact info completeness
  if (p.owner_name) score += 5
  if (p.business_email || p.business_phone) score += 5
  if (p.business_email && p.business_phone) score += 5 // both = bonus

  // Urgency signals
  if (rd.urgency === 'high' || tags.includes('urgent')) score += 10
  if (notes.includes('time sensitive') || notes.includes('time-sensitive')) score += 10
  if (notes.includes('broken ssl') || notes.includes('ssl broken')) score += 5
  if (notes.includes('ownership change') || notes.includes('replaced') || notes.includes('new ownership')) score += 5

  // Won stage is 100
  if (p.stage === 'won') score = 100

  const signals: string[] = []
  if (p.stage === 'demo_built') signals.push('demo_built')
  if (tags.includes('whale')) signals.push('whale')
  if (tags.includes('top-10')) signals.push('top_10')
  if (rd.urgency === 'high' || tags.includes('urgent')) signals.push('urgency')
  if (p.owner_name && (p.business_email || p.business_phone)) signals.push('contact_complete')

  return {
    score: Math.min(100, score),
    detail: { signals, contact_completeness: [p.owner_name, p.business_email, p.business_phone].filter(Boolean).length },
  }
}

// ─── Signal 5: Revenue Potential (0-100) ───
function calcRevenuePotential(p: ScoreInput): { score: number; detail: Record<string, any> } {
  const rd = p.research_data || {}
  const notes = (p.notes || '').toLowerCase()
  const tags = p.tags || []

  let score = 30 // baseline

  // Opportunity count — more problems = bigger deal
  const opps: string[] = rd.opportunities || []
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

  // Deal estimate from research_data or notes (e.g., "$8K-$15K", "deal value: $5,000")
  const dealStr = (rd.deal_estimate || '') + ' ' + notes
  const dealMatch = dealStr.match(/\$([\d,]+)\s*[kK]?\s*[-–]\s*\$([\d,]+)\s*[kK]/i) || dealStr.match(/deal value:\s*\$?([\d,]+)/i) || dealStr.match(/\$([\d,]+)\s*[kK]/i)
  if (dealMatch) {
    // Use the highest number found (for ranges like $8K-$15K, use 15)
    const nums = dealStr.match(/\$(\d[\d,]*)\s*[kK]?/g)?.map(m => {
      const n = parseInt(m.replace(/[$,kK]/g, ''), 10)
      return m.toLowerCase().includes('k') ? n : (n >= 100 ? n / 1000 : n)
    }) || []
    const maxVal = Math.max(...nums, 0)
    if (maxVal >= 15) score += 25  // $15K+
    else if (maxVal >= 8) score += 15
    else if (maxVal >= 3) score += 8
  }

  // Multi-location / group deal
  if (tags.includes('platt-group') || notes.includes('group deal') || notes.includes('multiple location')) score += 15

  // Business maturity
  const estMatch = notes.match(/(\d+)\+?\s*years/i) || notes.match(/since\s*(19|20)\d{2}/i)
  if (estMatch) score += 5

  // Whale tag implies high-value
  if (tags.includes('whale')) score += 10
  // Whales without explicit deal estimates still have high potential
  if (tags.includes('whale') && !dealMatch) score += 15

  return {
    score: Math.min(100, score),
    detail: {
      opportunity_count: opps.length,
      has_deal_estimate: !!dealMatch,
    },
  }
}

// ─── COMPOSITE SCORE ───
export function calculateProspectScore(prospect: ScoreInput): {
  score: number
  tier: ProspectTier
  factors: Record<string, any>
} {
  const review = calcReviewAuthority(prospect)
  const vulnerability = calcDigitalVulnerability(prospect)
  const industry = calcIndustryValue(prospect)
  const close = calcCloseProbability(prospect)
  const revenue = calcRevenuePotential(prospect)

  // Weighted composite
  const composite = Math.round(
    review.score * 0.15 +          // established businesses worth pursuing
    vulnerability.score * 0.30 +    // biggest weight — the GAP is the opportunity
    industry.score * 0.15 +         // industry dictates deal size
    close.score * 0.25 +            // close probability = ROI on effort
    revenue.score * 0.15            // deal size potential
  )

  const score = Math.min(100, Math.max(0, composite))

  // Diamond classification
  let tier: ProspectTier
  if (score >= 75 && close.score >= 60) tier = 'diamond'
  else if (score >= 60) tier = 'gold'
  else if (score >= 40) tier = 'silver'
  else tier = 'bronze'

  return {
    score,
    tier,
    factors: {
      review_authority: review.score,
      digital_vulnerability: vulnerability.score,
      industry_value: industry.score,
      close_probability: close.score,
      revenue_potential: revenue.score,
      tier,
      // Detailed breakdowns
      review_detail: review.detail,
      vulnerability_detail: vulnerability.detail,
      close_signals: close.detail.signals,
      opportunity_count: revenue.detail.opportunity_count,
      // Legacy fields for backwards compat
      review_signal: review.score,
      site_gap: vulnerability.score,
      google_rating: prospect.google_rating || 0,
      google_review_count: prospect.google_review_count || 0,
      site_quality_score: prospect.site_quality_score ?? 50,
    },
  }
}

// Get pitch angle from research data
export function getPitchAngle(prospect: ScoreInput): string | null {
  return prospect.research_data?.pitch_angle || null
}

// Get top opportunities from research data
export function getOpportunities(prospect: ScoreInput): string[] {
  return prospect.research_data?.opportunities || []
}
