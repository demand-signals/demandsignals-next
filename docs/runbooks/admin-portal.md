# Admin Portal — Operational Runbook

**Owner:** Hunter (DSIG)
**Last updated:** 2026-04-24
**Scope:** The DSIG admin portal at `/admin` — sidebar structure, authentication, the command center dashboard, and first-time setup.

> **The three things to know at 2am:**
> 1. **Auth is Google OAuth + admin_users table.** `src/middleware.ts` checks for a valid Supabase session on every `/admin/*` request. If the session cookie is missing or the email isn't in `admin_users`, the request is redirected to `/admin-login`. Fix: sign in with the correct Google account.
> 2. **The sidebar accordion groups are closed by default.** Each click opens one group. The state is component-local (React useState) — refreshing the page collapses everything. This is intentional for a clean initial view.
> 3. **The dashboard tiles use a 5-minute edge cache.** If you just added 10 prospects and the dashboard still shows old counts, wait 5 minutes or append `?cache=miss` (if implemented) to the API call. Or read counts directly in Supabase.

---

## Emergency procedures

### `/admin` redirects to login even when signed in

1. Check that the Google account used is `demandsignals@gmail.com` (or whatever is in `admin_users`)
2. Verify the `admin_users` table has a row:
   ```sql
   SELECT email, created_at FROM admin_users;
   ```
3. If empty — first-time setup: see "First sign-in procedure" below
4. If the email is there but login fails: check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars in Vercel — if these are wrong the OAuth callback can't exchange the code

### Admin inaccessible after DNS change or new Vercel deployment

Check that the OAuth redirect URI in your Supabase Auth settings matches the current URL:
- Supabase Dashboard → Authentication → URL Configuration
- Site URL: `https://demandsignals.co`
- Redirect URLs: include `https://demandsignals.co/auth/callback`

For local dev: also add `http://localhost:3000/auth/callback`.

### Session token expired mid-work

Sessions expire after the Supabase Auth JWT duration (default: 1 hour for access token, 1 week for refresh). If you get redirected to login unexpectedly:
- Sign in again — the refresh token handles this automatically in most cases
- If you're seeing this frequently, check if your browser blocks third-party cookies (Supabase auth uses httpOnly cookies)

---

## First sign-in procedure

This is a one-time setup step required the first time you visit `/admin-login` after deploying to production.

1. Visit `https://demandsignals.co/admin-login`
2. Click "Sign in with Google"
3. Sign in with `demandsignals@gmail.com`
4. OAuth redirects back — you'll see a "Not authorized" page because `admin_users` is empty
5. Open Supabase SQL Editor → insert your email:
   ```sql
   INSERT INTO admin_users (email, created_at)
   VALUES ('demandsignals@gmail.com', now())
   ON CONFLICT DO NOTHING;
   ```
6. Sign in again → you're in

---

## Authentication mechanism

Source: `src/lib/admin-auth.ts`

```typescript
export async function requireAdmin(request: NextRequest) {
  // 1. Creates Supabase client with auth cookie
  // 2. Gets user via getUser() (validates JWT against Supabase Auth)
  // 3. Checks admin_users table for user.email
  // 4. Returns { user } if admin, { error: NextResponse 401 } if not
}
```

Every admin API route starts with:
```typescript
const auth = await requireAdmin(request)
if ('error' in auth) return auth.error
```

The middleware (`src/middleware.ts`) gates the pages: unauthenticated requests to `/admin/*` get a 302 redirect to `/admin-login`. API routes do their own `requireAdmin` check and return 401 (not redirect) for unauthenticated API calls.

---

## Sidebar structure

Source: `src/components/admin/admin-sidebar.tsx`

10 accordion groups. All closed by default.

| Group | Items |
|---|---|
| **PROSPECTING** | Dashboard, Pipeline, Prospects, Budgetary Quotes, Import Prospects |
| **ONBOARDING** | Demo Sites, Statements of Work |
| **CLIENTS** | Manage Clients (soon), Communications (soon), Automations (soon) |
| **PROJECTS** | Project Dashboard (soon), Manage Projects, Timekeeping (soon) |
| **FINANCE** | Invoices, Receipts, Subscriptions, Trade Credits (soon), Reports (soon) |
| **SERVICES** | Service Catalog, Service Plans |
| **CONTENT** | Long-Tail Pages, Blog Posts, ChangeLog Posts |
| **AGENTS** | Prospecting Agent, Scoring Agent (soon), Research Agent (soon), Outreach Agent (soon) |
| **INSIGHTS** | Analytics, PostHog (external link) |
| **ADMIN** | Users (soon), Settings, Security (soon) |

Items marked `soon` are visible but not clickable (cursor: default, opacity: 50%). They have `aria-disabled="true"` and preventDefault on click.

External links (PostHog) open in a new tab with `rel="noopener noreferrer"`.

---

## Dashboard — Command Center

**Route:** `/admin` → `src/app/admin/page.tsx`

The dashboard shows two sections:

### Pipeline funnel

Counts prospects at each stage: Visitors → Leads → Prospects → Qualified → Demos → Proposals → Revenue MTD.

Data source: `GET /api/admin/dashboard/pipeline` (or computed in the page server component). 5-minute edge cache via `cache-control: s-maxage=300`.

### Per-category stat tiles

One tile per sidebar category: Prospects, Invoices (MTD), Subscriptions (active), Projects (in progress), etc.

Time range selector: 7d / 30d / 90d. Default: 30d.

---

## Key pages reference

| URL | Purpose |
|---|---|
| `/admin` | Dashboard / Command Center |
| `/admin/prospects` | Prospect table + filters |
| `/admin/prospects/[id]` | Detail: map, activity, channels, research, documents |
| `/admin/pipeline` | Kanban board by pipeline stage |
| `/admin/quotes` | Budgetary estimate sessions list |
| `/admin/quotes/[id]` | Session detail: transcript, EST badge, Continue to SOW, Mark Launched |
| `/admin/demos` | Demo site tracker |
| `/admin/sow` | SOW list |
| `/admin/sow/new` | Create SOW |
| `/admin/sow/[id]` | SOW detail: edit, send, preview PDF |
| `/admin/invoices` | Invoice list |
| `/admin/invoices/new` | Create invoice (catalog picker + value stack toggle) |
| `/admin/invoices/[id]` | Invoice detail: send, mark-paid, void, refund |
| `/admin/receipts` | Receipt list |
| `/admin/subscriptions` | Subscription list |
| `/admin/subscriptions/[id]` | Subscription detail + billing history |
| `/admin/projects` | Project list |
| `/admin/projects/[id]` | Project detail: phases + deliverable status |
| `/admin/services` | Services catalog CRUD (bulk import CSV/JSON) |
| `/admin/service-plans` | Subscription + retainer plans CRUD |
| `/admin/import` | Prospect import wizard (CSV/JSON) |
| `/admin/settings` | Kill-switch flags + env-var readiness grid |
| `/admin/analytics` | Visitor analytics dashboard |
| `/admin/blog` | Blog posts table |
| `/admin/long-tails` | Long-tail pages (575+) |

---

## Settings page (`/admin/settings`)

Exposes `quote_config` flags as toggles without requiring SQL Editor:
- `ai_enabled` — kill switch for all AI calls
- `stripe_enabled` — Stripe payment links
- `sms_delivery_enabled` — Twilio SMS
- `email_delivery_enabled` — SMTP email
- `subscription_cycle_cron_enabled` — daily cycle invoice generation
- `cadence_enabled` — follow-up SMS cadence (requires A2P Marketing approval)

Also shows env-var readiness booleans: whether STRIPE_API_KEY, TWILIO_*, SMTP_PASS, R2_*, PDF env vars are configured.

**Route:** `GET /api/admin/config` (flags + env booleans), `PATCH /api/admin/config` (upsert a flag)

---

## PostHog integration

The INSIGHTS group includes a direct link to `https://us.posthog.com/project/demandsignals`. This is an external link that opens in a new tab. There is no PostHog SDK embedded in the admin portal — the site's `AnalyticsTracker` component tracks public visitor pages only, not admin sessions.

---

## Troubleshooting

### "Not authorized" after successful Google sign-in

`admin_users` table is empty or doesn't have your email. Run:
```sql
INSERT INTO admin_users (email) VALUES ('demandsignals@gmail.com') ON CONFLICT DO NOTHING;
```
Then sign in again.

### 401 from admin API routes but page loads

The page loaded because middleware passed (session cookie valid), but the API route's `requireAdmin()` call failed. Usually means the `admin_users` row was deleted or the session email changed (e.g., you signed in with a different Google account).

Check:
```sql
SELECT email FROM admin_users;
```

### Dashboard tiles show N/A or 0 for everything

The `GET /api/admin/dashboard` endpoint (or individual tile endpoints) are erroring silently. Check Vercel function logs. Common cause: Supabase connection issue (check `SUPABASE_SERVICE_ROLE_KEY` env var is set).

### Sidebar doesn't show a page I just added

The `NAV_GROUPS` constant in `src/components/admin/admin-sidebar.tsx` is the authoritative list. If a page exists but doesn't appear: add it to the appropriate group in that file. If the page should be marked `soon`, add `soon: true` to its nav item.

---

## Cross-references

- `security-and-rls.md` — admin auth model + Supabase RLS overview
- `environment-and-deploy.md` — required env vars for admin portal
- `quote-estimator.md` (existing) — admin quote session management
