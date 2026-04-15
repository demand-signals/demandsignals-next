import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret, getAnthropicClient, startAgentRun, completeAgentRun, failAgentRun } from '@/lib/agent-utils'
import { fetchAllChangelogs } from '@/lib/changelog-sources'

// ── Generate daily changelog blog post ─────────────────────────────────────
// Called by Vercel cron daily at 7am PT.
// 1. Scrapes all AI platform changelogs via Jina Reader
// 2. Sends to Claude to extract recent changes + write plain-English summary
// 3. Commits MDX file to GitHub via API (triggers Vercel auto-deploy)

const GITHUB_REPO = 'demand-signals/demandsignals-next'
const GITHUB_BRANCH = 'master'

async function commitToGitHub(filePath: string, content: string, message: string): Promise<boolean> {
  const token = process.env.GITHUB_DEMANDSIGNALS_NEXT
  if (!token) throw new Error('GITHUB_DEMANDSIGNALS_NEXT not configured')

  const apiBase = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  }

  // Check if file already exists (need SHA for update)
  let sha: string | undefined
  try {
    const existing = await fetch(`${apiBase}?ref=${GITHUB_BRANCH}`, { headers })
    if (existing.ok) {
      const data = await existing.json()
      sha = data.sha
    }
  } catch {
    // File doesn't exist yet — that's fine
  }

  // Create or update the file
  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch: GITHUB_BRANCH,
  }
  if (sha) body.sha = sha

  const res = await fetch(apiBase, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`GitHub API error (${res.status}): ${error}`)
  }

  return true
}

export const maxDuration = 120 // 2 minutes for Jina + Claude + GitHub

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!verifyCronSecret(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const runId = await startAgentRun('changelog', {})

  try {
    // 1. Fetch all changelogs via Jina Reader
    console.log('[changelog] Fetching changelogs via Jina Reader...')
    const changelogs = await fetchAllChangelogs()

    const successCount = changelogs.filter(c => !c.error).length
    const failedSources = changelogs.filter(c => c.error).map(c => `${c.source.name}: ${c.error}`)

    if (successCount === 0) {
      throw new Error(`All changelog fetches failed: ${failedSources.join('; ')}`)
    }

    console.log(`[changelog] Fetched ${successCount}/${changelogs.length} sources`)

    // 2. Build prompt for Claude
    // The post covers YESTERDAY's changes (cron runs in the morning, post is about prior day)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split('T')[0]
    const displayDate = yesterday.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const todayDisplay = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const sourceContent = changelogs
      .filter(c => !c.error)
      .map(c => {
        const truncated = c.content.length > 4000
          ? c.content.slice(0, 4000) + '\n\n[... truncated]'
          : c.content
        return `## ${c.source.name} Changelog\nSource: ${c.source.url}\n\n${truncated}`
      })
      .join('\n\n---\n\n')

    const claude = getAnthropicClient()

    const response = await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `You are writing "The AI ChangeLog" — a daily digest that makes AI platform updates understandable for regular business owners. Think "AI for Dummies" — no jargon, no buzzwords. Explain things the way you'd explain them to a smart friend who doesn't work in tech.

This post covers changes from YESTERDAY: ${displayDate}
Today (when this post goes live): ${todayDisplay}

Below are the raw changelog/docs pages scraped from each platform. Focus on changes from ${displayDate} or the most recent entries. If a platform had no changes yesterday, skip it entirely.

Write the blog post body in markdown (NOT MDX — no imports, no JSX).

Do NOT include a TL;DR section.

## Format

Group changes by platform. Each platform gets an H2 heading. Under each platform, list individual changes as emoji cards in this exact format:

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

---

${sourceContent}`,
        },
      ],
    })

    const blogContent = response.content[0].type === 'text' ? response.content[0].text : ''

    if (!blogContent || blogContent.length < 100) {
      throw new Error('Claude returned insufficient content')
    }

    // 3. Build the MDX file
    const slug = `ai-changelog-${dateStr}`
    const title = `The AI ChangeLog — ${displayDate}`

    // Extract first bold headline as excerpt
    const headlineMatch = blogContent.match(/\*\*[^*]*·[^*]*\*\*\n\*\*([^*]+)\*\*/)
    const excerpt = headlineMatch
      ? headlineMatch[1].trim().slice(0, 200)
      : `Daily AI platform changelog digest for ${displayDate}.`

    const platformSections = blogContent.match(/^## .+/gm) || []
    const platformCount = platformSections.length

    const frontmatter = `---
title: "${title}"
date: "${dateStr}"
author: "AI ChangeLog"
excerpt: "${excerpt.replace(/"/g, '\\"')}"
tags: ["ai-changelog", "openai", "anthropic", "google-gemini", "deepseek", "ai-updates"]
readTime: "3 min read"
category: "ai-changelog"
serviceCategories: ["ai-services"]
featured: false
infographic:
  headline: "AI Platform Updates"
  type: "stats"
  stats:
    - { label: "Platforms Tracked", value: "${changelogs.length}" }
    - { label: "Updates Today", value: "${platformCount}" }
    - { label: "Sources Checked", value: "${successCount}/${changelogs.length}" }
---`

    const mdxContent = `${frontmatter}\n\n${blogContent}\n\n---\n\n*The AI ChangeLog is generated daily by Demand Signals. We scrape official changelogs, run them through Claude, and publish a plain-English summary so you don't have to read the docs. [Subscribe to our blog](/blog) for daily updates.*\n`

    // 4. Commit to GitHub (triggers Vercel auto-deploy)
    const filePath = `src/content/blog/${slug}.mdx`
    console.log(`[changelog] Committing ${filePath} to GitHub...`)

    await commitToGitHub(
      filePath,
      mdxContent,
      `blog: The AI ChangeLog — ${dateStr}\n\nAuto-generated daily AI platform changelog digest.\nPlatforms: ${successCount}/${changelogs.length} sources checked.`
    )

    console.log(`[changelog] Committed ${slug}.mdx — Vercel deploy triggered`)

    // 5. Log success
    if (runId) {
      await completeAgentRun(runId, {
        slug,
        sourcesChecked: changelogs.length,
        sourcesSucceeded: successCount,
        failedSources,
        contentLength: blogContent.length,
        platformsWithUpdates: platformCount,
      }, 0, 0)
    }

    return NextResponse.json({
      success: true,
      slug,
      sourcesChecked: changelogs.length,
      sourcesSucceeded: successCount,
      failedSources,
      platformsWithUpdates: platformCount,
      message: `Committed ${slug}.mdx to GitHub — Vercel auto-deploy triggered`,
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[changelog] Failed:', errorMsg)

    if (runId) {
      await failAgentRun(runId, errorMsg)
    }

    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
