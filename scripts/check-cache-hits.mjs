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

// We don't log cache_read/cache_write per message — those are tracked at the
// session level in total_tokens_used. Let's infer the cache behavior:
//   - If caching was hitting, input_tokens per AI turn would be LOW after turn 1
//   - If not, input_tokens per turn would be ~uniform (~2500)

const { data: dobler } = await admin
  .from('quote_messages')
  .select('tokens_input, tokens_output, created_at, role')
  .eq('session_id', 'f8e0f61e-db55-4fd0-9ac4-f1d02ca46e05')
  .eq('role', 'ai')
  .order('created_at', { ascending: true })

console.log('Dobler AI turn-by-turn input tokens (caching diagnostic):')
console.log('If caching works, turns after #1 should have LOW input (~300-500).')
console.log('If caching is broken, every turn will be ~2500+.\n')
for (const [i, m] of (dobler ?? []).entries()) {
  console.log(`Turn ${i + 1}: in=${m.tokens_input}  out=${m.tokens_output}`)
}
