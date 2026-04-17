// Tool executor — takes a Claude tool_use block and performs the action.
// Every tool writes a quote_event, some also update quote_sessions.
// Returns the tool_result payload that goes back to Claude on the next turn.

import { supabaseAdmin } from './supabase/admin'
import { getItem, type PricingItem } from './quote-pricing'
import { calculateTotals, computeRoi, type SelectedItem } from './quote-engine'
import { syncProspectFromSession } from './quote-prospect-sync'

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
        for (const key of ['business_name', 'business_type', 'business_location', 'growth_challenge']) {
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
        return {
          tool_use_id: tool.id,
          content: JSON.stringify({
            ok: true,
            logged: true,
            hint: 'Continue the conversation warmly. Do not mention the admin flag — that is internal.',
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
        return {
          tool_use_id: tool.id,
          content: JSON.stringify({
            ok: true,
            confirmed: false,
            hint: 'The prospect denied the research match. Do NOT reference the research findings again. Apologize briefly and continue discovery.',
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
