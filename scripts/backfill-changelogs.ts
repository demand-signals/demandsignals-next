// Backfill missing AI ChangeLog blog posts.
//
// Usage:
//   npx tsx scripts/backfill-changelogs.ts 2026-04-17 2026-04-19 2026-04-20
//
// For historical dates (>36h old) it uses Claude + web_search to research
// what each platform shipped that day — live scraping won't work because
// changelog pages only show recent entries.

import * as fs from 'fs'
import * as path from 'path'

// Load .env.local BEFORE any imports that read process.env at module-load time
const envLocalPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i)
    if (match && !process.env[match[1]]) {
      let value = match[2]
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[match[1]] = value
    }
  }
}

const dates = process.argv.slice(2)

if (dates.length === 0) {
  console.error('Usage: npx tsx scripts/backfill-changelogs.ts YYYY-MM-DD [YYYY-MM-DD ...]')
  process.exit(1)
}

for (const d of dates) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    console.error(`Invalid date format: ${d} (expected YYYY-MM-DD)`)
    process.exit(1)
  }
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY not set — check .env.local')
  process.exit(1)
}
if (!process.env.GITHUB_DEMANDSIGNALS_NEXT) {
  console.error('GITHUB_DEMANDSIGNALS_NEXT not set — check .env.local')
  process.exit(1)
}
// Provide dummy values for Supabase if missing (generator doesn't actually use Supabase)
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co'
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder'

async function run() {
  // Dynamic import — env is set before the module graph evaluates
  const { generateChangelogPost } = await import('../src/lib/changelog-generator')

  const results: Array<{ date: string; ok: boolean; detail: string }> = []

  for (const date of dates) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`Backfilling ${date}...`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    try {
      const result = await generateChangelogPost({ date, forceBackfill: true })
      console.log(`✓ Committed ${result.filePath}`)
      console.log(`  Mode: ${result.mode}`)
      console.log(`  Platforms with updates: ${result.platformsWithUpdates}`)
      console.log(`  Content length: ${result.contentLength} chars`)
      results.push({ date, ok: true, detail: `${result.platformsWithUpdates} platforms, ${result.contentLength} chars` })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`✗ Failed: ${msg}`)
      results.push({ date, ok: false, detail: msg })
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`Summary`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  for (const r of results) {
    console.log(`${r.ok ? '✓' : '✗'}  ${r.date}  —  ${r.detail}`)
  }
  console.log()
}

run().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
