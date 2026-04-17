# DSIG Next.js — Working Memory

> **Read this before touching code.** This file tracks *what's happening now* —
> recent tasks, current task, next tasks, what works, what has failed, and
> what NOT to do. CLAUDE.md is the stable spec; MEMORY.md is the moving state.
>
> **Update this file at the end of every work session.** Keep it tight —
> recent 5 tasks back, current, next 3-5 ahead. Prune anything older than 30 days
> unless it's a durable lesson ("don't do X, it broke Y").

**Last updated:** 2026-04-17 (Opus 4.7, commit `abcbd10`)

---

## Current task

**Live SMS verification test of `/quote` on staging**

- URL: https://dsig.demandsignals.dev/quote
- What to do: chat with AI until phone gate appears, enter real cell, receive real SMS, enter code, confirm prices unlock
- Blocker: human has to receive SMS on a real phone (Hunter is doing this)
- On success → header CTA wiring → Stage C planning

---

## Next tasks (in priority order)

### 1. Header "Get a Quote" → `/quote` (trivial)
- Currently points to `/contact` per `src/lib/constants.ts`
- One-line change, plus any nav data exports
- Verify all 25+ "Let's Get Started" buttons on service pages also route to `/quote`

### 2. Admin sidebar UX
- Verify `/admin/quotes` route renders for an authenticated admin
- Sidebar link landed in Prospecting group between Pipeline and Demos

### 3. Stage C starts — planning discussion required before building
- **Inbound SMS guardrails** (biggest non-commitment risk surface per the review)
- **Live handoff** (hot signal detection + team ping + 60s window state machine)
- **Multi-touch cadence** Day 1/3/7/14/30/45 — **BLOCKED on A2P 10DLC Marketing campaign registration**
- **"Name Your Price" bid system** with counter-offer history
- **OAuth + full Restaurant Rule invoicing**
- **Admin estimate builder + post-call revision + SOW auto-generation**

### 4. Post-launch monitoring (first 5 real prospects)
- Daily cost report cron (already have the fn, not yet scheduled)
- Review flagged messages in `quote_messages` for scanner tuning
- Check `quote_events.output_scan_rejected` count — regenerations = signal that
  the system prompt needs refinement

---

## Recent tasks (reverse chronological)

### 2026-04-17 — Stage B: prospect-facing flow ✅ SHIPPED
Commit `abcbd10`. Deployed to https://dsig.demandsignals.dev/quote.
- All API routes, pages, admin pages, Twilio wiring, shareable URL
- Live-verified end-to-end in preview: session → discovery → ROI ($72K/yr math) → recommended build (5 items, $2,580-$5,840 for a Folsom plumber scenario)
- Rate-limited session creation at 10/IP/day
- TypeScript clean, RLS 25/25, scanner 38/38

### 2026-04-17 — Stage A: foundation ✅ SHIPPED
- 7 Supabase tables + 4 functions + RLS + 25 policy tests
- 48-item pricing catalog with Zod validation, DAG cycle check
- Phone encryption (AES-GCM), cost controls, output scanner, eval harness, runbook
- Env vars set: `QUOTE_PHONE_ENCRYPTION_KEY`, `QUOTE_PHONE_HASH_PEPPER`, `ANTHROPIC_API_KEY`

### 2026-04-16 — Full-scope plan rewrite (Section 10)
- Dropped time estimates (Hunter's velocity is unpredictable with Claude Code)
- Reframed as stages A→B→C→D with sequenced dependencies rather than cut-features
- Retained bid system, follow-up cadence, live handoff, OAuth, invoicing — no Phase 2 graveyard

### 2026-04-15 — Deep critical review of quote estimator spec
- 11-section review catching what the self-audit missed
- Real issues flagged: RLS gaps, phone encryption claim with no key source, "Accuracy %"
  contradicting non-binding, Day 45 bid undermining value, inbound SMS ungated, `quote_events`
  vs `selected_items` source-of-truth ambiguity, timeline calculator needing `dependsOn` not
  just `parallelGroup`

### 2026-04-14 — Monthly LLM Rankings backfill (Jan-Apr 2026)
- Blog posts generated from OpenRouter data
- Commit `ef32848`
- Unrelated to quote work

---

## What has worked (durable lessons)

1. **Split Supabase migrations into per-table files.** The Supabase SQL Editor has
   a parser that mishandles dollar-quoted function bodies, multi-row INSERTs,
   and long files. Fix: one statement-type per file, run via "select all + Run"
   in Supabase SQL Editor. Don't paste 500-line migrations.

2. **Named dollar quotes (`$func_name$ ... $func_name$`) survive editor parsing**
   where `$$ ... $$` does not.

3. **Event sourcing for configurator state.** `quote_events` is truth, `selected_items`
   is a derived cache rebuilt by `recompute_session_state()`. Eliminates admin-vs-prospect
   drift.

4. **Eval harness catches real bugs.** The 38-case scanner eval caught a
   missing rule ("locked in the rate") on first run. Never ship prompt changes
   without re-running evals.

5. **App-layer AES-GCM > pgsodium for this project.** Matches existing DSIG
   env-var pattern, clean key rotation via `QUOTE_PHONE_ENCRYPTION_KEY_PREV`.

6. **Dynamic import in .mjs scripts** (`const mod = await import('./foo.ts')`) works
   around tsx's confusion with top-level imports from TS files.

7. **Service-role API routes + session_token header auth** is safer than exposing
   tables to anon with RLS policies. Anon gets ZERO direct table access.

8. **Testing pattern:** `scripts/test-quote-rls.mjs` seeds a row via service role,
   asserts every anon operation fails, tears down. Reusable for future tables.

---

## What has failed (durable lessons — do NOT repeat)

1. **DO NOT commit phone numbers or secrets to git.** `.env.local` is gitignored;
   everything sensitive lives in Vercel env vars. Double-check `git status` before
   every commit.

2. **DO NOT paste huge migrations into Supabase SQL Editor.** See #1 in "what worked."

3. **DO NOT use `REVOKE FROM anon` alone for `SECURITY DEFINER` functions.**
   Postgres grants EXECUTE to PUBLIC by default. Need:
   `REVOKE EXECUTE FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO service_role;`
   The RLS test caught 2 leaks because of this.

4. **DO NOT trust the AI's word that it did something.** Verify in DB via
   `scripts/check-session-state.mjs`. Trust but verify.

5. **DO NOT add `'use client'` to `ServicePageTemplate`** or similar server components
   that import `blog.ts` (uses `fs`). Extract animated bits to separate client components.

6. **DO NOT put favicon.ico in `src/app/`.** Next.js App Router's auto-route shadows
   the public/ favicon. Public/ only.

7. **DO NOT use vague tools (`$$`) for Postgres function bodies when the editor
   has parsing issues.** Use named dollar quotes.

8. **DO NOT estimate timelines in days for Hunter's work.** Velocity with Claude
   Code is unpredictable — focus on sequencing and dependencies, not duration.

9. **DO NOT "defer to Phase 2" as a euphemism for "drop."** Hunter explicitly
   called this out — previous Opus sessions have done this and it gutted specs.
   Ship in smaller stages, not fewer features.

10. **DO NOT refactor/cleanup unrelated code during a feature commit.** Keeping the
    diff focused makes review and rollback surgical. Stale files in the repo
    (e.g., `public/Untitled-1-07.jpg`, `docs/videos/`) are not ours to touch.

---

## Environment state

**Vercel env vars (all set):**
- `ANTHROPIC_API_KEY` (existing)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (existing)
- `QUOTE_PHONE_ENCRYPTION_KEY` (32-byte hex, set 2026-04-16)
- `QUOTE_PHONE_HASH_PEPPER` (arbitrary random, set 2026-04-16)
- `TWILIO_ACCOUNT_SID` (set 2026-04-17)
- `TWILIO_AUTH_TOKEN` (set 2026-04-17)
- `TWILIO_VERIFY_SERVICE_SID` = `VAcacb2e174a73a26ac4d870ab155f53a2` (service name "Demand Signals Quote", Fraud Guard on)
- `TWILIO_DSIG_866_NUMBER` (saved for Stage C outbound cadence)
- `TWILIO_DSIG_PLATFORM_SID`, `TWILIO_DSIG_PLATFORM_SECRET` (API key pair, Hunter-provided for automation tooling)

**Local `.env.local` state:**
- Has everything EXCEPT `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `QUOTE_PHONE_ENCRYPTION_KEY`, `QUOTE_PHONE_HASH_PEPPER`, `TWILIO_DSIG_*` — intentional, Hunter avoids local OAuth/Twilio testing
- Consequence: `/quote` works locally for everything EXCEPT phone verify and encrypted phone storage. Test that flow against Vercel.

**Supabase state:**
- 7 tables live, 25/25 RLS tests pass, 6 config rows seeded
- `ai_enabled=true`, `cadence_enabled=false` (A2P pending)
- `catalog_version=2026.04.16-1`
- Invoice sequence reset to 1 after the RLS test leaked one DSIG-2026-0001 (since fixed)

**External services:**
- Anthropic API: Sonnet 4.6 default, Opus 4.7 upgrade trigger wired (>15 msgs OR >$10K OR confusion)
- Twilio Verify: service created, tested Anthropic→our wrapper round-trip in code, awaiting real-phone confirmation
- Twilio 10DLC: **UNREGISTERED** — all outbound SMS from our 800#/866# blocked until registered. Verify service works around this (uses Twilio short codes upstream).

---

## Open questions / decisions deferred

1. **A2P 10DLC registration** — Hunter needs to submit Marketing use case before Stage C cadence SMS. Unknown timeline. Does not block Stage B.
2. **VAPI integration surface** — Hunter has VAPI.ai wired up for a test app. Potential future integrations: voice handoff fallback, Day 14+ outbound calls, pre-call confirmations. Not in any stage plan yet.
3. **Social proof library content** — 10-15 real or clearly-anonymized client results. None seeded yet. Avoid fabricating.
4. **OAuth Checkpoint 2** — design says Google OAuth for "save estimate to account" flow. Not built. Stage C.
5. **Admin quote detail: "Join Chat" button** — not built. Requires Supabase realtime subscriptions or polling. Stage C.
6. **POST-LAUNCH: tighten `maxSessionsPerIpPerDay`** — currently 25 (for testing/household tolerance). Hunter's directive: reduce to 3-5 once real traffic patterns are observed. File: `src/lib/quote-ai-budget.ts`, HARD_LIMITS.

---

## Session hand-off protocol

If a future session picks this up, read in this order:
1. **CLAUDE.md** — stable project conventions
2. **This file (MEMORY.md)** — current state + recent decisions
3. **[docs/runbooks/quote-estimator.md](docs/runbooks/quote-estimator.md)** — operational playbook
4. **[docs/superpowers/specs/2026-04-15-quote-estimator-design.md](docs/superpowers/specs/2026-04-15-quote-estimator-design.md)** — original design spec
5. **`git log abcbd10 -1`** — the Stage A+B commit message
6. **Supabase `quote_config` table** — live flags / kill switch state

Then verify system is green:
```bash
node scripts/test-quote-rls.mjs       # expect 25/25
npx tsx scripts/check-catalog.mjs     # expect all validations pass
npx tsx tests/quote-ai-evals.mjs      # expect 38/38
npx tsc --noEmit                      # expect no output
```

Before making any production change, confirm with Hunter. Before running any destructive SQL, show the query and ask first. When in doubt, read the runbook.

---

## Things Hunter has explicitly said

- "I do not agree with all of your cuts to phase 2, by the time we get to phase 2 in projects you tend to forget all about it an under deliver the scope of the project." — STAGE BOUNDARIES SHIPPED WITHOUT DROPPING FEATURES.
- "I dont pause, I work." — velocity over ceremony.
- "Our job is velocity not 6 months durations." — 45-60 day bid window is intentional, not negotiable.
- "[Don't]... pretend the 10DLC warning doesn't apply" — acknowledge blockers honestly.
- Working hours: nights, often 2am. Design for that reader.
