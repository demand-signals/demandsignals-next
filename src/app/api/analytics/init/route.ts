import { NextRequest, NextResponse } from 'next/server'
import { initSchema } from '@/lib/analytics-db'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * GET /api/analytics/init
 *
 * One-time endpoint to create the pageviews table and indexes.
 * Protected by admin auth OR CRON_SECRET.
 * Run once after adding Vercel Postgres to the project.
 */
export async function GET(req: NextRequest) {
  // Try cron secret first (for automated calls)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.VERCEL_ANALYTICS_CRON_SECRET || process.env.CRON_SECRET
  const hasCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (!hasCronAuth) {
    // Fall back to admin auth (for browser access while logged in)
    const auth = await requireAdmin(req)
    if ('error' in auth) {
      return NextResponse.json(
        { error: 'Unauthorized — log in at /admin-login or pass CRON_SECRET as Bearer token' },
        { status: 401 }
      )
    }
  }

  try {
    await initSchema()
    return NextResponse.json({
      ok: true,
      message: 'Analytics schema initialized — pageviews table and indexes created.',
    })
  } catch (err) {
    console.error('[Analytics Init]', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
