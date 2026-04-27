// ── Changelog post generator ──────────────────────────────────────────────
// Shared by the daily cron route and the backfill script.
//
// Two modes:
//   - live:     use Jina Reader to scrape current news + changelog pages
//   - backfill: use Jina (current pages contain dated entries) for historical dates
//
// Both modes converge on: fetch sources → Claude summarizes → commit MDX to GitHub
//
// Source list lives in changelog-sources.ts and is split into two tiers:
//   - 'news'      → catches major model launches (Opus 4.7, GPT-5.5, etc.)
//   - 'changelog' → catches incremental dev/API updates

import { getAnthropicClient } from '@/lib/agent-utils'
import { fetchAllChangelogs } from '@/lib/changelog-sources'

const GITHUB_REPO = 'demand-signals/demandsignals-next'
const GITHUB_BRANCH = 'master'

const NEWS_TRUNCATE = 15000
const CHANGELOG_TRUNCATE = 18000

export interface GenerateOptions {
  /** Date the post should cover, YYYY-MM-DD. Defaults to yesterday (UTC). */
  date?: string
  /** Force backfill mode even if date is recent. (No behavior diff anymore — both modes use Jina now.) */
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
  hasMajorLaunch: boolean
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
  totalChanges,
  hasMajorLaunch,
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
  totalChanges: number
  hasMajorLaunch: boolean
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
featured: ${hasMajorLaunch}
infographic:
  headline: "Changelog Update for ${infographicDate}"
  type: "stats"
  stats:
    - { label: "Platforms Updated", value: "${platformCount} of ${totalSources}" }
    - { label: "Major Launch", value: "${hasMajorLaunch ? 'Yes' : 'No'}" }
    - { label: "New", value: "${newItems}" }
    - { label: "Improved", value: "${improvedItems}" }
    - { label: "Fixed", value: "${fixedItems}" }
    - { label: "Total Changes", value: "${totalChanges}" }
---`
}

function buildMdx(frontmatter: string, body: string): string {
  return `${frontmatter}\n\n${body}\n\n---\n\n*The AI ChangeLog is generated daily by Demand Signals. We scrape official news + changelogs, run them through Claude, and publish a plain-English summary so you don't have to read the docs. [Subscribe to our blog](/blog) for daily updates.*\n`
}

function extractTitleAndExcerpt(body: string, fallbackDate: string): { title: string; excerpt: string; hasMajorLaunch: boolean } {
  const hasMajorLaunch = /^## 🚨 The Big News/m.test(body)

  let excerpt = ''
  if (hasMajorLaunch) {
    const bigNewsMatch = body.match(/## 🚨 The Big News\s*\n([^\n]+)/)
    excerpt = bigNewsMatch ? bigNewsMatch[1].trim().slice(0, 200) : ''
  }
  if (!excerpt) {
    const headlineMatch = body.match(/\*\*[^*]*·[^*]*\*\*\n\*\*([^*]+)\*\*/)
    excerpt = headlineMatch
      ? headlineMatch[1].trim().slice(0, 200)
      : `Daily AI platform changelog digest for ${fallbackDate}.`
  }

  let title: string
  if (hasMajorLaunch) {
    title = excerpt.slice(0, 80)
  } else if (excerpt !== `Daily AI platform changelog digest for ${fallbackDate}.`) {
    title = excerpt.slice(0, 80)
  } else {
    title = 'Quiet Day Across the AI Landscape'
  }

  return { title, excerpt, hasMajorLaunch }
}

function countChanges(body: string) {
  const hasMajorLaunch = /^## 🚨 The Big News/m.test(body)
  const platformSections = body.match(/^## (?!🚨).+/gm) || []
  const platformCount = platformSections.length + (hasMajorLaunch ? 1 : 0)
  const newItems = (body.match(/\*\*New\s*·/g) || []).length
  const improvedItems = (body.match(/\*\*Improved\s*·/g) || []).length
  const fixedItems = (body.match(/\*\*Fixed\s*·/g) || []).length
  const killedItems = (body.match(/\*\*(Heads up|Killed|Deprecated)\s*·/g) || []).length
  const totalChanges = newItems + improvedItems + fixedItems + killedItems + (hasMajorLaunch ? 1 : 0)
  return { platformCount, newItems, improvedItems, fixedItems, killedItems, totalChanges, hasMajorLaunch }
}

/**
 * Safety net: strip AI-tells, tool-call syntax, and meta-commentary.
 * These patterns scream "AI wrote this" and break the human-columnist voice.
 *
 * Examples this catches:
 *   • "I need to search for changes from April 24..."
 *   • "Let me check the changelogs..."
 *   • "Looking at the sources, I notice..."
 *   • "[I need to verify this]"
 *   • <web_search>...</web_search>
 */
function sanitizeBody(body: string): string {
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
    // Inline meta-narration patterns (mid-paragraph)
    .replace(/\n\nI (need to|will|would|should) (search|check|examine|look)[^\n]*\n/gi, '\n\n')
    .replace(/\n\nLet me (search|check|examine|look)[^\n]*\n/gi, '\n\n')
    // Collapse multiple blank lines created by removals
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // Strip any preamble before the first ## heading
  const firstHeadingIdx = cleaned.search(/^## /m)
  if (firstHeadingIdx > 0) {
    cleaned = cleaned.slice(firstHeadingIdx)
  }

  return cleaned
}

// ── Generate via Jina (works for both live "yesterday" and backfill) ──────
async function generateFromJina(targetDate: Date): Promise<{ body: string; sourcesChecked: number; sourcesSucceeded: number; failedSources: string[] }> {
  const changelogs = await fetchAllChangelogs()
  const successCount = changelogs.filter(c => !c.error).length
  const failedSources = changelogs.filter(c => c.error).map(c => `${c.source.name}: ${c.error}`)

  if (successCount === 0) {
    throw new Error(`All source fetches failed: ${failedSources.join('; ')}`)
  }

  const dateStr = targetDate.toISOString().split('T')[0]
  const displayDate = targetDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const monthDay = targetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  // Split sources by tier for prompt clarity
  const newsSources = changelogs.filter(c => !c.error && c.source.tier === 'news')
  const changelogSources = changelogs.filter(c => !c.error && c.source.tier === 'changelog')

  const newsContent = newsSources
    .map(c => {
      const truncated = c.content.length > NEWS_TRUNCATE ? c.content.slice(0, NEWS_TRUNCATE) + '\n\n[... truncated]' : c.content
      return `## ${c.source.name} [NEWS]\nSource: ${c.source.url}\n\n${truncated}`
    })
    .join('\n\n---\n\n')

  const changelogContent = changelogSources
    .map(c => {
      const truncated = c.content.length > CHANGELOG_TRUNCATE ? c.content.slice(0, CHANGELOG_TRUNCATE) + '\n\n[... truncated]' : c.content
      return `## ${c.source.name} [CHANGELOG]\nSource: ${c.source.url}\n\n${truncated}`
    })
    .join('\n\n---\n\n')

  const sourceContent = `═══════════════════════════════════════════════════════════
NEWS SOURCES (major launches go here)
═══════════════════════════════════════════════════════════

${newsContent}

═══════════════════════════════════════════════════════════
CHANGELOG SOURCES (incremental dev updates)
═══════════════════════════════════════════════════════════

${changelogContent}`

  const claude = getAnthropicClient()
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4500,
    messages: [{
      role: 'user',
      content: buildPrompt({ displayDate, dateStr, monthDay, sourceContent }),
    }],
  })

  const rawBody = response.content[0].type === 'text' ? response.content[0].text : ''
  const body = sanitizeBody(rawBody)

  if (!body || body.length < 100) {
    throw new Error('Claude returned insufficient content after sanitization')
  }

  return { body, sourcesChecked: changelogs.length, sourcesSucceeded: successCount, failedSources }
}

function buildPrompt({ displayDate, dateStr, monthDay, sourceContent }: {
  displayDate: string; dateStr: string; monthDay: string; sourceContent: string
}): string {
  const today = new Date()
  const todayDisplay = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return `You are a tech journalist writing "The AI ChangeLog" — Demand Signals' daily column where one person reads every AI platform's updates and translates them for regular business owners. The voice is human, casual, slightly opinionated. A real person at a desk drinking coffee, not an AI chatbot.

This post covers changes from: ${displayDate} (${dateStr})
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

2. **Date discipline (works both ways).** Only include announcements that match ${displayDate} (${dateStr}). News pages list entries from many dates — don't slot a launch from a different date under this one. BUT: if you can clearly see an entry dated to this day in the source content, INCLUDE IT confidently. The goal is accuracy, not paranoia. Don't reject real dated launches by being over-conservative.

   **Date formats vary across sources — recognize ALL of these as matching this day:**
   • "${displayDate}" (full)
   • "${monthDay}, 2026" (e.g. April 23, 2026)
   • "${monthDay.replace(/^([A-Z][a-z]{2})[a-z]+/, '$1')}, 2026" (abbreviated, e.g. Apr 23, 2026 — OpenAI uses this format)
   • "${dateStr}" (ISO, e.g. 2026-04-23)
   • "${dateStr.split('-').slice(1).join('/')}/26" (e.g. 04/23/26)
   • Same-day relative phrasing in changelog entries

   **Example of what TO catch:** If OpenAI News shows three entries marked "Apr 23, 2026" all about GPT-5.5, that's a major launch on this date — feature it as Big News.

3. **Cross-reference within the same date.** If both a news source AND a changelog source mention the same launch on ${dateStr}, treat it as one elevated story — don't duplicate.

4. **Don't invent. Don't pre-date. Don't post-date.** Only report what's actually dated ${monthDay}, 2026 (or ${dateStr}, or ${displayDate}) in the source content.

5. **Source link integrity — links must match the content.** The URL in \`[Source →](url)\` MUST point to a page that describes the SPECIFIC change you wrote about. If you're writing about a Claude Code fix, link to the Claude Code release page — NOT to an unrelated Anthropic news URL just because it's nearby. Wrong-link-attached-to-content is worse than no source link at all.

6. **Quiet-day output: short but varied.** When nothing shipped, write 1-3 sentences with personality. Vary the opening — don't reuse "Quiet day across the AI landscape" verbatim every time. A human columnist would write differently each time. Examples of acceptable variation:
   • "Mondays. Even AI labs have them — nothing shipped on ${displayDate}."
   • "Crickets across the AI world today. No model drops, no API tweaks, no announcements worth flagging."
   • "Slow Saturday. OpenAI, Anthropic, Google, and the rest all kept quiet."
   • "Nothing major from any of the platforms today. Sometimes that's the whole story."
   • "${monthDay} was a wash — no releases or announcements anywhere."
   Keep it under ~40 words. ONE short paragraph max. Don't write multi-paragraph essays about why it's quiet, don't speculate about "the calm before the storm," don't bridge to other dates. Just acknowledge the silence with personality and move on.

5. **Start your response directly with the first ## heading.** No preamble. No throat-clearing. Jump straight to the content.

═══════════════════════════════════════════════════════════
FORMAT
═══════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════
SOURCE LINKS — REQUIRED ON EVERY ITEM
═══════════════════════════════════════════════════════════

Every emoji card AND the Big News section MUST end with a source link in this exact format:

\`[Source →](https://specific-url-to-the-post)\`

Use the MOST SPECIFIC URL you can find in the source markdown:
  • Best:  link to the individual announcement post (e.g. \`https://www.anthropic.com/news/claude-opus-4-7\`)
  • Good:  link to the GitHub release page (e.g. \`https://github.com/anthropics/claude-code/releases/tag/v2.1.117\`)
  • OK:    link to the dated changelog entry if the URL has a fragment
  • Last resort: the page-level URL provided at the top of each source section

The Jina markdown preserves links — look for \`[text](https://...)\` patterns near the entry you're describing. Pick the link whose anchor text matches the announcement.

Never link to homepages. Never invent URLs that aren't in the source content. If you genuinely can't find any specific link, use the source URL given at the top of that section ("Source: https://...").

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

[Source →](https://specific-announcement-url)
\`\`\`

Then group remaining changes by platform with H2 headings + emoji cards:

\`\`\`
## Claude Code
What's new from Anthropic's AI coding assistant

EMOJI
**Category · Feature Area**
**Conversational headline describing the change**
2-3 sentence explanation in plain English. Talk like you're texting a friend.

[Source →](https://specific-changelog-or-release-url)
\`\`\`

### Categories and emojis
- New features: 🧠 ⚡ 🛠️ 🤖 🎨 📊 🔑
- Improved: 🔄 📋 ⚠️ 💾
- Fixed / Bug fixes: 🔧
- Deprecation / Heads up: 🗓️ ⚠️

### Category labels
- "New · [Area]"
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

  // Decide mode label (both modes use Jina now — kept for telemetry)
  const now = new Date()
  const hoursOld = (now.getTime() - targetDate.getTime()) / (1000 * 60 * 60)
  const mode: 'live' | 'backfill' = opts.forceBackfill || hoursOld > 36 ? 'backfill' : 'live'

  // Generate body
  const { body, sourcesChecked, sourcesSucceeded, failedSources } = await generateFromJina(targetDate)

  // Stats + frontmatter
  const { title, excerpt, hasMajorLaunch } = extractTitleAndExcerpt(body, displayDate)
  const { platformCount, newItems, improvedItems, fixedItems, totalChanges } = countChanges(body)
  const frontmatter = buildFrontmatter({
    title, dateStr, excerpt, infographicDate,
    platformCount, totalSources: sourcesChecked,
    newItems, improvedItems, fixedItems, totalChanges,
    hasMajorLaunch,
  })
  const mdx = buildMdx(frontmatter, body)

  // Commit
  const slug = `ai-changelog-${dateStr}`
  const filePath = `src/content/blog/${slug}.mdx`
  const launchTag = hasMajorLaunch ? ' [MAJOR LAUNCH]' : ''
  const commitMsg = `blog: The AI ChangeLog — ${dateStr}${mode === 'backfill' ? ' (backfill)' : ''}${launchTag}\n\n${mode === 'backfill' ? 'Backfill via Jina news+changelog tiers. ' : ''}Platforms: ${sourcesSucceeded}/${sourcesChecked} sources checked.`
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
    hasMajorLaunch,
  }
}
