# Resend Swap + Email + Page Tracking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 5 nodemailer call sites with Resend SDK behind a single helper. Add full email engagement tracking (Resend webhook → DB). Add prospect attribution + page-visit logging on DSIG-domain magic-link pages. All failures land in a `system_notifications` table + alert email to gmail.

**Architecture:** New shared helpers in `src/lib/` (system-alerts, email-engagement, attribution-cookie, page-tracking, email) feed three new tables (system_notifications, email_engagement, page_visits). Resend with SMTP fallback. JWT cookie for prospect attribution. Webhook + page-visit logging close the engagement loop.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + service role), Resend SDK + nodemailer fallback, `jose` for HS256 JWT cookies.

**Spec:** `docs/superpowers/specs/2026-04-27-resend-email-swap-design.md`

---

## Task 1: Read spec + verify baseline

**Files:** none modified

- [ ] **Step 1: Read the full spec**

Read `docs/superpowers/specs/2026-04-27-resend-email-swap-design.md` end-to-end. Pay special attention to:
- §3 Per-purpose from addresses
- §4 Architecture (sub-sections 4.1 through 4.8)
- §5 Data model (3 new tables)
- §6 Caller migration matrix
- §10 Smoke tests

- [ ] **Step 2: Read CLAUDE.md sections referenced in this plan**

Read in `CLAUDE.md`:
- §4 (credentials)
- §12 (lessons learned — esp. Supabase schema cache, zod v4 rename)
- §15 (env vars)
- §18 (domain architecture — for cookie scope rationale)
- §19 (R2 — not used here, but useful context)

- [ ] **Step 3: Verify clean working tree**

Run:
```bash
cd "D:\CLAUDE\demandsignals-next"
git status --short | grep -v "^??" | head -10
git rev-parse --abbrev-ref HEAD
```
Expected: no tracked changes; on `master`.

- [ ] **Step 4: Verify TypeScript baseline is clean**

Run:
```bash
cd "D:\CLAUDE\demandsignals-next"
npx tsc --noEmit 2>&1 | tail -10
```
Expected: zero output (no errors). If errors, STOP and fix or report — do NOT proceed.

---

## Task 2: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install resend + jose**

Run:
```bash
cd "D:\CLAUDE\demandsignals-next"
npm install resend jose
```
Expected: success. `package.json` now lists both.

- [ ] **Step 2: Verify versions**

Run:
```bash
cd "D:\CLAUDE\demandsignals-next"
node -e "console.log('resend', require('resend/package.json').version); console.log('jose', require('jose/package.json').version);"
```
Expected: resend ≥ 4.x, jose ≥ 5.x. If older, that's fine; APIs are stable across recent majors.

- [ ] **Step 3: Commit**

```bash
cd "D:\CLAUDE\demandsignals-next"
git add package.json package-lock.json
git commit -m "feat(deps): add resend SDK + jose for JWT cookie signing

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Migration 026 — system_notifications

**Files:**
- Create: `supabase/migrations/026_system_notifications.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/026_system_notifications.sql`:
```sql
-- ── 026_system_notifications.sql ────────────────────────────────────
-- System-wide notification log. Surfaces failures (and notable events)
-- from any subsystem to a future Command Center "Messages" screen.
-- See docs/superpowers/specs/2026-04-27-resend-email-swap-design.md §5.1.

CREATE TABLE IF NOT EXISTS system_notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity         TEXT NOT NULL CHECK (severity IN ('info','warning','error','critical')),
  source           TEXT NOT NULL,                     -- 'email','stripe','cron','auth','manual',...
  title            TEXT NOT NULL,                     -- one-line summary
  body             TEXT,                              -- detail/stack trace
  context          JSONB NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_at  TIMESTAMPTZ,
  acknowledged_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  emailed_at       TIMESTAMPTZ,                       -- when alert email was sent (NULL if blocked or failed)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_notifications_unread
  ON system_notifications (severity, created_at DESC)
  WHERE acknowledged_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_system_notifications_source
  ON system_notifications (source, created_at DESC);

-- Used by alert-email throttle logic in src/lib/system-alerts.ts.
CREATE INDEX IF NOT EXISTS idx_system_notifications_throttle
  ON system_notifications (source, (context->>'error_code'), emailed_at)
  WHERE emailed_at IS NOT NULL;

ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;
-- service_role only; admin RLS policy added when Command Center UI lands.
```

- [ ] **Step 2: Verify file syntax**

Read the file you just wrote, confirm no typos. Specifically check:
- All semicolons present
- CHECK constraint values match spec (`'info','warning','error','critical'`)
- JSONB default is valid syntax

- [ ] **Step 3: Commit**

```bash
cd "D:\CLAUDE\demandsignals-next"
git add supabase/migrations/026_system_notifications.sql
git commit -m "feat(db): migration 026 — system_notifications table

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Migration 027 — email_engagement

**Files:**
- Create: `supabase/migrations/027_email_engagement.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/027_email_engagement.sql`:
```sql
-- ── 027_email_engagement.sql ────────────────────────────────────────
-- Tracks every email send + every Resend webhook event + every
-- magic-link page click. Per-document timeline queries via FK indexes.
-- See spec §5.2.

CREATE TABLE IF NOT EXISTS email_engagement (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id              UUID NOT NULL,                 -- groups all events for one send
  resend_message_id    TEXT,                          -- Resend's id; NULL for SMTP-fallback sends
  kind                 TEXT NOT NULL,                 -- EmailKind: invoice, contact_form, etc.
  event_type           TEXT NOT NULL CHECK (event_type IN (
    'sent','delivered','opened','clicked','bounced','complained','delivery_delayed','page_visit','failed'
  )),
  to_address           TEXT,                          -- primary recipient (lowercased)
  subject              TEXT,                          -- snapshot at send time
  -- Optional FK to source documents. Exactly one of these is typically set.
  invoice_id           UUID REFERENCES invoices(id) ON DELETE SET NULL,
  sow_document_id      UUID REFERENCES sow_documents(id) ON DELETE SET NULL,
  receipt_id           UUID REFERENCES receipts(id) ON DELETE SET NULL,
  prospect_id          UUID REFERENCES prospects(id) ON DELETE SET NULL,
  -- Event-specific data (clicked_url, bounce_reason, ip, user_agent, etc.)
  event_data           JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency: same Resend webhook event delivered twice → no duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_email_engagement_resend_event
  ON email_engagement (resend_message_id, event_type, occurred_at)
  WHERE resend_message_id IS NOT NULL;

-- Per-document timeline lookups
CREATE INDEX IF NOT EXISTS idx_email_engagement_invoice
  ON email_engagement (invoice_id, occurred_at DESC) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_engagement_sow
  ON email_engagement (sow_document_id, occurred_at DESC) WHERE sow_document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_engagement_prospect
  ON email_engagement (prospect_id, occurred_at DESC) WHERE prospect_id IS NOT NULL;

-- Send-grouping lookup
CREATE INDEX IF NOT EXISTS idx_email_engagement_send_id
  ON email_engagement (send_id, occurred_at DESC);

-- Future alerting queries (e.g. "invoices sent but never opened in 7d")
CREATE INDEX IF NOT EXISTS idx_email_engagement_kind_event_time
  ON email_engagement (kind, event_type, occurred_at DESC);

ALTER TABLE email_engagement ENABLE ROW LEVEL SECURITY;
-- service_role only; admin RLS policy added when UI surface lands.
```

- [ ] **Step 2: Commit**

```bash
cd "D:\CLAUDE\demandsignals-next"
git add supabase/migrations/027_email_engagement.sql
git commit -m "feat(db): migration 027 — email_engagement table

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Migration 028 — page_visits

**Files:**
- Create: `supabase/migrations/028_page_visits.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/028_page_visits.sql`:
```sql
-- ── 028_page_visits.sql ─────────────────────────────────────────────
-- Logs every magic-link page visit on DSIG-domain pages. Three-layer
-- attribution: UUID > cookie > IP+UA. See spec §5.3.

CREATE TABLE IF NOT EXISTS page_visits (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url                 TEXT NOT NULL,
  page_type                TEXT NOT NULL CHECK (page_type IN (
    'invoice','sow','quote','receipt','marketing','admin','other'
  )),
  -- Direct document linkage (one of, may be null for marketing visits)
  invoice_id               UUID REFERENCES invoices(id) ON DELETE SET NULL,
  sow_document_id          UUID REFERENCES sow_documents(id) ON DELETE SET NULL,
  receipt_id               UUID REFERENCES receipts(id) ON DELETE SET NULL,
  quote_session_id         UUID REFERENCES quote_sessions(id) ON DELETE SET NULL,
  -- Attribution
  prospect_id              UUID REFERENCES prospects(id) ON DELETE SET NULL,
  attribution_source       TEXT CHECK (attribution_source IN ('uuid','cookie','none')),
  -- Tracking context
  email_send_id            UUID,                                  -- from ?e= query param
  ip                       INET,
  user_agent               TEXT,
  referer                  TEXT,
  -- Future enrichment columns (populated by Project #1.5)
  ip_country               TEXT,
  ip_region                TEXT,
  ip_city                  TEXT,
  occurred_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-prospect timeline lookup (most common query)
CREATE INDEX IF NOT EXISTS idx_page_visits_prospect_time
  ON page_visits (prospect_id, occurred_at DESC) WHERE prospect_id IS NOT NULL;

-- Per-document timeline lookups
CREATE INDEX IF NOT EXISTS idx_page_visits_invoice
  ON page_visits (invoice_id, occurred_at DESC) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_visits_sow
  ON page_visits (sow_document_id, occurred_at DESC) WHERE sow_document_id IS NOT NULL;

-- IP-based grouping (e.g. office IP showing multiple prospects)
CREATE INDEX IF NOT EXISTS idx_page_visits_ip_time
  ON page_visits (ip, occurred_at DESC);

-- Send-correlation lookups
CREATE INDEX IF NOT EXISTS idx_page_visits_send
  ON page_visits (email_send_id) WHERE email_send_id IS NOT NULL;

ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;
-- service_role only; admin RLS policy added when UI surface lands.
```

- [ ] **Step 2: Commit**

```bash
cd "D:\CLAUDE\demandsignals-next"
git add supabase/migrations/028_page_visits.sql
git commit -m "feat(db): migration 028 — page_visits table

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Bundled APPLY file + run in Supabase

**Files:**
- Create: `supabase/migrations/APPLY-026-027-028-2026-04-27.sql`

- [ ] **Step 1: Create bundled apply file**

Create `supabase/migrations/APPLY-026-027-028-2026-04-27.sql` by concatenating the three migrations from Tasks 3–5 above, with this header:

```sql
-- ════════════════════════════════════════════════════════════════════
-- APPLY-026-027-028-2026-04-27.sql
-- Run in Supabase SQL Editor (web) to apply migrations 026, 027, 028.
-- Idempotent: each block uses IF NOT EXISTS guards.
--
-- Adds:
--   • system_notifications table (subsystem failure log)
--   • email_engagement table (every send + Resend webhook event + page visit cross-ref)
--   • page_visits table (DSIG-domain magic-link page tracking with 3-layer attribution)
-- ════════════════════════════════════════════════════════════════════

```

Then paste the full contents of `026_system_notifications.sql`, `027_email_engagement.sql`, `028_page_visits.sql` in that order. Strip the duplicate `-- ── ... ────` header banners; keep the table comments.

- [ ] **Step 2: Hand off to Hunter to apply**

This step requires Hunter (the user) to run the SQL in Supabase SQL Editor for project `uoekjqkawssbskfkziwz`. Pause and message:

> Please open Supabase SQL Editor → paste the contents of `supabase/migrations/APPLY-026-027-028-2026-04-27.sql` → run. Then paste this verification:
> ```sql
> SELECT table_name FROM information_schema.tables
> WHERE table_schema='public'
>   AND table_name IN ('system_notifications','email_engagement','page_visits')
> ORDER BY table_name;
> ```
> Expected: 3 rows.
>
> After verification, wait 30 seconds for PostgREST schema cache refresh (per CLAUDE.md §12), then reply "applied."

- [ ] **Step 3: Commit**

```bash
cd "D:\CLAUDE\demandsignals-next"
git add supabase/migrations/APPLY-026-027-028-2026-04-27.sql
git commit -m "feat(db): bundled APPLY for migrations 026/027/028

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Update src/lib/constants.ts with email constants

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Read existing constants.ts**

Read the file end-to-end so the additions follow existing conventions (export style, grouping, comments).

- [ ] **Step 2: Append email constants**

Append to the end of `src/lib/constants.ts`:

```ts
// ── Email senders (Resend per-purpose aliases) ──────────────────────
// See docs/superpowers/specs/2026-04-27-resend-email-swap-design.md §3.

export const EMAIL_FROM = {
  invoice:           'Demand Signals <invoices@demandsignals.co>',
  contact_form:      'Demand Signals <noreply@demandsignals.co>',
  newsletter:        'Demand Signals <news@demandsignals.co>',
  report_request:    'Demand Signals <reports@demandsignals.co>',
  weekly_analytics:  'Demand Signals <reports@demandsignals.co>',
  system_alert:      'Demand Signals Alerts <alerts@demandsignals.co>',
} as const

export type EmailKind = keyof typeof EMAIL_FROM

export const EMAIL_REPLY_TO: Partial<Record<EmailKind, string>> = {
  invoice: 'hunter@demandsignals.co',
}

// Kinds that auto-BCC the archive address. Mixed-kind callers (like
// report_request) pass isClientFacing:true at call time instead.
export const CLIENT_FACING_KINDS: ReadonlySet<EmailKind> = new Set<EmailKind>([
  'invoice',
])
```

- [ ] **Step 3: TypeScript check**

```bash
cd "D:\CLAUDE\demandsignals-next"
npx tsc --noEmit 2>&1 | tail -5
```
Expected: zero output.

- [ ] **Step 4: Commit**

```bash
cd "D:\CLAUDE\demandsignals-next"
git add src/lib/constants.ts
git commit -m "feat(constants): EMAIL_FROM, EMAIL_REPLY_TO, CLIENT_FACING_KINDS

Per spec §3 + §4.3.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Create src/lib/system-alerts.ts

**Files:**
- Create: `src/lib/system-alerts.ts`

- [ ] **Step 1: Create the file**

Create `src/lib/system-alerts.ts`:

```ts
// ── system-alerts.ts ────────────────────────────────────────────────
// Writes to system_notifications + sends throttled alert email.
// Used by every subsystem that can fail in a way the admin should know about.
// See spec §4.2.
//
// Bootstrap caveat: this module sends alert emails via SMTP directly (NOT
// via @/lib/email) because:
//   1. Avoids circular dependency (email.ts also calls notify() on failure)
//   2. Avoids infinite loop if the alert send itself fails

import nodemailer from 'nodemailer'
import { supabaseAdmin } from '@/lib/supabase/admin'

export interface NotifyArgs {
  severity: 'info' | 'warning' | 'error' | 'critical'
  source: string                     // 'email', 'stripe', 'cron', 'auth', etc.
  title: string                      // one-line summary
  body?: string                      // detail or stack trace
  context?: Record<string, unknown>  // structured data
  emailAlert?: boolean               // default true
}

const ALERT_EMAIL = process.env.ALERT_EMAIL || 'DemandSignals@gmail.com'
const ALERT_FROM_FALLBACK = process.env.SMTP_USER || 'DemandSignals@gmail.com'

let smtpTransporter: nodemailer.Transporter | null = null
function smtp(): nodemailer.Transporter | null {
  if (smtpTransporter) return smtpTransporter
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null
  smtpTransporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: parseInt(process.env.SMTP_PORT ?? '587') === 465,
    auth: { user, pass },
  })
  return smtpTransporter
}

/**
 * Write a system_notifications row + (unless suppressed) send a throttled
 * alert email to ALERT_EMAIL. Never throws — failures are console.error'd.
 *
 * Throttle: dedupe alert emails per (source, error_code) per 60-second window.
 * DB rows are always written; only the email is throttled.
 */
export async function notify(args: NotifyArgs): Promise<void> {
  const ctx = args.context ?? {}
  const errorCode = String(ctx.error_code ?? 'none')

  // 1. INSERT system_notifications row (best-effort)
  let insertedId: string | null = null
  try {
    const { data, error } = await supabaseAdmin
      .from('system_notifications')
      .insert({
        severity: args.severity,
        source: args.source,
        title: args.title,
        body: args.body ?? null,
        context: ctx,
      })
      .select('id')
      .single()
    if (error) {
      console.error('[notify] insert failed:', error.message)
    } else {
      insertedId = data?.id ?? null
    }
  } catch (e) {
    console.error('[notify] insert threw:', e instanceof Error ? e.message : e)
  }

  // 2. Skip email if explicitly suppressed
  if (args.emailAlert === false) return

  // 3. Throttle check: skip if a row in the same (source, error_code) bucket
  //    was emailed within the past 60 seconds.
  let throttled = false
  try {
    const { data } = await supabaseAdmin
      .from('system_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('source', args.source)
      .eq('context->>error_code', errorCode)
      .gte('emailed_at', new Date(Date.now() - 60_000).toISOString())
    // PostgREST returns count via res.count when head:true; use boolean fallback.
    throttled = ((data as unknown as { length?: number })?.length ?? 0) > 0
  } catch (e) {
    // Throttle query failure → default to send (false-positive is better than silent)
    console.warn('[notify] throttle query failed; sending alert anyway:', e)
    throttled = false
  }
  if (throttled) return

  // 4. Send alert email via SMTP (never via Resend — avoids loop)
  const transporter = smtp()
  if (!transporter) {
    console.error('[notify] SMTP not configured; alert email NOT sent. Notification persisted to DB.')
    return
  }

  const subject = `[${args.severity}] [${args.source}] ${args.title}`
  const ctxJson = JSON.stringify(ctx, null, 2)
  const text = `Severity: ${args.severity}
Source: ${args.source}
Title: ${args.title}

Body:
${args.body ?? '(none)'}

Context:
${ctxJson}

Notification ID: ${insertedId ?? '(insert failed)'}
Time: ${new Date().toISOString()}
`

  try {
    await transporter.sendMail({
      from: `Demand Signals Alerts <${ALERT_FROM_FALLBACK}>`,
      to: ALERT_EMAIL,
      subject,
      text,
    })
    // 5. Stamp emailed_at on the inserted row
    if (insertedId) {
      await supabaseAdmin
        .from('system_notifications')
        .update({ emailed_at: new Date().toISOString() })
        .eq('id', insertedId)
    }
  } catch (e) {
    // Last-resort log. The DB row is the only signal now.
    console.error('[notify] alert email send failed:', e instanceof Error ? e.message : e)
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "D:\CLAUDE\demandsignals-next"
npx tsc --noEmit 2>&1 | tail -5
```
Expected: zero output.

- [ ] **Step 3: Commit**

```bash
cd "D:\CLAUDE\demandsignals-next"
git add src/lib/system-alerts.ts
git commit -m "feat(system-alerts): notify() helper writes DB row + throttled SMTP alert

Per spec §4.2. Uses SMTP directly (not @/lib/email) to avoid circular
dependency and infinite-loop risk on alert-email failure.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Create src/lib/email-engagement.ts

**Files:**
- Create: `src/lib/email-engagement.ts`

- [ ] **Step 1: Create the file**

Create `src/lib/email-engagement.ts`:

```ts
// ── email-engagement.ts ─────────────────────────────────────────────
// Write helpers for the email_engagement table.
// See spec §4.4 + §5.2.

import { supabaseAdmin } from '@/lib/supabase/admin'
import type { EmailKind } from '@/lib/constants'

export interface RecordSendArgs {
  send_id: string                  // pre-generated UUID from sendEmail caller
  resend_message_id?: string | null
  kind: EmailKind
  to_address: string
  subject: string
  invoice_id?: string | null
  sow_document_id?: string | null
  receipt_id?: string | null
  prospect_id?: string | null
}

/**
 * Insert a 'sent' event row. Best-effort; failure is logged, never thrown.
 */
export async function recordSend(args: RecordSendArgs): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('email_engagement').insert({
      send_id: args.send_id,
      resend_message_id: args.resend_message_id ?? null,
      kind: args.kind,
      event_type: 'sent',
      to_address: args.to_address.toLowerCase(),
      subject: args.subject,
      invoice_id: args.invoice_id ?? null,
      sow_document_id: args.sow_document_id ?? null,
      receipt_id: args.receipt_id ?? null,
      prospect_id: args.prospect_id ?? null,
      event_data: {},
    })
    if (error) console.error('[recordSend] insert failed:', error.message)
  } catch (e) {
    console.error('[recordSend] threw:', e instanceof Error ? e.message : e)
  }
}

export interface RecordWebhookEventArgs {
  resend_message_id: string
  event_type:
    | 'delivered'
    | 'opened'
    | 'clicked'
    | 'bounced'
    | 'complained'
    | 'delivery_delayed'
    | 'failed'
  occurred_at: string              // ISO timestamp from Resend payload
  event_data: Record<string, unknown>
}

/**
 * Insert a webhook-triggered event row. Idempotent via UNIQUE constraint
 * on (resend_message_id, event_type, occurred_at). On UNIQUE violation,
 * silently no-ops (this is the duplicate-delivery case).
 *
 * Looks up the originating send to copy send_id, kind, FK linkages onto
 * the new row so per-document timeline queries work without joins.
 */
export async function recordWebhookEvent(args: RecordWebhookEventArgs): Promise<void> {
  // Fetch the originating 'sent' row to copy linkage columns.
  const { data: origin } = await supabaseAdmin
    .from('email_engagement')
    .select('send_id, kind, to_address, subject, invoice_id, sow_document_id, receipt_id, prospect_id')
    .eq('resend_message_id', args.resend_message_id)
    .eq('event_type', 'sent')
    .maybeSingle()

  if (!origin) {
    console.warn(
      `[recordWebhookEvent] no originating 'sent' row for resend_message_id=${args.resend_message_id}; ` +
        `inserting orphan row`,
    )
  }

  try {
    const { error } = await supabaseAdmin.from('email_engagement').insert({
      send_id: origin?.send_id ?? crypto.randomUUID(),  // orphan gets fresh send_id
      resend_message_id: args.resend_message_id,
      kind: origin?.kind ?? 'invoice',                  // best-effort default for orphans
      event_type: args.event_type,
      to_address: origin?.to_address ?? null,
      subject: origin?.subject ?? null,
      invoice_id: origin?.invoice_id ?? null,
      sow_document_id: origin?.sow_document_id ?? null,
      receipt_id: origin?.receipt_id ?? null,
      prospect_id: origin?.prospect_id ?? null,
      event_data: args.event_data,
      occurred_at: args.occurred_at,
    })
    if (error) {
      // 23505 = unique_violation (duplicate webhook delivery — expected)
      if (error.code === '23505') return
      console.error('[recordWebhookEvent] insert failed:', error.message)
    }
  } catch (e) {
    console.error('[recordWebhookEvent] threw:', e instanceof Error ? e.message : e)
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "D:\CLAUDE\demandsignals-next"
npx tsc --noEmit 2>&1 | tail -5
```
Expected: zero output.

- [ ] **Step 3: Commit**

```bash
cd "D:\CLAUDE\demandsignals-next"
git add src/lib/email-engagement.ts
git commit -m "feat(email-engagement): recordSend + recordWebhookEvent helpers

Per spec §4.4 + §5.2. Idempotent webhook inserts via UNIQUE constraint;
copies linkage columns from originating 'sent' row to enable per-document
timeline queries without joins.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Create src/lib/attribution-cookie.ts

**Files:**
- Create: `src/lib/attribution-cookie.ts`

- [ ] **Step 1: Create the file**

Create `src/lib/attribution-cookie.ts`:

```ts
// ── attribution-cookie.ts ───────────────────────────────────────────
// Sign + verify the dsig_attr JWT cookie used for prospect attribution.
// See spec §4.6.

import { SignJWT, jwtVerify } from 'jose'

const COOKIE_NAME = 'dsig_attr'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 // 1 year
const ALG = 'HS256'

function getSecret(): Uint8Array | null {
  const secret = process.env.ATTRIBUTION_COOKIE_SECRET
  if (!secret) return null
  return new TextEncoder().encode(secret)
}

export interface AttributionPayload {
  pid: string  // prospect_id UUID
  iat?: number
  exp?: number
}

/**
 * Sign an HS256 JWT with the prospect_id. Returns the cookie value string,
 * or null if ATTRIBUTION_COOKIE_SECRET is missing (caller should skip).
 */
export async function signAttributionCookie(prospectId: string): Promise<string | null> {
  const secret = getSecret()
  if (!secret) return null
  const jwt = await new SignJWT({ pid: prospectId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE_SECONDS}s`)
    .sign(secret)
  return jwt
}

/**
 * Verify an HS256 JWT cookie value. Returns the payload on success,
 * or null on any failure (bad signature, expired, malformed, missing secret).
 * NEVER throws.
 */
export async function verifyAttributionCookie(
  cookieValue: string | undefined,
): Promise<AttributionPayload | null> {
  if (!cookieValue) return null
  const secret = getSecret()
  if (!secret) return null
  try {
    const { payload } = await jwtVerify(cookieValue, secret, { algorithms: [ALG] })
    if (typeof payload.pid !== 'string') return null
    return payload as unknown as AttributionPayload
  } catch {
    return null
  }
}

/**
 * Cookie attributes for setting via response headers. Spread into a Set-Cookie value.
 */
export const ATTRIBUTION_COOKIE_OPTIONS = {
  name: COOKIE_NAME,
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  domain: '.demandsignals.co',  // covers all subdomains per RFC 6265
  path: '/',
  maxAge: COOKIE_MAX_AGE_SECONDS,
}

export const ATTRIBUTION_COOKIE_NAME = COOKIE_NAME
```

- [ ] **Step 2: TypeScript check**

```bash
cd "D:\CLAUDE\demandsignals-next"
npx tsc --noEmit 2>&1 | tail -5
```
Expected: zero output.

- [ ] **Step 3: Commit**

```bash
cd "D:\CLAUDE\demandsignals-next"
git add src/lib/attribution-cookie.ts
git commit -m "feat(attribution): sign/verify HS256 dsig_attr JWT cookie

Per spec §4.6. Uses jose library. Domain=.demandsignals.co covers all
subdomains. Verify never throws — bad signatures treated as absent cookie.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Create src/lib/page-tracking.ts

**Files:**
- Create: `src/lib/page-tracking.ts`

- [ ] **Step 1: Create the file**

Create `src/lib/page-tracking.ts`:

```ts
// ── page-tracking.ts ────────────────────────────────────────────────
// logPageVisit: server-component helper that writes a page_visits row
// with three-layer prospect attribution. See spec §4.7.

import { headers, cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notify } from '@/lib/system-alerts'
import {
  ATTRIBUTION_COOKIE_NAME,
  signAttributionCookie,
  verifyAttributionCookie,
  ATTRIBUTION_COOKIE_OPTIONS,
} from '@/lib/attribution-cookie'

export type PageType = 'invoice' | 'sow' | 'quote' | 'receipt' | 'marketing' | 'admin' | 'other'

export interface LogPageVisitArgs {
  page_url: string
  page_type: PageType
  invoice_id?: string
  sow_document_id?: string
  receipt_id?: string
  quote_session_id?: string
  attributed_prospect_id?: string  // direct from magic-link UUID lookup
  email_send_id?: string           // from ?e= query param
}

export interface LogPageVisitResult {
  visit_id: string | null
  prospect_id: string | null
  attribution_source: 'uuid' | 'cookie' | 'none'
}

/**
 * Logs a page_visits row. Reads request headers + cookies via Next.js
 * server-side APIs (only callable from server components / route handlers).
 *
 * Returns the visit id + resolved prospect_id + attribution source so callers
 * can take downstream actions (e.g. set the cookie via response headers).
 *
 * Never throws — failures notify(severity:'warning') and return null visit_id.
 */
export async function logPageVisit(args: LogPageVisitArgs): Promise<LogPageVisitResult> {
  const h = await headers()
  const c = await cookies()

  // Extract IP + UA + referer
  const fwd = h.get('x-forwarded-for')
  const ip = fwd ? fwd.split(',')[0].trim() : (h.get('x-real-ip') ?? null)
  const user_agent = h.get('user-agent') ?? null
  const referer = h.get('referer') ?? null

  // Read + verify attribution cookie
  const cookieValue = c.get(ATTRIBUTION_COOKIE_NAME)?.value
  const cookiePayload = await verifyAttributionCookie(cookieValue)
  const cookiePid = cookiePayload?.pid ?? null

  // Resolve final prospect_id + attribution source
  let prospect_id: string | null = null
  let attribution_source: 'uuid' | 'cookie' | 'none' = 'none'
  if (args.attributed_prospect_id) {
    prospect_id = args.attributed_prospect_id
    attribution_source = 'uuid'
  } else if (cookiePid) {
    prospect_id = cookiePid
    attribution_source = 'cookie'
  }

  // Insert page_visits row (best-effort)
  let visit_id: string | null = null
  try {
    const { data, error } = await supabaseAdmin
      .from('page_visits')
      .insert({
        page_url: args.page_url,
        page_type: args.page_type,
        invoice_id: args.invoice_id ?? null,
        sow_document_id: args.sow_document_id ?? null,
        receipt_id: args.receipt_id ?? null,
        quote_session_id: args.quote_session_id ?? null,
        prospect_id,
        attribution_source,
        email_send_id: args.email_send_id ?? null,
        ip,
        user_agent,
        referer,
      })
      .select('id')
      .single()
    if (error) {
      await notify({
        severity: 'warning',
        source: 'page_tracking',
        title: 'page_visits insert failed',
        body: error.message,
        context: { page_url: args.page_url, page_type: args.page_type },
      })
    } else {
      visit_id = data?.id ?? null
    }
  } catch (e) {
    console.error('[logPageVisit] threw:', e instanceof Error ? e.message : e)
  }

  return { visit_id, prospect_id, attribution_source }
}

/**
 * Issue a fresh attribution cookie for the given prospect_id.
 * Returns the Set-Cookie header value, or null if signing failed
 * (e.g. ATTRIBUTION_COOKIE_SECRET missing).
 *
 * Caller is responsible for attaching this to the response — server
 * components in Next.js 16 can't directly set cookies, so we return the
 * value for the caller to wire up via middleware OR they can call
 * cookies().set() in a Server Action / Route Handler.
 *
 * For server components that just want fire-and-forget cookie set,
 * use cookies().set() directly with the result of buildAttributionCookieParts().
 */
export async function buildAttributionCookieParts(
  prospectId: string,
): Promise<{ name: string; value: string; options: typeof ATTRIBUTION_COOKIE_OPTIONS } | null> {
  const value = await signAttributionCookie(prospectId)
  if (!value) return null
  return { name: ATTRIBUTION_COOKIE_NAME, value, options: ATTRIBUTION_COOKIE_OPTIONS }
}

/**
 * Returns true when the resolved prospect_id should overwrite the cookie's
 * current pid (UUID attribution wins; new attribution wins over absent cookie).
 */
export function shouldPromoteCookie(
  attribution_source: 'uuid' | 'cookie' | 'none',
  newProspectId: string | null,
  cookiePid: string | null,
): boolean {
  if (attribution_source !== 'uuid') return false
  if (!newProspectId) return false
  return newProspectId !== cookiePid
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "D:\CLAUDE\demandsignals-next"
npx tsc --noEmit 2>&1 | tail -10
```
Expected: zero output.

- [ ] **Step 3: Commit**

```bash
cd "D:\CLAUDE\demandsignals-next"
git add src/lib/page-tracking.ts
git commit -m "feat(page-tracking): logPageVisit with 3-layer prospect attribution

Per spec §4.7. Server-component helper. Reads IP + UA + referer + cookie,
resolves prospect_id via UUID > cookie > none, inserts page_visits row.
Never throws; failures notify(severity:'warning').

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Create src/lib/email.ts (the new shared sender)

**Files:**
- Create: `src/lib/email.ts`

- [ ] **Step 1: Create the file**

Create `src/lib/email.ts`:

```ts
// ── email.ts ────────────────────────────────────────────────────────
// Single shared sender for all outbound mail. Resend SDK with SMTP
// fallback. Auto-BCC for client-facing kinds. Writes engagement rows.
// See spec §4.1 + §4.3 + §4.5.

import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import {
  EMAIL_FROM,
  EMAIL_REPLY_TO,
  CLIENT_FACING_KINDS,
  type EmailKind,
} from '@/lib/constants'
import { notify } from '@/lib/system-alerts'
import { recordSend } from '@/lib/email-engagement'

export interface SendEmailAttachment {
  filename: string
  content: Buffer
  contentType?: string
}

export interface SendEmailArgs {
  to: string | string[]
  kind: EmailKind
  subject: string
  html: string
  text?: string
  bcc?: string | string[]
  attachments?: SendEmailAttachment[]
  /** Skip alert-on-failure to break loops (used by system-alerts only). */
  suppressAlerts?: boolean
  /** Forces BCC archive on for mixed-kind callers like report_request. */
  isClientFacing?: boolean
  /**
   * Pre-generated send_id (UUID). Used when caller embeds ?e=<send_id>
   * in the email body. If omitted, sendEmail() generates one.
   */
  send_id?: string
  /** Optional FK linkage for the email_engagement 'sent' row. */
  link?: {
    invoice_id?: string
    sow_document_id?: string
    receipt_id?: string
    prospect_id?: string
  }
}

export interface SendEmailResult {
  success: boolean
  message_id?: string
  resend_message_id?: string
  send_id?: string
  provider: 'resend' | 'smtp' | 'none'
  error?: string
}

const ARCHIVE_BCC = process.env.ARCHIVE_BCC || 'DemandSignals@gmail.com'

// ── Internal helpers ────────────────────────────────────────────────

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

function mergeBcc(callerBcc: string | string[] | undefined, archive: string | null): string[] {
  const set = new Set<string>()
  for (const a of asArray(callerBcc)) set.add(a.toLowerCase())
  if (archive) set.add(archive.toLowerCase())
  return Array.from(set)
}

let resendClient: Resend | null = null
function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!resendClient) resendClient = new Resend(key)
  return resendClient
}

let smtpTransporter: nodemailer.Transporter | null = null
function smtp(): nodemailer.Transporter | null {
  if (smtpTransporter) return smtpTransporter
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null
  smtpTransporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: parseInt(process.env.SMTP_PORT ?? '587') === 465,
    auth: { user, pass },
  })
  return smtpTransporter
}

// ── Main export ─────────────────────────────────────────────────────

/**
 * Send an email via Resend (preferred) or SMTP (fallback).
 * NEVER throws; always returns a result.
 *
 * Behavior:
 *   - Resolves from + reply-to from EMAIL_FROM[kind] / EMAIL_REPLY_TO[kind]
 *   - Auto-BCC archive for client-facing kinds
 *   - On Resend success: returns provider='resend' + records 'sent' engagement row
 *   - On Resend failure: notifies + falls through to SMTP
 *   - On SMTP success after Resend missing: notifies severity='info' (loud-warning fallback)
 *   - On both failed: notifies severity='critical' + returns provider='none'
 */
export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const send_id = args.send_id ?? crypto.randomUUID()
  const from = EMAIL_FROM[args.kind]
  const replyTo = EMAIL_REPLY_TO[args.kind]
  const shouldArchive = CLIENT_FACING_KINDS.has(args.kind) || !!args.isClientFacing
  const bccList = mergeBcc(args.bcc, shouldArchive ? ARCHIVE_BCC : null)
  const toList = asArray(args.to)
  const primaryTo = toList[0] ?? ''

  // Prepare engagement-row args used in either branch
  const recordSendOnSuccess = (resendMessageId?: string) =>
    recordSend({
      send_id,
      resend_message_id: resendMessageId ?? null,
      kind: args.kind,
      to_address: primaryTo,
      subject: args.subject,
      invoice_id: args.link?.invoice_id ?? null,
      sow_document_id: args.link?.sow_document_id ?? null,
      receipt_id: args.link?.receipt_id ?? null,
      prospect_id: args.link?.prospect_id ?? null,
    })

  // ── Resend attempt ─────────────────────────────────────────────────
  const resendKeyMissing = !process.env.RESEND_API_KEY
  if (!resendKeyMissing) {
    const r = resend()
    if (r) {
      try {
        const result = await r.emails.send({
          from,
          to: toList,
          bcc: bccList.length > 0 ? bccList : undefined,
          replyTo: replyTo,
          subject: args.subject,
          html: args.html,
          text: args.text,
          attachments: args.attachments?.map((a) => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType,
          })),
        })
        if (result.error) {
          if (!args.suppressAlerts) {
            await notify({
              severity: 'error',
              source: 'email',
              title: `Resend error sending ${args.kind}`,
              body: result.error.message,
              context: { kind: args.kind, to: primaryTo, error_code: result.error.name ?? 'unknown' },
            })
          }
          // Fall through to SMTP
        } else {
          await recordSendOnSuccess(result.data?.id)
          return {
            success: true,
            message_id: result.data?.id,
            resend_message_id: result.data?.id,
            send_id,
            provider: 'resend',
          }
        }
      } catch (e) {
        if (!args.suppressAlerts) {
          await notify({
            severity: 'error',
            source: 'email',
            title: `Resend threw sending ${args.kind}`,
            body: e instanceof Error ? e.message : String(e),
            context: { kind: args.kind, to: primaryTo, error_code: 'resend_threw' },
          })
        }
        // Fall through to SMTP
      }
    }
  }

  // ── SMTP attempt (fallback) ────────────────────────────────────────
  if (resendKeyMissing && !args.suppressAlerts) {
    await notify({
      severity: 'info',
      source: 'email',
      title: 'Resend fallback to SMTP fired',
      body: 'RESEND_API_KEY not set; using nodemailer SMTP fallback.',
      context: { kind: args.kind, to: primaryTo, error_code: 'missing_api_key' },
    })
  }

  const transporter = smtp()
  if (!transporter) {
    if (!args.suppressAlerts) {
      await notify({
        severity: 'critical',
        source: 'email',
        title: 'BOTH email providers unavailable',
        body: 'Resend failed (or missing) AND SMTP not configured. Email NOT sent.',
        context: { kind: args.kind, to: primaryTo, error_code: 'all_providers_down' },
      })
    }
    return {
      success: false,
      provider: 'none',
      send_id,
      error: 'No email provider configured or available',
    }
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: toList,
      bcc: bccList.length > 0 ? bccList : undefined,
      replyTo: replyTo,
      subject: args.subject,
      html: args.html,
      text: args.text,
      attachments: args.attachments,
    })
    await recordSendOnSuccess(undefined)
    return {
      success: true,
      message_id: info.messageId,
      send_id,
      provider: 'smtp',
    }
  } catch (e) {
    if (!args.suppressAlerts) {
      await notify({
        severity: 'critical',
        source: 'email',
        title: `Both Resend AND SMTP failed sending ${args.kind}`,
        body: e instanceof Error ? e.message : String(e),
        context: { kind: args.kind, to: primaryTo, error_code: 'all_providers_failed' },
      })
    }
    return {
      success: false,
      provider: 'none',
      send_id,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "D:\CLAUDE\demandsignals-next"
npx tsc --noEmit 2>&1 | tail -10
```
Expected: zero output.

- [ ] **Step 3: Commit**

```bash
cd "D:\CLAUDE\demandsignals-next"
git add src/lib/email.ts
git commit -m "feat(email): unified sendEmail() with Resend + SMTP fallback

Per spec §4.1, §4.3, §4.5. Auto-BCC client-facing kinds. Records 'sent'
engagement row on success. Notifies on every failure path. Never throws.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Migrate src/lib/invoice-email.ts to sendEmail

**Files:**
- Modify: `src/lib/invoice-email.ts`

- [ ] **Step 1: Read current file**

```bash
cd "D:\CLAUDE\demandsignals-next"
cat src/lib/invoice-email.ts | head -80
```

- [ ] **Step 2: Replace sendInvoiceEmail body**

Replace the entire `sendInvoiceEmail` function (and remove the `smtpTransport`, `let transporter`, and nodemailer import) so the file uses `sendEmail()` instead.

Final state of `src/lib/invoice-email.ts`:

```ts
// ── Invoice email composition + sender ──────────────────────────────
// Uses the unified @/lib/email helper (Resend + SMTP fallback).
// See spec §6.
//
// Kill switch: quote_config.email_delivery_enabled must be 'true'.

import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import type { Invoice } from './invoice-types'

export async function isEmailEnabled(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('quote_config')
    .select('value')
    .eq('key', 'email_delivery_enabled')
    .maybeSingle()
  return data?.value === 'true'
}

export function buildInvoiceEmail(
  invoice: Invoice,
  prospect: { business_name?: string; owner_email?: string | null; owner_name?: string | null },
  send_id?: string,
): { subject: string; html: string; text: string; publicUrl: string } {
  const baseUrl = `https://demandsignals.co/invoice/${invoice.invoice_number}/${invoice.public_uuid}`
  // If a send_id is provided, embed it for tracking (?e=<send_id>).
  const publicUrl = send_id ? `${baseUrl}?e=${send_id}` : baseUrl
  const isZero = invoice.total_due_cents === 0
  const totalStr = `$${(invoice.total_due_cents / 100).toFixed(2)}`
  const firstName = prospect.owner_name?.split(' ')[0] ?? 'there'

  const subject = isZero
    ? `Your complimentary research from Demand Signals — ${invoice.invoice_number}`
    : `Your Demand Signals Invoice — ${invoice.invoice_number}`

  const bodyIntro = isZero
    ? `This is your complimentary research invoice — no payment required.
We're excited to dig into ${prospect.business_name ?? 'your business'} and share what we find.`
    : `Here's your invoice from Demand Signals.

Total due: ${totalStr}${invoice.due_date ? `\nDue date: ${invoice.due_date}` : ''}

You can view the full invoice and pay online at:`

  const text = `Hi ${firstName},

${bodyIntro}

${publicUrl}

Questions? Just reply to this email or call us at (916) 542-2423.

— Hunter
Demand Signals
demandsignals.co
`

  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#333;line-height:1.6;max-width:600px;margin:0 auto;padding:20px;">
  <p>Hi ${firstName},</p>
  <p>${bodyIntro.replace(/\n/g, '<br/>')}</p>
  <p style="text-align:center;margin:32px 0;">
    <a href="${publicUrl}" style="background:#68c5ad;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
      ${isZero ? 'View Invoice' : 'View & Pay Invoice'}
    </a>
  </p>
  <p style="font-size:14px;color:#666;">Questions? Just reply to this email or call (916) 542-2423.</p>
  <p style="font-size:14px;color:#666;">— Hunter<br/>Demand Signals<br/><a href="https://demandsignals.co">demandsignals.co</a></p>
</body></html>`

  return { subject, html, text, publicUrl }
}

export async function sendInvoiceEmail(
  invoice: Invoice,
  to: string,
  prospect: { business_name?: string; owner_email?: string | null; owner_name?: string | null },
  pdfBuffer?: Buffer,
): Promise<{ success: boolean; message_id?: string; error?: string }> {
  if (!(await isEmailEnabled())) {
    return { success: false, error: 'Email delivery disabled in config' }
  }

  // Pre-generate send_id so we can embed ?e=<send_id> in the URL inside the body.
  const send_id = crypto.randomUUID()
  const { subject, html, text } = buildInvoiceEmail(invoice, prospect, send_id)

  const result = await sendEmail({
    to,
    kind: 'invoice',
    subject,
    html,
    text,
    send_id,
    link: {
      invoice_id: invoice.id,
      prospect_id: invoice.prospect_id ?? undefined,
    },
    attachments: pdfBuffer
      ? [
          {
            filename: `Invoice-${invoice.invoice_number}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ]
      : undefined,
  })

  return {
    success: result.success,
    message_id: result.message_id,
    error: result.error,
  }
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd "D:\CLAUDE\demandsignals-next"
npx tsc --noEmit 2>&1 | tail -5
```
Expected: zero output.

- [ ] **Step 4: Commit**

```bash
cd "D:\CLAUDE\demandsignals-next"
git add src/lib/invoice-email.ts
git commit -m "refactor(invoice-email): migrate to unified sendEmail() helper

Per spec §6. Pre-generates send_id and embeds ?e=<send_id> in the magic-link
URL for engagement correlation. Removes per-file nodemailer transport.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Migrate src/app/api/contact/route.ts

**Files:**
- Modify: `src/app/api/contact/route.ts`

- [ ] **Step 1: Replace nodemailer block + sendMail call**

Replace the file contents with:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { CONTACT_EMAIL } from '@/lib/constants'
import { sendEmail } from '@/lib/email'
import { apiGuard, escapeHtml, isValidEmail, sanitizeField, safeErrorResponse } from '@/lib/api-security'

export async function POST(req: NextRequest) {
  const guard = apiGuard(req)
  if (guard) return guard

  try {
    const body = await req.json()
    const name = sanitizeField(body.name, 200)
    const email = sanitizeField(body.email, 254)
    const business = sanitizeField(body.business, 200)
    const phone = sanitizeField(body.phone, 30)
    const service = sanitizeField(body.service, 100)
    const message = sanitizeField(body.message, 5000)

    if (!name || !email) {
      return NextResponse.json({ success: false, error: 'Name and email are required.' }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const html = `
      <h2>New Contact Form Submission</h2>
      <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr><td><strong>Name</strong></td><td>${escapeHtml(name)}</td></tr>
        <tr><td><strong>Email</strong></td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
        <tr><td><strong>Business</strong></td><td>${escapeHtml(business || '—')}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${escapeHtml(phone || '—')}</td></tr>
        <tr><td><strong>Service Interest</strong></td><td>${escapeHtml(service || '—')}</td></tr>
        <tr><td><strong>Message</strong></td><td style="white-space:pre-wrap;">${escapeHtml(message || '—')}</td></tr>
      </table>
    `

    const result = await sendEmail({
      to: CONTACT_EMAIL,
      kind: 'contact_form',
      subject: `New Contact: ${sanitizeField(body.name, 100)} — ${sanitizeField(body.business, 100) || 'No business listed'}`,
      html,
    })

    if (!result.success) {
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

- [ ] **Step 2: TypeScript check**

```bash
cd "D:\CLAUDE\demandsignals-next"
npx tsc --noEmit 2>&1 | tail -5
```
Expected: zero output.

- [ ] **Step 3: Commit**

```bash
cd "D:\CLAUDE\demandsignals-next"
git add src/app/api/contact/route.ts
git commit -m "refactor(contact): migrate to unified sendEmail() helper

Per spec §6 — internal-bound, no flag check.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Migrate src/app/api/subscribe/route.ts

**Files:**
- Modify: `src/app/api/subscribe/route.ts`

- [ ] **Step 1: Read existing file**

```bash
cd "D:\CLAUDE\demandsignals-next"
cat src/app/api/subscribe/route.ts
```

- [ ] **Step 2: Replace nodemailer pattern with sendEmail**

Replace the whole file. Keep the same body parsing + validation logic, but swap the `transporter.sendMail(...)` call. Final shape:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { CONTACT_EMAIL } from '@/lib/constants'
import { sendEmail } from '@/lib/email'
import { apiGuard, escapeHtml, isValidEmail, sanitizeField, safeErrorResponse } from '@/lib/api-security'

export async function POST(req: NextRequest) {
  const guard = apiGuard(req)
  if (guard) return guard

  try {
    const body = await req.json()
    const email = sanitizeField(body.email, 254)
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ success: false, error: 'Valid email required.' }, { status: 400 })
    }

    const result = await sendEmail({
      to: CONTACT_EMAIL,
      kind: 'newsletter',
      subject: `Newsletter Signup: ${escapeHtml(email)}`,
      html: `<p>New newsletter signup:</p><p><strong>${escapeHtml(email)}</strong></p>`,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error ?? 'Send failed' },
        { status: 502 },
      )
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    return safeErrorResponse('subscribe', err)
  }
}
```

If the existing file has different field names or extra logic, preserve those (e.g., validating an unsubscribe token, persisting to a `newsletter_subscribers` table) — only the email-send block changes. Do NOT remove unrelated functionality.

- [ ] **Step 3: TypeScript check**

```bash
cd "D:\CLAUDE\demandsignals-next"
npx tsc --noEmit 2>&1 | tail -5
```
Expected: zero output.

- [ ] **Step 4: Commit**

```bash
cd "D:\CLAUDE\demandsignals-next"
git add src/app/api/subscribe/route.ts
git commit -m "refactor(subscribe): migrate to unified sendEmail() helper

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: Migrate src/app/api/report-request/route.ts

**Files:**
- Modify: `src/app/api/report-request/route.ts`

- [ ] **Step 1: Read existing file fully**

```bash
cd "D:\CLAUDE\demandsignals-next"
cat src/app/api/report-request/route.ts
```

Note exactly what the file does today: which addresses receive mail, which content goes to which recipient, any DB inserts, any rate-limit logic, etc. Preserve all of that.

- [ ] **Step 2: Replace each `transporter.sendMail(...)` with `sendEmail(...)`**

For each call:
- The admin-bound notification: `kind: 'report_request'`, no flag check, no `isClientFacing` (admin gets it regardless)
- The prospect-bound auto-confirm (if it exists): `kind: 'report_request'`, `isClientFacing: true`. Wrap that one in `if (await isEmailEnabled())` if the file has access to that helper, else import it from `@/lib/invoice-email`.

If only one sendMail exists in the file (admin-only today): just migrate that one and skip the prospect-bound logic.

Apply the standard error-return pattern:
```ts
const result = await sendEmail({ ... })
if (!result.success) {
  return NextResponse.json({ success: false, error: result.error ?? 'Send failed' }, { status: 502 })
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd "D:\CLAUDE\demandsignals-next"
npx tsc --noEmit 2>&1 | tail -5
```
Expected: zero output.

- [ ] **Step 4: Commit**

```bash
cd "D:\CLAUDE\demandsignals-next"
git add src/app/api/report-request/route.ts
git commit -m "refactor(report-request): migrate to unified sendEmail() helper

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 17: Migrate src/app/api/analytics/weekly-report/route.ts

**Files:**
- Modify: `src/app/api/analytics/weekly-report/route.ts`

- [ ] **Step 1: Read existing file**

```bash
cd "D:\CLAUDE\demandsignals-next"
cat src/app/api/analytics/weekly-report/route.ts
```

- [ ] **Step 2: Replace nodemailer transport + sendMail**

Replace the email-sending block with `sendEmail({ kind: 'weekly_analytics', to: <admin email>, ... })`. This is internal-bound (cron), no flag check.

- [ ] **Step 3: TypeScript check**

```bash
cd "D:\CLAUDE\demandsignals-next"
npx tsc --noEmit 2>&1 | tail -5
```
Expected: zero output.

- [ ] **Step 4: Verify no nodemailer imports remain anywhere except system-alerts.ts and email.ts**

```bash
cd "D:\CLAUDE\demandsignals-next"
grep -rn "from 'nodemailer'\|require('nodemailer')" src/ --include="*.ts" --include="*.tsx" | grep -v "system-alerts.ts\|email.ts"
```
Expected: zero output.

- [ ] **Step 5: Commit**

```bash
cd "D:\CLAUDE\demandsignals-next"
git add src/app/api/analytics/weekly-report/route.ts
git commit -m "refactor(weekly-report): migrate to unified sendEmail() helper

All 5 nodemailer call sites now flow through @/lib/email. Only system-alerts.ts
and email.ts itself import nodemailer (intentional, for SMTP fallback).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 18: Create Resend webhook handler

**Files:**
- Create: `src/app/api/webhooks/resend/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/webhooks/resend/route.ts`:

```ts
// ── POST /api/webhooks/resend ───────────────────────────────────────
// Handles Resend webhook events (delivered/opened/clicked/bounced/etc).
// Verifies Svix-style HMAC signature using RESEND_WEBHOOK_SECRET.
// Inserts an email_engagement row per event (idempotent via UNIQUE constraint).
// See spec §4.4.

import { NextRequest, NextResponse } from 'next/server'
import { recordWebhookEvent } from '@/lib/email-engagement'
import { notify } from '@/lib/system-alerts'

// Svix signature header format: "v1,<base64-signature>"
// We compute HMAC-SHA256 of (msg_id + "." + msg_timestamp + "." + body)
// and compare. Resend uses Svix under the hood.

interface ResendEventEnvelope {
  type: string                // 'email.delivered' | 'email.opened' | etc.
  data: {
    email_id?: string         // Resend message id
    created_at?: string
    [key: string]: unknown
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 })
  }

  // Svix headers
  const msgId = request.headers.get('svix-id')
  const msgTimestamp = request.headers.get('svix-timestamp')
  const msgSignature = request.headers.get('svix-signature')
  if (!msgId || !msgTimestamp || !msgSignature) {
    return NextResponse.json({ error: 'Missing Svix headers' }, { status: 400 })
  }

  const rawBody = await request.text()

  // Verify signature using Web Crypto (no extra dep needed).
  const expected = await computeSvixSignature(secret, msgId, msgTimestamp, rawBody)
  // svix-signature can contain multiple comma-separated "v1,<sig>" pairs;
  // any match counts as valid (allows secret rotation).
  const presented = msgSignature.split(' ').map((s) => s.trim()).filter(Boolean)
  const ok = presented.some((p) => {
    const [, sig] = p.split(',')
    return sig === expected
  })
  if (!ok) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Parse event
  let event: ResendEventEnvelope
  try {
    event = JSON.parse(rawBody) as ResendEventEnvelope
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const messageId = event.data.email_id
  if (!messageId) {
    return NextResponse.json({ ok: true, ignored: 'no email_id' })
  }

  // Map Resend event types to our event_type enum.
  const eventTypeMap: Record<string, string> = {
    'email.sent': 'sent',                       // already recorded by sendEmail; would be a duplicate
    'email.delivered': 'delivered',
    'email.opened': 'opened',
    'email.clicked': 'clicked',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
    'email.delivery_delayed': 'delivery_delayed',
    'email.failed': 'failed',
  }
  const ourType = eventTypeMap[event.type]
  if (!ourType) {
    // Unknown event; acknowledge so Resend doesn't retry, but don't write.
    return NextResponse.json({ ok: true, ignored: `unknown event ${event.type}` })
  }
  // Skip 'sent' from webhook — we already recorded it inline at send time.
  if (ourType === 'sent') {
    return NextResponse.json({ ok: true, ignored: 'sent recorded inline' })
  }

  try {
    await recordWebhookEvent({
      resend_message_id: messageId,
      event_type: ourType as
        | 'delivered'
        | 'opened'
        | 'clicked'
        | 'bounced'
        | 'complained'
        | 'delivery_delayed'
        | 'failed',
      occurred_at: event.data.created_at ?? new Date().toISOString(),
      event_data: event.data as Record<string, unknown>,
    })

    // Bounce / complaint events deserve their own system_notifications row
    // so they show up in the future Command Center alongside hard failures.
    if (ourType === 'bounced' || ourType === 'complained') {
      await notify({
        severity: ourType === 'complained' ? 'warning' : 'info',
        source: 'email_event',
        title: `Resend ${ourType} for ${event.data.email_id}`,
        body: JSON.stringify(event.data, null, 2),
        context: { resend_message_id: messageId, event_type: ourType, error_code: ourType },
      })
    }
  } catch (e) {
    console.error('[resend webhook] processing failed:', e instanceof Error ? e.message : e)
  }

  return NextResponse.json({ ok: true })
}

// HMAC-SHA256(secret, msgId + "." + msgTimestamp + "." + body), base64url.
async function computeSvixSignature(
  secret: string,
  msgId: string,
  msgTimestamp: string,
  body: string,
): Promise<string> {
  // Svix secrets are prefixed "whsec_" and the actual key is base64.
  const keyMaterial = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret
  const keyBytes = base64ToBytes(keyMaterial)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const message = new TextEncoder().encode(`${msgId}.${msgTimestamp}.${body}`)
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, message)
  return bytesToBase64(new Uint8Array(sig))
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "D:\CLAUDE\demandsignals-next"
npx tsc --noEmit 2>&1 | tail -10
```
Expected: zero output.

- [ ] **Step 3: Commit**

```bash
cd "D:\CLAUDE\demandsignals-next"
git add src/app/api/webhooks/resend/route.ts
git commit -m "feat(webhook): Resend webhook handler with Svix signature verification

Per spec §4.4. Maps Resend event types to email_engagement.event_type;
inserts via recordWebhookEvent (idempotent). Bounce/complaint also write
a system_notifications row.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 19: Add page-visit logging to invoice magic-link page

**Files:**
- Modify: `src/app/invoice/[number]/[uuid]/page.tsx`

- [ ] **Step 1: Find the data-fetch site**

The page already calls a `fetchInvoice(number, uuid)` helper. We need access to the invoice's `id`, `prospect_id`, plus the `?e=<send_id>` query param.

Since the existing route handler returns the full invoice JSON, we have `data.invoice.id` available after `notFound()` check.

- [ ] **Step 2: Add logPageVisit + ?e= handling + cookie promotion**

Near the top of `PublicInvoicePage`, after the data fetch, add:

```tsx
import { logPageVisit, buildAttributionCookieParts, shouldPromoteCookie } from '@/lib/page-tracking'
import { ATTRIBUTION_COOKIE_NAME, verifyAttributionCookie } from '@/lib/attribution-cookie'
import { cookies as nextCookies } from 'next/headers'

// ...inside the component, after notFound() guard...
const url = new URL(request?.url ?? `https://demandsignals.co/invoice/${number}/${uuid}`)
// (in App Router server components, params include searchParams via the page props)
// We use props.searchParams instead — see signature update below.
```

The cleanest path is to extend the page props signature to include `searchParams`. Replace the existing function signature:

```tsx
export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string; uuid: string }>
  searchParams: Promise<{ e?: string }>
}) {
  const { number, uuid } = await params
  const { e: emailSendId } = await searchParams
  const data = await fetchInvoice(number, uuid)
  if (!data) notFound()

  const { invoice, line_items } = data

  // ── Page tracking ─────────────────────────────────────────────────
  // Server-side log; promotes cookie if a stronger attribution signal landed.
  const c = await nextCookies()
  const cookiePayload = await verifyAttributionCookie(c.get(ATTRIBUTION_COOKIE_NAME)?.value)

  const visitResult = await logPageVisit({
    page_url: `/invoice/${number}/${uuid}`,
    page_type: 'invoice',
    invoice_id: invoice.id,
    attributed_prospect_id: invoice.prospect_id ?? undefined,
    email_send_id: emailSendId,
  })

  if (
    shouldPromoteCookie(visitResult.attribution_source, visitResult.prospect_id, cookiePayload?.pid ?? null)
  ) {
    const parts = await buildAttributionCookieParts(visitResult.prospect_id!)
    if (parts) {
      // Server components in Next 16 can call cookies().set() in some contexts;
      // wrapped in try/catch since cookie API is restricted in pure render path.
      try {
        c.set(parts.name, parts.value, parts.options)
      } catch {
        // Read-only cookie context — accept the gap; next visit will retry promotion.
      }
    }
  }

  // ... rest of the page render unchanged ...
```

Notes:
- Don't remove or alter the existing render logic. Only add the tracking block immediately after `notFound()`.
- The `data.invoice.id` and `data.invoice.prospect_id` MUST be present in the API response. If they aren't, modify `src/app/api/invoices/public/[number]/route.ts` to include them in the SELECT and the JSON payload — but do this only if needed.

- [ ] **Step 3: Verify the API returns the needed fields**

Check `src/app/api/invoices/public/[number]/route.ts`:

```bash
cd "D:\CLAUDE\demandsignals-next"
grep -n "id\|prospect_id" src/app/api/invoices/public/\[number\]/route.ts | head -10
```

If `id` and `prospect_id` are NOT in the SELECT list of that route, add them. They're internal; the public client doesn't need to render them but the page server-side does.

- [ ] **Step 4: TypeScript check**

```bash
cd "D:\CLAUDE\demandsignals-next"
npx tsc --noEmit 2>&1 | tail -10
```
Expected: zero output.

- [ ] **Step 5: Commit**

```bash
cd "D:\CLAUDE\demandsignals-next"
git add "src/app/invoice/[number]/[uuid]/page.tsx" "src/app/api/invoices/public/[number]/route.ts"
git commit -m "feat(invoice page): logPageVisit + ?e= tracking + cookie promotion

Per spec §4.7. Server component logs every visit to page_visits with full
attribution signals. Magic-link UUID resolves prospect_id and promotes
cookie when stronger than current.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 20: Add page-visit logging to SOW magic-link page

**Files:**
- Modify: `src/app/sow/[number]/[uuid]/page.tsx`

- [ ] **Step 1: Read current SOW page**

```bash
cd "D:\CLAUDE\demandsignals-next"
head -50 "src/app/sow/[number]/[uuid]/page.tsx"
```

- [ ] **Step 2: Mirror the invoice-page pattern**

Apply the same pattern as Task 19 step 2, with these substitutions:
- `page_type: 'sow'`
- `sow_document_id: sow.id` instead of `invoice_id`
- `attributed_prospect_id: sow.prospect_id ?? undefined`
- `page_url: \`/sow/${number}/${uuid}\``

If the SOW data is fetched via a route that doesn't currently return `id` and `prospect_id`, modify that route (`src/app/api/sow/public/[number]/route.ts`) to include them.

- [ ] **Step 3: TypeScript check**

```bash
cd "D:\CLAUDE\demandsignals-next"
npx tsc --noEmit 2>&1 | tail -5
```
Expected: zero output.

- [ ] **Step 4: Commit**

```bash
cd "D:\CLAUDE\demandsignals-next"
git add "src/app/sow/[number]/[uuid]/page.tsx" "src/app/api/sow/public/[number]/route.ts" 2>/dev/null
git commit -m "feat(sow page): logPageVisit + ?e= tracking + cookie promotion

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 21: Add page-visit logging to quote magic-link page

**Files:**
- Modify: `src/app/quote/s/[token]/page.tsx`

- [ ] **Step 1: Read current quote page**

```bash
cd "D:\CLAUDE\demandsignals-next"
head -50 "src/app/quote/s/[token]/page.tsx"
```

- [ ] **Step 2: Mirror the invoice-page pattern**

Apply the Task 19 pattern with:
- `page_type: 'quote'`
- `quote_session_id: session.id`
- `attributed_prospect_id: session.prospect_id ?? undefined`
- `page_url: \`/quote/s/${token}\``

- [ ] **Step 3: TypeScript check + commit**

```bash
cd "D:\CLAUDE\demandsignals-next"
npx tsc --noEmit 2>&1 | tail -5
```

```bash
cd "D:\CLAUDE\demandsignals-next"
git add "src/app/quote/s/[token]/page.tsx"
git commit -m "feat(quote page): logPageVisit + ?e= tracking + cookie promotion

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 22: Push and operational checklist

**Files:** none modified

- [ ] **Step 1: Push all commits**

```bash
cd "D:\CLAUDE\demandsignals-next"
GHTOKEN="<get from PROJECT.md section 2>"
git -c credential.helper="" \
  -c "http.https://github.com.extraheader=Authorization: Basic $(echo -n "demand-signals:${GHTOKEN}" | base64 -w0)" \
  push origin master
```

Wait for Vercel to finish deploying (~2 min).

- [ ] **Step 2: Confirm Vercel env vars are set**

In Vercel dashboard → project `demandsignals-next` → Settings → Environment Variables, confirm:
- `RESEND_API_KEY` — set
- `ATTRIBUTION_COOKIE_SECRET` — set
- `ALERT_EMAIL` — optional (defaults `DemandSignals@gmail.com`)
- `ARCHIVE_BCC` — optional (defaults `DemandSignals@gmail.com`)

`RESEND_WEBHOOK_SECRET` is set in Step 4 below after creating the webhook endpoint.

- [ ] **Step 3: Confirm Cloudflare Email Routing aliases**

In Cloudflare → demandsignals.co zone → Email Routing → Routing Rules, confirm forwards exist (or create them):
- `invoices@demandsignals.co` → `DemandSignals@gmail.com`
- `noreply@demandsignals.co` → `DemandSignals@gmail.com`
- `news@demandsignals.co` → `DemandSignals@gmail.com`
- `reports@demandsignals.co` → `DemandSignals@gmail.com`
- `alerts@demandsignals.co` → `DemandSignals@gmail.com`
- `hunter@demandsignals.co` → `DemandSignals@gmail.com` (already done)
- `landon@demandsignals.co` → `DemandSignals@gmail.com` (already done)

- [ ] **Step 4: Create Resend webhook endpoint**

In Resend dashboard → Webhooks → Add Endpoint:
- URL: `https://demandsignals.co/api/webhooks/resend`
- Events: select `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`, `email.delivery_delayed`, `email.failed`
- Copy the signing secret (`whsec_...`)
- In Vercel → Settings → Environment Variables → add `RESEND_WEBHOOK_SECRET=<whsec value>`
- Trigger redeploy in Vercel (Deployments tab → latest → "..." → Redeploy)

---

## Task 23: Smoke tests

**Files:** none modified — manual verification

Run these tests against production after deploy completes.

- [ ] **Test 1: Happy-path Resend send**

Trigger the contact form on `https://demandsignals.co/contact`. Submit with a test name + your own email.

Expected:
- Form returns success
- Email arrives in `DemandSignals@gmail.com` from `noreply@demandsignals.co`
- In Supabase: `SELECT * FROM email_engagement ORDER BY created_at DESC LIMIT 1` shows a `sent` row with `kind='contact_form'`, `resend_message_id` populated
- In Supabase: `SELECT * FROM system_notifications ORDER BY created_at DESC LIMIT 1` shows nothing related (or only old rows)

- [ ] **Test 2: Resend webhook events land**

Wait ~30 seconds after Test 1, then re-query `email_engagement`:
```sql
SELECT event_type, occurred_at FROM email_engagement
WHERE kind='contact_form' ORDER BY occurred_at DESC LIMIT 5;
```
Expected: rows for `sent` + `delivered` (Resend's webhook for delivery confirmation).

- [ ] **Test 3: BCC archive on a real invoice**

In `/admin/invoices`, find or create a test invoice for a prospect with a real email. Use the admin email-send action.

Expected:
- Email arrives at the prospect's address from `invoices@demandsignals.co`
- Reply-To header is `hunter@demandsignals.co` (verify: open in gmail, click Reply, To: should pre-fill hunter@)
- A copy also lands in `DemandSignals@gmail.com` (BCC archive)

- [ ] **Test 4: Page-visit logging**

In a fresh incognito browser, open the test invoice's magic link:
```
https://demandsignals.co/invoice/INV-XXXX/<uuid>
```

Expected:
```sql
SELECT page_url, page_type, prospect_id, attribution_source, ip, user_agent
FROM page_visits ORDER BY occurred_at DESC LIMIT 1;
```
Returns the visit with `attribution_source='uuid'`, `prospect_id` populated, `ip` and `user_agent` populated.

- [ ] **Test 5: Cookie set + verified**

Still in incognito, open browser DevTools → Application → Cookies → `https://demandsignals.co`. Look for `dsig_attr`. Should be present, HttpOnly, Secure, expires in ~1 year.

- [ ] **Test 6: ?e=<send_id> correlation**

In Supabase, find a recent send_id from email_engagement:
```sql
SELECT send_id FROM email_engagement WHERE kind='invoice' ORDER BY created_at DESC LIMIT 1;
```
Open the magic link with `?e=<that-send_id>` appended.

Expected:
```sql
SELECT email_send_id FROM page_visits ORDER BY occurred_at DESC LIMIT 1;
```
Returns that send_id.

- [ ] **Test 7: Open + click tracking**

Open the email from Test 3 in your gmail web client. Click the magic-link button.

Wait ~30 seconds, then:
```sql
SELECT event_type, occurred_at FROM email_engagement
WHERE send_id = (SELECT send_id FROM email_engagement WHERE kind='invoice' ORDER BY created_at DESC LIMIT 1)
ORDER BY occurred_at;
```
Expected: rows for `sent`, `delivered`, `opened`, `clicked`. Plus a `page_visit` row from the click landing on the page.

- [ ] **Test 8: SMTP fallback (loud-warning)**

In Vercel → Settings → Environment Variables, temporarily edit `RESEND_API_KEY` to `re_invalid_test`. Save → redeploy.

Trigger the contact form again.

Expected:
- Email STILL arrives (via SMTP fallback)
- `system_notifications` has a new `info` row: `Resend fallback to SMTP fired`
- Alert email arrives in gmail with subject `[info] [email] Resend fallback to SMTP fired`

**RESTORE the real `RESEND_API_KEY` value after this test. Redeploy.**

---

## Task 24: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Append to §10 What Is Complete**

Add this entry under §10's bullet list:

```markdown
- [x] Resend SDK swap + email/page tracking: All 5 nodemailer call sites migrated to a single `sendEmail()` helper backed by Resend with SMTP fallback. Per-purpose `from` aliases on `demandsignals.co` (invoices@, noreply@, news@, reports@, alerts@). Three new tables: `system_notifications` (subsystem failure log + alert pipeline with 60s throttle), `email_engagement` (every send + Resend webhook event delivered/opened/clicked/bounced/complained, idempotent via UNIQUE index), `page_visits` (every magic-link page view with three-layer attribution: UUID > signed JWT cookie > IP+UA). Resend webhook handler at `/api/webhooks/resend` verifies Svix signatures. Magic-link pages (invoice/sow/quote) log visits and promote `dsig_attr` cookie when UUID resolves a prospect. Migrations 026/027/028. Required env vars: `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `ATTRIBUTION_COOKIE_SECRET`. Optional: `ALERT_EMAIL`, `ARCHIVE_BCC`.
```

- [ ] **Step 2: Commit + push**

```bash
cd "D:\CLAUDE\demandsignals-next"
git add CLAUDE.md
git commit -m "docs: mark Resend swap + email/page tracking complete

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
GHTOKEN="<get from PROJECT.md section 2>"
git -c credential.helper="" \
  -c "http.https://github.com.extraheader=Authorization: Basic $(echo -n "demand-signals:${GHTOKEN}" | base64 -w0)" \
  push origin master
```

---

## Plan complete

After all 24 tasks ship:
- All outbound mail goes through Resend with SMTP fallback
- Per-purpose `from` addresses on `demandsignals.co`
- Every send + every webhook event written to `email_engagement`
- Every magic-link page visit (invoice/sow/quote) written to `page_visits` with prospect attribution
- Failures land in `system_notifications` AND a throttled alert email to gmail
- Foundation laid for Project #1.5 (universal page tracking + admin UI)

**Next:** Project #2 — Quick-inquiry form site-wide above the footer (separate brainstorm + spec).
