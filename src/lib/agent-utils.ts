import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase/admin'

// ─── Anthropic Client ───
let _anthropic: Anthropic | null = null
export function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  }
  return _anthropic
}

// ─── Cron Auth ───
// Constant-time Bearer-token verification. Replaces a previous `===` compare
// that was timing-leaky on the secret tail. Pass the raw Authorization
// header value (or null when absent).
export function verifyCronSecret(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.warn('[SECURITY] CRON_SECRET is not set — denying request')
    return false
  }
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  const presented = authHeader.slice(7).trim()
  if (presented.length !== secret.length) return false
  // Lazy-import node:crypto so the helper stays edge-safe for callers that
  // don't actually invoke it from an edge runtime.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { timingSafeEqual } = require('node:crypto') as typeof import('node:crypto')
  return timingSafeEqual(Buffer.from(presented), Buffer.from(secret))
}

// ─── Activity Logging ───
export async function logAgentActivity(
  agentName: string,
  prospectId: string | null,
  subject: string,
  body: string
) {
  await supabaseAdmin.from('activities').insert({
    prospect_id: prospectId,
    type: 'note',
    subject,
    body,
    created_by: `agent:${agentName}`,
  })
}

// ─── Agent Run Tracking ───
export async function startAgentRun(agentName: string, inputData: Record<string, any> = {}) {
  const { data, error } = await supabaseAdmin
    .from('agent_runs')
    .insert({
      agent_name: agentName,
      status: 'running',
      input_data: inputData,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error(`[${agentName}] Failed to start run:`, error)
    return null
  }
  return data.id as string
}

export async function completeAgentRun(
  runId: string,
  outputData: Record<string, any>,
  prospectsCreated: number,
  prospectsUpdated: number
) {
  await supabaseAdmin
    .from('agent_runs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      output_data: outputData,
      prospects_created: prospectsCreated,
      prospects_updated: prospectsUpdated,
    })
    .eq('id', runId)
}

export async function failAgentRun(runId: string, error: string) {
  await supabaseAdmin
    .from('agent_runs')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error,
    })
    .eq('id', runId)
}

// ─── ICP (Ideal Customer Profile) Configuration ───
export const ICP = {
  industries: ['dental', 'medical', 'medspa', 'legal', 'chiropractic', 'hvac', 'plumbing', 'contractor', 'restaurant', 'auto', 'veterinary', 'financial', 'fitness', 'firearms'],
  cities: [
    'El Dorado Hills, CA', 'Folsom, CA', 'Cameron Park, CA', 'Shingle Springs, CA',
    'Placerville, CA', 'Diamond Springs, CA', 'Rescue, CA', 'Pollock Pines, CA',
    'Georgetown, CA', 'Cool, CA', 'Auburn, CA', 'Roseville, CA', 'Rocklin, CA',
    'Granite Bay, CA', 'Fair Oaks, CA', 'Orangevale, CA', 'Citrus Heights, CA',
    'Rancho Cordova, CA', 'Gold River, CA', 'Sacramento, CA',
  ],
  minRating: 4.0,
  minReviews: 10,
  weakPlatforms: ['wix', 'godaddy', 'weebly', 'squarespace', 'prosites', 'petsites', 'demandforce', 'imagepro'],
}

// ─── Search Combo Picker ───
// Pick a city+industry combo that hasn't been searched recently
export async function pickSearchCombo(): Promise<{ city: string; industry: string } | null> {
  // Get recent discovery runs (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentRuns } = await supabaseAdmin
    .from('agent_runs')
    .select('input_data')
    .eq('agent_name', 'discovery')
    .eq('status', 'completed')
    .gte('started_at', thirtyDaysAgo)

  const searched = new Set(
    (recentRuns || []).map(r => `${r.input_data?.city}|${r.input_data?.industry}`)
  )

  // Build all possible combos and filter out recently searched
  const combos: { city: string; industry: string }[] = []
  for (const city of ICP.cities) {
    for (const industry of ICP.industries) {
      if (!searched.has(`${city}|${industry}`)) {
        combos.push({ city, industry })
      }
    }
  }

  if (combos.length === 0) return null

  // Random pick from unsearched combos
  return combos[Math.floor(Math.random() * combos.length)]
}
