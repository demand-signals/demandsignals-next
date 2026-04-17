// Session helpers — create, fetch, update quote_sessions from API routes.
// All writes go through supabaseAdmin (service role) since anon has no table access.
// Authorization is session_token based: client sends x-session-token header,
// we match against quote_sessions.session_token to prove ownership.

import crypto from 'node:crypto'
import { NextRequest } from 'next/server'
import { supabaseAdmin } from './supabase/admin'
import { getCatalogVersion } from './quote-ai-budget'

export interface QuoteSessionRow {
  id: string
  session_token: string
  share_token: string
  status: string
  prospect_id: string | null
  business_name: string | null
  business_type: string | null
  business_location: string | null
  phone_verified: boolean
  phone_last_four: string | null
  email: string | null
  selected_items: unknown
  estimate_low: number | null
  estimate_high: number | null
  monthly_low: number | null
  monthly_high: number | null
  payment_preference: string | null
  accuracy_pct: number
  discovery_answers: Record<string, unknown>
  build_path: string | null
  missed_leads_monthly: number | null
  avg_customer_value: number | null
  conversion_action: string | null
  handoff_offered: boolean
  catalog_version: string | null
  total_tokens_used: number
  total_cost_cents: number
  last_ai_request_at: string | null
  research_findings: unknown | null
  research_started_at: string | null
  research_completed_at: string | null
  research_surfaced_at: string | null
  research_confirmed: number | null
  existing_site_url: string | null
  created_at: string
  updated_at: string
}

function genToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export interface CreateSessionInput {
  referrer?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  device?: 'desktop' | 'mobile' | 'tablet'
  user_agent?: string
  ip_address?: string
  screen_resolution?: string
  browser_language?: string
}

export async function createSession(input: CreateSessionInput = {}): Promise<QuoteSessionRow> {
  const session_token = genToken()
  const share_token = genToken()
  const catalog_version = await getCatalogVersion()

  const { data, error } = await supabaseAdmin
    .from('quote_sessions')
    .insert({
      session_token,
      share_token,
      catalog_version,
      referrer: input.referrer ?? null,
      utm_source: input.utm_source ?? null,
      utm_medium: input.utm_medium ?? null,
      utm_campaign: input.utm_campaign ?? null,
      device: input.device ?? null,
      user_agent: input.user_agent ?? null,
      ip_address: input.ip_address ?? null,
      screen_resolution: input.screen_resolution ?? null,
      browser_language: input.browser_language ?? null,
    })
    .select('*')
    .single()

  if (error || !data) throw new Error(`createSession: ${error?.message ?? 'no data'}`)

  await supabaseAdmin.from('quote_events').insert({
    session_id: data.id,
    event_type: 'session_created',
    event_data: { referrer: input.referrer, utm_source: input.utm_source },
  })

  return data as QuoteSessionRow
}

export async function getSessionByToken(session_token: string): Promise<QuoteSessionRow | null> {
  if (!session_token) return null
  const { data, error } = await supabaseAdmin
    .from('quote_sessions')
    .select('*')
    .eq('session_token', session_token)
    .maybeSingle()
  if (error) throw new Error(`getSessionByToken: ${error.message}`)
  return (data as QuoteSessionRow | null) ?? null
}

export async function getSessionByShareToken(share_token: string): Promise<QuoteSessionRow | null> {
  if (!share_token) return null
  const { data, error } = await supabaseAdmin
    .from('quote_sessions')
    .select('*')
    .eq('share_token', share_token)
    .maybeSingle()
  if (error) throw new Error(`getSessionByShareToken: ${error.message}`)
  return (data as QuoteSessionRow | null) ?? null
}

export async function getSessionById(id: string): Promise<QuoteSessionRow | null> {
  const { data, error } = await supabaseAdmin
    .from('quote_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`getSessionById: ${error.message}`)
  return (data as QuoteSessionRow | null) ?? null
}

/**
 * Authorize an inbound request by session_token header.
 * Returns { session } or { error } with an appropriate NextResponse.
 */
export async function authorizeSession(req: NextRequest): Promise<
  | { session: QuoteSessionRow }
  | { error: { status: number; message: string } }
> {
  const token = req.headers.get('x-session-token') ?? ''
  if (!token) return { error: { status: 401, message: 'missing x-session-token header' } }
  const session = await getSessionByToken(token)
  if (!session) return { error: { status: 404, message: 'session not found' } }
  if (session.status === 'blocked') {
    return { error: { status: 403, message: 'session is blocked' } }
  }
  return { session }
}

/**
 * Sanitized public view of the session — safe to return to the prospect's browser.
 * Strips the session_token and any server-only fields.
 */
export function publicView(session: QuoteSessionRow) {
  return {
    id: session.id,
    share_token: session.share_token,
    status: session.status,
    business_name: session.business_name,
    business_type: session.business_type,
    business_location: session.business_location,
    phone_verified: session.phone_verified,
    phone_last_four: session.phone_last_four,
    email: session.email,
    selected_items: session.selected_items,
    estimate_low: session.estimate_low,
    estimate_high: session.estimate_high,
    monthly_low: session.monthly_low,
    monthly_high: session.monthly_high,
    payment_preference: session.payment_preference,
    accuracy_pct: session.accuracy_pct,
    build_path: session.build_path,
    missed_leads_monthly: session.missed_leads_monthly,
    avg_customer_value: session.avg_customer_value,
    handoff_offered: session.handoff_offered,
    created_at: session.created_at,
    updated_at: session.updated_at,
  }
}
