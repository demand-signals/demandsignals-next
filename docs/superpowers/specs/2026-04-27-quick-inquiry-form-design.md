# Quick Inquiry Form — Site-wide Inline Lead Capture — Design

**Status:** approved (brainstorm) — pending implementation plan
**Date:** 2026-04-27
**Author:** brainstorm session with Hunter
**Project:** #2 of 3 in the email/messaging sequence (#1 Resend swap → **this spec** → #3 portal messaging)
**Strategic note:** Hunter's prior projects show ~5:1 submission lift on inline quick-forms vs. dedicated contact pages. This is the highest-leverage lead-gen change on the public site.

---

## 1. Problem

The site has a single lead-capture surface: the dedicated `/contact` page. Anyone interested has to (a) notice the contact link, (b) navigate away from whatever page convinced them, (c) fill a multi-field form. Conversion is constrained by friction at every step.

We need a **persistent, low-friction inquiry form** rendered on every public page so a visitor at the bottom of `/websites-apps/wordpress-development` can drop their name + email + a one-line question without leaving the page.

The form must:

1. Submit to a unified inbound table (`prospect_inquiries`) shared with the full `/contact` form.
2. Trigger the email + SMS notification pipeline shipped in Project #1.
3. Auto-resolve or auto-create a `prospects` row so every inquiry has a `prospect_id` from the moment it lands.
4. Log a `page_visits` row so we close the loop on which marketing page generated the inquiry.
5. Honor the existing `dsig_attr` attribution cookie and promote it on first inquiry.

---

## 2. Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Endpoint strategy | New `POST /api/inquiry`. `/api/contact` refactored to delegate to a shared `recordInquiry()` helper at `src/lib/inquiry.ts`. Both surfaces write to one `prospect_inquiries` table. |
| 2 | Prospect resolution | (a) `dsig_attr` cookie → (b) email-match against `owner_email` / `business_email` → (c) auto-create. Always non-null `prospect_id` on the inquiry row. |
| 3 | Auto-created prospect tagging | `prospects.source = 'inquiry_quick'` or `'inquiry_contact'`; `prospects.stage = 'unqualified'`. Filterable so the main prospects view stays clean. |
| 4 | Form fields | Quick form: `name` (required), `email` (required), `phone` (optional), `message` (optional, 1000-char cap). Hidden honeypot `website` field. No business / service-interest fields on the quick form. |
| 5 | Placement | Rendered above the mega footer (between `<main>` and `<Footer>` in `src/app/layout.tsx`) on every public page. **Suppressed on:** `/contact`, `/admin/*`, `/sow/[number]/[uuid]`, `/invoice/[number]/[uuid]`, `/receipt/*`, `/quote/s/[token]`. Rendered on the homepage. |
| 6 | Attribution cookie behavior | Promote `dsig_attr` → resolved `prospect_id` whenever the cookie is missing or points at a different `pid`. Same mechanism as Project #1's magic-link pages. |
| 7 | `page_visits` write | Logged with `page_type='marketing'` after the inquiry insert succeeds. `page_visit_id` written back to `prospect_inquiries` for cross-reference. |
| 8 | Notification fan-out | Same email + SMS path as today's `/api/contact`: `sendEmail({kind:'contact_form'})` + `sendSms()` to `getAdminTeamPhones()`. Failures `notify()` to `system_notifications`. |
| 9 | Honeypot behavior | Bot submissions return 200 OK with `{success:true}` and no DB write — defeats bot feedback loops. |
| 10 | Idempotency | None. Rate limit (`apiGuard`) + client-side button-disable + honeypot is the defense. |
| 11 | Dashboard integration | Inquiries surfaced at `/admin/inquiries` (list + detail), as a "New Inquiries (7d)" tile on `/admin`, and as a timeline on `/admin/prospects/[id]`. |
| 12 | Reply UX in #2 | Mark read / responded / spam / archived. "Reply" button is a `mailto:` placeholder until Project #3 ships portal threading. |

---

## 3. UI / Component architecture

### 3.1 Component tree

```
src/components/sections/
  QuickInquiryBand.tsx       — server component; reads pathname via headers(); renders nothing on suppressed routes
  QuickInquiryForm.tsx       — client component; form state, submit, success/error display
  quickInquiry.module.css    — dark-band styling that matches AnimatedCTA
```

`QuickInquiryBand` is mounted in `src/app/layout.tsx` between `<main>{children}</main>` and `<Footer />`. The band itself decides whether to render — child layouts don't need to opt out.

### 3.2 Visual treatment

- Background: slate-900 (`#1d2330`) with a thin teal top border (`var(--teal)`).
- Heading: "Have a question? Drop us a line." (single H2, deliberately lightweight — not a competing CTA with the page hero).
- Layout: single horizontal row on desktop (≥768px) — name | email | phone | message-textarea | submit button. Stacks vertically on mobile.
- Submit button: orange `#FF6B2B` (matches site CTAs).
- Honeypot input: `name="website"` with `tabIndex={-1}`, `aria-hidden="true"`, off-screen via CSS (`position:absolute; left:-9999px;`).
- Success state: replaces the form with a teal-bordered "Thanks — we'll be in touch within 24 hours." card.
- Error state: red-bordered banner above the form, form preserved.

### 3.3 Suppression list

`QuickInquiryBand` reads the request pathname and returns `null` for any of:

```ts
const SUPPRESS_PREFIXES = [
  '/admin',
  '/admin-login',
  '/sow/',
  '/invoice/',
  '/receipt/',
  '/quote/s/',
  '/spacegame',         // existing easter egg, already noindex
]
const SUPPRESS_EXACT = ['/contact']
```

Pathname comes from `headers().get('x-pathname')` populated by middleware (extend `src/middleware.ts` to set this header). If middleware fails, default to render — false-positive renders are visually fine; false-negative suppression breaks the doc pages.

---

## 4. Data model — Migration 029

### 4.1 New table: `prospect_inquiries`

```sql
CREATE TABLE prospect_inquiries (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id           uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  source                text NOT NULL CHECK (source IN ('quick_form','contact_form','portal_reply')),

  -- Inputs (immutable record of what they actually typed)
  name                  text NOT NULL,
  email                 text NOT NULL,
  phone                 text,
  business              text,
  service_interest      text,
  message               text,

  -- Page + attribution context
  page_url              text NOT NULL,
  referer               text,
  attribution_source    text NOT NULL CHECK (attribution_source IN ('cookie','email_match','new')),
  page_visit_id         uuid REFERENCES page_visits(id) ON DELETE SET NULL,

  -- Network forensics
  ip                    inet,
  user_agent            text,

  -- Triage
  status                text NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new','read','responded','spam','archived')),
  read_at               timestamptz,
  responded_at          timestamptz,

  -- Notification fan-out (best-effort; populated by route after dispatch)
  email_send_id         uuid,                       -- soft FK to email_engagement.id (no constraint)
  sms_dispatched        boolean NOT NULL DEFAULT false,
  sms_failure_count     integer NOT NULL DEFAULT 0,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospect_inquiries_prospect_time
  ON prospect_inquiries (prospect_id, created_at DESC);
CREATE INDEX idx_prospect_inquiries_status_time
  ON prospect_inquiries (status, created_at DESC) WHERE status = 'new';
CREATE INDEX idx_prospect_inquiries_email_lower
  ON prospect_inquiries (lower(email));

ALTER TABLE prospect_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read inquiries"
  ON prospect_inquiries FOR SELECT USING (is_admin());
CREATE POLICY "Admins update inquiries"
  ON prospect_inquiries FOR UPDATE USING (is_admin());
-- INSERT: service_role only (route uses supabaseAdmin); no admin policy needed.

-- updated_at trigger
CREATE TRIGGER prospect_inquiries_updated_at
  BEFORE UPDATE ON prospect_inquiries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 4.2 `prospects` table additions

```sql
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS first_inquiry_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_inquiry_at  timestamptz;

CREATE INDEX IF NOT EXISTS idx_prospects_last_inquiry_at
  ON prospects (last_inquiry_at DESC) WHERE last_inquiry_at IS NOT NULL;
```

`prospects.source` is already a free-text column with default `'manual'` — no schema change. We add documented values:

| Value | Meaning |
|---|---|
| `inquiry_quick` | Auto-created from the site-wide quick-inquiry band |
| `inquiry_contact` | Auto-created from the full `/contact` form |

`prospects.stage` for auto-created rows is set to `'unqualified'`. Existing values (`researched`, `outreach`, `demo`, `negotiation`, `closed`, etc.) are untouched.

### 4.3 Migration file naming + apply convention

Per project convention (see `supabase/migrations/`):

- `029a_prospect_inquiries.sql` — new table + RLS + trigger
- `029b_prospects_inquiry_timestamps.sql` — `first_inquiry_at`, `last_inquiry_at`, index
- `APPLY-029-2026-04-28.sql` — wrapper that runs both, copy-paste runnable in Supabase SQL Editor

---

## 5. Endpoint — `POST /api/inquiry`

### 5.1 Request contract

```ts
{
  name: string;                                    // required, max 200
  email: string;                                   // required, max 254, valid email
  phone?: string;                                  // optional, max 30
  message?: string;                                // optional, max 1000
  business?: string;                               // optional, only set by /contact full form
  service?: string;                                // optional, only set by /contact full form
  source: 'quick_form' | 'contact_form';           // required
  page_url: string;                                // window.location.pathname at submit time
  website?: string;                                // honeypot — must be empty
}
```

### 5.2 Pipeline (sequential)

1. **`apiGuard(req)`** — rate limit + origin check (existing helper).
2. **Sanitize + validate.** Reuse `sanitizeField()` and `isValidEmail()` from `src/lib/api-security.ts`.
   - Reject if `website` honeypot non-empty → return 200 OK, no row written.
   - 400 if `name` or `email` missing, or `email` invalid.
3. **Resolve prospect** in priority order (single transactional unit — the resolution + inquiry insert + prospect timestamp bump should all succeed or all fail; details in §5.3):
   - **(a) Cookie:** `verifyAttributionCookie()` → if valid `pid`, `SELECT id FROM prospects WHERE id=$pid`. If found, attribution_source=`'cookie'`.
   - **(b) Email match:** `SELECT id FROM prospects WHERE lower(owner_email)=lower($email) OR lower(business_email)=lower($email) ORDER BY created_at ASC LIMIT 1`. If hit, attribution_source=`'email_match'`.
   - **(c) Auto-create:**
     ```sql
     INSERT INTO prospects (
       business_name, owner_name, owner_email, owner_phone,
       source, stage, first_inquiry_at, last_inquiry_at
     ) VALUES (
       COALESCE(NULLIF($business,''), $name),  -- fallback chain in app code
       $name, $email, $phone,
       'inquiry_' || $source_short,            -- 'quick' or 'contact'
       'unqualified',
       now(), now()
     )
     ```
     UNIQUE constraint is `(business_name, city)`. On conflict, retry with `business_name = $name || ' (' || $email || ')'`. If still conflict, log `notify('error','inquiry_create')` and attach the inquiry to the colliding prospect. attribution_source=`'new'`.
4. **Insert `prospect_inquiries` row** with all fields. Capture `id`.
5. **Bump prospect timestamps:**
   ```sql
   UPDATE prospects
     SET last_inquiry_at = now(),
         last_activity_at = now(),
         first_inquiry_at = COALESCE(first_inquiry_at, now())
     WHERE id = $prospect_id
   ```
6. **Log `page_visits` row** via `logPageVisit({ page_type: 'marketing', page_url, attributed_prospect_id: prospect_id })`. Returns `visit_id`. Write back to `prospect_inquiries.page_visit_id` (best-effort UPDATE; ignore failure).
7. **Promote attribution cookie** if cookie was missing or pointed at a different `pid`. Use `buildAttributionCookieParts()` + attach via response `Set-Cookie` header.
8. **Fan-out notifications** — `await Promise.allSettled([emailDispatch, smsDispatch])`. Both run in parallel. We await so the route can persist `email_send_id` and `sms_dispatched` before responding. Typical latency: Resend ~200ms + Twilio ~500ms = ~700ms total — well within an acceptable form-submit response time. If either dispatcher hangs longer than 8s, it has its own internal timeout and falls through to `notify()`.
   - **Email:** `sendEmail({ to: CONTACT_EMAIL, kind: 'contact_form', subject, html })`. Capture `email_send_id` from return value → `UPDATE prospect_inquiries SET email_send_id = $... WHERE id = $...`.
   - **SMS:** `sendSms()` to each phone in `getAdminTeamPhones()`. On all-success, set `sms_dispatched=true`. On any failure, increment `sms_failure_count` and `notify('warning','inquiry_sms')`.
9. **Return 200** with `{ success: true }` + cookie `Set-Cookie` header attached.

### 5.3 Atomicity note

Steps 3–5 are logically a single transaction (resolve/create prospect + insert inquiry + bump timestamps). Implement using a Supabase RPC (`handle_inquiry_submission`) for true atomicity, OR sequential service-role queries with a compensating delete on failure. Recommend the **RPC** approach because it avoids partial-state bugs and matches the pattern used by `allocate_document_number()` and `convertSowToProject()`.

If the RPC fails, return 500 — this is the canonical record; a successful response on a failed insert would lose the inquiry. The caller's `system_notifications` row is the trail.

### 5.4 Refactor of `/api/contact`

Existing `/api/contact/route.ts` keeps its public contract (validates `business`, `service`, etc.) but its body shrinks to:

```ts
const { name, email, phone, business, service, message } = sanitized
const result = await recordInquiry({
  source: 'contact_form',
  name, email, phone, business, service_interest: service, message,
  page_url: '/contact',
  request: req,    // for IP, UA, referer, cookies
})
return NextResponse.json({ success: result.ok, error: result.error })
```

`recordInquiry()` lives in `src/lib/inquiry.ts` and encapsulates steps 3–8 of §5.2. `POST /api/inquiry` is a 10-line route that calls the same helper.

---

## 6. Admin surfaces

### 6.1 New routes

| Route | Purpose |
|---|---|
| `/admin/inquiries` | List view — table: status badge, name, email, page_url, source, created_at. Filters: status (default = `new`), source, date range. |
| `/admin/inquiries/[id]` | Detail — full message, prospect link, page_visit context, `dsig_attr` cookie pid (if present), action buttons (mark read / responded / spam / archived), Reply button (`mailto:` placeholder for now — replaced in #3). |

### 6.2 Sidebar additions

Add "Inquiries" link under PROSPECTING group in `src/components/admin/admin-sidebar.tsx` with an unread-count badge driven by `SELECT count(*) FROM prospect_inquiries WHERE status='new'`. Lucide icon: `Inbox`.

### 6.3 Dashboard tile

`/admin` exec dashboard gets a "New Inquiries (7d)" stat card:

```ts
SELECT count(*) FROM prospect_inquiries
WHERE created_at > now() - interval '7 days'
```

Card click navigates to `/admin/inquiries?since=7d`.

### 6.4 Prospect detail integration

`/admin/prospects/[id]` gains an **Inquiries** timeline section (sibling to existing Notes / Activities timelines):

- Chronological list of all `prospect_inquiries` for this prospect
- Each row: source badge, page_url, status, message excerpt, created_at
- Click → `/admin/inquiries/[inquiry_id]`

### 6.5 API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/inquiries` | `GET` | List with filters |
| `/api/admin/inquiries/[id]` | `GET` | Detail |
| `/api/admin/inquiries/[id]/status` | `PATCH` | Update status (sets `read_at` / `responded_at` as appropriate) |

All require `requireAdmin()`.

---

## 7. Failure modes

| Failure | Behavior |
|---|---|
| Honeypot non-empty | Return 200 OK, no row, no notify. |
| Email invalid / missing field | 400 with safe error. |
| Prospect auto-create UNIQUE collision (twice) | `notify('error','inquiry_create')`, attach to colliding prospect, inquiry still saved. |
| Inquiry RPC fails | `notify('error','inquiry_insert')`, return 500. Inquiry NOT silently lost. |
| Email send fails | `sendEmail()` already calls `notify()`; inquiry row saved without `email_send_id`. |
| SMS send fails | `notify('warning','inquiry_sms')`; inquiry row saved with `sms_failure_count > 0`. |
| `page_visits` insert fails | `notify('warning','page_tracking')` (existing); inquiry saved without `page_visit_id`. |
| Cookie sign fails (missing `ATTRIBUTION_COOKIE_SECRET`) | Inquiry saved; cookie not set. Existing startup alert flags missing secret. |
| Middleware doesn't set `x-pathname` | `QuickInquiryBand` defaults to render — false-positive renders are visually fine; doc pages have their own suppression because they don't use `app/layout.tsx` or are explicitly excluded by route. |

---

## 8. Files added / changed

### Added

```
src/components/sections/QuickInquiryBand.tsx
src/components/sections/QuickInquiryForm.tsx
src/components/sections/quickInquiry.module.css
src/lib/inquiry.ts                              -- recordInquiry() helper (steps 3–8)
src/app/api/inquiry/route.ts                    -- POST handler, ~15 lines
src/app/admin/inquiries/page.tsx                -- list view
src/app/admin/inquiries/[id]/page.tsx           -- detail view
src/app/api/admin/inquiries/route.ts            -- GET list
src/app/api/admin/inquiries/[id]/route.ts       -- GET detail
src/app/api/admin/inquiries/[id]/status/route.ts-- PATCH status
supabase/migrations/029a_prospect_inquiries.sql
supabase/migrations/029b_prospects_inquiry_timestamps.sql
supabase/migrations/APPLY-029-2026-04-28.sql
```

### Changed

```
src/app/layout.tsx                              -- mount <QuickInquiryBand /> above <Footer />
src/middleware.ts                               -- set x-pathname header
src/app/api/contact/route.ts                    -- delegate to recordInquiry()
src/components/admin/admin-sidebar.tsx          -- add Inquiries link with unread badge
src/app/admin/page.tsx                          -- add "New Inquiries (7d)" tile
src/app/admin/prospects/[id]/page.tsx           -- add Inquiries timeline section
CLAUDE.md                                       -- §10 + §11 entries; new §23 "Inquiry pipeline"
```

---

## 9. Forward-compatibility hooks for Project #3

These fields and UI affordances are deliberately built now so #3 doesn't have to refactor:

| Hook | Why it matters for #3 |
|---|---|
| `prospect_inquiries.responded_at` | #3 flips this when a reply is actually sent (vs. now it's a manual admin click). |
| `prospect_inquiries.source` includes `'portal_reply'` already | #3 writes inbound replies as inquiries with this source. |
| `prospect_inquiries.email_send_id` (soft FK to `email_engagement.id`) | #3 will use this to thread inbound replies via In-Reply-To headers. |
| Reply button on `/admin/inquiries/[id]` is `mailto:` placeholder | #3 swaps the link target to a portal compose route — no surrounding UI change needed. |
| `/admin/inquiries/[id]` page reserves layout space below the message body for a reply thread | #3 drops the thread component into the reserved slot. |
| `prospects.is_client` and `prospects.client_code` already exist | #3 portal auth ties to these without a new model. |

---

## 10. Out of scope (deferred, with reserved spec files)

To prevent these from being forgotten, **stub spec files are committed alongside this design** with locked decisions and dependencies pre-recorded:

| Item | Reserved spec file |
|---|---|
| Portal-side messaging — admin compose UI, inbound Resend webhook parsing, threading model, client portal auth, inbound replies → `prospect_inquiries` rows of source `portal_reply` | `docs/superpowers/specs/2026-04-28-portal-messaging-design.md` |
| Client SMS notifications on SOW issuance, project milestones, invoice issuance, receipt issuance | `docs/superpowers/specs/2026-04-29-client-sms-notifications-design.md` |

Both stubs include: trigger conditions, dependencies on this spec, and known design decisions. They exist as on-disk artifacts so they show up in `ls docs/superpowers/specs/` and can't drift out of sight.

---

## 11. Strategic context

Per Hunter, prior projects have shown ~5:1 submission lift on inline quick-forms vs. dedicated contact pages. The friction reduction is meaningful: a visitor at the bottom of `/websites-apps/wordpress-development` can drop a name + email without losing context.

Combined with Project #1's email + SMS notification path (already shipped), every inquiry hits Hunter's phone within seconds — so the conversion lift compounds with response-time advantage.

This is the highest-leverage public-site change in the current sequence.
