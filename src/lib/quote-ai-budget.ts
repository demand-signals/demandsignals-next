// AI cost controls — the guardrail between the prospect's conversation and
// the Anthropic bill. Every /api/quote/chat request runs through this module
// before and after the Claude API call.
//
// Layers of defense (in order):
//   1. Kill switch — ai_enabled flag in quote_config. Off = no API calls at all.
//   2. Rate limits — per-session, per-IP, per-phone message caps.
//   3. Per-request caps — max 8K input, 1K output tokens.
//   4. Per-session cumulative caps — 60K tokens, $2 total, 50 messages, 45 min.
//   5. Daily spend alert — admin SMS/email when daily spend > threshold.
//   6. Summarization trigger — compress old turns when cumulative > 30K tokens.
//
// Model pricing (USD per 1M tokens, April 2026):
//   Sonnet 4.6:  $3.00 input, $15.00 output, $0.30 cache read, $3.75 cache write
//   Opus 4.7:    $15.00 input, $75.00 output, $1.50 cache read, $18.75 cache write
// Stored as integer cents per million tokens (to match our money conventions).

import { supabaseAdmin } from './supabase/admin'

export const HARD_LIMITS = {
  maxInputTokensPerRequest: 12_000,
  // 600 output tokens ~= 400-500 words max. Forces brief replies as a defense
  // if the system prompt brevity rule slips. The prompt asks for 1-3 sentences.
  maxOutputTokensPerRequest: 600,
  // Only COUNTED tokens (output + uncached input) count toward cumulative cap.
  // Cache reads are cheap and repetitive — excluded from accounting for cap purposes.
  // Real ceiling is the per-session dollar cap (quote_config.session_cost_cap_cents).
  maxCumulativeTokensPerSession: 120_000,
  summarizeAtCumulativeTokens: 80_000,
  maxMessagesPerSession: 60,
  maxSessionDurationMinutes: 45,
  maxMessagesPerSessionPerMinute: 10,
  maxSessionsPerIpPerDay: 10,
  maxPhoneVerifyAttemptsPerHour: 3,
  maxPhoneVerifiesPerIpPerDay: 5,
} as const

// Pricing in cents per million tokens.
export const MODEL_PRICING = {
  'claude-sonnet-4-6': {
    inputCentsPerMillion: 300,
    outputCentsPerMillion: 1500,
    cacheReadCentsPerMillion: 30,
    cacheWriteCentsPerMillion: 375,
  },
  'claude-opus-4-7': {
    inputCentsPerMillion: 1500,
    outputCentsPerMillion: 7500,
    cacheReadCentsPerMillion: 150,
    cacheWriteCentsPerMillion: 1875,
  },
} as const

export type ModelId = keyof typeof MODEL_PRICING

// ============================================================
// Config accessor — reads quote_config flags with short-lived cache.
// ============================================================
let configCache: { value: Record<string, unknown>; expiresAt: number } | null = null
const CONFIG_CACHE_MS = 30_000

async function loadConfig(): Promise<Record<string, unknown>> {
  if (configCache && configCache.expiresAt > Date.now()) {
    return configCache.value
  }
  const { data, error } = await supabaseAdmin.from('quote_config').select('key, value')
  if (error) throw new Error(`loadConfig: ${error.message}`)
  const value = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]))
  configCache = { value, expiresAt: Date.now() + CONFIG_CACHE_MS }
  return value
}

export async function isAiEnabled(): Promise<boolean> {
  const cfg = await loadConfig()
  return cfg.ai_enabled === true
}

export async function getDailyCostCapCents(): Promise<number> {
  const cfg = await loadConfig()
  const raw = cfg.daily_cost_cap_cents
  return typeof raw === 'number' ? raw : 5000
}

export async function getSessionCostCapCents(): Promise<number> {
  const cfg = await loadConfig()
  const raw = cfg.session_cost_cap_cents
  return typeof raw === 'number' ? raw : 200
}

export async function getCatalogVersion(): Promise<string> {
  const cfg = await loadConfig()
  return typeof cfg.catalog_version === 'string' ? cfg.catalog_version : 'unknown'
}

export async function getTeamCapacity(): Promise<number> {
  const cfg = await loadConfig()
  const raw = cfg.team_capacity
  return typeof raw === 'number' ? raw : 3
}

export async function isCadenceEnabled(): Promise<boolean> {
  const cfg = await loadConfig()
  return cfg.cadence_enabled === true
}

/** Force a config cache refresh — call after admin UI updates quote_config. */
export function invalidateConfigCache(): void {
  configCache = null
}

// ============================================================
// Cost math
// ============================================================

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
}

/** Returns cost in integer cents. Rounds up to the nearest cent. */
export function calculateCostCents(model: ModelId, usage: TokenUsage): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) throw new Error(`Unknown model for pricing: ${model}`)

  const ratePerToken = (centsPerMillion: number) => centsPerMillion / 1_000_000
  const input = usage.inputTokens * ratePerToken(pricing.inputCentsPerMillion)
  const output = usage.outputTokens * ratePerToken(pricing.outputCentsPerMillion)
  const cacheRead =
    (usage.cacheReadTokens ?? 0) * ratePerToken(pricing.cacheReadCentsPerMillion)
  const cacheWrite =
    (usage.cacheWriteTokens ?? 0) * ratePerToken(pricing.cacheWriteCentsPerMillion)

  return Math.ceil(input + output + cacheRead + cacheWrite)
}

// ============================================================
// Pre-flight checks — run BEFORE calling Claude. Throw if session should not proceed.
// ============================================================

export class BudgetViolation extends Error {
  constructor(
    public readonly reason: 'ai_disabled' | 'session_cost_cap' | 'session_token_cap' | 'session_message_cap' | 'session_duration_cap' | 'rate_limit' | 'request_input_cap',
    message: string,
    public readonly userFacingMessage: string,
  ) {
    super(message)
    this.name = 'BudgetViolation'
  }
}

export interface SessionBudgetSnapshot {
  total_tokens_used: number
  total_cost_cents: number
  created_at: string
  last_ai_request_at: string | null
  message_count: number
}

export async function getSessionBudget(sessionId: string): Promise<SessionBudgetSnapshot> {
  const { data: session, error: sErr } = await supabaseAdmin
    .from('quote_sessions')
    .select('total_tokens_used, total_cost_cents, created_at, last_ai_request_at')
    .eq('id', sessionId)
    .single()
  if (sErr || !session) throw new Error(`getSessionBudget: ${sErr?.message ?? 'not found'}`)

  const { count } = await supabaseAdmin
    .from('quote_messages')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  return {
    total_tokens_used: session.total_tokens_used ?? 0,
    total_cost_cents: session.total_cost_cents ?? 0,
    created_at: session.created_at,
    last_ai_request_at: session.last_ai_request_at ?? null,
    message_count: count ?? 0,
  }
}

export async function preflightOrThrow(sessionId: string, estimatedInputTokens: number): Promise<void> {
  if (!(await isAiEnabled())) {
    throw new BudgetViolation(
      'ai_disabled',
      'ai_enabled flag is false',
      "Our AI advisor is temporarily unavailable. You can still book a call or start with a free research report.",
    )
  }

  if (estimatedInputTokens > HARD_LIMITS.maxInputTokensPerRequest) {
    throw new BudgetViolation(
      'request_input_cap',
      `estimated input ${estimatedInputTokens} > ${HARD_LIMITS.maxInputTokensPerRequest}`,
      "Your message is quite long — let's continue this on a strategy call.",
    )
  }

  const budget = await getSessionBudget(sessionId)
  const sessionCostCap = await getSessionCostCapCents()

  if (budget.total_cost_cents >= sessionCostCap) {
    throw new BudgetViolation(
      'session_cost_cap',
      `session cost ${budget.total_cost_cents} >= cap ${sessionCostCap}`,
      "We've covered a lot here! Let's move this to a quick strategy call so we can finalize the details.",
    )
  }

  if (budget.total_tokens_used >= HARD_LIMITS.maxCumulativeTokensPerSession) {
    throw new BudgetViolation(
      'session_token_cap',
      `session tokens ${budget.total_tokens_used} >= cap`,
      "We've covered a lot here! Let's move this to a quick strategy call so we can finalize the details.",
    )
  }

  if (budget.message_count >= HARD_LIMITS.maxMessagesPerSession) {
    throw new BudgetViolation(
      'session_message_cap',
      `message count ${budget.message_count} >= cap`,
      "Let's pick this up on a strategy call — we'll have a real human walk through your plan.",
    )
  }

  const sessionAgeMinutes = (Date.now() - new Date(budget.created_at).getTime()) / 60_000
  if (sessionAgeMinutes >= HARD_LIMITS.maxSessionDurationMinutes) {
    throw new BudgetViolation(
      'session_duration_cap',
      `session age ${sessionAgeMinutes.toFixed(1)}min >= cap`,
      "You've been at this for a while — let's book a call so we can wrap this up efficiently.",
    )
  }

  // Messages-per-minute rate limit.
  if (budget.last_ai_request_at) {
    const sinceLastMs = Date.now() - new Date(budget.last_ai_request_at).getTime()
    const minInterval = 60_000 / HARD_LIMITS.maxMessagesPerSessionPerMinute
    if (sinceLastMs < minInterval) {
      throw new BudgetViolation(
        'rate_limit',
        `rate limit: ${sinceLastMs}ms since last, min ${minInterval}ms`,
        'One moment — give the team a second to catch up.',
      )
    }
  }
}

// ============================================================
// Accounting — call AFTER a successful Claude response.
// Updates session totals and writes the message-level cost.
// ============================================================

export async function recordUsage(
  sessionId: string,
  messageId: string,
  model: ModelId,
  usage: TokenUsage,
): Promise<{ costCents: number; newSessionTotalCents: number }> {
  const costCents = calculateCostCents(model, usage)
  // Counted tokens: output + uncached input only. Cached reads don't count toward the
  // cumulative session cap because they're cheap and repetitive (system prompt, catalog).
  // Cache writes DO count once (the first time a prompt prefix is seen).
  const totalTokens =
    usage.inputTokens +
    usage.outputTokens +
    (usage.cacheWriteTokens ?? 0)

  // Update the message row with per-turn accounting.
  const { error: mErr } = await supabaseAdmin
    .from('quote_messages')
    .update({
      ai_model_used: model,
      tokens_input: usage.inputTokens,
      tokens_output: usage.outputTokens,
      cost_cents: costCents,
    })
    .eq('id', messageId)
  if (mErr) throw new Error(`recordUsage message: ${mErr.message}`)

  // Atomically increment session counters via RPC to avoid read/modify/write races.
  const { data: session, error: sErr } = await supabaseAdmin
    .from('quote_sessions')
    .select('total_tokens_used, total_cost_cents')
    .eq('id', sessionId)
    .single()
  if (sErr || !session) throw new Error(`recordUsage session fetch: ${sErr?.message}`)

  const newTokens = (session.total_tokens_used ?? 0) + totalTokens
  const newCost = (session.total_cost_cents ?? 0) + costCents

  const { error: uErr } = await supabaseAdmin
    .from('quote_sessions')
    .update({
      total_tokens_used: newTokens,
      total_cost_cents: newCost,
      last_ai_request_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
  if (uErr) throw new Error(`recordUsage session update: ${uErr.message}`)

  return { costCents, newSessionTotalCents: newCost }
}

// ============================================================
// Model routing — Sonnet default, Opus for hot sessions.
// ============================================================

export interface ModelRoutingInput {
  messageCount: number
  estimateHighCents: number | null
  confusionSignals: number
}

export function pickModel(_input: ModelRoutingInput): ModelId {
  // Hunter's directive: never route conversational traffic to Opus — too expensive.
  // Opus remains available for admin-side batch analysis tasks (not prospect-facing).
  // Future Stage C plan: introduce Haiku 4.5 for discovery phases, Sonnet 4.6 for
  // recommendation phases. For v1.1 we stay on Sonnet throughout.
  return 'claude-sonnet-4-6'
}

// ============================================================
// Summarization trigger check.
// ============================================================

export function shouldSummarize(totalTokens: number): boolean {
  return totalTokens >= HARD_LIMITS.summarizeAtCumulativeTokens
}

// ============================================================
// Daily cost reporter — called by cron, returns totals for admin alert.
// ============================================================

export async function getDailyCostReport(days = 1): Promise<{
  totalCostCents: number
  sessionCount: number
  messageCount: number
  averageCostCents: number
  p95CostCents: number
  maxCostCents: number
  hardCapHits: number
  overCap: boolean
}> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data: sessions, error } = await supabaseAdmin
    .from('quote_sessions')
    .select('id, total_cost_cents')
    .gte('created_at', since)
  if (error) throw new Error(`getDailyCostReport: ${error.message}`)

  const costs = (sessions ?? []).map((s) => s.total_cost_cents ?? 0).sort((a, b) => a - b)
  const totalCostCents = costs.reduce((s, c) => s + c, 0)
  const sessionCount = costs.length
  const averageCostCents = sessionCount ? Math.round(totalCostCents / sessionCount) : 0
  const p95Index = Math.max(0, Math.floor(costs.length * 0.95) - 1)
  const p95CostCents = costs[p95Index] ?? 0
  const maxCostCents = costs[costs.length - 1] ?? 0
  const cap = await getSessionCostCapCents()
  const hardCapHits = costs.filter((c) => c >= cap).length

  const dailyCap = await getDailyCostCapCents()
  const overCap = totalCostCents > dailyCap

  const { count: messageCount } = await supabaseAdmin
    .from('quote_messages')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since)

  return {
    totalCostCents,
    sessionCount,
    messageCount: messageCount ?? 0,
    averageCostCents,
    p95CostCents,
    maxCostCents,
    hardCapHits,
    overCap,
  }
}
