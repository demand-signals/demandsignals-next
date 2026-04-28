# Quote — Existing-Client Match During Research — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a returning client starts a `/quote` conversation, silently link the new quote_session to the existing prospect — no duplicate row created. Surfaces only the last 4 of phone on file as a confirmation hint; never reveals client_code, project history, or account state.

**Architecture:** Existing `runResearch()` already gets Google Places data on the prospect. After it persists findings, we run a new read-only `findExistingProspectFromResearch()` that matches against the `prospects` table by phone (E.164-normalized), website host, then name+city. A hit writes `quote_sessions.matched_prospect_id` + `matched_phone_last_four`. The system-prompt builder injects a tightly-worded directive when last-4 is available; the AI asks "is this still the best number for you, ending in NNNN?". On the existing `research_confirmed` path, `syncProspectFromSession()` honors `matched_prospect_id` ahead of the fuzzy fallback chain.

**Tech Stack:** Next.js 16, TypeScript strict, Supabase Postgres + RLS, existing `toE164()` from `quote-crypto.ts`, existing `runResearch()` pipeline.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/034a_quote_session_existing_match.sql` | CREATE | Adds `matched_prospect_id` + `matched_phone_last_four` columns + partial index on `quote_sessions` |
| `src/lib/quote-existing-match.ts` | CREATE | Pure read-only `findExistingProspectFromResearch()` lookup; no writes, no side effects |
| `src/lib/quote-research.ts` | MODIFY | After `persistFindings()`, call lookup, persist match columns, log `existing_client_matched` event |
| `src/lib/quote-session.ts` | MODIFY | Extend `QuoteSessionRow` interface with two new fields |
| `src/lib/quote-prospect-sync.ts` | MODIFY | Honor `session.matched_prospect_id` before the fuzzy `findExistingProspect()` fallback runs |
| `src/lib/quote-ai.ts` | MODIFY | In `buildSystemPrompt()`, when `session.matched_phone_last_four` is set, append the existing-client confirmation directive |
| `scripts/verify-quote-existing-client.mjs` | CREATE | Manual end-to-end verification — picks a real prospect, simulates research findings, asserts lookup returns that prospect across phone format variants |

---

## Task 1: Apply migration 034a — add match columns to quote_sessions

**Files:**
- Create: `supabase/migrations/034a_quote_session_existing_match.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/034a_quote_session_existing_match.sql`:

```sql
-- 034a: existing-client match hint columns on quote_sessions
--
-- Populated by runResearch() when findExistingProspectFromResearch finds a
-- match. Read by syncProspectFromSession (skip fuzzy chain) and by the
-- system-prompt builder (ask the last-4 confirmation question).
--
-- Both nullable. No backfill — only applies to sessions running after
-- migration deploy. ON DELETE SET NULL so deleting a prospect doesn't
-- orphan-fail a quote.

ALTER TABLE quote_sessions
  ADD COLUMN IF NOT EXISTS matched_prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matched_phone_last_four text;

CREATE INDEX IF NOT EXISTS idx_quote_sessions_matched_prospect
  ON quote_sessions(matched_prospect_id)
  WHERE matched_prospect_id IS NOT NULL;

COMMENT ON COLUMN quote_sessions.matched_prospect_id IS
  'Existing prospect matched during research. Honored by syncProspectFromSession before fuzzy fallback. Null if no match.';
COMMENT ON COLUMN quote_sessions.matched_phone_last_four IS
  'Last 4 of prospect.owner_phone (preferred) or business_phone, used as the AI confirmation hint. Null if matched prospect has no phone on file.';
```

- [ ] **Step 2: Apply via Supabase SQL editor**

Open the Supabase project SQL editor and run the file contents. Confirm `\d quote_sessions` shows both new columns and the partial index exists:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'quote_sessions'
  AND column_name IN ('matched_prospect_id', 'matched_phone_last_four');
```

Expected: 2 rows, both `is_nullable = YES`.

- [ ] **Step 3: Wait 30 seconds for PostgREST schema cache, then verify via the API**

```sql
SELECT id, matched_prospect_id, matched_phone_last_four
FROM quote_sessions
LIMIT 1;
```

Expected: returns rows with both columns NULL (no error). If "column does not exist" — schema cache hasn't refreshed; reload the SQL editor tab and retry.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/034a_quote_session_existing_match.sql
git commit -m "feat(quote): migration 034a — match columns on quote_sessions

Adds matched_prospect_id (uuid) + matched_phone_last_four (text) to
quote_sessions for the existing-client research-time match feature.
Partial index on matched_prospect_id where non-null. Both columns
nullable; no backfill.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Create `findExistingProspectFromResearch()` lookup module

**Files:**
- Create: `src/lib/quote-existing-match.ts`

- [ ] **Step 1: Create the module**

Create `src/lib/quote-existing-match.ts`:

```ts
// Read-only lookup: given research findings (Google Places + site scan),
// find any existing prospect that this business already corresponds to.
// Used by runResearch() to populate quote_sessions.matched_prospect_id so
// the AI can ask a last-4 confirmation question and the prospect-sync
// path can skip its fuzzy fallback chain.
//
// SAFETY:
//   - Pure read. Never writes. Never throws (errors return null).
//   - Caller is expected to swallow null silently — this is a hint, not
//     authoritative dedup. The downstream syncProspectFromSession still
//     runs its own fallback chain when this returns null.
//   - Returns the last 4 of the prospect's phone on file so the AI can
//     ask "is this still the best number for you, ending in NNNN?".
//     Never returns the full phone, never returns email, name beyond
//     the prospect_id, client_code, or any other CRM data.

import { supabaseAdmin } from './supabase/admin'
import { toE164 } from './quote-crypto'
import type { ResearchFindings } from './quote-research'

export interface ExistingMatch {
  prospect_id: string
  /** Last 4 digits of the prospect's owner_phone (preferred) or business_phone.
   *  Null when the matched prospect has no phone on file — the AI then skips
   *  the last-4 question and the link still happens silently on sync. */
  owner_phone_last_four: string | null
}

/**
 * Strip protocol + leading www. + trailing slash from a URL. Returns null
 * for unparseable input. Used to compare website hosts loosely.
 */
function normalizeHost(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.host.replace(/^www\./i, '').toLowerCase() || null
  } catch {
    return null
  }
}

/**
 * Lowercase + strip non-alphanumeric for loose business-name comparison.
 * "South Side MMA" → "southsidemma"; "Acme Co." → "acmeco".
 */
function normalizeName(name: string | null | undefined): string {
  if (!name) return ''
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Pull last 4 digits from a phone string. Returns null if fewer than 4
 * digits present.
 */
function lastFourDigits(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 4 ? digits.slice(-4) : null
}

/**
 * Pick the most useful last-4 from a prospect: prefer owner_phone, fall
 * back to business_phone, then null.
 */
function pickLastFour(p: { owner_phone: string | null; business_phone: string | null }): string | null {
  return lastFourDigits(p.owner_phone) ?? lastFourDigits(p.business_phone)
}

/**
 * Find any prospect already in the CRM matching this research finding.
 *
 * Lookup order (broadest match wins, since this is a hint not authoritative):
 *   1. Phone match — Place phone E.164-normalized, compared against E.164
 *      normalization of prospects.owner_phone OR business_phone.
 *   2. Website host match — Place website host vs prospects.website_url host.
 *   3. Name + city match — punctuation-stripped lowercase business_name +
 *      ilike city.
 *
 * First non-null hit wins. Returns null on no match or any error.
 */
export async function findExistingProspectFromResearch(
  findings: ResearchFindings,
): Promise<ExistingMatch | null> {
  try {
    const place = findings.place
    if (!place) return null // no Place match = nothing to look up

    // ── 1. Phone match ─────────────────────────────────────────────
    if (place.phone) {
      const targetE164 = toE164(place.phone)
      if (targetE164) {
        // Pull a candidate set scoped by city if we have one — keeps the
        // result small enough to normalize in JS without scanning the
        // whole table.
        const cityHint = (() => {
          const addr = place.formatted_address ?? ''
          const parts = addr.split(',').map((s) => s.trim()).filter(Boolean)
          // "1234 Main St, City, ST 12345, USA" → parts[1] = "City"
          return parts.length >= 2 ? parts[1] : null
        })()

        let q = supabaseAdmin
          .from('prospects')
          .select('id, owner_phone, business_phone')
          .or('owner_phone.not.is.null,business_phone.not.is.null')
          .limit(200)

        if (cityHint) q = q.ilike('city', cityHint)

        const { data: candidates } = await q
        if (candidates && candidates.length > 0) {
          for (const c of candidates) {
            const ownerE164 = toE164(c.owner_phone ?? '')
            const bizE164 = toE164(c.business_phone ?? '')
            if (ownerE164 === targetE164 || bizE164 === targetE164) {
              return {
                prospect_id: c.id,
                owner_phone_last_four: pickLastFour(c),
              }
            }
          }
        }
      }
    }

    // ── 2. Website host match ──────────────────────────────────────
    const placeHost = normalizeHost(place.website)
    if (placeHost) {
      const { data: candidates } = await supabaseAdmin
        .from('prospects')
        .select('id, owner_phone, business_phone, website_url')
        .not('website_url', 'is', null)
        .limit(500)
      if (candidates) {
        for (const c of candidates) {
          if (normalizeHost(c.website_url) === placeHost) {
            return {
              prospect_id: c.id,
              owner_phone_last_four: pickLastFour(c),
            }
          }
        }
      }
    }

    // ── 3. Name + city match ───────────────────────────────────────
    if (place.name) {
      const targetName = normalizeName(place.name)
      if (targetName) {
        // Parse "1234 X St, City, ST 12345, USA" → "City"
        const parts = (place.formatted_address ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        const cityHint = parts.length >= 2 ? parts[1] : null

        let q = supabaseAdmin
          .from('prospects')
          .select('id, business_name, owner_phone, business_phone, city')
          .limit(200)
        if (cityHint) q = q.ilike('city', cityHint)

        const { data: candidates } = await q
        if (candidates) {
          for (const c of candidates) {
            if (normalizeName(c.business_name) === targetName) {
              return {
                prospect_id: c.id,
                owner_phone_last_four: pickLastFour(c),
              }
            }
          }
        }
      }
    }

    return null
  } catch (err) {
    console.error('[findExistingProspectFromResearch] error:', err instanceof Error ? err.message : err)
    return null
  }
}
```

- [ ] **Step 2: Sanity-build TypeScript**

Run:

```bash
npx tsc --noEmit
```

Expected: clean — no errors. (If `ResearchFindings` import path is wrong, fix the import.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/quote-existing-match.ts
git commit -m "feat(quote): add findExistingProspectFromResearch() lookup

Pure read-only helper that resolves a Google Places research finding to
an existing prospects row via three-tier match: phone (E.164-normalized),
website host, then name+city. Returns prospect_id + last-4 of phone on
file. Used by runResearch to populate matched_prospect_id without
revealing CRM detail to the user.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Wire lookup into `runResearch()`

**Files:**
- Modify: `src/lib/quote-research.ts` (after the existing `persistFindings()` call near line 602)

- [ ] **Step 1: Add import at the top of quote-research.ts**

Open `src/lib/quote-research.ts`. Find the existing imports (top of file). Add:

```ts
import { findExistingProspectFromResearch } from './quote-existing-match'
```

- [ ] **Step 2: Call lookup after `persistFindings`**

Find the line `await persistFindings(sessionId, findings)` (around line 602 in current code). Replace just that single call with:

```ts
  await persistFindings(sessionId, findings)
  await persistExistingMatch(sessionId, findings)
  return findings
}
```

(The `return findings` line should already be there immediately after `persistFindings` — leave it; we're only inserting one new line.)

- [ ] **Step 3: Add the `persistExistingMatch` helper**

Below the existing `persistFindings` function definition (look for `async function persistFindings(...)`), add the new helper:

```ts
async function persistExistingMatch(sessionId: string, findings: ResearchFindings): Promise<void> {
  // Best-effort. Failures here MUST NOT break research completion —
  // the lookup is a hint, not the critical path. Errors are logged
  // and swallowed.
  try {
    const match = await findExistingProspectFromResearch(findings)
    if (!match) return

    await supabaseAdmin
      .from('quote_sessions')
      .update({
        matched_prospect_id: match.prospect_id,
        matched_phone_last_four: match.owner_phone_last_four,
      })
      .eq('id', sessionId)

    await supabaseAdmin.from('quote_events').insert({
      session_id: sessionId,
      event_type: 'existing_client_matched',
      event_data: {
        prospect_id: match.prospect_id,
        has_phone: match.owner_phone_last_four !== null,
      },
    })
  } catch (err) {
    console.error('[persistExistingMatch] error:', err instanceof Error ? err.message : err)
  }
}
```

- [ ] **Step 4: Sanity-build**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/quote-research.ts
git commit -m "feat(quote): hook existing-client match into runResearch

After persisting research findings, run findExistingProspectFromResearch
and persist matched_prospect_id + matched_phone_last_four on the session.
Best-effort — never breaks research completion. Logs an
existing_client_matched event for the admin timeline.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Extend `QuoteSessionRow` interface

**Files:**
- Modify: `src/lib/quote-session.ts:50` (after `doc_number: string | null`)

- [ ] **Step 1: Add the two new fields**

Open `src/lib/quote-session.ts`. Find the `QuoteSessionRow` interface. After `doc_number: string | null`, before `created_at: string`, insert:

```ts
  matched_prospect_id: string | null
  matched_phone_last_four: string | null
```

The full interface block should now read (only the two added lines are new):

```ts
  doc_number: string | null
  matched_prospect_id: string | null
  matched_phone_last_four: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Sanity-build**

```bash
npx tsc --noEmit
```

Expected: clean. (If a callsite that does `.select('*')` casts to `QuoteSessionRow` and the row doesn't have the column yet because the migration hasn't run, that would only fail at runtime, not compile time.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/quote-session.ts
git commit -m "feat(quote): extend QuoteSessionRow with match fields

Adds matched_prospect_id + matched_phone_last_four to the type so
prospect-sync and the system-prompt builder can read them.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Honor `matched_prospect_id` in `syncProspectFromSession`

**Files:**
- Modify: `src/lib/quote-prospect-sync.ts:155-159` (the prospectId resolution block)

- [ ] **Step 1: Locate the resolution block**

Open `src/lib/quote-prospect-sync.ts`. Find the block (currently around line 155):

```ts
  // ── Resolve or create prospect ──
  let prospectId: string | null = session.prospect_id

  if (!prospectId) {
    prospectId = await findExistingProspect(session, findings)
  }
```

- [ ] **Step 2: Insert the matched_prospect_id check**

Replace that block with:

```ts
  // ── Resolve or create prospect ──
  let prospectId: string | null = session.prospect_id

  // Research-time existing-client match wins over the fuzzy fallback chain.
  // Set by runResearch → persistExistingMatch when the Google Places result
  // hits a known prospect by phone, website host, or name+city.
  if (!prospectId && session.matched_prospect_id) {
    prospectId = session.matched_prospect_id
  }

  if (!prospectId) {
    prospectId = await findExistingProspect(session, findings)
  }
```

- [ ] **Step 3: Update the type cast just below if needed**

Look at the local type cast around line 136 (`const session = s as QuoteSessionRow & { ... }`). The intersection extends QuoteSessionRow with phone/research extras but NOT with the new match fields. Since QuoteSessionRow itself now includes them (Task 4), no change is needed here — but verify the cast still compiles:

```bash
npx tsc --noEmit
```

Expected: clean. If it fails on `session.matched_prospect_id`, ensure Task 4 was committed and re-run.

- [ ] **Step 4: Commit**

```bash
git add src/lib/quote-prospect-sync.ts
git commit -m "feat(quote): honor matched_prospect_id before fuzzy fallback

syncProspectFromSession now uses the research-time match before falling
through to the legacy phone/name+city/email chain. Prevents duplicate
prospect creation when a returning client starts a new quote.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Inject existing-client directive into the system prompt

**Files:**
- Modify: `src/lib/quote-ai.ts` (in `buildSystemPrompt`, near the existing `if (findings && session.research_surfaced_at) { ... }` else-branch around line 1346)

- [ ] **Step 1: Locate the research-surfaced branch**

Open `src/lib/quote-ai.ts`. Find this block (currently around line 1346):

```ts
  } else if (findings && session.research_surfaced_at) {
    parts.push('')
    parts.push('- Research already surfaced to prospect — do not repeat observations')
  }
```

The injection point is INSIDE the prior branch — the one that fires when `findings && !session.research_surfaced_at` (the "use this turn" block). Find the closing of that block — it ends just before `} else if (findings && session.research_surfaced_at)`. The directive should be appended right before that closing brace, so it shows up alongside the research findings on the turn the AI delivers the confirmation hook.

- [ ] **Step 2: Append the existing-client directive**

Just before the `} else if (findings && session.research_surfaced_at) {` line, inside the prior block, add:

```ts
    // ── Existing-client check (writes to matched_prospect_id during research) ──
    // When the matched prospect has a phone on file, the AI does ONE extra
    // confirmation question framed as generic contact-info hygiene. Never
    // mention "client", "account", "record", "system", "database". The
    // last-4 is the only externalized fact.
    if (session.matched_phone_last_four) {
      parts.push('')
      parts.push('EXISTING CONTACT CHECK — last-4 confirmation:')
      parts.push('After the prospect confirms the research match (name/address), ask ONE')
      parts.push('additional confirmation question in your own voice:')
      parts.push(`  "And just to confirm — is this still the best number for you, ending in ${session.matched_phone_last_four}?"`)
      parts.push('Strict rules:')
      parts.push('  - Never mention "client", "account", "record", "system", "database",')
      parts.push('    "we have you", "we already", or any phrasing that hints at account state.')
      parts.push('  - Treat the last-4 as a generic contact-info confirmation.')
      parts.push('  - If the user confirms, just continue normally — no further commentary.')
      parts.push('  - If the user says the number is wrong or unfamiliar, do NOT reveal that')
      parts.push('    we already have them — proceed as a new lead and ask for their best number.')
      parts.push('  - Ask this question ONCE per session. If it has already been asked, do not repeat it.')
    }
```

- [ ] **Step 3: Sanity-build**

```bash
npx tsc --noEmit
```

Expected: clean. The `session` parameter is already typed `QuoteSessionRow` (verified at line 1215), and Task 4 added `matched_phone_last_four` to that interface.

- [ ] **Step 4: Commit**

```bash
git add src/lib/quote-ai.ts
git commit -m "feat(quote): existing-client last-4 confirmation directive

When session.matched_phone_last_four is set, append a tightly-worded
directive to the system prompt asking the AI to confirm the last 4 of
the phone on file. Explicit rules forbid revealing account state,
client_code, project history, or any CRM detail. Last-4 is the only
externalized fact.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Verification script

**Files:**
- Create: `scripts/verify-quote-existing-client.mjs`

- [ ] **Step 1: Create the script**

Create `scripts/verify-quote-existing-client.mjs`:

```js
#!/usr/bin/env node
// Manual verification: existing-client match during research.
//
// Picks a random existing prospect with phone + business_name + city,
// constructs synthetic ResearchFindings, and asserts that
// findExistingProspectFromResearch returns the same prospect_id across
// multiple phone format variants and on website-only / name-only paths.
//
// Run after deploying migration 034a and the new lib code:
//   node scripts/verify-quote-existing-client.mjs
//
// Exits 0 on all-pass, 1 on any failure. No production data mutated
// (no inserts, no updates, no deletes).

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key)

// Re-implement minimal toE164 + lookup matching the production code so the
// script doesn't need to import compiled .ts. Production logic lives in
// src/lib/quote-crypto.ts (toE164) and src/lib/quote-existing-match.ts
// (findExistingProspectFromResearch).
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

// Mirrors src/lib/quote-existing-match.ts. Keep in sync.
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
```

- [ ] **Step 2: Make sure dotenv is available**

The script imports `dotenv` from `dotenv`. Check `package.json`:

```bash
grep '"dotenv"' package.json
```

If not present, install:

```bash
npm install --save-dev dotenv
```

(If it's only used by scripts, `--save-dev` is correct.)

- [ ] **Step 3: Run the script**

```bash
node scripts/verify-quote-existing-client.mjs
```

Expected output:

```
Picking an eligible existing prospect...
Target: <business name> (<uuid>) phone=+1XXXXXXXXXX city=<city>

Test 1: phone match — E.164 format
  ✓ result not null
  ✓ prospect_id matches
  ✓ last-4 returned
...
Results: N pass, 0 fail
```

Exit code 0. If any test fails, do NOT proceed to Task 8 — debug the lookup logic in `src/lib/quote-existing-match.ts` against the failing case, fix, recommit, re-run.

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-quote-existing-client.mjs package.json package-lock.json
git commit -m "test(quote): verification script for existing-client match

Picks a real prospect, simulates research findings across phone format
variants (E.164, dashed, parens), website-only path, and name+city path,
asserts the lookup returns the same prospect_id every time. Plus
negative tests for fabricated businesses and null place. Exits non-zero
on any failure. No production data mutated.

Co-authored-by: Demand Signals <noreply@demandsignals.co>
Co-authored-by: Anthropic Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Build + push

**Files:**
- All changes from Tasks 1-7

- [ ] **Step 1: Full Next.js build**

```bash
npm run build
```

Expected: clean compile, all 843+ static pages generated. If TypeScript errors surface, fix them in the relevant file (most likely `quote-prospect-sync.ts` or `quote-research.ts` if a type mismatch slipped through).

- [ ] **Step 2: Push to GitHub (auto-deploys to Vercel)**

Use the headless-bash git push from CLAUDE.md §4 (OAuth token from PROJECT.md §2):

```bash
GHTOKEN="<get from PROJECT.md>"
git -c credential.helper="" \
  -c "http.https://github.com.extraheader=Authorization: Basic $(echo -n "demand-signals:${GHTOKEN}" | base64 -w0)" \
  push origin master
```

Expected: pushes 7-8 commits. Vercel deploy starts automatically.

- [ ] **Step 3: Confirm deploy SHA matches latest commit**

Per CLAUDE.md §12 lesson "Empty initial query result during deploy lag":

```bash
sleep 90
curl -s -o /dev/null -D - https://demandsignals.co | grep -i "x-vercel-id"
```

Wait for Vercel to flip the alias. Then confirm the new code is live:

```bash
git log --oneline -1
# Compare the SHA against what Vercel shows in the dashboard.
```

- [ ] **Step 4: Run verification against production data**

Re-run from local (the script uses .env.local pointing at prod Supabase):

```bash
node scripts/verify-quote-existing-client.mjs
```

Expected: all-pass. If it fails on production data the migration didn't apply correctly — re-check Task 1 step 2 + 3.

---

## Task 9: Manual end-to-end smoke test

**Files:** none (manual verification)

- [ ] **Step 1: Pick an existing client and capture their data**

Open `/admin/prospects`. Pick a prospect with `is_client = true` AND `owner_phone` set. Note their `business_name`, `city`, and last 4 digits of phone.

- [ ] **Step 2: Open `/quote` in an incognito browser**

Navigate to `https://demandsignals.co/quote`. Type the existing client's `business_name` and `city/state` into the chat naturally as the conversation prompts. Wait for research to complete (the AI will eventually deliver a confirmation hook).

- [ ] **Step 3: Watch the AI's confirmation question**

Expected: the AI asks the research confirmation question (name + address) AND, in a follow-up, asks "is this still the best number for you, ending in NNNN?" using the correct last-4. The question must NOT contain the words: client, account, record, system, database, "we have you", "we already".

If the question leaks any of those, fix the prompt directive in `src/lib/quote-ai.ts` (Task 6 Step 2) and redeploy.

- [ ] **Step 4: Confirm the link in admin**

Open `/admin/quotes` in another tab. Find the new session (newest at top). Click into it. The "Linked Prospect" card should show the existing prospect — NOT a new prospect. Confirm by checking the prospect's `id` matches the one captured in Step 1.

- [ ] **Step 5: Verify no duplicate prospect was created**

In Supabase SQL editor:

```sql
SELECT id, business_name, created_at
FROM prospects
WHERE business_name ILIKE '<exact business_name>'
ORDER BY created_at DESC;
```

Expected: ONE row, `created_at` predates the test session.

- [ ] **Step 6: Negative test — brand-new business**

Repeat steps 2–4 with a fabricated business name like "Fake Test Co XYZ123" + a real city. Expected:
- Research runs but no place match (or low-confidence match)
- AI does NOT ask the last-4 confirmation question
- A new `prospects` row is created (or not, depending on whether identity was confirmed) — but `quote_sessions.matched_prospect_id` for the session is NULL

In Supabase:

```sql
SELECT id, matched_prospect_id, matched_phone_last_four
FROM quote_sessions
WHERE business_name = 'Fake Test Co XYZ123'
ORDER BY created_at DESC LIMIT 1;
```

Expected: both NULL.

- [ ] **Step 7: Cleanup**

Delete the test quote sessions if they're in the way:

```sql
DELETE FROM quote_messages WHERE session_id IN (
  SELECT id FROM quote_sessions WHERE business_name = 'Fake Test Co XYZ123'
);
DELETE FROM quote_events WHERE session_id IN (
  SELECT id FROM quote_sessions WHERE business_name = 'Fake Test Co XYZ123'
);
DELETE FROM quote_sessions WHERE business_name = 'Fake Test Co XYZ123';
```

(Skip this if you want to leave them as a paper trail.)

---

## Self-Review

**Spec coverage:**
- Goal 1 (link to existing, no duplicate) → Tasks 2, 3, 5 (lookup + persist + sync)
- Goal 2 (last-4 only, no other detail) → Task 6 (system-prompt directive with explicit forbidden phrases)
- Goal 3 (graceful decline → fall through) → Task 6 directive's last bullet ("if user says number is wrong, do NOT reveal we have a record")
- Goal 4 (existing fuzzy fallback retained) → Task 5 keeps `findExistingProspect()` call after the new check
- Non-goal "no OTP" → respected (Task 6 is verbal confirmation only)
- Non-goal "no backfill of phone_e164_hash" → respected (lookup uses `toE164()` at query time, no schema change to prospects)
- Non-goal "no SOW/invoice changes" → respected (zero files in those areas touched)
- Migration name matches spec (`034a_quote_session_existing_match.sql`) ✓
- Function name matches spec (`findExistingProspectFromResearch`) ✓
- Column names match spec (`matched_prospect_id`, `matched_phone_last_four`) ✓
- Verification script covers all required cases (E.164/dashed/parens phone, website-only, name+city, punctuation variant, negative case, null place) ✓

**Placeholder scan:** No TBDs, TODOs, or "implement later". All code blocks are full and complete.

**Type consistency:** `findExistingProspectFromResearch` returns `ExistingMatch | null` everywhere. `matched_prospect_id` (string|null) and `matched_phone_last_four` (string|null) are consistent across migration, type, library, system prompt, and script.

**One detail to confirm during execution:** Task 6 Step 1 says the directive goes "just before the `} else if` line, inside the prior block." If the surrounding code in `quote-ai.ts` has shifted since this plan was written, the executor should locate the same logical position — alongside the research findings injection, before the surfaced-already branch — rather than rely on the literal line number.
