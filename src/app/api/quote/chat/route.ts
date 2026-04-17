import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizeSession } from '@/lib/quote-session'
import {
  preflightOrThrow,
  BudgetViolation,
  pickModel,
  recordUsage,
  shouldSummarize,
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
import type Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

const bodySchema = z.object({
  message: z.string().min(1).max(4000),
})

// Fetch prior messages and shape them for the Claude API.
async function loadHistory(session_id: string): Promise<Anthropic.MessageParam[]> {
  const { data } = await supabaseAdmin
    .from('quote_messages')
    .select('role, content, created_at')
    .eq('session_id', session_id)
    .order('created_at', { ascending: true })
    .limit(40)
  if (!data) return []
  return data
    .filter((m) => m.role === 'ai' || m.role === 'user')
    .map((m) => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content,
    })) as Anthropic.MessageParam[]
}

function estimateTokens(text: string): number {
  // Rough heuristic: 1 token ≈ 4 chars for English text. Safe overestimate.
  return Math.ceil(text.length / 3.5)
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
      return NextResponse.json(
        { budget_violation: true, reason: e.reason, message: e.userFacingMessage },
        { status: 200 },
      )
    }
    throw e
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

  // Build messages history + append the new user turn
  const history = await loadHistory(session.id)
  // history already includes the just-inserted row; drop duplicates at tail
  if (history.length > 0 && history[history.length - 1].role === 'user') {
    history.pop()
  }
  const messages: Anthropic.MessageParam[] = [...history, { role: 'user', content: userText }]

  // Pick model — count stored messages for Opus bump
  const messageCount = history.length + 1
  const model = pickModel({
    messageCount,
    estimateHighCents: session.estimate_high,
    confusionSignals: 0,
  })

  // System prompt — static first (cached), dynamic second (not cached).
  const systemBlocks: Anthropic.TextBlockParam[] = [
    {
      type: 'text',
      text: buildStaticSystemPrompt() + '\n\n' + buildCatalogPrompt(),
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: buildDynamicContext(session),
    },
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

    const convoMessages: Anthropic.MessageParam[] = [...messages]

    // On retry, inject a nudge as an additional system-level instruction.
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
        max_tokens: 1024,
        system: systemForAttempt,
        tools: TOOLS,
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

      convoMessages.push(
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      )
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
        }
      : null,
    summarize: freshSession ? shouldSummarize(freshSession.total_tokens_used ?? 0) : false,
  })
}
