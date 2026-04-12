import { NextRequest, NextResponse } from 'next/server'
import { initSchema } from '@/lib/analytics-db'

/**
 * GET /api/analytics/init
 *
 * One-time endpoint to create the pageviews table and indexes.
 * Protected by CRON_SECRET to prevent public access.
 * Run once after adding Vercel Postgres to the project.
 */
export async function GET(req: NextRequest) {
  // Protect with CRON_SECRET or a simple check
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.VERCEL_ANALYTICS_CRON_SECRET || process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
