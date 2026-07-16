// ── GET /api/cron/retainer-thresholds ─────────────────────────────────────
// Vercel cron (daily). Sweeps active retainer ledgers and fires depletion
// actions: notify the client at notify_pct, auto-DRAFT a replenish invoice at
// reup_pct (admin sends). Idempotent per cycle via last_notified_at /
// last_reup_drafted_at stamps; reset when a replenish invoice is paid.
//
// Honors quote_config['retainer_automation_enabled'] kill switch.
// Auth: Bearer token matches CRON_SECRET (Vercel Cron supplies header).

import { NextRequest, NextResponse } from 'next/server'
import { evaluateAllLedgers } from '@/lib/retainer-automation'
import { verifyBearerSecret } from '@/lib/bearer-auth'

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  if (!verifyBearerSecret(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { enabled, results } = await evaluateAllLedgers()

  const summary = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.action] = (acc[r.action] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json({
    ok: true,
    enabled,
    evaluated: results.length,
    summary,
    results,
  })
}
