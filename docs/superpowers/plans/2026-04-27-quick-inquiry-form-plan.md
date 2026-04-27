# Quick Inquiry Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a site-wide inline inquiry band that lands every submission in a unified `prospect_inquiries` table with three-tier prospect resolution, full email + SMS fan-out, and `page_visits` attribution.

**Architecture:** New `POST /api/inquiry` endpoint and refactored `POST /api/contact`, both delegating to a shared `recordInquiry()` helper at `src/lib/inquiry.ts`. Helper executes a Supabase RPC `handle_inquiry_submission()` for atomic prospect resolve/create + inquiry insert + timestamp bumps, then fans out email and SMS notifications and logs a `page_visits` row of type `'marketing'`. The form mounts above the footer in `src/app/layout.tsx` via a `<QuickInquiryBand />` server component that reads pathname from a middleware-set `x-pathname` header and self-suppresses on `/contact`, `/admin/*`, and the magic-link doc routes.

**Tech Stack:** Next.js 16 App Router, React 19 (server components for the band, client component for the form), TypeScript strict, Supabase Postgres + RLS, Resend (via `sendEmail()`), Twilio (via `sendSms()`), `jose` (existing — for attribution cookie).

**Spec:** `docs/superpowers/specs/2026-04-27-quick-inquiry-form-design.md`

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `supabase/migrations/029a_prospect_inquiries.sql` | Create `prospect_inquiries` table + indexes + RLS + `updated_at` trigger |
| `supabase/migrations/029b_prospects_inquiry_timestamps.sql` | Add `first_inquiry_at` + `last_inquiry_at` columns + index on `prospects` |
| `supabase/migrations/029c_handle_inquiry_submission.sql` | Create `handle_inquiry_submission()` RPC for atomic resolve+insert+bump |
| `supabase/migrations/APPLY-029-2026-04-28.sql` | Wrapper script that runs 029a + 029b + 029c in order |
| `src/lib/inquiry.ts` | `recordInquiry()` — shared helper for both `/api/contact` and `/api/inquiry`. Wraps the RPC, fans out notifications, logs page_visits, manages cookie. |
| `src/app/api/inquiry/route.ts` | `POST /api/inquiry` — thin handler that calls `recordInquiry()` |
| `src/components/sections/QuickInquiryBand.tsx` | Server component — reads `x-pathname` header, suppresses on excluded routes, renders form |
| `src/components/sections/QuickInquiryForm.tsx` | Client component — form state, submit, success/error UI |
| `src/components/sections/quickInquiry.module.css` | Dark-band styling + responsive layout |
| `src/app/admin/inquiries/page.tsx` | List view |
| `src/app/admin/inquiries/[id]/page.tsx` | Detail view |
| `src/app/api/admin/inquiries/route.ts` | `GET` admin list |
| `src/app/api/admin/inquiries/[id]/route.ts` | `GET` admin detail |
| `src/app/api/admin/inquiries/[id]/status/route.ts` | `PATCH` status update |

### Modified files

| Path | Change |
|---|---|
| `src/middleware.ts` | Inject `x-pathname` request header so server components can read pathname |
| `src/app/layout.tsx` | Mount `<QuickInquiryBand />` between `<main>` and `<Footer />` |
| `src/app/api/contact/route.ts` | Delegate persistence + fan-out to `recordInquiry()` |
| `src/components/admin/admin-sidebar.tsx` | Add Inquiries link with unread-count badge under PROSPECTING group |
| `src/app/admin/page.tsx` | Add "New Inquiries (7d)" stat tile |
| `src/app/admin/prospects/[id]/page.tsx` | Add Inquiries timeline section |
| `CLAUDE.md` | Append §10 + §11 entries; new §23 "Inquiry pipeline" |

---

## Task 1: Database — `prospect_inquiries` table

**Files:**
- Create: `supabase/migrations/029a_prospect_inquiries.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ── 029a: prospect_inquiries ─────────────────────────────────────
-- Unified inbound table fed by /api/inquiry (quick form), /api/contact
-- (full form), and (Project #3) portal_reply inbound. Every row has a
-- non-null prospect_id; resolution + insert are atomic via RPC (029c).

CREATE TABLE IF NOT EXISTS prospect_inquiries (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id           uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  source                text NOT NULL CHECK (source IN ('quick_form','contact_form','portal_reply')),

  name                  text NOT NULL,
  email                 text NOT NULL,
  phone                 text,
  business              text,
  service_interest      text,
  message               text,

  page_url              text NOT NULL,
  referer               text,
  attribution_source    text NOT NULL CHECK (attribution_source IN ('cookie','email_match','new')),
  page_visit_id         uuid REFERENCES page_visits(id) ON DELETE SET NULL,

  ip                    inet,
  user_agent            text,

  status                text NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new','read','responded','spam','archived')),
  read_at               timestamptz,
  responded_at          timestamptz,

  email_send_id         uuid,
  sms_dispatched        boolean NOT NULL DEFAULT false,
  sms_failure_count     integer NOT NULL DEFAULT 0,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prospect_inquiries_prospect_time
  ON prospect_inquiries (prospect_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospect_inquiries_status_time
  ON prospect_inquiries (status, created_at DESC) WHERE status = 'new';
CREATE INDEX IF NOT EXISTS idx_prospect_inquiries_email_lower
  ON prospect_inquiries (lower(email));

ALTER TABLE prospect_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read inquiries"
  ON prospect_inquiries FOR SELECT USING (is_admin());
CREATE POLICY "Admins update inquiries"
  ON prospect_inquiries FOR UPDATE USING (is_admin());
-- INSERT: service_role only (route uses supabaseAdmin); no admin policy.

DROP TRIGGER IF EXISTS prospect_inquiries_updated_at ON prospect_inquiries;
CREATE TRIGGER prospect_inquiries_updated_at
  BEFORE UPDATE ON prospect_inquiries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/029a_prospect_inquiries.sql
git commit -m "feat(db): add prospect_inquiries table + RLS"
```

---

## Task 2: Database — `prospects` timestamp columns

**Files:**
- Create: `supabase/migrations/029b_prospects_inquiry_timestamps.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ── 029b: prospects.first_inquiry_at + last_inquiry_at ────────────
-- Cheap denorm so cleanup queries (stale unqualified prospects) and
-- admin filters (last activity) are trivial. Bumped by RPC 029c.

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS first_inquiry_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_inquiry_at  timestamptz;

CREATE INDEX IF NOT EXISTS idx_prospects_last_inquiry_at
  ON prospects (last_inquiry_at DESC) WHERE last_inquiry_at IS NOT NULL;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/029b_prospects_inquiry_timestamps.sql
git commit -m "feat(db): add inquiry timestamp columns to prospects"
```

---

## Task 3: Database — `handle_inquiry_submission` RPC

**Files:**
- Create: `supabase/migrations/029c_handle_inquiry_submission.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ── 029c: handle_inquiry_submission RPC ───────────────────────────
-- Atomic prospect resolution + inquiry insert + timestamp bump.
-- Resolution priority: cookie pid > email match > auto-create.
-- Returns the inserted inquiry_id, prospect_id, and attribution_source.
--
-- SECURITY DEFINER + service_role-only EXECUTE. Callers (route handlers
-- using supabaseAdmin client) pass already-validated inputs; the RPC
-- does no further validation beyond NOT NULL guards.

CREATE OR REPLACE FUNCTION handle_inquiry_submission(
  p_cookie_pid          uuid,
  p_source              text,            -- 'quick_form' | 'contact_form' | 'portal_reply'
  p_name                text,
  p_email               text,
  p_phone               text,
  p_business            text,
  p_service_interest    text,
  p_message             text,
  p_page_url            text,
  p_referer             text,
  p_ip                  inet,
  p_user_agent          text
)
RETURNS TABLE (
  inquiry_id            uuid,
  prospect_id           uuid,
  attribution_source    text,
  was_created           boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_prospect_id         uuid;
  v_attribution_source  text;
  v_was_created         boolean := false;
  v_inquiry_id          uuid;
  v_email_lower         text := lower(p_email);
  v_business_name       text;
  v_source_short        text;
BEGIN
  -- Step (a): cookie pid
  IF p_cookie_pid IS NOT NULL THEN
    SELECT id INTO v_prospect_id FROM prospects WHERE id = p_cookie_pid;
    IF FOUND THEN
      v_attribution_source := 'cookie';
    END IF;
  END IF;

  -- Step (b): email match
  IF v_prospect_id IS NULL THEN
    SELECT id INTO v_prospect_id FROM prospects
      WHERE lower(owner_email) = v_email_lower
         OR lower(business_email) = v_email_lower
      ORDER BY created_at ASC LIMIT 1;
    IF FOUND THEN
      v_attribution_source := 'email_match';
    END IF;
  END IF;

  -- Step (c): auto-create
  IF v_prospect_id IS NULL THEN
    v_attribution_source := 'new';
    v_was_created := true;
    v_business_name := COALESCE(NULLIF(trim(p_business),''), p_name);
    v_source_short := CASE p_source
      WHEN 'quick_form' THEN 'quick'
      WHEN 'contact_form' THEN 'contact'
      ELSE 'portal'
    END;

    BEGIN
      INSERT INTO prospects (
        business_name, owner_name, owner_email, owner_phone,
        source, stage, first_inquiry_at, last_inquiry_at, last_activity_at
      ) VALUES (
        v_business_name, p_name, p_email, p_phone,
        'inquiry_' || v_source_short, 'unqualified',
        now(), now(), now()
      ) RETURNING id INTO v_prospect_id;
    EXCEPTION WHEN unique_violation THEN
      -- Retry with disambiguated business_name
      BEGIN
        INSERT INTO prospects (
          business_name, owner_name, owner_email, owner_phone,
          source, stage, first_inquiry_at, last_inquiry_at, last_activity_at
        ) VALUES (
          p_name || ' (' || p_email || ')', p_name, p_email, p_phone,
          'inquiry_' || v_source_short, 'unqualified',
          now(), now(), now()
        ) RETURNING id INTO v_prospect_id;
      EXCEPTION WHEN unique_violation THEN
        -- Final fallback: attach to existing colliding row.
        SELECT id INTO v_prospect_id FROM prospects
          WHERE business_name = v_business_name LIMIT 1;
        v_was_created := false;
        v_attribution_source := 'new';  -- still "new" from caller's POV
      END;
    END;
  ELSE
    -- Existing prospect: bump timestamps.
    UPDATE prospects
      SET last_inquiry_at = now(),
          last_activity_at = now(),
          first_inquiry_at = COALESCE(first_inquiry_at, now())
      WHERE id = v_prospect_id;
  END IF;

  -- Insert inquiry
  INSERT INTO prospect_inquiries (
    prospect_id, source, name, email, phone, business, service_interest,
    message, page_url, referer, attribution_source, ip, user_agent
  ) VALUES (
    v_prospect_id, p_source, p_name, p_email, p_phone, p_business,
    p_service_interest, p_message, p_page_url, p_referer,
    v_attribution_source, p_ip, p_user_agent
  ) RETURNING id INTO v_inquiry_id;

  RETURN QUERY SELECT v_inquiry_id, v_prospect_id, v_attribution_source, v_was_created;
END
$func$;

REVOKE ALL ON FUNCTION handle_inquiry_submission(
  uuid, text, text, text, text, text, text, text, text, text, inet, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION handle_inquiry_submission(
  uuid, text, text, text, text, text, text, text, text, text, inet, text
) TO service_role;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/029c_handle_inquiry_submission.sql
git commit -m "feat(db): add handle_inquiry_submission RPC for atomic resolve+insert"
```

---

## Task 4: Database — APPLY wrapper

**Files:**
- Create: `supabase/migrations/APPLY-029-2026-04-28.sql`

- [ ] **Step 1: Write wrapper**

```sql
-- ── APPLY-029-2026-04-28: Quick inquiry form ──────────────────────
-- Run in Supabase SQL Editor in this order. Idempotent (uses IF NOT
-- EXISTS / OR REPLACE everywhere).

\echo 'Running 029a_prospect_inquiries...'
\i 029a_prospect_inquiries.sql

\echo 'Running 029b_prospects_inquiry_timestamps...'
\i 029b_prospects_inquiry_timestamps.sql

\echo 'Running 029c_handle_inquiry_submission...'
\i 029c_handle_inquiry_submission.sql

\echo 'APPLY-029 complete. Verify:'
\echo '  SELECT count(*) FROM prospect_inquiries;     -- should be 0'
\echo '  SELECT first_inquiry_at FROM prospects LIMIT 1; -- column exists'
\echo '  SELECT proname FROM pg_proc WHERE proname = ''handle_inquiry_submission'';  -- 1 row'
```

Note: Supabase SQL Editor doesn't support `\i` includes — for the editor, the wrapper is just a copy-paste pointer. The actual editor run pastes the three migration bodies in sequence. Hunter applies via the Supabase SQL Editor.

- [ ] **Step 2: Apply migration in Supabase SQL Editor**

Open https://supabase.com/dashboard/project/uoekjqkawssbskfkziwz/sql, paste the contents of 029a, 029b, 029c in order, click Run for each.

Verify:
```sql
SELECT count(*) FROM prospect_inquiries;     -- expect: 0
SELECT first_inquiry_at FROM prospects LIMIT 1;  -- expect: column exists, NULL
SELECT proname FROM pg_proc WHERE proname = 'handle_inquiry_submission';  -- expect: 1 row
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/APPLY-029-2026-04-28.sql
git commit -m "feat(db): add APPLY-029 wrapper for inquiry migrations"
```

---

## Task 5: Middleware — inject `x-pathname` header

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Read current middleware exports + return statements**

```bash
grep -n "return NextResponse" src/middleware.ts
```

Identify each `return NextResponse.next()` so we can attach the header to the response object passed forward.

- [ ] **Step 2: Add helper at top of middleware function and modify return**

In `src/middleware.ts`, find the existing `export async function middleware(request: NextRequest) {` function. Just before the FIRST early-return (i.e., at the top of the body, after `const { pathname } = request.nextUrl`), add:

```ts
  // Make pathname available to server components so QuickInquiryBand can
  // self-suppress on excluded routes without a client-side roundtrip.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
```

Then locate every `return NextResponse.next()` (and any `return NextResponse.next({ request: ... })`) in this file. Replace each with:

```ts
return NextResponse.next({ request: { headers: requestHeaders } })
```

For redirects/rewrites that early-return (e.g. `NextResponse.redirect(...)`), leave them unchanged — they don't render server components downstream.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(middleware): inject x-pathname for server-component path access"
```

---

## Task 6: `recordInquiry()` helper — shared core logic

**Files:**
- Create: `src/lib/inquiry.ts`

- [ ] **Step 1: Write the helper**

```ts
// ── inquiry.ts ───────────────────────────────────────────────────────
// recordInquiry: shared core logic for /api/inquiry (quick form) and
// /api/contact (full form). Atomic prospect resolve+create+insert via
// handle_inquiry_submission() RPC, then non-atomic best-effort fan-out:
//   1. Email to admin via sendEmail()
//   2. SMS to admin team via sendSms() (per-phone, parallel)
//   3. page_visits row of type 'marketing' via logPageVisit()
//   4. Promote dsig_attr cookie if missing or stale
//
// Returns the inquiry_id + prospect_id so callers can build response
// payloads. Notification failures notify() to system_notifications but
// never fail the call — the inquiry record is the canonical artifact.

import { headers, cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { sendSms } from '@/lib/twilio-sms'
import { notify } from '@/lib/system-alerts'
import { logPageVisit, buildAttributionCookieParts } from '@/lib/page-tracking'
import { verifyAttributionCookie, ATTRIBUTION_COOKIE_NAME } from '@/lib/attribution-cookie'
import { CONTACT_EMAIL, getAdminTeamPhones } from '@/lib/constants'
import { escapeHtml } from '@/lib/api-security'

export type InquirySource = 'quick_form' | 'contact_form' | 'portal_reply'

export interface RecordInquiryArgs {
  source: InquirySource
  name: string
  email: string
  phone?: string
  business?: string
  service_interest?: string
  message?: string
  page_url: string
}

export interface RecordInquiryResult {
  ok: boolean
  inquiry_id?: string
  prospect_id?: string
  attribution_source?: 'cookie' | 'email_match' | 'new'
  error?: string
}

export async function recordInquiry(args: RecordInquiryArgs): Promise<RecordInquiryResult> {
  const h = await headers()
  const c = await cookies()

  const fwd = h.get('x-forwarded-for')
  const ip = fwd ? fwd.split(',')[0].trim() : (h.get('x-real-ip') ?? null)
  const user_agent = h.get('user-agent') ?? null
  const referer = h.get('referer') ?? null

  const cookieValue = c.get(ATTRIBUTION_COOKIE_NAME)?.value
  const cookiePayload = await verifyAttributionCookie(cookieValue)
  const cookiePid = cookiePayload?.pid ?? null

  // ── Atomic resolve + insert ──
  const { data, error } = await supabaseAdmin
    .rpc('handle_inquiry_submission', {
      p_cookie_pid: cookiePid,
      p_source: args.source,
      p_name: args.name,
      p_email: args.email,
      p_phone: args.phone ?? null,
      p_business: args.business ?? null,
      p_service_interest: args.service_interest ?? null,
      p_message: args.message ?? null,
      p_page_url: args.page_url,
      p_referer: referer,
      p_ip: ip,
      p_user_agent: user_agent,
    })
    .single()

  if (error || !data) {
    await notify({
      severity: 'error',
      source: 'inquiry_insert',
      title: 'handle_inquiry_submission RPC failed',
      body: error?.message ?? 'no data returned',
      context: { args_source: args.source, error_code: error?.code ?? 'unknown' },
    })
    return { ok: false, error: 'Could not record inquiry. Please try again.' }
  }

  type RpcRow = {
    inquiry_id: string
    prospect_id: string
    attribution_source: 'cookie' | 'email_match' | 'new'
    was_created: boolean
  }
  const row = data as RpcRow
  const inquiry_id = row.inquiry_id
  const prospect_id = row.prospect_id
  const attribution_source = row.attribution_source

  // ── page_visits row (marketing) ──
  let page_visit_id: string | null = null
  try {
    const visit = await logPageVisit({
      page_url: args.page_url,
      page_type: 'marketing',
      attributed_prospect_id: prospect_id,
    })
    page_visit_id = visit.visit_id
    if (page_visit_id) {
      await supabaseAdmin
        .from('prospect_inquiries')
        .update({ page_visit_id })
        .eq('id', inquiry_id)
    }
  } catch (e) {
    console.error('[recordInquiry] page visit log failed:', e instanceof Error ? e.message : e)
  }

  // ── Promote attribution cookie if needed ──
  if (attribution_source !== 'cookie' && prospect_id && prospect_id !== cookiePid) {
    try {
      const parts = await buildAttributionCookieParts(prospect_id)
      if (parts) {
        c.set(parts.name, parts.value, parts.options)
      }
    } catch (e) {
      console.error('[recordInquiry] cookie set failed:', e instanceof Error ? e.message : e)
    }
  }

  // ── Notification fan-out (parallel, awaited) ──
  const emailPromise = (async () => {
    const html = `
      <h2>New ${args.source === 'quick_form' ? 'Quick Inquiry' : 'Contact Form Submission'}</h2>
      <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr><td><strong>Name</strong></td><td>${escapeHtml(args.name)}</td></tr>
        <tr><td><strong>Email</strong></td><td><a href="mailto:${escapeHtml(args.email)}">${escapeHtml(args.email)}</a></td></tr>
        <tr><td><strong>Phone</strong></td><td>${escapeHtml(args.phone || '—')}</td></tr>
        <tr><td><strong>Business</strong></td><td>${escapeHtml(args.business || '—')}</td></tr>
        <tr><td><strong>Service Interest</strong></td><td>${escapeHtml(args.service_interest || '—')}</td></tr>
        <tr><td><strong>Message</strong></td><td style="white-space:pre-wrap;">${escapeHtml(args.message || '—')}</td></tr>
        <tr><td><strong>Page</strong></td><td>${escapeHtml(args.page_url)}</td></tr>
        <tr><td><strong>Source</strong></td><td>${escapeHtml(args.source)}</td></tr>
        <tr><td><strong>Attribution</strong></td><td>${escapeHtml(attribution_source)}</td></tr>
      </table>
    `
    const subject =
      args.source === 'quick_form'
        ? `Quick Inquiry: ${args.name}${args.business ? ` (${args.business})` : ''}`
        : `New Contact: ${args.name} — ${args.business || 'No business listed'}`
    const result = await sendEmail({
      to: CONTACT_EMAIL,
      kind: 'contact_form',
      subject,
      html,
      link: { prospect_id },
    })
    if (result.success && result.send_id) {
      await supabaseAdmin
        .from('prospect_inquiries')
        .update({ email_send_id: result.send_id })
        .eq('id', inquiry_id)
    }
    return result
  })()

  const smsPromise = (async () => {
    const phones = getAdminTeamPhones()
    if (phones.length === 0) {
      await notify({
        severity: 'warning',
        source: 'inquiry_sms',
        title: 'No admin phones configured for inquiry SMS',
        body: 'ADMIN_TEAM_PHONES env var is empty or unset.',
        context: { error_code: 'admin_phones_empty' },
      })
      return { dispatched: false, failures: 0 }
    }
    const body =
      `DSIG ${args.source === 'quick_form' ? 'quick' : 'full'} inquiry: ${args.name}` +
      `${args.business ? ` (${args.business})` : ''}${args.phone ? ` · ${args.phone}` : ''}` +
      ` from ${args.page_url}\n${args.message ? args.message.slice(0, 160) : '(no message)'}`
    const results = await Promise.allSettled(phones.map((p) => sendSms(p, body)))
    let failures = 0
    const failureDetail: Array<{ phone: string; error: string }> = []
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        failures++
        failureDetail.push({ phone: phones[i], error: String(r.reason) })
      } else if (!r.value.success) {
        failures++
        failureDetail.push({ phone: phones[i], error: r.value.error ?? 'unknown' })
      }
    })
    if (failures > 0) {
      await notify({
        severity: 'warning',
        source: 'inquiry_sms',
        title: `SMS dispatch failed for ${failures} of ${phones.length} admin phones`,
        body: failureDetail.map((f) => `${f.phone}: ${f.error}`).join('\n'),
        context: {
          failures: failureDetail,
          inquiry_id,
          error_code: failureDetail[0]?.error.startsWith('SMS test mode')
            ? 'test_mode_block'
            : 'sms_send_failed',
        },
      })
    }
    return { dispatched: failures < phones.length, failures }
  })()

  const [, smsOutcome] = await Promise.allSettled([emailPromise, smsPromise])
  const smsResult = smsOutcome.status === 'fulfilled' ? smsOutcome.value : { dispatched: false, failures: 999 }

  // Persist SMS outcome (best-effort)
  try {
    await supabaseAdmin
      .from('prospect_inquiries')
      .update({
        sms_dispatched: smsResult.dispatched,
        sms_failure_count: smsResult.failures,
      })
      .eq('id', inquiry_id)
  } catch (e) {
    console.error('[recordInquiry] sms outcome update failed:', e instanceof Error ? e.message : e)
  }

  return { ok: true, inquiry_id, prospect_id, attribution_source }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/inquiry.ts
git commit -m "feat(inquiry): add recordInquiry() helper with atomic RPC + fan-out"
```

---

## Task 7: `POST /api/inquiry` route

**Files:**
- Create: `src/app/api/inquiry/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { recordInquiry } from '@/lib/inquiry'
import { apiGuard, isValidEmail, sanitizeField, safeErrorResponse } from '@/lib/api-security'

export async function POST(req: NextRequest) {
  const guard = apiGuard(req)
  if (guard) return guard

  try {
    const body = await req.json()

    // Honeypot: if filled, return 200 OK with no DB write to defeat bot loops.
    const honeypot = sanitizeField(body.website, 200)
    if (honeypot) {
      return NextResponse.json({ success: true })
    }

    const name = sanitizeField(body.name, 200)
    const email = sanitizeField(body.email, 254)
    const phone = sanitizeField(body.phone, 30)
    const message = sanitizeField(body.message, 1000)
    const business = sanitizeField(body.business, 200)
    const service_interest = sanitizeField(body.service, 100)
    const page_url = sanitizeField(body.page_url, 500) || '/'
    const source = body.source === 'contact_form' ? 'contact_form' : 'quick_form'

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required.' },
        { status: 400 },
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 },
      )
    }

    const result = await recordInquiry({
      source,
      name,
      email,
      phone: phone || undefined,
      business: business || undefined,
      service_interest: service_interest || undefined,
      message: message || undefined,
      page_url,
    })

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error ?? 'Could not record inquiry.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return safeErrorResponse('inquiry', err)
  }
}
```

- [ ] **Step 2: Type-check + build**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/inquiry/route.ts
git commit -m "feat(api): add POST /api/inquiry endpoint"
```

---

## Task 8: Refactor `/api/contact` to use `recordInquiry()`

**Files:**
- Modify: `src/app/api/contact/route.ts`

- [ ] **Step 1: Replace contents**

Open `src/app/api/contact/route.ts` and replace its entire contents with:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { recordInquiry } from '@/lib/inquiry'
import { apiGuard, isValidEmail, sanitizeField, safeErrorResponse } from '@/lib/api-security'

export async function POST(req: NextRequest) {
  const guard = apiGuard(req)
  if (guard) return guard

  try {
    const body = await req.json()

    // Honeypot defense (same field name as /api/inquiry for consistency)
    const honeypot = sanitizeField(body.website, 200)
    if (honeypot) {
      return NextResponse.json({ success: true })
    }

    const name = sanitizeField(body.name, 200)
    const email = sanitizeField(body.email, 254)
    const business = sanitizeField(body.business, 200)
    const phone = sanitizeField(body.phone, 30)
    const service = sanitizeField(body.service, 100)
    const message = sanitizeField(body.message, 5000)

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required.' },
        { status: 400 },
      )
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 },
      )
    }

    const result = await recordInquiry({
      source: 'contact_form',
      name,
      email,
      phone: phone || undefined,
      business: business || undefined,
      service_interest: service || undefined,
      message: message || undefined,
      page_url: '/contact',
    })

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error ?? 'Send failed' },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return safeErrorResponse('contact', err)
  }
}
```

- [ ] **Step 2: Type-check + build**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/contact/route.ts
git commit -m "refactor(api): /api/contact now delegates to recordInquiry()"
```

---

## Task 9: `QuickInquiryForm` client component

**Files:**
- Create: `src/components/sections/QuickInquiryForm.tsx`
- Create: `src/components/sections/quickInquiry.module.css`

- [ ] **Step 1: Write the CSS module**

`src/components/sections/quickInquiry.module.css`:

```css
.band {
  background: #1d2330;
  border-top: 1px solid var(--teal);
  padding: 48px 24px;
}

.inner {
  max-width: 1300px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: start;
}

.heading {
  color: #fff;
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.sub {
  color: #cbd5e1;
  font-size: 0.875rem;
  margin: 0 0 12px 0;
}

.form {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

@media (min-width: 768px) {
  .form {
    grid-template-columns: 1fr 1fr 1fr 2fr auto;
    gap: 8px;
  }
  .messageWrap {
    grid-column: span 1;
  }
}

.input,
.textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #3a4256;
  background: #252c3d;
  color: #f4f6f9;
  font-size: 0.9rem;
  font-family: inherit;
}
.input:focus,
.textarea:focus {
  outline: 2px solid var(--teal);
  outline-offset: -1px;
  border-color: var(--teal);
}

.textarea {
  resize: vertical;
  min-height: 42px;
  max-height: 120px;
}

.button {
  background: #FF6B2B;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 10px 20px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.button:hover:not(:disabled) {
  background: #e85a1a;
}
.button:disabled {
  background: #6b7280;
  cursor: not-allowed;
}

.honeypot {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.success {
  background: rgba(104, 197, 173, 0.12);
  border: 1px solid var(--teal);
  border-radius: 6px;
  padding: 16px;
  color: #fff;
  text-align: center;
}

.error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid #ef4444;
  border-radius: 6px;
  padding: 12px 16px;
  color: #fecaca;
  margin-bottom: 8px;
  font-size: 0.875rem;
}
```

- [ ] **Step 2: Write the client form component**

`src/components/sections/QuickInquiryForm.tsx`:

```tsx
'use client'

import { useState, type FormEvent } from 'react'
import styles from './quickInquiry.module.css'

export function QuickInquiryForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')  // honeypot
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          message,
          website,
          source: 'quick_form',
          page_url: typeof window !== 'undefined' ? window.location.pathname : '/',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }
      setSuccess(true)
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className={styles.success}>
        Thanks — we&apos;ll be in touch within 24 hours.
      </div>
    )
  }

  return (
    <>
      {error && <div className={styles.error}>{error}</div>}
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className={styles.honeypot}
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
        <input
          type="text"
          name="name"
          required
          placeholder="Your name"
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Your name"
          maxLength={200}
        />
        <input
          type="email"
          name="email"
          required
          placeholder="Email address"
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email address"
          maxLength={254}
        />
        <input
          type="tel"
          name="phone"
          placeholder="Phone (optional)"
          className={styles.input}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-label="Phone (optional)"
          maxLength={30}
        />
        <textarea
          name="message"
          placeholder="Quick question? (optional)"
          className={styles.textarea}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-label="Message (optional)"
          maxLength={1000}
          rows={1}
        />
        <button type="submit" className={styles.button} disabled={submitting}>
          {submitting ? 'Sending…' : 'Send'}
        </button>
      </form>
    </>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/QuickInquiryForm.tsx src/components/sections/quickInquiry.module.css
git commit -m "feat(ui): add QuickInquiryForm client component"
```

---

## Task 10: `QuickInquiryBand` server component with route suppression

**Files:**
- Create: `src/components/sections/QuickInquiryBand.tsx`

- [ ] **Step 1: Write the band wrapper**

`src/components/sections/QuickInquiryBand.tsx`:

```tsx
import { headers } from 'next/headers'
import { QuickInquiryForm } from './QuickInquiryForm'
import styles from './quickInquiry.module.css'

const SUPPRESS_PREFIXES = [
  '/admin',
  '/admin-login',
  '/sow/',
  '/invoice/',
  '/receipt/',
  '/quote/s/',
  '/spacegame',
] as const

const SUPPRESS_EXACT = new Set<string>(['/contact'])

function shouldSuppress(pathname: string): boolean {
  if (SUPPRESS_EXACT.has(pathname)) return true
  for (const p of SUPPRESS_PREFIXES) {
    if (pathname === p || pathname.startsWith(p)) return true
  }
  return false
}

export async function QuickInquiryBand() {
  const h = await headers()
  const pathname = h.get('x-pathname') ?? '/'
  if (shouldSuppress(pathname)) return null

  return (
    <section className={styles.band} aria-labelledby="quick-inquiry-heading">
      <div className={styles.inner}>
        <h2 id="quick-inquiry-heading" className={styles.heading}>
          Have a question? Drop us a line.
        </h2>
        <p className={styles.sub}>
          Quick reply within 24 hours. No phone calls unless you ask for one.
        </p>
        <QuickInquiryForm />
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Mount in layout**

Open `src/app/layout.tsx`. Add the import:

```tsx
import { QuickInquiryBand } from '@/components/sections/QuickInquiryBand'
```

Then locate the `<Footer />` line (around line 114). Add the band immediately above it:

```tsx
        <QuickInquiryBand />
        <Footer />
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: clean build, no SSR errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/QuickInquiryBand.tsx src/app/layout.tsx
git commit -m "feat(ui): mount QuickInquiryBand above footer with route suppression"
```

---

## Task 11: Smoke test — manual end-to-end submission

**Files:** none (manual verification)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Submit from a service page**

1. Open http://localhost:3000/websites-apps/wordpress-development
2. Scroll to the band above the footer.
3. Fill: name=Test User, email=test@example.com, phone=(916) 555-1234, message="Plan smoke test"
4. Click Send.
5. Expect: form replaced with green success card.

- [ ] **Step 3: Verify DB rows**

In Supabase SQL Editor:

```sql
SELECT id, prospect_id, source, name, email, page_url, attribution_source, status, sms_dispatched, sms_failure_count, created_at
  FROM prospect_inquiries
  ORDER BY created_at DESC LIMIT 1;

SELECT id, business_name, owner_email, source, stage, first_inquiry_at, last_inquiry_at
  FROM prospects
  WHERE owner_email = 'test@example.com';

SELECT id, page_url, page_type, prospect_id, attribution_source, occurred_at
  FROM page_visits
  ORDER BY occurred_at DESC LIMIT 1;
```

Expected:
- One `prospect_inquiries` row with `source='quick_form'`, `attribution_source='new'`, `page_url='/websites-apps/wordpress-development'`.
- One `prospects` row with `source='inquiry_quick'`, `stage='unqualified'`, `first_inquiry_at` and `last_inquiry_at` set.
- One `page_visits` row with `page_type='marketing'` and the same `prospect_id`.

- [ ] **Step 4: Verify suppression**

1. Open http://localhost:3000/contact — band should NOT render.
2. Open http://localhost:3000/admin — band should NOT render (separate from admin auth gating; just confirm the band element isn't present in DOM).
3. Open http://localhost:3000/ — band SHOULD render above footer.

- [ ] **Step 5: Verify honeypot**

Use browser devtools to set the honeypot input value to `'spam'` before submit:

```js
document.querySelector('input[name="website"]').value = 'spam-bot'
```

Submit. Expect: success card shows (200 OK), but NO new `prospect_inquiries` row in DB.

- [ ] **Step 6: Verify cookie promotion**

In browser devtools → Application → Cookies → http://localhost:3000:
- Confirm `dsig_attr` cookie was set by the first successful submit.
- Note: cookie domain is `.demandsignals.co` per attribution-cookie.ts; on localhost the browser may strip the domain attribute. Either way, verify the cookie exists and that a second submit from the same browser attaches to the same prospect (run the SQL from Step 3 again — should be the same `prospect_id`).

- [ ] **Step 7: Smoke test complete — no commit needed**

If anything fails, fix it (in the appropriate prior task's file) and repeat.

---

## Task 12: Admin API — list inquiries

**Files:**
- Create: `src/app/api/admin/inquiries/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const source = url.searchParams.get('source')
  const since = url.searchParams.get('since')   // '7d', '30d'
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100'), 500)

  let q = supabaseAdmin
    .from('prospect_inquiries')
    .select('id, prospect_id, source, name, email, phone, business, service_interest, message, page_url, status, attribution_source, sms_dispatched, sms_failure_count, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) q = q.eq('status', status)
  if (source) q = q.eq('source', source)
  if (since === '7d') q = q.gte('created_at', new Date(Date.now() - 7 * 86400_000).toISOString())
  if (since === '30d') q = q.gte('created_at', new Date(Date.now() - 30 * 86400_000).toISOString())

  const { data, error } = await q
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ inquiries: data ?? [] })
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/inquiries/route.ts
git commit -m "feat(admin-api): GET /api/admin/inquiries list endpoint"
```

---

## Task 13: Admin API — inquiry detail + status update

**Files:**
- Create: `src/app/api/admin/inquiries/[id]/route.ts`
- Create: `src/app/api/admin/inquiries/[id]/status/route.ts`

- [ ] **Step 1: Write the detail GET route**

`src/app/api/admin/inquiries/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth
  const { id } = await params

  const { data: inquiry, error } = await supabaseAdmin
    .from('prospect_inquiries')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !inquiry) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('id, business_name, owner_name, owner_email, owner_phone, stage, source, client_code, is_client')
    .eq('id', inquiry.prospect_id)
    .single()

  let page_visit = null
  if (inquiry.page_visit_id) {
    const { data: pv } = await supabaseAdmin
      .from('page_visits')
      .select('id, page_url, page_type, attribution_source, ip, user_agent, referer, occurred_at')
      .eq('id', inquiry.page_visit_id)
      .single()
    page_visit = pv
  }

  return NextResponse.json({ inquiry, prospect, page_visit })
}
```

- [ ] **Step 2: Write the status PATCH route**

`src/app/api/admin/inquiries/[id]/status/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

const VALID_STATUSES = new Set(['new', 'read', 'responded', 'spam', 'archived'])

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth
  const { id } = await params

  const body = await req.json().catch(() => ({}))
  const status = typeof body.status === 'string' ? body.status : null
  if (!status || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const patch: Record<string, unknown> = { status }
  const now = new Date().toISOString()
  if (status === 'read') patch.read_at = now
  if (status === 'responded') patch.responded_at = now

  const { data, error } = await supabaseAdmin
    .from('prospect_inquiries')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ inquiry: data })
}
```

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/inquiries/[id]/route.ts src/app/api/admin/inquiries/[id]/status/route.ts
git commit -m "feat(admin-api): inquiry detail + status PATCH endpoints"
```

---

## Task 14: Admin UI — list page

**Files:**
- Create: `src/app/admin/inquiries/page.tsx`

- [ ] **Step 1: Write the list page**

```tsx
import Link from 'next/link'
import { headers } from 'next/headers'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface InquiryRow {
  id: string
  prospect_id: string
  source: string
  name: string
  email: string
  business: string | null
  message: string | null
  page_url: string
  status: string
  attribution_source: string
  sms_dispatched: boolean
  created_at: string
}

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string; since?: string }>
}) {
  const h = await headers()
  // Build a NextRequest-shaped object for requireAdmin? Use the existing pattern.
  // Actually requireAdmin reads from request; in server components we read cookies directly.
  // For consistency with existing admin pages, use the supabaseAdmin client directly:
  const sp = await searchParams

  let q = supabaseAdmin
    .from('prospect_inquiries')
    .select('id, prospect_id, source, name, email, business, message, page_url, status, attribution_source, sms_dispatched, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (sp.status) q = q.eq('status', sp.status)
  if (sp.source) q = q.eq('source', sp.source)
  if (sp.since === '7d') q = q.gte('created_at', new Date(Date.now() - 7 * 86400_000).toISOString())
  if (sp.since === '30d') q = q.gte('created_at', new Date(Date.now() - 30 * 86400_000).toISOString())

  const { data, error } = await q
  if (error) {
    return <div className="p-6 text-red-500">Error: {error.message}</div>
  }
  const inquiries = (data ?? []) as InquiryRow[]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Inquiries</h1>
      <div className="mb-4 flex gap-2 text-sm">
        <Link href="/admin/inquiries" className="underline">All</Link>
        <Link href="/admin/inquiries?status=new" className="underline">New</Link>
        <Link href="/admin/inquiries?status=responded" className="underline">Responded</Link>
        <Link href="/admin/inquiries?status=spam" className="underline">Spam</Link>
        <Link href="/admin/inquiries?since=7d" className="underline">Last 7d</Link>
        <Link href="/admin/inquiries?since=30d" className="underline">Last 30d</Link>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-700 text-left">
            <th className="p-2">Status</th>
            <th className="p-2">Name</th>
            <th className="p-2">Email</th>
            <th className="p-2">Source</th>
            <th className="p-2">Page</th>
            <th className="p-2">Message</th>
            <th className="p-2">When</th>
          </tr>
        </thead>
        <tbody>
          {inquiries.map((row) => (
            <tr key={row.id} className="border-b border-slate-800 hover:bg-slate-900">
              <td className="p-2">
                <span className={statusClass(row.status)}>{row.status}</span>
              </td>
              <td className="p-2">
                <Link href={`/admin/inquiries/${row.id}`} className="underline">
                  {row.name}
                </Link>
                {row.business ? <div className="text-xs text-slate-400">{row.business}</div> : null}
              </td>
              <td className="p-2">
                <a href={`mailto:${row.email}`} className="underline">{row.email}</a>
              </td>
              <td className="p-2 text-xs">{row.source}</td>
              <td className="p-2 text-xs text-slate-400">{row.page_url}</td>
              <td className="p-2 text-xs max-w-xs truncate">{row.message ?? '—'}</td>
              <td className="p-2 text-xs whitespace-nowrap">
                {new Date(row.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
          {inquiries.length === 0 && (
            <tr>
              <td colSpan={7} className="p-6 text-center text-slate-400">No inquiries.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function statusClass(status: string): string {
  const base = 'inline-block px-2 py-0.5 rounded text-xs font-medium '
  switch (status) {
    case 'new': return base + 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
    case 'read': return base + 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
    case 'responded': return base + 'bg-green-500/20 text-green-300 border border-green-500/40'
    case 'spam': return base + 'bg-red-500/20 text-red-300 border border-red-500/40'
    case 'archived': return base + 'bg-slate-700/30 text-slate-500 border border-slate-700/50'
    default: return base + 'bg-slate-500/20 text-slate-300'
  }
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/inquiries/page.tsx
git commit -m "feat(admin-ui): inquiries list page"
```

---

## Task 15: Admin UI — detail page with status actions

**Files:**
- Create: `src/app/admin/inquiries/[id]/page.tsx`
- Create: `src/app/admin/inquiries/[id]/StatusButtons.tsx`

- [ ] **Step 1: Write the detail page (server component)**

`src/app/admin/inquiries/[id]/page.tsx`:

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { StatusButtons } from './StatusButtons'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function InquiryDetailPage({ params }: PageProps) {
  const { id } = await params

  const { data: inquiry } = await supabaseAdmin
    .from('prospect_inquiries')
    .select('*')
    .eq('id', id)
    .single()

  if (!inquiry) notFound()

  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('id, business_name, owner_name, owner_email, owner_phone, stage, source, client_code, is_client')
    .eq('id', inquiry.prospect_id)
    .single()

  let pageVisit: { page_url: string; ip: string | null; user_agent: string | null; referer: string | null; occurred_at: string } | null = null
  if (inquiry.page_visit_id) {
    const { data: pv } = await supabaseAdmin
      .from('page_visits')
      .select('page_url, ip, user_agent, referer, occurred_at')
      .eq('id', inquiry.page_visit_id)
      .single()
    pageVisit = pv as typeof pageVisit
  }

  const replyHref =
    `mailto:${encodeURIComponent(inquiry.email)}` +
    `?subject=${encodeURIComponent('Re: your inquiry to Demand Signals')}` +
    `&body=${encodeURIComponent(`Hi ${inquiry.name},\n\nThanks for reaching out — `)}`

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-4">
        <Link href="/admin/inquiries" className="text-sm text-slate-400 underline">
          ← All inquiries
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-2">
        {inquiry.name}{inquiry.business ? ` — ${inquiry.business}` : ''}
      </h1>
      <div className="text-sm text-slate-400 mb-6">
        {inquiry.source} · {new Date(inquiry.created_at).toLocaleString()} · status: <strong>{inquiry.status}</strong>
      </div>

      <section className="mb-6 p-4 border border-slate-700 rounded">
        <h2 className="text-lg font-semibold mb-3">Message</h2>
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div><span className="text-slate-400">Email:</span> <a href={`mailto:${inquiry.email}`} className="underline">{inquiry.email}</a></div>
          <div><span className="text-slate-400">Phone:</span> {inquiry.phone || '—'}</div>
          <div><span className="text-slate-400">Service Interest:</span> {inquiry.service_interest || '—'}</div>
          <div><span className="text-slate-400">Page:</span> {inquiry.page_url}</div>
        </div>
        <div className="whitespace-pre-wrap p-3 bg-slate-900 rounded text-sm">
          {inquiry.message || '(no message)'}
        </div>
      </section>

      {/* Reserved layout slot for #3 reply thread — placeholder for now */}
      <section className="mb-6">
        <a
          href={replyHref}
          className="inline-block bg-orange-600 text-white px-4 py-2 rounded font-medium"
        >
          Reply via email
        </a>
        <span className="ml-3 text-xs text-slate-500">
          (Portal compose coming in Project #3)
        </span>
      </section>

      <section className="mb-6 p-4 border border-slate-700 rounded">
        <h2 className="text-lg font-semibold mb-3">Triage</h2>
        <StatusButtons inquiryId={inquiry.id} currentStatus={inquiry.status} />
      </section>

      {prospect && (
        <section className="mb-6 p-4 border border-slate-700 rounded">
          <h2 className="text-lg font-semibold mb-3">Prospect</h2>
          <div className="text-sm space-y-1">
            <div><span className="text-slate-400">Business:</span> <Link href={`/admin/prospects/${prospect.id}`} className="underline">{prospect.business_name}</Link></div>
            <div><span className="text-slate-400">Stage:</span> {prospect.stage}</div>
            <div><span className="text-slate-400">Source:</span> {prospect.source}</div>
            <div><span className="text-slate-400">Client:</span> {prospect.is_client ? `Yes (${prospect.client_code ?? '—'})` : 'No'}</div>
          </div>
        </section>
      )}

      <section className="mb-6 p-4 border border-slate-700 rounded">
        <h2 className="text-lg font-semibold mb-3">Attribution + Forensics</h2>
        <div className="text-sm space-y-1">
          <div><span className="text-slate-400">Attribution:</span> {inquiry.attribution_source}</div>
          <div><span className="text-slate-400">SMS dispatched:</span> {inquiry.sms_dispatched ? 'yes' : `no (${inquiry.sms_failure_count} failures)`}</div>
          <div><span className="text-slate-400">Email send id:</span> {inquiry.email_send_id ?? '—'}</div>
          {pageVisit && (
            <>
              <div><span className="text-slate-400">IP:</span> {pageVisit.ip ?? '—'}</div>
              <div><span className="text-slate-400">User-Agent:</span> <span className="text-xs">{pageVisit.user_agent ?? '—'}</span></div>
              <div><span className="text-slate-400">Referer:</span> {pageVisit.referer ?? '—'}</div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Write the StatusButtons client component**

`src/app/admin/inquiries/[id]/StatusButtons.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUSES = ['new', 'read', 'responded', 'spam', 'archived'] as const

export function StatusButtons({
  inquiryId,
  currentStatus,
}: {
  inquiryId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(currentStatus)

  async function setTo(next: string) {
    if (busy || next === status) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/inquiries/${inquiryId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) {
        setStatus(next)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error ?? 'Update failed')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {STATUSES.map((s) => (
        <button
          key={s}
          disabled={busy || s === status}
          onClick={() => setTo(s)}
          className={
            'px-3 py-1.5 rounded text-sm border ' +
            (s === status
              ? 'bg-teal-600 border-teal-500 text-white'
              : 'border-slate-700 text-slate-300 hover:bg-slate-800')
          }
        >
          {s}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/inquiries/[id]/page.tsx src/app/admin/inquiries/[id]/StatusButtons.tsx
git commit -m "feat(admin-ui): inquiry detail page with status buttons"
```

---

## Task 16: Sidebar — add Inquiries link with unread badge

**Files:**
- Modify: `src/components/admin/admin-sidebar.tsx`

- [ ] **Step 1: Read sidebar**

```bash
grep -n "PROSPECTING\|prospects\|Inbox\|Mail" src/components/admin/admin-sidebar.tsx | head -20
```

Identify the PROSPECTING section's items array and the icon import block.

- [ ] **Step 2: Add the link**

In `src/components/admin/admin-sidebar.tsx`:

(a) Add `Inbox` to the `lucide-react` import line (alongside the existing icon imports). Example transformation:
```tsx
// before:
import { Users, ClipboardList, ... } from 'lucide-react'
// after:
import { Users, ClipboardList, Inbox, ... } from 'lucide-react'
```

(b) In the PROSPECTING group's items array, add an entry for Inquiries near the top. Example shape (match the surrounding style):
```tsx
{ href: '/admin/inquiries', label: 'Inquiries', icon: Inbox, badgeKey: 'inquiriesUnread' },
```

(c) The unread badge fetch — if the sidebar already supports `badgeKey` style server-fetched counts (look for a similar pattern in the file), reuse it. If not, add a simple async data fetch at the top of the sidebar component:

```tsx
const { count: inquiriesUnread } = await supabaseAdmin
  .from('prospect_inquiries')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'new')
```

And render the badge inline next to the Inquiries label when `inquiriesUnread > 0`.

If the sidebar is a client component, instead expose a separate `<InquiriesBadge />` server component island used inline, or use a SWR fetch from the client side hitting `/api/admin/inquiries?status=new&limit=1` and reading the count via `Content-Range`-style total. Pick whichever fits the existing pattern; do not invent a new pattern.

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/admin-sidebar.tsx
git commit -m "feat(admin-ui): add Inquiries sidebar link with unread badge"
```

---

## Task 17: Dashboard tile — "New Inquiries (7d)"

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Read existing dashboard**

```bash
grep -n "stat\|tile\|Card\|count" src/app/admin/page.tsx | head -20
```

Identify the existing per-category stat tile pattern.

- [ ] **Step 2: Add the inquiry stat fetch and tile**

Locate where existing dashboard stats are fetched (look for `supabaseAdmin.from('prospects')` or similar `count` queries). Add adjacent to them:

```tsx
const { count: inquiries7d } = await supabaseAdmin
  .from('prospect_inquiries')
  .select('*', { count: 'exact', head: true })
  .gte('created_at', new Date(Date.now() - 7 * 86400_000).toISOString())

const { count: inquiriesNew } = await supabaseAdmin
  .from('prospect_inquiries')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'new')
```

Then add a tile to the rendered stat grid. Match the existing `<StatCard>` (or whatever component is used) — example shape:

```tsx
<StatCard
  href="/admin/inquiries?since=7d"
  label="New Inquiries (7d)"
  value={inquiries7d ?? 0}
  sublabel={`${inquiriesNew ?? 0} unread`}
/>
```

If the dashboard uses a different component name, match it. Do not invent a new tile component.

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin-ui): inquiries 7d stat tile on dashboard"
```

---

## Task 18: Prospect detail — inquiries timeline

**Files:**
- Modify: `src/app/admin/prospects/[id]/page.tsx`

- [ ] **Step 1: Read existing detail page structure**

```bash
grep -n "Notes\|Activities\|Activity\|timeline\|prospect_notes" src/app/admin/prospects/[id]/page.tsx | head -20
```

Locate where Notes / Activities are rendered.

- [ ] **Step 2: Add the inquiries fetch and section**

Near the existing data fetches (notes, activities), add:

```tsx
const { data: inquiries } = await supabaseAdmin
  .from('prospect_inquiries')
  .select('id, source, message, page_url, status, created_at')
  .eq('prospect_id', prospect.id)
  .order('created_at', { ascending: false })
  .limit(50)
```

Then in the JSX, add a new `<section>` after Notes/Activities (or wherever the timeline grouping makes sense):

```tsx
<section className="mb-6 p-4 border border-slate-700 rounded">
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-lg font-semibold">Inquiries</h2>
    <span className="text-xs text-slate-400">{inquiries?.length ?? 0}</span>
  </div>
  {inquiries && inquiries.length > 0 ? (
    <ul className="space-y-2">
      {inquiries.map((inq) => (
        <li key={inq.id} className="text-sm flex items-baseline gap-3">
          <Link href={`/admin/inquiries/${inq.id}`} className="underline">
            {new Date(inq.created_at).toLocaleDateString()}
          </Link>
          <span className="text-xs text-slate-500">{inq.source}</span>
          <span className="text-xs text-slate-500">{inq.page_url}</span>
          <span className="text-slate-300 truncate">{inq.message ?? '—'}</span>
          <span className="ml-auto text-xs text-slate-500">{inq.status}</span>
        </li>
      ))}
    </ul>
  ) : (
    <div className="text-sm text-slate-500">No inquiries from this prospect.</div>
  )}
</section>
```

If `Link` isn't already imported on the page, add `import Link from 'next/link'` at the top.

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/prospects/[id]/page.tsx
git commit -m "feat(admin-ui): inquiries timeline on prospect detail"
```

---

## Task 19: Documentation — update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add a §10 entry**

Find the "## 10. What Is Complete" section. Add a new bullet at the bottom:

```markdown
- [x] **Quick Inquiry Form (Project #2 of 3 in messaging sequence):** Site-wide inline inquiry band rendered above the footer on every public page (suppressed on /contact, /admin/*, magic-link doc routes). New `prospect_inquiries` table with three-tier resolution (cookie → email-match → auto-create with `inquiry_quick`/`inquiry_contact` source tag). Atomic resolve+insert via `handle_inquiry_submission()` RPC. Shared `recordInquiry()` helper at `src/lib/inquiry.ts` powers both `/api/inquiry` (quick form) and `/api/contact` (full form). Inherits Project #1's email + SMS notification path (failures → `system_notifications`). page_visits row of `page_type='marketing'` logged per submission. dsig_attr cookie promotion on first inquiry. Admin surfaces: `/admin/inquiries` list, `/admin/inquiries/[id]` detail with status triage, sidebar Inquiries link with unread badge, dashboard "New Inquiries (7d)" tile, prospect detail inquiries timeline. Migrations 029a/b/c. Spec: `docs/superpowers/specs/2026-04-27-quick-inquiry-form-design.md`. Plan: `docs/superpowers/plans/2026-04-27-quick-inquiry-form-plan.md`.
```

- [ ] **Step 2: Add a new §23 "Inquiry pipeline"**

After the last existing numbered section, add:

```markdown
---

## 23. Inquiry pipeline (added 2026-04-27)

Every inbound message — quick form, full contact form, or (Project #3) portal reply — lands in `prospect_inquiries` with a non-null `prospect_id`. The pipeline:

1. **Form submit** → `POST /api/inquiry` (quick) or `POST /api/contact` (full). Both honeypot-defended via hidden `website` field; both require `name` + valid `email`.
2. **Both routes call** `recordInquiry()` in `src/lib/inquiry.ts`.
3. **Resolution** (atomic via `handle_inquiry_submission()` RPC):
   - (a) Cookie pid match → existing prospect, `attribution_source='cookie'`
   - (b) Email match on `owner_email` / `business_email` → existing prospect, `attribution_source='email_match'`
   - (c) Auto-create new prospect with `source='inquiry_quick'`/`'inquiry_contact'` and `stage='unqualified'`, `attribution_source='new'`
4. **Inquiry row inserted** with full payload + IP + UA + referer + page_url.
5. **Prospect timestamps bumped:** `last_inquiry_at`, `last_activity_at`, `first_inquiry_at` (if null).
6. **page_visits row** logged with `page_type='marketing'` and the resolved `prospect_id`.
7. **dsig_attr cookie** promoted to the resolved prospect_id if it was missing or stale.
8. **Email + SMS fan-out** (parallel, awaited): admin email via `sendEmail({kind:'contact_form'})`, SMS to `getAdminTeamPhones()` via `sendSms()`. Failures → `notify('warning','inquiry_sms')`. Outcomes persisted on the inquiry row (`email_send_id`, `sms_dispatched`, `sms_failure_count`).

**Failure modes:**
- Honeypot non-empty → 200 OK, no row, no notify
- RPC fails → `notify('error','inquiry_insert')`, route returns 500 (canonical record cannot be lost)
- Email/SMS/page_visits failures → notify warnings; inquiry row stays
- UNIQUE collision on auto-create → retry with disambiguated business_name; final fallback attaches to colliding prospect

**Forward-compat for Project #3:** `responded_at`, `email_send_id`, and the reply button on `/admin/inquiries/[id]` already anticipate portal threading (see spec §9).

**Suppression list** (band does NOT render): `/contact`, `/admin/*`, `/admin-login`, `/sow/*`, `/invoice/*`, `/receipt/*`, `/quote/s/*`, `/spacegame*`. Pathname comes from middleware-injected `x-pathname` request header.
```

- [ ] **Step 3: Add §11 entry update**

Find "## 11. What Is NOT Done (Open Work)" → "Lower Priority" or similar. Add (under appropriate priority bucket):

```markdown
- [ ] **Project #3 — Portal messaging** (stub spec at `docs/superpowers/specs/2026-04-28-portal-messaging-design.md`). Triggered after Project #2 ships and the manual reply friction becomes felt.
- [ ] **Client SMS notifications** on SOW issuance / project milestones / invoice / receipt (stub spec at `docs/superpowers/specs/2026-04-29-client-sms-notifications-design.md`). After Project #3.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude.md): add §23 inquiry pipeline + §10/§11 entries"
```

---

## Task 20: Final verification — full E2E in production-like env

**Files:** none (manual)

- [ ] **Step 1: Local build clean**

```bash
npm run build
```

Expected: 843+ static pages, zero errors.

- [ ] **Step 2: TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Push to master**

Per CLAUDE.md §4 git push protocol:

```bash
GHTOKEN="<from PROJECT.md section 2>"
git -c credential.helper="" \
  -c "http.https://github.com.extraheader=Authorization: Basic $(echo -n "demand-signals:${GHTOKEN}" | base64 -w0)" \
  push origin master
```

- [ ] **Step 4: Wait for Vercel deploy + verify deploy SHA matches**

Per §12 deploy-lag lesson:

```bash
sleep 60
curl -s -o /dev/null -D - https://demandsignals.co | grep -i "x-vercel-id"
```

Compare to your latest commit SHA before running E2E checks.

- [ ] **Step 5: Production E2E**

1. Visit https://demandsignals.co/websites-apps/wordpress-development
2. Submit the band form with a real email you control
3. Verify:
   - Email arrives at DemandSignals@gmail.com within 30s
   - SMS arrives on every phone in `ADMIN_TEAM_PHONES` env var (or `notify` row in `system_notifications` if test mode is gating)
4. In Supabase:
   ```sql
   SELECT * FROM prospect_inquiries ORDER BY created_at DESC LIMIT 1;
   SELECT * FROM page_visits WHERE page_type='marketing' ORDER BY occurred_at DESC LIMIT 1;
   SELECT id, source, stage, first_inquiry_at FROM prospects ORDER BY first_inquiry_at DESC NULLS LAST LIMIT 1;
   ```
   Confirm all three tables have the new rows.
5. In `/admin/inquiries`, confirm the new row appears.
6. Click into detail, mark as `read`, confirm `read_at` populates.
7. Click reply — confirm `mailto:` opens.

- [ ] **Step 6: Submit `/contact` page form**

Verify the full contact form ALSO writes to `prospect_inquiries` with `source='contact_form'`.

- [ ] **Step 7: Suppression check in prod**

- https://demandsignals.co/contact — band absent
- https://demandsignals.co/ — band present
- A magic-link doc page (use a real SOW or invoice link) — band absent

If all pass, Project #2 is shipped.

---

## Self-Review

**Spec coverage check** (each spec section → task that implements it):

| Spec section | Implementing task(s) |
|---|---|
| §1 Problem | (motivation only) |
| §2 Locked decisions #1 (endpoint strategy) | Tasks 6, 7, 8 |
| §2 #2 (prospect resolution) | Task 3 (RPC) |
| §2 #3 (auto-create tagging) | Task 3 (RPC) |
| §2 #4 (form fields) | Task 9 |
| §2 #5 (placement + suppression) | Task 10 |
| §2 #6 (cookie promotion) | Task 6 |
| §2 #7 (page_visits write) | Task 6 |
| §2 #8 (email + SMS fan-out) | Task 6 |
| §2 #9 (honeypot) | Tasks 7, 8 |
| §2 #10 (idempotency = none + rate limit) | Tasks 7, 8 (apiGuard) |
| §2 #11 (dashboard integration) | Tasks 14, 15, 16, 17, 18 |
| §2 #12 (mailto reply placeholder) | Task 15 |
| §3 Visual treatment | Task 9 |
| §3.3 Suppression list | Task 10 |
| §4.1 prospect_inquiries table | Task 1 |
| §4.2 prospects timestamps | Task 2 |
| §4.3 Migration naming | Tasks 1, 2, 3, 4 |
| §5.1 Request contract | Tasks 7, 9 |
| §5.2 Pipeline | Task 6 |
| §5.3 Atomicity (RPC) | Task 3 |
| §5.4 /api/contact refactor | Task 8 |
| §6.1 Admin routes | Tasks 14, 15 |
| §6.2 Sidebar | Task 16 |
| §6.3 Dashboard tile | Task 17 |
| §6.4 Prospect detail integration | Task 18 |
| §6.5 API routes | Tasks 12, 13 |
| §7 Failure modes | Tasks 3, 6, 7 (each handler) |
| §8 Files added/changed | All tasks |
| §9 Forward-compat hooks for #3 | Tasks 1 (responded_at, email_send_id), 15 (mailto placeholder + reserved slot) |
| §10 Out of scope (stub specs) | Already shipped in spec commit |
| §11 Strategic context | (motivation only) |

**Placeholder scan:** searched plan for "TBD", "TODO", "fill in", "similar to" — none remain. All steps include the actual code.

**Type consistency:** `recordInquiry()` returns `{ ok, inquiry_id, prospect_id, attribution_source, error }`. Used consistently in Tasks 7 and 8. RPC return columns match the type cast in Task 6 (`RpcRow`). `sendEmail()` `SendEmailResult.send_id` matches the property accessed in Task 6.

All gaps closed. Plan is ready.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-27-quick-inquiry-form-plan.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task with two-stage review between tasks. Best for: tight feedback loop, easy course-correct, isolation between tasks.

**2. Inline Execution** — execute tasks in this session using executing-plans, batched with checkpoints for review. Best for: one continuous run with shared context.

Which approach?
