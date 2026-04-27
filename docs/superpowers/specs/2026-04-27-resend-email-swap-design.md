# Resend SDK Swap + System Notifications + Email Engagement Tracking — Design

**Status:** approved (brainstorm) — pending implementation plan
**Date:** 2026-04-27
**Author:** brainstorm session with Hunter
**Project:** #1 of 3 in the email/messaging sequence (this spec → quick-inquiry form → portal client messaging)

---

## 1. Problem

Five separate places in the codebase create their own `nodemailer.Transporter` and send email via Gmail SMTP:

| File | Purpose |
|------|---------|
| `src/lib/invoice-email.ts` | Invoice send to client |
| `src/app/api/contact/route.ts` | Contact form → admin |
| `src/app/api/subscribe/route.ts` | Newsletter signup → admin |
| `src/app/api/report-request/route.ts` | Free-report request → admin + prospect |
| `src/app/api/analytics/weekly-report/route.ts` | Cron: weekly stats → admin |

Each one is its own nodemailer config. There is no single email helper, no observability, no failure alerting, and the gmail sender address looks unprofessional next to client invoices.

Hunter has just provisioned a Resend Pro account with a validated `demandsignals.co` domain via Cloudflare. We need to:

1. Move all 5 senders onto Resend
2. Use per-purpose `from` addresses on `demandsignals.co`
3. Surface every email failure to the admin so problems can't go unnoticed
4. Lay the foundation for a future Command Center "Messages" screen

---

## 2. Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Migration scope | All 5 senders + extract single `src/lib/email.ts` helper |
| 2 | From-address strategy | Per-purpose alias on `demandsignals.co` |
| 3 | Missing `RESEND_API_KEY` behavior | Silent fallback to SMTP, but write loud-warning system notification |
| 4 | `email_delivery_enabled='false'` flag scope | Block client-facing only; internal admin notifications bypass |
| 5 | Send-failure alerting | DB row + alert email to `DemandSignals@gmail.com`, throttled per-minute |
| 6 | Throttle algorithm | Dedupe alert emails per `(source, error_code)` per 60-second window; DB rows always written |
| 7 | Alert-email transport | Always SMTP, never Resend (avoids infinite loop) |
| 8 | `system_notifications` table | Built in this project; UI surface deferred to Project #2 or #3 |
| 9 | BCC client-facing sends | Single BCC address (`DemandSignals@gmail.com`) on all client-facing kinds (invoice, report_request prospect-side, future client-message). Internal-bound senders do NOT BCC. |
| 10 | Email engagement tracking | Full close-the-loop: Resend webhook events (open/click/delivered/bounced/complained) + DSIG-side magic-link page visit logging. Both write to a new `email_engagement` table keyed to invoice/SOW/etc. for per-document timeline queries. |
| 11 | Page-visit tracking on DSIG-domain magic-link pages | Every visit to `/invoice/[number]/[uuid]`, `/sow/[number]/[uuid]`, `/quote/s/[token]`, and (future) `/receipt/[number]/[uuid]` writes a row to a new `page_visits` table with prospect attribution. |
| 12 | Three-layer prospect attribution | Magic-link UUID (strong) sets a long-lived signed JWT cookie `dsig_attr` (medium); IP+UserAgent always logged (weak). Cookie persists 1 year so the same prospect viewing a marketing page weeks later still attributes. |
| 13 | Cookie security | `dsig_attr` is HttpOnly, Secure, SameSite=Lax, Domain=demandsignals.co (covers all subdomains EXCEPT staging/demos which are separate-site for cookie purposes per spec §18). Signed with HS256 using `ATTRIBUTION_COOKIE_SECRET` env var. |
| 14 | Demo-site tracking | Canonical demos at `[client_code].demos.demandsignals.co` will beacon to `https://demandsignals.co/api/track/beacon` for unified tracking. Implementation deferred to Project #1.5 (cross-repo work in `demo-sites` codebase). Historical `.dev` and `.us` demos remain tracking-blind by design. |

---

## 3. Per-purpose from-addresses

```ts
// src/lib/constants.ts (new)
export const EMAIL_FROM = {
  invoice:           'Demand Signals <invoices@demandsignals.co>',
  contact_form:      'Demand Signals <noreply@demandsignals.co>',
  newsletter:        'Demand Signals <news@demandsignals.co>',
  report_request:    'Demand Signals <reports@demandsignals.co>',
  weekly_analytics:  'Demand Signals <reports@demandsignals.co>',
  system_alert:      'Demand Signals Alerts <alerts@demandsignals.co>',
} as const

export const EMAIL_REPLY_TO: Partial<Record<keyof typeof EMAIL_FROM, string>> = {
  invoice: 'hunter@demandsignals.co',
}
```

Cloudflare Email Routing (operational, not code) handles inbound mail to all of these addresses by forwarding to `DemandSignals@gmail.com`. Per Hunter's prior config: `hunter@`, `landon@`, plus the new aliases (`invoices@`, `noreply@`, `news@`, `reports@`, `alerts@`) all forward to gmail.

---

## 4. Architecture

### 4.1 Shared email helper

`src/lib/email.ts` exports a single function that all 5 callers use:

```ts
export type EmailKind =
  | 'invoice'
  | 'contact_form'
  | 'newsletter'
  | 'report_request'
  | 'weekly_analytics'
  | 'system_alert'

export interface SendEmailArgs {
  to: string | string[]
  kind: EmailKind                    // determines from + reply-to
  subject: string
  html: string
  text?: string
  bcc?: string | string[]
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>
  /** Skip alert-on-failure to break loops when sending alert emails. */
  suppressAlerts?: boolean
  /** For mixed-kind callers like report_request: forces BCC archive on. */
  isClientFacing?: boolean
  /**
   * Pre-generated send_id (UUID). Used when caller needs to embed the
   * tracking param `?e=<send_id>` in the email body before sending.
   * If omitted, sendEmail() generates one.
   */
  send_id?: string
  /** Optional FK linkage for email_engagement row. */
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
  provider: 'resend' | 'smtp' | 'none'
  error?: string
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult>
```

**Internal flow:**

1. Resolve `from` from `EMAIL_FROM[args.kind]`
2. Resolve `replyTo` from `EMAIL_REPLY_TO[args.kind]` (may be undefined)
3. If `RESEND_API_KEY` is set:
   - Call `resend.emails.send(...)`
   - On success: return `{success: true, provider: 'resend', message_id}`
   - On error: write `system_notifications` row + try alert email (unless `suppressAlerts`); fall through to SMTP attempt
4. SMTP attempt:
   - If `RESEND_API_KEY` was missing: write info-severity `system_notifications` row before sending
   - Call `nodemailer.sendMail(...)`
   - On success: return `{success: true, provider: 'smtp', message_id}`
   - On error: write critical-severity `system_notifications` row; try alert email (unless `suppressAlerts`); return `{success: false, provider: 'none', error}`
5. Helper **never throws**. Always returns a result.

### 4.2 System notifications + alert pipeline

`src/lib/system-alerts.ts` exports:

```ts
export interface NotifyArgs {
  severity: 'info' | 'warning' | 'error' | 'critical'
  source: string                     // 'email', 'stripe', 'cron', 'auth', etc.
  title: string                      // one-line summary
  body?: string                      // detail or stack trace
  context?: Record<string, unknown>  // structured data: kind, recipient, error_code, ...
  /** Set to false to suppress the alert email (DB row still written). */
  emailAlert?: boolean               // default true
}

export async function notify(args: NotifyArgs): Promise<void>
```

**Internal flow:**

1. INSERT `system_notifications` row (best-effort; on insert failure, console.error and continue)
2. If `emailAlert === false` → return
3. Throttle check: query for rows in same `(source, context->>'error_code')` bucket with `emailed_at > now() - interval '60 seconds'`
4. If throttled (≥1 recent row) → return
5. Compose alert email: subject `[severity] [source] title`, body shows full context as JSON
6. Call `sendEmail({ kind: 'system_alert', to: ALERT_EMAIL, suppressAlerts: true, ... })`
7. On success: stamp `emailed_at` on the row just inserted
8. Helper **never throws**.

`ALERT_EMAIL` defaults to `process.env.ALERT_EMAIL || 'DemandSignals@gmail.com'`.

### 4.3 BCC archive

`sendEmail()` automatically adds a BCC for client-facing kinds. Behavior is keyed off the `kind`:

```ts
const CLIENT_FACING_KINDS: ReadonlySet<EmailKind> = new Set([
  'invoice',
  // 'report_request' is mixed (admin-side + prospect-side); caller passes
  // explicit { isClientFacing: true } when sending the prospect copy
])

// Inside sendEmail():
const archiveBcc = process.env.ARCHIVE_BCC || 'DemandSignals@gmail.com'
const shouldArchive = CLIENT_FACING_KINDS.has(args.kind) || args.isClientFacing
const finalBcc = mergeBcc(args.bcc, shouldArchive ? archiveBcc : null)
```

`mergeBcc()` is a small helper that combines caller-supplied BCC with the archive BCC, deduping addresses. `ARCHIVE_BCC` env var lets you redirect archive copies later (e.g. to a dedicated `archive@demandsignals.co` mailbox) without code changes.

Internal-bound kinds (`contact_form`, `newsletter`, `weekly_analytics`, `system_alert`) do NOT auto-BCC — you're already the recipient, no point copying yourself.

### 4.4 Email engagement tracking

Two ingestion paths feed one table:

**(a) Resend webhook handler** — `src/app/api/webhooks/resend/route.ts`
- Receives Resend's webhook events: `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`, `email.delivery_delayed`
- Verifies signature using `RESEND_WEBHOOK_SECRET` (Resend uses Svix-style HMAC-SHA256)
- Looks up the originating send via `resend_message_id` (which we save on every `sendEmail()` call)
- Inserts `email_engagement` row with `event_type`, `event_data` (raw payload), `occurred_at`
- Idempotent: UNIQUE constraint on `(resend_message_id, event_type, occurred_at)` so duplicate webhook deliveries no-op

**(b) Magic-link page visit logger** — already-existing pages get a small server-side log call

When a client opens `/invoice/[number]/[uuid]`, `/sow/[number]/[uuid]`, or `/quote/s/[token]`, the server component logs a `page_visit` event to `email_engagement` with the document type + ID, the visitor's IP/user-agent (already captured for analytics), and a referer if present. This catches the "client forwarded the email; their accountant opened it" case that Resend's pixel-based tracking misses.

To correlate page visits to the originating email send, callers building trackable URLs follow this two-step pattern:

```ts
// 1. Send first; sendEmail returns send_id
const result = await sendEmail({ kind: 'invoice', to, subject, html: htmlPlaceholder, ... })
// 2. Build the trackable URL using the returned send_id
const trackedUrl = `${publicUrl}?e=${result.send_id}`
// 3. ...but step 1 needs the URL in the html. Solved by send-then-update:
//    Send a "draft" body without URL → grab send_id → re-render html with trackedUrl →
//    overwrite via Resend's update API. OR: pre-allocate send_id (gen_random_uuid()
//    client-side) and pass to sendEmail.
```

To avoid the chicken-and-egg, `sendEmail()` accepts an optional `send_id` argument; if omitted, one is generated. Callers needing trackable URLs in the body generate the UUID first, pass it to `sendEmail`, and embed `?e=${send_id}` in the rendered HTML before sending. The page reads this param, logs it as part of the engagement record, then strips it from the displayed URL via `router.replace()` so the client doesn't see it.

`?e=<send_id>` is **purely informational** — the page still loads even if the param is missing, malformed, or refers to a deleted send. We never gate access on it.

### 4.6 Three-layer prospect attribution

Every meaningful visit to a DSIG-domain magic-link page resolves a `prospect_id` using up to three signals, in order of strength:

1. **Magic-link UUID (strong)** — the `[uuid]` segment in `/invoice/[number]/[uuid]` (or equivalent for sow/quote/receipt) is looked up in the source table to find `prospect_id`. This is the canonical attribution signal: if it resolves, we know exactly who the prospect is.

2. **`dsig_attr` cookie (medium)** — a signed JWT cookie set on the visitor's browser the first time signal #1 succeeds. Persists 1 year. Subsequent visits on any `demandsignals.co` page (including marketing pages, future per-deferred logging) read this cookie to attribute the visit even when no UUID is present. Survives across browsing sessions on the same device/browser.

3. **IP + User-Agent fingerprint (weak)** — always logged on every page_visits row. Not used for direct attribution by itself, but enables future analytics queries like "all visits from IP X grouped by attributed prospect" to identify shared-IP scenarios (office team viewing same invoice).

**Cookie shape (signed JWT, HS256):**
```ts
{
  pid: string,    // prospect_id UUID
  iat: number,    // issued-at unix
  exp: number,    // iat + 31536000 (1 year)
}
```

**Cookie behavior:**
- Set whenever signal #1 succeeds AND no cookie present (or cookie's `pid` differs from current attribution — the latest UUID hit wins)
- Read on every request via Next.js `cookies()` API
- Validated via HS256 verify using `ATTRIBUTION_COOKIE_SECRET`; if signature invalid OR expired, treat as absent
- HttpOnly, Secure, SameSite=Lax, Domain=demandsignals.co
- Cleared on admin-portal logout? **No** — admin sessions are separate; the attribution cookie is for prospects, not admins. But documented in privacy policy (separate task).

### 4.7 Page-visit logging

A new helper `src/lib/page-tracking.ts` exports `logPageVisit(req, args)`:

```ts
export interface LogPageVisitArgs {
  page_url: string                 // e.g. '/invoice/INV-MOME-042726B/abc-uuid'
  page_type: 'invoice' | 'sow' | 'quote' | 'receipt' | 'marketing' | 'admin' | 'other'
  // Direct document linkage (one of):
  invoice_id?: string
  sow_document_id?: string
  receipt_id?: string
  quote_session_id?: string
  // Direct prospect attribution from magic-link UUID lookup:
  attributed_prospect_id?: string
  // Tracking context:
  email_send_id?: string           // from ?e= query param
  referer?: string
}

export async function logPageVisit(
  req: Request | NextRequest,
  args: LogPageVisitArgs
): Promise<{ visit_id: string }>
```

**Internal flow:**

1. Extract `ip` from `x-forwarded-for` header (first value), fallback to `x-real-ip`
2. Extract `user_agent` from `user-agent` header
3. Read existing `dsig_attr` cookie if present; verify signature; extract cookie's `pid`
4. Resolve final `prospect_id` = `args.attributed_prospect_id ?? cookie.pid ?? null`
5. INSERT page_visits row with all signals
6. If `args.attributed_prospect_id` is present AND it differs from cookie.pid (or cookie absent):
   - Set fresh `dsig_attr` cookie with new pid via response headers
   - This is the cookie-promotion moment: a stronger attribution signal upgrades a weaker one
7. Returns `{ visit_id }` for callers that want to correlate later events

**Best-effort:** insert failures logged via `notify({severity:'warning', source:'page_tracking', ...})`, never thrown. The page must always render even if tracking is sick.

**Called from:**
- `src/app/invoice/[number]/[uuid]/page.tsx` — server component
- `src/app/sow/[number]/[uuid]/page.tsx` — server component
- `src/app/quote/s/[token]/page.tsx` — server component
- (future) `src/app/receipt/[number]/[uuid]/page.tsx`

Marketing pages keep using the existing `analytics-db.ts` tracker for now. **Project #1.5** adds a unified path so marketing pages also write to `page_visits` when an attribution cookie is present.

### 4.8 What's deferred to Project #1.5 (Universal Engagement Tracking)

To keep this project shippable, the following are explicitly out of Project #1 scope:

- **Marketing-page attribution** — marketing pages keep writing to existing `analytics-db.ts` table; no `page_visits` rows yet
- **Demo-site beacon** — `[client_code].demos.demandsignals.co` POSTing to `https://demandsignals.co/api/track/beacon` (cross-repo work in `demo-sites` codebase)
- **IP geolocation enrichment** — city/region/country lookup via a geo service (CloudFlare provides `cf-ipcountry` for free; deeper geo needs MaxMind or similar)
- **Admin per-prospect timeline UI** — a screen showing all email events + page visits for one prospect chronologically. Schema supports it; UI deferred.
- **Per-document engagement timeline UI** on `/admin/invoices/[id]`, `/admin/sow/[id]`
- **Cookie consent banner** — required for EU/UK visitors. Spec assumes US-only operation for now; consent layer is its own project.

### 4.5 Sender helper return value extended

`SendEmailResult` gains one field:

```ts
export interface SendEmailResult {
  success: boolean
  message_id?: string         // Resend's id; same value as resend_message_id below
  resend_message_id?: string  // explicit alias for caller convenience
  send_id?: string            // DSIG's email_engagement.send_id (UUID), for ?e= param
  provider: 'resend' | 'smtp' | 'none'
  error?: string
}
```

Every successful send writes a "send" row to `email_engagement` (event_type=`'sent'`) immediately, returning its `send_id` so the caller can build trackable URLs.

---

## 5. Data model

### 5.1 New table: `system_notifications`

Migration `026_system_notifications.sql`:

```sql
CREATE TABLE IF NOT EXISTS system_notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity         TEXT NOT NULL CHECK (severity IN ('info','warning','error','critical')),
  source           TEXT NOT NULL,
  title            TEXT NOT NULL,
  body             TEXT,
  context          JSONB NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_at  TIMESTAMPTZ,
  acknowledged_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  emailed_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_notifications_unread
  ON system_notifications (severity, created_at DESC)
  WHERE acknowledged_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_system_notifications_source
  ON system_notifications (source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_notifications_throttle
  ON system_notifications (source, (context->>'error_code'), emailed_at)
  WHERE emailed_at IS NOT NULL;

ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;
-- service_role only; admin RLS policy added in Project #2/#3 when UI lands
```

### 5.2 New table: `email_engagement`

Migration `027_email_engagement.sql`:

```sql
CREATE TABLE IF NOT EXISTS email_engagement (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id              UUID NOT NULL,         -- groups all events for one send (set on insert of 'sent' row, reused for subsequent events)
  resend_message_id    TEXT,                  -- Resend's id; nullable for SMTP-fallback sends
  kind                 TEXT NOT NULL,         -- EmailKind: invoice, contact_form, etc.
  event_type           TEXT NOT NULL CHECK (event_type IN (
    'sent','delivered','opened','clicked','bounced','complained','delivery_delayed','page_visit','failed'
  )),
  to_address           TEXT,                  -- primary recipient (lowercased)
  subject              TEXT,                  -- snapshot at send time
  -- Optional foreign keys to source documents. Exactly one of these is typically set.
  invoice_id           UUID REFERENCES invoices(id) ON DELETE SET NULL,
  sow_document_id      UUID REFERENCES sow_documents(id) ON DELETE SET NULL,
  receipt_id           UUID REFERENCES receipts(id) ON DELETE SET NULL,
  prospect_id          UUID REFERENCES prospects(id) ON DELETE SET NULL,
  -- Event-specific data
  event_data           JSONB NOT NULL DEFAULT '{}'::jsonb,  -- clicked_url, bounce_reason, ip, user_agent, etc.
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
-- service_role only; admin RLS policy added when UI surface lands
```

### 5.3 New table: `page_visits`

Migration `028_page_visits.sql`:

```sql
CREATE TABLE IF NOT EXISTS page_visits (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url                 TEXT NOT NULL,
  page_type                TEXT NOT NULL CHECK (page_type IN (
    'invoice','sow','quote','receipt','marketing','admin','other'
  )),
  -- Direct document linkage (one of, may be null for marketing visits):
  invoice_id               UUID REFERENCES invoices(id) ON DELETE SET NULL,
  sow_document_id          UUID REFERENCES sow_documents(id) ON DELETE SET NULL,
  receipt_id               UUID REFERENCES receipts(id) ON DELETE SET NULL,
  quote_session_id         UUID REFERENCES quote_sessions(id) ON DELETE SET NULL,
  -- Attribution:
  prospect_id              UUID REFERENCES prospects(id) ON DELETE SET NULL,
  attribution_source       TEXT CHECK (attribution_source IN ('uuid','cookie','none')),  -- which signal resolved
  -- Tracking context:
  email_send_id            UUID,                            -- from ?e= query param; FK omitted (email_engagement.send_id is not unique-keyed there)
  ip                       INET,
  user_agent               TEXT,
  referer                  TEXT,
  -- Future enrichment columns:
  ip_country               TEXT,                            -- populated by Project #1.5 geo lookup
  ip_region                TEXT,
  ip_city                  TEXT,
  -- Bookkeeping:
  occurred_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-prospect timeline lookup (the most common query)
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
-- service_role only; admin RLS policy added when UI surface lands
```

Apply file: `APPLY-026-027-028-2026-04-27.sql` bundling all three migrations.

---

## 6. Caller migration matrix

| Caller | Today | After | Client-flag check? |
|---|---|---|---|
| `src/lib/invoice-email.ts` | `nodemailer.createTransport` + `sendMail` | `sendEmail({kind:'invoice', ...})` | Yes — keep existing `isEmailEnabled()` guard before calling |
| `src/app/api/contact/route.ts` | own transporter + `sendMail` | `sendEmail({kind:'contact_form', ...})` | No — internal-bound |
| `src/app/api/subscribe/route.ts` | own transporter + `sendMail` | `sendEmail({kind:'newsletter', ...})` | No — internal-bound |
| `src/app/api/report-request/route.ts` | own transporter + `sendMail` | Two calls: `sendEmail({kind:'report_request', to:adminEmail, ...})` (no flag) AND `sendEmail({kind:'report_request', to:prospectEmail, ...})` (flag-checked if exists) | Mixed |
| `src/app/api/analytics/weekly-report/route.ts` | own transporter + `sendMail` | `sendEmail({kind:'weekly_analytics', ...})` | No — internal cron |

After migration, no file other than `src/lib/email.ts` and `src/lib/system-alerts.ts` should `import 'nodemailer'`.

---

## 7. Env vars

**New required:**
- `RESEND_API_KEY` — `re_...` from Resend dashboard
- `RESEND_WEBHOOK_SECRET` — Svix signing secret from the Resend webhook endpoint config
- `ATTRIBUTION_COOKIE_SECRET` — random 32-byte secret for HS256-signing the `dsig_attr` JWT cookie. Generate with `openssl rand -hex 32`.

**New optional:**
- `ALERT_EMAIL` — defaults to `DemandSignals@gmail.com`
- `ARCHIVE_BCC` — defaults to `DemandSignals@gmail.com` (BCC target for client-facing sends)

**Kept (used as SMTP fallback):**
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `CONTACT_EMAIL`

**Cloudflare Email Routing (operational, not code):**
- `invoices@`, `noreply@`, `news@`, `reports@`, `alerts@`, `hunter@`, `landon@`, `system@` → all forward to `DemandSignals@gmail.com`
- Hunter to confirm each alias is set up before the migration ships

---

## 8. Failure modes (covered exhaustively)

| Mode | Behavior |
|---|---|
| Resend success | `{success:true, provider:'resend'}`. No notification. |
| Resend fails (API error) | Notify `severity:'error'`, retry via SMTP. If SMTP succeeds: `{success:true, provider:'smtp'}`. If both fail: see below. |
| `RESEND_API_KEY` missing | Notify `severity:'info'` (`reason:'missing_api_key'`), send via SMTP. `{success:true, provider:'smtp'}`. |
| Both Resend AND SMTP fail | Notify `severity:'critical'`. Try alert-email via SMTP — if also fails, console.error. `{success:false, provider:'none'}`. DB row is the only signal. |
| `system_notifications` insert fails | console.error, continue. Send still attempts. |
| Alert email send fails | console.error, continue. DB row already written. |
| `ALERT_EMAIL` env var missing | Default to `DemandSignals@gmail.com`. |
| `ARCHIVE_BCC` env var missing | Default to `DemandSignals@gmail.com`. |
| Cloudflare alias not set up | Resend send succeeds (delivery is independent of inbox). Reply emails bounce. Operational fix only — no code impact. |
| Resend webhook signature invalid | Webhook returns 400; no DB write. Resend retries automatically. |
| Resend webhook delivers duplicate | UNIQUE constraint on (resend_message_id, event_type, occurred_at) makes duplicate inserts a no-op. Webhook returns 200. |
| Magic-link page visit logging fails | console.error, page render continues. Tracking is best-effort; never blocks the user. |
| `?e=<send_id>` param missing or invalid | Page logs visit with `send_id=NULL`, still creates engagement row. Tracking is degraded, not broken. |
| BCC archive bounces (gmail full, etc.) | Resend webhook fires `bounced` event for the BCC address. Logged. Original send to client still considered successful. |
| `dsig_attr` cookie signature invalid | Treat as absent. Page renders normally. New cookie set if a magic-link UUID resolves a prospect. |
| `dsig_attr` cookie expired | Treat as absent. Same as above. |
| `ATTRIBUTION_COOKIE_SECRET` env var missing | Cookie verification + signing both fail safely (no crash); attribution falls back to UUID-only and IP-only. Notify `severity:'error'` so admin sees the misconfig. |
| `page_visits` insert fails | Notify `severity:'warning'`, console.error. Page renders normally. |
| `?e=<send_id>` param malformed | Stored as NULL; page_visits row still inserted. |
| Visitor blocks cookies entirely | Each visit is a fresh attribution attempt via UUID only. Marketing-page visits remain unattributed. Acceptable. |
| Visitor uses incognito / different device | Same as cookie-blocked: fresh attribution from UUID. Acceptable. |
| Multiple prospects share an IP (office team) | Logged separately per visit using whatever attribution signal is present. IP groupings visible in admin queries; not used for direct attribution. |

---

## 9. Implementation order

1. Migrations `026_system_notifications.sql` + `027_email_engagement.sql` + `028_page_visits.sql` + bundled APPLY file → user runs in Supabase
2. `src/lib/system-alerts.ts` (no email dependency yet — use SMTP-only path for safety during bootstrap)
3. `src/lib/email-engagement.ts` (write helpers: `recordSend`, `recordWebhookEvent`)
4. `src/lib/attribution-cookie.ts` (sign/verify HS256 JWT, helpers `getAttributionCookie`, `setAttributionCookie`)
5. `src/lib/page-tracking.ts` (`logPageVisit` — depends on attribution-cookie + system-alerts)
6. `src/lib/email.ts` (depends on system-alerts + email-engagement)
7. `src/lib/constants.ts` updates (EMAIL_FROM, EMAIL_REPLY_TO, CLIENT_FACING_KINDS)
8. Migrate 5 email callers in parallel (each is independent)
9. New `src/app/api/webhooks/resend/route.ts` — Resend webhook handler
10. Magic-link pages add visit logging + `?e=` param handling: `/invoice/[number]/[uuid]`, `/sow/[number]/[uuid]`, `/quote/s/[token]`
11. Set `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `ATTRIBUTION_COOKIE_SECRET`, `ALERT_EMAIL`, `ARCHIVE_BCC` in Vercel
12. Configure Resend webhook endpoint in Resend dashboard pointing at `https://demandsignals.co/api/webhooks/resend`
13. Confirm Cloudflare alias forwards
14. Push and run smoke tests

---

## 10. Testing

Manual smoke tests on production after deploy:

| Test | Action | Expected |
|---|---|---|
| Happy path | Trigger contact form | Email arrives in gmail from `noreply@demandsignals.co`. `system_notifications` empty. |
| Resend-down (silent fallback) | Set `RESEND_API_KEY=invalid` in Vercel preview, send invoice | Invoice arrives (via SMTP). `system_notifications` row severity=`info`. Alert email arrives subject `[info] [email] Resend fallback...`. |
| Hard failure | Same as above + break SMTP creds | Send returns `{success:false}`. `system_notifications` row severity=`critical`. No alert email (also broken). console.error captured. |
| Throttle | Loop 5 invalid sends in 30 sec | 5 DB rows. 1 alert email. |
| Reply-To | Open test invoice in gmail, click Reply | To: pre-fills `hunter@demandsignals.co`. |
| Per-purpose from | Trigger each kind | Each arrives with the configured `EMAIL_FROM` value. |
| BCC archive | Send a real invoice to a test recipient | Test recipient AND `DemandSignals@gmail.com` both receive a copy. |
| Send tracking row | Send any email | `email_engagement` has a `sent` row with `send_id`, `resend_message_id`, `kind`, `to_address`, plus FK to source document if applicable. |
| Open tracking | Open the test invoice email in gmail | Within ~10 seconds, `email_engagement` has an `opened` row for the same `send_id`. |
| Click tracking | Click the magic-link button in the email | `email_engagement` gets a `clicked` row. |
| Page visit tracking | Open `/invoice/[number]/[uuid]?e=<send_id>` directly | `email_engagement` gets a `page_visit` row with the send_id. |
| Page visit without tracking param | Open `/invoice/[number]/[uuid]` (no ?e=) | `email_engagement` gets a `page_visit` row with `send_id=NULL`, page renders normally. |
| Webhook idempotency | Resend re-delivers the same `email.opened` event | First insert succeeds, duplicate insert no-ops via UNIQUE constraint. |
| Webhook bad signature | POST to `/api/webhooks/resend` with invalid signature | 400 response, no DB write. |
| Magic-link first visit (cookie-set) | Open invoice magic-link in incognito | `page_visits` row written with `attribution_source='uuid'`, `prospect_id` set, `dsig_attr` cookie set in response headers. |
| Magic-link return visit (cookie attribution) | After above, navigate to `/` (homepage) | (Marketing pages NOT in scope for this project — verify cookie persists for Project #1.5; for Project #1, just confirm cookie is present in DevTools after a magic-link visit.) |
| Same magic-link in different browser | Same URL in different incognito | Fresh `page_visits` row, fresh cookie set. Same prospect attribution. |
| Cookie tampering | Manually edit cookie value to bad signature | Treated as absent; new cookie set on next valid magic-link hit. No crash. |
| `?e=<send_id>` param round-trip | Send invoice → click email link → land on page | `page_visits.email_send_id` populated; `email_engagement` `clicked` row also exists; both cross-reference. |

---

## 11. Out of scope (deferred to Project #1.5 — Universal Engagement Tracking)

These were considered but pushed to a focused follow-up project to keep #1 shippable:

- **Marketing-page attribution** — extending the existing `analytics-db.ts` to also write to `page_visits` when an attribution cookie is present. Existing analytics dashboard keeps working unchanged.
- **Demo-site beacon** — `[client_code].demos.demandsignals.co` POSTing to `https://demandsignals.co/api/track/beacon`. Cross-repo work in `demo-sites` codebase. Includes shared-secret signing for the beacon endpoint.
- **IP geolocation enrichment** — `ip_country`, `ip_region`, `ip_city` columns are reserved in `page_visits` schema; lookup integration deferred. CloudFlare `cf-ipcountry` header is the cheap first step; MaxMind GeoIP2 is the deeper option.
- **Admin per-prospect timeline UI** — chronological view of all email events + page visits for one prospect at `/admin/prospects/[id]/timeline`. Schema supports the query; UI deferred.
- **Per-document engagement timeline UI** on `/admin/invoices/[id]`, `/admin/sow/[id]`.
- **Engagement-based alerts** (e.g. "invoice sent 7 days ago, never opened" → notify Hunter) — alerting cron + rules engine.

Deferred to even-later projects:
- **Admin Command Center "Messages" UI** — surfaces `system_notifications`. Built in Project #2 or #3.
- **`marketing` from-domain (`demandsignals.email`)** — separate domain for outbound marketing blasts. Long-term roadmap per Hunter.
- **Send-throttle/rate-limit at the application layer** — Resend has its own; we don't need our own yet.
- **PDF Pay-button addition** — separate, already-staged commit unrelated to this swap.
- **Per-kind BCC archive aliases** (`invoices-archive@`, `receipts-archive@`) — single archive BCC for now; segregate later if gmail filtering proves insufficient.
- **Inbound email parsing** (e.g. client replies to invoice → auto-thread into prospect record) — Resend has Inbound, but wiring it is its own project.
- **Cookie consent banner** for EU/UK visitors — required when DSIG starts marketing internationally; spec assumes US-only operation today.

---

## 12. Risks

- **Cloudflare alias misconfiguration** at go-live → outbound mail succeeds but client replies bounce. Mitigation: confirm in Cloudflare before flipping.
- **Resend reputation building** — the domain has zero send history. First few hundred sends may have lower deliverability. Mitigation: Resend handles this; warm-up is automatic on Pro plan.
- **Throttle window edge case** — if the throttle SQL query itself fails, the design defaults to sending the alert (false-positive over false-negative). Could result in email flood if DB is sick. Acceptable trade-off.
- **`suppressAlerts` flag misuse** — a future caller passes `suppressAlerts: true` accidentally and silently breaks the alert chain. Mitigation: documented in JSDoc, only used internally by `system-alerts.ts`.
- **Cookie scope confusion** — `Domain=demandsignals.co` covers `*.demandsignals.co` per RFC 6265. This means `staging.demandsignals.co` and `[code].demos.demandsignals.co` would also receive the cookie. For staging/demos, this is fine (those subdomains are prospect-facing too). But it means admin-portal pages on `demandsignals.co/admin/*` ALSO see the cookie. Admin code MUST NOT use `dsig_attr` for admin auth (admin uses its own session); the cookie is purely an attribution signal. Documented in JSDoc.
- **GDPR/CCPA exposure** — IP and persistent cookie are personal data under EU law. Spec assumes US-only operation today. When DSIG opens international marketing, cookie consent banner + privacy policy update become mandatory blockers. Flagged in §11.
- **Page-visits table growth** — every magic-link page view writes a row. At 100 prospects × 10 visits/yr = 1000 rows/yr — trivial. At 10K prospects × 50 visits/yr = 500K rows/yr — still trivial for Postgres. No retention policy needed in #1. Flag for #1.5 if we add marketing-page attribution (volume jumps 100×).

---

## 13. Success criteria

The project is shipped when:

- All 5 callers send via Resend in the happy path; gmail addresses no longer appear in any client-facing `from`
- A single import path (`@/lib/email`) handles every send in the codebase
- Setting `RESEND_API_KEY=invalid` in Vercel preview triggers SMTP fallback AND a `system_notifications` row AND a gmail alert email
- Every client-facing send (invoice, prospect-side report_request) BCCs `DemandSignals@gmail.com` automatically
- Every send writes a `sent` row to `email_engagement` with FK to source document
- Resend webhook events (delivered/opened/clicked/bounced/complained) land in `email_engagement` within seconds
- Magic-link page visits to invoice/sow/quote/receipt pages write `page_visits` rows with full IP/UA/referer
- Magic-link UUID resolves to `prospect_id` and sets `dsig_attr` cookie; subsequent visits read cookie to attribute even when no UUID present
- `?e=<send_id>` correlates page visits to the originating email send
- Hunter can run these queries and get useful data:
  - `SELECT * FROM email_engagement WHERE invoice_id = '<id>' ORDER BY occurred_at` → complete email timeline for an invoice
  - `SELECT * FROM page_visits WHERE prospect_id = '<id>' ORDER BY occurred_at` → every magic-link page view by one prospect
  - `SELECT page_url, count(*), array_agg(DISTINCT prospect_id) FROM page_visits WHERE ip = '<ip>' GROUP BY 1` → "what does this IP look like" for shared-IP investigation
- All smoke tests in §10 pass
- Hunter confirms Cloudflare aliases forward correctly by sending a test reply to a freshly-issued invoice and seeing it land in gmail
