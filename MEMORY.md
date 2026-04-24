# DSIG Next.js — Working Memory

> **Read this before touching code.** This file tracks *what's happening now* —
> recent tasks, current task, next tasks, what works, what has failed, and
> what NOT to do. CLAUDE.md is the stable spec; MEMORY.md is the moving state.
>
> **Update this file at the end of every work session.** Keep it tight —
> recent 5 tasks back, current, next 3-5 ahead. Prune anything older than 30 days
> unless it's a durable lesson ("don't do X, it broke Y").

**Last updated:** 2026-04-23 (platform-wide document numbering shipped)

---

## Document numbering (locked-in 2026-04-23)

Platform-wide: `TYPE-CLIENT-MMDDYY{A|B|C...}`. TYPE = EST/SOW/INV/RCT. CLIENT = 4-letter code on `prospects.client_code`. Suffix is sequential letter per (type, client, date). Allocated via `allocateDocNumber()` helper → `allocate_document_number()` RPC (atomic). Legacy numbers preserved. See CLAUDE.md §20.

---

## 🎉 SHIPPED TODAY (2026-04-21)

Three commits deployed non-stop after Hunter's "stop talking me out of things" reset:

1. **`19b3f28`** — `/quote` migrated to DB-backed catalog via sync bridge
   + 5 missing site services seeded (wordpress-development, vibe-coded,
   demand-gen-systems, ai-content-generation, gbp-management).
   Catalog now aligned with site offerings. `/quote` still 200 in prod.
   Admin edits at `/admin/services` flow through to `/quote` within seconds.

2. **`cb3c726`** — Bulk CSV/JSON importer at `/admin/services`.
   POST `/api/admin/services-catalog/bulk-import`, max 500 rows, UPSERT
   on id, per-row validation + status reporting. UI with CSV and JSON
   tabs, "Load example" button, result screen with stat cards.

3. **`da239ff`** — `/admin/settings` page — kill-switch flags +
   env-var readiness grid. Flip flags without SQL Editor. Readiness
   booleans surface whether Stripe/Twilio/SMTP/PDF/R2 are wired.
   New `/api/admin/config` endpoint (GET returns flags + env booleans,
   PATCH upserts a flag value).

### Migrations applied today

- **`015a_services_catalog_site_alignment.sql`** (Hunter pasted 2026-04-21) —
  5 new services seeded. `SELECT COUNT(*) FROM services_catalog` = 53.

### Architectural shift worth noting

`/quote` engine stays sync. Sync → DB bridging solved by module-scoped
snapshot in `src/lib/services-catalog-sync.ts`. Callers that are already
async (prices route, executeTool, syncProspectFromSession, /quote/s/
shared page) call `hydrateCatalogSnapshot()` once on entry to warm the
snapshot, then the sync `getServiceSync(id)` works for all downstream
calls. Cold-start safety: falls back to legacy TS CATALOG if DB fetch
fails — zero regression risk.

---

## 🎉 Previous — 2026-04-18 catalog alignment + value stack

**Phase 4 activation runbook:** [`docs/runbooks/invoicing-phase4-activation.md`](docs/runbooks/invoicing-phase4-activation.md)

### What's live in production (deployed earlier today)

All of Phases 1-3 is live: migrations applied, Stripe webhook endpoint working,
admin invoice creation, SOW with accept+deposit flow, subscriptions scaffolding,
public viewer pages, branded PDFs via pdf.demandsignals.co.

### What's ready to deploy (Phase 4 — 14 new commits since prod)

DB-backed services catalog that becomes the SINGLE SOURCE OF TRUTH for:
  - Quote estimator line items (via /quote)
  - Admin invoice line items (via /admin/invoices/new)
  - SOW deliverables (via /admin/sow/new)
  - "New Client Appreciation" value stack on paid-project deposits
  - Courtesy/Restaurant Rule flow on /admin/quotes/[id]

### Activation (5 minutes — Hunter's step)

1. Paste APPLY-014-2026-04-18.sql in Supabase SQL Editor
2. `git push origin master`
3. Verify at /admin/services (48 services, 3 in value stack)
4. Smoke test SOW accept → deposit invoice shows value stack

### Pricing philosophy (LOCKED IN)

**Nothing is "free".** Everything has a real $ price. Gifted items appear as
100% "New Client Appreciation" discount lines on the invoice — real dollar
values on a real PDF create proof, not promise.

**Value stack (auto-added on SOW accept):**
- Market Research Report: $750
- Competitor Analysis: $750
- Comprehensive Project Plan: $1,750
- **Total: $3,250** shown as "New Client Appreciation — included with your engagement"

On a $6k project ($1,500 deposit), the deposit invoice reads:
  Deposit $1,500 + MR $750 + CA $750 + PP $1,750 − Appreciation $3,250 = **$1,500 due**
  → 3.17× perceived value ratio at the moment of signing.

**Courtesy (gift-before-ask, for unsigned prospects):** ONE of:
- Site & Social Audit: $950 (default — diagnostic, closes hardest)
- Market Research: $750
- Competitor Analysis: $750

### Architectural shifts in Phase 4

- `services_catalog` table is canonical; TS `CATALOG` in quote-pricing.ts still
  exists but is advisory (kept around for back-compat with /quote flow that
  hasn't been migrated yet — next session's work)
- `isFree: true` is deprecated everywhere; `included_with_paid_project: true`
  replaces it semantically
- Catalog picker in invoice/SOW forms can `+ Add new to catalog` inline → new
  service persists to DB, immediately available across all flows

---

## 🔖 Note for future session — social media proposal timing

Hunter observed that post-project social media / GBP / review-response
proposals aren't closing well. Project exhaustion at the delivery moment =
worst psychological time to upsell. Two patterns to explore next session:

1. **Pre-paid bundle at SOW signing:** "Your project includes 90 days
   post-launch of GBP + social + review management at no additional charge.
   Month 4 onward, these continue at $X/mo. You can cancel any time but most
   clients keep going." Normalizes the monthly during highest-commitment moment.

2. **Middle-of-project upsell (weeks 4-6):** When momentum is visible and
   they're feeling progress, propose social/GBP/reviews then — not at delivery.

Not in scope for current build. Flagging for when prospecting feedback shows
this is hurting close rates.

---

## 🎉 Original INVOICING v2 OVERNIGHT BUILD

**Morning activation runbook:** [`docs/runbooks/invoicing-morning-2026-04-18.md`](docs/runbooks/invoicing-morning-2026-04-18.md)

**What's done:**
- 15 Supabase migrations written (single combined paste-ready file)
- 30+ new API routes (admin + public + Stripe webhook + cron)
- 10 admin UI pages (invoices list/new/detail, subscriptions, plans, SOW list/new/detail)
- 2 public viewer pages (invoice with Pay button, SOW with Accept button + deposit flow)
- Stripe integration (Payment Links, webhooks with idempotency via stripe_events UNIQUE)
- Subscriptions (plans catalog owned by DSIG, cycle invoice cron, auto-billing via Stripe)
- SOW PDF doc_type live in dsig-pdf-service (already deployed, commit e354836)
- Twilio SMS with test-allowlist gate (awaits A2P Transactional approval for production)
- Nodemailer email with BCC audit (awaits SMTP_PASS env var)
- Sidebar Finance group + quote/prospect page integrations
- Next.js build passes, TypeScript clean

**What's NOT done (intentional, needs Hunter in morning ~15 min):**
- Apply the 15 migrations (paste APPLY-ALL-2026-04-18.sql into Supabase SQL Editor)
- Add STRIPE_WEBHOOK_SECRET + STRIPE_PUBLISHABLE_KEY to Vercel
- Flip `stripe_enabled` config flag to true
- `git push origin master` to deploy

**What's deferred (works today via kill switches; flip when ready):**
- SMS delivery (set SMS_TEST_MODE + SMS_TEST_ALLOWLIST; flip sms_delivery_enabled)
- Email delivery (add SMTP_PASS; flip email_delivery_enabled)
- Subscription cycle cron (create plans + subscriptions first; flip subscription_cycle_cron_enabled + add vercel.json cron entry)

**Commits to push** (from local master, not yet on origin):
```
0765885 feat(admin): sidebar Finance group + quote/prospect integrations
<several more since your checkpoint>
9d2a9d7 docs(memory): checkpoint — Plans 1+2 complete, Plan 3 scope expansion needed
```

Run `git log --oneline 9d2a9d7..HEAD` to see the overnight commits.

---

## Where we are (end of 2026-04-18 late-night session)

### ✅ Plan 1 complete — R2 storage library
Working directory: `D:/CLAUDE/demandsignals-next`
4 commits on master (after history rewrite):
- `703897f` feat(r2): add @aws-sdk/client-s3 for R2 storage integration
- `f18b74a` feat(r2): add src/lib/r2-storage.ts wrapper
- `62ecadf` fix(r2): resolve public URL before upload (orphan prevention)
- `31d0efa` test(r2): add scripts/test-r2-storage.mjs smoke test

**Verified live:** 9/9 R2 integration tests passing against real buckets.
Public bucket at `https://assets.demandsignals.co`. Private bucket with
signed URLs working. Hunter added a blog post (`abe5719`) on top — unrelated.

### ✅ Plan 2 complete — dsig-pdf-service deployed to production
Working directory: `D:/CLAUDE/dsig-pdf-service` (separate repo)
12 commits on main, all pushed to GitHub:
- `579f3ac` chore: initialize repo
- `f0e5999` feat(standards): port DSIG_PDF_STANDARDS_v2
- `3bee37e` feat(layout): page templates + painters
- `003ad65` feat(typography): ParagraphStyles
- `2d46089` feat(tables): MT/P/PH/bts helpers
- `a39fa72` feat(components): ODiv/GradientBar/Callout/PaidStamp/VoidStamp
- `2336a02` feat(quotes): famous-quote library + seeded picker
- `6a828ae` feat(covers): FrontCover + BackCover
- `89bbe71` feat(invoice): first doc type (3-page branded invoice)
- `3cc6b12` feat(api): POST /api/render
- `8134eb4` fix(vercel): versioned @vercel/python runtime (deploy fix)
- `45d0075` chore(ci): GitHub Actions pytest workflow

**Verified live:**
- `POST https://pdf.demandsignals.co/api/render` with valid bearer → HTTP 200, 8KB PDF
- Wrong token → HTTP 401
- Rendered PDF: 3 pages, contains `DSIG-2026-0007`, valid `%PDF-1.4` header
- 24/24 local pytest tests passing
- GitHub Actions CI workflow added (status uncheckd but yaml is standard)

### 🔨 Plan 3 — NOT STARTED (tomorrow's work, with expanded scope)
File: `docs/superpowers/plans/2026-04-18-invoicing-feature.md` (26 tasks)
Original scope: quote-driven invoicing only.
**New scope for tomorrow:** add Stripe + subscriptions + general business
invoices. See "Tomorrow's kickoff" below.

---

## Tomorrow's kickoff (read this first thing)

**Opening ask to Opus:** "Resume Stage C invoicing. Read MEMORY.md. We
canceled Bonsai. Scope expanded: Stripe + subscriptions + general business
invoicing in addition to quote-driven invoices. Deadline April 20. Plan 3
needs rework before execution."

**Pre-read order:**
1. CLAUDE.md (unchanged — project conventions, §18 domain map, §19 R2 storage)
2. MEMORY.md (this file)
3. `docs/superpowers/specs/2026-04-18-invoicing-design.md` (original spec)
4. `docs/superpowers/plans/2026-04-18-invoicing-feature.md` (Plan 3 — needs expansion)
5. `git log master | head` (recent state) + `cd ../dsig-pdf-service && git log main | head`

**Green-state verification (should all pass on resume):**
```bash
cd D:/CLAUDE/demandsignals-next
node scripts/test-quote-rls.mjs       # expect 25/25
npx tsx scripts/check-catalog.mjs     # all pass
npx tsx tests/quote-ai-evals.mjs      # 38/38
node scripts/test-r2-storage.mjs      # 9/9 (R2 integration live)
npx tsc --noEmit                      # clean

cd D:/CLAUDE/dsig-pdf-service
pytest tests/ -q                      # 24/24
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://pdf.demandsignals.co/api/render
                                      # expect 401 (auth required = healthy)
```

### Scope expansion decisions needed tomorrow

Before writing code, we need to answer:

1. **Stripe integration model:**
   - Stripe Invoicing (Stripe-hosted pages, sends emails) vs
   - Stripe Payment Links (just a pay button, we host invoice) vs
   - Stripe Payment Elements (full custom checkout)?
   - My default proposal: **Payment Links + Stripe Customer Portal**
     for subscriptions. Keeps our PDF invoice as the canonical "receipt"
     document, Stripe handles the payment rail.

2. **Subscription schema:**
   - Add `subscriptions` table (customer, plan, status, Stripe sub ID,
     next billing date, cancellation reason, etc.)
   - Each subscription auto-generates an `invoice` row per billing cycle
     via webhook
   - Subscription PDF = same invoice doc_type (already live via dsig-pdf-service)

3. **General business invoice flow:**
   - Existing schema mostly supports it — `invoices` table doesn't require
     a linked `quote_session_id` (already nullable)
   - Admin UI needs a "Create invoice for client X" path that doesn't start
     from a quote session (Task 21's `/admin/invoices/new` already scaffolded for this)

4. **Migration order (revised from original Plan 3):**
   a. Stripe customer/subscription tables FIRST (need these referenced by invoices)
   b. Then original Plan 3 migrations 011a-011g + 012a + 013a
   c. Then additions: `stripe_customer_id` on prospects/clients, `stripe_invoice_id`
      on invoices, `subscription_id` on invoices

5. **Stripe env vars needed:**
   - `STRIPE_SECRET_KEY` (live + test)
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PUBLISHABLE_KEY` (for any client-side flows)
   - Hunter needs to create these in Stripe dashboard tomorrow before we code

6. **Webhook endpoint:** `/api/webhooks/stripe` — processes
   `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`,
   etc. Maps Stripe events → our `invoices` + `subscriptions` tables.

7. **A2P / SMTP still NOT BLOCKING** — invoices can deliver via Stripe's
   hosted pages (client gets email from Stripe with payment link) even
   without our SMTP working. That removes the Phase 2/3 delivery
   dependency from MVP.

### Realistic timeline for April 20 deadline

~36-48 hours of focused work. Doable if we:
- Merge Stripe + original Plan 3 into ONE plan with combined migrations
- Parallelize: I write code while Hunter sets up Stripe account + test mode
- Skip subscription portal UI v1 (Stripe's hosted Customer Portal is free
  and professional enough)
- Keep Phase 1 manual-routed delivery as fallback; rely on Stripe emails
  for payment notifications
- Defer: non-MVP items (SMS delivery, custom payment portal, complex
  cadence) to post-April-20

### What to do first tomorrow (suggested order)

1. Verify everything still green (commands above)
2. Have Hunter set up Stripe test mode account + 3 env vars
3. Brainstorm session: lock the Stripe integration model (option 1 vs 2 vs 3 above)
4. Rewrite `docs/superpowers/plans/2026-04-18-invoicing-feature.md` → expanded Plan 3
5. Execute expanded plan via subagent-driven-development
6. Smoke test against Stripe test mode: create customer → subscription → invoice
   → fake payment → webhook → PDF generated → all persisted correctly
7. Flip to Stripe live mode for April 20

---

## Architectural decisions locked (do not re-debate)

1. **Domain map** — `.co` for everything; `.dev` retired. See CLAUDE.md §18.
2. **File storage** — Cloudflare R2, two buckets (`dsig-assets-public` via
   `assets.demandsignals.co` + `dsig-docs-private` for signed-URL access).
   See CLAUDE.md §19. **R2 integration verified live (9/9 tests pass).**
3. **Invoice versioning** — mutable drafts; immutable once sent; edits require
   void + re-issue (new invoice number). QuickBooks-style audit trail.
4. **Invoice auth** — uuid-suffixed public URL `/invoice/[number]/[uuid]`.
5. **PDF generation** — `dsig-pdf-service` Python microservice at
   `pdf.demandsignals.co`. **LIVE AND VERIFIED.** Original spec said
   `@react-pdf/renderer` but we went with Python/reportlab for DSIG
   brand consistency across all doc types (proposals, SOWs, reports, etc.).
6. **Automation tiers** — 3-tier flag system (`auto_generated`, `auto_trigger`,
   `auto_sent`). Restaurant Rule = Tier 2 (auto-draft). Subscriptions = Tier 3
   (full auto-send after Stripe webhook).
7. **Catalog update (not migration)** — `src/lib/quote-pricing.ts` gets new
   `displayPriceCents` field per PricingItem. Bump `CATALOG_VERSION`.
8. **Python Flowable gotcha** — `Flowable.__init__` shadows class-level
   `width`/`height`. Always set in `__init__` after super-init. (Spec bug
   we fixed in Task 6.)
9. **Vercel Python runtime** — must use `@vercel/python@4.3.1` format,
   not `python3.11`. (Spec bug we fixed in Task 11.)

---

## Session's hand-off files

- Commits to Plan 1: `703897f`, `f18b74a`, `62ecadf`, `31d0efa` (main repo)
- Commits to Plan 2: `579f3ac` through `45d0075` (12 total, dsig-pdf-service repo)
- `docs/superpowers/specs/2026-04-18-invoicing-design.md` — original spec
- `docs/superpowers/plans/2026-04-18-r2-storage.md` — Plan 1 (complete)
- `docs/superpowers/plans/2026-04-18-dsig-pdf-service.md` — Plan 2 (complete)
- `docs/superpowers/plans/2026-04-18-invoicing-feature.md` — Plan 3 (pending, needs Stripe expansion)

Full Stage C plan: [docs/runbooks/stage-c-plan.md](docs/runbooks/stage-c-plan.md)

---

## What shipped since last MEMORY update (v1.2 → v1.13)

All deployed to https://dsig.demandsignals.dev.

| Version | Commit | What it ships |
|---|---|---|
| v1.2 | `4471b2a` | Voluntary phone gate + progressive item add + first-turn fix |
| v1.3 | `f89bf54` | **Research subagent** — Google Places + site scan + confirmation hook |
| v1.4 | `d73d47b` | Psychology overhaul + soft-save + walkaway flag |
| v1.5 | `c8b9b26` | **Auto-prospect** + progressive CRM enrichment (migration 007) |
| v1.6 | `28c1937` | Kill repetition loop + WordPress reframe + Claude-first + ROI recoverable |
| v1.7 | `300ef6d` | Human-call path on phone refusal + real-time walkaway email |
| v1.8 | `7c0822a` | Commitment-based budget + audience-matched name drops (migration 008) |
| v1.9 | `7cac6a3` | I/O rhythm matching + conversation history trimming + QR code |
| v1.10 | `3227cff` | Rate limit tune + friendly 429 + manifest 403 fix |
| v1.11 | `df4b15a` | **Sandler two-slot booking** + share page rebuild + resume flow (migration 009) |
| v1.12 | `7c65cb6` | Website-first + early unlock cue + team framing + contact-capture gate |
| v1.13 | `3e287b2` | **Agentic discovery** — observe-and-confirm + llms.txt + nav/services/cities |

### Required migrations (in order)
1. `005a_quote_tables.sql` through `005a7_quote_config.sql` — Stage A core tables
2. `005b1` through `005b4` — Stage A functions
3. `005c_quote_grants.sql` — Stage A grants
4. `006_research_findings.sql` — v1.3
5. `007_quote_prospect_sync.sql` — v1.5
6. `008_person_name_role.sql` — v1.8
7. `009_primary_slots.sql` — v1.11

All applied in production Supabase. Confirm by running:
```sql
SELECT key, value FROM quote_config ORDER BY key;
-- Expected 9 rows: ai_enabled, cadence_enabled, catalog_version,
--   daily_cost_cap_cents, fallback_slot, primary_slot_a, primary_slot_b,
--   session_cost_cap_cents, team_capacity
```

---

## What's LIVE and working well (don't break)

- Research subagent hits 95%+ confirmation rate on real businesses
- Sandler two-slot booking in Phase 7 CLOSE
- Prospect auto-creation in CRM on research confirmation
- Commitment-based budget escalator (base 40 msgs → up to 200 msgs when
  phone verified + email + 5+ items + ROI provided)
- Hot-walkaway email alerts fire to DemandSignals@gmail.com
- Share page with QR code + 4 CTAs + Resume-conversation flow
- Dynamic contact-capture gate before close (AI won't schedule without
  phone OR email OR soft-save card shown)
- Agentic discovery — site scan pulls nav, services, cities, phones,
  socials, sitemap count, llms.txt presence; prompt observes-and-confirms

## Known behaviors (not bugs, confirmed by testing)

- AI calls `trigger_handoff` but there's no real-time admin ping UI yet.
  Email alert fires; admin must check /admin/quotes manually. Stage C item 5.
- Phone verify works via Twilio Verify. Outbound SMS from our 866# is
  still A2P-10DLC-blocked (registration pending). Magic link after verify
  doesn't SMS — prospect sees URL in-UI only.
- Google Calendar "booking" is prompt-only: AI captures prospect's picked
  slot via trigger_handoff → email to Hunter → Hunter books manually.
  Stage C item 6 upgrades this.

## Known bugs / things to monitor

- `maxSessionsPerIpPerDay = 25` is TESTING-HIGH. Reduce to 3-5 post-launch.
  File: `src/lib/quote-ai-budget.ts` HARD_LIMITS. Flagged in code comment.
- AI occasionally still echoes "Hunter" name if prospect uses it — weak
  signal but worth watching transcripts.
- If research returns GBP but site scan fails, observations may mismatch
  with prompt's observe-and-confirm pattern. Graceful-fallback rule added
  in v1.13 prompt; needs real testing.

---

## Recent tasks (reverse chronological)

### 2026-04-18 — Stage C item 1 brainstorm: invoicing architecture
- 5-question deep-dive converged on design (no performative alternatives step)
- Decisions: R2 dual-bucket storage, uuid-suffix URL auth, void+re-issue versioning, Tier 2 automation for Restaurant Rule, `display_price_cents` catalog field, @react-pdf/renderer
- Domain architecture locked (CLAUDE.md §18): one apex (`.co`), `.dev` retired, `demos.*`/`staging.*`/`assets.*`/`preview.*` subdomain roles
- File storage architecture locked (CLAUDE.md §19): R2 buckets, path conventions, `src/lib/r2-storage.ts` helper
- Next: write spec → user review → writing-plans skill → implementation

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
7. **STAGE C: Google Calendar API booking** — v1.11 handles booking via Sandler two-specific-slots methodology in the conversation (AI says "Monday 10am or Tuesday 3pm?"), captures prospect's pick via `trigger_handoff`, and sends email alert to Hunter who books the slot manually. Stage C will replace the manual step with Google Calendar API writes: OAuth scope `calendar.events`, reuse existing `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, write to DemandSignals@gmail.com calendar. Optional Stage D: real-time availability check to only offer actually-free slots.
8. **STAGE C SPINE scope (pivoting to after v1.11)** — invoicing system (tables + admin UI + $0 research invoices), bid system + counter-offer UI, admin estimate builder at `/admin/quotes/new`, SOW auto-generation from accepted estimates, hot-handoff realtime polish, Calendar API (per #7). See design spec Sections 19, 21 for detail.

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
