# Quote — Existing-Client Match During Research

**Date:** 2026-04-29
**Status:** Draft → ready for review

## Problem

When a returning client starts a new `/quote` conversation, the platform can
silently create a duplicate `prospects` row instead of attaching the new
quote_session to the existing prospect. The current dedup chain in
`syncProspectFromSession` (phone E.164 string equality, business_name+city
exact, owner_email exact) is brittle against real-world data variance and
runs late — *after* the AI has already started talking to the user as if
they're new.

The fix should make the existing-client check happen during research, where
the AI is already verifying identity with the prospect ("Are you Hangtown
Range at 4661 Missouri Flat Rd?") — and quietly add a database lookup so
that confirmation also resolves the link to the existing CRM record.

## Goals

1. When research surfaces a Google Places match for a business that already
   exists in `prospects`, the quote_session links to that existing prospect
   on confirmation — never a new row.
2. The AI's identity-confirmation question reveals **only the last 4 of the
   phone on file**. No client_code, no project history, no address detail
   beyond what the user already typed. The quote chat must not become an
   account-enumeration oracle.
3. If the user declines the match (rare — wrong business), the session falls
   through to the existing create-new flow without leaking any signal that
   a record existed.
4. The existing fuzzy dedup chain stays in place as a safety net for sessions
   where research never runs (no business_name, no Places match).

## Non-goals

- No OTP / verification codes. The AI's verbal "yes that's me" is sufficient
  given the low-stakes context (budgetary estimate, not authenticated session).
- No backfill of `phone_e164_hash` on existing prospects. The new lookup uses
  the data already on prospects (phone, name, website) — it does not require
  a hash column. Lookup-time normalization handles format variance.
- No changes to the SOW path, the invoice path, or any downstream flow.
- No new admin UI. Match resolution is automatic and invisible to admin
  except for the existing "Linked Prospect" card on `/admin/quotes/[id]`,
  which already renders when a session has a `prospect_id`.

## Design

### Data flow

```
runResearch(sessionId)
  ├─ Google Places lookup → place details (name, phone, address, website)
  ├─ Site scan → schema/h1/contact form/etc.
  ├─ findExistingProspectFromResearch(findings)   ← NEW
  │     └─ returns { prospect_id, owner_phone_last_four } | null
  ├─ persistFindings(sessionId, findings)
  └─ if match found:
        UPDATE quote_sessions
          SET matched_prospect_id = <id>,
              matched_phone_last_four = <last4>
        WHERE id = sessionId
```

The chat endpoint already injects `research_findings` into the AI's system
prompt on the next turn after research completes. We extend that injection:
when `quote_sessions.matched_prospect_id` is set, the system prompt also
includes a tightly-worded instruction to ask the existing-client confirmation
question with the last-4 detail. The AI **never sees** the prospect_id, the
client_code, or any other CRM data.

When the user confirms (the AI invokes the existing `confirm_research` tool
or the chat heuristic detects affirmative language — same path that already
sets `research_confirmed = 1`), the session sync runs as normal, but
`syncProspectFromSession` checks `matched_prospect_id` *before* running the
fuzzy chain and uses it directly.

### Components

#### 1. New module: `src/lib/quote-existing-match.ts`

Single exported function:

```ts
interface ExistingMatch {
  prospect_id: string
  owner_phone_last_four: string | null  // last 4 of phone on file, or null if no phone
}

export async function findExistingProspectFromResearch(
  findings: ResearchFindings
): Promise<ExistingMatch | null>
```

Lookup chain (broadest first — this is a *hint*, not authoritative dedup):

1. **Place phone match** — normalize `findings.place.phone` to E.164 via
   the existing `toE164` helper. Query prospects where E.164 of
   `owner_phone` OR `business_phone` matches. Normalization happens in JS,
   not SQL — pull candidate rows by name+city first to keep the result set
   small, then filter in memory.
2. **Website host match** — strip protocol, `www.`, trailing slash. Query
   prospects where `website_url` host matches.
3. **Name + city match** — case-insensitive, punctuation-stripped
   `business_name` + ilike `city`.

First non-null hit wins. Returns the prospect_id and the **last 4 of the
phone field actually on the prospect record** (prefer `owner_phone`, fall
back to `business_phone`). If the matched prospect has no phone, returns
`owner_phone_last_four: null` — the AI then asks a generic "we have a
record for you, confirming?" question without the last-4 hint.

Function is **read-only**. No writes, no side effects. Pure lookup.

#### 2. Wire into `runResearch`

In `src/lib/quote-research.ts`, after `persistFindings(sessionId, findings)`:

```ts
const match = await findExistingProspectFromResearch(findings)
if (match) {
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
    event_data: { prospect_id: match.prospect_id, has_phone: match.owner_phone_last_four !== null },
  })
}
```

Failures in this block are caught and swallowed — the lookup is best-effort,
must never break research completion.

#### 3. Migration `034a_quote_session_existing_match.sql`

```sql
ALTER TABLE quote_sessions
  ADD COLUMN matched_prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  ADD COLUMN matched_phone_last_four text;

CREATE INDEX idx_quote_sessions_matched_prospect ON quote_sessions(matched_prospect_id)
  WHERE matched_prospect_id IS NOT NULL;
```

Both columns nullable. No backfill — only applies to sessions running after
migration deploy.

#### 4. Teach the AI to ask the existing-client question

Edit the system prompt assembly in `src/app/api/quote/chat/route.ts` (the
block that renders `research_findings` into the prompt). When the session
has a non-null `matched_phone_last_four`, append a directive:

```
EXISTING CLIENT CHECK: This business appears to already have a record in our
system. After confirming the research match (name/address), ask one
additional confirmation question in your own voice:
  "And just to confirm — is this still the best number for you, ending
  in <LAST_4>?"
Do NOT mention "client", "account", "record", "system", "database", or any
other phrasing that hints at account state. Treat the last-4 as a generic
contact-info confirmation. If the user confirms, proceed normally. If the
user says the number is wrong or unfamiliar, do NOT reveal that we have
a record — proceed as a new lead and ask for their best number.
```

When `matched_prospect_id` is set but `matched_phone_last_four` is null
(prospect has no phone on file), no extra confirmation question fires —
the existing research-confirmation question is enough, and the link still
happens silently in step 5.

#### 5. Honor the match in `syncProspectFromSession`

In `src/lib/quote-prospect-sync.ts`, before the existing
`findExistingProspect` fuzzy chain runs:

```ts
let prospectId: string | null = session.prospect_id

if (!prospectId && session.matched_prospect_id) {
  prospectId = session.matched_prospect_id
}

if (!prospectId) {
  prospectId = await findExistingProspect(session, findings)  // existing fallback
}
```

The `QuoteSessionRow` type is extended to include `matched_prospect_id` and
`matched_phone_last_four`.

#### 6. Verification script `scripts/verify-quote-existing-client.mjs`

Standalone Node script. Run manually after deploy. Steps:

1. Pick a random existing prospect from `prospects` where `is_client = true`
   AND has a non-null `owner_phone` AND has a non-null `business_name`.
   Capture: `prospect_id`, `business_name`, `owner_phone`, `city`,
   `website_url`.
2. Insert a synthetic `quote_sessions` row (status='active', no prospect_id).
3. Construct synthetic `ResearchFindings` containing the prospect's
   business_name, address (synthesized from city), phone, website. Call
   `findExistingProspectFromResearch(findings)` directly.
4. Assert: returns non-null, `prospect_id` matches the picked prospect,
   `owner_phone_last_four` matches last 4 of `owner_phone`.
5. Run the same lookup with three phone format variants (E.164, dashed,
   parens). Assert all three return the same prospect_id.
6. Run with website set but phone null. Assert match still found via host.
7. Run with name only (no phone, no website). Assert match found via
   name+city.
8. Cleanup: delete the synthetic quote_sessions row.

Script exits 0 on all-pass, 1 on any failure. No production data mutated.

### Error handling

- `findExistingProspectFromResearch` failures: caught at call site in
  `runResearch`, logged via `console.error`, swallowed. Research completes
  normally without the match hint.
- `matched_prospect_id` references a deleted prospect: `ON DELETE SET NULL`
  handles it. Sync falls through to the fuzzy chain.
- Race: two concurrent quotes for the same returning client both find the
  same `matched_prospect_id`. Both link to it. No duplicate created.
  (The fuzzy fallback path is the one with the legacy race risk; we're
  not making it worse.)

### Privacy / attack-surface analysis

The existing-client check itself is invisible to the user — it runs
server-side during research and writes to columns the user can't see.
The only externalized signal is the AI's last-4 confirmation question.

| Threat | Mitigated? |
|---|---|
| Attacker types known business name → AI reveals last 4 of owner's phone | No — but the attacker could already get owner_phone from the public Google Places listing in most cases. The last 4 is no worse than what `findings.place.phone` already exposes. |
| Attacker enumerates business names to map "is X a client?" | Partially — the AI's question is phrased generically ("is this still the best number for you") and fires whenever there's a phone-matching prospect, client or not. Tells attacker only that the business is in our CRM, not that they're a paying client. |
| Attacker spoofs a confirmation to hijack the session | Quote session is unauthenticated and only produces a budgetary estimate. There is no payment, no account access. The downstream SOW path requires admin action. Worst case: a synthetic quote ends up linked to a real prospect, visible in admin, deletable. No customer data exposed. |
| Last-4 leaks via verbose AI hallucination | Mitigated by the prompt's explicit "do NOT mention 'client', 'account', 'record'" rule. Reinforced by the standard quote-output scan (`quote-output-scan.ts`) which already strips PII from AI replies. |

The "no additional information" rule from product is respected: the AI never
emits client_code, project history, scope summaries, addresses beyond what
the user typed, or the existence of an account. The single externalized fact
is last-4 of phone, framed as a generic contact-info confirmation.

### Testing

Manual verification (post-deploy):
1. Run `scripts/verify-quote-existing-client.mjs`. Must exit 0.
2. Open `/quote` from a clean browser, type a known existing client's
   business_name + city. Watch admin `/admin/quotes/[id]` after research
   completes — the session must show the existing prospect linked, not a
   new one created.
3. Repeat with a brand-new business name. Session must NOT have
   `matched_prospect_id` set, and the existing-client confirmation question
   must NOT appear in the transcript.
4. Repeat with an existing client whose `owner_phone` is null. Session
   must have `matched_prospect_id` set but `matched_phone_last_four` null.
   The existing-client confirmation question must NOT appear (no last-4
   to ask about). On research_confirmed, link still happens.

No automated unit tests required — the script + manual checks cover the
behavior, and the production code paths are simple enough that mock-heavy
unit tests would test the mocks more than the logic.

## Files touched

| File | Change |
|---|---|
| `supabase/migrations/034a_quote_session_existing_match.sql` | NEW — adds two nullable columns + partial index |
| `src/lib/quote-existing-match.ts` | NEW — `findExistingProspectFromResearch()` |
| `src/lib/quote-research.ts` | Call match lookup after `persistFindings`; persist `matched_prospect_id` + `matched_phone_last_four` |
| `src/lib/quote-prospect-sync.ts` | Honor `matched_prospect_id` before fuzzy chain; extend `QuoteSessionRow` type |
| `src/lib/quote-session.ts` | Add `matched_prospect_id` + `matched_phone_last_four` to `QuoteSessionRow` interface |
| `src/app/api/quote/chat/route.ts` | Inject existing-client directive into system prompt when `matched_phone_last_four` is set |
| `scripts/verify-quote-existing-client.mjs` | NEW — verification script |

Estimated work: ~2 hours including verification.

## Out of scope (deferred)

- Adding `phone_e164_hash` column to `prospects` for fast indexed lookup.
  The lookup-time normalization in `findExistingProspectFromResearch` is
  acceptable at current scale (low hundreds of prospects). Revisit if
  prospects table crosses 10k rows.
- Generalizing the existing fuzzy dedup chain (email lowercase, name
  punctuation stripping). Not needed if the research-time match catches
  the common case. Revisit only if prod logs show duplicates slipping
  through.
- Rate-limiting the existing-client check to slow down enumeration. The
  per-IP rate limiter on `/api/quote/chat` and the research-runs-once
  guard on `/api/quote/research/kick` already cap probe rate at the
  session level.
