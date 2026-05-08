// ── cli-auth.ts ────────────────────────────────────────────────────
// CLI bearer-token authentication. Used by /api/cli/* routes (today
// just /api/cli/handoff/project-notes for the /handoff slash command).
//
// Token format: `dsigcli_<43-char-base64url>` (256 bits of entropy)
//   - Fixed `dsigcli_` prefix → easy regex match in env files
//   - 32 random bytes encoded base64url → 43 chars
//   - Total length: 51 chars
//   - prefix field stores `dsigcli_<first-4>` (12 total)
//   - last4 stores last 4 chars
//
// Auth flow:
//   1. Extract Bearer from Authorization header
//   2. Look up by prefix (indexed)
//   3. bcrypt-compare presented token vs stored hash
//   4. Check revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())
//   5. Rate-limit: count successful audit rows in last 60 min, cap 60
//   6. ALWAYS write an audit row regardless of outcome
//
// Spec: docs/superpowers/specs/2026-05-08-cli-tokens-design.md
// Plan: docs/superpowers/plans/2026-05-08-cli-tokens-plan.md Task 3

import bcrypt from 'bcryptjs'
import { supabaseAdmin } from './supabase/admin'
import type { NextRequest } from 'next/server'

const TOKEN_PREFIX_LITERAL = 'dsigcli_'
const TOKEN_RANDOM_BYTES = 32              // → 43 chars base64url
const TOKEN_TOTAL_LENGTH = TOKEN_PREFIX_LITERAL.length + 43
const PREFIX_DISPLAY_LENGTH = 12           // 'dsigcli_' + 4 chars
const LAST4_LENGTH = 4
const BCRYPT_COST = 10
const RATE_LIMIT_WINDOW_MINUTES = 60
const RATE_LIMIT_MAX_SUCCESSES = 60

// ── Types ──────────────────────────────────────────────────────────

export interface GeneratedCliToken {
  /** Plaintext token. Show ONCE to admin, never store. */
  plaintext: string
  /** First 12 chars (dsigcli_ + 4). Stored on row, used for indexed lookup. */
  prefix: string
  /** Last 4 chars. Stored on row for display. */
  last4: string
  /** bcrypt hash. Stored on row. */
  hash: string
}

export type CliAuthFailureReason =
  | 'no_token'
  | 'invalid_token'
  | 'revoked_token'
  | 'token_expired'
  | 'rate_limited'
  | 'env_misconfig'

export type CliAuthResult =
  | {
      ok: true
      tokenId: string
      tokenName: string
      createdBy: string                     // admin_users.id of token creator
    }
  | {
      ok: false
      reason: CliAuthFailureReason
      retryAfterSeconds?: number
    }

interface RecordAuditArgs {
  cli_token_id: string | null
  method: string
  path: string
  status_code: number
  ip: string | null
  user_agent: string | null
  failure_reason: CliAuthFailureReason | null
}

// ── Token generation ───────────────────────────────────────────────

/**
 * Generate a fresh CLI token. Returns plaintext + display fields + hash.
 * Caller is responsible for inserting the row + showing the plaintext to
 * the admin exactly once.
 */
export async function generateCliToken(): Promise<GeneratedCliToken> {
  const bytes = new Uint8Array(TOKEN_RANDOM_BYTES)
  globalThis.crypto.getRandomValues(bytes)
  const random = bytesToBase64Url(bytes)
  const plaintext = `${TOKEN_PREFIX_LITERAL}${random}`

  if (plaintext.length !== TOKEN_TOTAL_LENGTH) {
    throw new Error(`generateCliToken: unexpected length ${plaintext.length}`)
  }

  const prefix = plaintext.slice(0, PREFIX_DISPLAY_LENGTH)
  const last4 = plaintext.slice(-LAST4_LENGTH)
  const hash = await bcrypt.hash(plaintext, BCRYPT_COST)

  return { plaintext, prefix, last4, hash }
}

/** Validate that a string LOOKS like a CLI token (regex check, no DB). */
export function isValidCliTokenFormat(value: string): boolean {
  return /^dsigcli_[A-Za-z0-9_-]{43}$/.test(value)
}

// ── Authentication ─────────────────────────────────────────────────

interface AuthOptions {
  method: string                            // e.g. 'POST'
  path: string                              // e.g. '/api/cli/handoff/project-notes'
}

/**
 * Authenticate a CLI bearer-token request. Returns ok:true on success
 * with token metadata, otherwise ok:false with structured reason.
 * ALWAYS writes one audit row regardless of outcome.
 */
export async function authenticateCliRequest(
  request: NextRequest,
  options: AuthOptions,
): Promise<CliAuthResult> {
  const ip = extractIp(request)
  const userAgent = request.headers.get('user-agent') ?? null

  // Extract Bearer
  const authHeader = request.headers.get('authorization') ?? ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    await recordAudit({
      cli_token_id: null,
      method: options.method,
      path: options.path,
      status_code: 401,
      ip,
      user_agent: userAgent,
      failure_reason: 'no_token',
    })
    return { ok: false, reason: 'no_token' }
  }

  const presented = match[1].trim()
  if (!isValidCliTokenFormat(presented)) {
    await recordAudit({
      cli_token_id: null,
      method: options.method,
      path: options.path,
      status_code: 401,
      ip,
      user_agent: userAgent,
      failure_reason: 'invalid_token',
    })
    return { ok: false, reason: 'invalid_token' }
  }

  const presentedPrefix = presented.slice(0, PREFIX_DISPLAY_LENGTH)

  // Look up active row by prefix (indexed)
  const { data: candidates } = await supabaseAdmin
    .from('cli_tokens')
    .select('id, name, token_hash, created_by, expires_at, revoked_at')
    .eq('prefix', presentedPrefix)
    .is('revoked_at', null)

  if (!candidates || candidates.length === 0) {
    await recordAudit({
      cli_token_id: null,
      method: options.method,
      path: options.path,
      status_code: 401,
      ip,
      user_agent: userAgent,
      failure_reason: 'invalid_token',
    })
    return { ok: false, reason: 'invalid_token' }
  }

  // bcrypt-compare against each candidate. Normally 1 candidate;
  // collision-by-prefix is astronomically unlikely but we tolerate it.
  let matched: typeof candidates[number] | null = null
  for (const candidate of candidates) {
    const ok = await bcrypt.compare(presented, candidate.token_hash)
    if (ok) {
      matched = candidate
      break
    }
  }

  if (!matched) {
    await recordAudit({
      cli_token_id: null,
      method: options.method,
      path: options.path,
      status_code: 401,
      ip,
      user_agent: userAgent,
      failure_reason: 'invalid_token',
    })
    return { ok: false, reason: 'invalid_token' }
  }

  // Expiry check
  if (matched.expires_at) {
    const expiresAt = new Date(matched.expires_at).getTime()
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      await recordAudit({
        cli_token_id: matched.id,
        method: options.method,
        path: options.path,
        status_code: 401,
        ip,
        user_agent: userAgent,
        failure_reason: 'token_expired',
      })
      return { ok: false, reason: 'token_expired' }
    }
  }

  // Rate limit
  const rateLimit = await checkCliRateLimit(matched.id)
  if (!rateLimit.ok) {
    await recordAudit({
      cli_token_id: matched.id,
      method: options.method,
      path: options.path,
      status_code: 429,
      ip,
      user_agent: userAgent,
      failure_reason: 'rate_limited',
    })
    return {
      ok: false,
      reason: 'rate_limited',
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    }
  }

  // Success: write audit, touch last_used_at (best-effort, non-blocking)
  await recordAudit({
    cli_token_id: matched.id,
    method: options.method,
    path: options.path,
    status_code: 200,
    ip,
    user_agent: userAgent,
    failure_reason: null,
  })

  void supabaseAdmin
    .from('cli_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', matched.id)
    .then(() => undefined)

  return {
    ok: true,
    tokenId: matched.id,
    tokenName: matched.name,
    createdBy: matched.created_by,
  }
}

// ── Rate limit ─────────────────────────────────────────────────────

export interface CliRateLimitResult {
  ok: boolean
  successesInWindow: number
  retryAfterSeconds: number
}

/**
 * Count successful CLI calls (status 200) for this token in the last
 * 60 minutes. Returns ok:true if under the cap, ok:false otherwise
 * with retryAfterSeconds set to seconds-until-earliest-success-rolls-off.
 */
export async function checkCliRateLimit(tokenId: string): Promise<CliRateLimitResult> {
  const cutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString()

  const { data, count } = await supabaseAdmin
    .from('cli_token_audit')
    .select('created_at', { count: 'exact', head: false })
    .eq('cli_token_id', tokenId)
    .eq('status_code', 200)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(1)

  const successes = count ?? 0
  if (successes < RATE_LIMIT_MAX_SUCCESSES) {
    return { ok: true, successesInWindow: successes, retryAfterSeconds: 0 }
  }

  const earliest = data?.[0]?.created_at
  let retryAfterSeconds = RATE_LIMIT_WINDOW_MINUTES * 60
  if (earliest) {
    const earliestMs = new Date(earliest).getTime()
    const rollOffMs = earliestMs + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
    retryAfterSeconds = Math.max(1, Math.ceil((rollOffMs - Date.now()) / 1000))
  }

  return { ok: false, successesInWindow: successes, retryAfterSeconds }
}

// ── Audit ──────────────────────────────────────────────────────────

async function recordAudit(args: RecordAuditArgs): Promise<void> {
  await supabaseAdmin.from('cli_token_audit').insert({
    cli_token_id: args.cli_token_id,
    method: args.method,
    path: args.path,
    status_code: args.status_code,
    ip: args.ip,
    user_agent: args.user_agent,
    failure_reason: args.failure_reason,
  })
}

// ── Helpers ────────────────────────────────────────────────────────

function extractIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return null
}

function bytesToBase64Url(bytes: Uint8Array): string {
  // Browser-safe base64url. Avoid Node-only Buffer so we stay edge-safe.
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const b64 = btoa(binary)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
