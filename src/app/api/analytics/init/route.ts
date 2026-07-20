import { NextRequest, NextResponse } from 'next/server'
import { initSchema } from '@/lib/analytics-db'
import { requireAdmin } from '@/lib/admin-auth'
import { verifyBearerSecret } from '@/lib/bearer-auth'

/**
 * GET /api/analytics/init
 *
 * One-time endpoint to create the pageviews table and indexes.
 * Protected by admin auth OR CRON_SECRET.
 * Run once after adding Vercel Postgres to the project.
 */
export async function GET(req: NextRequest) {
  // Try cron secret first (for automated calls).
  const cronSecret = process.env.VERCEL_ANALYTICS_CRON_SECRET || process.env.CRON_SECRET
  const hasCronAuth = verifyBearerSecret(req, cronSecret)

  if (!hasCronAuth) {
    // Fall back to admin auth (for browser access while logged in)
    const auth = await requireAdmin(req)
    if ('error' in auth) {
      return NextResponse.json(
        { error: 'Unauthorized — log in at /login or pass CRON_SECRET as Bearer token' },
        { status: 401 }
      )
    }
  }

  // Report WHICH env var is active + whether it's set — but NEVER any slice
  // of the value. A Postgres URL's leading chars are
  // `postgresql://<user>:<passwordstart>`, so even a 30-char "preview" leaked
  // the DB username and the start of the password into HTTP logs, proxies,
  // and browser history. Security audit 2026-07-20. Return a boolean, not a
  // substring.
  const neonUrl = process.env.NEON_DATABASE_URL
  const dbUrl = process.env.DATABASE_URL
  const pgUrl = process.env.POSTGRES_URL
  const activeUrl = neonUrl || dbUrl || pgUrl
  const urlSource = neonUrl ? 'NEON_DATABASE_URL' : dbUrl ? 'DATABASE_URL' : pgUrl ? 'POSTGRES_URL' : 'NONE'
  const dbInfo = { source: urlSource, configured: Boolean(activeUrl) }

  try {
    await initSchema()
    return NextResponse.json({
      ok: true,
      message: 'Analytics schema initialized — pageviews table and indexes created.',
      db: dbInfo,
    })
  } catch (err) {
    console.error('[Analytics Init]', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error', db: dbInfo },
      { status: 500 }
    )
  }
}
