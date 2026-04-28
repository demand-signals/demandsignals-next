#!/usr/bin/env node
// Manual verification: existing-client match during research.
//
// Picks a random existing prospect with phone + business_name + city,
// constructs synthetic ResearchFindings, and asserts that the lookup
// returns the same prospect_id across multiple phone format variants
// and on website-only / name-only paths.
//
// Run after deploying migration 034 and the new lib code:
//   node scripts/verify-quote-existing-client.mjs
//
// Exits 0 on all-pass, 1 on any failure. No production data mutated
// (no inserts, no updates, no deletes).
//
// The lookup logic is re-implemented inline (mirroring
// src/lib/quote-existing-match.ts + toE164 in src/lib/quote-crypto.ts)
// so the .mjs script doesn't need to compile TypeScript. KEEP IN SYNC.

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(ROOT, '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key)

// Mirrors src/lib/quote-crypto.ts toE164. Keep in sync.
function toE164(input) {
  if (!input) return null
  const digits = String(input).replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`
  return null
}

function normalizeHost(u) {
  if (!u) return null
  try {
    const parsed = new URL(u.startsWith('http') ? u : `https://${u}`)
    return parsed.host.replace(/^www\./i, '').toLowerCase() || null
  } catch {
    return null
  }
}

function normalizeName(n) {
  if (!n) return ''
  return n.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function lastFourDigits(p) {
  if (!p) return null
  const d = String(p).replace(/\D/g, '')
  return d.length >= 4 ? d.slice(-4) : null
}

function pickLastFour(p) {
  return lastFourDigits(p.owner_phone) ?? lastFourDigits(p.business_phone)
}

// Mirrors src/lib/quote-existing-match.ts findExistingProspectFromResearch.
async function findExistingProspectFromResearch(findings) {
  const place = findings.place
  if (!place) return null

  // 1. Phone match
  if (place.phone) {
    const target = toE164(place.phone)
    if (target) {
      const cityHint = (() => {
        const parts = (place.formatted_address ?? '').split(',').map((s) => s.trim()).filter(Boolean)
        return parts.length >= 2 ? parts[1] : null
      })()
      let q = supabase
        .from('prospects')
        .select('id, owner_phone, business_phone')
        .or('owner_phone.not.is.null,business_phone.not.is.null')
        .limit(200)
      if (cityHint) q = q.ilike('city', cityHint)
      const { data } = await q
      for (const c of data ?? []) {
        if (toE164(c.owner_phone) === target || toE164(c.business_phone) === target) {
          return { prospect_id: c.id, owner_phone_last_four: pickLastFour(c) }
        }
      }
    }
  }

  // 2. Website host match
  const placeHost = normalizeHost(place.website)
  if (placeHost) {
    const { data } = await supabase
      .from('prospects')
      .select('id, owner_phone, business_phone, website_url')
      .not('website_url', 'is', null)
      .limit(500)
    for (const c of data ?? []) {
      if (normalizeHost(c.website_url) === placeHost) {
        return { prospect_id: c.id, owner_phone_last_four: pickLastFour(c) }
      }
    }
  }

  // 3. Name + city match
  if (place.name) {
    const targetName = normalizeName(place.name)
    if (targetName) {
      const parts = (place.formatted_address ?? '').split(',').map((s) => s.trim()).filter(Boolean)
      const cityHint = parts.length >= 2 ? parts[1] : null
      let q = supabase
        .from('prospects')
        .select('id, business_name, owner_phone, business_phone, city')
        .limit(200)
      if (cityHint) q = q.ilike('city', cityHint)
      const { data } = await q
      for (const c of data ?? []) {
        if (normalizeName(c.business_name) === targetName) {
          return { prospect_id: c.id, owner_phone_last_four: pickLastFour(c) }
        }
      }
    }
  }

  return null
}

let pass = 0
let fail = 0

function assertEq(label, actual, expected) {
  if (actual === expected) {
    console.log(`  ✓ ${label}`)
    pass++
  } else {
    console.log(`  ✗ ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    fail++
  }
}

function assertNotNull(label, actual) {
  if (actual !== null && actual !== undefined) {
    console.log(`  ✓ ${label}`)
    pass++
  } else {
    console.log(`  ✗ ${label} — expected non-null, got ${JSON.stringify(actual)}`)
    fail++
  }
}

async function main() {
  console.log('Picking an eligible existing prospect...')
  const { data: candidates, error } = await supabase
    .from('prospects')
    .select('id, business_name, owner_phone, business_phone, city, website_url')
    .not('owner_phone', 'is', null)
    .not('business_name', 'is', null)
    .not('city', 'is', null)
    .limit(20)
  if (error) {
    console.error('Failed to query prospects:', error.message)
    process.exit(1)
  }
  if (!candidates || candidates.length === 0) {
    console.error('No eligible prospects (need owner_phone + business_name + city). Cannot verify.')
    process.exit(1)
  }
  const target = candidates[0]
  const phoneE164 = toE164(target.owner_phone)
  const last4 = lastFourDigits(target.owner_phone)
  if (!phoneE164 || !last4) {
    console.error(`Picked prospect ${target.id} has unparseable phone "${target.owner_phone}". Try another.`)
    process.exit(1)
  }
  console.log(`Target: ${target.business_name} (${target.id}) phone=${phoneE164} city=${target.city}`)

  // Test 1: phone match (E.164 input)
  console.log('\nTest 1: phone match — E.164 format')
  let m = await findExistingProspectFromResearch({
    place: {
      name: target.business_name,
      formatted_address: `100 Main St, ${target.city}, CA 95762, USA`,
      phone: phoneE164,
      website: null,
    },
  })
  assertNotNull('result not null', m)
  assertEq('prospect_id matches', m?.prospect_id, target.id)
  assertEq('last-4 returned', m?.owner_phone_last_four, last4)

  // Test 2: phone match (dashed format)
  console.log('\nTest 2: phone match — dashed format')
  const dashed = phoneE164.replace('+1', '').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
  m = await findExistingProspectFromResearch({
    place: {
      name: target.business_name,
      formatted_address: `100 Main St, ${target.city}, CA 95762, USA`,
      phone: dashed,
      website: null,
    },
  })
  assertEq('prospect_id matches via dashed phone', m?.prospect_id, target.id)

  // Test 3: phone match (parens format)
  console.log('\nTest 3: phone match — parens format')
  const parens = phoneE164.replace('+1', '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
  m = await findExistingProspectFromResearch({
    place: {
      name: target.business_name,
      formatted_address: `100 Main St, ${target.city}, CA 95762, USA`,
      phone: parens,
      website: null,
    },
  })
  assertEq('prospect_id matches via parens phone', m?.prospect_id, target.id)

  // Test 4: website-only match (skipped if target has no website)
  console.log('\nTest 4: website host match (no phone)')
  if (target.website_url) {
    m = await findExistingProspectFromResearch({
      place: {
        name: 'Different Business Name',
        formatted_address: `100 Main St, Different City, CA 95762, USA`,
        phone: null,
        website: target.website_url,
      },
    })
    assertEq('prospect_id matches via website host', m?.prospect_id, target.id)
  } else {
    console.log('  - skipped (target has no website_url)')
  }

  // Test 5: name + city match (no phone, no website)
  console.log('\nTest 5: name + city match (no phone, no website)')
  m = await findExistingProspectFromResearch({
    place: {
      name: target.business_name,
      formatted_address: `100 Main St, ${target.city}, CA 95762, USA`,
      phone: null,
      website: null,
    },
  })
  assertEq('prospect_id matches via name+city', m?.prospect_id, target.id)

  // Test 6: punctuation-stripped name match
  console.log('\nTest 6: name+city match — punctuation variant')
  const messyName = target.business_name + '.'
  m = await findExistingProspectFromResearch({
    place: {
      name: messyName,
      formatted_address: `100 Main St, ${target.city}, CA 95762, USA`,
      phone: null,
      website: null,
    },
  })
  assertEq('prospect_id matches with trailing period', m?.prospect_id, target.id)

  // Test 7: no match for fabricated business
  console.log('\nTest 7: synthetic non-existent business returns null')
  m = await findExistingProspectFromResearch({
    place: {
      name: 'Definitely Not A Real Business 9X8Q',
      formatted_address: '999 Fake Ln, Nowhere, ZZ 00000, USA',
      phone: '+15555550199',
      website: 'https://this-domain-should-not-exist-9x8q.example',
    },
  })
  assertEq('null for fabricated business', m, null)

  // Test 8: null place returns null
  console.log('\nTest 8: null place returns null')
  m = await findExistingProspectFromResearch({ place: null })
  assertEq('null when no place data', m, null)

  console.log(`\nResults: ${pass} pass, ${fail} fail`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('Script crashed:', e)
  process.exit(1)
})
