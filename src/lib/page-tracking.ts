// ── page-tracking.ts ────────────────────────────────────────────────
// logPageVisit: server-component helper that writes a page_visits row
// with three-layer prospect attribution. See spec §4.7.

import { headers, cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notify } from '@/lib/system-alerts'
import {
  ATTRIBUTION_COOKIE_NAME,
  signAttributionCookie,
  verifyAttributionCookie,
  ATTRIBUTION_COOKIE_OPTIONS,
} from '@/lib/attribution-cookie'

export type PageType = 'invoice' | 'sow' | 'quote' | 'receipt' | 'marketing' | 'admin' | 'other'

export interface LogPageVisitArgs {
  page_url: string
  page_type: PageType
  invoice_id?: string
  sow_document_id?: string
  receipt_id?: string
  quote_session_id?: string
  attributed_prospect_id?: string  // direct from magic-link UUID lookup
  email_send_id?: string           // from ?e= query param
}

export interface LogPageVisitResult {
  visit_id: string | null
  prospect_id: string | null
  attribution_source: 'uuid' | 'cookie' | 'none'
}

/**
 * Logs a page_visits row. Reads request headers + cookies via Next.js
 * server-side APIs (only callable from server components / route handlers).
 *
 * Returns the visit id + resolved prospect_id + attribution source so callers
 * can take downstream actions (e.g. set the cookie via response headers).
 *
 * Never throws — failures notify(severity:'warning') and return null visit_id.
 */
export async function logPageVisit(args: LogPageVisitArgs): Promise<LogPageVisitResult> {
  const h = await headers()
  const c = await cookies()

  // Extract IP + UA + referer
  const fwd = h.get('x-forwarded-for')
  const ip = fwd ? fwd.split(',')[0].trim() : (h.get('x-real-ip') ?? null)
  const user_agent = h.get('user-agent') ?? null
  const referer = h.get('referer') ?? null

  // Read + verify attribution cookie
  const cookieValue = c.get(ATTRIBUTION_COOKIE_NAME)?.value
  const cookiePayload = await verifyAttributionCookie(cookieValue)
  const cookiePid = cookiePayload?.pid ?? null

  // Resolve final prospect_id + attribution source
  let prospect_id: string | null = null
  let attribution_source: 'uuid' | 'cookie' | 'none' = 'none'
  if (args.attributed_prospect_id) {
    prospect_id = args.attributed_prospect_id
    attribution_source = 'uuid'
  } else if (cookiePid) {
    prospect_id = cookiePid
    attribution_source = 'cookie'
  }

  // Insert page_visits row (best-effort)
  let visit_id: string | null = null
  try {
    const { data, error } = await supabaseAdmin
      .from('page_visits')
      .insert({
        page_url: args.page_url,
        page_type: args.page_type,
        invoice_id: args.invoice_id ?? null,
        sow_document_id: args.sow_document_id ?? null,
        receipt_id: args.receipt_id ?? null,
        quote_session_id: args.quote_session_id ?? null,
        prospect_id,
        attribution_source,
        email_send_id: args.email_send_id ?? null,
        ip,
        user_agent,
        referer,
      })
      .select('id')
      .single()
    if (error) {
      await notify({
        severity: 'warning',
        source: 'page_tracking',
        title: 'page_visits insert failed',
        body: error.message,
        context: { page_url: args.page_url, page_type: args.page_type, error_code: error.code ?? 'unknown' },
      })
    } else {
      visit_id = data?.id ?? null
    }
  } catch (e) {
    console.error('[logPageVisit] threw:', e instanceof Error ? e.message : e)
  }

  return { visit_id, prospect_id, attribution_source }
}

/**
 * Issue a fresh attribution cookie for the given prospect_id.
 * Returns the parts to set, or null if signing failed
 * (e.g. ATTRIBUTION_COOKIE_SECRET missing).
 *
 * Caller is responsible for attaching this via cookies().set() in a server
 * component / route handler context that allows mutation.
 */
export async function buildAttributionCookieParts(
  prospectId: string,
): Promise<{ name: string; value: string; options: typeof ATTRIBUTION_COOKIE_OPTIONS } | null> {
  const value = await signAttributionCookie(prospectId)
  if (!value) return null
  return { name: ATTRIBUTION_COOKIE_NAME, value, options: ATTRIBUTION_COOKIE_OPTIONS }
}

/**
 * Returns true when the resolved prospect_id should overwrite the cookie's
 * current pid (UUID attribution wins; new attribution wins over absent cookie).
 */
export function shouldPromoteCookie(
  attribution_source: 'uuid' | 'cookie' | 'none',
  newProspectId: string | null,
  cookiePid: string | null,
): boolean {
  if (attribution_source !== 'uuid') return false
  if (!newProspectId) return false
  return newProspectId !== cookiePid
}
