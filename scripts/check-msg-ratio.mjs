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
const sessionId = 'f8e0f61e-db55-4fd0-9ac4-f1d02ca46e05' // Dobler

const { data: msgs } = await admin
  .from('quote_messages')
  .select('role, content, tokens_input, tokens_output, cost_cents, ai_model_used')
  .eq('session_id', sessionId)
  .order('created_at', { ascending: true })

let userChars = 0, aiChars = 0, userCount = 0, aiCount = 0
let totalInput = 0, totalOutput = 0
for (const m of msgs ?? []) {
  if (m.role === 'user') {
    userChars += m.content.length
    userCount++
  } else if (m.role === 'ai') {
    aiChars += m.content.length
    aiCount++
    totalInput += m.tokens_input ?? 0
    totalOutput += m.tokens_output ?? 0
  }
}

console.log('Dobler session I/O analysis')
console.log('===========================')
console.log(`User messages: ${userCount}  avg chars: ${Math.round(userChars / userCount)}`)
console.log(`AI messages: ${aiCount}  avg chars: ${Math.round(aiChars / aiCount)}`)
console.log(`Char ratio AI/User: ${(aiChars / userChars).toFixed(1)}x`)
console.log()
console.log(`Total input tokens (across ${aiCount} AI turns): ${totalInput.toLocaleString()}`)
console.log(`Total output tokens: ${totalOutput.toLocaleString()}`)
console.log(`Input avg per turn: ${Math.round(totalInput / aiCount)}`)
console.log(`Output avg per turn: ${Math.round(totalOutput / aiCount)}`)
console.log()
console.log('Cost split (Sonnet 4.6 at $3/M in, $15/M out):')
const inCost = totalInput * 3 / 1_000_000
const outCost = totalOutput * 15 / 1_000_000
console.log(`  Input cost: $${inCost.toFixed(4)}`)
console.log(`  Output cost: $${outCost.toFixed(4)}`)
console.log(`  Output is ${Math.round(outCost / (inCost + outCost) * 100)}% of total cost`)
