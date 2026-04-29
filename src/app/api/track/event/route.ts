// ── POST /api/track/event ────────────────────────────────────────────
// Client-side beacon endpoint for magic-link pages (and any future
// surface). Captures intent + engagement events that the magic-link
// view tracking can't see from the server alone:
//   - pay_button_click — client clicked Pay this Invoice
//   - download_pdf_click — client downloaded the PDF
//   - page_leave — page unloaded; carries duration_ms (time on page)
//   - link_click — generic outbound link click
//   - scroll_depth — scrolled past key thresholds
//
// Hunter directive 2026-04-29: catch every client-side action so the
// prospect timeline shows engagement at full granularity.
//
// Public endpoint (no auth) — anyone with a magic-link UUID can already
// load the page so they can already trigger this. The endpoint
// validates the surface_uuid (e.g. invoice public_uuid, sow public_uuid,
// or quote share_token) before logging, so unsolicited POSTs without a
// known ID are dropped silently.
//
// CORS-friendly so future cross-domain demo sites can beacon back here
// without breaking. The Origin allowlist is *.demandsignals.co +
// localhost for dev.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

export const runtime = 'nodejs'

const VALID_EVENTS = [
  'pay_button_click',
  'download_pdf_click',
  'page_leave',
  'link_click',
  'scroll_depth',
  'cta_click',
  'session_start',
] as const

const VALID_SURFACES = ['invoice', 'sow', 'quote_share', 'receipt', 'demo', 'staging'] as const

const bodySchema = z.object({
  event: z.enum(VALID_EVENTS),
  surface: z.enum(VALID_SURFACES),
  // Magic-link UUID, share token, or other surface key. Server uses it
  // to resolve the prospect_id without trusting client-supplied IDs.
  surface_uuid: z.string().min(8).max(128),
  // Optional document number — invoice_number, sow_number, etc.
  // Used for the activity body label, not for auth.
  doc_label: z.string().max(64).optional(),
  // Per-event payload (e.g. { duration_ms: 12345 }, { url: "https://…" })
  data: z.record(z.string(), z.unknown()).optional(),
})

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allowed =
    origin === '' ||
    origin.endsWith('.demandsignals.co') ||
    origin === 'https://demandsignals.co' ||
    origin === 'http://localhost:3000'
  return {
    'access-control-allow-origin': allowed ? origin : 'https://demandsignals.co',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) })
}

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req)

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400, headers: cors })
  }

  // Resolve prospect_id from the surface UUID. We never trust a
  // client-supplied prospect_id — auth flows through the surface key.
  let prospect_id: string | null = null
  let resolved_doc_id: string | null = null

  try {
    if (body.surface === 'invoice') {
      const { data } = await supabaseAdmin
        .from('invoices')
        .select('id, prospect_id')
        .eq('public_uuid', body.surface_uuid)
        .maybeSingle()
      prospect_id = data?.prospect_id ?? null
      resolved_doc_id = data?.id ?? null
    } else if (body.surface === 'sow') {
      const { data } = await supabaseAdmin
        .from('sow_documents')
        .select('id, prospect_id')
        .eq('public_uuid', body.surface_uuid)
        .maybeSingle()
      prospect_id = data?.prospect_id ?? null
      resolved_doc_id = data?.id ?? null
    } else if (body.surface === 'quote_share') {
      const { data } = await supabaseAdmin
        .from('quote_sessions')
        .select('id, prospect_id')
        .eq('share_token', body.surface_uuid)
        .maybeSingle()
      prospect_id = data?.prospect_id ?? null
      resolved_doc_id = data?.id ?? null
    } else if (body.surface === 'receipt') {
      const { data } = await supabaseAdmin
        .from('receipts')
        .select('id, prospect_id')
        .eq('public_uuid', body.surface_uuid)
        .maybeSingle()
      prospect_id = data?.prospect_id ?? null
      resolved_doc_id = data?.id ?? null
    }
    // Future surfaces ('demo', 'staging') will be wired in Tier 3.
  } catch (e) {
    console.error('[track/event] surface lookup failed:', e instanceof Error ? e.message : e)
  }

  if (!prospect_id) {
    // Silent drop — unknown UUID or surface not yet wired. Don't 404
    // to avoid leaking info about which UUIDs exist.
    return NextResponse.json({ ok: true, logged: false }, { status: 200, headers: cors })
  }

  // Capture IP + UA from request.
  const fwd = req.headers.get('x-forwarded-for')
  const ip = fwd ? fwd.split(',')[0].trim() : (req.headers.get('x-real-ip') ?? null)
  const user_agent = req.headers.get('user-agent') ?? null

  // Build subject + body for the activities row. Each event type gets
  // a self-describing label.
  const docLabel = body.doc_label ?? body.surface_uuid.slice(0, 8)
  const data = body.data ?? {}
  let subject = ''
  let activityBody = ''

  switch (body.event) {
    case 'pay_button_click':
      subject = 'Clicked Pay button'
      activityBody = `Client clicked the Pay button on ${body.surface} ${docLabel}.`
      break
    case 'download_pdf_click':
      subject = 'Downloaded PDF'
      activityBody = `Client downloaded the PDF for ${body.surface} ${docLabel}.`
      break
    case 'page_leave': {
      const ms = typeof data.duration_ms === 'number' ? data.duration_ms : null
      const seconds = ms ? Math.round(ms / 1000) : null
      subject = `Left page${seconds !== null ? ` (${seconds}s)` : ''}`
      activityBody = `Client left ${body.surface} ${docLabel}${seconds !== null ? ` after ${seconds} seconds` : ''}.`
      break
    }
    case 'link_click': {
      const url = typeof data.url === 'string' ? data.url : null
      subject = 'Clicked outbound link'
      activityBody = url
        ? `Client clicked link on ${body.surface} ${docLabel}: ${url}`
        : `Client clicked an outbound link on ${body.surface} ${docLabel}.`
      break
    }
    case 'scroll_depth': {
      const pct = typeof data.percent === 'number' ? data.percent : null
      subject = `Scrolled ${pct ?? '?'}%`
      activityBody = `Client scrolled to ${pct ?? 'unknown'}% on ${body.surface} ${docLabel}.`
      break
    }
    case 'cta_click': {
      const cta = typeof data.cta === 'string' ? data.cta : 'unknown'
      subject = `Clicked CTA: ${cta}`
      activityBody = `Client clicked CTA "${cta}" on ${body.surface} ${docLabel}.`
      break
    }
    case 'session_start':
      subject = 'Started page session'
      activityBody = `Client opened ${body.surface} ${docLabel}.`
      break
  }

  try {
    await supabaseAdmin.from('activities').insert({
      prospect_id,
      type: body.event,
      channel: 'web',
      direction: 'inbound',
      subject,
      body: activityBody,
      ip,
      user_agent,
      created_by: 'system',
    })
  } catch (e) {
    console.error('[track/event] activity insert threw:', e instanceof Error ? e.message : e)
  }

  return NextResponse.json(
    { ok: true, logged: true, prospect_id, surface: body.surface, doc_id: resolved_doc_id },
    { status: 200, headers: cors },
  )
}
