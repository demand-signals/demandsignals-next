import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPostBySlug } from '@/lib/blog'
import { refreshBloggerToken, getToken } from '@/lib/oauth'
import { signedFetch } from '@/lib/oauth1a'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://demandsignals.co'

// ── Platform syndication functions ──────────────────────────────────────────

async function syndicateToBlogger(title: string, content: string, slug: string): Promise<{ url: string }> {
  const blogId = process.env.BLOGGER_BLOG_ID
  if (!blogId) throw new Error('BLOGGER_BLOG_ID not configured')

  const accessToken = await refreshBloggerToken()
  const htmlContent = markdownToBasicHtml(content, slug)

  const res = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      kind: 'blogger#post',
      title,
      content: htmlContent,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Blogger post failed: ${res.status} — ${err}`)
  }
  const post = await res.json()
  return { url: post.url }
}

async function syndicateToTumblr(title: string, content: string, slug: string, tags: string[]): Promise<{ url: string }> {
  const blogName = process.env.TUMBLR_BLOG_NAME
  const consumerKey = process.env.TUMBLR_OAUTH_CONSUMER_KEY
  const consumerSecret = process.env.TUMBLR_SECRET_KEY
  const token = process.env.TUMBLR_TOKEN
  const tokenSecret = process.env.TUMBLR_TOKEN_SECRET
  if (!blogName) throw new Error('TUMBLR_BLOG_NAME not configured')
  if (!consumerKey || !consumerSecret) throw new Error('TUMBLR_OAUTH_CONSUMER_KEY and TUMBLR_SECRET_KEY not configured')
  if (!token || !tokenSecret) throw new Error('TUMBLR_TOKEN and TUMBLR_TOKEN_SECRET not configured')

  // Append canonical link
  const bodyWithCanonical = `${content}\n\n---\n*Originally published at [Demand Signals](${SITE_URL}/blog/${slug})*`

  const apiUrl = `https://api.tumblr.com/v2/blog/${blogName}/post`
  const res = await signedFetch('POST', apiUrl, {
    consumerKey,
    consumerSecret,
    token,
    tokenSecret,
  }, {
    type: 'text',
    title,
    body: bodyWithCanonical,
    format: 'markdown',
    tags: tags.join(','),
    source_url: `${SITE_URL}/blog/${slug}`,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Tumblr post failed: ${res.status} — ${err}`)
  }
  const result = await res.json()
  const postId = result.response?.id
  return { url: `https://${blogName}.tumblr.com/post/${postId}` }
}

// ── Markdown to basic HTML (for Blogger) ────────────────────────────────────

function markdownToBasicHtml(md: string, slug: string): string {
  let html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
  html = `<p>${html}</p>`
  html += `<p><em>Originally published at <a href="${SITE_URL}/blog/${slug}" rel="canonical">Demand Signals</a></em></p>`
  return html
}

// ── Platform registry ───────────────────────────────────────────────────────

type Platform = 'blogger' | 'tumblr'

const PLATFORM_FNS: Record<Platform, (title: string, content: string, slug: string, tags: string[]) => Promise<{ url: string }>> = {
  blogger: syndicateToBlogger,
  tumblr: syndicateToTumblr,
}

// ── GET: Check syndication status for a slug ────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  // If no slug, return platform connection status
  if (!slug) {
    const blogger = await getToken('blogger')
    // Tumblr uses env vars (OAuth 1.0a tokens are permanent)
    const tumblrConnected = !!(process.env.TUMBLR_TOKEN && process.env.TUMBLR_TOKEN_SECRET && process.env.TUMBLR_OAUTH_CONSUMER_KEY)
    return NextResponse.json({
      connections: {
        blogger: !!blogger,
        tumblr: tumblrConnected,
      },
    })
  }

  const { data: logs } = await supabaseAdmin
    .from('syndication_log')
    .select('*')
    .eq('slug', slug)
    .order('created_at', { ascending: false })

  return NextResponse.json({ logs: logs ?? [] })
}

// ── POST: Syndicate a blog post to selected platforms ───────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json()
  const { slug, platforms } = body as { slug: string; platforms: Platform[] }

  if (!slug || !platforms?.length) {
    return NextResponse.json({ error: 'slug and platforms[] required' }, { status: 400 })
  }

  // Load the blog post
  const post = getPostBySlug(slug)
  if (!post) {
    return NextResponse.json({ error: `Post not found: ${slug}` }, { status: 404 })
  }

  const results: Record<string, { status: string; url?: string; error?: string }> = {}

  for (const platform of platforms) {
    const fn = PLATFORM_FNS[platform]
    if (!fn) {
      results[platform] = { status: 'failed', error: `Unknown platform: ${platform}` }
      continue
    }

    try {
      const { url } = await fn(post.title, post.content, post.slug, post.tags)
      results[platform] = { status: 'success', url }

      // Upsert success
      await supabaseAdmin
        .from('syndication_log')
        .upsert({
          slug,
          platform,
          platform_url: url,
          status: 'success',
          error_message: null,
          posted_by: auth.admin.id,
        }, { onConflict: 'slug,platform' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      results[platform] = { status: 'failed', error: message }

      // Upsert failure
      await supabaseAdmin
        .from('syndication_log')
        .upsert({
          slug,
          platform,
          platform_url: null,
          status: 'failed',
          error_message: message,
          posted_by: auth.admin.id,
        }, { onConflict: 'slug,platform' })
    }
  }

  return NextResponse.json({ results })
}
