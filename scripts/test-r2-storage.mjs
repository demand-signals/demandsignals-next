#!/usr/bin/env node
// ── R2 Storage Integration Test ──────────────────────────────────────
// Smoke-tests the r2-storage.ts wrapper against live R2 buckets.
// Uploads a small text file to each bucket, reads it back, deletes it.
//
// Usage:
//   node scripts/test-r2-storage.mjs
//
// Requires in .env.local or process env:
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
//   R2_PUBLIC_BUCKET, R2_PUBLIC_URL, R2_PRIVATE_BUCKET, R2_ENDPOINT
//
// Exit code: 0 on success, 1 on any failure.

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// Load .env.local
const envPath = resolve(ROOT, '.env.local')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) {
      const [, k, v] = m
      if (!process.env[k]) process.env[k] = v.replace(/^["']|["']$/g, '')
    }
  }
}

// Dynamic import so env vars are loaded before the module reads them
const { uploadPublic, getPublicUrl, uploadPrivate, getPrivateSignedUrl, deletePrivate } =
  await import('../src/lib/r2-storage.ts')

let passed = 0
let failed = 0

function ok(msg) {
  console.log(`[PASS] ${msg}`)
  passed++
}
function fail(msg, err) {
  console.error(`[FAIL] ${msg}${err ? `: ${err.message ?? err}` : ''}`)
  failed++
}

const STAMP = Date.now()
const PUB_KEY = `test/r2-smoke-${STAMP}.txt`
const PRV_KEY = `test/r2-smoke-${STAMP}.txt`
const BODY = Buffer.from(`R2 smoke test at ${new Date().toISOString()}`)

// ── Public bucket round-trip ────────────────────────────────────────
try {
  const url = await uploadPublic(PUB_KEY, BODY, 'text/plain')
  if (!url.startsWith('https://')) throw new Error(`bad url: ${url}`)
  ok(`uploadPublic returned ${url}`)

  const computed = getPublicUrl(PUB_KEY)
  if (computed !== url) throw new Error(`getPublicUrl mismatch: ${computed} vs ${url}`)
  ok(`getPublicUrl computes same URL synchronously`)

  // Fetch back over CDN to verify bucket really is public
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch ${url} returned ${res.status}`)
  const text = await res.text()
  if (!text.includes('R2 smoke test')) throw new Error(`body mismatch: ${text}`)
  ok(`public bucket fetch over CDN returns uploaded body`)
} catch (e) {
  fail('public bucket round-trip', e)
}

// ── Private bucket round-trip ───────────────────────────────────────
try {
  await uploadPrivate(PRV_KEY, BODY, 'text/plain')
  ok(`uploadPrivate succeeded`)

  const signed = await getPrivateSignedUrl(PRV_KEY, 60)
  if (!signed.includes('X-Amz-Signature=')) throw new Error(`not a signed URL: ${signed}`)
  ok(`getPrivateSignedUrl returns signed URL`)

  const res = await fetch(signed)
  if (!res.ok) throw new Error(`signed fetch returned ${res.status}`)
  const text = await res.text()
  if (!text.includes('R2 smoke test')) throw new Error(`body mismatch: ${text}`)
  ok(`private bucket fetch via signed URL returns uploaded body`)

  // Direct public access to private bucket must fail
  const pubEndpoint = process.env.R2_ENDPOINT.replace(/\/$/, '')
  const directUrl = `${pubEndpoint}/${process.env.R2_PRIVATE_BUCKET}/${PRV_KEY}`
  const directRes = await fetch(directUrl)
  if (directRes.ok) throw new Error(`private object fetchable without signature: ${directUrl}`)
  ok(`private bucket direct fetch blocked without signature (status ${directRes.status})`)

  await deletePrivate(PRV_KEY)
  ok(`deletePrivate succeeded`)

  // After delete, signed URL should 404 when fetched
  const stillSigned = await getPrivateSignedUrl(PRV_KEY, 60)
  const afterDelete = await fetch(stillSigned)
  if (afterDelete.ok) throw new Error(`object still exists after delete`)
  ok(`deleted object returns ${afterDelete.status} on subsequent fetch`)
} catch (e) {
  fail('private bucket round-trip', e)
}

console.log()
console.log(`═══════════════════════════════════════════════════`)
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`)
console.log(`═══════════════════════════════════════════════════`)
process.exit(failed === 0 ? 0 : 1)
