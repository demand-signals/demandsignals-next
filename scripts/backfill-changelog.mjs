#!/usr/bin/env node
// ── Backfill AI ChangeLog posts ──────────────────────────────────────────
// Fetches changelogs once via Jina Reader, then generates MDX posts for a
// range of dates using the Claude API. Writes files to src/content/blog/.
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
    // Strip surrounding quotes
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
const END_DATE = '2026-04-15'
const BLOG_DIR = resolve(ROOT, 'src/content/blog')

const CHANGELOG_SOURCES = [
  { id: 'openai', name: 'OpenAI', url: 'https://platform.openai.com/docs/changelog' },
  { id: 'anthropic', name: 'Anthropic', url: 'https://docs.anthropic.com/en/docs/about-claude/models' },
  { id: 'anthropic-api', name: 'Anthropic API', url: 'https://docs.anthropic.com/en/api/changelog' },
  { id: 'google-gemini', name: 'Google Gemini', url: 'https://ai.google.dev/gemini-api/docs/changelog' },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://api-docs.deepseek.com/news/news0801' },
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

function buildPrompt(sourceContent, yesterdayDisplay, todayDisplay) {
  return `You are writing "The AI ChangeLog" — a daily digest that makes AI platform updates understandable for regular business owners. Think "AI for Dummies" — no jargon, no buzzwords. Explain things the way you'd explain them to a smart friend who doesn't work in tech.

This post covers changes from YESTERDAY: ${yesterdayDisplay}
Today (when this post goes live): ${todayDisplay}

Below are the raw changelog/docs pages scraped from each platform. Focus on changes from ${yesterdayDisplay} or the most recent entries. If a platform had no changes yesterday, skip it entirely — don't mention it.

Write the blog post body in markdown (NOT MDX — no imports, no JSX). Structure:

1. **TL;DR** — 2-3 sentences. What's the ONE thing a business owner should know today? Use simple language. "OpenAI made their cheapest model smarter" not "GPT-4o-mini received enhanced reasoning capabilities."

2. For each platform that had changes yesterday, write a section with:
   - H2 heading with platform name (e.g., "## OpenAI", "## Anthropic / Claude")
   - **What changed:** bullet points in plain English. Imagine explaining to someone who just learned what ChatGPT is.
   - **Why you should care:** one sentence per change explaining the real-world impact. "This means your customer service chatbot will give better answers" not "Enhanced model performance metrics."
   - If a change is tiny or only affects developers, say so: "This one's mainly for developers — skip if that's not you."

3. **The Bottom Line** — 2-3 sentences on what a business owner should actually DO (or not do) based on today's changes. Be specific: "If you use ChatGPT for customer emails, the new model is worth switching to" or "Nothing urgent today — check back tomorrow."

Rules:
- Write like you're texting a friend, not writing a research paper
- If nothing significant changed, say "Quiet day across the board" and keep it short
- Avoid: "leveraging", "capabilities", "paradigm", "ecosystem", "scalable", "cutting-edge"
- Use: "works better", "costs less", "new feature", "fixed a bug", "now you can..."
- If something is genuinely exciting, it's OK to show enthusiasm
- If something is boring, say it's boring

Do NOT include frontmatter — I'll add that separately.
Do NOT wrap in code fences.

---

${sourceContent}`
}

function buildMdx(blogContent, dateStr, displayDate, sourceCount, successCount) {
  const tldrMatch = blogContent.match(/\*\*TL;DR\*\*[\s:—-]*([\s\S]*?)(?:\n\n|\n##)/)
  const excerpt = tldrMatch
    ? tldrMatch[1].replace(/\n/g, ' ').trim().slice(0, 200)
    : `Daily AI platform changelog digest for ${displayDate}.`

  const platformSections = blogContent.match(/^## .+/gm) || []
  const platformCount = platformSections.filter(s => !s.includes('What This Means') && !s.includes('Bottom Line')).length

  const frontmatter = `---
title: "The AI ChangeLog — ${displayDate}"
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
    - { label: "Platforms Tracked", value: "${sourceCount}" }
    - { label: "Updates Today", value: "${platformCount}" }
    - { label: "Sources Checked", value: "${successCount}/${sourceCount}" }
---`

  return `${frontmatter}\n\n${blogContent}\n\n---\n\n*The AI ChangeLog is generated daily by Demand Signals. We scrape official changelogs, run them through Claude, and publish a plain-English summary so you don't have to read the docs. [Subscribe to our blog](/blog) for daily updates.*\n`
}

// ── Main ──
async function main() {
  console.log('=== AI ChangeLog Backfill ===\n')

  // 1. Fetch all changelog sources (once)
  console.log('Step 1: Fetching changelogs via Jina Reader...')
  const changelogs = []
  for (const source of CHANGELOG_SOURCES) {
    try {
      const content = await fetchViaJina(source.url)
      changelogs.push({ source, content })
      console.log(`  ✓ ${source.name} (${content.length} chars)`)
    } catch (err) {
      console.log(`  ✗ ${source.name}: ${err.message}`)
      changelogs.push({ source, content: '', error: err.message })
    }
  }

  const successCount = changelogs.filter(c => !c.error).length
  console.log(`\nFetched ${successCount}/${changelogs.length} sources\n`)

  if (successCount === 0) {
    console.error('All fetches failed. Aborting.')
    process.exit(1)
  }

  // Build source content (shared across all days)
  const sourceContent = changelogs
    .filter(c => !c.error)
    .map(c => {
      const truncated = c.content.length > 4000
        ? c.content.slice(0, 4000) + '\n\n[... truncated]'
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

    console.log(`  Generating ${slug}...`)

    try {
      const prompt = buildPrompt(sourceContent, yesterdayDisplay, todayDisplay)
      const blogContent = await callClaude(prompt)

      if (!blogContent || blogContent.length < 100) {
        console.log(`  ✗ ${slug}: Claude returned insufficient content`)
        continue
      }

      const mdx = buildMdx(blogContent, dateStr, displayDate, changelogs.length, successCount)
      writeFileSync(filePath, mdx, 'utf-8')
      console.log(`  ✓ ${slug}.mdx (${blogContent.length} chars)`)

      // Rate limit: wait 2s between API calls
      await new Promise(r => setTimeout(r, 2000))
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
