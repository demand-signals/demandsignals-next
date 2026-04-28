// ── bearer-auth.ts ────────────────────────────────────────────────────
// Constant-time Bearer-token authentication shared across cron + webhook
// + agent routes. Replaces ad-hoc `authHeader === \`Bearer ${secret}\``
// comparisons that leak signal via early-exit string equality.
//
// Use:
//   const ok = verifyBearerSecret(request, process.env.CRON_SECRET)
//   if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

import crypto from 'node:crypto'
import type { NextRequest } from 'next/server'

/** Constant-time string equality. Pads to equal length so the length check
 *  itself doesn't leak information beyond what timingSafeEqual already does. */
export function safeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8')
  const bBuf = Buffer.from(b, 'utf8')
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

/**
 * Verify a Bearer-style secret presented in the Authorization header (or
 * an X-Cron-Secret fallback). Returns true iff:
 *   • expected is a non-empty string
 *   • the request carries either header
 *   • the unwrapped value matches expected in constant time
 *
 * Never throws — caller should treat false as "not authorized".
 */
export function verifyBearerSecret(
  req: NextRequest,
  expected: string | undefined,
  options?: { allowXCronSecret?: boolean },
): boolean {
  if (!expected || typeof expected !== 'string' || expected.length === 0) {
    return false
  }
  const authHeader = req.headers.get('authorization') ?? ''
  const xCron = options?.allowXCronSecret
    ? (req.headers.get('x-cron-secret') ?? '')
    : ''
  const presented = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : xCron.trim()
  if (!presented) return false
  return safeStringEqual(presented, expected)
}
