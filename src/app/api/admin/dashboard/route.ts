import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  // Parallel queries
  const [prospectsRes, demosRes, dealsRes] = await Promise.all([
    supabaseAdmin
      .from('prospects')
      .select('id, business_name, owner_name, owner_email, owner_phone, business_email, business_phone, website_url, industry, city, stage, prospect_score, score_factors, research_data, tags, last_activity_at, updated_at, site_quality_score')
      .order('prospect_score', { ascending: false }),
    supabaseAdmin
      .from('demos')
      .select('id, prospect_id, demo_url, status'),
    supabaseAdmin
      .from('deals')
      .select('id, prospect_id, value_estimate, stage'),
  ])

  const prospects = prospectsRes.data ?? []
  const demos = demosRes.data ?? []
  const deals = dealsRes.data ?? []

  // Stage counts
  const stageCounts: Record<string, number> = {}
  const tierCounts: Record<string, number> = {}
  for (const p of prospects) {
    stageCounts[p.stage] = (stageCounts[p.stage] || 0) + 1
    const tier = p.score_factors?.tier || 'bronze'
    tierCounts[tier] = (tierCounts[tier] || 0) + 1
  }

  // Priority queue — top 10 non-won/lost by score
  const priority = prospects
    .filter(p => p.stage !== 'won' && p.stage !== 'lost')
    .slice(0, 10)
    .map(p => ({
      ...p,
      demos: demos.filter(d => d.prospect_id === p.id),
      deals: deals.filter(d => d.prospect_id === p.id),
    }))

  // Whale prospects — ALL prospects tagged 'whale'
  const whales = prospects
    .filter(p => p.tags?.includes('whale'))
    .map(p => ({
      ...p,
      demos: demos.filter(d => d.prospect_id === p.id),
      has_complete_research: !!(p.research_data?.reviews && p.research_data?.social && p.research_data?.pitch_angle),
    }))

  // Critical alerts
  const criticalAlerts: { type: string; prospect_id: string; business_name: string; detail: string; score: number }[] = []

  for (const p of prospects) {
    if (p.stage === 'won' || p.stage === 'lost') continue

    // Broken SSL
    if (p.research_data?.website?.ssl_valid === false || p.score_factors?.vulnerability_detail?.ssl_broken) {
      criticalAlerts.push({
        type: 'ssl_broken',
        prospect_id: p.id,
        business_name: p.business_name,
        detail: 'SSL certificate is broken — browsers block visitors',
        score: p.prospect_score,
      })
    }

    // Stale demo_built (7+ days no activity)
    if (p.stage === 'demo_built') {
      const lastTouch = p.last_activity_at || p.updated_at
      if (!lastTouch || lastTouch < sevenDaysAgo) {
        criticalAlerts.push({
          type: 'stale_demo',
          prospect_id: p.id,
          business_name: p.business_name,
          detail: 'Demo built but no outreach started',
          score: p.prospect_score,
        })
      }
    }
  }

  // Revenue estimates
  const wonRevenue = deals
    .filter(d => d.stage === 'won')
    .reduce((sum, d) => sum + (d.value_estimate || 0), 0)

  // Parse deal estimates from research_data for pipeline prospects
  let pipelineRevenue = 0
  let untappedRevenue = 0
  for (const p of prospects) {
    const estimate = p.research_data?.deal_estimate
    if (!estimate) continue
    const nums = String(estimate).match(/\$(\d[\d,]*)\s*[kK]?/g)
    if (!nums) continue
    const values = nums.map((m: string) => {
      const n = parseInt(m.replace(/[$,kK]/g, ''), 10)
      return m.toLowerCase().includes('k') ? n * 1000 : (n >= 100 ? n : n * 1000)
    })
    const avgVal = values.reduce((a: number, b: number) => a + b, 0) / values.length
    const closeProb = (p.score_factors?.close_probability || 20) / 100

    if (['outreach', 'engaged', 'meeting', 'proposal'].includes(p.stage)) {
      pipelineRevenue += avgVal * closeProb
    } else if (p.stage === 'demo_built' || p.stage === 'researched') {
      untappedRevenue += avgVal * closeProb * 0.5 // lower weight for not-yet-contacted
    }
  }

  // Demo count (real demos only)
  const realDemoCount = demos.filter(d =>
    d.demo_url?.includes('demandsignals.dev') || d.demo_url?.includes('demandsignals.us')
  ).length

  const pipelineStages = ['outreach', 'engaged', 'meeting', 'proposal']
  const inPipeline = prospects.filter(p => pipelineStages.includes(p.stage)).length

  return NextResponse.json({
    total: prospects.length,
    demoCount: realDemoCount,
    inPipeline,
    stageCounts,
    tierCounts,
    priority,
    whales,
    criticalAlerts: criticalAlerts.sort((a, b) => (b.score || 0) - (a.score || 0)),
    revenue: {
      won: wonRevenue,
      pipeline: Math.round(pipelineRevenue),
      untapped: Math.round(untappedRevenue),
    },
    dealTotal: deals.reduce((sum, d) => sum + (d.value_estimate || 0), 0),
  })
}
