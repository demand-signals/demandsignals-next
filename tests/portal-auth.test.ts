import { describe, it, expect, beforeAll, vi } from 'vitest'

// Stub the Supabase admin client so module-level initialization
// doesn't fail when env vars are absent in the test environment.
// These tests cover the pure-crypto surface only — DB-touching
// functions (mintPortalSession, getPortalSession, revoke*, rate
// limit, recordLoginAttempt) are exercised by
// scripts/verify-portal-auth.mjs against a real test DB.
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {},
}))
vi.mock('../src/lib/supabase/admin', () => ({
  supabaseAdmin: {},
}))

import {
  signMagicLinkToken,
  verifyMagicLinkToken,
} from '../src/lib/portal-auth'

// These tests cover the pure-crypto surface (sign + verify). The
// session-mint, rate-limit, and revocation paths require a Supabase
// connection; those are exercised by scripts/verify-portal-auth.mjs
// which runs against a real test DB (Task 13).

beforeAll(() => {
  // 32-byte hex secret for HS256
  process.env.PORTAL_MAGIC_LINK_SECRET =
    'a'.repeat(64)
})

describe('signMagicLinkToken / verifyMagicLinkToken', () => {
  it('signs and verifies a valid token', async () => {
    const { token, jti } = await signMagicLinkToken({
      prospectId: '11111111-1111-1111-1111-111111111111',
      email: 'owner@example.com',
    })
    const result = await verifyMagicLinkToken(token)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.sub).toBe('11111111-1111-1111-1111-111111111111')
      expect(result.email).toBe('owner@example.com')
      expect(result.jti).toBe(jti)
    }
  })

  it('normalizes email to lowercase in the payload', async () => {
    const { token } = await signMagicLinkToken({
      prospectId: '22222222-2222-2222-2222-222222222222',
      email: 'Owner@EXAMPLE.com',
    })
    const result = await verifyMagicLinkToken(token)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.email).toBe('owner@example.com')
  })

  it('rejects an empty token', async () => {
    const result = await verifyMagicLinkToken('')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid_token')
  })

  it('rejects a malformed token', async () => {
    const result = await verifyMagicLinkToken('not-a-jwt')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid_token')
  })

  it('rejects a token signed with a different secret', async () => {
    const original = process.env.PORTAL_MAGIC_LINK_SECRET
    process.env.PORTAL_MAGIC_LINK_SECRET = 'b'.repeat(64)
    const { token } = await signMagicLinkToken({
      prospectId: '33333333-3333-3333-3333-333333333333',
      email: 'a@b.co',
    })
    process.env.PORTAL_MAGIC_LINK_SECRET = original
    const result = await verifyMagicLinkToken(token)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid_token')
  })

  it('produces unique jti per call', async () => {
    const a = await signMagicLinkToken({
      prospectId: '44444444-4444-4444-4444-444444444444',
      email: 'a@b.co',
    })
    const b = await signMagicLinkToken({
      prospectId: '44444444-4444-4444-4444-444444444444',
      email: 'a@b.co',
    })
    expect(a.jti).not.toBe(b.jti)
  })

  it('sets exp ~15 minutes in the future', async () => {
    const before = Math.floor(Date.now() / 1000)
    const { exp } = await signMagicLinkToken({
      prospectId: '55555555-5555-5555-5555-555555555555',
      email: 'a@b.co',
    })
    const after = Math.floor(Date.now() / 1000)
    // 15 min = 900s, with a small tolerance for test runtime
    expect(exp).toBeGreaterThanOrEqual(before + 900 - 2)
    expect(exp).toBeLessThanOrEqual(after + 900 + 2)
  })
})
