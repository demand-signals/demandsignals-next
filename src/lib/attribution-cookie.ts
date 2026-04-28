// ── attribution-cookie.ts ───────────────────────────────────────────
// Sign + verify the dsig_attr JWT cookie used for prospect attribution.
// See spec §4.6.

import { SignJWT, jwtVerify } from 'jose'

const COOKIE_NAME = 'dsig_attr'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 // 1 year
const ALG = 'HS256'

function getSecret(): Uint8Array | null {
  const secret = process.env.ATTRIBUTION_COOKIE_SECRET
  if (!secret) return null
  return new TextEncoder().encode(secret)
}

export interface AttributionPayload {
  pid: string  // prospect_id UUID
  iat?: number
  exp?: number
}

/**
 * Sign an HS256 JWT with the prospect_id. Returns the cookie value string,
 * or null if ATTRIBUTION_COOKIE_SECRET is missing (caller should skip).
 */
export async function signAttributionCookie(prospectId: string): Promise<string | null> {
  const secret = getSecret()
  if (!secret) return null
  const jwt = await new SignJWT({ pid: prospectId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE_SECONDS}s`)
    .sign(secret)
  return jwt
}

/**
 * Verify an HS256 JWT cookie value. Returns the payload on success,
 * or null on any failure (bad signature, expired, malformed, missing secret).
 * NEVER throws.
 */
export async function verifyAttributionCookie(
  cookieValue: string | undefined,
): Promise<AttributionPayload | null> {
  if (!cookieValue) return null
  const secret = getSecret()
  if (!secret) return null
  try {
    const { payload } = await jwtVerify(cookieValue, secret, { algorithms: [ALG] })
    if (typeof payload.pid !== 'string') return null
    return payload as unknown as AttributionPayload
  } catch {
    return null
  }
}

/**
 * Cookie attributes for setting via response headers. Spread into cookies().set() args.
 *
 * Domain scope: exact apex `demandsignals.co` (no leading dot). Per CLAUDE.md
 * §18, sharing this cookie with `*.demos.demandsignals.co` /
 * `*.staging.demandsignals.co` per-client subdomains would let a malicious
 * client demo read its visitors' attribution payloads (which contain the
 * DSIG prospect_id). Scope to apex only — DSIG marketing pages set + read it,
 * client-project subdomains never see it.
 */
export const ATTRIBUTION_COOKIE_OPTIONS = {
  name: COOKIE_NAME,
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  domain: 'demandsignals.co',  // exact apex; subdomains do NOT inherit
  path: '/',
  maxAge: COOKIE_MAX_AGE_SECONDS,
}

export const ATTRIBUTION_COOKIE_NAME = COOKIE_NAME
