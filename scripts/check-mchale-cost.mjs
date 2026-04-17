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

const sessionId = '11f47be5-44a5-4156-9b93-b8f39803b43e' // McHale

const { count: msgCount } = await admin.from('quote_messages').select('id', { count: 'exact', head: true }).eq('session_id', sessionId)
const { data: session } = await admin.from('quote_sessions').select('created_at, updated_at, total_tokens_used, total_cost_cents').eq('id', sessionId).single()

const { data: sysMsgs } = await admin.from('quote_messages').select('content, created_at').eq('session_id', sessionId).eq('role', 'system')

console.log('McHale session cap analysis')
console.log('==========================')
console.log('Total messages:', msgCount)
console.log('Duration (min):', ((new Date(session.updated_at) - new Date(session.created_at)) / 60000).toFixed(1))
console.log('Tokens:', session.total_tokens_used.toLocaleString())
console.log('Cost cents:', session.total_cost_cents)
console.log('')
console.log('System (budget) messages:')
for (const m of sysMsgs ?? []) {
  console.log(' -', m.content.slice(0, 160))
}
