# Invoicing Phase 4 — Services Catalog + Value Stack Activation

**Written:** 2026-04-18 afternoon
**Builds on:** `invoicing-morning-2026-04-18.md` (Phases 1-3 already live in prod)

## What shipped in this build

- **DB-backed services catalog** (table `services_catalog` — replaces TS-only CATALOG as source of truth)
- **Admin services UI** at `/admin/services` — full CRUD, value-stack toggle per item, soft-delete
- **Catalog picker** in `/admin/invoices/new` + `/admin/sow/new` — type-ahead search, "+ Add new to catalog" quick-add
- **"New Client Appreciation" value stack** — auto-populates on SOW accept, optional toggle on invoice builder
- **Courtesy dropdown** — replaces single "Restaurant Rule" button with 3-option pick (defaulting to Site & Social Audit as the diagnostic)
- **Pricing philosophy shift** — nothing is "free"; everything has real $ price, gifted items appear as 100% discount lines

## Your activation checklist (~5 minutes)

### Step 1 — Apply migration 014 (~2 minutes)

1. Supabase SQL Editor → New query
2. Paste the **entire contents** of `supabase/migrations/APPLY-014-2026-04-18.sql`
3. Click **Run**
4. Expect: "Success. No rows returned."

Verification queries (run each individually):

```sql
-- 1. Table exists with all 48 rows seeded
SELECT COUNT(*) FROM services_catalog;
-- Expect: 48

-- 2. Value stack items flagged
SELECT id, name, display_price_cents, included_with_paid_project
  FROM services_catalog
  WHERE included_with_paid_project = true
  ORDER BY display_price_cents DESC;
-- Expect: 3 rows
--   project-plan          175000  (Comprehensive Project Plan, $1,750)
--   market-research        75000  (Market Research Report, $750)
--   competitor-analysis    75000  (Competitor Analysis, $750)

-- 3. Site/Social Audit standalone price
SELECT id, display_price_cents FROM services_catalog WHERE id = 'site-social-audit';
-- Expect: 95000 ($950) — courtesy gift for unsigned prospects

-- 4. All categories populated
SELECT category, COUNT(*) FROM services_catalog GROUP BY category ORDER BY category;
-- Expect ~10 categories with 48 rows total
```

### Step 2 — Push + deploy (~2 minutes)

```bash
cd D:/CLAUDE/demandsignals-next
git log --oneline origin/master..HEAD   # see all new commits
git push origin master
```

Vercel auto-deploys. ~2-3 min build. Watch for green check.

### Step 3 — Smoke test (~5 minutes)

**Test 1: Services catalog UI**
1. https://demandsignals.co/admin/services
2. See 48 services grouped by category
3. Value-stack items (Market Research, Competitor Analysis, Project Plan) are emerald-highlighted
4. Click Edit on any item → modal appears with all fields
5. Click "New Service" → quick-add modal with required fields
6. (Don't actually create anything unless you want to — cancel out)

**Test 2: Invoice builder with catalog picker + value stack**
1. https://demandsignals.co/admin/invoices/new
2. Kind: "Business"
3. See the new emerald "Include paid-project value stack" toggle (preview of $3,250)
4. In the line items section, type in the search: `react` — see "React/Next.js Website" results
5. Click it → row auto-adds with name + display price
6. Check the value-stack toggle
7. Click **Save as draft** to test without sending
8. On the invoice detail page, confirm line items include the 3 value-stack items + the -$3,250 discount line
9. Subtotal should show the full perceived value; total should show deposit-only amount

**Test 3: Courtesy dropdown on quote page**
1. Find a quote session with phone_verified + email + linked prospect
2. Open `/admin/quotes/[id]`
3. Click the "🎁 Send Courtesy ▸" button (replaces old Restaurant Rule button)
4. Dropdown shows 3 options — Site & Social Audit (default, diagnostic), Market Research, Competitor Analysis
5. Pick one → redirects to auto-generated $0 courtesy invoice with that ONE item + 100% discount
6. Verify the line items on the invoice detail show the chosen item at full price + "New Client Appreciation — complimentary courtesy analysis" discount

**Test 4: SOW accept auto-stack (the big psychology test)**
1. Create a test SOW at `/admin/sow/new` with total $6,000, deposit 25%
2. Save & Send → copy public URL
3. Open in incognito → review proposal
4. Click Accept & Pay Deposit ($1,500.00)
5. Type test signature → Accept
6. Redirected to deposit invoice
7. **Verify the invoice shows:**
   - Deposit line: $1,500
   - Market Research: $750
   - Competitor Analysis: $750
   - Comprehensive Project Plan: $1,750
   - New Client Appreciation: −$3,250
   - Total due: $1,500
8. This is the 3.17× perceived value moment — prospects see they're getting more value than they're paying

## What changed under the hood

- `isFree: true` is deprecated (still accepted for back-compat but no UI treats anything as "free" anymore)
- `displayPriceCents` is now the authoritative price for invoice/SOW display
- Catalog picker can create new services inline (saves to DB, immediately available for reuse)
- Soft-deleted catalog items (`active=false`) preserve historical references on past invoices

## Rollback

Catalog changes are additive — no schema rollback needed. If a pricing update bites:

```sql
-- Revert the value-stack price edits in the last UPDATE block of APPLY-014
UPDATE services_catalog SET display_price_cents = 50000 WHERE id = 'market-research';
UPDATE services_catalog SET display_price_cents = 50000 WHERE id = 'competitor-analysis';
UPDATE services_catalog SET display_price_cents = 75000 WHERE id = 'site-social-audit';
-- project-plan back to midpoint:
UPDATE services_catalog SET display_price_cents = 100000 WHERE id = 'project-plan';
```

To turn off value-stack behavior entirely:

```sql
UPDATE services_catalog SET included_with_paid_project = false
  WHERE included_with_paid_project = true;
```

SOW accept flow will still work — it'll just skip the value stack injection if zero items are flagged.

## What's still deferred (from prior runbook)

- **SMS delivery** — awaits A2P Transactional OR `SMS_TEST_MODE` toggle
- **Email delivery** — awaits Gmail SMTP app password
- **Subscription cycle cron** — awaits plans + subscriptions created first
- **Social media proposal restructure** — separate future session (see MEMORY.md note)

## What to do NEXT session

1. **Social media / GBP / reviews proposal restructure** — Hunter flagged closing-rate issues with post-project social proposals. Two proven patterns to try:
   - Pre-paid bundle at SOW signing (normalizes monthly during highest-commitment moment)
   - Middle-of-project upsell (weeks 4-6, during momentum peak)
2. **Add all remaining services to catalog** — Hunter only has budgetary estimates for websites currently; SEO, LLM optimization, GEO-targeting, AI agents, etc. need to be added
3. **A2P 10DLC resubmission** — separate focused session with A2P campaign spec
