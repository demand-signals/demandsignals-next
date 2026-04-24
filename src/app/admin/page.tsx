'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Eye, Users, FileText, ScrollText, UserCheck, FolderKanban, DollarSign,
  Target, Layers, Bot, BarChart3, Newspaper, MapPin,
  TrendingUp, Clock, ChevronRight,
} from 'lucide-react'
import { formatCents } from '@/lib/format'

// ── Types ──────────────────────────────────────────────────────────────

type FunnelStage = {
  count: number
  delta_pct: number | null
  href: string
  value?: number
}

type DashboardData = {
  window: { days: number; start: string; end: string }
  funnel: {
    visitors: FunnelStage
    prospects: FunnelStage
    quotes: FunnelStage
    sows: FunnelStage
    clients: FunnelStage
    projects: FunnelStage
    revenue_cents: { value: number; delta_pct: number | null; href: string }
  }
  prospecting: {
    new_this_week: number
    active_pipeline: number
    tier_diamond: number
    tier_gold: number
    tier_silver: number
    tier_bronze: number
    avg_score: number | null
  }
  onboarding: {
    demos_active: number
    sows_draft: number
    sows_sent: number
    sows_accepted: number
    avg_days_sent_to_accepted: number | null
  }
  clients: {
    total: number
    new_this_month: number
    top_by_ltv: Array<{
      id: string
      business_name: string
      client_code: string | null
      ltv_cents: number
    }>
  }
  projects: {
    active: number
    phases_pending: number
    phases_in_progress: number
    phases_completed: number
    deliverables_pending: number
    deliverables_delivered: number
  }
  finance: {
    invoices_draft: number
    invoices_sent: number
    invoices_paid: number
    invoices_outstanding_cents: number
    mtd_revenue_cents: number
    mrr_cents: number
    avg_days_to_pay: number | null
  }
  content: {
    blog_posts: number
    long_tail_pages: number
    last_blog_published: string | null
  }
  insights: {
    sessions_today: number
    sessions_7d: number
    top_landing_paths: Array<{ path: string; views: number }>
  }
}

// ── Delta pill ──────────────────────────────────────────────────────────

function DeltaPill({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 tracking-wide">
        NEW
      </span>
    )
  }
  if (delta === 0) {
    return (
      <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">
        —
      </span>
    )
  }
  const isPos = delta > 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
        isPos
          ? 'bg-emerald-50 text-emerald-600'
          : 'bg-red-50 text-red-500'
      }`}
    >
      {isPos ? '↑' : '↓'} {Math.abs(delta)}%
    </span>
  )
}

// ── Skeleton shimmer ────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 rounded ${className ?? ''}`}
    />
  )
}

// ── Funnel card ─────────────────────────────────────────────────────────

type FunnelCardProps = {
  label: string
  value: string
  delta: number | null
  icon: React.ElementType
  href: string
}

function FunnelCard({ label, value, delta, icon: Icon, href }: FunnelCardProps) {
  return (
    <Link
      href={href}
      className="group bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2 border-l-4 hover:shadow-md hover:border-l-[var(--teal)] transition-all"
      style={{ borderLeftColor: 'var(--teal)' }}
    >
      <div className="flex items-center justify-between">
        <Icon className="w-4 h-4 text-slate-400 group-hover:text-[var(--teal)] transition-colors" />
        <DeltaPill delta={delta} />
      </div>
      <div className="text-3xl font-bold text-[var(--dark)] leading-none">
        {value}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--slate)]">
        {label}
      </div>
    </Link>
  )
}

// ── Mini stat tile ──────────────────────────────────────────────────────

function MiniStat({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 space-y-0.5">
      <div className="text-xl font-bold text-[var(--dark)]">{value}</div>
      <div className="text-[11px] text-slate-500 leading-tight">{label}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  )
}

// ── Category tile wrapper ───────────────────────────────────────────────

type CategoryTileProps = {
  title: string
  icon: React.ElementType
  href?: string
  children: React.ReactNode
}

function CategoryTile({ title, icon: Icon, href, children }: CategoryTileProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[var(--orange)]" />
          <span className="text-xs font-bold tracking-widest uppercase text-[var(--orange)]">
            {title}
          </span>
        </div>
        {href && (
          <Link
            href={href}
            className="text-[11px] text-slate-400 hover:text-[var(--teal)] flex items-center gap-0.5 transition-colors"
          >
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">{children}</div>
    </div>
  )
}

// ── Window selector ─────────────────────────────────────────────────────

const WINDOWS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

// ── Main page ────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/dashboard?days=${days}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
      setFetchedAt(new Date())
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    void load()
  }, [load])

  // Relative time label
  const updatedLabel = fetchedAt
    ? (() => {
        const diffMs = Date.now() - fetchedAt.getTime()
        const diffMin = Math.floor(diffMs / 60000)
        if (diffMin === 0) return 'just now'
        if (diffMin < 60) return `${diffMin}m ago`
        return `${Math.floor(diffMin / 60)}h ago`
      })()
    : null

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Command Center</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Last {days} days
            {updatedLabel && ` · updated ${updatedLabel}`}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {WINDOWS.map((w) => (
            <button
              key={w.days}
              onClick={() => setDays(w.days)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                days === w.days
                  ? 'bg-white text-[var(--dark)] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
          <span>Failed to load dashboard data. {error}</span>
          <button
            onClick={load}
            className="text-red-600 font-semibold hover:text-red-800 ml-4 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Funnel ───────────────────────────────────────────────── */}
      <section>
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          Pipeline Funnel — {days}d window
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
            <FunnelCard
              label="Visitors"
              value={data.funnel.visitors.count.toLocaleString()}
              delta={data.funnel.visitors.delta_pct}
              icon={Eye}
              href={data.funnel.visitors.href}
            />
            <FunnelCard
              label="Prospects"
              value={data.funnel.prospects.count.toLocaleString()}
              delta={data.funnel.prospects.delta_pct}
              icon={Users}
              href={data.funnel.prospects.href}
            />
            <FunnelCard
              label="Quotes"
              value={data.funnel.quotes.count.toLocaleString()}
              delta={data.funnel.quotes.delta_pct}
              icon={FileText}
              href={data.funnel.quotes.href}
            />
            <FunnelCard
              label="SOWs"
              value={data.funnel.sows.count.toLocaleString()}
              delta={data.funnel.sows.delta_pct}
              icon={ScrollText}
              href={data.funnel.sows.href}
            />
            <FunnelCard
              label="Clients"
              value={data.funnel.clients.count.toLocaleString()}
              delta={data.funnel.clients.delta_pct}
              icon={UserCheck}
              href={data.funnel.clients.href}
            />
            <FunnelCard
              label="Projects"
              value={data.funnel.projects.count.toLocaleString()}
              delta={data.funnel.projects.delta_pct}
              icon={FolderKanban}
              href={data.funnel.projects.href}
            />
            <FunnelCard
              label="Revenue MTD"
              value={formatCents(data.funnel.revenue_cents.value)}
              delta={data.funnel.revenue_cents.delta_pct}
              icon={DollarSign}
              href={data.funnel.revenue_cents.href}
            />
          </div>
        ) : null}
      </section>

      {/* ── Category tiles ───────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="p-4 grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-16" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* PROSPECTING */}
          <CategoryTile title="Prospecting" icon={Target} href="/admin/prospects">
            <MiniStat label="New this week" value={data.prospecting.new_this_week} />
            <MiniStat label="Active pipeline" value={data.prospecting.active_pipeline} />
            <MiniStat
              label="Avg score"
              value={data.prospecting.avg_score ?? '—'}
            />
            <MiniStat label="Diamond" value={`💎 ${data.prospecting.tier_diamond}`} />
            <MiniStat label="Gold" value={`🥇 ${data.prospecting.tier_gold}`} />
            <MiniStat label="Silver" value={`🥈 ${data.prospecting.tier_silver}`} />
          </CategoryTile>

          {/* ONBOARDING */}
          <CategoryTile title="Onboarding" icon={Layers} href="/admin/sow">
            <MiniStat label="Demos active" value={data.onboarding.demos_active} />
            <MiniStat label="SOWs draft" value={data.onboarding.sows_draft} />
            <MiniStat label="SOWs sent" value={data.onboarding.sows_sent} />
            <MiniStat label="SOWs accepted" value={data.onboarding.sows_accepted} />
            <MiniStat
              label="Avg days to sign"
              value={
                data.onboarding.avg_days_sent_to_accepted != null
                  ? `${data.onboarding.avg_days_sent_to_accepted}d`
                  : '—'
              }
            />
          </CategoryTile>

          {/* CLIENTS */}
          <CategoryTile title="Clients" icon={UserCheck} href="/admin/prospects?filter=clients">
            <MiniStat label="Total clients" value={data.clients.total} />
            <MiniStat label="New this month" value={data.clients.new_this_month} />
            {data.clients.top_by_ltv[0] && (
              <MiniStat
                label="Top client LTV"
                value={formatCents(data.clients.top_by_ltv[0].ltv_cents)}
                sub={data.clients.top_by_ltv[0].client_code ?? data.clients.top_by_ltv[0].business_name}
              />
            )}
          </CategoryTile>

          {/* PROJECTS */}
          <CategoryTile title="Projects" icon={FolderKanban} href="/admin/projects">
            <MiniStat label="Active projects" value={data.projects.active} />
            <MiniStat label="Phases in progress" value={data.projects.phases_in_progress} />
            <MiniStat label="Phases pending" value={data.projects.phases_pending} />
            <MiniStat label="Phases done" value={data.projects.phases_completed} />
            <MiniStat label="Deliverables pending" value={data.projects.deliverables_pending} />
            <MiniStat label="Deliverables done" value={data.projects.deliverables_delivered} />
          </CategoryTile>

          {/* FINANCE */}
          <CategoryTile title="Finance" icon={DollarSign} href="/admin/invoices">
            <MiniStat label="MRR" value={formatCents(data.finance.mrr_cents)} />
            <MiniStat label="MTD revenue" value={formatCents(data.finance.mtd_revenue_cents)} />
            <MiniStat
              label="Outstanding"
              value={formatCents(data.finance.invoices_outstanding_cents)}
            />
            <MiniStat label="Invoices draft" value={data.finance.invoices_draft} />
            <MiniStat label="Invoices sent" value={data.finance.invoices_sent} />
            <MiniStat
              label="Avg days to pay"
              value={
                data.finance.avg_days_to_pay != null
                  ? `${data.finance.avg_days_to_pay}d`
                  : '—'
              }
            />
          </CategoryTile>

          {/* CONTENT */}
          <CategoryTile title="Content" icon={Newspaper} href="/admin/blog">
            <MiniStat label="Blog posts" value={data.content.blog_posts} />
            <MiniStat label="Long-tail pages" value={data.content.long_tail_pages} />
            {data.content.last_blog_published && (
              <MiniStat
                label="Last published"
                value={new Date(data.content.last_blog_published).toLocaleDateString(
                  'en-US',
                  { month: 'short', day: 'numeric' },
                )}
              />
            )}
          </CategoryTile>

          {/* INSIGHTS */}
          <CategoryTile title="Insights" icon={BarChart3} href="/admin/analytics">
            <MiniStat label="Sessions today" value={data.insights.sessions_today} />
            <MiniStat label="Sessions 7d" value={data.insights.sessions_7d} />
            {data.insights.top_landing_paths[0] && (
              <MiniStat
                label="Top page"
                value={data.insights.top_landing_paths[0].views}
                sub={data.insights.top_landing_paths[0].path}
              />
            )}
          </CategoryTile>

          {/* AGENTS — static, no API data needed */}
          <CategoryTile title="Agents" icon={Bot} href="/admin/agents">
            <MiniStat label="Prospecting" value="Active" />
            <MiniStat label="Scoring" value="Soon" />
            <MiniStat label="Outreach" value="Soon" />
          </CategoryTile>

        </div>
      ) : null}

      {/* ── Top landing paths detail ───────────────────────────── */}
      {data && data.insights.top_landing_paths.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[var(--orange)]" />
              <span className="text-xs font-bold tracking-widest uppercase text-[var(--orange)]">
                Top Landing Pages — {days}d
              </span>
            </div>
            <Link
              href="/admin/analytics"
              className="text-[11px] text-slate-400 hover:text-[var(--teal)] flex items-center gap-0.5 transition-colors"
            >
              Full analytics <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {data.insights.top_landing_paths.map((p, i) => {
              const maxViews = data.insights.top_landing_paths[0].views
              const pct = maxViews > 0 ? Math.round((p.views / maxViews) * 100) : 0
              return (
                <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-700 font-mono truncate">{p.path}</div>
                    <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: 'var(--teal)',
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-600 shrink-0">
                    {p.views.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Top clients by LTV detail ──────────────────────────── */}
      {data && data.clients.top_by_ltv.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[var(--orange)]" />
              <span className="text-xs font-bold tracking-widest uppercase text-[var(--orange)]">
                Top Clients by LTV
              </span>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {data.clients.top_by_ltv.map((c, i) => (
              <Link
                key={c.id}
                href={`/admin/prospects/${c.id}`}
                className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors"
              >
                <span className="text-xs text-slate-400 w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-700 font-medium truncate">
                    {c.business_name}
                  </div>
                  {c.client_code && (
                    <div className="text-[11px] text-slate-400">{c.client_code}</div>
                  )}
                </div>
                <span className="text-sm font-semibold text-slate-600 shrink-0">
                  {formatCents(c.ltv_cents)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────── */}
      <p className="text-[11px] text-slate-300 text-center pb-4">
        Data cached 5 min at the edge · Supabase + Vercel Postgres
      </p>
    </div>
  )
}
