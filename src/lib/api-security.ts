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
const ALLOWED_ORIGINS = [
  'https://demandsignals.co',
  'https://www.demandsignals.co',
  'https://dsig.demandsignals.dev',
  'http://localhost:3000',
  'http://localhost:3001',
]

export function isValidOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true // non-browser requests (Postman, curl) don't send Origin
  return ALLOWED_ORIGINS.some(o => origin.startsWith(o))
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

// ── Safe error response ──────────────────────────────────────────────────────
export function safeErrorResponse(routeName: string, err: unknown): NextResponse {
  const internal = err instanceof Error ? err.message : 'Unknown error'
  console.error(`[${routeName}] error:`, internal)
  return NextResponse.json(
    { success: false, error: 'Something went wrong. Please try again later.' },
    { status: 500 }
  )
}
