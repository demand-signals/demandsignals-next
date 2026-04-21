// ── Changelog post generator ──────────────────────────────────────────────
// Shared by the daily cron route and the backfill script.
//
// Two modes:
//   - live:     use Jina Reader to scrape current changelog pages (for "yesterday")
//   - backfill: use Claude + web_search to research a specific historical date
//
// Both modes converge on: fetch sources → Claude summarizes → commit MDX to GitHub

import { getAnthropicClient } from '@/lib/agent-utils'
import { fetchAllChangelogs } from '@/lib/changelog-sources'

const GITHUB_REPO = 'demand-signals/demandsignals-next'
const GITHUB_BRANCH = 'master'

export interface GenerateOptions {
  /** Date the post should cover, YYYY-MM-DD. Defaults to yesterday (UTC). */
  date?: string
  /** Force backfill mode (web_search) even if date is recent. */
  forceBackfill?: boolean
}

export interface GenerateResult {
  slug: string
  sourcesChecked: number
  sourcesSucceeded: number
  failedSources: string[]
  platformsWithUpdates: number
  contentLength: number
  mode: 'live' | 'backfill'
  filePath: string
}

async function commitToGitHub(filePath: string, content: string, message: string): Promise<void> {
  const token = process.env.GITHUB_DEMANDSIGNALS_NEXT
  if (!token) throw new Error('GITHUB_DEMANDSIGNALS_NEXT not configured')

  const apiBase = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  }

  let sha: string | undefined
  try {
    const existing = await fetch(`${apiBase}?ref=${GITHUB_BRANCH}`, { headers })
    if (existing.ok) {
      const data = await existing.json()
      sha = data.sha
    }
  } catch {
    // file doesn't exist — fine
  }

  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch: GITHUB_BRANCH,
  }
  if (sha) body.sha = sha

  const res = await fetch(apiBase, { method: 'PUT', headers, body: JSON.stringify(body) })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`GitHub API error (${res.status}): ${error}`)
  }
}

function buildFrontmatter({
  title,
  dateStr,
  excerpt,
  infographicDate,
  platformCount,
  totalSources,
  newItems,
  improvedItems,
  fixedItems,
  killedItems,
  totalChanges,
}: {
  title: string
  dateStr: string
  excerpt: string
  infographicDate: string
  platformCount: number
  totalSources: number
  newItems: number
  improvedItems: number
  fixedItems: number
  killedItems: number
  totalChanges: number
}): string {
  return `---
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
    - { label: "Platforms Updated", value: "${platformCount} of ${totalSources}" }
    - { label: "New", value: "${newItems}" }
    - { label: "Improved", value: "${improvedItems}" }
    - { label: "Fixed", value: "${fixedItems}" }
    - { label: "Killed", value: "${killedItems}" }
    - { label: "Total Changes", value: "${totalChanges}" }
---`
}

function buildMdx(frontmatter: string, body: string): string {
  return `${frontmatter}\n\n${body}\n\n---\n\n*The AI ChangeLog is generated daily by Demand Signals. We scrape official changelogs, run them through Claude, and publish a plain-English summary so you don't have to read the docs. [Subscribe to our blog](/blog) for daily updates.*\n`
}

function extractTitleAndExcerpt(body: string, fallbackDate: string): { title: string; excerpt: string } {
  const headlineMatch = body.match(/\*\*[^*]*·[^*]*\*\*\n\*\*([^*]+)\*\*/)
  const excerpt = headlineMatch
    ? headlineMatch[1].trim().slice(0, 200)
    : `Daily AI platform changelog digest for ${fallbackDate}.`
  const title = headlineMatch
    ? headlineMatch[1].trim().slice(0, 80)
    : 'Quiet Day Across the AI Landscape'
  return { title, excerpt }
}

function countChanges(body: string) {
  const platformSections = body.match(/^## .+/gm) || []
  const platformCount = platformSections.length
  const newItems = (body.match(/\*\*New\s*·/g) || []).length
  const improvedItems = (body.match(/\*\*Improved\s*·/g) || []).length
  const fixedItems = (body.match(/\*\*Fixed\s*·/g) || []).length
  const killedItems = (body.match(/\*\*(Heads up|Killed|Deprecated)\s*·/g) || []).length
  const totalChanges = newItems + improvedItems + fixedItems + killedItems
  return { platformCount, newItems, improvedItems, fixedItems, killedItems, totalChanges }
}

// ── LIVE MODE: scrape current changelog pages via Jina ───────────────────
async function generateLive(targetDate: Date): Promise<{ body: string; sourcesChecked: number; sourcesSucceeded: number; failedSources: string[] }> {
  const changelogs = await fetchAllChangelogs()
  const successCount = changelogs.filter(c => !c.error).length
  const failedSources = changelogs.filter(c => c.error).map(c => `${c.source.name}: ${c.error}`)

  if (successCount === 0) {
    throw new Error(`All changelog fetches failed: ${failedSources.join('; ')}`)
  }

  const dateStr = targetDate.toISOString().split('T')[0]
  const displayDate = targetDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const monthDay = targetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  const sourceContent = changelogs
    .filter(c => !c.error)
    .map(c => {
      const truncated = c.content.length > 10000 ? c.content.slice(0, 10000) + '\n\n[... truncated]' : c.content
      return `## ${c.source.name} Changelog\nSource: ${c.source.url}\n\n${truncated}`
    })
    .join('\n\n---\n\n')

  const claude = getAnthropicClient()
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: buildPrompt({ displayDate, dateStr, monthDay, sourceContent, mode: 'live' }),
    }],
  })

  const body = response.content[0].type === 'text' ? response.content[0].text : ''
  if (!body || body.length < 100) throw new Error('Claude returned insufficient content')

  return { body, sourcesChecked: changelogs.length, sourcesSucceeded: successCount, failedSources }
}

// ── BACKFILL MODE: use Claude + web_search for historical dates ──────────
async function generateBackfill(targetDate: Date): Promise<{ body: string; sourcesChecked: number; sourcesSucceeded: number; failedSources: string[] }> {
  const dateStr = targetDate.toISOString().split('T')[0]
  const displayDate = targetDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const monthDay = targetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  const claude = getAnthropicClient()
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 15 } as any],
    messages: [{
      role: 'user',
      content: `You are writing a historical edition of "The AI ChangeLog" — Demand Signals' daily digest of AI platform changes in plain English.

This post covers: ${displayDate} (${dateStr})

This is a BACKFILL — the date has already passed. You need to RESEARCH what each platform shipped on that specific date using web_search. Search for each platform's changelog or news for that day. Platforms to check:
- OpenAI (platform.openai.com/docs/changelog, or "OpenAI update ${monthDay} 2026")
- Anthropic (Claude, Claude Code — docs.anthropic.com, github.com/anthropics/claude-code)
- Google Gemini (ai.google.dev/gemini-api/docs/changelog)
- DeepSeek (api-docs.deepseek.com)
- Perplexity (perplexity.ai news)
- xAI / Grok

Use web_search 8-15 times to gather real data. Search queries like:
- "OpenAI changelog ${monthDay} 2026"
- "Anthropic Claude release ${monthDay} 2026"
- "Claude Code update ${dateStr}"
- "Google Gemini API ${monthDay} 2026"

After gathering real data, write the post using this exact format and rules:

${promptRulesBlock({ displayDate, dateStr, monthDay })}

Only include platforms that actually shipped changes on ${displayDate}. If a platform had NO changes, skip it entirely. If nothing happened across all platforms, write a short "Quiet day across the board" message.`,
    }],
  })

  // With web_search tool, response has multiple content blocks — extract text blocks
  const textBlocks = response.content.filter((b: any) => b.type === 'text').map((b: any) => b.text)
  const body = textBlocks.join('\n\n').trim()

  if (!body || body.length < 100) {
    throw new Error('Claude backfill returned insufficient content (may not have found data for this date)')
  }

  // Strip any preamble that web_search mode might include
  const cleanedBody = body.replace(/^[\s\S]*?(?=^## )/m, '') || body

  return {
    body: cleanedBody,
    sourcesChecked: 6,
    sourcesSucceeded: 6,
    failedSources: [],
  }
}

function promptRulesBlock({ displayDate, dateStr, monthDay }: { displayDate: string; dateStr: string; monthDay: string }): string {
  return `IMPORTANT INSTRUCTIONS:
1. Only report changes you actually verify via web_search. Don't invent features.
2. If a platform shipped updates, ALWAYS include them.
3. Start your response directly with the first ## heading. No preamble. No "Looking at the changes..." — jump straight to the content.

Write the blog post body in markdown (NOT MDX — no imports, no JSX). Do NOT include a TL;DR section.

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
- "New · [Area]" for new features
- "Improved · [Area]" for improvements
- "Fixed · Bugs" for bug fixes
- "Heads up · Deprecation" for deprecations

### Rules:
- Each change gets its own emoji card
- Group small bug fixes into one "Fixed · Bugs" card with highlights separated by " · "
- Headlines conversational, not corporate
- Explanations answer "so what?"
- Avoid: "leveraging", "capabilities", "paradigm", "ecosystem", "scalable", "cutting-edge"
- Use: "works better", "costs less", "new feature", "fixed a bug", "now you can..."

Do NOT include frontmatter — added separately.
Do NOT wrap the output in code fences.
Do NOT add any preamble text before the first ## heading.`
}

function buildPrompt({ displayDate, dateStr, monthDay, sourceContent, mode }: {
  displayDate: string; dateStr: string; monthDay: string; sourceContent: string; mode: 'live' | 'backfill'
}): string {
  const today = new Date()
  const todayDisplay = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return `You are writing "The AI ChangeLog" — a daily digest that makes AI platform updates understandable for regular business owners. Think "AI for Dummies" — no jargon, no buzzwords. Explain things the way you'd explain them to a smart friend who doesn't work in tech.

This post covers changes from YESTERDAY: ${displayDate} (${dateStr})
Today (when this post goes live): ${todayDisplay}

Below are changelog entries from each platform. CAREFULLY scan ALL sources for changes dated ${displayDate}, "${monthDay}, 2026", "${monthDay}", or "${dateStr}". Different platforms use different date formats.

${promptRulesBlock({ displayDate, dateStr, monthDay })}

---

${sourceContent}`
}

// ── Main entry point ────────────────────────────────────────────────────
export async function generateChangelogPost(opts: GenerateOptions = {}): Promise<GenerateResult> {
  // Resolve target date
  let targetDate: Date
  if (opts.date) {
    targetDate = new Date(`${opts.date}T12:00:00Z`)
    if (isNaN(targetDate.getTime())) throw new Error(`Invalid date: ${opts.date}`)
  } else {
    const now = new Date()
    targetDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }

  const dateStr = targetDate.toISOString().split('T')[0]
  const infographicDate = targetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const displayDate = targetDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  // Decide mode — backfill if date is more than ~36 hours old
  const now = new Date()
  const hoursOld = (now.getTime() - targetDate.getTime()) / (1000 * 60 * 60)
  const mode: 'live' | 'backfill' = opts.forceBackfill || hoursOld > 36 ? 'backfill' : 'live'

  // Generate body
  const { body, sourcesChecked, sourcesSucceeded, failedSources } =
    mode === 'backfill' ? await generateBackfill(targetDate) : await generateLive(targetDate)

  // Stats + frontmatter
  const { title, excerpt } = extractTitleAndExcerpt(body, displayDate)
  const { platformCount, newItems, improvedItems, fixedItems, killedItems, totalChanges } = countChanges(body)
  const frontmatter = buildFrontmatter({
    title, dateStr, excerpt, infographicDate,
    platformCount, totalSources: sourcesChecked,
    newItems, improvedItems, fixedItems, killedItems, totalChanges,
  })
  const mdx = buildMdx(frontmatter, body)

  // Commit
  const slug = `ai-changelog-${dateStr}`
  const filePath = `src/content/blog/${slug}.mdx`
  const commitMsg = `blog: The AI ChangeLog — ${dateStr}${mode === 'backfill' ? ' (backfill)' : ''}\n\n${mode === 'backfill' ? 'Backfill via web_search. ' : ''}Platforms: ${sourcesSucceeded}/${sourcesChecked} sources checked.`
  await commitToGitHub(filePath, mdx, commitMsg)

  return {
    slug,
    sourcesChecked,
    sourcesSucceeded,
    failedSources,
    platformsWithUpdates: platformCount,
    contentLength: body.length,
    mode,
    filePath,
  }
}
