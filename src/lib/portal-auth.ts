// ── portal-auth.ts ─────────────────────────────────────────────────
// Centralized auth primitives for /portal.
//
// Two login paths land on the same dsig_portal cookie + session row:
//   - Magic-link: jose HS256 JWT (15-min TTL, jti consumed in
//     client_portal_sessions.jti UNIQUE for replay defense)
//   - Google OAuth: id_token email match → session minted directly
//
// Sessions are random 32-byte tokens looked up server-side. Cookie
// holds the token; the row IS the truth. Logout revokes ALL active
// sessions for the prospect (every device). Path=/portal cookie scope
// isolates from /admin and /attr cookies.
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §2
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 4

import { SignJWT, jwtVerify } from 'jose'
import { supabaseAdmin } from './supabase/admin'
import type { NextRequest } from 'next/server'

// Web Crypto API — works in both Node and Edge runtimes. globalThis.crypto
// is available in Node 19+ and Vercel Edge runtime alike.
function randomUUID(): string {
  return globalThis.crypto.randomUUID()
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

// ── Constants ──────────────────────────────────────────────────────

export const PORTAL_COOKIE_NAME = 'dsig_portal'
export const PORTAL_COOKIE_PATH = '/portal'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30          // 30 days
const MAGIC_LINK_TTL_SECONDS = 60 * 15                 // 15 min
const RATE_LIMIT_WINDOW_MINUTES = 60
const RATE_LIMIT_MAX_ATTEMPTS = 5
const ALG = 'HS256'

// ── Secret ─────────────────────────────────────────────────────────

function getMagicLinkSecret(): Uint8Array {
  const secret = process.env.PORTAL_MAGIC_LINK_SECRET
  if (!secret) {
    throw new Error('PORTAL_MAGIC_LINK_SECRET env var is not set')
  }
  return new TextEncoder().encode(secret)
}

// ── Types ──────────────────────────────────────────────────────────

export type PortalLoginMethod = 'magic_link' | 'google_oauth'

export interface MagicLinkTokenPayload {
  sub: string             // prospect_id
  jti: string             // unique id consumed at session-mint
  email: string           // normalized lowercase
  iat?: number
  exp?: number
}

export interface PortalSession {
  sessionId: string
  prospectId: string
  loginMethod: PortalLoginMethod
}

export interface RateLimitResult {
  ok: boolean
  attemptsInWindow: number
  attemptsRemaining: number
  retryAfter: Date | null
}

export type LoginAttemptMethod =
  | 'magic_link_request'
  | 'magic_link_verify'
  | 'google_callback'

export type LoginFailureReason =
  | 'rate_limited'
  | 'invalid_token'
  | 'token_expired'
  | 'jti_replay'
  | 'email_not_client'
  | 'oauth_error'
  | 'oauth_state_invalid'

// ── Magic-link tokens ──────────────────────────────────────────────

/**
 * Sign a magic-link JWT. The jti is the replay defense: it gets
 * consumed (UNIQUE-violated) when the session is minted, so a leaked
 * token can be used at most once.
 */
export async function signMagicLinkToken(args: {
  prospectId: string
  email: string
}): Promise<{ token: string; jti: string; exp: number }> {
  const secret = getMagicLinkSecret()
  const jti = randomUUID()
  const exp = Math.floor(Date.now() / 1000) + MAGIC_LINK_TTL_SECONDS
  const token = await new SignJWT({ email: args.email.toLowerCase() })
    .setProtectedHeader({ alg: ALG })
    .setSubject(args.prospectId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secret)
  return { token, jti, exp }
}

export type VerifyMagicLinkResult =
  | { ok: true; sub: string; jti: string; email: string }
  | { ok: false; reason: LoginFailureReason }

/**
 * Verify a magic-link token. Returns structured failure reasons so
 * callers can log to client_portal_login_attempts.
 */
export async function verifyMagicLinkToken(token: string): Promise<VerifyMagicLinkResult> {
  if (!token || typeof token !== 'string') {
    return { ok: false, reason: 'invalid_token' }
  }
  let secret: Uint8Array
  try {
    secret = getMagicLinkSecret()
  } catch {
    return { ok: false, reason: 'invalid_token' }
  }
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] })
    if (typeof payload.sub !== 'string') return { ok: false, reason: 'invalid_token' }
    if (typeof payload.jti !== 'string') return { ok: false, reason: 'invalid_token' }
    if (typeof payload.email !== 'string') return { ok: false, reason: 'invalid_token' }
    return { ok: true, sub: payload.sub, jti: payload.jti, email: payload.email }
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.toLowerCase().includes('exp')) {
      return { ok: false, reason: 'token_expired' }
    }
    return { ok: false, reason: 'invalid_token' }
  }
}

// ── Sessions ───────────────────────────────────────────────────────

interface MintArgs {
  prospectId: string
  loginMethod: PortalLoginMethod
  jti?: string                // required for magic_link, null for google_oauth
  ip?: string | null
  userAgent?: string | null
}

export interface MintResult {
  cookieToken: string
  expiresAt: Date
  sessionId: string
}

export type MintSessionResult =
  | { ok: true; result: MintResult }
  | { ok: false; reason: LoginFailureReason }

/**
 * Mint a portal session. For magic-link logins the jti UNIQUE constraint
 * catches replay (second use of same jti returns jti_replay).
 */
export async function mintPortalSession(args: MintArgs): Promise<MintSessionResult> {
  const cookieToken = randomHex(32)
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)

  const { data, error } = await supabaseAdmin
    .from('client_portal_sessions')
    .insert({
      prospect_id: args.prospectId,
      cookie_token: cookieToken,
      jti: args.jti ?? null,
      login_method: args.loginMethod,
      ip: args.ip ?? null,
      user_agent: args.userAgent ?? null,
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    // 23505 = unique_violation. The only UNIQUE on this table that an
    // INSERT can collide on is jti (cookie_token is 32-byte random).
    if (error.code === '23505') {
      return { ok: false, reason: 'jti_replay' }
    }
    return { ok: false, reason: 'invalid_token' }
  }

  return {
    ok: true,
    result: {
      cookieToken,
      expiresAt,
      sessionId: data.id,
    },
  }
}

/**
 * Look up a session by cookie token. Touches last_seen_at as a side effect
 * (best-effort, non-blocking).
 *
 * Returns null on any failure (no row, expired, revoked).
 */
export async function getPortalSession(cookieToken: string | undefined | null): Promise<PortalSession | null> {
  if (!cookieToken || typeof cookieToken !== 'string') return null

  const { data } = await supabaseAdmin
    .from('client_portal_sessions')
    .select('id, prospect_id, login_method, expires_at, revoked_at')
    .eq('cookie_token', cookieToken)
    .maybeSingle()

  if (!data) return null
  if (data.revoked_at) return null
  if (new Date(data.expires_at).getTime() <= Date.now()) return null

  // Best-effort touch; ignore failure
  void supabaseAdmin
    .from('client_portal_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => undefined)

  return {
    sessionId: data.id,
    prospectId: data.prospect_id,
    loginMethod: data.login_method as PortalLoginMethod,
  }
}

/**
 * Revoke a single session.
 */
export async function revokePortalSession(sessionId: string, reason: string): Promise<void> {
  await supabaseAdmin
    .from('client_portal_sessions')
    .update({ revoked_at: new Date().toISOString(), revoked_reason: reason })
    .eq('id', sessionId)
    .is('revoked_at', null)
}

/**
 * Revoke EVERY active session for a prospect. This is the logout
 * contract: signing out on one device signs out of every device.
 */
export async function revokeAllSessionsForProspect(prospectId: string, reason: string): Promise<{ revokedCount: number }> {
  const { data } = await supabaseAdmin
    .from('client_portal_sessions')
    .update({ revoked_at: new Date().toISOString(), revoked_reason: reason })
    .eq('prospect_id', prospectId)
    .is('revoked_at', null)
    .select('id')
  return { revokedCount: data?.length ?? 0 }
}

// ── Rate limiting ──────────────────────────────────────────────────

/**
 * Check whether `email` has exceeded the per-email rate limit
 * (5 magic-link issuance attempts per 60-min rolling window).
 */
export async function checkLoginRateLimit(email: string): Promise<RateLimitResult> {
  const normalized = email.toLowerCase()
  const cutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString()

  const { data, count } = await supabaseAdmin
    .from('client_portal_login_attempts')
    .select('created_at', { count: 'exact', head: false })
    .eq('email', normalized)
    .eq('method', 'magic_link_request')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: true })

  const attempts = count ?? 0
  const ok = attempts < RATE_LIMIT_MAX_ATTEMPTS
  let retryAfter: Date | null = null
  if (!ok && data && data.length > 0) {
    // The earliest attempt in window will roll off at created_at + window
    const earliest = new Date(data[0].created_at)
    retryAfter = new Date(earliest.getTime() + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000)
  }
  return {
    ok,
    attemptsInWindow: attempts,
    attemptsRemaining: Math.max(0, RATE_LIMIT_MAX_ATTEMPTS - attempts),
    retryAfter,
  }
}

// ── Login attempt logging ──────────────────────────────────────────

interface RecordLoginAttemptArgs {
  email: string
  prospectId?: string | null
  matched: boolean
  method: LoginAttemptMethod
  succeeded: boolean
  failureReason?: LoginFailureReason
  request?: NextRequest
  ip?: string | null
  userAgent?: string | null
}

/**
 * Always-write log for every login-related action. Powers rate-limit,
 * audit, and future suspicious-activity detection.
 */
export async function recordLoginAttempt(args: RecordLoginAttemptArgs): Promise<void> {
  const ip = args.ip ?? extractIp(args.request) ?? null
  const userAgent = args.userAgent ?? args.request?.headers.get('user-agent') ?? null

  await supabaseAdmin.from('client_portal_login_attempts').insert({
    email: args.email.toLowerCase(),
    prospect_id: args.prospectId ?? null,
    matched: args.matched,
    method: args.method,
    ip,
    user_agent: userAgent,
    succeeded: args.succeeded,
    failure_reason: args.failureReason ?? null,
  })
}

function extractIp(req: NextRequest | undefined): string | null {
  if (!req) return null
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return null
}

// ── Cookie helpers ─────────────────────────────────────────────────

/**
 * Cookie attributes for setting the dsig_portal cookie.
 *
 * Path=/portal is the load-bearing isolation: the browser will not
 * submit this cookie to /admin or /api/admin, /api/invoices/public,
 * or any other non-portal route. Cross-cookie auth confusion is
 * structurally impossible.
 */
export const PORTAL_COOKIE_OPTIONS = {
  name: PORTAL_COOKIE_NAME,
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  domain: 'demandsignals.co',
  path: PORTAL_COOKIE_PATH,
  maxAge: SESSION_TTL_SECONDS,
}

export const PORTAL_COOKIE_OPTIONS_CLEAR = {
  ...PORTAL_COOKIE_OPTIONS,
  maxAge: 0,
}
