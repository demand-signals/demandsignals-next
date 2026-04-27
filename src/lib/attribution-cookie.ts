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
 */
export const ATTRIBUTION_COOKIE_OPTIONS = {
  name: COOKIE_NAME,
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  domain: '.demandsignals.co',  // covers all subdomains per RFC 6265
  path: '/',
  maxAge: COOKIE_MAX_AGE_SECONDS,
}

export const ATTRIBUTION_COOKIE_NAME = COOKIE_NAME
