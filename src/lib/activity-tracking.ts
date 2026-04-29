// ── activity-tracking.ts ────────────────────────────────────────────
// logViewActivity: write an entry to the prospect activities timeline
// when a public surface (SOW magic link, invoice magic link, quote
// share) is viewed. Captures source IP + user-agent so the prospect
// timeline shows WHO viewed WHAT WITH WHICH BROWSER.
//
// Hunter directive 2026-04-29: every public view should hit the
// activity timeline; bonus credit for the IP.
//
// Dedup policy:
//   First view of a given (prospect_id, type, target_id) per IP per
//   24 hours writes one activity row. Subsequent refreshes within
//   that window are silently dropped so the timeline doesn't fill
//   with refresh noise. Different IP = new row (separate viewer
//   on a different device/network is genuinely a different activity).
//
// Best-effort: a failed insert never breaks the page render. The
// calling route handler swallows any error.

import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type ViewActivityType = 'sow_view' | 'invoice_view' | 'quote_share_view' | 'receipt_view'

export interface LogViewActivityArgs {
  prospect_id: string
  activity_type: ViewActivityType
  /** Document number / sow_number / invoice_number / token — for the subject line. */
  doc_label: string
  /** Optional id (sow_document_id, invoice_id, etc.) for downstream queries. */
  doc_id?: string | null
  /** When the calling route already de-duped (e.g. invoice first-view SMS path), pass true to bypass the 24h-per-IP throttle. */
  always_log?: boolean
}

const DEDUP_WINDOW_HOURS = 24

/**
 * Extracts the request IP from standard proxy headers. Mirrors
 * page-tracking.ts ip resolution — x-forwarded-for first (Vercel +
 * Cloudflare both set this), x-real-ip second.
 */
async function extractClientContext(): Promise<{ ip: string | null; user_agent: string | null }> {
  const h = await headers()
  const fwd = h.get('x-forwarded-for')
  const ip = fwd ? fwd.split(',')[0].trim() : (h.get('x-real-ip') ?? null)
  const user_agent = h.get('user-agent') ?? null
  return { ip, user_agent }
}

/**
 * Look up whether we've already logged this view for this IP within
 * the dedup window. Returns true if we should skip writing a fresh
 * row.
 */
async function isDuplicateViewWithinWindow(
  prospect_id: string,
  activity_type: ViewActivityType,
  doc_id: string | null,
  ip: string | null,
): Promise<boolean> {
  if (!ip) return false  // no IP, can't dedup — write the row
  const since = new Date(Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  // We type-narrow the query: same prospect, same activity-type
  // (which we encode in the activities.type column as e.g.
  // 'sow_view'), same IP, within window. doc_id is matched via the
  // body text since activities don't have a generic foreign key
  // for sow_documents — body contains "SOW SOW-XXX" which we can
  // ILIKE against. Cheap-and-correct.
  let query = supabaseAdmin
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('prospect_id', prospect_id)
    .eq('type', activity_type)
    .eq('ip', ip)
    .gte('created_at', since)

  if (doc_id) {
    // body contains "SOW-XXX" or "INV-XXX" or token suffix — match it
    query = query.ilike('body', `%${doc_id}%`)
  }

  const { count } = await query
  return (count ?? 0) > 0
}

export async function logViewActivity(args: LogViewActivityArgs): Promise<void> {
  try {
    const { ip, user_agent } = await extractClientContext()

    if (!args.always_log) {
      const isDup = await isDuplicateViewWithinWindow(
        args.prospect_id,
        args.activity_type,
        args.doc_id ?? null,
        ip,
      )
      if (isDup) return
    }

    const subject = subjectFor(args.activity_type, args.doc_label)
    const body = bodyFor(args.activity_type, args.doc_label, args.doc_id, ip)

    await supabaseAdmin.from('activities').insert({
      prospect_id: args.prospect_id,
      type: args.activity_type,
      channel: 'web',
      direction: 'inbound',
      subject,
      body,
      ip,
      user_agent,
      created_by: 'system',
    })
  } catch (e) {
    console.error('[logViewActivity] threw:', e instanceof Error ? e.message : e)
  }
}

function subjectFor(type: ViewActivityType, label: string): string {
  switch (type) {
    case 'sow_view': return `Viewed SOW ${label}`
    case 'invoice_view': return `Viewed invoice ${label}`
    case 'quote_share_view': return `Viewed quote share ${label}`
    case 'receipt_view': return `Viewed receipt ${label}`
  }
}

function bodyFor(
  type: ViewActivityType,
  label: string,
  doc_id: string | null | undefined,
  ip: string | null,
): string {
  const parts: string[] = []
  switch (type) {
    case 'sow_view':
      parts.push(`Client opened SOW ${label} via the magic link.`)
      break
    case 'invoice_view':
      parts.push(`Client opened invoice ${label} via the magic link.`)
      break
    case 'quote_share_view':
      parts.push(`Quote share ${label} was opened.`)
      break
    case 'receipt_view':
      parts.push(`Client opened receipt ${label}.`)
      break
  }
  if (doc_id) parts.push(`(${doc_id})`)
  if (ip) parts.push(`From IP ${ip}.`)
  return parts.join(' ')
}
