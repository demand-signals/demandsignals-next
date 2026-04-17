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

// Latest session
const { data: session } = await admin
  .from('quote_sessions')
  .select('id, business_name, business_type, business_location, selected_items, estimate_low, estimate_high, missed_leads_monthly, avg_customer_value, total_tokens_used, total_cost_cents, created_at')
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

if (!session) {
  console.log('No sessions found.')
  process.exit(0)
}

console.log('═══════════════════════════════════════════════════')
console.log('Latest quote session')
console.log('═══════════════════════════════════════════════════')
console.log('id:                  ', session.id)
console.log('business_name:       ', session.business_name)
console.log('business_type:       ', session.business_type)
console.log('business_location:   ', session.business_location)
console.log('selected_items:      ', JSON.stringify(session.selected_items))
console.log('estimate (cents):    ', session.estimate_low, '-', session.estimate_high)
console.log('missed_leads_monthly:', session.missed_leads_monthly)
console.log('avg_customer_value:  ', session.avg_customer_value, '(cents)')
console.log('total_tokens_used:   ', session.total_tokens_used)
console.log('total_cost_cents:    ', session.total_cost_cents)
console.log('created_at:          ', session.created_at)

const { data: events } = await admin
  .from('quote_events')
  .select('event_type, event_data, created_at')
  .eq('session_id', session.id)
  .order('created_at', { ascending: false })
  .limit(30)

console.log('\n--- Recent events ---')
for (const e of (events ?? []).reverse()) {
  console.log(`[${new Date(e.created_at).toLocaleTimeString()}] ${e.event_type}: ${JSON.stringify(e.event_data).slice(0, 120)}`)
}

const { data: msgs } = await admin
  .from('quote_messages')
  .select('role, content, flagged, flag_reason, ai_model_used, cost_cents')
  .eq('session_id', session.id)
  .order('created_at', { ascending: true })

console.log('\n--- Messages ---')
for (const m of msgs ?? []) {
  console.log(`[${m.role}${m.ai_model_used ? ` ${m.ai_model_used}` : ''}${m.cost_cents ? ` ${m.cost_cents}¢` : ''}${m.flagged ? ' FLAGGED' : ''}] ${m.content.slice(0, 140).replace(/\n/g, ' ')}`)
}
