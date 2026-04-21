# DSIG Retainer Bundling — Design Specification

**Date:** 2026-04-21
**Status:** Draft
**Route:** `/quote` (extended) + new `/admin/retainer-plans`, `/admin/retainer-menu`
**Problem:** Build projects close, but recurring retainers stall at handoff. Proposal doc arrives cold after launch, disconnected from build excitement.
**Solution:** Bundle retainer selection into `/quote` as a required step. One signature covers build + retainer. Launch becomes activation, not a second sale.

---

## 1. Overview

Today `/quote` produces a build SOW. Clients sign, build ships, then DSIG sends a second proposal for ongoing management. That second proposal fails to close.

This spec moves retainer selection into `/quote` as a mandatory step between build scope and SOW generation. Prospects choose one of three curated tiers (Essential / Growth / Full) or consciously decline with "Site-only." The resulting SOW contains both build line items and retainer line items under a single signature. At launch, the retainer activates automatically into the existing `subscriptions` system.

**Core principle:** The retainer sell is structural, not conversational. It cannot be skipped, but it can be declined. Declining is a deliberate act, not an omission.

**What this is NOT:**
- Not a hard bundle — "Site-only" remains a valid selection
- Not a replacement for the strategy call
- Not a pitch at handoff — the handoff pitch flow is deprecated
- Not an upsell pressure surface — AI chat contextualizes, doesn't push

---

## 2. Failure Mode This Fixes

- Build deals close on excitement and urgency
- Handoff happens weeks/months later, excitement has faded
- Separate retainer proposal arrives cold, competing against the client's inbox, not against the build decision
- Client defers, then forgets, then never signs
- DSIG loses recurring revenue and the client loses ongoing optimization value

Structural fix: retainer is decided in the same emotional window as the build, on the same signature, with activation deferred to the natural launch moment.

---

## 3. Data Model

### 3.1 `retainer_plans`

The three curated tiers + the site-only option.

| Column | Type | Notes |
|---|---|---|
| id | uuid | pk |
| slug | text | unique, e.g. `essential`, `growth`, `full`, `site_only` |
| name | text | display name |
| tier | text | enum: `essential` / `growth` / `full` / `site_only` |
| monthly_price_cents | integer | 0 for `site_only` |
| description | text | short pitch for the card |
| sort_order | integer | display order |
| active | boolean | default true |
| created_at, updated_at | timestamptz | |

### 3.2 `retainer_menu_items`

The à la carte services that compose tiers and allow customization.

| Column | Type | Notes |
|---|---|---|
| id | uuid | pk |
| slug | text | unique, e.g. `social-mgmt`, `gbp-mgmt`, `review-response`, `content-pub`, `seo-llm-monitor`, `hosting-maintenance`, `analytics-report`, `ongoing-maintenance` |
| name | text | display name |
| category | text | enum: `social` / `gbp` / `reviews` / `content` / `seo` / `hosting` / `analytics` / `maintenance` |
| monthly_price_cents | integer | |
| description | text | |
| active | boolean | default true |
| created_at, updated_at | timestamptz | |

### 3.3 `retainer_plan_items`

Which menu items are included by default in each tier.

| Column | Type | Notes |
|---|---|---|
| plan_id | uuid | fk → retainer_plans |
| item_id | uuid | fk → retainer_menu_items |
| quantity | integer | default 1 |
| PK | (plan_id, item_id) | |

Note: `site_only` has zero rows here.

### 3.4 `quote_retainers`

What the prospect actually picked on `/quote`. One row per quote.

| Column | Type | Notes |
|---|---|---|
| id | uuid | pk |
| quote_id | uuid | fk → quotes, unique (one retainer per quote) |
| plan_id | uuid | fk → retainer_plans |
| custom_items | jsonb | array of `{item_id, quantity, included: bool}` overrides relative to the plan default |
| monthly_total_cents | integer | computed at save time, stored for SOW stability |
| start_date | date | defaults to quote's projected launch date; updates to actual `launched_at` on activation |
| cancelled_at | timestamptz | null unless cancelled pre-launch |
| activated_at | timestamptz | null until launch activation runs |
| subscription_id | uuid | fk → subscriptions, populated on activation |
| created_at, updated_at | timestamptz | |

### 3.5 Money convention

All money in cents. Column names suffix `_cents`. Matches existing invoicing system.

---

## 4. `/quote` Flow Change

### 4.1 Current flow

build scope → contact info → SOW

### 4.2 New flow

build scope → **retainer step** → contact info → SOW

### 4.3 Retainer step UI

**Header:** "Ongoing management after launch"
**Sub-header:** "Pick the level of ongoing service you want. Activates on launch day. Change or cancel anytime."

**Four cards, side-by-side on desktop, stacked on mobile:**

1. **Essential** — base tier, monthly price, checkmark list of included menu items
2. **Growth** — mid tier, monthly price, checkmark list
3. **Full** — top tier, monthly price, checkmark list (typically all menu items)
4. **Site-only** — $0/month, copy: "Launch the site, handle ongoing work yourself. You can add a retainer anytime post-launch."

Each non-site-only card has a **"Customize"** link that expands to the full menu. Toggling items on/off updates the card's monthly price live. Customized plans retain their original tier id but record diffs in `quote_retainers.custom_items`.

**Continue button:**
- Disabled until a card is actively selected (no default highlight)
- Selecting a card does not advance — user confirms via Continue

**AI chat side panel:**
When the user reaches this step, AI says something like: "Now let's talk about what happens after launch. Based on what you've told me about your business, here's how ongoing management typically plays out..." — contextualizes each tier against the user's stated goals. No pressure to pick a higher tier.

### 4.4 Data written

On Continue, write a `quote_retainers` row:
- If customized, `custom_items` captures the diff
- `monthly_total_cents` = sum of included items after diffs
- `start_date` = quote's current projected launch date (user-entered or default +30d)

---

## 5. SOW Output

### 5.1 Structure

**Section 1: Build Services** (unchanged)
- Line items from existing `services_catalog`

**Section 2: Ongoing Services** (new)
- Header: "Monthly retainer, activating on [launch date]"
- Line items from `quote_retainers` (plan default items + custom diffs)
- Monthly total
- Note: "First month billed on launch day. Cancel with 30 days notice."

**Section 3: Signatures** (single signature block covers both sections)

### 5.2 Site-only case

If `plan.tier === 'site_only'`, omit Section 2 entirely. SOW matches today's build-only output. The explicit site-only selection is still recorded in `quote_retainers` for tracking.

---

## 6. Activation at Launch

### 6.1 Trigger

Admin opens `/admin/quotes/[id]` and clicks **"Mark Launched"** (new button). Sets `quotes.launched_at = now()`.

### 6.2 Activation logic

On launch:
1. Load `quote_retainers` for this quote
2. If `plan.tier === 'site_only'`:
   - Schedule "Want to add ongoing management?" email for +30 days
   - Set `activated_at = now()` (audit trail), no subscription created
3. Else:
   - Create row in existing `subscriptions` table
   - `billing_start = now()`
   - `monthly_amount_cents = quote_retainers.monthly_total_cents`
   - `line_items` materialized from plan defaults + custom_items diffs
   - Update `quote_retainers.activated_at = now()`, `subscription_id = <new id>`
   - Send launch email with retainer activation confirmation

### 6.3 Admin visibility

- `/admin/quotes/[id]` shows retainer block with status: **Pending** (pre-launch) / **Active** (post-launch) / **Declined** (site-only) / **Cancelled** (pre-launch cancel)
- `/admin/subscriptions` immediately shows the new active subscription

### 6.4 Edge cases

| Case | Behavior |
|---|---|
| Launch delayed past SOW start_date | `start_date` updates to actual `launched_at` at activation time |
| Client cancels retainer between signing and launch | Admin action in `/admin/quotes/[id]` sets `quote_retainers.cancelled_at`, no subscription created at launch |
| Retainer modified pre-launch (scope changed) | Admin edits `quote_retainers.custom_items`, recomputes `monthly_total_cents`. SOW amendment flow is out of scope — assumes email/DocuSign addendum handled manually |
| Project abandoned (no launch) | `quote_retainers` remains Pending indefinitely. No activation. No billing. |

---

## 7. Admin CRUD

### 7.1 `/admin/retainer-plans`

Mirrors existing `/admin/subscription-plans` pattern:
- Table: tier, name, monthly price, # of included items, active
- Row click → edit form
- Edit form: all plan fields + item inclusion checklist (multi-select from `retainer_menu_items`)
- Create button

### 7.2 `/admin/retainer-menu`

Mirrors `/admin/services` pattern:
- Table: category, name, slug, monthly price, active
- Row click → edit form
- Edit form: all menu item fields
- Create button
- Bulk import (CSV/JSON) — reuse existing importer component from `/admin/services`

### 7.3 Retainer visibility on quote pages

`/admin/quotes/[id]` gains a new panel showing:
- Selected tier
- Line items (plan defaults + custom diffs rendered)
- Monthly total
- Start date
- Status + activation controls (Mark Launched button when status = Pending)

---

## 8. Seed Data

Initial seeds ship with the migration:

### Menu items (8)

| Slug | Category | Name | Monthly |
|---|---|---|---|
| social-mgmt | social | Social Media Management | TBD by Hunter |
| gbp-mgmt | gbp | Google Business Profile Management | TBD |
| review-response | reviews | AI Review Auto-Responder | TBD |
| content-pub | content | AI Content & Blog Publishing | TBD |
| seo-llm-monitor | seo | SEO + LLM Optimization Monitoring | TBD |
| hosting-maintenance | hosting | Hosting + Site Maintenance | TBD |
| analytics-report | analytics | Analytics + Monthly Report | TBD |
| ongoing-maintenance | maintenance | Ongoing Maintenance (updates, fixes, minor changes) | TBD |

### Plans (4)

| Slug | Tier | Items Included | Monthly |
|---|---|---|---|
| essential | essential | hosting-maintenance, ongoing-maintenance, analytics-report | TBD |
| growth | growth | Essential items + gbp-mgmt, review-response, seo-llm-monitor | TBD |
| full | full | All 8 menu items | TBD |
| site_only | site_only | (none) | $0 |

Prices left TBD in migration — Hunter fills via `/admin/retainer-plans` and `/admin/retainer-menu` after deploy.

---

## 9. Site-Only Follow-Up Email

Triggered 30 days after a site-only launch.

**Delivery:** Reuse existing email sending path (SMTP or Resend, whichever is wired at time of build).
**Template:** Stored in `email_templates` table if one exists; else inline in the activation handler.
**Copy direction:**
- Subject: "Your site's been live 30 days — how's it going?"
- Body: Check-in tone, not a pitch. Mentions retainer as an option, links to a "continue conversation" endpoint that pre-fills a retainer-only quote.
- Unsubscribe compliant (CAN-SPAM).

---

## 10. Scope Boundaries

### In scope (this spec)

- 3 new DB tables + migration with seeds
- `/admin/retainer-plans` CRUD
- `/admin/retainer-menu` CRUD (with bulk import reusing existing component)
- `/quote` retainer step UI
- SOW generator updated to include Ongoing Services section
- `/admin/quotes/[id]` retainer panel + Mark Launched button
- Launch activation logic → creates `subscriptions` row
- Site-only 30-day follow-up email

### Out of scope (future work, not this spec)

- Stripe subscription billing automation (assumes existing `subscriptions` plumbing handles billing)
- Client portal view of retainer status
- Client self-service retainer upgrade/downgrade
- A/B testing tier presentation
- Delivery tracking per menu item (e.g., how many social posts shipped this month)
- SOW amendment flow for pre-launch retainer modifications
- Pro-rated billing for mid-month launches (use launch-day start, first full billing cycle aligns to launch date)

### Out of scope (deprecated / explicitly removed)

- Pitching retainer at launch/handoff (the failing pattern)
- Separate retainer proposal PDF after build delivery
- Hard bundling (no decline option)

---

## 11. Open Questions for Implementation

1. **Seed prices** — Hunter fills via admin UI after deploy. Migration ships with placeholder `NULL` or `0` and a TODO flag.
2. **SOW template** — is there an existing SOW renderer the new section plugs into, or does SOW generation happen at PDF time? Answered during implementation by reading existing SOW code.
3. **Launch date capture in /quote** — confirm the existing quote flow already captures projected launch date. If not, add a date picker in the retainer step.
4. **Email delivery path** — confirm whether SMTP is wired at time of implementation; if not, activation email falls back to a queued row + admin notification.

These are resolved in the implementation plan, not here.
