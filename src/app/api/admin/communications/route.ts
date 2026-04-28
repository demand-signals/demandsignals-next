// GET /api/admin/communications
// Unified communications timeline. Aggregates inbound/outbound messages
// across all channels into a single chronological feed.
//
// Sources (all pulled in parallel, then merged + sorted desc by occurred_at):
//   • email_engagement        — every email send + lifecycle events (delivered/opened/clicked/bounced)
//   • prospect_inquiries      — quick form + contact form submissions
//   • system_notifications    — SMS dispatch outcomes (source LIKE '%_sms')
//
// Optional filters:
//   ?prospect_id=<uuid>       — restrict to a single prospect
//   ?limit=<n>                — page size, default 100, max 500

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface TimelineItem {
  id: string
  channel: 'email' | 'sms' | 'inquiry'
  direction: 'inbound' | 'outbound'
  occurred_at: string
  prospect_id: string | null
  subject: string | null
  body_preview: string | null
  status: string | null
  meta: Record<string, unknown>
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  const url = new URL(request.url)
  const prospectId = url.searchParams.get('prospect_id')
  const limitParam = parseInt(url.searchParams.get('limit') ?? '100', 10)
  const limit = Math.min(500, Math.max(10, isFinite(limitParam) ? limitParam : 100))

  // 1. Email engagement — group by send_id, take latest event per send.
  const emailQuery = supabaseAdmin
    .from('email_engagement')
    .select('id, send_id, kind, event_type, to_address, subject, prospect_id, occurred_at, event_data, invoice_id, sow_document_id, receipt_id')
    .order('occurred_at', { ascending: false })
    .limit(limit * 2)
  if (prospectId) emailQuery.eq('prospect_id', prospectId)
  const { data: emailRaw } = await emailQuery

  // Collapse to one entry per send_id, keeping the most recent event.
  const bySend = new Map<string, any>()
  for (const e of emailRaw ?? []) {
    if (!bySend.has(e.send_id)) bySend.set(e.send_id, e)
  }
  const emailItems: TimelineItem[] = Array.from(bySend.values()).map((e) => ({
    id: `email:${e.send_id}`,
    channel: 'email',
    direction: 'outbound',
    occurred_at: e.occurred_at,
    prospect_id: e.prospect_id,
    subject: e.subject,
    body_preview: `${e.kind} → ${e.to_address ?? '—'}`,
    status: e.event_type,
    meta: {
      kind: e.kind,
      to: e.to_address,
      invoice_id: e.invoice_id,
      sow_document_id: e.sow_document_id,
      receipt_id: e.receipt_id,
    },
  }))

  // 2. Inquiries
  const inquiryQuery = supabaseAdmin
    .from('prospect_inquiries')
    .select('id, source, name, email, business, message, page_url, prospect_id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (prospectId) inquiryQuery.eq('prospect_id', prospectId)
  const { data: inquiriesRaw } = await inquiryQuery

  const inquiryItems: TimelineItem[] = (inquiriesRaw ?? []).map((i) => ({
    id: `inquiry:${i.id}`,
    channel: 'inquiry',
    direction: 'inbound',
    occurred_at: i.created_at,
    prospect_id: i.prospect_id,
    subject: `${i.source === 'quick_form' ? 'Quick inquiry' : 'Contact form'} from ${i.name ?? 'unknown'}`,
    body_preview: i.message ? i.message.slice(0, 180) : `${i.email}${i.business ? ` (${i.business})` : ''}`,
    status: 'received',
    meta: { name: i.name, email: i.email, business: i.business, page_url: i.page_url },
  }))

  // 3. SMS — best-effort from system_notifications (outbound dispatch outcomes only)
  let smsItems: TimelineItem[] = []
  if (!prospectId) {
    const { data: smsRaw } = await supabaseAdmin
      .from('system_notifications')
      .select('id, source, severity, title, body, created_at, context')
      .like('source', '%_sms')
      .order('created_at', { ascending: false })
      .limit(50)
    smsItems = (smsRaw ?? []).map((n) => ({
      id: `sms:${n.id}`,
      channel: 'sms',
      direction: 'outbound',
      occurred_at: n.created_at,
      prospect_id: null,
      subject: n.title,
      body_preview: n.body ? n.body.slice(0, 180) : null,
      status: n.severity === 'error' ? 'failed' : n.severity === 'warning' ? 'partial' : 'sent',
      meta: { source: n.source, context: n.context },
    }))
  }

  const merged = [...emailItems, ...inquiryItems, ...smsItems]
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .slice(0, limit)

  // Hydrate prospect names for items that have a prospect_id.
  const prospectIds = Array.from(new Set(merged.map((m) => m.prospect_id).filter(Boolean) as string[]))
  let prospectNameById = new Map<string, string>()
  if (prospectIds.length > 0) {
    const { data: ps } = await supabaseAdmin
      .from('prospects')
      .select('id, business_name')
      .in('id', prospectIds)
    prospectNameById = new Map((ps ?? []).map((p) => [p.id, p.business_name]))
  }

  const items = merged.map((m) => ({
    ...m,
    prospect_name: m.prospect_id ? prospectNameById.get(m.prospect_id) ?? null : null,
  }))

  return NextResponse.json({ items, count: items.length })
}
