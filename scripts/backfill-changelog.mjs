#!/usr/bin/env node
// ── Backfill AI ChangeLog posts ──────────────────────────────────────────
// Fetches changelogs via Jina Reader + GitHub Releases API, then generates
// MDX posts for a range of dates using Claude. Writes to src/content/blog/.
//
// Usage: node scripts/backfill-changelog.mjs
// Requires: ANTHROPIC_API_KEY in .env.local

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// Load .env.local
const envPath = resolve(ROOT, '.env.local')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
if (!ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY not found in .env.local')
  process.exit(1)
}

// ── Config ──
const START_DATE = '2026-04-01'
const END_DATE = '2026-04-14'
const BLOG_DIR = resolve(ROOT, 'src/content/blog')

// Sources scraped via Jina (no dates in content — shared across all days)
const JINA_SOURCES = [
  { id: 'openai', name: 'OpenAI', url: 'https://platform.openai.com/docs/changelog' },
  { id: 'anthropic', name: 'Anthropic Models', url: 'https://docs.anthropic.com/en/docs/about-claude/models' },
  { id: 'google-gemini', name: 'Google Gemini', url: 'https://ai.google.dev/gemini-api/docs/changelog' },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://api-docs.deepseek.com/updates' },
]

// ── Helpers ──
async function fetchViaJina(url) {
  console.log(`  Fetching ${url} via Jina...`)
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: 'text/markdown', 'X-Return-Format': 'markdown' },
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`Jina failed for ${url}: HTTP ${res.status}`)
  return res.text()
}

// Fetch Claude Code releases from GitHub API (date-stamped!)
async function fetchClaudeCodeReleases() {
  console.log('  Fetching Claude Code releases via GitHub API...')
  const allReleases = []
  let page = 1
  // Fetch enough pages to cover our date range
  while (page <= 3) {
    const res = await fetch(
      `https://api.github.com/repos/anthropics/claude-code/releases?per_page=50&page=${page}`,
      { headers: { Accept: 'application/vnd.github.v3+json' } }
    )
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
    const releases = await res.json()
    if (releases.length === 0) break
    allReleases.push(...releases)
    // Stop if we've passed our date range
    const lastDate = releases[releases.length - 1]?.published_at?.slice(0, 10)
    if (lastDate && lastDate < START_DATE) break
    page++
  }

  // Filter to our date range and group by date
  const byDate = {}
  for (const r of allReleases) {
    const date = r.published_at?.slice(0, 10)
    if (!date || date < START_DATE || date > END_DATE) continue
    if (!byDate[date]) byDate[date] = []
    byDate[date].push({
      tag: r.tag_name,
      body: r.body || '',
    })
  }

  console.log(`  ✓ Claude Code: ${Object.keys(byDate).length} days with releases`)
  return byDate
}

function formatDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

async function callClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error (${res.status}): ${err}`)
  }

  const data = await res.json()
  return data.content[0]?.text || ''
}

function buildPrompt(sourceContent, yesterdayDisplay, todayDisplay, dateStr) {
  // Extract just month and day for date matching (e.g., "April 1" from "2026-04-01")
  const d = new Date(dateStr + 'T12:00:00Z')
  const monthDay = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  return `You are writing "The AI ChangeLog" — a daily digest that makes AI platform updates understandable for regular business owners. Think "AI for Dummies" — no jargon, no buzzwords. Explain things the way you'd explain them to a smart friend who doesn't work in tech.

This post covers changes from YESTERDAY: ${yesterdayDisplay} (${dateStr})
Today (when this post goes live): ${todayDisplay}

Below are changelog entries from each platform. CAREFULLY scan ALL sources for changes dated ${yesterdayDisplay}, "${monthDay}, 2026", "${monthDay}", or "${dateStr}". Different platforms use different date formats.

IMPORTANT INSTRUCTIONS:
1. Search EVERY source below for entries matching yesterday's date. Dates in the Google Gemini changelog use "Month Day, Year" format (e.g., "${monthDay}, 2026"). OpenAI uses similar formats. Claude Code releases have explicit dates.
2. If a platform had changes yesterday, ALWAYS include them — do not skip any platform that shipped updates.
3. Start your response directly with the first ## heading. Do NOT add any preamble, introduction, or commentary before the first platform heading. No "Looking at yesterday's changes..." or "Here's what happened..." — jump straight to the content.
4. If NOTHING changed across ALL platforms, write ONLY a short "Quiet day across the board" message.

Write the blog post body in markdown (NOT MDX — no imports, no JSX).

Do NOT include a TL;DR section.

## Format

Group changes by platform. Each platform gets an H2 heading with a brief subtitle. Under each platform, list individual changes as emoji cards in this exact format:

\`\`\`
## Claude Code
What's new from Anthropic's AI coding assistant

EMOJI
**Category · Feature Area**
**Conversational headline describing the change**
2-3 sentence explanation in plain English. Talk like you're texting a friend. Explain what it actually means for the person reading, not just what changed technically.
\`\`\`

### Categories and their emojis:
- New features: 🧠 ⚡ 🛠️ 🤖 🎨 📊 🔑 (pick one that fits the feature)
- Improved: 🔄 📋 ⚠️ 💾 (pick one that fits)
- Fixed / Bug fixes: 🔧
- Deprecation / Heads up: 🗓️ ⚠️

### Category labels:
- "New · [Area]" for new features (e.g., "New · Memory saver", "New · Speed", "New · Commands")
- "Improved · [Area]" for improvements (e.g., "Improved · Navigation", "Improved · Warnings")
- "Fixed · Bugs" for bug fixes
- "Heads up · Deprecation" for deprecations

### Rules:
- Each change gets its own emoji card — don't combine unrelated changes
- Group small bug fixes into one "Fixed · Bugs" card with highlights separated by " · "
- Headlines should be conversational: "Claude now remembers what you were doing when you come back" not "Added session recap feature"
- Explanations should answer "so what?" — why should I care about this?
- If a change is developer-only, mention it naturally: "This one's for developers building on the API"
- If nothing significant changed for a platform, skip it entirely
- If NOTHING changed across ALL platforms, write a short "Quiet day across the board" message
- Avoid: "leveraging", "capabilities", "paradigm", "ecosystem", "scalable", "cutting-edge"
- Use: "works better", "costs less", "new feature", "fixed a bug", "now you can..."

Do NOT include frontmatter — I'll add that separately.
Do NOT wrap the output in code fences.
Do NOT add any preamble text before the first ## heading.

---

${sourceContent}`
}

function buildMdx(blogContent, dateStr, displayDate, sourceCount, successCount) {
  // Extract first bold headline as excerpt
  const headlineMatch = blogContent.match(/\*\*[^*]*·[^*]*\*\*\n\*\*([^*]+)\*\*/)
  const excerpt = headlineMatch
    ? headlineMatch[1].trim().slice(0, 200)
    : `Daily AI platform changelog digest for ${displayDate}.`

  // Count platforms and change categories
  const platformSections = blogContent.match(/^## .+/gm) || []
  const platformCount = platformSections.length
  const newItems = (blogContent.match(/\*\*New\s*·/g) || []).length
  const improvedItems = (blogContent.match(/\*\*Improved\s*·/g) || []).length
  const fixedItems = (blogContent.match(/\*\*Fixed\s*·/g) || []).length
  const killedItems = (blogContent.match(/\*\*(Heads up|Killed|Deprecated)\s*·/g) || []).length
  const totalChanges = newItems + improvedItems + fixedItems + killedItems

  // Generate title from biggest headline or quiet-day joke
  const title = excerpt !== `Daily AI platform changelog digest for ${displayDate}.`
    ? excerpt.slice(0, 80)
    : 'Quiet Day Across the AI Landscape'

  // Format date for infographic headline (e.g. "April 15, 2026")
  const d = new Date(dateStr + 'T12:00:00Z')
  const infographicDate = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
date: "${dateStr}"
author: "AI ChangeLog"
excerpt: "${excerpt.replace(/"/g, '\\"')}"
tags: ["ai-changelog", "openai", "anthropic", "google-gemini", "deepseek", "ai-updates"]
readTime: "3 min read"
category: "ai-changelog"
serviceCategories: ["ai-services"]
featured: false
infographic:
  headline: "Changelog Update for ${infographicDate}"
  type: "stats"
  stats:
    - { label: "Platforms Updated", value: "${platformCount} of ${sourceCount}" }
    - { label: "New", value: "${newItems}" }
    - { label: "Improved", value: "${improvedItems}" }
    - { label: "Fixed", value: "${fixedItems}" }
    - { label: "Killed", value: "${killedItems}" }
    - { label: "Total Changes", value: "${totalChanges}" }
---`

  return `${frontmatter}\n\n${blogContent}\n\n---\n\n*The AI ChangeLog is generated daily by Demand Signals. We scrape official changelogs, run them through Claude, and publish a plain-English summary so you don't have to read the docs. [Subscribe to our blog](/blog) for daily updates.*\n`
}

// ── Main ──
async function main() {
  console.log('=== AI ChangeLog Backfill ===\n')

  // 1a. Fetch Jina sources (shared across all days)
  console.log('Step 1a: Fetching changelogs via Jina Reader...')
  const jinaResults = []
  for (const source of JINA_SOURCES) {
    try {
      const content = await fetchViaJina(source.url)
      jinaResults.push({ source, content })
      console.log(`  ✓ ${source.name} (${content.length} chars)`)
    } catch (err) {
      console.log(`  ✗ ${source.name}: ${err.message}`)
      jinaResults.push({ source, content: '', error: err.message })
    }
  }

  // 1b. Fetch Claude Code releases by date via GitHub API
  console.log('\nStep 1b: Fetching Claude Code releases via GitHub API...')
  let claudeCodeByDate = {}
  try {
    claudeCodeByDate = await fetchClaudeCodeReleases()
  } catch (err) {
    console.log(`  ✗ Claude Code: ${err.message}`)
  }

  const jinaSuccessCount = jinaResults.filter(c => !c.error).length
  const totalSources = JINA_SOURCES.length + 1 // +1 for Claude Code
  const totalSuccess = jinaSuccessCount + (Object.keys(claudeCodeByDate).length > 0 ? 1 : 0)
  console.log(`\nSources ready: ${totalSuccess}/${totalSources}\n`)

  // Build shared Jina source content (larger limit for backfill)
  const sharedJinaContent = jinaResults
    .filter(c => !c.error)
    .map(c => {
      const truncated = c.content.length > 20000
        ? c.content.slice(0, 20000) + '\n\n[... truncated]'
        : c.content
      return `## ${c.source.name} Changelog\nSource: ${c.source.url}\n\n${truncated}`
    })
    .join('\n\n---\n\n')

  // 2. Generate posts for each day
  const start = new Date(START_DATE + 'T12:00:00Z')
  const end = new Date(END_DATE + 'T12:00:00Z')

  console.log(`Step 2: Generating posts from ${START_DATE} to ${END_DATE}...\n`)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const slug = `ai-changelog-${dateStr}`
    const filePath = resolve(BLOG_DIR, `${slug}.mdx`)

    // Skip if already exists
    if (existsSync(filePath)) {
      console.log(`  ⏭ ${slug}.mdx already exists — skipping`)
      continue
    }

    // The post covers "yesterday" (d), and goes live "today" (d+1)
    const yesterday = new Date(d)
    const today = new Date(d)
    today.setDate(today.getDate() + 1)

    const yesterdayDisplay = formatDate(yesterday)
    const todayDisplay = formatDate(today)
    const displayDate = formatDate(yesterday)

    // Build per-day source content: shared Jina + date-specific Claude Code
    let daySourceContent = sharedJinaContent

    const ccReleases = claudeCodeByDate[dateStr]
    if (ccReleases && ccReleases.length > 0) {
      const ccContent = ccReleases
        .map(r => `### ${r.tag} (released ${dateStr})\n\n${r.body}`)
        .join('\n\n')
      daySourceContent += `\n\n---\n\n## Claude Code (Anthropic) — Releases on ${dateStr}\nSource: https://github.com/anthropics/claude-code/releases\n\n${ccContent}`
    }

    console.log(`  Generating ${slug}...${ccReleases ? ` (${ccReleases.length} Claude Code releases)` : ''}`)

    try {
      const prompt = buildPrompt(daySourceContent, yesterdayDisplay, todayDisplay, dateStr)
      const blogContent = await callClaude(prompt)

      if (!blogContent || blogContent.length < 100) {
        console.log(`  ✗ ${slug}: Claude returned insufficient content`)
        continue
      }

      const mdx = buildMdx(blogContent, dateStr, displayDate, totalSources, totalSuccess)
      writeFileSync(filePath, mdx, 'utf-8')
      console.log(`  ✓ ${slug}.mdx (${blogContent.length} chars)`)

      // Rate limit: 30K input tokens/min, ~30K tokens/request → ~1 req/min
      await new Promise(r => setTimeout(r, 65000))
    } catch (err) {
      console.log(`  ✗ ${slug}: ${err.message}`)
    }
  }

  console.log('\n=== Backfill complete ===')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
