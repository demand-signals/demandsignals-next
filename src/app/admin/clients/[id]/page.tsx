// /admin/clients/[id] — client detail view.
//
// Server component. Reads the same prospects row that /admin/prospects/[id]
// would render, but emphasizes operating data (active projects, MRR,
// outstanding finance, upcoming meeting) over acquisition data
// (research, scoring, channels — collapsed under "Acquisition history").
//
// Lifecycle gate: if is_client = false, redirects to /admin/prospects/[id].
// The inverse redirect lives at /admin/prospects/[id]/layout.tsx.
//
// No data duplication. Same FKs. Same row.
//
// Spec: docs/superpowers/specs/2026-05-08-prospect-client-lifecycle-views-design.md

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, FileText, Receipt as ReceiptIcon, Calendar, Folder, Repeat,
  Phone, Mail, MapPin, Globe, Pencil, Eye,
} from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { formatCents } from '@/lib/format'

interface PageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params

  // Core prospect row
  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select(`
      id, business_name, owner_name, owner_email, owner_phone, business_phone,
      business_email, address, city, state, zip, country, website_url,
      client_code, became_client_at, last_contacted_at, tags, is_client,
      industry, channels
    `)
    .eq('id', id)
    .maybeSingle()

  if (!prospect) notFound()
  if (!prospect.is_client) redirect(`/admin/prospects/${id}`)

  // Parallel relationship fetches — all keyed by prospect_id
  const [projectsRes, subsRes, invoicesRes, receiptsRes, bookingRes] = await Promise.all([
    supabaseAdmin
      .from('projects')
      .select('id, name, status, start_date, target_date, completed_at, monthly_value, phases, updated_at')
      .eq('prospect_id', id)
      .order('updated_at', { ascending: false }),
    supabaseAdmin
      .from('subscriptions')
      .select(`
        id, status, override_monthly_amount_cents, started_at, paused_until, end_date,
        plan:subscription_plans ( name, price_cents, billing_interval )
      `)
      .eq('prospect_id', id)
      .order('started_at', { ascending: false }),
    supabaseAdmin
      .from('invoices')
      .select('id, invoice_number, total_due_cents, status, paid_at, due_at, created_at')
      .eq('prospect_id', id)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('receipts')
      .select('id, receipt_number, amount_cents, payment_method, paid_at, invoice_id')
      .eq('prospect_id', id)
      .order('paid_at', { ascending: false })
      .limit(8),
    supabaseAdmin
      .from('bookings')
      .select('id, start_at, end_at, attendee_email, attendee_phone, google_meet_link, status')
      .eq('prospect_id', id)
      .gte('start_at', new Date().toISOString())
      .eq('status', 'confirmed')
      .order('start_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  const projects = projectsRes.data ?? []
  // PostgREST shapes the subscription_plans join as an array even for the
  // one-to-one rel; existing call-sites cast through `any` for the same reason
  // (e.g. /api/admin/clients/route.ts). We model it as an array and read [0].
  type SubscriptionPlanLink = { name: string; price_cents: number; billing_interval: string }
  type SubscriptionRow = {
    id: string
    status: string
    override_monthly_amount_cents: number | null
    started_at: string | null
    paused_until: string | null
    end_date: string | null
    plan: SubscriptionPlanLink[] | SubscriptionPlanLink | null
  }
  const subscriptions = (subsRes.data ?? []) as unknown as SubscriptionRow[]
  const invoices = invoicesRes.data ?? []
  const receipts = receiptsRes.data ?? []
  const upcomingBooking = bookingRes.data ?? null

  // Derived: active projects, MRR
  const activeProjects = projects.filter(
    (p) => p.status === 'in_progress' || p.status === 'planning',
  )

  function planOf(s: SubscriptionRow): SubscriptionPlanLink | null {
    if (!s.plan) return null
    return Array.isArray(s.plan) ? (s.plan[0] ?? null) : s.plan
  }

  function monthlyContribution(s: SubscriptionRow): number {
    if (s.override_monthly_amount_cents != null) return s.override_monthly_amount_cents
    const plan = planOf(s)
    if (!plan) return 0
    const interval = plan.billing_interval ?? 'month'
    const price = plan.price_cents ?? 0
    if (interval === 'month') return price
    if (interval === 'quarter') return Math.round(price / 3)
    if (interval === 'year') return Math.round(price / 12)
    return 0
  }

  const activeSubs = subscriptions.filter(
    (s) => s.status === 'active' || s.status === 'trialing',
  )
  const pausedSubs = subscriptions.filter((s) => s.status === 'paused')
  const totalMrrCents = activeSubs.reduce((sum, s) => sum + monthlyContribution(s), 0)

  // Outstanding: invoices in 'sent' or 'viewed' status, balance = total_due - sum(receipts on that invoice)
  const outstandingInvoices = invoices.filter(
    (i) => i.status === 'sent' || i.status === 'viewed',
  )
  const receiptsByInvoice = new Map<string, number>()
  for (const r of receipts) {
    if (!r.invoice_id) continue
    receiptsByInvoice.set(
      r.invoice_id,
      (receiptsByInvoice.get(r.invoice_id) ?? 0) + (r.amount_cents ?? 0),
    )
  }
  const outstandingBalanceCents = outstandingInvoices.reduce((sum, i) => {
    const paidOnThis = receiptsByInvoice.get(i.id) ?? 0
    return sum + Math.max(0, (i.total_due_cents ?? 0) - paidOnThis)
  }, 0)

  // Last contact
  const lastContact = prospect.last_contacted_at
    ? new Date(prospect.last_contacted_at).toLocaleDateString()
    : '—'

  return (
    <div className="p-6 space-y-6">
      {/* Header strip */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link
            href="/admin/clients"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Clients
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 truncate">
            {prospect.business_name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-xs">
              CLIENT
              {prospect.became_client_at && (
                <span className="font-normal text-emerald-600">
                  · since {new Date(prospect.became_client_at).toLocaleDateString()}
                </span>
              )}
            </span>
            {prospect.client_code && (
              <span className="text-[11px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                {prospect.client_code}
              </span>
            )}
            {[prospect.city, prospect.state].filter(Boolean).join(', ') && (
              <span>{[prospect.city, prospect.state].filter(Boolean).join(', ')}</span>
            )}
            {prospect.industry && <span>· {prospect.industry}</span>}
          </div>
        </div>

        {/* Action bar — primary CTAs for active relationships */}
        <ClientActionBar prospectId={prospect.id} clientCode={prospect.client_code} />
      </div>

      {/* Status header tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatTile
          label="Active projects"
          value={String(activeProjects.length)}
          accent={activeProjects.length > 0 ? 'text-emerald-700' : 'text-slate-400'}
        />
        <StatTile
          label="MRR"
          value={totalMrrCents > 0 ? formatCents(totalMrrCents) + '/mo' : '—'}
          accent={totalMrrCents > 0 ? 'text-emerald-700' : 'text-slate-400'}
        />
        <StatTile
          label="Outstanding"
          value={
            outstandingBalanceCents > 0
              ? formatCents(outstandingBalanceCents)
              : '$0'
          }
          accent={outstandingBalanceCents > 0 ? 'text-orange-600' : 'text-slate-400'}
        />
        <StatTile label="Last contact" value={lastContact} />
        <StatTile
          label="Upcoming"
          value={
            upcomingBooking
              ? new Date(upcomingBooking.start_at).toLocaleDateString()
              : '—'
          }
          accent={upcomingBooking ? 'text-teal-700' : 'text-slate-400'}
        />
      </div>

      {/* Upcoming booking — inline summary, link to prospect detail for actions */}
      {upcomingBooking && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-emerald-900">
                Upcoming meeting
              </div>
              <div className="text-sm text-emerald-700">
                {new Date(upcomingBooking.start_at).toLocaleString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'America/Los_Angeles',
                })} PT
              </div>
              {upcomingBooking.attendee_email && (
                <div className="text-xs text-emerald-600 mt-0.5 truncate">
                  with {upcomingBooking.attendee_email}
                </div>
              )}
            </div>
          </div>
          {upcomingBooking.google_meet_link && (
            <a
              href={upcomingBooking.google_meet_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-emerald-700 text-sm font-semibold border border-emerald-300 hover:bg-emerald-100 flex-shrink-0"
            >
              Join Meet
            </a>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active projects */}
          <Section
            icon={Folder}
            title="Active projects"
            count={activeProjects.length}
            empty="No active projects yet."
            emptyActionHref={`/admin/projects/new?prospect_id=${prospect.id}`}
            emptyActionLabel="Create project"
          >
            {activeProjects.map((p) => {
              const phases = Array.isArray(p.phases) ? p.phases : []
              const phaseCount = phases.length
              const completedPhases = phases.filter(
                (ph: { status?: string }) => ph?.status === 'completed',
              ).length
              return (
                <Link
                  key={p.id}
                  href={`/admin/projects/${p.id}`}
                  className="block p-3 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{p.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {p.status === 'in_progress' ? 'In progress' : p.status === 'planning' ? 'Planning' : p.status}
                        {phaseCount > 0 && ` · ${completedPhases}/${phaseCount} phases`}
                      </div>
                    </div>
                    {typeof p.monthly_value === 'number' && p.monthly_value > 0 && (
                      <div className="text-right text-sm">
                        <div className="font-semibold text-emerald-700 tabular-nums">
                          {formatCents(p.monthly_value)}
                        </div>
                        <div className="text-[10px] text-slate-400">/mo</div>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </Section>

          {/* Active subscriptions */}
          <Section
            icon={Repeat}
            title="Active subscriptions"
            count={activeSubs.length + pausedSubs.length}
            empty="No active subscriptions."
            emptyActionHref={`/admin/subscriptions/new?prospect_id=${prospect.id}`}
            emptyActionLabel="Add subscription"
            footerAccent={
              totalMrrCents > 0 ? (
                <span className="text-emerald-700 font-semibold">
                  Total MRR: {formatCents(totalMrrCents)}/mo
                </span>
              ) : null
            }
          >
            {[...activeSubs, ...pausedSubs].map((s) => {
              const monthly = monthlyContribution(s)
              return (
                <Link
                  key={s.id}
                  href={`/admin/subscriptions/${s.id}`}
                  className="block p-3 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {planOf(s)?.name ?? 'Custom subscription'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 capitalize">
                        {s.status}
                        {s.status === 'paused' && s.paused_until && (
                          <> · resumes {new Date(s.paused_until).toLocaleDateString()}</>
                        )}
                        {s.end_date && (
                          <> · ends {new Date(s.end_date).toLocaleDateString()}</>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold text-emerald-700 tabular-nums">
                        {formatCents(monthly)}
                      </div>
                      <div className="text-[10px] text-slate-400">/mo</div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </Section>

          {/* Outstanding finance */}
          <Section
            icon={FileText}
            title="Outstanding invoices"
            count={outstandingInvoices.length}
            empty="No outstanding balance."
            footerAccent={
              outstandingBalanceCents > 0 ? (
                <span className="text-orange-600 font-semibold">
                  Total outstanding: {formatCents(outstandingBalanceCents)}
                </span>
              ) : null
            }
          >
            {outstandingInvoices.map((inv) => {
              const paidOnThis = receiptsByInvoice.get(inv.id) ?? 0
              const balance = Math.max(0, (inv.total_due_cents ?? 0) - paidOnThis)
              return (
                <Link
                  key={inv.id}
                  href={`/admin/invoices/${inv.id}`}
                  className="block p-3 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900">
                        {inv.invoice_number}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 capitalize">
                        {inv.status}
                        {inv.due_at && (
                          <> · due {new Date(inv.due_at).toLocaleDateString()}</>
                        )}
                        {paidOnThis > 0 && (
                          <> · {formatCents(paidOnThis)} paid</>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold text-orange-600 tabular-nums">
                        {formatCents(balance)}
                      </div>
                      <div className="text-[10px] text-slate-400">balance</div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </Section>

          {/* Recent receipts */}
          {receipts.length > 0 && (
            <Section
              icon={ReceiptIcon}
              title="Recent receipts"
              count={receipts.length}
              empty="No receipts."
            >
              {receipts.slice(0, 5).map((r) => (
                <Link
                  key={r.id}
                  href={`/admin/receipts/${r.id}`}
                  className="block p-3 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900">{r.receipt_number}</div>
                      <div className="text-xs text-slate-500 mt-0.5 capitalize">
                        {r.payment_method ?? 'unknown'}
                        {r.paid_at && <> · {new Date(r.paid_at).toLocaleDateString()}</>}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold text-emerald-700 tabular-nums">
                        {formatCents(r.amount_cents ?? 0)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </Section>
          )}
        </div>

        {/* Side column — contact + acquisition history */}
        <div className="space-y-6">
          {/* Contact */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Contact
            </h3>
            <div className="space-y-2.5 text-sm">
              {prospect.owner_name && (
                <div className="text-slate-700 font-medium">{prospect.owner_name}</div>
              )}
              {prospect.owner_email && (
                <a
                  href={`mailto:${prospect.owner_email}`}
                  className="flex items-center gap-2 text-teal-600 hover:underline"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-300" />
                  {prospect.owner_email}
                </a>
              )}
              {prospect.owner_phone && (
                <a
                  href={`tel:${prospect.owner_phone}`}
                  className="flex items-center gap-2 text-slate-700 hover:text-teal-600"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-300" />
                  {prospect.owner_phone}
                </a>
              )}
              {prospect.business_phone && prospect.business_phone !== prospect.owner_phone && (
                <a
                  href={`tel:${prospect.business_phone}`}
                  className="flex items-center gap-2 text-slate-600 hover:text-teal-600"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-300" />
                  <span>{prospect.business_phone} <span className="text-slate-400 text-xs">(business)</span></span>
                </a>
              )}
              {prospect.website_url && (
                <a
                  href={prospect.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-teal-600 hover:underline truncate"
                >
                  <Globe className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                  <span className="truncate">{prospect.website_url.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
              {(prospect.address || prospect.city) && (
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-300 mt-0.5" />
                  <div>
                    {prospect.address && <div>{prospect.address}</div>}
                    <div>
                      {[prospect.city, prospect.state, prospect.zip].filter(Boolean).join(', ')}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
              <Link
                href={`/admin/prospects/${prospect.id}/edit`}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-teal-600"
              >
                <Pencil className="w-3 h-3" /> Edit details
              </Link>
            </div>
          </div>

          {/* Quick links — full prospect view (acquisition history) */}
          <details className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-600 hover:text-slate-900 select-none">
              Acquisition history
            </summary>
            <div className="px-4 pb-4 text-xs text-slate-500 space-y-2">
              <p>
                Research, scoring breakdown, channels, ratings, raw activity log, and the full
                prospect profile are preserved.
              </p>
              <Link
                href={`/admin/prospects/${prospect.id}?keepView=1`}
                className="inline-flex items-center gap-1 text-teal-600 hover:underline"
              >
                Open full prospect view
              </Link>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}

function StatTile({
  label,
  value,
  accent = 'text-slate-800',
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${accent}`}>{value}</div>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  count,
  empty,
  emptyActionHref,
  emptyActionLabel,
  footerAccent,
  children,
}: {
  icon: React.ElementType
  title: string
  count: number
  empty: string
  emptyActionHref?: string
  emptyActionLabel?: string
  footerAccent?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
          {count > 0 && (
            <span className="text-xs text-slate-400 font-normal normal-case">
              ({count})
            </span>
          )}
        </h3>
        {footerAccent && <div className="text-xs">{footerAccent}</div>}
      </div>
      {count === 0 ? (
        <div className="text-center py-6 text-sm text-slate-400">
          <div>{empty}</div>
          {emptyActionHref && emptyActionLabel && (
            <Link
              href={emptyActionHref}
              className="mt-2 inline-block text-xs text-teal-600 hover:underline"
            >
              {emptyActionLabel}
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  )
}

function ClientActionBar({
  prospectId,
  clientCode,
}: {
  prospectId: string
  clientCode: string | null
}) {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <Link
        href={`/admin/sow/new?prospect_id=${prospectId}`}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-orange-600 shadow-sm"
      >
        <FileText className="w-4 h-4" />
        New SOW
      </Link>
      <Link
        href={`/admin/invoices/new?prospect_id=${prospectId}`}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm hover:border-teal-300 hover:text-teal-600"
      >
        <ReceiptIcon className="w-4 h-4" />
        New Invoice
      </Link>
      <Link
        href={`/admin/projects/new?prospect_id=${prospectId}`}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm hover:border-teal-300 hover:text-teal-600"
      >
        <Folder className="w-4 h-4" />
        New Project
      </Link>
      <a
        href={`/api/admin/portal-view-as/${prospectId}`}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm hover:border-teal-300 hover:text-teal-600"
        title="View their client portal"
      >
        <Eye className="w-4 h-4" />
        View as client
      </a>
    </div>
  )
}
