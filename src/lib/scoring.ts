type ScoreInput = {
  google_rating?: number | null
  google_review_count?: number | null
  site_quality_score?: number | null
  industry?: string | null
  score_factors?: Record<string, any>
}

const INDUSTRY_VALUES: Record<string, number> = {
  dental: 90, medical: 90, medspa: 80,
  legal: 85,
  chiropractic: 75, hvac: 75, plumbing: 75,
  restaurant: 70,
  firearms: 65,
  auto: 60,
  fitness: 55, contractor: 55,
  financial: 70, veterinary: 60,
  retail: 40, other: 30,
}

export function calculateProspectScore(prospect: ScoreInput): {
  score: number
  factors: Record<string, any>
} {
  const rating = prospect.google_rating || 0
  const count = prospect.google_review_count || 0
  const reviewSignal = Math.min(100, count * 0.5 + rating * 10)

  const siteQuality = prospect.site_quality_score ?? 50
  const siteGap = 100 - siteQuality

  const industryValue = INDUSTRY_VALUES[prospect.industry || 'other'] || 30

  const score = Math.round(
    reviewSignal * 0.4 +
    siteGap * 0.4 +
    industryValue * 0.2
  )

  return {
    score: Math.min(100, Math.max(0, score)),
    factors: {
      review_signal: Math.round(reviewSignal),
      site_gap: Math.round(siteGap),
      industry_value: industryValue,
      google_rating: rating,
      google_review_count: count,
      site_quality_score: siteQuality,
      ...prospect.score_factors,
    },
  }
}
