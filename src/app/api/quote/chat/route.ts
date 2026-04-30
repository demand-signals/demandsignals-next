import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizeSession } from '@/lib/quote-session'
import {
  preflightOrThrow,
  BudgetViolation,
  pickModel,
  recordUsage,
  shouldSummarize,
  getBookingSlots,
} from '@/lib/quote-ai-budget'
import {
  anthropic,
  buildStaticSystemPrompt,
  buildCatalogPrompt,
  buildDynamicContext,
  TOOLS,
} from '@/lib/quote-ai'
import { applyOutputPolicy, regenerationNudge, scanOutput } from '@/lib/quote-output-scan'
import { executeTool, type ToolUse } from '@/lib/quote-tools'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { alertFromSession } from '@/lib/quote-notify'
import { extractNameAndLocation } from '@/lib/quote-intro-parser'
import type Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

const bodySchema = z.object({
  message: z.string().min(1).max(4000),
})

// Fetch prior messages and shape them for the Claude API.
//
// Trimming strategy: beyond the first 24 messages we collapse the oldest half
// into a bracketed summary placeholder. That keeps input tokens flat as the
// conversation grows, which is the single biggest driver of session cost.
// The full transcript always remains in the DB — this only affects what's
// re-sent to Claude each turn.
async function loadHistory(session_id: string): Promise<Anthropic.MessageParam[]> {
  const { data } = await supabaseAdmin
    .from('quote_messages')
    .select('role, content, created_at')
    .eq('session_id', session_id)
    .order('created_at', { ascending: true })
  if (!data) return []

  const convo = data.filter((m) => m.role === 'ai' || m.role === 'user')

  const KEEP_RECENT = 24 // roughly the last 12 Q/A exchanges
  if (convo.length <= KEEP_RECENT) {
    return convo.map((m) => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content,
    })) as Anthropic.MessageParam[]
  }

  // Too long — collapse the oldest messages into a single "prior conversation"
  // summary and pair it with the recent tail.
  const trimCount = convo.length - KEEP_RECENT
  const oldest = convo.slice(0, trimCount)
  const recent = convo.slice(trimCount)

  const summary = oldest
    .map((m) => `${m.role === 'ai' ? 'AI' : 'Prospect'}: ${m.content.slice(0, 200)}`)
    .join('\n')
  const summaryMessage: Anthropic.MessageParam = {
    role: 'user',
    content: `[Earlier in this conversation — summarized for context, do not re-ask these facts:]\n${summary}\n[End earlier context — continue with most recent turns below.]`,
  }
  const recentShaped = recent.map((m) => ({
    role: m.role === 'ai' ? 'assistant' : 'user',
    content: m.content,
  })) as Anthropic.MessageParam[]

  return [summaryMessage, ...recentShaped]
}

function estimateTokens(text: string): number {
  // Rough heuristic: 1 token ≈ 4 chars for English text. Safe overestimate.
  return Math.ceil(text.length / 3.5)
}

/**
 * Remove cache_control from the last block of the last message in a
 * conversation array. Used in the round-trip loop before appending new
 * messages so the cache breakpoint always sits at the END of the
 * array, never buried mid-conversation.
 *
 * Anthropic only respects cache_control on the FINAL message of a
 * request. Leaving it on a buried message wastes the cache-write fee
 * (25% premium) without giving us a usable cache read on subsequent
 * round trips.
 */
function stripTailCacheControl(
  msgs: Anthropic.MessageParam[],
): Anthropic.MessageParam[] {
  if (msgs.length === 0) return msgs
  const lastIdx = msgs.length - 1
  const last = msgs[lastIdx]
  if (typeof last.content === 'string') return msgs  // string content can't carry cache_control
  const blocks = [...last.content]
  if (blocks.length === 0) return msgs
  const lastBlockIdx = blocks.length - 1
  const lastBlock = blocks[lastBlockIdx]
  // Use index-signature cast to read cache_control without TS narrowing.
  const lastBlockObj = lastBlock as unknown as Record<string, unknown>
  if (!('cache_control' in lastBlockObj)) return msgs
  // Clone without cache_control. Spread into a fresh object, drop key.
  const cleanedBlock = { ...lastBlockObj }
  delete cleanedBlock.cache_control
  blocks[lastBlockIdx] = cleanedBlock as unknown as typeof lastBlock
  const cleaned = [...msgs]
  cleaned[lastIdx] = { role: last.role, content: blocks } as Anthropic.MessageParam
  return cleaned
}

export async function POST(request: NextRequest) {
  // Auth
  const auth = await authorizeSession(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status })
  }
  const { session } = auth

  // Parse body
  let parsed
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const { message: userText } = parsed

  // Preflight budget
  try {
    await preflightOrThrow(session.id, estimateTokens(userText))
  } catch (e) {
    if (e instanceof BudgetViolation) {
      await supabaseAdmin.from('quote_messages').insert({
        session_id: session.id,
        role: 'system',
        content: `[budget_violation:${e.reason}] ${e.message}`,
        channel: 'web',
      })

      // Check whether we've already fired a handoff for this session's budget
      // violation. Idempotency guard — don't re-alert every turn.
      const { data: existingEvent } = await supabaseAdmin
        .from('quote_events')
        .select('id')
        .eq('session_id', session.id)
        .eq('event_type', 'budget_violation_handoff')
        .limit(1)
        .maybeSingle()

      if (!existingEvent) {
        // First hit — escalate: flag as walkaway risk, fire email alert,
        // flip handoff_offered so admin queue picks up.
        await supabaseAdmin
          .from('quote_sessions')
          .update({ handoff_offered: true })
          .eq('id', session.id)
        await supabaseAdmin.from('quote_events').insert({
          session_id: session.id,
          event_type: 'budget_violation_handoff',
          event_data: { reason: e.reason },
        })
        // Fire-and-forget alert email
        alertFromSession(
          session.id,
          'hot_handoff',
          `Budget cap hit (${e.reason}) — prospect was mid-conversation. Reach out personally.`,
        ).catch(() => {})
      }

      return NextResponse.json(
        {
          budget_violation: true,
          reason: e.reason,
          message: e.userFacingMessage,
          // Flag tells the client to disable the input and show a "we'll reach
          // out" card instead of echoing the message every turn.
          disable_input: true,
          escalated: true,
        },
        { status: 200 },
      )
    }
    throw e
  }

  // INTRO PRE-PARSER — only fires when this is plausibly the first turn
  // (no business_name AND no business_location captured yet). Prevents
  // the bug where a prospect answers "Demand Signals in El Dorado Hills"
  // and the AI extracts business_name but ignores location, then re-asks
  // for the business name. We pull both fields out deterministically and
  // write them to the session BEFORE the AI sees the message, so the
  // AI's dynamic context already shows both slots filled.
  if (!session.business_name && !session.business_location) {
    const extracted = extractNameAndLocation(userText)
    if (extracted.businessName || extracted.location) {
      const updates: Record<string, string> = {}
      if (extracted.businessName) updates.business_name = extracted.businessName
      if (extracted.location) updates.business_location = extracted.location
      await supabaseAdmin
        .from('quote_sessions')
        .update(updates)
        .eq('id', session.id)
      // Mutate the in-memory session reference so buildDynamicContext
      // (called below) sees the freshly-extracted values without an extra
      // round-trip to the DB.
      Object.assign(session, updates)
      // Log the event for analytics (and so the AI's tool history shows
      // the business profile was already captured).
      await supabaseAdmin.from('quote_events').insert({
        session_id: session.id,
        event_type: 'intro_pre_parsed',
        event_data: updates,
      })
    }
  }

  // Persist the user message first — this gives us a row to attribute tokens against
  // and makes the transcript durable even if streaming fails.
  const { data: userMsg, error: umErr } = await supabaseAdmin
    .from('quote_messages')
    .insert({
      session_id: session.id,
      role: 'user',
      content: userText,
      channel: 'web',
    })
    .select('id')
    .single()
  if (umErr || !userMsg) {
    return NextResponse.json({ error: 'failed to persist user message' }, { status: 500 })
  }

  // Build messages history. The new user turn (with dynamic context
  // prefix) is built later in this function, after dynamicContextText
  // is declared in the system-block section.
  const history = await loadHistory(session.id)
  // history already includes the just-inserted row; drop duplicates at tail
  if (history.length > 0 && history[history.length - 1].role === 'user') {
    history.pop()
  }

  // Pick model — count stored messages for Opus bump
  const messageCount = history.length + 1
  const model = pickModel({
    messageCount,
    estimateHighCents: session.estimate_high,
    confusionSignals: 0,
  })

  // System prompt — STATIC ONLY, fully cached. Dynamic context used to
  // sit here as a second uncached block, but that broke cache breakpoints
  // on tools + messages because the cached prefix has to match exactly.
  // Solution: dynamic context now ships INSIDE the user message (below)
  // as a wrapped prefix. That keeps the system prompt cached forever,
  // tools cached forever, and the only uncached input per turn is the
  // freshly-built dynamic context + the user's actual text.
  const systemBlocks: Anthropic.TextBlockParam[] = [
    {
      type: 'text',
      text: buildStaticSystemPrompt() + '\n\n' + buildCatalogPrompt(),
      cache_control: { type: 'ephemeral' },
    },
  ]

  // Build the dynamic context separately — it'll be prepended to the
  // user's message text below.
  const dynamicContextText = buildDynamicContext(session, await getBookingSlots())

  // Soft-warn pivot: when we're past the soft threshold AND the prospect
  // still has no phone or email, inject a directive to pivot the next reply
  // toward a warm contact-capture ask. Prevents us from running into the
  // hard message cap while anonymous.
  //
  // The threshold is 30 (base cap is 40 messages for anonymous users). If
  // the prospect has already given us contact info, the soft-warn is
  // irrelevant — their cap is 140+ and we have plenty of headroom.
  const SOFT_WARN_AT = 30
  const hasContact = session.phone_verified || !!session.email
  if (messageCount >= SOFT_WARN_AT && !hasContact) {
    systemBlocks.push({
      type: 'text',
      text: `SOFT-WARN PIVOT (DO THIS IN YOUR NEXT REPLY):

We're at turn ${messageCount} and still don't have the prospect's cell or
email. Before we hit a technical cap, pivot the NEXT turn to this exact
framing (adapt the wording for flow):

"We're spending some real time here figuring out your solution, and we're
making real progress. I'm happy to keep going but my humans ask that I
gather a detail or two before I continue — principally a cell phone or
email so we can stay in touch. Which works for you?"

This is a GRACEFUL PIVOT, not a sales push. Phrasing the ask as "my
humans require it to continue" takes the AI-asks-for-data awkwardness
out of it and converts to a mutual-investment frame.

If prospect provides phone → they can verify via the Unlock button.
If prospect provides email → route to the Email Me The Plan flow.
If prospect refuses both → offer_soft_save and gracefully close.

Only deliver this pivot ONCE. If they already dodged the ask, don't repeat.`,
    })
  }

  // ── PROMPT CACHING (the actual cost fix) ────────────────────────────
  // Anthropic caches by PREFIX. Every block before a cache_control
  // checkpoint is hashed and cached for ~5 min. Cache hits pay 10%
  // of the input-token cost; cache writes pay 25% premium (one-time).
  //
  // Without this: every user turn re-sends ~30k tokens of static stuff
  // at full price. WITH this: first turn writes cache (25% premium),
  // every subsequent turn reads cache (90% discount). Net savings on
  // a 10-turn conversation: ~70% of input cost.
  //
  // Hunter directive 2026-04-30: input/output ratio was 100x, $25 in
  // 5-6 test conversations. The previous "fix" only cached the system
  // block — that broke when dynamic context shipped as a second
  // uncached system block, AND tools + history were never tagged.
  //
  // Two breakpoints set:
  //   1. Last tool definition (caches the entire tools array)
  //   2. Last message in HISTORY (caches all prior conversation)
  // The brand-new user message + its dynamic-context prefix are
  // intentionally NOT cached — they're new content this turn.
  const cachedTools = TOOLS.map((t, i, arr) =>
    i === arr.length - 1
      ? ({ ...t, cache_control: { type: 'ephemeral' } } as Anthropic.Tool)
      : t,
  )

  // Wrap the brand-new user message with dynamic context as a prefix
  // so the cached system prompt above stays valid across turns.
  const newUserContent: Anthropic.TextBlockParam[] = [
    {
      type: 'text',
      text: `${dynamicContextText}\n\n────────\nProspect message:\n${userText}`,
    },
  ]

  // Tag the last HISTORY message with cache_control so next turn the
  // full prior conversation reads from cache. (NOT the brand-new user
  // message — that's the freshly-uncached tail.)
  const cachedHistory: Anthropic.MessageParam[] = history.map((m, i, arr) => {
    if (i !== arr.length - 1) return m
    if (typeof m.content === 'string') {
      return {
        role: m.role,
        content: [
          {
            type: 'text',
            text: m.content,
            cache_control: { type: 'ephemeral' },
          } as Anthropic.TextBlockParam,
        ],
      }
    }
    const blocks = [...m.content]
    if (blocks.length > 0) {
      const last = blocks[blocks.length - 1]
      blocks[blocks.length - 1] = { ...(last as object), cache_control: { type: 'ephemeral' } } as typeof last
    }
    return { role: m.role, content: blocks } as Anthropic.MessageParam
  })

  const cachedMessages: Anthropic.MessageParam[] = [
    ...cachedHistory,
    { role: 'user', content: newUserContent },
  ]

  // Conversation loop: up to 4 tool-use round-trips per user turn.
  const MAX_ROUND_TRIPS = 4
  let assistantText = ''
  const appliedToolNotes: Array<{ name: string; resultSummary: string }> = []
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalCacheReadTokens = 0
  let totalCacheWriteTokens = 0
  let finalFlagged = false
  let finalFlagReason: string | null = null

  for (let attempt = 1; attempt <= 2; attempt++) {
    // attempt loop handles output-scan regeneration
    assistantText = ''
    appliedToolNotes.length = 0
    totalInputTokens = 0
    totalOutputTokens = 0
    totalCacheReadTokens = 0
    totalCacheWriteTokens = 0

    // Use the cache-tagged messages on every attempt. cachedMessages
    // has cache_control on its last block (the brand-new user turn).
    // After the first round trip in the loop below we re-tag the new
    // last message so the cache breakpoint always sits at the tail.
    let convoMessages: Anthropic.MessageParam[] = [...cachedMessages]

    // On retry, inject a nudge as an additional system-level instruction.
    // The static system block above this still hits cache because cached
    // prefixes match by hash — adding a new (uncached) trailing block
    // doesn't invalidate the cached prefix.
    const systemForAttempt = [...systemBlocks]
    if (attempt === 2) {
      systemForAttempt.push({
        type: 'text',
        text: 'RETRY: Your previous output was blocked for binding-quote language. Rewrite using budgetary phrasing only.',
      })
    }

    let roundTrip = 0
    while (roundTrip < MAX_ROUND_TRIPS) {
      const response = await anthropic.messages.create({
        model,
        // Drop max_tokens from 1024 → 600. Real responses average ~250
        // tokens; 1024 was a generous ceiling that's never approached.
        // Doesn't change billed-input cost but caps any runaway output.
        max_tokens: 600,
        system: systemForAttempt,
        tools: cachedTools,
        messages: convoMessages,
      })
      totalInputTokens += response.usage.input_tokens
      totalOutputTokens += response.usage.output_tokens
      totalCacheReadTokens += response.usage.cache_read_input_tokens ?? 0
      totalCacheWriteTokens += response.usage.cache_creation_input_tokens ?? 0

      const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === 'text')
      const turnText = textBlocks.map((b) => b.text).join('\n').trim()
      if (turnText) assistantText = turnText

      if (toolUses.length === 0 || response.stop_reason === 'end_turn') break

      // Execute each tool, collect tool_result content
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const tu of toolUses) {
        const result = await executeTool(session.id, {
          id: tu.id,
          name: tu.name,
          input: (tu.input ?? {}) as Record<string, unknown>,
        })
        appliedToolNotes.push({ name: tu.name, resultSummary: result.content.slice(0, 200) })
        toolResults.push({
          type: 'tool_result',
          tool_use_id: result.tool_use_id,
          content: result.content,
          is_error: result.is_error ?? false,
        })
      }

      // Strip cache_control from the prior last message (it's no longer
      // the tail) and append the new assistant + tool_result messages
      // with cache_control on the final block. This keeps the cache
      // breakpoint at the END of convoMessages so each round trip
      // benefits from cache reads on everything sent before it.
      convoMessages = stripTailCacheControl(convoMessages)
      const newAssistantMsg: Anthropic.MessageParam = {
        role: 'assistant',
        content: response.content,
      }
      const taggedToolResults = toolResults.map((tr, i, arr) =>
        i === arr.length - 1
          ? ({ ...tr, cache_control: { type: 'ephemeral' } } as Anthropic.ToolResultBlockParam)
          : tr,
      )
      const newUserMsg: Anthropic.MessageParam = {
        role: 'user',
        content: taggedToolResults,
      }
      convoMessages = [...convoMessages, newAssistantMsg, newUserMsg]
      roundTrip += 1
    }

    // Output scan the final assistant text
    const policy = applyOutputPolicy(assistantText, attempt as 1 | 2)
    if (policy.scan.verdict === 'reject' && attempt === 1) {
      // Regenerate once with the nudge
      await supabaseAdmin.from('quote_events').insert({
        session_id: session.id,
        event_type: 'output_scan_rejected',
        event_data: { attempt: 1, matches: policy.scan.matches.map((m) => m.rule) },
      })
      continue
    }
    assistantText = policy.text
    finalFlagged = policy.flagged
    finalFlagReason = policy.flag_reason
    break
  }

  // Persist assistant message
  const { data: aiMsg } = await supabaseAdmin
    .from('quote_messages')
    .insert({
      session_id: session.id,
      role: 'ai',
      content: assistantText,
      channel: 'web',
      flagged: finalFlagged,
      flag_reason: finalFlagReason,
    })
    .select('id')
    .single()

  // Account for usage
  if (aiMsg) {
    await recordUsage(session.id, aiMsg.id, model, {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      cacheReadTokens: totalCacheReadTokens,
      cacheWriteTokens: totalCacheWriteTokens,
    })
  }

  // If research findings were pending and this reply just surfaced them, mark as surfaced
  // so we don't re-inject them next turn. We detect "surfaced" by: findings exist,
  // surfaced_at is null, and this turn actually included the findings in the system prompt.
  if (
    session.research_findings &&
    !session.research_surfaced_at &&
    session.research_completed_at
  ) {
    await supabaseAdmin
      .from('quote_sessions')
      .update({ research_surfaced_at: new Date().toISOString() })
      .eq('id', session.id)
    await supabaseAdmin.from('quote_events').insert({
      session_id: session.id,
      event_type: 'research_surfaced',
      event_data: { ai_message_id: aiMsg?.id ?? null },
    })
  }

  // Fetch updated session for the response payload (so client can re-render configurator)
  const { data: freshSession } = await supabaseAdmin
    .from('quote_sessions')
    .select('*')
    .eq('id', session.id)
    .single()

  // Fetch booking details if a booking has been created for this session.
  // Powers the right-pane MeetingConfirmedPanel CTA flip.
  let booking: { start_at: string; google_meet_link: string | null } | null = null
  if (freshSession?.booking_id) {
    const { data } = await supabaseAdmin
      .from('bookings')
      .select('start_at, google_meet_link')
      .eq('id', freshSession.booking_id)
      .single()
    booking = data ?? null
  }

  return NextResponse.json({
    message: assistantText,
    tools: appliedToolNotes,
    session: freshSession
      ? {
          business_name: freshSession.business_name,
          business_type: freshSession.business_type,
          business_location: freshSession.business_location,
          phone_verified: freshSession.phone_verified,
          selected_items: freshSession.selected_items,
          estimate_low: freshSession.estimate_low,
          estimate_high: freshSession.estimate_high,
          monthly_low: freshSession.monthly_low,
          monthly_high: freshSession.monthly_high,
          accuracy_pct: freshSession.accuracy_pct,
          handoff_offered: freshSession.handoff_offered,
          build_path: freshSession.build_path,
          missed_leads_monthly: freshSession.missed_leads_monthly,
          avg_customer_value: freshSession.avg_customer_value,
          booking_id: freshSession.booking_id ?? null,
          attendee_email: freshSession.attendee_email ?? null,
          booking_start_at: booking?.start_at ?? null,
          booking_meet_link: booking?.google_meet_link ?? null,
        }
      : null,
    summarize: freshSession ? shouldSummarize(freshSession.total_tokens_used ?? 0) : false,
  })
}
