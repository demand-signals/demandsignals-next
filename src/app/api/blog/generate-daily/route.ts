import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret, startAgentRun, completeAgentRun, failAgentRun } from '@/lib/agent-utils'
import { requireAdmin } from '@/lib/admin-auth'
import { generateDailyBlogPost } from '@/lib/blog-generator'

// Daily blog post generator — cron at 5am PT (12:00 UTC).
// Also callable by admins with ?date=YYYY-MM-DD or ?topic=... for manual triggers.

export const maxDuration = 300 // 5 minutes — research + write can take a while

export async function GET(request: NextRequest) {
  // Auth: cron secret OR admin session
  const authHeader = request.headers.get('authorization')
  let isAuthed = verifyCronSecret(authHeader)
  if (!isAuthed) {
    const adminCheck = await requireAdmin(request)
    if (!('error' in adminCheck)) isAuthed = true
  }
  if (!isAuthed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const dateParam = url.searchParams.get('date') || undefined
  const topicOverride = url.searchParams.get('topic') || undefined

  const runId = await startAgentRun('daily-blog', { date: dateParam || 'today', topicOverride })

  try {
    const result = await generateDailyBlogPost({ date: dateParam, topicOverride })

    if (runId) {
      await completeAgentRun(runId, {
        slug: result.slug,
        title: result.title,
        category: result.category,
        author: result.author,
        contentLength: result.contentLength,
        topic: result.topic,
        internalLinksUsed: result.internalLinksUsed,
        externalLinksUsed: result.externalLinksUsed,
        faqsUsed: result.faqsUsed,
      }, 0, 0)
    }

    return NextResponse.json({
      success: true,
      ...result,
      message: `Committed ${result.slug}.mdx — Vercel auto-deploy triggered`,
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[daily-blog] Failed:', errorMsg)
    if (runId) await failAgentRun(runId, errorMsg)
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
