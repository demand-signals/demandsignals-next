import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function tierEmoji(tier: string | undefined) {
  switch (tier) {
    case 'diamond': return '💎'
    case 'gold': return '🥇'
    case 'silver': return '🥈'
    case 'bronze': return '🥉'
    default: return '—'
  }
}

function stageLabel(stage: string) {
  const labels: Record<string, string> = {
    researched: 'Researched', demo_built: 'Demo Built', outreach: 'Outreach',
    engaged: 'Engaged', meeting: 'Meeting', proposal: 'Proposal', won: 'Won', lost: 'Lost',
  }
  return labels[stage] || stage
}

function qualityLabel(score: number | null) {
  if (score == null) return 'Unknown'
  if (score <= 20) return 'Critical'
  if (score <= 40) return 'Poor'
  if (score <= 60) return 'Fair'
  if (score <= 80) return 'Good'
  return 'Strong'
}

function formatDate(iso: string | null) {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function generateProfileMarkdown(
  prospect: any,
  demos: any[],
  deals: any[],
  activities: any[],
): string {
  const sf = prospect.score_factors || {}
  const rd = prospect.research_data || {}
  const website = rd.website || {}
  const reviews = rd.reviews || {}
  const social = rd.social || {}
  const vd = sf.vulnerability_detail || {}

  const addressLine = [prospect.address, prospect.city, prospect.state, prospect.zip].filter(Boolean).join(', ')
  const slug = prospect.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const generated = new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC'

  let md = ''

  // ── Header ──
  md += `# Prospect Profile: ${prospect.business_name}\n\n`
  md += `> Generated: ${generated}  \n`
  md += `> Profile ID: \`${prospect.id}\`  \n`
  md += `> Slug: \`${slug}\`\n\n`
  md += `---\n\n`

  // ── Executive Summary ──
  md += `## Executive Summary\n\n`
  md += `| Field | Value |\n|-------|-------|\n`
  md += `| **Business** | ${prospect.business_name} |\n`
  md += `| **Industry** | ${prospect.industry || 'Unknown'} |\n`
  md += `| **Location** | ${addressLine || 'Unknown'} |\n`
  md += `| **Stage** | ${stageLabel(prospect.stage)} |\n`
  md += `| **Tier** | ${tierEmoji(sf.tier)} ${(sf.tier || 'unscored').toUpperCase()} |\n`
  md += `| **Score** | ${prospect.prospect_score ?? 'N/A'} / 100 |\n`
  md += `| **Auto-Demo Eligible** | ${prospect.auto_demo_eligible ? 'Yes' : 'No'} |\n`
  md += `| **Deal Estimate** | ${rd.deal_estimate || 'N/A'} |\n`
  md += `| **Urgency** | ${rd.urgency || 'N/A'} |\n`
  if (prospect.tags?.length) {
    md += `| **Tags** | ${prospect.tags.join(', ')} |\n`
  }
  md += `\n`

  // ── Contact Information ──
  md += `## Contact Information\n\n`
  md += `| Field | Value |\n|-------|-------|\n`
  if (prospect.owner_name) md += `| **Owner** | ${prospect.owner_name} |\n`
  if (prospect.owner_email) md += `| **Owner Email** | ${prospect.owner_email} |\n`
  if (prospect.owner_phone) md += `| **Owner Phone** | ${prospect.owner_phone} |\n`
  if (prospect.business_phone) md += `| **Business Phone** | ${prospect.business_phone} |\n`
  if (prospect.business_email) md += `| **Business Email** | ${prospect.business_email} |\n`
  if (addressLine) md += `| **Address** | ${addressLine} |\n`
  if (prospect.website_url) md += `| **Website** | ${prospect.website_url} |\n`
  md += `\n`

  // ── Intelligence Scoring ──
  md += `## Intelligence Scoring\n\n`
  md += `**Composite Score: ${prospect.prospect_score ?? 'N/A'} / 100** — ${tierEmoji(sf.tier)} ${(sf.tier || 'unscored').toUpperCase()}\n\n`
  md += `| Signal | Score | Weight | Description |\n|--------|-------|--------|-------------|\n`
  md += `| Review Authority | ${sf.review_authority ?? '—'} | 15% | Cross-platform review presence |\n`
  md += `| Digital Vulnerability | ${sf.digital_vulnerability ?? '—'} | 30% | Online presence gaps (higher = more opportunity) |\n`
  md += `| Industry Value | ${sf.industry_value ?? '—'} | 15% | Industry deal size potential |\n`
  md += `| Close Probability | ${sf.close_probability ?? '—'} | 25% | Likelihood of closing |\n`
  md += `| Revenue Potential | ${sf.revenue_potential ?? '—'} | 15% | Estimated deal value + upsell |\n`
  md += `\n`

  if (sf.close_signals?.length) {
    md += `**Close Signals:** ${sf.close_signals.join(', ')}\n\n`
  }
  if (sf.opportunity_count) {
    md += `**Opportunities Identified:** ${sf.opportunity_count}\n\n`
  }

  // ── Pitch Strategy ──
  if (rd.pitch_angle || rd.opportunities?.length) {
    md += `## Pitch Strategy\n\n`
    if (rd.pitch_angle) {
      md += `### Pitch Angle\n\n> ${rd.pitch_angle}\n\n`
    }
    if (rd.opportunities?.length) {
      md += `### Identified Opportunities\n\n`
      for (const opp of rd.opportunities) {
        md += `- ${opp.replace(/_/g, ' ')}\n`
      }
      md += `\n`
    }
  }

  // ── Digital Health ──
  md += `## Digital Health Assessment\n\n`
  md += `| Metric | Value |\n|--------|-------|\n`
  md += `| **Site Quality** | ${prospect.site_quality_score ?? 'N/A'} / 100 (${qualityLabel(prospect.site_quality_score)}) |\n`
  md += `| **Platform** | ${website.platform || 'Unknown'} |\n`
  if (vd.platform_weakness != null) md += `| **Platform Weakness** | ${vd.platform_weakness} / 100 |\n`
  md += `| **SSL Status** | ${website.ssl_valid === false ? 'BROKEN — browsers block visitors' : website.ssl_valid === true ? 'Valid' : 'Unknown'} |\n`
  if (vd.issue_count != null) md += `| **Issues Found** | ${vd.issue_count} |\n`
  if (vd.missing_channels != null) md += `| **Missing Social Channels** | ${vd.missing_channels} |\n`
  md += `\n`

  if (website.issues?.length) {
    md += `### Website Issues\n\n`
    for (const issue of website.issues) {
      const isCritical = /ssl|broken|no_website/i.test(issue)
      md += `- ${isCritical ? '🔴' : '🟡'} ${issue}\n`
    }
    md += `\n`
  }

  // ── Reviews & Reputation ──
  const reviewPlatforms: { name: string; rating: any; count: any }[] = []
  if (reviews.google) reviewPlatforms.push({ name: 'Google', rating: reviews.google.rating, count: reviews.google.count })
  else if (prospect.google_rating) reviewPlatforms.push({ name: 'Google', rating: prospect.google_rating, count: prospect.google_review_count })
  if (reviews.yelp) reviewPlatforms.push({ name: 'Yelp', rating: reviews.yelp.rating, count: reviews.yelp.count })
  else if (prospect.yelp_rating) reviewPlatforms.push({ name: 'Yelp', rating: prospect.yelp_rating, count: prospect.yelp_review_count })
  if (Array.isArray(reviews.other)) {
    for (const r of reviews.other) {
      if (r?.platform) reviewPlatforms.push({ name: r.platform, rating: r.rating, count: r.count })
    }
  }

  if (reviewPlatforms.length) {
    md += `## Reviews & Reputation\n\n`
    md += `| Platform | Rating | Reviews |\n|----------|--------|--------|\n`
    for (const r of reviewPlatforms) {
      md += `| ${r.name} | ${r.rating ?? 'N/A'}★ | ${r.count ?? 'N/A'} |\n`
    }
    const totalReviews = reviewPlatforms.reduce((s, r) => s + (r.count || 0), 0)
    md += `\n**Total Reviews:** ${totalReviews} across ${reviewPlatforms.length} platform(s)\n\n`
  }

  // ── Social Media Presence ──
  if (Object.keys(social).length) {
    md += `## Social Media Presence\n\n`
    md += `| Channel | Status | URL |\n|---------|--------|-----|\n`
    for (const [key, val] of Object.entries(social)) {
      const name = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      const isPresent = val === true || (typeof val === 'string' && (val as string).length > 0)
      const url = typeof val === 'string' && (val as string).startsWith('http') ? val as string : ''
      md += `| ${name} | ${isPresent ? '✅ Active' : '❌ Missing'} | ${url || '—'} |\n`
    }
    md += `\n`
  }

  // ── E-Commerce ──
  if (rd.ecommerce) {
    md += `## E-Commerce\n\n`
    md += `| Field | Value |\n|-------|-------|\n`
    md += `| **Platform** | ${rd.ecommerce.platform || 'Unknown'} |\n`
    if (rd.ecommerce.url) md += `| **Store URL** | ${rd.ecommerce.url} |\n`
    md += `| **Online Sales** | ${rd.ecommerce.has_online_sales ? 'Yes' : 'No'} |\n`
    md += `\n`
  }

  // ── Demos ──
  md += `## Demo Sites\n\n`
  if (!demos.length) {
    md += `No demos built yet.\n\n`
  } else {
    md += `| URL | Status | Version | Pages | Views | Method |\n|-----|--------|---------|-------|-------|--------|\n`
    for (const d of demos) {
      md += `| ${d.demo_url} | ${d.status} | v${d.version} | ${d.page_count} | ${d.view_count} | ${d.generation_method || 'manual'} |\n`
    }
    md += `\n`
  }

  // ── Deals ──
  if (deals.length) {
    md += `## Deals\n\n`
    md += `| Stage | Value | MRR | Services | Probability | Target Close |\n|-------|-------|-----|----------|-------------|-------------|\n`
    for (const d of deals) {
      md += `| ${stageLabel(d.stage)} | ${d.value_estimate ? `$${d.value_estimate.toLocaleString()}` : 'N/A'} | ${d.monthly_recurring ? `$${d.monthly_recurring.toLocaleString()}/mo` : 'N/A'} | ${d.services?.join(', ') || 'N/A'} | ${d.probability}% | ${formatDate(d.close_date_target)} |\n`
    }
    md += `\n`
  }

  // ── Activity Log ──
  if (activities.length) {
    md += `## Activity Log\n\n`
    md += `| Date | Type | Subject | Notes |\n|------|------|---------|-------|\n`
    for (const a of activities.slice(0, 30)) {
      const date = formatDate(a.created_at)
      const body = (a.body || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 120)
      md += `| ${date} | ${a.type} | ${a.subject || '—'} | ${body || '—'} |\n`
    }
    md += `\n`
  }

  // ── Notes ──
  if (prospect.notes) {
    md += `## Notes\n\n${prospect.notes}\n\n`
  }

  // ── Business Context (for demo generation) ──
  md += `## Demo Generation Context\n\n`
  md += `This section provides structured data for the demo site generator.\n\n`
  md += `\`\`\`yaml\n`
  md += `business_name: "${prospect.business_name}"\n`
  md += `slug: "${slug}"\n`
  md += `industry: "${prospect.industry || 'other'}"\n`
  md += `city: "${prospect.city || ''}"\n`
  md += `state: "${prospect.state || ''}"\n`
  md += `website_url: "${prospect.website_url || ''}"\n`
  md += `current_platform: "${website.platform || 'unknown'}"\n`
  md += `tier: "${sf.tier || 'unscored'}"\n`
  md += `score: ${prospect.prospect_score ?? 0}\n`
  md += `deal_estimate: "${rd.deal_estimate || ''}"\n`
  md += `urgency: "${rd.urgency || 'medium'}"\n`
  md += `owner_name: "${prospect.owner_name || ''}"\n`
  md += `business_phone: "${prospect.business_phone || ''}"\n`
  md += `business_email: "${prospect.business_email || prospect.owner_email || ''}"\n`
  if (rd.hours) md += `hours: "${rd.hours}"\n`
  if (rd.established) md += `established: "${rd.established}"\n`
  md += `google_rating: ${prospect.google_rating ?? 'null'}\n`
  md += `google_review_count: ${prospect.google_review_count ?? 0}\n`
  md += `site_quality_score: ${prospect.site_quality_score ?? 'null'}\n`
  md += `ssl_broken: ${website.ssl_valid === false}\n`
  md += `opportunities:\n`
  if (rd.opportunities?.length) {
    for (const opp of rd.opportunities) {
      md += `  - "${opp}"\n`
    }
  }
  md += `services_to_pitch:\n`
  if (rd.opportunities?.length) {
    for (const opp of rd.opportunities) {
      md += `  - "${opp.replace(/_/g, ' ')}"\n`
    }
  }
  if (social.facebook) md += `facebook: "${typeof social.facebook === 'string' ? social.facebook : ''}"\n`
  if (social.instagram) md += `instagram: "${typeof social.instagram === 'string' ? social.instagram : ''}"\n`
  md += `\`\`\`\n\n`

  // ── Timestamps ──
  md += `## Record Metadata\n\n`
  md += `| Field | Value |\n|-------|-------|\n`
  md += `| **Created** | ${formatDate(prospect.created_at)} |\n`
  md += `| **Last Updated** | ${formatDate(prospect.updated_at)} |\n`
  md += `| **Research Completed** | ${formatDate(prospect.research_completed_at)} |\n`
  md += `| **Last Contacted** | ${formatDate(prospect.last_contacted_at)} |\n`
  md += `| **Last Activity** | ${formatDate(prospect.last_activity_at)} |\n`
  md += `| **Source** | ${prospect.source} |\n`
  md += `\n---\n\n`
  md += `*Generated by Demand Signals Agency OS — ${generated}*\n`

  return md
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await params

  // Fetch prospect
  const { data: prospect, error: pErr } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', id)
    .single()

  if (pErr || !prospect) {
    return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
  }

  // Fetch related data in parallel
  const [demosRes, dealsRes, activitiesRes] = await Promise.all([
    supabase.from('demos').select('*').eq('prospect_id', id).order('created_at', { ascending: false }),
    supabase.from('deals').select('*').eq('prospect_id', id).order('created_at', { ascending: false }),
    supabase.from('activities').select('*').eq('prospect_id', id).order('created_at', { ascending: false }).limit(30),
  ])

  const markdown = generateProfileMarkdown(
    prospect,
    demosRes.data || [],
    dealsRes.data || [],
    activitiesRes.data || [],
  )

  const slug = prospect.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const filename = `${slug}-prospect-profile.md`

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
