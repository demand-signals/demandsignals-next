// Tool executor — takes a Claude tool_use block and performs the action.
// Every tool writes a quote_event, some also update quote_sessions.
// Returns the tool_result payload that goes back to Claude on the next turn.

import { supabaseAdmin } from './supabase/admin'
import { getServiceSync as getItem, hydrateCatalogSnapshot } from './services-catalog-sync'
import { type PricingItem } from './quote-pricing'
import { calculateTotals, computeRoi, type SelectedItem } from './quote-engine'
import { syncProspectFromSession } from './quote-prospect-sync'
import { alertFromSession } from './quote-notify'
import { runResearch } from './quote-research'

/**
 * Re-fire research if it was previously denied AND we now have richer info
 * (business_type or existing_site_url) that could disambiguate the search.
 * Fire-and-forget — never block the tool response on research completion.
 */
async function maybeRetryResearch(session_id: string): Promise<void> {
  try {
    const { data: s } = await supabaseAdmin
      .from('quote_sessions')
      .select('research_confirmed, research_completed_at, business_type, existing_site_url')
      .eq('id', session_id)
      .single()
    if (!s) return
    // Only retry if: previously denied AND we have more info than a bare name
    if (s.research_confirmed !== -1) return
    if (!s.business_type && !s.existing_site_url) return
    // Reset research state so runResearch() will populate fresh findings
    await supabaseAdmin
      .from('quote_sessions')
      .update({
        research_confirmed: null,
        research_started_at: new Date().toISOString(),
      })
      .eq('id', session_id)
    // Fire-and-forget
    runResearch(session_id).catch(() => {})
  } catch {
    // Never let a research retry failure break the main flow
  }
}

export interface ToolUse {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResult {
  tool_use_id: string
  content: string
  is_error?: boolean
}

async function logEvent(session_id: string, event_type: string, event_data: Record<string, unknown>) {
  await supabaseAdmin.from('quote_events').insert({ session_id, event_type, event_data })
}

async function recomputeAndGetTotals(session_id: string): Promise<{
  selectedItems: SelectedItem[]
  totals: ReturnType<typeof calculateTotals>
}> {
  // Ask Postgres to rebuild selected_items from the event stream.
  await supabaseAdmin.rpc('recompute_session_state', { p_session_id: session_id })
  const { data } = await supabaseAdmin
    .from('quote_sessions')
    .select('selected_items')
    .eq('id', session_id)
    .single()
  const selectedItems = (Array.isArray(data?.selected_items) ? data.selected_items : []) as SelectedItem[]
  const totals = calculateTotals(selectedItems)
  // Persist derived totals (best-effort).
  await supabaseAdmin
    .from('quote_sessions')
    .update({
      estimate_low: totals.upfrontLow,
      estimate_high: totals.upfrontHigh,
      monthly_low: totals.monthlyLow,
      monthly_high: totals.monthlyHigh,
      timeline_weeks_low: totals.timelineWeeksLow,
      timeline_weeks_high: totals.timelineWeeksHigh,
      accuracy_pct: totals.accuracyPct,
    })
    .eq('id', session_id)
  return { selectedItems, totals }
}

export async function executeTool(session_id: string, tool: ToolUse): Promise<ToolResult> {
  // Warm the DB-backed catalog snapshot so downstream sync getItem lookups
  // hit fresh pricing from services_catalog (falls back to legacy TS CATALOG
  // if DB fetch fails). Harmless on repeat calls — snapshot cached per invocation.
  await hydrateCatalogSnapshot()
  try {
    switch (tool.name) {
      case 'add_item': {
        const item_id = String(tool.input.item_id ?? '')
        const item = getItem(item_id)
        if (!item) {
          return { tool_use_id: tool.id, content: JSON.stringify({ error: `unknown item_id: ${item_id}` }), is_error: true }
        }
        const quantity = typeof tool.input.quantity === 'number' ? Math.max(1, Math.floor(tool.input.quantity)) : item.defaultQuantity ?? 1
        const narrowing_answers = (tool.input.narrowing_answers && typeof tool.input.narrowing_answers === 'object')
          ? tool.input.narrowing_answers
          : {}
        await logEvent(session_id, 'item_added', { item_id, quantity, narrowing_answers })
        const { totals } = await recomputeAndGetTotals(session_id)
        // Enrich existing prospect (if created) with updated scope_summary.
        // Non-creating — only updates records that already exist.
        await syncProspectFromSession(session_id, 'item_changed')
        return {
          tool_use_id: tool.id,
          content: JSON.stringify({
            ok: true,
            item: { id: item.id, name: item.name, benefit: item.benefit },
            quantity,
            totals: {
              upfront_low: totals.upfrontLow,
              upfront_high: totals.upfrontHigh,
              monthly_low: totals.monthlyLow,
              monthly_high: totals.monthlyHigh,
              accuracy_pct: totals.accuracyPct,
            },
          }),
        }
      }

      case 'remove_item': {
        const item_id = String(tool.input.item_id ?? '')
        await logEvent(session_id, 'item_removed', { item_id })
        const { totals } = await recomputeAndGetTotals(session_id)
        await syncProspectFromSession(session_id, 'item_changed')
        return {
          tool_use_id: tool.id,
          content: JSON.stringify({
            ok: true,
            totals: {
              upfront_low: totals.upfrontLow,
              upfront_high: totals.upfrontHigh,
              monthly_low: totals.monthlyLow,
              monthly_high: totals.monthlyHigh,
            },
          }),
        }
      }

      case 'adjust_item': {
        const item_id = String(tool.input.item_id ?? '')
        const payload: Record<string, unknown> = { item_id }
        if (typeof tool.input.quantity === 'number') payload.quantity = Math.max(1, Math.floor(tool.input.quantity))
        if (tool.input.narrowing_answers && typeof tool.input.narrowing_answers === 'object') {
          payload.narrowing_answers = tool.input.narrowing_answers
        }
        await logEvent(session_id, 'item_adjusted', payload)
        const { totals } = await recomputeAndGetTotals(session_id)
        await syncProspectFromSession(session_id, 'item_changed')
        return {
          tool_use_id: tool.id,
          content: JSON.stringify({ ok: true, totals: { upfront_low: totals.upfrontLow, upfront_high: totals.upfrontHigh } }),
        }
      }

      case 'set_business_profile': {
        const updates: Record<string, unknown> = {}
        for (const key of ['business_name', 'business_type', 'business_location', 'growth_challenge', 'person_name', 'person_role']) {
          const v = tool.input[key]
          if (typeof v === 'string' && v.length > 0 && v.length < 500) updates[key] = v
        }
        for (const key of ['location_count', 'service_count']) {
          const v = tool.input[key]
          if (typeof v === 'number' && v >= 0 && v < 10000) updates[key] = Math.floor(v)
        }
        if (Object.keys(updates).length > 0) {
          await supabaseAdmin.from('quote_sessions').update(updates).eq('id', session_id)
          await logEvent(session_id, 'business_profile_updated', updates)
          // Enrich existing prospect if present (non-creating).
          await syncProspectFromSession(session_id, 'item_changed')
          // Re-fire research if it was previously denied — business_type
          // addition often disambiguates a common name. "McHale" alone hits
          // a law firm; "McHale backpack" hits McHale Packs.
          if ('business_type' in updates) {
            await maybeRetryResearch(session_id)
          }
        }
        return { tool_use_id: tool.id, content: JSON.stringify({ ok: true, updated: Object.keys(updates) }) }
      }

      case 'set_build_path': {
        const build_path = tool.input.build_path
        if (build_path !== 'new' && build_path !== 'existing' && build_path !== 'rebuild') {
          return { tool_use_id: tool.id, content: JSON.stringify({ error: 'invalid build_path' }), is_error: true }
        }
        const updates: Record<string, unknown> = { build_path }
        if (typeof tool.input.existing_site_url === 'string' && tool.input.existing_site_url.startsWith('http')) {
          updates.existing_site_url = tool.input.existing_site_url
        }
        await supabaseAdmin.from('quote_sessions').update(updates).eq('id', session_id)
        await logEvent(session_id, 'discovery_fork', { path: build_path, existing_site_url: updates.existing_site_url ?? null })
        await syncProspectFromSession(session_id, 'item_changed')
        // If research was denied previously AND we now have a URL, re-fire
        // research — the URL is a stronger anchor than name alone and will
        // find the correct business. Fire-and-forget (don't block the tool response).
        if (updates.existing_site_url) {
          await maybeRetryResearch(session_id)
        }
        return { tool_use_id: tool.id, content: JSON.stringify({ ok: true, build_path }) }
      }

      case 'calculate_roi': {
        const leads = Number(tool.input.missed_leads_monthly)
        const value = Number(tool.input.avg_customer_value_cents)
        if (!Number.isFinite(leads) || !Number.isFinite(value) || leads <= 0 || value <= 0) {
          return { tool_use_id: tool.id, content: JSON.stringify({ error: 'invalid inputs — both must be positive numbers' }), is_error: true }
        }
        await supabaseAdmin
          .from('quote_sessions')
          .update({
            missed_leads_monthly: Math.floor(leads),
            avg_customer_value: Math.floor(value),
          })
          .eq('id', session_id)
        const { data: sess } = await supabaseAdmin
          .from('quote_sessions')
          .select('estimate_low, estimate_high')
          .eq('id', session_id)
          .single()
        const midpoint = Math.round(((sess?.estimate_low ?? 0) + (sess?.estimate_high ?? 0)) / 2)
        const roi = computeRoi(Math.floor(leads), Math.floor(value), midpoint)
        await logEvent(session_id, 'roi_calculated', { leads, value, roi })
        return {
          tool_use_id: tool.id,
          content: JSON.stringify({
            ok: true,
            monthly_lost_cents: roi?.monthlyLostCents ?? 0,
            annual_lost_cents: roi?.annualLostCents ?? 0,
            payback_months: roi?.paybackMonths,
            display: roi?.display ?? 'none',
          }),
        }
      }

      case 'request_phone_verify': {
        const reason = typeof tool.input.reason === 'string' ? tool.input.reason : 'natural pause'
        await logEvent(session_id, 'phone_verify_requested', { reason })
        return {
          tool_use_id: tool.id,
          content: JSON.stringify({
            ok: true,
            ui_action: 'show_phone_verify_gate',
            hint: 'The UI will now render the phone verification card. Speak the phone-gate line in your reply.',
          }),
        }
      }

      case 'trigger_handoff': {
        const reason = typeof tool.input.reason === 'string' ? tool.input.reason : 'hot signal'
        await supabaseAdmin.from('quote_sessions').update({ handoff_offered: true }).eq('id', session_id)
        await logEvent(session_id, 'handoff_triggered', { reason })
        // Alert the team in real time — buy signal hot prospects need fast response.
        alertFromSession(session_id, 'hot_handoff', reason).catch(() => {})
        return { tool_use_id: tool.id, content: JSON.stringify({ ok: true, handoff_offered: true }) }
      }

      case 'offer_soft_save': {
        const reason = typeof tool.input.reason === 'string' ? tool.input.reason : 'prospect hesitation'
        await logEvent(session_id, 'soft_save_offered', { reason })
        // UI reads this event + renders the inline card. The chat response will
        // naturally mention "saved a link for you" — no modal, no popup.
        return {
          tool_use_id: tool.id,
          content: JSON.stringify({
            ok: true,
            ui_action: 'show_soft_save_card',
            hint: 'Reply warmly, acknowledging they want to take their time. The UI is now showing a card with their shareable URL and an email option. Point to it naturally: "I saved your plan at the link on the right — bookmark it or shoot it to yourself via email whenever you want." Do NOT push phone verify again.',
          }),
        }
      }

      case 'flag_walkaway_risk': {
        const signal = typeof tool.input.signal === 'string' ? tool.input.signal : 'unspecified exit signal'
        // Mark session with a hot-walkaway flag via handoff_offered=true so admin
        // queue picks it up. We reuse the existing column since it semantically
        // means "human should look at this session."
        await supabaseAdmin.from('quote_sessions').update({ handoff_offered: true }).eq('id', session_id)
        await logEvent(session_id, 'hot_walkaway_risk', { signal })
        // Push enrichment to the prospect record too — adds walkaway-risk tag
        // and an activity entry so the human team can reach out proactively.
        await syncProspectFromSession(session_id, 'walkaway_flagged')
        // Real-time alert email to Hunter — the human team can reach out within
        // the hour before the prospect fully cools off. Fire-and-forget.
        alertFromSession(session_id, 'hot_walkaway', signal).catch(() => {})
        return {
          tool_use_id: tool.id,
          content: JSON.stringify({
            ok: true,
            logged: true,
            hint: 'Continue the conversation warmly. Do not mention the admin flag — that is internal.',
          }),
        }
      }

      case 'capture_attendee_email': {
        const email = typeof tool.input.email === 'string' ? tool.input.email.trim().toLowerCase() : ''
        // Basic shape check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return {
            tool_use_id: tool.id,
            content: JSON.stringify({ ok: false, reason: 'invalid_email' }),
          }
        }
        // Reject obvious placeholders + known disposable domains. The AI
        // was happily accepting "none@none.com" — that's a non-deliverable
        // address and burning a real booking on it sends the calendar
        // invite into the void.
        const domain = email.split('@')[1]
        const localPart = email.split('@')[0]
        const PLACEHOLDER_DOMAINS = new Set([
          'none.com', 'none.none', 'example.com', 'example.org', 'example.net',
          'test.com', 'test.test', 'fake.com', 'noemail.com', 'na.com',
          'asdf.com', 'abc.com', 'xxx.com', 'localhost', 'email.com',
        ])
        const PLACEHOLDER_LOCALS = new Set([
          'none', 'no', 'na', 'n/a', 'nope', 'test', 'fake', 'asdf', 'abc',
          'noemail', 'noreply', 'donotreply', 'do-not-reply', 'placeholder',
          'x', 'xxx', 'aaa', 'qwerty',
        ])
        if (PLACEHOLDER_DOMAINS.has(domain) || PLACEHOLDER_LOCALS.has(localPart)) {
          return {
            tool_use_id: tool.id,
            content: JSON.stringify({
              ok: false,
              reason: 'placeholder_email',
              hint: 'The email looks like a placeholder (none@none.com, test@test.com, etc.). Push back warmly: "That looks like a placeholder — what is the real best email to send the invite to?" Do not accept it.',
            }),
          }
        }
        // Reject email addresses that match the business name with a
        // single-character local part — usually fake "z@moiraebrewing.com"
        if (localPart.length === 1) {
          return {
            tool_use_id: tool.id,
            content: JSON.stringify({
              ok: false,
              reason: 'suspiciously_short',
              hint: 'That email is just one character before the @. Ask for a more complete address.',
            }),
          }
        }
        await supabaseAdmin
          .from('quote_sessions')
          .update({ attendee_email: email })
          .eq('id', session_id)
        await logEvent(session_id, 'attendee_email_captured', { email_domain: domain })
        return { tool_use_id: tool.id, content: JSON.stringify({ ok: true }) }
      }

      case 'offer_meeting_slots': {
        try {
          const { listAvailableSlots } = await import('@/lib/bookings')
          const slots = await listAvailableSlots({ count: 2 })
          if (slots.length === 0) {
            return {
              tool_use_id: tool.id,
              content: JSON.stringify({ ok: false, reason: 'no_slots_available' }),
            }
          }
          await supabaseAdmin
            .from('quote_sessions')
            .update({ offered_slot_ids: slots.map((s) => s.id) })
            .eq('id', session_id)
          await logEvent(session_id, 'meeting_slots_offered', { count: slots.length })
          return {
            tool_use_id: tool.id,
            content: JSON.stringify({
              ok: true,
              slots: slots.map((s) => ({ id: s.id, display_label: s.display_label })),
            }),
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          if (msg === 'calendar_disconnected') {
            return {
              tool_use_id: tool.id,
              content: JSON.stringify({ ok: false, reason: 'calendar_disconnected' }),
            }
          }
          return {
            tool_use_id: tool.id,
            content: JSON.stringify({ ok: false, reason: 'unknown', detail: msg }),
          }
        }
      }

      case 'book_meeting': {
        const slot_id = typeof tool.input.slot_id === 'string' ? tool.input.slot_id : ''
        if (!slot_id) {
          return { tool_use_id: tool.id, content: JSON.stringify({ ok: false, reason: 'missing_slot_id' }) }
        }
        const { data: sess } = await supabaseAdmin
          .from('quote_sessions')
          .select('attendee_email, prospect_id, business_name, offered_slot_ids')
          .eq('id', session_id)
          .single()
        if (!sess?.attendee_email) {
          return { tool_use_id: tool.id, content: JSON.stringify({ ok: false, reason: 'no_attendee_email' }) }
        }
        const offeredIds = Array.isArray(sess.offered_slot_ids) ? (sess.offered_slot_ids as string[]) : []
        if (!offeredIds.includes(slot_id)) {
          return { tool_use_id: tool.id, content: JSON.stringify({ ok: false, reason: 'slot_not_offered' }) }
        }

        const { bookSlot } = await import('@/lib/bookings')
        const result = await bookSlot({
          slot_id,
          attendee_email: sess.attendee_email,
          source: 'quote',
          quote_session_id: session_id,
          prospect_id: sess.prospect_id ?? undefined,
          context_for_summary: `Demand Signals — ${sess.business_name ?? 'strategy call'}`,
          context_for_description: `Strategy call with ${sess.attendee_email} from /quote conversation. Session: ${session_id}.`,
        })
        if (!result.ok) {
          return { tool_use_id: tool.id, content: JSON.stringify({ ok: false, reason: result.reason }) }
        }
        await logEvent(session_id, 'meeting_booked', {
          booking_id: result.booking_id,
          start_at: result.start_at,
        })
        return {
          tool_use_id: tool.id,
          content: JSON.stringify({
            ok: true,
            booked: true,
            start_at: result.start_at,
            meet_link: result.meet_link,
          }),
        }
      }

      case 'confirm_research_match': {
        const confirmed = tool.input.confirmed === true
        await supabaseAdmin
          .from('quote_sessions')
          .update({ research_confirmed: confirmed ? 1 : -1 })
          .eq('id', session_id)
        await logEvent(session_id, confirmed ? 'research_confirmed' : 'research_denied', {})
        // On confirmation → create/enrich the prospect immediately.
        if (confirmed) {
          const prospectId = await syncProspectFromSession(session_id, 'research_confirmed')
          return {
            tool_use_id: tool.id,
            content: JSON.stringify({
              ok: true,
              confirmed: true,
              prospect_created_or_updated: Boolean(prospectId),
              hint: 'The prospect record now exists in the CRM and will be enriched as the conversation continues. Keep going with observations and recommendations.',
            }),
          }
        }
        // On denial → clear research and let the AI know to retry once it
        // gets more info (URL, business_type). The retry fires when the AI
        // calls set_business_profile with new data later.
        await supabaseAdmin
          .from('quote_sessions')
          .update({
            research_findings: null,
            research_started_at: null,
            research_completed_at: null,
            research_surfaced_at: null,
          })
          .eq('id', session_id)
        return {
          tool_use_id: tool.id,
          content: JSON.stringify({
            ok: true,
            confirmed: false,
            hint: 'Research match denied. Apologize briefly, continue discovery. Once you learn more (URL, business type), the system will re-fire research automatically with better query terms.',
          }),
        }
      }

      default:
        return { tool_use_id: tool.id, content: JSON.stringify({ error: `unknown tool: ${tool.name}` }), is_error: true }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'tool execution failed'
    return { tool_use_id: tool.id, content: JSON.stringify({ error: msg }), is_error: true }
  }
}
