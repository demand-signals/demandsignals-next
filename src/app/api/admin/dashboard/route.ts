import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createPool } from '@vercel/postgres'
import { getAllPosts } from '@/lib/blog'
import { ALL_CITY_SERVICE_SLUGS } from '@/lib/city-service-slugs'
import type { ProjectPhase, ProjectPhaseDeliverable } from '@/lib/invoice-types'

export const revalidate = 300 // 5-minute edge cache

// ── helpers ──────────────────────────────────────────────────────────

function getPool() {
  const url =
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL
  if (!url) throw new Error('No Postgres URL configured')
  return createPool({ connectionString: url })
}

function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

// ── GET ───────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const days = Math.max(1, Math.min(365, parseInt(searchParams.get('days') ?? '30', 10)))

  const now = new Date()
  const windowStart = new Date(now.getTime() - days * 86400000)
  const prevStart = new Date(windowStart.getTime() - days * 86400000)

  const windowStartISO = windowStart.toISOString()
  const prevStartISO = prevStart.toISOString()
  const windowEndISO = now.toISOString()

  // ── FUNNEL — counts in current + previous window ──────────────────

  // Prospects
  const [prospectsCurrentRes, prospectsPrevRes] = await Promise.all([
    supabaseAdmin
      .from('prospects')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', windowStartISO),
    supabaseAdmin
      .from('prospects')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', prevStartISO)
      .lt('created_at', windowStartISO),
  ])
  const prospectsCurrent = prospectsCurrentRes.count ?? 0
  const prospectsPrev = prospectsPrevRes.count ?? 0

  // Quotes
  const [quotesCurrRes, quotesPrevRes] = await Promise.all([
    supabaseAdmin
      .from('quote_sessions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', windowStartISO),
    supabaseAdmin
      .from('quote_sessions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', prevStartISO)
      .lt('created_at', windowStartISO),
  ])
  const quotesCurrent = quotesCurrRes.count ?? 0
  const quotesPrev = quotesPrevRes.count ?? 0

  // SOWs
  const [sowsCurrRes, sowsPrevRes] = await Promise.all([
    supabaseAdmin
      .from('sow_documents')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', windowStartISO),
    supabaseAdmin
      .from('sow_documents')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', prevStartISO)
      .lt('created_at', windowStartISO),
  ])
  const sowsCurrent = sowsCurrRes.count ?? 0
  const sowsPrev = sowsPrevRes.count ?? 0

  // Clients (became_client_at)
  const [clientsCurrRes, clientsPrevRes] = await Promise.all([
    supabaseAdmin
      .from('prospects')
      .select('id', { count: 'exact', head: true })
      .gte('became_client_at', windowStartISO),
    supabaseAdmin
      .from('prospects')
      .select('id', { count: 'exact', head: true })
      .gte('became_client_at', prevStartISO)
      .lt('became_client_at', windowStartISO),
  ])
  const clientsCurrent = clientsCurrRes.count ?? 0
  const clientsPrev = clientsPrevRes.count ?? 0

  // Projects
  const [projectsCurrRes, projectsPrevRes] = await Promise.all([
    supabaseAdmin
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', windowStartISO),
    supabaseAdmin
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', prevStartISO)
      .lt('created_at', windowStartISO),
  ])
  const projectsCurrent = projectsCurrRes.count ?? 0
  const projectsPrev = projectsPrevRes.count ?? 0

  // MTD revenue (paid invoices)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  const [revCurrRes, revPrevRes] = await Promise.all([
    supabaseAdmin
      .from('invoices')
      .select('total_due_cents')
      .eq('status', 'paid')
      .gte('paid_at', monthStart),
    supabaseAdmin
      .from('invoices')
      .select('total_due_cents')
      .eq('status', 'paid')
      .gte('paid_at', prevMonthStart)
      .lt('paid_at', monthStart),
  ])
  const revCurrent = (revCurrRes.data ?? []).reduce(
    (sum, r) => sum + (r.total_due_cents ?? 0),
    0,
  )
  const revPrev = (revPrevRes.data ?? []).reduce(
    (sum, r) => sum + (r.total_due_cents ?? 0),
    0,
  )

  // ── VISITORS (Vercel Postgres) ────────────────────────────────────

  let visitorsCurrent = 0
  let visitorsPrev = 0
  let sessionsToday = 0
  let sessions7d = 0
  let topLandingPaths: { path: string; views: number }[] = []

  try {
    const pool = getPool()
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

    const [visRow, visPrevRow, todayRow, s7dRow, topPathsRow] =
      await Promise.all([
        pool.sql`
          SELECT COUNT(DISTINCT visitor_hash) AS cnt
          FROM pageviews
          WHERE created_at >= ${windowStartISO} AND created_at < ${windowEndISO}
            AND is_bot = false
        `,
        pool.sql`
          SELECT COUNT(DISTINCT visitor_hash) AS cnt
          FROM pageviews
          WHERE created_at >= ${prevStartISO} AND created_at < ${windowStartISO}
            AND is_bot = false
        `,
        pool.sql`
          SELECT COUNT(*) AS cnt
          FROM pageviews
          WHERE created_at >= ${todayStart} AND is_bot = false
        `,
        pool.sql`
          SELECT COUNT(*) AS cnt
          FROM pageviews
          WHERE created_at >= ${sevenDaysAgo} AND is_bot = false
        `,
        pool.sql`
          SELECT path, COUNT(*) AS views
          FROM pageviews
          WHERE created_at >= ${windowStartISO} AND is_bot = false
          GROUP BY path
          ORDER BY views DESC
          LIMIT 5
        `,
      ])

    visitorsCurrent = Number(visRow.rows[0]?.cnt ?? 0)
    visitorsPrev = Number(visPrevRow.rows[0]?.cnt ?? 0)
    sessionsToday = Number(todayRow.rows[0]?.cnt ?? 0)
    sessions7d = Number(s7dRow.rows[0]?.cnt ?? 0)
    topLandingPaths = topPathsRow.rows.map((r) => ({
      path: r.path as string,
      views: Number(r.views),
    }))
  } catch (err) {
    console.error('[dashboard] Postgres query failed:', err)
  }

  // ── PROSPECTING ───────────────────────────────────────────────────

  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

  const [
    prospectsWeekRes,
    pipelineRes,
    prospectScoresRes,
    totalClientsRes,
  ] = await Promise.all([
    supabaseAdmin
      .from('prospects')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneWeekAgo),
    supabaseAdmin
      .from('prospects')
      .select('id', { count: 'exact', head: true })
      .in('stage', ['outreach', 'engaged', 'meeting', 'proposal']),
    supabaseAdmin
      .from('prospects')
      .select('prospect_score, score_factors'),
    supabaseAdmin
      .from('prospects')
      .select('id', { count: 'exact', head: true })
      .eq('is_client', true),
  ])

  const prospectsThisWeek = prospectsWeekRes.count ?? 0
  const activePipeline = pipelineRes.count ?? 0
  const allProspects = prospectScoresRes.data ?? []

  let tierDiamond = 0, tierGold = 0, tierSilver = 0, tierBronze = 0
  let scoreSum = 0, scoreCount = 0

  for (const p of allProspects) {
    const tier = p.score_factors?.tier ?? 'bronze'
    if (tier === 'diamond') tierDiamond++
    else if (tier === 'gold') tierGold++
    else if (tier === 'silver') tierSilver++
    else tierBronze++

    if (p.prospect_score != null) {
      scoreSum += p.prospect_score
      scoreCount++
    }
  }

  const avgScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null

  // ── ONBOARDING ────────────────────────────────────────────────────

  const [demosRes, sowsDetailRes] = await Promise.all([
    supabaseAdmin.from('demos').select('id, status'),
    supabaseAdmin
      .from('sow_documents')
      .select('id, status, sent_at, accepted_at'),
  ])

  const demos = demosRes.data ?? []
  const sowDocs = sowsDetailRes.data ?? []

  const demosActive = demos.filter(
    (d) => d.status === 'active' || d.status === 'published',
  ).length
  const sowsDraft = sowDocs.filter((s) => s.status === 'draft').length
  const sowsSent = sowDocs.filter((s) => s.status === 'sent').length
  const sowsAccepted = sowDocs.filter((s) => s.status === 'accepted').length

  // Avg days from sent to accepted
  const acceptedWithDates = sowDocs.filter(
    (s) => s.status === 'accepted' && s.sent_at && s.accepted_at,
  )
  let avgDaysSentToAccepted: number | null = null
  if (acceptedWithDates.length > 0) {
    const totalMs = acceptedWithDates.reduce((sum, s) => {
      return (
        sum +
        (new Date(s.accepted_at!).getTime() -
          new Date(s.sent_at!).getTime())
      )
    }, 0)
    avgDaysSentToAccepted = Math.round(
      totalMs / acceptedWithDates.length / 86400000,
    )
  }

  // ── CLIENTS ───────────────────────────────────────────────────────

  const totalClients = totalClientsRes.count ?? 0

  const clientsThisMonthRes = await supabaseAdmin
    .from('prospects')
    .select('id', { count: 'exact', head: true })
    .eq('is_client', true)
    .gte('became_client_at', monthStart)

  const clientsNewThisMonth = clientsThisMonthRes.count ?? 0

  // Top 5 clients by LTV
  let topByLtv: {
    id: string
    business_name: string
    client_code: string | null
    ltv_cents: number
  }[] = []
  try {
    const clientsRes = await supabaseAdmin
      .from('prospects')
      .select('id, business_name, client_code')
      .eq('is_client', true)

    const clientIds = (clientsRes.data ?? []).map((c) => c.id)
    if (clientIds.length > 0) {
      const ltvRes = await supabaseAdmin
        .from('invoices')
        .select('prospect_id, total_due_cents')
        .in('prospect_id', clientIds)
        .eq('status', 'paid')

      const ltvMap = new Map<string, number>()
      for (const inv of ltvRes.data ?? []) {
        ltvMap.set(
          inv.prospect_id,
          (ltvMap.get(inv.prospect_id) ?? 0) + (inv.total_due_cents ?? 0),
        )
      }

      topByLtv = (clientsRes.data ?? [])
        .map((c) => ({
          id: c.id,
          business_name: c.business_name,
          client_code: c.client_code ?? null,
          ltv_cents: ltvMap.get(c.id) ?? 0,
        }))
        .sort((a, b) => b.ltv_cents - a.ltv_cents)
        .slice(0, 5)
    }
  } catch (err) {
    console.error('[dashboard] LTV query failed:', err)
  }

  // ── PROJECTS ──────────────────────────────────────────────────────

  let projectsActive = 0
  let phasesPending = 0
  let phasesInProgress = 0
  let phasesCompleted = 0
  let deliverablesPending = 0
  let deliverablesDelivered = 0

  try {
    const projectsRes = await supabaseAdmin
      .from('projects')
      .select('status, phases')

    for (const proj of projectsRes.data ?? []) {
      if (['planning', 'in_progress'].includes(proj.status)) projectsActive++

      const phases: ProjectPhase[] = Array.isArray(proj.phases)
        ? proj.phases
        : []
      for (const phase of phases) {
        if (phase.status === 'pending') phasesPending++
        else if (phase.status === 'in_progress') phasesInProgress++
        else if (phase.status === 'completed') phasesCompleted++

        const deliverables: ProjectPhaseDeliverable[] = Array.isArray(
          phase.deliverables,
        )
          ? phase.deliverables
          : []
        for (const d of deliverables) {
          if (d.status === 'delivered') deliverablesDelivered++
          else deliverablesPending++
        }
      }
    }
  } catch (err) {
    console.error('[dashboard] Projects query failed:', err)
  }

  // ── FINANCE ───────────────────────────────────────────────────────

  let invoicesDraft = 0
  let invoicesSent = 0
  let invoicesPaid = 0
  let invoicesOutstandingCents = 0
  let avgDaysToPay: number | null = null
  let mrrCents = 0

  try {
    const [invoicesRes, mrrRes] = await Promise.all([
      supabaseAdmin
        .from('invoices')
        .select('status, total_due_cents, created_at, paid_at'),
      supabaseAdmin.rpc('get_mrr_cents').single(),
    ])

    const invoiceRows = invoicesRes.data ?? []
    for (const inv of invoiceRows) {
      if (inv.status === 'draft') invoicesDraft++
      else if (inv.status === 'sent' || inv.status === 'viewed')
        invoicesSent++
      else if (inv.status === 'paid') invoicesPaid++

      if (inv.status === 'sent' || inv.status === 'viewed')
        invoicesOutstandingCents += inv.total_due_cents ?? 0
    }

    // Avg days to pay (paid invoices in window)
    const paidInWindow = invoiceRows.filter(
      (i) =>
        i.status === 'paid' &&
        i.paid_at &&
        i.paid_at >= windowStartISO &&
        i.created_at,
    )
    if (paidInWindow.length > 0) {
      const totalPayMs = paidInWindow.reduce((sum, i) => {
        return (
          sum +
          (new Date(i.paid_at!).getTime() -
            new Date(i.created_at).getTime())
        )
      }, 0)
      avgDaysToPay = Math.round(
        totalPayMs / paidInWindow.length / 86400000,
      )
    }

    // MRR via RPC (falls back to manual if RPC not available)
    if ((mrrRes as any).error) {
      const subsRes = await supabaseAdmin
        .from('subscriptions')
        .select('override_monthly_amount_cents, subscription_plans(price_cents)')
        .in('status', ['active', 'trialing'])

      for (const s of subsRes.data ?? []) {
        const override = s.override_monthly_amount_cents
        const planPrice = (s.subscription_plans as any)?.price_cents ?? 0
        mrrCents += override != null ? override : planPrice
      }
    } else {
      mrrCents = (mrrRes as any).data ?? 0
    }
  } catch (err) {
    console.error('[dashboard] Finance queries failed:', err)
    // Fall back to manual MRR calculation
    try {
      const subsRes = await supabaseAdmin
        .from('subscriptions')
        .select('override_monthly_amount_cents, subscription_plans(price_cents)')
        .in('status', ['active', 'trialing'])

      for (const s of subsRes.data ?? []) {
        const override = s.override_monthly_amount_cents
        const planPrice = (s.subscription_plans as any)?.price_cents ?? 0
        mrrCents += override != null ? override : planPrice
      }
    } catch (err2) {
      console.error('[dashboard] MRR fallback failed:', err2)
    }
  }

  // ── CONTENT ───────────────────────────────────────────────────────

  let blogPostCount = 0
  let lastBlogPublished: string | null = null

  try {
    const posts = getAllPosts()
    blogPostCount = posts.length
    if (posts.length > 0) {
      // getAllPosts() already returns posts sorted newest-first
      lastBlogPublished = posts[0].date ?? null
    }
  } catch (err) {
    console.error('[dashboard] Blog count failed:', err)
  }

  const longTailPages = ALL_CITY_SERVICE_SLUGS.length

  // ── ASSEMBLE RESPONSE ─────────────────────────────────────────────

  return NextResponse.json({
    window: {
      days,
      start: windowStartISO,
      end: windowEndISO,
    },
    funnel: {
      visitors: {
        count: visitorsCurrent,
        delta_pct: deltaPct(visitorsCurrent, visitorsPrev),
        href: '/admin/analytics',
      },
      prospects: {
        count: prospectsCurrent,
        delta_pct: deltaPct(prospectsCurrent, prospectsPrev),
        href: '/admin/prospects',
      },
      quotes: {
        count: quotesCurrent,
        delta_pct: deltaPct(quotesCurrent, quotesPrev),
        href: '/admin/quotes',
      },
      sows: {
        count: sowsCurrent,
        delta_pct: deltaPct(sowsCurrent, sowsPrev),
        href: '/admin/sow',
      },
      clients: {
        count: clientsCurrent,
        delta_pct: deltaPct(clientsCurrent, clientsPrev),
        href: '/admin/prospects?filter=clients',
      },
      projects: {
        count: projectsCurrent,
        delta_pct: deltaPct(projectsCurrent, projectsPrev),
        href: '/admin/projects',
      },
      revenue_cents: {
        value: revCurrent,
        delta_pct: deltaPct(revCurrent, revPrev),
        href: '/admin/invoices',
      },
    },
    prospecting: {
      new_this_week: prospectsThisWeek,
      active_pipeline: activePipeline,
      tier_diamond: tierDiamond,
      tier_gold: tierGold,
      tier_silver: tierSilver,
      tier_bronze: tierBronze,
      avg_score: avgScore,
    },
    onboarding: {
      demos_active: demosActive,
      sows_draft: sowsDraft,
      sows_sent: sowsSent,
      sows_accepted: sowsAccepted,
      avg_days_sent_to_accepted: avgDaysSentToAccepted,
    },
    clients: {
      total: totalClients,
      new_this_month: clientsNewThisMonth,
      top_by_ltv: topByLtv,
    },
    projects: {
      active: projectsActive,
      phases_pending: phasesPending,
      phases_in_progress: phasesInProgress,
      phases_completed: phasesCompleted,
      deliverables_pending: deliverablesPending,
      deliverables_delivered: deliverablesDelivered,
    },
    finance: {
      invoices_draft: invoicesDraft,
      invoices_sent: invoicesSent,
      invoices_paid: invoicesPaid,
      invoices_outstanding_cents: invoicesOutstandingCents,
      mtd_revenue_cents: revCurrent,
      mrr_cents: mrrCents,
      avg_days_to_pay: avgDaysToPay,
    },
    content: {
      blog_posts: blogPostCount,
      long_tail_pages: longTailPages,
      last_blog_published: lastBlogPublished,
    },
    insights: {
      sessions_today: sessionsToday,
      sessions_7d: sessions7d,
      top_landing_paths: topLandingPaths,
    },
  })
}
