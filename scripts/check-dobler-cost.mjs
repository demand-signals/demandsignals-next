import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(ROOT, '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data: sessions } = await admin
  .from('quote_sessions')
  .select('id, business_name, total_tokens_used, total_cost_cents, phone_verified, email, research_confirmed, missed_leads_monthly, avg_customer_value, payment_preference, selected_items, conversion_action, created_at, updated_at')
  .order('created_at', { ascending: false })
  .limit(3)

for (const s of sessions ?? []) {
  const msgCount = await admin.from('quote_messages').select('id', { count: 'exact', head: true }).eq('session_id', s.id)
  const items = Array.isArray(s.selected_items) ? s.selected_items.length : 0
  console.log(`\n${s.business_name ?? '(anon)'}`)
  console.log(`  id: ${s.id}`)
  console.log(`  messages: ${msgCount.count}  items: ${items}  tokens: ${s.total_tokens_used.toLocaleString()}  cost: $${(s.total_cost_cents / 100).toFixed(2)}`)
  console.log(`  research_confirmed: ${s.research_confirmed}  phone_verified: ${s.phone_verified}  email: ${s.email ?? 'none'}`)
  console.log(`  roi_provided: ${Boolean(s.missed_leads_monthly && s.avg_customer_value)}  payment_pref: ${s.payment_preference ?? 'none'}`)
  console.log(`  conversion: ${s.conversion_action ?? 'none'}`)

  // Compute what the cap would be
  const BASE_MSG = 40
  const BASE_TOK = 60000
  const BASE_COST = 50
  const BONUSES = {
    phone_verified: { m: 100, t: 200000, c: 300 },
    email: { m: 30, t: 60000, c: 100 },
    research_confirmed: { m: 15, t: 30000, c: 50 },
    roi: { m: 15, t: 30000, c: 50 },
    payment: { m: 10, t: 20000, c: 30 },
    ready: { m: 30, t: 60000, c: 100 },
    five_items: { m: 10, t: 20000, c: 30 },
  }
  let m = BASE_MSG, t = BASE_TOK, c = BASE_COST
  const signals = []
  if (s.phone_verified) { m += BONUSES.phone_verified.m; t += BONUSES.phone_verified.t; c += BONUSES.phone_verified.c; signals.push('phone') }
  if (s.email) { m += BONUSES.email.m; t += BONUSES.email.t; c += BONUSES.email.c; signals.push('email') }
  if (s.research_confirmed === 1) { m += BONUSES.research_confirmed.m; t += BONUSES.research_confirmed.t; c += BONUSES.research_confirmed.c; signals.push('research') }
  if (s.missed_leads_monthly && s.avg_customer_value) { m += BONUSES.roi.m; t += BONUSES.roi.t; c += BONUSES.roi.c; signals.push('roi') }
  if (s.payment_preference) { m += BONUSES.payment.m; t += BONUSES.payment.t; c += BONUSES.payment.c; signals.push('payment') }
  if (['booked_call','lets_go','bought_single'].includes(s.conversion_action)) { m += BONUSES.ready.m; t += BONUSES.ready.t; c += BONUSES.ready.c; signals.push('ready') }
  if (items >= 5) { m += BONUSES.five_items.m; t += BONUSES.five_items.t; c += BONUSES.five_items.c; signals.push('5+items') }

  console.log(`  COMPUTED CAPS: msg=${m}  tok=${t.toLocaleString()}  cost=$${(c/100).toFixed(2)}`)
  console.log(`  SIGNALS: ${signals.join(', ') || 'NONE'}`)
  console.log(`  HIT ANY CAP? msg:${msgCount.count >= m}  tok:${s.total_tokens_used >= t}  cost:${s.total_cost_cents >= c}`)
}
