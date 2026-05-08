import { describe, it, expect, vi } from 'vitest'

// Stub Supabase admin so module-load doesn't fail when env vars are
// absent in the test environment. These tests cover the pure-crypto
// surface only — DB-touching paths (authenticate, rate limit, audit)
// are exercised by an end-to-end smoke against a real test DB.
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {},
}))
vi.mock('../src/lib/supabase/admin', () => ({
  supabaseAdmin: {},
}))

import bcrypt from 'bcryptjs'
import { generateCliToken, isValidCliTokenFormat } from '../src/lib/cli-auth'

describe('generateCliToken', () => {
  it('produces a token starting with dsigcli_ and 51 total chars', async () => {
    const t = await generateCliToken()
    expect(t.plaintext.startsWith('dsigcli_')).toBe(true)
    expect(t.plaintext.length).toBe(51)
  })

  it('prefix is the first 12 chars of plaintext', async () => {
    const t = await generateCliToken()
    expect(t.prefix).toBe(t.plaintext.slice(0, 12))
    expect(t.prefix.length).toBe(12)
  })

  it('last4 is the last 4 chars of plaintext', async () => {
    const t = await generateCliToken()
    expect(t.last4).toBe(t.plaintext.slice(-4))
    expect(t.last4.length).toBe(4)
  })

  it('hash verifies against the plaintext', async () => {
    const t = await generateCliToken()
    expect(await bcrypt.compare(t.plaintext, t.hash)).toBe(true)
  })

  it('hash does NOT verify against a wrong value', async () => {
    const t = await generateCliToken()
    expect(await bcrypt.compare('dsigcli_wrong', t.hash)).toBe(false)
    expect(await bcrypt.compare(t.plaintext + 'x', t.hash)).toBe(false)
  })

  it('produces unique tokens across calls', async () => {
    const a = await generateCliToken()
    const b = await generateCliToken()
    expect(a.plaintext).not.toBe(b.plaintext)
    expect(a.hash).not.toBe(b.hash)
  })
})

describe('isValidCliTokenFormat', () => {
  it('accepts a freshly generated token', async () => {
    const t = await generateCliToken()
    expect(isValidCliTokenFormat(t.plaintext)).toBe(true)
  })

  it('rejects empty / null / wrong prefix / wrong length', () => {
    expect(isValidCliTokenFormat('')).toBe(false)
    expect(isValidCliTokenFormat('dsigcli_')).toBe(false)
    expect(isValidCliTokenFormat('foo_' + 'a'.repeat(43))).toBe(false)
    expect(isValidCliTokenFormat('dsigcli_' + 'a'.repeat(42))).toBe(false)
    expect(isValidCliTokenFormat('dsigcli_' + 'a'.repeat(44))).toBe(false)
  })

  it('rejects tokens with disallowed characters', () => {
    expect(isValidCliTokenFormat('dsigcli_' + '!'.repeat(43))).toBe(false)
    expect(isValidCliTokenFormat('dsigcli_' + 'a'.repeat(42) + ' ')).toBe(false)
  })
})
