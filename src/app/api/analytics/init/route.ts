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

  // Show which DB URL is being used (masked for security)
  const neonUrl = process.env.NEON_DATABASE_URL
  const dbUrl = process.env.DATABASE_URL
  const pgUrl = process.env.POSTGRES_URL
  const activeUrl = neonUrl || dbUrl || pgUrl
  const urlSource = neonUrl ? 'NEON_DATABASE_URL' : dbUrl ? 'DATABASE_URL' : pgUrl ? 'POSTGRES_URL' : 'NONE'
  const urlPreview = activeUrl ? activeUrl.slice(0, 30) + '...' : 'NOT SET'

  try {
    await initSchema()
    return NextResponse.json({
      ok: true,
      message: 'Analytics schema initialized — pageviews table and indexes created.',
      db: { source: urlSource, preview: urlPreview },
    })
  } catch (err) {
    console.error('[Analytics Init]', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error', db: { source: urlSource, preview: urlPreview } },
      { status: 500 }
    )
  }
}
