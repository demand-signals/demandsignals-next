#!/usr/bin/env node
// ── Backfill AI ChangeLog posts ──────────────────────────────────────────
// Fetches changelogs + news pages via Jina Reader + GitHub Releases API,
// then generates MDX posts for a range of dates using Claude.
// Writes to src/content/blog/.
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
const START_DATE = process.env.BACKFILL_START || '2026-04-16'
const END_DATE = process.env.BACKFILL_END || '2026-04-26'
const BLOG_DIR = resolve(ROOT, 'src/content/blog')

// Two-tier source list:
//   - 'news'      → catches major product launches (model releases, paradigm shifts)
//   - 'changelog' → catches incremental dev/API updates
const JINA_SOURCES = [
  // News layer (headline launches)
  { id: 'anthropic-news', name: 'Anthropic News', url: 'https://www.anthropic.com/news', tier: 'news' },
  { id: 'openai-news', name: 'OpenAI News', url: 'https://openai.com/news/', tier: 'news' },
  { id: 'google-deepmind-news', name: 'Google DeepMind Blog', url: 'https://blog.google/technology/google-deepmind/', tier: 'news' },
  { id: 'meta-ai-news', name: 'Meta AI Blog', url: 'https://ai.meta.com/blog/', tier: 'news' },
  { id: 'xai-news', name: 'xAI News', url: 'https://x.ai/news', tier: 'news' },
  { id: 'mistral-news', name: 'Mistral News', url: 'https://mistral.ai/news/', tier: 'news' },

  // Changelog layer (incremental dev updates)
  { id: 'openai-changelog', name: 'OpenAI API Changelog', url: 'https://platform.openai.com/docs/changelog', tier: 'changelog' },
  { id: 'anthropic-changelog', name: 'Anthropic API Models', url: 'https://docs.anthropic.com/en/docs/about-claude/models', tier: 'changelog' },
  { id: 'google-gemini-changelog', name: 'Google Gemini API', url: 'https://ai.google.dev/gemini-api/docs/changelog', tier: 'changelog' },
  { id: 'deepseek-changelog', name: 'DeepSeek API', url: 'https://api-docs.deepseek.com/updates', tier: 'changelog' },
]

// Truncation per tier — news pages are info-dense with date entries, changelog pages are verbose
const NEWS_TRUNCATE = 15000
const CHANGELOG_TRUNCATE = 18000

// ── Helpers ──

/**
 * Strip AI-tells, tool-call syntax, and meta-commentary from generated body.
 * These patterns scream "AI wrote this" and break the human-columnist voice.
 */
function sanitizeBody(body) {
  let cleaned = body
    // Tool-call syntax leaks
    .replace(/<web_search>[\s\S]*?<\/web_search>/g, '')
    .replace(/<search>[\s\S]*?<\/search>/g, '')
    .replace(/<[a-z_]+>[\s\S]*?<\/[a-z_]+>/g, '')
    // Bracketed editor notes
    .replace(/\[I (need|will|would|should|cannot|can't)[^\]]*?\]/gi, '')
    .replace(/\[(Note|Editor|TODO|searching)[^\]]*?\]/gi, '')
    // Sentences/paragraphs that narrate the AI's process
    .replace(/^I (need to|will|would|should|notice|cannot|can't|don't have)[^.\n]*\.\s*/gim, '')
    .replace(/^Let me (check|examine|look at|analyze|review|search)[^.\n]*\.\s*/gim, '')
    .replace(/^Looking at (the|each) (changelog|source|platform|update)[^.\n]*\.\s*/gim, '')
    .replace(/^Based on (my research|the available data|the sources)[^.\n]*\.\s*/gim, '')
    .replace(/^After (reviewing|examining|analyzing) (the|each)[^.\n]*\.\s*/gim, '')
    .replace(/^Upon (further|closer) (analysis|review|inspection)[^.\n]*\.\s*/gim, '')
    .replace(/^From what I can (see|tell)[^.\n]*\.\s*/gim, '')
    .replace(/^It (appears|seems) that[^.\n]*\.\s*/gim, '')
    // Paragraphs that start with the meta-narration patterns
    .replace(/\n\nI (need to|will|would|should) (search|check|examine|look)[^\n]*\n/gi, '\n\n')
    .replace(/\n\nLet me (search|check|examine|look)[^\n]*\n/gi, '\n\n')
    // Collapse multiple blank lines created by removals
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // Strip any preamble before first ## heading
  const firstHeadingIdx = cleaned.search(/^## /m)
  if (firstHeadingIdx > 0) {
    cleaned = cleaned.slice(firstHeadingIdx)
  }

  return cleaned
}

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
  while (page <= 3) {
    const res = await fetch(
      `https://api.github.com/repos/anthropics/claude-code/releases?per_page=50&page=${page}`,
      { headers: { Accept: 'application/vnd.github.v3+json' } }
    )
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
    const releases = await res.json()
    if (releases.length === 0) break
    allReleases.push(...releases)
    const lastDate = releases[releases.length - 1]?.published_at?.slice(0, 10)
    if (lastDate && lastDate < START_DATE) break
    page++
  }

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
      max_tokens: 4500,
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
  const d = new Date(dateStr + 'T12:00:00Z')
  const monthDay = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  return `You are a tech journalist writing "The AI ChangeLog" — Demand Signals' daily column where one person reads every AI platform's updates and translates them for regular business owners. The voice is human, casual, slightly opinionated. A real person at a desk drinking coffee, not an AI chatbot.

This post covers changes from: ${yesterdayDisplay} (${dateStr})
Today (when this post goes live): ${todayDisplay}

Below are TWO TIERS of sources:
  • NEWS sources (top section) — major product launches, model releases, paradigm shifts. These are the headlines.
  • CHANGELOG sources (bottom section) — incremental dev/API updates. These are the bullet items.

═══════════════════════════════════════════════════════════
VOICE — THIS IS THE MOST IMPORTANT RULE
═══════════════════════════════════════════════════════════

Write like a human columnist who already finished their research. NEVER narrate the act of researching, analyzing, or thinking. The reader does not care about your process — they care about what shipped.

❌ FORBIDDEN PHRASES (these scream "AI wrote this"):
  • "I need to search for..."
  • "Let me check the..."
  • "I'll examine each platform..."
  • "Looking at the changelogs..."
  • "Based on my research..."
  • "After reviewing the sources..."
  • "I notice that..."
  • "I cannot find..."
  • "I don't have information about..."
  • "It appears that..."
  • "Based on the available data..."
  • "From what I can see..."
  • "Upon further analysis..."
  • Any sentence starting with "I" that describes thinking/searching/analyzing
  • Any meta-commentary about the writing process or source materials
  • Bracketed editor notes like "[I need to verify...]" or "[searching for...]"

✓ INSTEAD, write like:
  • "OpenAI dropped GPT-5.5 today, and..."
  • "Quiet day at Anthropic — Claude Code shipped a small bug-fix release and that's about it."
  • "DeepSeek's V4 preview went live at midnight Pacific."
  • "Nothing major from Google's side, but the Gemini API got a few tweaks worth knowing about."
  • Direct, confident, declarative sentences. Past tense for what shipped.

Use "we" sparingly (Demand Signals as the publisher). Use "you" when addressing the reader. Don't use "I" — you're a columnist with no first-person opinions to declare.

═══════════════════════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════════════════════

1. **ELEVATE MAJOR LAUNCHES.** If a NEWS source announced a new model, new product, or major release on this date, give it a HEADLINE SECTION at the top of the post (## 🚨 The Big News) with a multi-paragraph explanation — NOT a single emoji card. Examples of major launches: GPT-5.5, Claude Opus 4.7, Gemini 3, Llama 4, DeepSeek V4. These deserve real prose, not bullet treatment.

2. **Strict date matching — this is critical.** Only include announcements that you can clearly tie to ${yesterdayDisplay} (${dateStr}). News pages list MANY entries from MANY dates — do NOT pull a launch from a different date and slot it under this date. If GPT-5.5 launched on April 23 and you're writing the April 22 post, GPT-5.5 does NOT belong here. If unsure whether an entry matches this exact date, leave it out. When in doubt, write "quiet day."

3. **Cross-reference within the same date.** If both a news source AND a changelog source mention the same launch on ${dateStr}, treat it as one elevated story — don't duplicate.

4. **Don't invent. Don't pre-date. Don't post-date.** Only report what's actually dated ${monthDay}, 2026 (or ${dateStr}, or ${yesterdayDisplay}) in the source content. If a date has no clear entries, write a brief one-paragraph "quiet day" note in plain prose. Do not emit tool-call syntax, placeholder text, bracketed notes, or anything that breaks the human-columnist voice.

5. **Start your response directly with the first ## heading.** No preamble. No throat-clearing. Jump straight to the content.

═══════════════════════════════════════════════════════════
FORMAT
═══════════════════════════════════════════════════════════

If there's a major launch, lead with this section:

\`\`\`
## 🚨 The Big News
[Provider]'s [Model/Product] [Conversational headline]

[2-4 sentence opener explaining what was launched and why it matters in plain English. No corporate-speak.]

**What's new:**
- Bullet 1 (key capability or improvement)
- Bullet 2 (price, availability, who it's for)
- Bullet 3 (what it replaces or improves over)

**Why this matters:** [1-2 sentences on the practical implication for someone running a business or building software.]
\`\`\`

Then group remaining changes by platform with H2 headings + emoji cards:

\`\`\`
## Claude Code
What's new from Anthropic's AI coding assistant

EMOJI
**Category · Feature Area**
**Conversational headline describing the change**
2-3 sentence explanation in plain English. Talk like you're texting a friend.
\`\`\`

### Categories and emojis
- New features: 🧠 ⚡ 🛠️ 🤖 🎨 📊 🔑
- Improved: 🔄 📋 ⚠️ 💾
- Fixed / Bug fixes: 🔧
- Deprecation / Heads up: 🗓️ ⚠️

### Category labels
- "New · [Area]" (e.g., "New · Memory saver")
- "Improved · [Area]"
- "Fixed · Bugs"
- "Heads up · Deprecation"

### Rules
- Each change gets its own emoji card — don't combine unrelated changes
- Group small bug fixes into one "Fixed · Bugs" card with highlights separated by " · "
- Headlines should be conversational
- Avoid: "leveraging", "capabilities", "paradigm", "ecosystem", "scalable", "cutting-edge"
- Use: "works better", "costs less", "new feature", "fixed a bug", "now you can..."
- If NO changes happened across ALL platforms, write ONLY a short "Quiet day across the AI landscape — no major releases or updates from the platforms we track" message. Nothing else.

Do NOT include frontmatter — added separately.
Do NOT wrap output in code fences.
Do NOT add preamble before the first ## heading.
Do NOT emit \`<web_search>\`, \`<search>\`, or any other tool-call syntax — output plain markdown only.

═══════════════════════════════════════════════════════════
SOURCES
═══════════════════════════════════════════════════════════

${sourceContent}`
}

function buildMdx(blogContent, dateStr, displayDate, sourceCount, successCount) {
  // Detect major launch (Big News section)
  const hasBigNews = /^## 🚨 The Big News/m.test(blogContent)

  // Extract excerpt from Big News headline if present, else first emoji card
  let excerpt
  if (hasBigNews) {
    const bigNewsMatch = blogContent.match(/## 🚨 The Big News\s*\n([^\n]+)/)
    excerpt = bigNewsMatch ? bigNewsMatch[1].trim().slice(0, 200) : ''
  }
  if (!excerpt) {
    const headlineMatch = blogContent.match(/\*\*[^*]*·[^*]*\*\*\n\*\*([^*]+)\*\*/)
    excerpt = headlineMatch
      ? headlineMatch[1].trim().slice(0, 200)
      : `Daily AI platform changelog digest for ${displayDate}.`
  }

  // Count platforms and categories
  const platformSections = blogContent.match(/^## (?!🚨).+/gm) || []
  const platformCount = platformSections.length + (hasBigNews ? 1 : 0)
  const newItems = (blogContent.match(/\*\*New\s*·/g) || []).length
  const improvedItems = (blogContent.match(/\*\*Improved\s*·/g) || []).length
  const fixedItems = (blogContent.match(/\*\*Fixed\s*·/g) || []).length
  const killedItems = (blogContent.match(/\*\*(Heads up|Killed|Deprecated)\s*·/g) || []).length
  const totalChanges = newItems + improvedItems + fixedItems + killedItems + (hasBigNews ? 1 : 0)

  // Title: Big News headline (if present), or biggest emoji card, or quiet-day fallback
  let title
  if (hasBigNews) {
    title = excerpt.slice(0, 80)
  } else if (excerpt !== `Daily AI platform changelog digest for ${displayDate}.`) {
    title = excerpt.slice(0, 80)
  } else {
    title = 'Quiet Day Across the AI Landscape'
  }

  const d = new Date(dateStr + 'T12:00:00Z')
  const infographicDate = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  // Featured: true if there's a major launch
  const featured = hasBigNews

  const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
date: "${dateStr}"
author: "AI ChangeLog"
excerpt: "${excerpt.replace(/"/g, '\\"')}"
tags: ["ai-changelog", "openai", "anthropic", "google-gemini", "deepseek", "ai-updates"]
readTime: "3 min read"
category: "ai-changelog"
serviceCategories: ["ai-services"]
featured: ${featured}
infographic:
  headline: "Changelog Update for ${infographicDate}"
  type: "stats"
  stats:
    - { label: "Platforms Updated", value: "${platformCount} of ${sourceCount}" }
    - { label: "Major Launch", value: "${hasBigNews ? 'Yes' : 'No'}" }
    - { label: "New", value: "${newItems}" }
    - { label: "Improved", value: "${improvedItems}" }
    - { label: "Fixed", value: "${fixedItems}" }
    - { label: "Total Changes", value: "${totalChanges}" }
---`

  return `${frontmatter}\n\n${blogContent}\n\n---\n\n*The AI ChangeLog is generated daily by Demand Signals. We scrape official news + changelogs, run them through Claude, and publish a plain-English summary so you don't have to read the docs. [Subscribe to our blog](/blog) for daily updates.*\n`
}

// ── Main ──
async function main() {
  console.log('=== AI ChangeLog Backfill (with news layer) ===\n')
  console.log(`Date range: ${START_DATE} → ${END_DATE}\n`)

  // 1a. Fetch Jina sources
  console.log('Step 1a: Fetching news + changelog sources via Jina Reader...')
  const jinaResults = []
  for (const source of JINA_SOURCES) {
    try {
      const content = await fetchViaJina(source.url)
      jinaResults.push({ source, content })
      console.log(`  ✓ [${source.tier}] ${source.name} (${content.length} chars)`)
    } catch (err) {
      console.log(`  ✗ [${source.tier}] ${source.name}: ${err.message}`)
      jinaResults.push({ source, content: '', error: err.message })
    }
  }

  // 1b. Fetch Claude Code releases by date
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

  // Build shared source content — separate news vs changelog tiers visually
  const newsContent = jinaResults
    .filter(c => !c.error && c.source.tier === 'news')
    .map(c => {
      const truncated = c.content.length > NEWS_TRUNCATE
        ? c.content.slice(0, NEWS_TRUNCATE) + '\n\n[... truncated]'
        : c.content
      return `## ${c.source.name} [NEWS]\nSource: ${c.source.url}\n\n${truncated}`
    })
    .join('\n\n---\n\n')

  const changelogContent = jinaResults
    .filter(c => !c.error && c.source.tier === 'changelog')
    .map(c => {
      const truncated = c.content.length > CHANGELOG_TRUNCATE
        ? c.content.slice(0, CHANGELOG_TRUNCATE) + '\n\n[... truncated]'
        : c.content
      return `## ${c.source.name} [CHANGELOG]\nSource: ${c.source.url}\n\n${truncated}`
    })
    .join('\n\n---\n\n')

  const sharedJinaContent = `═══════════════════════════════════════════════════════════
NEWS SOURCES (major launches go here)
═══════════════════════════════════════════════════════════

${newsContent}

═══════════════════════════════════════════════════════════
CHANGELOG SOURCES (incremental dev updates)
═══════════════════════════════════════════════════════════

${changelogContent}`

  // 2. Generate posts
  const start = new Date(START_DATE + 'T12:00:00Z')
  const end = new Date(END_DATE + 'T12:00:00Z')

  console.log(`Step 2: Generating posts from ${START_DATE} to ${END_DATE}...\n`)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const slug = `ai-changelog-${dateStr}`
    const filePath = resolve(BLOG_DIR, `${slug}.mdx`)

    if (existsSync(filePath)) {
      console.log(`  ⏭ ${slug}.mdx already exists — skipping`)
      continue
    }

    const yesterday = new Date(d)
    const today = new Date(d)
    today.setDate(today.getDate() + 1)

    const yesterdayDisplay = formatDate(yesterday)
    const todayDisplay = formatDate(today)
    const displayDate = formatDate(yesterday)

    let daySourceContent = sharedJinaContent

    const ccReleases = claudeCodeByDate[dateStr]
    if (ccReleases && ccReleases.length > 0) {
      const ccContent = ccReleases
        .map(r => `### ${r.tag} (released ${dateStr})\n\n${r.body}`)
        .join('\n\n')
      daySourceContent += `\n\n═══════════════════════════════════════════════════════════\nCLAUDE CODE — Releases on ${dateStr}\n═══════════════════════════════════════════════════════════\nSource: https://github.com/anthropics/claude-code/releases\n\n${ccContent}`
    }

    console.log(`  Generating ${slug}...${ccReleases ? ` (${ccReleases.length} Claude Code releases)` : ''}`)

    try {
      const prompt = buildPrompt(daySourceContent, yesterdayDisplay, todayDisplay, dateStr)
      let blogContent = await callClaude(prompt)

      if (!blogContent || blogContent.length < 100) {
        console.log(`  ✗ ${slug}: Claude returned insufficient content`)
        continue
      }

      // Safety net: strip AI-tells, tool-call syntax, and meta-commentary
      blogContent = sanitizeBody(blogContent)

      const mdx = buildMdx(blogContent, dateStr, displayDate, totalSources, totalSuccess)
      writeFileSync(filePath, mdx, 'utf-8')
      console.log(`  ✓ ${slug}.mdx (${blogContent.length} chars${/^## 🚨 The Big News/m.test(blogContent) ? ', MAJOR LAUNCH' : ''})`)

      // Rate limit: 30K input tokens/min, ~50K tokens/request → ~1.5 req/min
      await new Promise(r => setTimeout(r, 90000))
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
