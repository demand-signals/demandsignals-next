// /admin/clients/[id] — client detail view.
//
// Server component. Reads the same prospects row that /admin/prospects/[id]
// would render, but emphasizes operating data (projects, MRR, outstanding
// finance, upcoming meeting, communications) over acquisition data
// (research, scoring, channels — collapsed under "Acquisition history").
//
// Lifecycle gate: if is_client = false, redirects to /admin/prospects/[id].
// The inverse redirect lives at /admin/prospects/[id]/layout.tsx.
//
// Round 2 (2026-05-08): panels now show full history (no active-only filter).
// Pagination at 50/page via ?invoicesOffset, ?projectsOffset, ?subsOffset,
// ?messagesOffset. Newest-first throughout. Status header tiles still
// aggregate current state (MRR = active subs only, Outstanding = unpaid
// invoices only) — the panels expand to history; the tiles do not.
// New Messages feed merges email_engagement + prospect_notes + activities
// chronologically, with a server-action note composer.
//
// Spec: docs/superpowers/specs/2026-05-08-prospect-client-lifecycle-views-design.md

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import {
  ArrowLeft, FileText, Receipt as ReceiptIcon, Calendar, Folder, Repeat,
  Phone, Mail, MapPin, Globe, Eye, MessageCircle, Plus, Send,
  ChevronLeft, ChevronRight, LifeBuoy, Bug,
} from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { formatCents } from '@/lib/format'
import { EditClientButton } from '@/components/admin/edit-client-button'
import { AgreementsPanel } from '@/components/admin/AgreementsPanel'
import { ActivityTimeline } from '@/components/admin/activity-timeline'
import { DocumentsPanel } from '@/components/admin/DocumentsPanel'
import { SentMessagesPanel } from '@/components/admin/SentMessagesPanel'
import { BackgroundPanel } from '@/components/admin/BackgroundPanel'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const PAGE_SIZE = 10

export const dynamic = 'force-dynamic'

// ── Note composer server action ──────────────────────────────────────
// POSTs to the existing prospect_notes API behavior (insert with prospect_id +
// body + created_by). Server action so the page form can submit without
// client JS or a separate API hop. The created_by is derived from the
// admin session inside the action.
async function createNote(formData: FormData) {
  'use server'
  const id = String(formData.get('prospect_id') ?? '')
  const body = String(formData.get('body') ?? '').trim()
  if (!id || !body) return

  // Derive admin email/id for created_by — same pattern as
  // /api/admin/prospects/[id]/notes route.
  const { createServerClient } = await import('@supabase/ssr')
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  )
  const { data: { user } } = await supa.auth.getUser()
  const createdBy = user?.email ?? user?.id ?? 'admin'

  await supabaseAdmin.from('prospect_notes').insert({
    prospect_id: id,
    body,
    created_by: createdBy,
  })

  revalidatePath(`/admin/clients/${id}`)
}

export default async function ClientDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const sp = await searchParams

  function offsetOf(key: string): number {
    const raw = sp[key]
    const v = Array.isArray(raw) ? raw[0] : raw
    const n = parseInt(v ?? '0', 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  }

  const sowOffset = offsetOf('sowOffset')
  const projectsOffset = offsetOf('projectsOffset')
  const supportOffset = offsetOf('supportOffset')
  const subsOffset = offsetOf('subsOffset')
  const invoicesOffset = offsetOf('invoicesOffset')
  const receiptsOffset = offsetOf('receiptsOffset')
  const messagesOffset = offsetOf('messagesOffset')

  const SUPPORT_TYPES = ['customer_service', 'bug_report']

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

  // Aggregate counts (for status tiles + panel totals) run as separate
  // count-only queries so we don't pay to fetch all rows just to count them.
  // Projects panel excludes support/bug-report types — those have their
  // own panel below.
  const [
    sowCountRes,
    projectsCountRes, supportCountRes, subsCountRes, invoicesCountRes, receiptsCountRes,
    activeProjectsCountRes, openSupportCountRes,
    activeSubsAggRes, outstandingAggRes,
    bookingRes,
  ] = await Promise.all([
    // SOWs — past, present, issued (all statuses, all time)
    supabaseAdmin
      .from('sow_documents')
      .select('id', { count: 'exact', head: true })
      .eq('prospect_id', id),
    // Regular projects (exclude support/bug types)
    supabaseAdmin
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('prospect_id', id)
      .not('type', 'in', `(${SUPPORT_TYPES.join(',')})`),
    // Support/bug-report projects (separate panel)
    supabaseAdmin
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('prospect_id', id)
      .in('type', SUPPORT_TYPES),
    supabaseAdmin.from('subscriptions').select('id', { count: 'exact', head: true }).eq('prospect_id', id),
    supabaseAdmin.from('invoices').select('id', { count: 'exact', head: true }).eq('prospect_id', id),
    supabaseAdmin.from('receipts').select('id', { count: 'exact', head: true }).eq('prospect_id', id),
    // Active project tile — only counts non-support active/planning/in_progress
    supabaseAdmin
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('prospect_id', id)
      .in('status', ['active', 'planning', 'in_progress'])
      .not('type', 'in', `(${SUPPORT_TYPES.join(',')})`),
    // Open support tickets — type IS in support, status not completed/cancelled
    supabaseAdmin
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('prospect_id', id)
      .in('type', SUPPORT_TYPES)
      .in('status', ['active', 'planning', 'in_progress']),
    // Active subscriptions for MRR tile
    supabaseAdmin
      .from('subscriptions')
      .select(`
        override_monthly_amount_cents,
        plan:subscription_plans ( price_cents, billing_interval )
      `)
      .eq('prospect_id', id)
      .in('status', ['active', 'trialing']),
    // Outstanding invoices for outstanding tile
    supabaseAdmin
      .from('invoices')
      .select('id, total_due_cents')
      .eq('prospect_id', id)
      .in('status', ['sent', 'viewed']),
    // Upcoming booking
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

  // Receipts that pay outstanding invoices (to compute remaining balance)
  const outstandingInvoiceIds = (outstandingAggRes.data ?? []).map((i) => i.id)
  const { data: outstandingReceipts } = outstandingInvoiceIds.length > 0
    ? await supabaseAdmin
        .from('receipts')
        .select('invoice_id, amount_cents')
        .in('invoice_id', outstandingInvoiceIds)
    : { data: [] as Array<{ invoice_id: string; amount_cents: number }> }

  type SubscriptionPlanLink = { name?: string; price_cents: number; billing_interval: string }
  type ActiveSubAgg = {
    override_monthly_amount_cents: number | null
    plan: SubscriptionPlanLink[] | SubscriptionPlanLink | null
  }
  function planOfAgg(s: ActiveSubAgg): SubscriptionPlanLink | null {
    if (!s.plan) return null
    return Array.isArray(s.plan) ? (s.plan[0] ?? null) : s.plan
  }
  function monthlyContributionAgg(s: ActiveSubAgg): number {
    if (s.override_monthly_amount_cents != null) return s.override_monthly_amount_cents
    const plan = planOfAgg(s)
    if (!plan) return 0
    const interval = plan.billing_interval ?? 'month'
    const price = plan.price_cents ?? 0
    if (interval === 'month') return price
    if (interval === 'quarter') return Math.round(price / 3)
    if (interval === 'year') return Math.round(price / 12)
    return 0
  }

  const totalSows = sowCountRes.count ?? 0
  const totalProjects = projectsCountRes.count ?? 0
  const totalSupport = supportCountRes.count ?? 0
  const totalSubs = subsCountRes.count ?? 0
  const totalInvoices = invoicesCountRes.count ?? 0
  const totalReceipts = receiptsCountRes.count ?? 0
  const activeProjectsCount = activeProjectsCountRes.count ?? 0
  const openSupportCount = openSupportCountRes.count ?? 0
  const totalMrrCents = (
    (activeSubsAggRes.data ?? []) as unknown as ActiveSubAgg[]
  ).reduce((sum, s) => sum + monthlyContributionAgg(s), 0)

  const receiptsByInvoice = new Map<string, number>()
  for (const r of outstandingReceipts ?? []) {
    if (!r.invoice_id) continue
    receiptsByInvoice.set(
      r.invoice_id,
      (receiptsByInvoice.get(r.invoice_id) ?? 0) + (r.amount_cents ?? 0),
    )
  }
  const outstandingBalanceCents = (outstandingAggRes.data ?? []).reduce((sum, i) => {
    const paidOnThis = receiptsByInvoice.get(i.id) ?? 0
    return sum + Math.max(0, (i.total_due_cents ?? 0) - paidOnThis)
  }, 0)

  // Paginated lists — full history, newest first
  const [
    sowListRes,
    projectsListRes, supportListRes, subsListRes, invoicesListRes, receiptsListRes,
    notesListRes, emailsListRes, activitiesListRes,
  ] = await Promise.all([
    supabaseAdmin
      .from('sow_documents')
      .select('id, sow_number, title, status, pricing, sent_at, accepted_at, declined_at, created_at')
      .eq('prospect_id', id)
      .order('created_at', { ascending: false })
      .range(sowOffset, sowOffset + PAGE_SIZE - 1),
    supabaseAdmin
      .from('projects')
      .select('id, name, type, status, start_date, target_date, completed_at, monthly_value, phases, updated_at, created_at')
      .eq('prospect_id', id)
      .not('type', 'in', `(${SUPPORT_TYPES.join(',')})`)
      .order('created_at', { ascending: false })
      .range(projectsOffset, projectsOffset + PAGE_SIZE - 1),
    supabaseAdmin
      .from('projects')
      .select('id, name, type, status, start_date, target_date, completed_at, monthly_value, phases, updated_at, created_at')
      .eq('prospect_id', id)
      .in('type', SUPPORT_TYPES)
      .order('created_at', { ascending: false })
      .range(supportOffset, supportOffset + PAGE_SIZE - 1),
    supabaseAdmin
      .from('subscriptions')
      .select(`
        id, status, override_monthly_amount_cents, current_period_start, paused_until, end_date, created_at,
        parent_invoice_id,
        plan:subscription_plans ( name, price_cents, billing_interval )
      `)
      .eq('prospect_id', id)
      .order('created_at', { ascending: false })
      .range(subsOffset, subsOffset + PAGE_SIZE - 1),
    supabaseAdmin
      .from('invoices')
      .select('id, invoice_number, total_due_cents, status, paid_at, sent_at, created_at, subscription_intent, subscription_id')
      .eq('prospect_id', id)
      .order('created_at', { ascending: false })
      .range(invoicesOffset, invoicesOffset + PAGE_SIZE - 1),
    supabaseAdmin
      .from('receipts')
      .select('id, receipt_number, amount_cents, payment_method, paid_at, invoice_id')
      .eq('prospect_id', id)
      .order('paid_at', { ascending: false })
      .range(receiptsOffset, receiptsOffset + PAGE_SIZE - 1),
    // Messages — pull a generous slice of each then merge + paginate in-memory
    supabaseAdmin
      .from('prospect_notes')
      .select('id, body, created_by, created_at, visibility')
      .eq('prospect_id', id)
      .order('created_at', { ascending: false })
      .limit(messagesOffset + PAGE_SIZE + 100),
    supabaseAdmin
      .from('email_engagement')
      .select('send_id, kind, event_type, to_address, subject, created_at, invoice_id, sow_document_id, receipt_id')
      .eq('prospect_id', id)
      .eq('event_type', 'sent')
      .order('created_at', { ascending: false })
      .limit(messagesOffset + PAGE_SIZE + 100),
    supabaseAdmin
      .from('activities')
      .select('id, type, subject, body, channel, direction, status, created_at, created_by')
      .eq('prospect_id', id)
      .order('created_at', { ascending: false })
      .limit(messagesOffset + PAGE_SIZE + 100),
  ])

  const sows = sowListRes.data ?? []
  const projects = projectsListRes.data ?? []
  const supportTickets = supportListRes.data ?? []
  type SubscriptionRow = {
    id: string
    status: string
    override_monthly_amount_cents: number | null
    current_period_start: string | null
    paused_until: string | null
    end_date: string | null
    created_at: string | null
    parent_invoice_id: string | null
    plan: SubscriptionPlanLink[] | SubscriptionPlanLink | null
  }
  const subscriptions = (subsListRes.data ?? []) as unknown as SubscriptionRow[]
  const invoices = invoicesListRes.data ?? []
  const receipts = receiptsListRes.data ?? []
  const upcomingBooking = bookingRes.data ?? null

  // Cross-panel link maps: subscription <-> parent invoice. Lets us render
  // "← INV-XXX" on subscription rows that came from a paid recurring
  // invoice, and "→ Subscription" on invoice rows that spawned one.
  const parentInvoiceIds = subscriptions
    .map((s) => s.parent_invoice_id)
    .filter((v): v is string => Boolean(v))
  const parentInvoiceNumberById = new Map<string, string>()
  if (parentInvoiceIds.length > 0) {
    const { data: parentInvoices } = await supabaseAdmin
      .from('invoices')
      .select('id, invoice_number')
      .in('id', parentInvoiceIds)
    for (const inv of parentInvoices ?? []) {
      if (inv.invoice_number) parentInvoiceNumberById.set(inv.id, inv.invoice_number)
    }
  }

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

  // Build unified messages feed
  type MessageRow = {
    key: string
    when: string
    icon: 'note' | 'email' | 'doc' | 'call' | 'sms' | 'meeting' | 'other'
    title: string
    detail: string
    href?: string
    badge?: string
  }
  const messages: MessageRow[] = []
  for (const n of notesListRes.data ?? []) {
    messages.push({
      key: `note-${n.id}`,
      when: n.created_at,
      icon: 'note',
      title: n.created_by ? `Note from ${n.created_by}` : 'Note',
      detail: n.body,
      badge: n.visibility === 'client' ? 'CLIENT-VISIBLE' : 'INTERNAL',
    })
  }
  for (const e of emailsListRes.data ?? []) {
    const docHref = e.invoice_id
      ? `/admin/invoices/${e.invoice_id}`
      : e.sow_document_id
        ? `/admin/sow/${e.sow_document_id}`
        : e.receipt_id
          ? `/admin/receipts/${e.receipt_id}`
          : undefined
    messages.push({
      key: `email-${e.send_id}`,
      when: e.created_at,
      icon: e.invoice_id || e.sow_document_id || e.receipt_id ? 'doc' : 'email',
      title: e.subject ?? 'Email',
      detail: `to ${e.to_address}`,
      href: docHref,
      badge: e.kind?.toUpperCase(),
    })
  }
  for (const a of activitiesListRes.data ?? []) {
    const isCommunication = ['call', 'sms', 'email', 'meeting', 'note'].includes(a.type)
    if (!isCommunication) continue
    const iconKey: MessageRow['icon'] =
      a.type === 'call' ? 'call'
        : a.type === 'sms' ? 'sms'
          : a.type === 'meeting' ? 'meeting'
            : a.type === 'email' ? 'email'
              : 'note'
    messages.push({
      key: `act-${a.id}`,
      when: a.created_at,
      icon: iconKey,
      title: a.subject ?? a.type,
      detail: a.body ?? '',
      badge: a.direction ? a.direction.toUpperCase() : undefined,
    })
  }
  // Sort newest first, paginate
  messages.sort((x, y) => (y.when || '').localeCompare(x.when || ''))
  const totalMessages = messages.length // approximation — bounded by per-stream pull
  const messagesPage = messages.slice(messagesOffset, messagesOffset + PAGE_SIZE)

  // Last contact
  const lastContact = prospect.last_contacted_at
    ? new Date(prospect.last_contacted_at).toLocaleDateString()
    : '—'

  // Helpers for pagination link rendering
  function pageHref(key: string, value: number) {
    const next = new URLSearchParams()
    if (sowOffset && key !== 'sowOffset') next.set('sowOffset', String(sowOffset))
    if (projectsOffset && key !== 'projectsOffset') next.set('projectsOffset', String(projectsOffset))
    if (supportOffset && key !== 'supportOffset') next.set('supportOffset', String(supportOffset))
    if (subsOffset && key !== 'subsOffset') next.set('subsOffset', String(subsOffset))
    if (invoicesOffset && key !== 'invoicesOffset') next.set('invoicesOffset', String(invoicesOffset))
    if (receiptsOffset && key !== 'receiptsOffset') next.set('receiptsOffset', String(receiptsOffset))
    if (messagesOffset && key !== 'messagesOffset') next.set('messagesOffset', String(messagesOffset))
    if (value > 0) next.set(key, String(value))
    const qs = next.toString()
    return `/admin/clients/${id}${qs ? `?${qs}` : ''}#${key}`
  }

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

        <ClientActionBar prospectId={prospect.id} />
      </div>

      {/* Status header tiles — current state */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatTile
          label="Active projects"
          value={String(activeProjectsCount)}
          accent={activeProjectsCount > 0 ? 'text-emerald-700' : 'text-slate-400'}
        />
        <StatTile
          label="Open tickets"
          value={String(openSupportCount)}
          accent={openSupportCount > 0 ? 'text-amber-600' : 'text-slate-400'}
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

      {/* Upcoming booking */}
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
                  weekday: 'long', month: 'long', day: 'numeric',
                  hour: 'numeric', minute: '2-digit', hour12: true,
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
          {/* Agreements — executed/sent MSAs with links to the signed PDFs. */}
          <AgreementsPanel prospectId={prospect.id} />

          {/* SOWs — past, present, issued. Lives above Projects since SOWs
               drive project + invoice creation through the accept flow. */}
          <Section
            anchor="sowOffset"
            icon={FileText}
            title="Statements of Work"
            count={totalSows}
            empty="No SOWs issued yet."
            createHref={`/admin/sow/new?prospect_id=${prospect.id}`}
            createLabel="Create SOW"
            pagination={{
              offset: sowOffset,
              total: totalSows,
              prevHref: pageHref('sowOffset', Math.max(0, sowOffset - PAGE_SIZE)),
              nextHref: pageHref('sowOffset', sowOffset + PAGE_SIZE),
            }}
          >
            {sows.map((s) => {
              const pricing = (s.pricing ?? {}) as { total_cents?: number; deposit_cents?: number }
              const totalCents = pricing.total_cents ?? 0
              return (
                <Link
                  key={s.id}
                  href={`/admin/sow/${s.id}`}
                  className="block p-3 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900">
                        {s.sow_number ?? 'SOW (no number)'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {s.title || 'Untitled SOW'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        <StatusPill status={s.status} />
                        {s.sent_at && (
                          <span className="ml-2">sent {new Date(s.sent_at).toLocaleDateString()}</span>
                        )}
                        {s.accepted_at && (
                          <span className="ml-2 text-emerald-600">accepted {new Date(s.accepted_at).toLocaleDateString()}</span>
                        )}
                        {s.declined_at && (
                          <span className="ml-2 text-red-600">declined {new Date(s.declined_at).toLocaleDateString()}</span>
                        )}
                        {s.created_at && (
                          <span className="ml-2 text-slate-400">· {new Date(s.created_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    {totalCents > 0 && (
                      <div className="text-right text-sm">
                        <div className="font-semibold text-slate-700 tabular-nums">
                          {formatCents(totalCents)}
                        </div>
                        <div className="text-[10px] text-slate-400">total</div>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </Section>

          {/* Projects — full history, newest first */}
          <Section
            anchor="projectsOffset"
            icon={Folder}
            title="Projects"
            count={totalProjects}
            empty="No projects yet."
            createHref={`/admin/projects/new?prospect_id=${prospect.id}`}
            createLabel="Create project"
            pagination={{
              offset: projectsOffset,
              total: totalProjects,
              prevHref: pageHref('projectsOffset', Math.max(0, projectsOffset - PAGE_SIZE)),
              nextHref: pageHref('projectsOffset', projectsOffset + PAGE_SIZE),
            }}
          >
            {projects.map((p) => {
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
                        <StatusPill status={p.status} />
                        {phaseCount > 0 && <span className="ml-2">{completedPhases}/{phaseCount} phases</span>}
                        {p.created_at && (
                          <span className="ml-2 text-slate-400">· {new Date(p.created_at).toLocaleDateString()}</span>
                        )}
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

          {/* Support & Bug Reports — type IN ('customer_service','bug_report') */}
          <Section
            anchor="supportOffset"
            icon={LifeBuoy}
            title="Support & Bug Reports"
            count={totalSupport}
            empty="No support contacts or bug reports yet."
            createHref={`/admin/projects/new?prospect_id=${prospect.id}&type=customer_service`}
            createLabel="Log support contact"
            extraActions={
              <Link
                href={`/admin/projects/new?prospect_id=${prospect.id}&type=bug_report`}
                className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium whitespace-nowrap"
              >
                <Bug className="w-3.5 h-3.5" />
                Log bug report
              </Link>
            }
            footerAccent={
              openSupportCount > 0 ? (
                <span className="text-amber-600 font-semibold">
                  {openSupportCount} open
                </span>
              ) : null
            }
            pagination={{
              offset: supportOffset,
              total: totalSupport,
              prevHref: pageHref('supportOffset', Math.max(0, supportOffset - PAGE_SIZE)),
              nextHref: pageHref('supportOffset', supportOffset + PAGE_SIZE),
            }}
          >
            {supportTickets.map((p) => {
              const phases = Array.isArray(p.phases) ? p.phases : []
              const phaseCount = phases.length
              const completedPhases = phases.filter(
                (ph: { status?: string }) => ph?.status === 'completed',
              ).length
              const TypeIcon = p.type === 'bug_report' ? Bug : LifeBuoy
              return (
                <Link
                  key={p.id}
                  href={`/admin/projects/${p.id}`}
                  className="block p-3 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-100 text-amber-600">
                      <TypeIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-900 truncate">{p.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        <StatusPill status={p.status} />
                        <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium uppercase">
                          {p.type === 'bug_report' ? 'BUG' : 'SUPPORT'}
                        </span>
                        {phaseCount > 0 && <span className="ml-2">{completedPhases}/{phaseCount} phases</span>}
                        {p.created_at && (
                          <span className="ml-2 text-slate-400">· {new Date(p.created_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </Section>

          {/* Subscriptions — full history, newest first */}
          <Section
            anchor="subsOffset"
            icon={Repeat}
            title="Subscriptions"
            count={totalSubs}
            empty="No subscriptions."
            createHref={`/admin/subscriptions/new?prospect_id=${prospect.id}`}
            createLabel="Create subscription"
            footerAccent={
              totalMrrCents > 0 ? (
                <span className="text-emerald-700 font-semibold">
                  Active MRR: {formatCents(totalMrrCents)}/mo
                </span>
              ) : null
            }
            pagination={{
              offset: subsOffset,
              total: totalSubs,
              prevHref: pageHref('subsOffset', Math.max(0, subsOffset - PAGE_SIZE)),
              nextHref: pageHref('subsOffset', subsOffset + PAGE_SIZE),
            }}
          >
            {subscriptions.map((s) => {
              const monthly = monthlyContribution(s)
              const planName = planOf(s)?.name ?? 'Custom subscription'
              const parentInvoiceNumber = s.parent_invoice_id
                ? parentInvoiceNumberById.get(s.parent_invoice_id) ?? null
                : null
              return (
                <div
                  key={s.id}
                  className="rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition-colors"
                >
                  <Link
                    href={`/admin/subscriptions/${s.id}`}
                    className="block p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{planName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          <StatusPill status={s.status} />
                          {s.status === 'paused' && s.paused_until && (
                            <span className="ml-2">resumes {new Date(s.paused_until).toLocaleDateString()}</span>
                          )}
                          {s.end_date && (
                            <span className="ml-2">ended {new Date(s.end_date).toLocaleDateString()}</span>
                          )}
                          {s.created_at && (
                            <span className="ml-2 text-slate-400">· {new Date(s.created_at).toLocaleDateString()}</span>
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
                  {s.parent_invoice_id && (
                    <div className="px-3 pb-2 -mt-1">
                      <Link
                        href={`/admin/invoices/${s.parent_invoice_id}`}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded px-2 py-0.5 font-medium"
                      >
                        <FileText className="w-3 h-3" /> From {parentInvoiceNumber ?? 'invoice'}
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </Section>

          {/* Invoices — full history, newest first */}
          <Section
            anchor="invoicesOffset"
            icon={FileText}
            title="Invoices"
            count={totalInvoices}
            empty="No invoices yet."
            createHref={`/admin/invoices/new?prospect_id=${prospect.id}`}
            createLabel="Create invoice"
            footerAccent={
              outstandingBalanceCents > 0 ? (
                <span className="text-orange-600 font-semibold">
                  Outstanding: {formatCents(outstandingBalanceCents)}
                </span>
              ) : null
            }
            pagination={{
              offset: invoicesOffset,
              total: totalInvoices,
              prevHref: pageHref('invoicesOffset', Math.max(0, invoicesOffset - PAGE_SIZE)),
              nextHref: pageHref('invoicesOffset', invoicesOffset + PAGE_SIZE),
            }}
          >
            {invoices.map((inv) => {
              const balance = inv.status === 'paid'
                ? 0
                : Math.max(0, (inv.total_due_cents ?? 0) - (receiptsByInvoice.get(inv.id) ?? 0))
              const spawnedSubId =
                ((inv as { subscription_intent?: string }).subscription_intent === 'created' &&
                  (inv as { subscription_id?: string | null }).subscription_id) || null
              return (
                <div
                  key={inv.id}
                  className="rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition-colors"
                >
                  <Link
                    href={`/admin/invoices/${inv.id}`}
                    className="block p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900">
                          {inv.invoice_number}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          <StatusPill status={inv.status} />
                          {inv.sent_at && (
                            <span className="ml-2">sent {new Date(inv.sent_at).toLocaleDateString()}</span>
                          )}
                          {inv.paid_at && (
                            <span className="ml-2 text-emerald-600">paid {new Date(inv.paid_at).toLocaleDateString()}</span>
                          )}
                          {inv.created_at && (
                            <span className="ml-2 text-slate-400">· {new Date(inv.created_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className={`font-semibold tabular-nums ${
                          inv.status === 'paid' ? 'text-slate-500'
                            : balance > 0 ? 'text-orange-600' : 'text-slate-700'
                        }`}>
                          {formatCents(inv.total_due_cents ?? 0)}
                        </div>
                        {inv.status !== 'paid' && balance < (inv.total_due_cents ?? 0) && balance > 0 && (
                          <div className="text-[10px] text-slate-400">{formatCents(balance)} balance</div>
                        )}
                      </div>
                    </div>
                  </Link>
                  {spawnedSubId && (
                    <div className="px-3 pb-2 -mt-1">
                      <Link
                        href={`/admin/subscriptions/${spawnedSubId}`}
                        className="inline-flex items-center gap-1 text-[11px] text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 rounded px-2 py-0.5 font-medium"
                      >
                        <Repeat className="w-3 h-3" /> Spawned subscription
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </Section>

          {/* Receipts — full history, newest first */}
          <Section
            anchor="receiptsOffset"
            icon={ReceiptIcon}
            title="Receipts"
            count={totalReceipts}
            empty="No receipts yet."
            pagination={{
              offset: receiptsOffset,
              total: totalReceipts,
              prevHref: pageHref('receiptsOffset', Math.max(0, receiptsOffset - PAGE_SIZE)),
              nextHref: pageHref('receiptsOffset', receiptsOffset + PAGE_SIZE),
            }}
          >
            {receipts.map((r) => (
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

          {/* Messages — unified communication feed + composer */}
          <Section
            anchor="messagesOffset"
            icon={MessageCircle}
            title="Messages"
            count={totalMessages}
            empty="No communications yet — send the first note below."
            pagination={{
              offset: messagesOffset,
              total: totalMessages,
              prevHref: pageHref('messagesOffset', Math.max(0, messagesOffset - PAGE_SIZE)),
              nextHref: pageHref('messagesOffset', messagesOffset + PAGE_SIZE),
            }}
            footerAccent={null}
          >
            {messagesPage.map((m) => (
              <MessageItem key={m.key} message={m} />
            ))}
            {/* Composer */}
            <form action={createNote} className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <input type="hidden" name="prospect_id" value={prospect.id} />
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Send note to client
              </label>
              <textarea
                name="body"
                required
                rows={3}
                placeholder="Note appears in tomorrow's 9am client digest. Markdown supported."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 resize-y"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Posts to the client portal · queues for the next 9am PT digest.
                </p>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--teal)] text-white text-sm font-semibold hover:bg-[var(--teal-dark)]"
                >
                  <Send className="w-4 h-4" />
                  Send note
                </button>
              </div>
            </form>
          </Section>

          {/* Bottom section — collapsible: documents, sent messages, background. */}
          <div className="space-y-3">
            <DocumentsPanel prospectId={prospect.id} />
            <SentMessagesPanel prospectId={prospect.id} />
            <BackgroundPanel prospectId={prospect.id} />
          </div>
        </div>

        {/* Side column */}
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
                <a href={`mailto:${prospect.owner_email}`} className="flex items-center gap-2 text-teal-600 hover:underline">
                  <Mail className="w-3.5 h-3.5 text-slate-300" />
                  {prospect.owner_email}
                </a>
              )}
              {prospect.owner_phone && (
                <a href={`tel:${prospect.owner_phone}`} className="flex items-center gap-2 text-slate-700 hover:text-teal-600">
                  <Phone className="w-3.5 h-3.5 text-slate-300" />
                  {prospect.owner_phone}
                </a>
              )}
              {prospect.business_phone && prospect.business_phone !== prospect.owner_phone && (
                <a href={`tel:${prospect.business_phone}`} className="flex items-center gap-2 text-slate-600 hover:text-teal-600">
                  <Phone className="w-3.5 h-3.5 text-slate-300" />
                  <span>{prospect.business_phone} <span className="text-slate-400 text-xs">(business)</span></span>
                </a>
              )}
              {prospect.website_url && (
                <a href={prospect.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-teal-600 hover:underline truncate">
                  <Globe className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                  <span className="truncate">{prospect.website_url.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
              {(prospect.address || prospect.city) && (
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-300 mt-0.5" />
                  <div>
                    {prospect.address && <div>{prospect.address}</div>}
                    <div>{[prospect.city, prospect.state, prospect.zip].filter(Boolean).join(', ')}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
              <EditClientButton prospectId={prospect.id} />
            </div>
          </div>

          {/* Activity timeline — full history (MSAs, sends, notes, etc.) carries
               over from the prospect record; the client view is not a blank slate. */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Activity</h3>
            {(activitiesListRes.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">No activity yet.</p>
            ) : (
              <ActivityTimeline activities={(activitiesListRes.data ?? []) as unknown as Parameters<typeof ActivityTimeline>[0]['activities']} />
            )}
          </div>

          {/* Acquisition history collapse */}
          <details className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-600 hover:text-slate-900 select-none">
              Acquisition history
            </summary>
            <div className="px-4 pb-4 text-xs text-slate-500 space-y-2">
              <p>
                Research, scoring breakdown, channels, ratings, raw activity log, and the full
                prospect profile are preserved.
              </p>
              <Link href={`/admin/prospects/${prospect.id}?keepView=1`} className="inline-flex items-center gap-1 text-teal-600 hover:underline">
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
  label, value, accent = 'text-slate-800',
}: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${accent}`}>{value}</div>
    </div>
  )
}

function StatusPill({ status }: { status: string | null | undefined }) {
  if (!status) return null
  const map: Record<string, string> = {
    in_progress: 'bg-emerald-50 text-emerald-700',
    planning: 'bg-blue-50 text-blue-700',
    completed: 'bg-slate-100 text-slate-500',
    on_hold: 'bg-amber-50 text-amber-700',
    cancelled: 'bg-red-50 text-red-700',
    active: 'bg-emerald-50 text-emerald-700',
    trialing: 'bg-blue-50 text-blue-700',
    paused: 'bg-amber-50 text-amber-700',
    cancelled_pending: 'bg-amber-50 text-amber-700',
    draft: 'bg-slate-100 text-slate-500',
    sent: 'bg-blue-50 text-blue-700',
    viewed: 'bg-indigo-50 text-indigo-700',
    paid: 'bg-emerald-50 text-emerald-700',
    void: 'bg-slate-100 text-slate-400 line-through',
    accepted: 'bg-emerald-50 text-emerald-700',
    declined: 'bg-red-50 text-red-700',
  }
  const cls = map[status] ?? 'bg-slate-100 text-slate-600'
  const label = status === 'in_progress' ? 'In progress' : status.replace(/_/g, ' ')
  return (
    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${cls}`}>
      {label}
    </span>
  )
}

function Section({
  anchor, icon: Icon, title, count, empty,
  createHref, createLabel, extraActions, footerAccent, pagination, children,
}: {
  anchor: string
  icon: React.ElementType
  title: string
  count: number
  empty: string
  createHref?: string
  createLabel?: string
  extraActions?: React.ReactNode
  footerAccent?: React.ReactNode
  pagination?: {
    offset: number
    total: number
    prevHref: string
    nextHref: string
  }
  children: React.ReactNode
}) {
  return (
    <div id={anchor} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{title}</span>
          {count > 0 && (
            <span className="text-xs text-slate-400 font-normal normal-case">({count})</span>
          )}
        </h3>
        <div className="flex items-center gap-3 flex-shrink-0">
          {footerAccent && <div className="text-xs">{footerAccent}</div>}
          {extraActions}
          {createHref && createLabel && (
            <Link
              href={createHref}
              className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              {createLabel}
            </Link>
          )}
        </div>
      </div>
      {count === 0 ? (
        <div className="text-center py-6 text-sm text-slate-400">
          <div>{empty}</div>
        </div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
      {pagination && pagination.total > PAGE_SIZE && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            {pagination.offset + 1}–{Math.min(pagination.offset + PAGE_SIZE, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            {pagination.offset > 0 ? (
              <Link
                href={pagination.prevHref}
                className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-slate-300">
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </span>
            )}
            {pagination.offset + PAGE_SIZE < pagination.total ? (
              <Link
                href={pagination.nextHref}
                className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-slate-300">
                Next <ChevronRight className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MessageItem({ message }: { message: {
  when: string
  icon: 'note' | 'email' | 'doc' | 'call' | 'sms' | 'meeting' | 'other'
  title: string
  detail: string
  href?: string
  badge?: string
} }) {
  const iconMap = {
    note: { Icon: MessageCircle, color: 'text-slate-500 bg-slate-100' },
    email: { Icon: Mail, color: 'text-blue-600 bg-blue-100' },
    doc: { Icon: FileText, color: 'text-teal-600 bg-teal-100' },
    call: { Icon: Phone, color: 'text-emerald-600 bg-emerald-100' },
    sms: { Icon: MessageCircle, color: 'text-purple-600 bg-purple-100' },
    meeting: { Icon: Calendar, color: 'text-orange-600 bg-orange-100' },
    other: { Icon: MessageCircle, color: 'text-slate-400 bg-slate-100' },
  }
  const { Icon, color } = iconMap[message.icon] ?? iconMap.other
  const Wrap = message.href
    ? ({ children }: { children: React.ReactNode }) => (
        <Link href={message.href!} className="block p-3 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition-colors">
          {children}
        </Link>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <div className="p-3 rounded-lg border border-slate-200">
          {children}
        </div>
      )
  return (
    <Wrap>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-slate-900 text-sm truncate">{message.title}</div>
            <div className="text-xs text-slate-400 flex-shrink-0">
              {new Date(message.when).toLocaleDateString()}
            </div>
          </div>
          {message.detail && (
            <div className="text-xs text-slate-500 mt-0.5 line-clamp-2 whitespace-pre-wrap">
              {message.detail}
            </div>
          )}
          {message.badge && (
            <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
              {message.badge}
            </span>
          )}
        </div>
      </div>
    </Wrap>
  )
}

function ClientActionBar({ prospectId }: { prospectId: string }) {
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
