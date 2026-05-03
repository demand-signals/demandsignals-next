# Handoff — Morning of 2026-05-05

**Session date:** 2026-05-04
**Operator:** Hunter
**Theme:** Invoice/SOW polish + international client support, then back to revenue work
**Mood at end of session:** good — strong arc of fixes shipped, clean parking-lot for what's deferred

---

## What you need to do FIRST when you sit down

### 1. Apply migration 046 in Supabase (~30 seconds)

Paste the contents of `supabase/migrations/APPLY-046-2026-05-04.sql` into the Supabase web SQL Editor and click Run.

What it does:
- Adds `prospects.country` (ISO 3166-1 alpha-2, NOT NULL DEFAULT 'US')
- Drops the `prospects.state DEFAULT 'CA'` so non-California rows don't auto-tag CA

The file ends with a verification SELECT that confirms:
- `country | text | 'US'::text default | NOT NULL`
- `state | text | NULL default`

If you see those two rows, you're done.

**Until you apply this, the country picker on prospect forms WILL crash** with "column country does not exist" the first time anyone tries to save a prospect address.

### 2. Verify Vercel deploy is green

`https://vercel.com/demand-signals/demandsignals-next` — most-recent commit should be `1bbab10` ("Tier 1 international client support"). Check that the deploy succeeded before doing any UI work today.

---

## What shipped this session (12 commits)

In order:

| Commit | What |
|---|---|
| `3dc9596` | Schedule-send: time-precise scheduling on invoices + SOWs (Schedule button in top action bar, modal, cron handling) |
| `d7206f5` | TIK trade-payment receipts (auto-mint RCT, email + SMS dispatch, branded PDF with TIK ledger card) + Mobile Mechanic Dan reconciliation |
| `8074534` | Scheduled column on invoice + SOW admin lists |
| `809e12c` | Subscription clarity on magic-link page + auto regen-before-send + edit existing scheduled events |
| `cc17260` | Searchable prospect picker (typeahead) replaces native dropdowns on 4 admin forms |
| `f747a8e` | (later reverted in 6a07558) — initial cascade-delete attempt |
| `6a07558` | Course-correct: accepted SOWs are append-only. DELETE only allowed for draft/sent/viewed. Hunter caught the design flaw. |
| `a282c79` | Inline-edit titles on project + TIK pages (kill name drift) + deferred SOW lockdown spec |
| `1bbab10` | Tier 1 international: prospects.country column + non-US display on PDF + magic-link |

Everything is live on Vercel except the Supabase migration (waiting on step 1 above).

---

## Hunter's stated priorities for THIS week

From the 2026-05-04 conversation:

1. **DOCK platform refactor** — big project, eyes on it this week
2. **SMMA Code build** — big project this week
3. **Hangtown (HANG) social media proposal** — new SOW to issue
4. **General SOW issuance day** — "tomorrow is getting new SOWs out the door"

The work this session was housekeeping that unblocks the SOW issuance. Now the system is set up so:
- International clients have countries
- Schedule-send works for both invoice + SOW with time precision
- Drafts can be Edit-mode in the schedule modal (you can change a queued send)
- Project + TIK titles are live-editable so renaming after acceptance just works
- TIK trade payments mint receipts that go to the client automatically

---

## Open work (deferred, indexed, with triggers)

### From this session — both DEFERRED specs in-tree

**`docs/superpowers/specs/2026-05-04-sow-lockdown-deferred.md`** — Lock down accepted SOWs (read-only edit page, hide from default lists, change-order flow via `parent_sow_id`). Premature at 1-operator scale. **Trigger to revisit:** second team member onboarded OR you catch yourself confused about which doc to edit.

**`docs/superpowers/specs/2026-05-04-international-clients-tiers.md`** — Tier 2 (`address_line_2` column, locale labels for UK/CA/MX/AU, state/region pickers) and Tier 3 (multi-currency, VAT/GST/RFC tax numbers, locale-aware dates). **Trigger:** Tier 2 when a client gives an apt-number address that won't fit on one line. Tier 3 when the first international client asks to be invoiced in their local currency.

### Pre-existing open work (from CLAUDE.md §11, untouched this session)

High priority — CRM / Agency OS:
- Demo Factory (Module 2) — auto-generate demo sites
- Outreach Engine (Module 3) — email/SMS/voice via Resend/Twilio/Vapi
- Manual EST admin form (standalone admin-created budgetary estimate not from /quote)
- Project expense tracking (`project_expenses` table)
- Project time tracking (`project_time_entries` table)
- Scheduled rating sync for clients (weekly/daily cron re-running research on `is_client=true`)
- Public `/book` page (foundation laid in §23, just needs UI)

High priority — Site:
- 301 redirects from PHP site (SEO continuity post-cutover)
- Section Theater rollout to remaining 22 service pages
- Google Search Console verification (DNS TXT record in Cloudflare)

Medium:
- OG image (`/og-image.png` is placeholder)
- Portfolio page real case studies
- Mobile menu UX upgrade

---

## Mobile Mechanic Dan (MOME) status — for reference

Reconciled on 2026-05-03 via `scripts/reconcile-mome-invoices.mjs`. Final state:
- INV-MOME-042726A — paid $250 ✓ (Installment 1, original)
- INV-MOME-042726B — voided, superseded by 050226B (the duplicate)
- INV-MOME-050226B — paid $250 ✓ (now correctly labeled as Installment 2 cash)
- Two unsent $20 PHP Hosting drafts (INV-MOME-050126A, 050226A) intentionally kept — Hunter's plan: schedule them to fire 30 days from today's payment.
- TIK ledger: $1,275 outstanding (Mechanic Services — Dan hasn't delivered any yet)

---

## State of the codebase

- D:\dev synced to master at `1bbab10`. Working tree clean.
- Y:\DSIG\demandsignals-next has uncommitted edits to `MEMORY.md` and `.claude/settings.local.json` — these are pre-existing, intentionally excluded from commits, will resolve themselves when Hunter's next session loads. Per his note 2026-05-03: "MEMORY.md on Y has changes made after your first load, not a issue as you will catch it on a new session."
- All migrations through 045 are applied. 046 is the only pending one.
- 12 commits ahead of where the 2026-05-04 session began.

---

## Architectural decisions made this session

**1. Accepted SOWs are append-only.** The system materializes deposit invoices, projects, payment plans, Stripe subscriptions, TIK ledgers, and R2 PDFs at acceptance. Cascading-delete those is destructive (Stripe state can't be unilaterally undone). DELETE route now refuses non-draft/sent/viewed status.

**2. Drift is OK between SOW and project.** The SOW's stored `title` is the historical contract name. The project's `name` is the live working name. They can diverge — that's the point. Inline-edit on the project page lets admins keep the live name accurate without touching the SOW.

**3. Currency stays USD only for now.** International clients pay USD via Stripe; FX is on their side. Tier 3 multi-currency work is real — has bug surface area in invoice/SOW/receipt templates, payment-summary calcs, and analytics rollups. Don't ship it speculatively; wait for the first client request.

**4. Path A on SOW lockdown (deferred).** When the time comes, lock SOW edit fields post-acceptance + use existing `parent_sow_id` (migration 025b) for change orders. Path B (live two-way sync from SOW edits to project state) is rejected — silent rewrite of execution state is a footgun.

---

## What I'd do if I were Hunter Tuesday morning

1. **Apply migration 046** (30 seconds, see top of doc).
2. **Verify the Vercel deploy is green** — open the prospect edit modal on any prospect, confirm the Country dropdown appears.
3. **Ship the Hangtown social SOW.** That's the proximal revenue lever.
4. **DOCK + SMMA refactors** — these are the big-project days, block out the calendar.
5. Don't get pulled into more polish work on the invoicing/SOW system. It's good enough. Ship deals.

If a real friction point comes up while issuing SOWs today, file it as a ticket — don't fix it inline. The deferred specs in `docs/superpowers/specs/` are the right pattern for that.

— end of handoff
