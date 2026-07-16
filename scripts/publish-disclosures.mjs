#!/usr/bin/env node
// ── publish-disclosures.mjs ──────────────────────────────────────────
// Publishes the standing DSIG disclosure PDFs to the PUBLIC R2 bucket and
// registers each as an immutable disclosure_versions row, so the MSA's
// hyperlinked codes resolve.
//
// IMMUTABILITY: a published code is never overwritten. If a code already
// exists in disclosure_versions, this script SKIPS it (a new quarter is a
// new code, e.g. DSIG.STSD.Q4Y26.v1a). To supersede, publish the new code
// and the script flips is_current on the old one for that kind.
//
// Usage:
//   node scripts/publish-disclosures.mjs <dir-with-pdfs>
//
// Expects PDFs named by code, e.g.:
//   DSIG.STSD.Q3Y26.v1a.pdf
//   DSIG.SRPD.Q3Y26.v1a.pdf
//   DSIG.MCD.Q3Y26.v1a.pdf
//
// Env (loaded via /y/SCRIPTS/creds-inject or dsig.env):
//   R2_* (public + private), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'

const KIND_TITLES = {
  STSD: 'Standard Terms of Service Disclosure',
  SRPD: 'Standard Rates & Payment Terms Disclosure',
  MCD: 'Mutual Confidentiality Disclosure',
  SRRD: 'Standard Reciprocal Referral Disclosure',
}

function req(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

// Parse "DSIG_STSD_Q3Y26_v1a.pdf" (or dotted) → { kind, version, code, slug }
//   code = canonical dotted legal code (DSIG.STSD.Q3Y26.v1a) — used in DB + MSA refs
//   slug = underscored form (DSIG_STSD_Q3Y26_v1a) — used for the R2 key / public URL
function parseName(file) {
  const base = file.replace(/\.pdf$/i, '')
  const m = base.match(/^DSIG[._](STSD|SRPD|MCD|SRRD)[._](Q\dY\d\d)[._](v\d[a-z])$/)
  if (!m) return null
  const [, kind, version, rev] = m
  return {
    kind,
    version,
    code: `DSIG.${kind}.${version}.${rev}`,
    slug: `DSIG_${kind}_${version}_${rev}`,
  }
}

async function main() {
  const dir = process.argv[2]
  if (!dir) {
    console.error('Usage: node scripts/publish-disclosures.mjs <dir-with-pdfs>')
    process.exit(1)
  }

  const r2 = new S3Client({
    region: 'auto',
    endpoint: req('R2_ENDPOINT'),
    credentials: {
      accessKeyId: req('R2_ACCESS_KEY_ID'),
      secretAccessKey: req('R2_SECRET_ACCESS_KEY'),
    },
  })
  const publicBucket = req('R2_PUBLIC_BUCKET')
  const publicBase = req('R2_PUBLIC_URL').replace(/\/$/, '')
  const supa = createClient(req('SUPABASE_URL'), req('SUPABASE_SERVICE_ROLE_KEY'))

  const files = readdirSync(dir).filter((f) => /\.pdf$/i.test(f))
  if (files.length === 0) {
    console.error(`No PDFs found in ${dir}`)
    process.exit(1)
  }

  for (const file of files) {
    const parsed = parseName(file)
    if (!parsed) {
      console.warn(`  SKIP (name not a disclosure code): ${file}`)
      continue
    }
    const { kind, version, code, slug } = parsed

    // Immutability: skip if this exact code is already published.
    const { data: existing } = await supa
      .from('disclosure_versions').select('id').eq('code', code).maybeSingle()
    if (existing) {
      console.log(`  SKIP (already published, immutable): ${code}`)
      continue
    }

    const bytes = readFileSync(join(dir, file))
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    // Underscored key for clean public URLs; canonical dotted code in the DB.
    const key = `legal/disclosures/${slug}.pdf`
    const publicUrl = `${publicBase}/${key}`

    await r2.send(new PutObjectCommand({
      Bucket: publicBucket, Key: key, Body: bytes, ContentType: 'application/pdf',
    }))

    // New current version supersedes prior current for this kind.
    await supa.from('disclosure_versions').update({ is_current: false }).eq('kind', kind).eq('is_current', true)

    const { error } = await supa.from('disclosure_versions').insert({
      kind,
      code,
      title: KIND_TITLES[kind] ?? code,
      version,
      storage_key: key,
      public_url: publicUrl,
      sha256,
      is_current: true,
    })
    if (error) {
      console.error(`  ERROR inserting ${code}: ${error.message}`)
      continue
    }
    console.log(`  PUBLISHED ${code} → ${publicUrl}  (sha256 ${sha256.slice(0, 12)}…)`)
  }
  console.log('Done.')
}

main().catch((e) => { console.error(e); process.exit(1) })
