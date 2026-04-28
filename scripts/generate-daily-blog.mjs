#!/usr/bin/env node
// ── Local runner for daily blog generator ────────────────────────────────
// Same research + write logic as src/lib/blog-generator.ts, but writes to
// local disk for review before pushing (instead of auto-committing).
//
// Usage: node scripts/generate-daily-blog.mjs
// Requires: ANTHROPIC_API_KEY in .env.local

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'

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

const BLOG_DIR = resolve(ROOT, 'src/content/blog')

// ── DSIG service catalog (mirrors blog-generator.ts) ─────────────────────
const DSIG_SERVICES = [
  { url: '/ai-services/ai-automation-strategies', anchor: 'AI adoption strategies', topics: ['ai adoption', 'ai strategy', 'business ai'] },
  { url: '/ai-services/ai-workforce-automation', anchor: 'AI workforce automation', topics: ['ai automation', 'ai employees', 'workforce ai'] },
  { url: '/ai-services/ai-agent-infrastructure', anchor: 'AI agent infrastructure', topics: ['ai agents', 'agentic', 'autonomous'] },
  { url: '/ai-services/ai-automated-outreach', anchor: 'AI-powered outreach', topics: ['outreach', 'cold email', 'sales automation'] },
  { url: '/ai-services/ai-agent-swarms', anchor: 'AI agent swarms', topics: ['multi-agent', 'agent swarms', 'parallel agents'] },
  { url: '/ai-services/private-llms', anchor: 'private LLM deployment', topics: ['private llm', 'self-hosted llm', 'on-prem ai'] },
  { url: '/ai-services/clawbot-setup', anchor: 'Claude Code setup services', topics: ['claude code', 'ai coding', 'developer tools'] },
  { url: '/demand-generation/geo-aeo-llm-optimization', anchor: 'LLM optimization (GEO/AEO)', topics: ['geo', 'aeo', 'llm seo', 'chatgpt seo', 'answer engine'] },
  { url: '/demand-generation/local-seo', anchor: 'local SEO', topics: ['local seo', 'google business', 'gmb', 'local search'] },
  { url: '/demand-generation/geo-targeting', anchor: 'geo-targeting', topics: ['geo-targeting', 'location based marketing', 'multi-location'] },
  { url: '/demand-generation/gbp-admin', anchor: 'Google Business Profile management', topics: ['google business profile', 'gbp', 'google maps'] },
  { url: '/demand-generation/systems', anchor: 'demand generation systems', topics: ['demand gen', 'lead gen', 'marketing systems'] },
  { url: '/content-social/ai-content-generation', anchor: 'AI content generation', topics: ['content generation', 'ai writing', 'content automation'] },
  { url: '/content-social/ai-social-media-management', anchor: 'AI social media management', topics: ['social media', 'social automation', 'content scheduling'] },
  { url: '/content-social/ai-review-auto-responders', anchor: 'AI review responders', topics: ['review management', 'review responses', 'reputation'] },
  { url: '/content-social/ai-auto-blogging', anchor: 'AI auto-blogging', topics: ['auto blogging', 'blog automation', 'content marketing'] },
  { url: '/content-social/ai-content-repurposing', anchor: 'AI content repurposing', topics: ['repurposing', 'content distribution', 'multi-channel'] },
  { url: '/websites-apps/wordpress-development', anchor: 'WordPress development', topics: ['wordpress', 'cms'] },
  { url: '/websites-apps/react-next-webapps', anchor: 'React/Next.js web apps', topics: ['react', 'nextjs', 'web apps', 'spa'] },
  { url: '/websites-apps/mobile-apps', anchor: 'iOS & Android app development', topics: ['mobile apps', 'ios', 'android'] },
  { url: '/websites-apps/vibe-coded', anchor: 'vibe-coded web apps', topics: ['vibe coding', 'rapid prototyping'] },
  { url: '/websites-apps/design', anchor: 'UI/UX design', topics: ['ui design', 'ux', 'visual design'] },
  { url: '/websites-apps/hosting', anchor: 'agent & app hosting', topics: ['hosting', 'deployment', 'devops'] },
]

// ── Helpers ──────────────────────────────────────────────────────────────

function pickAuthor(category) {
  switch (category) {
    case 'ai-engineering': return 'Cyrus'
    case 'search-updates':
    case 'core-updates':
    case 'search-central': return 'Jasper'
    case 'industry-trends': return 'Hunter'
    case 'case-studies': return 'Hunter'
    case 'how-to': return 'Morgan'
    default: return 'Cyrus'
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

function calcReadTime(text) {
  const words = text.split(/\s+/).length
  const minutes = Math.max(1, Math.round(words / 220))
  return `${minutes} min read`
}

function getRecentTitles(days = 21) {
  try {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const files = readdirSync(BLOG_DIR).filter(f => f.endsWith('.mdx') && !f.startsWith('ai-changelog-'))
    const titles = []
    for (const f of files) {
      try {
        const raw = readFileSync(resolve(BLOG_DIR, f), 'utf-8')
        const { data } = matter(raw)
        if (data.date && new Date(data.date) >= cutoff && data.title) {
          titles.push(data.title)
        }
      } catch {}
    }
    return titles.slice(0, 30)
  } catch {
    return []
  }
}

function sanitizeBody(body) {
  let cleaned = body
    .replace(/<web_search>[\s\S]*?<\/web_search>/g, '')
    .replace(/<search>[\s\S]*?<\/search>/g, '')
    .replace(/\[I (need|will|would|should|cannot|can't)[^\]]*?\]/gi, '')
    .replace(/\[(Note|Editor|TODO|searching)[^\]]*?\]/gi, '')
    .replace(/^I (need to|will|would|should|notice|cannot|can't|don't have)[^.\n]*\.\s*/gim, '')
    .replace(/^Let me (check|examine|look at|analyze|review|search)[^.\n]*\.\s*/gim, '')
    .replace(/^Looking at (the|each)[^.\n]*\.\s*/gim, '')
    .replace(/^Based on (my research|the available data|the sources)[^.\n]*\.\s*/gim, '')
    .replace(/^After (reviewing|examining|analyzing) (the|each)[^.\n]*\.\s*/gim, '')
    .replace(/^Upon (further|closer)[^.\n]*\.\s*/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return cleaned
}

async function fetchWithRetry(body, label) {
  const maxRetries = 4
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    if (res.ok) return res.json()

    const errText = await res.text()

    if (res.status === 429 && attempt < maxRetries) {
      // Rate limit — wait 75s and retry (resets at minute boundary)
      const waitMs = 75_000
      console.log(`    [${label}] 429 rate limit (attempt ${attempt}/${maxRetries}), waiting ${waitMs / 1000}s...`)
      await new Promise(r => setTimeout(r, waitMs))
      continue
    }

    throw new Error(`Claude API error (${res.status}): ${errText}`)
  }
  throw new Error(`Claude API: max retries exceeded for ${label}`)
}

async function callClaudeWithSearch(prompt, maxTokens = 4500) {
  const data = await fetchWithRetry({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 12 }],
    messages: [{ role: 'user', content: prompt }],
  }, 'research')
  return data.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')
}

async function callClaudeNoSearch(prompt, maxTokens = 8000) {
  const data = await fetchWithRetry({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  }, 'write')
  return data.content[0]?.text || ''
}

// ── Phase 1: Research ────────────────────────────────────────────────────

async function researchTopic(targetDate) {
  const dateStr = targetDate.toISOString().split('T')[0]
  const displayDate = targetDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const recentTitles = getRecentTitles()
  const recentTitlesBlock = recentTitles.length ? recentTitles.map(t => `  - ${t}`).join('\n') : '  (none)'
  const serviceCatalog = DSIG_SERVICES.map(s => `  - ${s.url} → "${s.anchor}" (topics: ${s.topics.join(', ')})`).join('\n')

  const prompt = `You are the editorial researcher for "Demand Signals" (DSIG) — an AI-first demand generation agency that builds AI-powered websites, AI demand generation systems, AI content + social automation, and AI agent infrastructure for businesses.

Today is ${displayDate} (${dateStr}). Your job: identify the SINGLE best topic to publish a long-form blog post about today, and gather the research the writer will need.

═══════════════════════════════════════════════════════════
DSIG SERVICE CATALOG (for internal linking)
═══════════════════════════════════════════════════════════

${serviceCatalog}

═══════════════════════════════════════════════════════════
RECENTLY PUBLISHED — DO NOT REPEAT THESE TOPICS
═══════════════════════════════════════════════════════════

${recentTitlesBlock}

═══════════════════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════════════════

Use web_search to scan the prior 24-72 hours for the highest-value topic in any of these areas:
- AI model releases or major capability changes that affect business buyers
- Google search/algorithm updates (especially anything that impacts local search, AI Overview, or LLM visibility)
- New GEO/AEO/LLM-optimization tactics or research
- Local SEO, Google Business Profile, multi-location marketing news
- AI agent / autonomous workflow news that businesses can act on
- AI content automation, social media automation news
- Marketing automation breakthroughs

Score each candidate by:
1. Search volume signal — Are people actively searching this NOW?
2. DSIG service relevance — Does this connect to a specific service we sell?
3. Novelty — Has this been covered to death already, or is there a fresh angle?
4. Backlink potential — Will the post be citation-worthy by other sites?
5. AEO/GEO suitability — Is this the kind of question someone asks ChatGPT?

Pick ONE topic. Then return a JSON object with this EXACT structure (and nothing else):

{
  "topic": "Concise topic phrase, 60 chars max",
  "angle": "What unique angle DSIG should take — what's our opinionated POV?",
  "category": "ai-engineering | search-updates | core-updates | search-central | industry-trends | how-to | case-studies",
  "service_categories": ["websites-apps" | "demand-generation" | "content-social" | "ai-services"],
  "target_keyword": "primary SEO keyword (2-5 words)",
  "supporting_keywords": ["k1", "k2", "k3", "k4"],
  "internal_links": [
    { "url": "/path/from/catalog/above", "anchor": "natural anchor text", "why": "why this service ties in" }
  ],
  "external_sources": [
    { "url": "https://...", "title": "...", "why_relevant": "what this source contributes" }
  ],
  "faq_seeds": [
    { "question": "Specific question someone would ask", "short_answer_hint": "1-sentence answer for the writer to expand" }
  ],
  "infographic_stats": [
    { "label": "Stat label (3-4 words)", "value": "The actual number/percentage" }
  ],
  "raw_research_notes": "Detailed notes — facts, numbers, names, quotes, dates the writer should weave in. 200-400 words."
}

REQUIREMENTS:
- 2-3 internal_links from the DSIG catalog (don't invent URLs not in the catalog)
- 3-5 external_sources — see external source rules below
- 4-6 faq_seeds — questions a real prospect would ask
- 4-6 infographic_stats — real numbers from your research, not made up
- raw_research_notes should give the writer enough to write 1500-2500 words without further research

═══════════════════════════════════════════════════════════
EXTERNAL SOURCE RULES — CRITICAL
═══════════════════════════════════════════════════════════

We are an agency. Every external link sends our readers to a potential competitor. Pick sources carefully.

✓ PREFER (authoritative + non-competitive):
  • AI vendor primary sources: anthropic.com, openai.com, ai.google.dev, ai.meta.com, x.ai, mistral.ai, deepmind.google
  • Big-tech corporate blogs: blog.google, microsoft.com/blog, aws.amazon.com/blogs, developer.apple.com
  • Academic research: arxiv.org, *.edu (Princeton, Stanford, MIT, CMU, Harvard, Georgia Tech, etc.)
  • Industry research firms: gartner.com, forrester.com, mckinsey.com, bcg.com, idc.com, pewresearch.org, statista.com
  • Government / standards bodies: ftc.gov, nist.gov, w3.org, schema.org, sec.gov
  • Major news / trade pubs: reuters.com, bloomberg.com, wsj.com, ft.com, theverge.com, techcrunch.com, wired.com, arstechnica.com, axios.com, venturebeat.com
  • Open-source / dev community: github.com, stackoverflow.com, dev.to
  • Google's own SEO docs: developers.google.com, support.google.com, search.googleblog.com

❌ AVOID — DO NOT LINK to any of these (competitors of DSIG):
  • Marketing agencies of any size — even "thought leadership" agency blogs
  • SEO/GEO/AEO agencies — anyone selling SEO services
  • Web dev / WordPress / React / design agencies
  • AI agencies / "AI implementation" consultancies
  • Content marketing platforms that also sell agency services (Conductor, Hubspot blog when it's pure agency content, Semrush blog content services, etc.)
  • Any site whose nav shows "Hire us" / "Services" / "Get a free audit" / "Book a call"
  • Specifically blacklisted: starmorph.com, conductor.com, bluemagnet.co.za, marketingcode.com, seositestool.com, neilpatel.com, backlinko.com, brafton.com, contentmarketinginstitute.com (if behind agency), searchenginejournal.com (often pushes their consulting), searchenginewatch.com
  • Search Engine Land / Search Engine Roundtable — case by case, prefer to skip if alternative exists

When in doubt, ask: "Would I send a paying customer to this site?" If no, don't cite it.

If you can't find 3-5 authoritative non-competitor sources, RETURN FEWER. 3 great non-competitor sources beats 5 sources that include 2 agency blogs.

Return ONLY the JSON object. No preamble. No markdown fences.`

  console.log('  Phase 1: Researching...')
  const text = await callClaudeWithSearch(prompt)

  // Extract JSON
  let jsonStr = text.trim()
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (jsonMatch) jsonStr = jsonMatch[0]

  const parsed = JSON.parse(jsonStr)
  if (!parsed.topic || !parsed.target_keyword || !parsed.raw_research_notes) {
    throw new Error('Research output missing required fields')
  }
  return parsed
}

// ── Phase 2: Write ───────────────────────────────────────────────────────

async function writeBlogPost(research, targetDate) {
  const displayDate = targetDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const internalLinksBlock = research.internal_links.map(l => `  - ${l.anchor} → ${l.url}  (use because: ${l.why})`).join('\n')
  const externalSourcesBlock = research.external_sources.map(s => `  - "${s.title}" → ${s.url}  (use because: ${s.why_relevant})`).join('\n')
  const faqSeedsBlock = research.faq_seeds.map(q => `  - Q: ${q.question}\n    Hint: ${q.short_answer_hint}`).join('\n')

  const prompt = `You are writing a 1500-2500 word blog post for Demand Signals (DSIG) — an AI-first demand generation agency. Today is ${displayDate}.

═══════════════════════════════════════════════════════════
VOICE — READ FIRST
═══════════════════════════════════════════════════════════

You're a tech journalist with skin in the game. DSIG has views, not just summaries. Direct, opinionated, expert-feeling. Conversational but informed — like an industry veteran writing a column, not a chatbot answering a question.

❌ FORBIDDEN PHRASES (AI-tells):
  • "I need to research..." / "Let me check..." / "Looking at the data..."
  • "Based on my research..." / "Upon further analysis..."
  • Any sentence starting with "I" that describes thinking/researching
  • Corporate filler: "leveraging", "robust solutions", "cutting-edge", "paradigm", "ecosystem", "scalable solutions"
  • Vague openers: "In today's fast-paced digital landscape..."

✓ INSTEAD:
  • Open with a surprising fact, real-world scenario, or contrarian take
  • Use "we" sparingly when speaking as DSIG — never "I"
  • Use "you" when addressing the reader
  • Past tense for what shipped, present for what's happening, future for predictions
  • Short, declarative sentences mixed with longer analytical ones
  • Concrete examples > abstract generalizations

═══════════════════════════════════════════════════════════
TOPIC + RESEARCH
═══════════════════════════════════════════════════════════

TOPIC: ${research.topic}
ANGLE: ${research.angle}
TARGET KEYWORD: "${research.target_keyword}"
SUPPORTING KEYWORDS: ${research.supporting_keywords.join(', ')}

RESEARCH NOTES (use these — don't invent additional facts):
${research.raw_research_notes}

═══════════════════════════════════════════════════════════
LINKS YOU MUST USE
═══════════════════════════════════════════════════════════

INTERNAL LINKS (weave 2-3 of these into the body naturally — NOT all in one paragraph):
${internalLinksBlock}

EXTERNAL SOURCES (cite 3-5 inline as [anchor text](url) — NOT footnotes, NOT a list at the bottom):
${externalSourcesBlock}

FAQ SEEDS (turn these into the FAQ section near the end):
${faqSeedsBlock}

═══════════════════════════════════════════════════════════
STRUCTURE
═══════════════════════════════════════════════════════════

1. **Hook** (2 paragraphs, no H2) — Open with a surprising fact, contrarian take, or real scenario. Pull the reader in. Mention the target keyword naturally in paragraph 1 or 2.

2. **Body** — 4-6 H2 sections covering the topic. Each H2 should:
   - Have a conversational headline (not "Introduction" or "Overview")
   - Include the target keyword in 2-3 of the H2s naturally
   - Cite at least one external source per major section
   - Mix short paragraphs with longer ones for rhythm

3. **What This Means For Your Business** — One H2 with practical implications. This is where DSIG service tie-ins happen most naturally. Example: "If you're running a multi-location business, this is the kind of thing we handle in our [GBP management work](url)."

4. **FAQ** — H2 "Frequently Asked Questions" with 4-6 ### sub-questions and 2-3 sentence answers.

5. **Closer** — One short paragraph + soft CTA. Not pitchy. "Want help applying this to your business? That's what we do at Demand Signals — [the most relevant internal link]."

═══════════════════════════════════════════════════════════
OUTPUT RULES
═══════════════════════════════════════════════════════════

- Output: pure markdown body. NO frontmatter (system adds it).
- DO NOT wrap output in code fences.
- DO NOT add preamble before the first paragraph.
- DO NOT emit \`<web_search>\`, tool-call syntax, or bracketed editor notes.
- Internal links: format as [anchor](/path) — relative paths starting with / ONLY. NEVER prefix with a domain (no dsig.ai, demandsignals.co, https://, etc.). The catalog above shows the exact paths to use.
- External links: format as [anchor](url) inline within the prose.
- Cite all stats from research notes — do not fabricate numbers.
- Word count: 1500-2500 words.

Begin writing now. Start with the hook — no H2 yet on the first 2 paragraphs.`

  console.log('  Phase 2: Writing...')
  const rawBody = await callClaudeNoSearch(prompt)
  const body = sanitizeBody(rawBody)

  if (!body || body.length < 1000) {
    throw new Error(`Writer returned insufficient content (${body.length} chars)`)
  }

  return body
}

// ── Build MDX ────────────────────────────────────────────────────────────

function buildFrontmatter({ title, dateStr, excerpt, author, category, serviceCategories, tags, readTime, infographicStats, topic }) {
  const tagsList = tags.map(t => `"${t.replace(/"/g, '\\"')}"`).join(', ')
  const svcList = serviceCategories.map(s => `"${s}"`).join(', ')
  const stats = infographicStats
    .slice(0, 6)
    .map(s => `    - { label: "${s.label.replace(/"/g, '\\"')}", value: "${s.value.replace(/"/g, '\\"')}" }`)
    .join('\n')

  return `---
title: "${title.replace(/"/g, '\\"')}"
date: "${dateStr}"
author: "${author}"
excerpt: "${excerpt.replace(/"/g, '\\"')}"
tags: [${tagsList}]
readTime: "${readTime}"
category: "${category}"
serviceCategories: [${svcList}]
featured: false
infographic:
  headline: "${topic.replace(/"/g, '\\"').slice(0, 80)}"
  type: "stats"
  stats:
${stats}
---`
}

// ── Main ──
async function main() {
  console.log('=== Daily Blog Generator (local runner) ===\n')
  const targetDate = new Date()
  const dateStr = targetDate.toISOString().split('T')[0]

  // Phase 1: research
  const research = await researchTopic(targetDate)
  console.log(`  ✓ Topic selected: "${research.topic}"`)
  console.log(`    Category: ${research.category}`)
  console.log(`    Internal links: ${research.internal_links.length}`)
  console.log(`    External sources: ${research.external_sources.length}`)
  console.log(`    FAQs: ${research.faq_seeds.length}`)
  console.log()

  // Wait between phases to stay under 30K input tokens/min rate limit
  console.log('  (waiting 70s between phases for rate limit...)\n')
  await new Promise(r => setTimeout(r, 70_000))

  // Phase 2: write
  const body = await writeBlogPost(research, targetDate)
  console.log(`  ✓ Body written: ${body.length} chars (~${Math.round(body.split(/\s+/).length)} words)`)
  console.log()

  // Phase 3: assemble + write to disk
  const slug = `${dateStr}-${slugify(research.topic)}`
  const author = pickAuthor(research.category)
  const readTime = calcReadTime(body)
  const excerpt = research.angle.slice(0, 200)
  const tags = Array.from(new Set([
    research.target_keyword.toLowerCase(),
    ...research.supporting_keywords.map(k => k.toLowerCase()),
    research.category,
    ...research.service_categories,
  ])).slice(0, 8)
  const title = research.topic.length <= 80 ? research.topic : research.topic.slice(0, 77) + '...'

  const frontmatter = buildFrontmatter({
    title, dateStr, excerpt, author,
    category: research.category,
    serviceCategories: research.service_categories,
    tags, readTime,
    infographicStats: research.infographic_stats,
    topic: research.topic,
  })
  const mdx = `${frontmatter}\n\n${body}\n`

  const filePath = resolve(BLOG_DIR, `${slug}.mdx`)
  writeFileSync(filePath, mdx, 'utf-8')

  console.log(`  ✓ Written to ${filePath}`)
  console.log(`\n=== Done ===`)
  console.log(`Title:    ${title}`)
  console.log(`Author:   ${author}`)
  console.log(`Category: ${research.category}`)
  console.log(`Slug:     ${slug}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
