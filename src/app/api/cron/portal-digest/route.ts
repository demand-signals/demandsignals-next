// ── GET /api/cron/portal-digest ─────────────────────────────────────
// Vercel cron, runs daily at 16:00 UTC = 09:00 PT (year-round, anchored
// to DSIG operating timezone, not per-client local).
//
// For each client, pools the prior 24h of client-visible non-suppressed
// project_notes and dispatches one email + one SMS teaser. Empty pool
// = silent. Race-safe via portal_digests UNIQUE(prospect_id, period_start_at).
//
// Auth: Bearer token matches CRON_SECRET (Vercel Cron supplies header).
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §8
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 12.4

import { NextRequest, NextResponse } from 'next/server'
import { runDigestSweep } from '@/lib/portal-digest'
import { verifyBearerSecret } from '@/lib/bearer-auth'

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  if (!verifyBearerSecret(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runDigestSweep()
  return NextResponse.json(result)
}
