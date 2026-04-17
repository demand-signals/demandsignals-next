// Phone number encryption for quote_sessions.
// App-layer AES-256-GCM. Key from env: QUOTE_PHONE_ENCRYPTION_KEY (32 bytes, hex or base64).
//
// Threat model:
//   - Supabase DB backups leak → ciphertext useless without the env key.
//   - Read-only DB exposure (SQL injection, leaked replica) → ciphertext useless.
//   - Does NOT protect against a compromised Vercel env or full service-role access.
//
// Design:
//   - phone_encrypted: base64(IV || authTag || ciphertext) — random IV per encryption.
//   - phone_e164_hash: SHA-256 of the E.164 number + server pepper. Used for auto-match
//     lookups without needing to decrypt. Deterministic.
//   - phone_last_four: plaintext last 4 digits for display in admin and SMS replies.
//
// Rotation: set QUOTE_PHONE_ENCRYPTION_KEY_PREV to the old key when rotating. decrypt()
// tries current key, then previous. Re-encrypt rows on next access.

import crypto from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16

function loadKey(envName: string): Buffer | null {
  const raw = process.env[envName]
  if (!raw) return null
  // Accept hex (64 chars) or base64 (44 chars with padding).
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex')
  const b64 = Buffer.from(raw, 'base64')
  if (b64.length === 32) return b64
  throw new Error(`${envName} must be 32 bytes (64 hex chars or base64-encoded).`)
}

function currentKey(): Buffer {
  const key = loadKey('QUOTE_PHONE_ENCRYPTION_KEY')
  if (!key) {
    throw new Error(
      'QUOTE_PHONE_ENCRYPTION_KEY is not set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    )
  }
  return key
}

function previousKey(): Buffer | null {
  return loadKey('QUOTE_PHONE_ENCRYPTION_KEY_PREV')
}

function pepper(): string {
  return process.env.QUOTE_PHONE_HASH_PEPPER ?? ''
}

/**
 * Normalize a phone string to E.164 (e.g., "+19165551234").
 * Accepts common US formats. For international, expects the user to provide "+" prefix.
 * Returns null if the input can't be normalized.
 */
export function toE164(input: string): string | null {
  if (!input) return null
  const trimmed = input.trim()
  // Already E.164?
  if (/^\+[1-9]\d{6,14}$/.test(trimmed)) return trimmed
  // Strip all non-digits.
  const digits = trimmed.replace(/\D/g, '')
  // US 10-digit → +1
  if (digits.length === 10) return `+1${digits}`
  // US 11-digit starting with 1 → +1...
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  // Anything else, require explicit "+" — don't guess country codes.
  return null
}

export function lastFour(e164: string): string {
  return e164.slice(-4)
}

/**
 * Deterministic hash for lookup/auto-match. SHA-256 over E.164 + pepper.
 * Safe to index in Postgres. Same phone always produces same hash.
 */
export function hashPhone(e164: string): string {
  return crypto.createHash('sha256').update(e164 + pepper()).digest('hex')
}

/**
 * Encrypt an E.164 phone number.
 * Output: base64(IV || authTag || ciphertext). Different every call (random IV).
 */
export function encryptPhone(e164: string): string {
  const key = currentKey()
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const ct = Buffer.concat([cipher.update(e164, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct]).toString('base64')
}

/**
 * Decrypt an encrypted phone. Tries current key, then previous key if set.
 * Throws if both fail — the caller should treat this as corrupt data.
 */
export function decryptPhone(encrypted: string): string {
  const buf = Buffer.from(encrypted, 'base64')
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error('decryptPhone: ciphertext too short.')
  }
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const ct = buf.subarray(IV_LEN + TAG_LEN)

  for (const key of [currentKey(), previousKey()]) {
    if (!key) continue
    try {
      const decipher = crypto.createDecipheriv(ALGO, key, iv)
      decipher.setAuthTag(tag)
      return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
    } catch {
      // Try next key.
    }
  }
  throw new Error('decryptPhone: auth tag mismatch with current and previous keys.')
}

/**
 * Full encrypt pipeline for quote_sessions. Returns the three DB columns.
 * Input can be any format — normalized internally. Returns null if invalid.
 */
export function preparePhoneForStorage(input: string): {
  phone_encrypted: string
  phone_last_four: string
  phone_e164_hash: string
} | null {
  const e164 = toE164(input)
  if (!e164) return null
  return {
    phone_encrypted: encryptPhone(e164),
    phone_last_four: lastFour(e164),
    phone_e164_hash: hashPhone(e164),
  }
}
