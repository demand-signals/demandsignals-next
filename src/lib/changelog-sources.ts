// ── AI Platform Changelog Sources ────────────────────────────────────────────
// Each source is scraped via Jina Reader (https://r.jina.ai/{url})
// and parsed for recent changes to feed into the daily AI ChangeLog blog.

export interface ChangelogSource {
  id: string
  name: string
  url: string
  // Some pages are single-page changelogs, others are RSS/atom feeds
  type: 'html' | 'rss'
  // How to identify date boundaries in the scraped content
  datePattern?: RegExp
}

export const CHANGELOG_SOURCES: ChangelogSource[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    url: 'https://platform.openai.com/docs/changelog',
    type: 'html',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    url: 'https://docs.anthropic.com/en/docs/about-claude/models',
    type: 'html',
  },
  {
    id: 'anthropic-api',
    name: 'Anthropic API',
    url: 'https://docs.anthropic.com/en/api/changelog',
    type: 'html',
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    url: 'https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md',
    type: 'html',
  },
  {
    id: 'google-gemini',
    name: 'Google Gemini',
    url: 'https://ai.google.dev/gemini-api/docs/changelog',
    type: 'html',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://api-docs.deepseek.com/news/news0801',
    type: 'html',
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
