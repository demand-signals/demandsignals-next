# Quote Estimator — Operational Runbook

**Owner:** Hunter (DSIG)
**Scope:** `/quote` page, Claude-powered AI sales engineer, Supabase tables `quote_*` and `invoices*`, Twilio SMS integration.

> **The three things to know at 2am:**
> 1. **Kill switch** — `ai_enabled=false` in `quote_config` stops all AI calls immediately.
> 2. **Every AI response is regex-scanned** before it reaches a prospect. Scanner rules live in `src/lib/quote-output-scan.ts`.
> 3. **25/25 RLS tests** guard every table. Re-run `node scripts/test-quote-rls.mjs` after any policy change.

---

## Emergency procedures

### The AI is saying something it shouldn't

**Symptoms:** prospect complaint, support ticket, admin sees flagged message in `/admin/quotes/[id]`.

1. **Stop the bleeding** — flip the kill switch:
   ```sql
   UPDATE quote_config SET value = 'false'::jsonb WHERE key = 'ai_enabled';
   ```
   The `/quote` page immediately falls back to manual configurator mode. No further AI calls happen.
   Config cache refreshes within 30s; force-refresh by calling `invalidateConfigCache()` or redeploying.

2. **Find the offending message:**
   ```sql
   SELECT id, session_id, content, flagged, flag_reason, created_at
   FROM quote_messages
   WHERE flagged = true
   ORDER BY created_at DESC
   LIMIT 20;
   ```

3. **Quarantine the session:**
   ```sql
   UPDATE quote_sessions SET status = 'blocked' WHERE id = '<session_id>';
   ```
   Blocks further AI interaction on that session.

4. **Add a scanner rule** for the exact phrasing in `src/lib/quote-output-scan.ts`, then extend `tests/quote-ai-evals.mjs` with a test case. Commit, push, verify evals pass.

5. **Re-enable AI:**
   ```sql
   UPDATE quote_config SET value = 'true'::jsonb WHERE key = 'ai_enabled';
   ```

### Costs are spiking

**Symptoms:** daily cost report alert, unexpected Anthropic bill.

1. **Check the daily report:**
   ```sql
   SELECT sum(total_cost_cents) / 100.0 AS dollars_today, count(*) AS sessions
   FROM quote_sessions
   WHERE created_at > now() - interval '24 hours';
   ```

2. **Find top-spending sessions:**
   ```sql
   SELECT id, business_name, total_cost_cents, total_tokens_used, created_at
   FROM quote_sessions
   WHERE total_cost_cents > 100
   ORDER BY total_cost_cents DESC
   LIMIT 20;
   ```

3. **Tighten the per-session cap** if one or two sessions are outliers:
   ```sql
   UPDATE quote_config SET value = '100'::jsonb WHERE key = 'session_cost_cap_cents';
   -- 100 cents = $1/session. Default is 200 ($2/session).
   ```

4. **Kill switch if it is systemic:**
   ```sql
   UPDATE quote_config SET value = 'false'::jsonb WHERE key = 'ai_enabled';
   ```

5. **Likely causes:** one verbose prospect (check messages per session), prompt injection loop (check `quote_events` for `output_scan_rejected`), cache invalidation storm (catalog edited mid-day — avoid).

### Prospect complains about a screenshot-as-quote

**The disclaimer is everywhere by design.** Section 22.3 of the spec lists all locations. The SOW supersedes rule is the legal shield. Never remove a disclaimer to resolve a complaint.

1. Pull the full session transcript: `/admin/quotes/[session_id]`.
2. Verify the disclaimer WAS visible when they used the tool (check `catalog_version` on the session row — confirms the UI version).
3. If the AI did produce binding-sounding language that slipped past the scanner: add that phrasing to the scanner, ship the fix, then respond to the prospect acknowledging the language was imprecise and restate the non-binding nature. Do NOT offer to honor a number you cannot deliver on.

### Scraper / bot abuse

**Symptoms:** unusual pattern of sessions from the same IP, VOIP phone numbers, rapid session creation.

1. **Find the pattern:**
   ```sql
   SELECT ip_address, count(*) AS sessions, min(created_at), max(created_at)
   FROM quote_sessions
   WHERE created_at > now() - interval '24 hours'
   GROUP BY ip_address
   HAVING count(*) > 5
   ORDER BY count(*) DESC;
   ```

2. **Block by IP in middleware** (add to the middleware allowlist/blocklist).
3. **Check VOIP concentration:**
   ```sql
   SELECT count(*) FILTER (WHERE phone_is_voip) AS voip,
          count(*) FILTER (WHERE NOT phone_is_voip) AS landline_mobile
   FROM quote_sessions
   WHERE created_at > now() - interval '7 days';
   ```

4. **Tighten rate limits** in `quote_config` (when that config key is added) or in `src/lib/quote-ai-budget.ts` HARD_LIMITS if urgent.

### Supabase RLS regression

**Symptoms:** `node scripts/test-quote-rls.mjs` fails.

1. Check which policy broke (the script names it).
2. Re-apply the relevant `005a*.sql` file via Supabase SQL Editor (select-all + Run — see DB migration procedure below).
3. Re-run the test. Must show 25/25 before deploying.

---

## Data model cheat sheet

| Table | Source of truth | Admin can edit? |
|---|---|---|
| `quote_sessions` | Yes (cached derived fields recomputed from events) | Yes |
| `quote_events` | Append-only audit log | No (insert-only) |
| `quote_messages` | Chat transcript | Update only for `flagged`/`flag_reason` |
| `quote_bids` | Yes | Yes (accept/counter/decline) |
| `invoices` + `invoice_line_items` | Yes | Yes |
| `quote_config` | Yes (live admin flags) | Yes |

**Derived recompute:** `SELECT recompute_session_state('<session_id>')` rebuilds `selected_items` from `quote_events`. Run this if admin and prospect views disagree.

**Phone encryption keys:**
- `QUOTE_PHONE_ENCRYPTION_KEY` (current, required)
- `QUOTE_PHONE_ENCRYPTION_KEY_PREV` (optional during rotation)
- `QUOTE_PHONE_HASH_PEPPER` (for deterministic lookup hash)

Generate a new key:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Supabase migration procedure (IMPORTANT)

The Supabase SQL Editor has parsing issues with large multi-statement files. All `005*` migrations are split into single-purpose files that must be run **one at a time**:

1. Open Supabase SQL Editor → new query tab per file
2. Paste the file contents
3. **Click inside the editor, press Ctrl+A to select all**
4. Click Run
5. Wait for "Success. No rows returned"
6. Move to the next file

**Required order:**
```
005a_quote_tables.sql     (quote_sessions)
005a2_quote_events.sql
005a3_quote_messages.sql
005a4_quote_bids.sql
005a5_invoices.sql        (creates invoice_number_seq too)
005a6_invoice_line_items.sql
005a7_quote_config.sql    (seeds 6 config rows)
005b1_set_updated_at.sql  (trigger helper + 3 triggers)
005b2_generate_invoice_number.sql
005b3_recompute_session_state.sql
005b4_expire_stale_sessions.sql
005c_quote_grants.sql     (REVOKE EXECUTE from anon + authenticated)
```

**Verification after all run:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND (table_name LIKE 'quote_%' OR table_name LIKE 'invoice%')
ORDER BY table_name;
-- Expected: 7 rows

SELECT routine_name FROM information_schema.routines
WHERE routine_schema='public' AND routine_name LIKE '%session%' OR routine_name = 'generate_invoice_number'
ORDER BY routine_name;
-- Expected at least: expire_stale_sessions, generate_invoice_number, recompute_session_state, set_updated_at

SELECT key, value FROM quote_config ORDER BY key;
-- Expected: 6 rows
```

Then locally:
```
node scripts/test-quote-rls.mjs
```
Must show **25 passed, 0 failed**.

---

## A2P 10DLC compliance

**Current state:** Twilio 800# is registered for 2FA / transactional opt-in messages. Phone verification (Checkpoint 1) runs on this approval.

**Blocker for Stage C cadence SMS:** the outbound follow-up cadence (Day 1/3/7/14/30/45) is a **Marketing use case** and requires a separate A2P 10DLC campaign registration. Do NOT ship C3 until registration is approved.

**Config flag:** `quote_config.cadence_enabled` defaults to `false`. Admin toggles to `true` only after Twilio Marketing campaign approval.

---

## Testing before deployment

Stage A guardrails run in this order on every push that touches the `/quote` module:

1. `node scripts/test-quote-rls.mjs` — 25/25 must pass.
2. `npx tsx scripts/check-catalog.mjs` — catalog must validate.
3. `npx tsx tests/quote-ai-evals.mjs` — 38/38 must pass.
4. `npm run build` — TypeScript + Next.js build must succeed.

If any of these fail, the deploy does not ship.

---

## Incident logging

Every incident (real or near-miss) gets a row in a future `incidents` table and a short postmortem in `docs/incidents/`. Minimum fields:
- Date, duration
- Symptom visible to prospect (if any)
- Root cause
- Fix (link to commit)
- Prevention (new test case, new rule, new alert)

---

## Known limitations (as of 2026-04-16)

- **VOIP detection** — flagged but not blocked. Intentional for Stage A.
- **Cross-device session resume** — magic link works; new session is created, not merged.
- **International prospects** — no Twilio coverage outside North America. `toE164()` requires explicit `+` prefix.
- **Concurrent admin + prospect edits** — last write wins on `selected_items` because admin path and prospect path both go through `recompute_session_state()`. Admin-initiated edits write events too; event replay is authoritative.
- **Inbound SMS** — Stage C feature, not yet shipped.

---

## Quick commands

```bash
# Run full Stage A test suite
cd D:/CLAUDE/demandsignals-next
node scripts/test-quote-rls.mjs && \
  npx tsx scripts/check-catalog.mjs && \
  npx tsx tests/quote-ai-evals.mjs

# Kill switch (emergency)
# In Supabase SQL Editor:
# UPDATE quote_config SET value = 'false'::jsonb WHERE key = 'ai_enabled';

# Re-enable
# UPDATE quote_config SET value = 'true'::jsonb WHERE key = 'ai_enabled';

# Generate a new phone encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
