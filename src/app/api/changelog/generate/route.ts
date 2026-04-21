import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret, startAgentRun, completeAgentRun, failAgentRun } from '@/lib/agent-utils'
import { requireAdmin } from '@/lib/admin-auth'
import { generateChangelogPost } from '@/lib/changelog-generator'

// Called by Vercel cron daily at 7am PT (14:00 UTC).
// Also callable by admins with ?date=YYYY-MM-DD to backfill missing days.

export const maxDuration = 300 // 5 minutes — web_search backfill can be slow

export async function GET(request: NextRequest) {
  // Auth: cron secret OR admin session
  const authHeader = request.headers.get('authorization')
  let isAuthed = verifyCronSecret(authHeader)
  if (!isAuthed) {
    const adminCheck = await requireAdmin(request)
    if (!('error' in adminCheck)) isAuthed = true
  }
  if (!isAuthed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Parse optional ?date=YYYY-MM-DD (admin backfill) and ?force=1 (force backfill mode)
  const url = new URL(request.url)
  const dateParam = url.searchParams.get('date') || undefined
  const forceBackfill = url.searchParams.get('force') === '1'

  const runId = await startAgentRun('changelog', { date: dateParam || 'yesterday', forceBackfill })

  try {
    const result = await generateChangelogPost({ date: dateParam, forceBackfill })

    if (runId) {
      await completeAgentRun(runId, {
        slug: result.slug,
        sourcesChecked: result.sourcesChecked,
        sourcesSucceeded: result.sourcesSucceeded,
        failedSources: result.failedSources,
        contentLength: result.contentLength,
        platformsWithUpdates: result.platformsWithUpdates,
        mode: result.mode,
      }, 0, 0)
    }

    return NextResponse.json({
      success: true,
      ...result,
      message: `Committed ${result.slug}.mdx (${result.mode} mode) — Vercel auto-deploy triggered`,
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[changelog] Failed:', errorMsg)
    if (runId) await failAgentRun(runId, errorMsg)
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
