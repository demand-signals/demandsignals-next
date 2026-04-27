// ── AI Platform Changelog Sources ────────────────────────────────────────────
// Each source is scraped via Jina Reader (https://r.jina.ai/{url})
// and parsed for recent changes to feed into the daily AI ChangeLog blog.
//
// Two tiers:
//   - 'news'      → product news / blog / announcements (catches major model launches)
//   - 'changelog' → API/dev changelog (catches incremental dev-facing changes)
//
// The cron prompt weights news sources higher and elevates major launches
// to headline sections rather than burying them in bullet lists.

export interface ChangelogSource {
  id: string
  name: string
  url: string
  /** Source type — currently both fetched the same way (HTML→Jina) but kept for future feed support */
  type: 'html' | 'rss'
  /** Tier determines prompt weighting. 'news' = headline launches, 'changelog' = incremental dev updates */
  tier: 'news' | 'changelog'
  /** Pattern for date extraction (optional; used for fallback parsing) */
  datePattern?: RegExp
}

export const CHANGELOG_SOURCES: ChangelogSource[] = [
  // ── NEWS LAYER (catches major product launches) ──
  {
    id: 'anthropic-news',
    name: 'Anthropic News',
    url: 'https://www.anthropic.com/news',
    type: 'html',
    tier: 'news',
  },
  {
    id: 'openai-news',
    name: 'OpenAI News',
    url: 'https://openai.com/news/',
    type: 'html',
    tier: 'news',
  },
  {
    id: 'google-deepmind-news',
    name: 'Google DeepMind Blog',
    url: 'https://blog.google/technology/google-deepmind/',
    type: 'html',
    tier: 'news',
  },
  {
    id: 'meta-ai-news',
    name: 'Meta AI Blog',
    url: 'https://ai.meta.com/blog/',
    type: 'html',
    tier: 'news',
  },
  {
    id: 'xai-news',
    name: 'xAI News',
    url: 'https://x.ai/news',
    type: 'html',
    tier: 'news',
  },
  {
    id: 'mistral-news',
    name: 'Mistral News',
    url: 'https://mistral.ai/news/',
    type: 'html',
    tier: 'news',
  },

  // ── CHANGELOG LAYER (incremental dev/API updates) ──
  {
    id: 'openai-changelog',
    name: 'OpenAI API Changelog',
    url: 'https://platform.openai.com/docs/changelog',
    type: 'html',
    tier: 'changelog',
  },
  {
    id: 'anthropic-changelog',
    name: 'Anthropic API Models',
    url: 'https://docs.anthropic.com/en/docs/about-claude/models',
    type: 'html',
    tier: 'changelog',
  },
  {
    id: 'claude-code-changelog',
    name: 'Claude Code',
    url: 'https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md',
    type: 'html',
    tier: 'changelog',
  },
  {
    id: 'google-gemini-changelog',
    name: 'Google Gemini API',
    url: 'https://ai.google.dev/gemini-api/docs/changelog',
    type: 'html',
    tier: 'changelog',
  },
  {
    id: 'deepseek-changelog',
    name: 'DeepSeek API',
    url: 'https://api-docs.deepseek.com/updates',
    type: 'html',
    tier: 'changelog',
  },
]

/**
 * Fetch a changelog page via Jina Reader.
 * Returns markdown-formatted content, token-efficient for LLM processing.
 */
export async function fetchViaJina(url: string): Promise<string> {
  const jinaUrl = `https://r.jina.ai/${url}`

  const res = await fetch(jinaUrl, {
    headers: {
      Accept: 'text/markdown',
      'X-Return-Format': 'markdown',
    },
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    throw new Error(`Jina Reader failed for ${url}: HTTP ${res.status}`)
  }

  return res.text()
}

/**
 * Fetch all changelog sources in parallel.
 * Returns an array of { source, content } objects.
 * Failed fetches return error message instead of throwing.
 */
export async function fetchAllChangelogs(): Promise<Array<{
  source: ChangelogSource
  content: string
  error?: string
}>> {
  const results = await Promise.allSettled(
    CHANGELOG_SOURCES.map(async (source) => {
      const content = await fetchViaJina(source.url)
      return { source, content }
    })
  )

  return results.map((result, i) => {
    if (result.status === 'fulfilled') {
      return result.value
    }
    return {
      source: CHANGELOG_SOURCES[i],
      content: '',
      error: result.reason?.message || 'Unknown error',
    }
  })
}
