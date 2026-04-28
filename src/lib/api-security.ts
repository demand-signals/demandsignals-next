import { NextRequest, NextResponse } from 'next/server'

// ── HTML escaping ────────────────────────────────────────────────────────────
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── Input validation ─────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254
}

export function sanitizeField(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

// ── Rate limiting (in-memory, per-IP) ────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60_000 // 1 minute
const RATE_LIMIT_MAX = 5 // 5 requests per minute per IP

// ⚠️ KNOWN LIMITATION — IN-MEMORY ONLY.
// This Map lives in the Lambda instance's memory. On Vercel, requests fan
// across many cold + warm instances, so a determined attacker hitting
// different instances effectively resets their counter. Acceptable as a
// best-effort speed-bump against trivial flooding from a single client,
// but NOT a real defense against motivated abuse.
//
// True defense requires a shared store (Vercel KV, Upstash Redis, or a
// Supabase-backed counter table with a partial index). When you add one,
// replace the Map below with the shared backend; the function signatures
// can stay the same.
//
// See also: SMS-pump abuse via /api/sms/verify/send is gated by the
// quote_events table (DB-backed, persistent), so the most expensive
// vector is already protected — DON'T treat this Map as the SMS gate.
export function isRateLimited(req: NextRequest): boolean {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'

  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }

  entry.count++
  if (entry.count > RATE_LIMIT_MAX) return true
  return false
}

// Periodic cleanup of stale entries (prevent memory leak)
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip)
  }
}, 60_000)

// ── CSRF / Origin validation ─────────────────────────────────────────────────
//
// Compare by parsed URL origin, NOT string startsWith. Previously this used
// `origin.startsWith(allowed)` which could match attacker-controlled values
// like `http://localhost:3000.evil.com` (legal subdomain that literally
// begins with the allowed string). new URL().origin returns just
// `<scheme>://<host>[:<port>]` so equality is exact.
const ALLOWED_ORIGINS = new Set<string>([
  'https://demandsignals.co',
  'https://www.demandsignals.co',
  'https://dsig.demandsignals.dev',
  'http://localhost:3000',
  'http://localhost:3001',
])

export function isValidOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  // Browsers ALWAYS send Origin on cross-origin POST/PATCH/DELETE per fetch
  // spec. A missing Origin on a state-changing request indicates either
  // server-to-server (rare for our public endpoints — those have their own
  // Bearer auth) or a malicious bypass attempt. Deny.
  if (!origin) return false
  let normalized: string
  try {
    normalized = new URL(origin).origin
  } catch {
    return false
  }
  return ALLOWED_ORIGINS.has(normalized)
}

// ── Content-Type validation ──────────────────────────────────────────────────
export function isJsonRequest(req: NextRequest): boolean {
  const ct = req.headers.get('content-type') || ''
  return ct.includes('application/json')
}

// ── Pre-flight checks (combines all guards) ──────────────────────────────────
export function apiGuard(req: NextRequest): NextResponse | null {
  if (!isJsonRequest(req)) {
    return NextResponse.json({ success: false, error: 'Invalid content type.' }, { status: 415 })
  }
  if (!isValidOrigin(req)) {
    return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 })
  }
  if (isRateLimited(req)) {
    return NextResponse.json({ success: false, error: 'Too many requests. Please wait a moment.' }, { status: 429 })
  }
  return null
}

// ── Admin API guard (origin + auth, for state-changing admin routes) ─────────
// Use on POST/PATCH/DELETE admin endpoints for CSRF defense-in-depth
export function adminOriginCheck(req: NextRequest): NextResponse | null {
  if (req.method === 'GET') return null // GETs don't mutate, skip origin check
  if (!isValidOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden — invalid origin' }, { status: 403 })
  }
  return null
}

// ── Safe error response ──────────────────────────────────────────────────────
export function safeErrorResponse(routeName: string, err: unknown): NextResponse {
  const internal = err instanceof Error ? err.message : 'Unknown error'
  console.error(`[${routeName}] error:`, internal)
  return NextResponse.json(
    { success: false, error: 'Something went wrong. Please try again later.' },
    { status: 500 }
  )
}
