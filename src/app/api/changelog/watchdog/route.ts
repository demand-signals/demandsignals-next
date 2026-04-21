import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret, startAgentRun, completeAgentRun, failAgentRun } from '@/lib/agent-utils'
import { requireAdmin } from '@/lib/admin-auth'
import { generateChangelogPost } from '@/lib/changelog-generator'

// Watchdog — verifies yesterday's changelog post exists in the repo.
// Runs a few hours after the main cron so it catches failures.
//
// Auth: cron secret OR admin session.
// Optional ?date=YYYY-MM-DD to check a specific date (defaults to yesterday UTC).

export const maxDuration = 300

const GITHUB_REPO = 'demand-signals/demandsignals-next'
const GITHUB_BRANCH = 'master'

async function fileExistsOnGitHub(filePath: string): Promise<boolean> {
  const token = process.env.GITHUB_DEMANDSIGNALS_NEXT
  if (!token) throw new Error('GITHUB_DEMANDSIGNALS_NEXT not configured')

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    },
  )
  return res.ok
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  let isAuthed = verifyCronSecret(authHeader)
  if (!isAuthed) {
    const adminCheck = await requireAdmin(request)
    if (!('error' in adminCheck)) isAuthed = true
  }
  if (!isAuthed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const dateParam = url.searchParams.get('date')

  // Target date = param OR yesterday UTC
  let targetDate: Date
  if (dateParam) {
    targetDate = new Date(`${dateParam}T12:00:00Z`)
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: `Invalid date: ${dateParam}` }, { status: 400 })
    }
  } else {
    targetDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
  }

  const dateStr = targetDate.toISOString().split('T')[0]
  const filePath = `src/content/blog/ai-changelog-${dateStr}.mdx`

  const runId = await startAgentRun('changelog-watchdog', { date: dateStr })

  try {
    const exists = await fileExistsOnGitHub(filePath)

    if (exists) {
      if (runId) await completeAgentRun(runId, { date: dateStr, exists: true, action: 'none' }, 0, 0)
      return NextResponse.json({
        ok: true,
        date: dateStr,
        exists: true,
        action: 'none',
        message: `Post for ${dateStr} already exists. No action taken.`,
      })
    }

    // Missing — trigger backfill
    console.log(`[watchdog] Missing post for ${dateStr}, triggering backfill...`)
    const result = await generateChangelogPost({ date: dateStr })

    if (runId) {
      await completeAgentRun(runId, {
        date: dateStr,
        exists: false,
        action: 'backfilled',
        slug: result.slug,
        mode: result.mode,
        platformsWithUpdates: result.platformsWithUpdates,
      }, 0, 0)
    }

    return NextResponse.json({
      ok: true,
      date: dateStr,
      exists: false,
      action: 'backfilled',
      ...result,
      message: `Post for ${dateStr} was missing — generated and committed via ${result.mode} mode.`,
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[watchdog] Failed:', errorMsg)
    if (runId) await failAgentRun(runId, errorMsg)
    return NextResponse.json({ error: errorMsg, date: dateStr }, { status: 500 })
  }
}
