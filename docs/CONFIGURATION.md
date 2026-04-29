# Configuration Reference — DSIG Next.js

> Canonical list of every environment variable used by this project.
> **Values live in Vercel + `PROJECT.md` (gitignored) — never in this file.**
>
> Update this file whenever an env var is added, removed, or changes purpose.

**Last updated:** 2026-04-17 (cross-referenced against live `.env.local` and Vercel dashboard)

---

## Quick map — by feature

| Feature | Required env vars |
|---|---|
| Next.js core | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL` |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_WEBHOOK_SECRET` |
| Analytics DB | `POSTGRES_URL` / `NEON_DATABASE_URL` / `DATABASE_URL` (fallback chain) |
| PostHog | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` |
| Google Analytics | `GOOGLE_MEASUREMENT_API` |
| Contact form | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_EMAIL` |
| Claude API | `ANTHROPIC_API_KEY` |
| **Quote estimator — phone encryption** | `QUOTE_PHONE_ENCRYPTION_KEY`, `QUOTE_PHONE_HASH_PEPPER` (+ optional `QUOTE_PHONE_ENCRYPTION_KEY_PREV`) |
| **Quote estimator — Twilio** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` |
| Twilio outbound (Stage C) | `TWILIO_DSIG_866_NUMBER`, `TWILIO_DSIG_PLATFORM_SID`, `TWILIO_DSIG_PLATFORM_SECRET` |
| Google OAuth (admin sign-in) | Configured inside the Supabase dashboard (Authentication → Providers → Google), not via Vercel env vars |
| Google Calendar (booking integration) | `GOOGLE_DSIG_MAIN_ID_042826`, `GOOGLE_DSIG_MAIN_SECRET_042826`, `GOOGLE_OAUTH_REDIRECT_URI`, `BOOKING_SLOT_SECRET` (dated names exclusively — see CLAUDE.md §12) |
| Meta (Facebook + Instagram) | `META_APP_ID`, `META_APP_SECRET`, `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN`, `FACEBOOK_PERMISSION_TOKEN`, `INSTAGRAM_ACCESS_TOKEN` |
| Blogger (Google Blogger API) | `BLOGGER_API_KEY`, `BLOGGER_BLOG_ID`, `BLOGGER_CLIENT_ID`, `BLOGGER_CLIENT_SECRET` |
| Tumblr | `TUMBLR_API_KEY`, `TUMBLR_SECRET_KEY`, `TUMBLR_OAUTH_CONSUMER_KEY`, `TUMBLR_TOKEN`, `TUMBLR_TOKEN_SECRET`, `TUMBLR_ACCESS_TOKEN`, `TUMBLR_BLOG_NAME` |
| Media generation | `ELEVENLABS_API_KEY`, `FAL_KEY` |
| Cron auth | `CRON_SECRET`, `VERCEL_ANALYTICS_CRON_SECRET` |
| Infra tokens | `GITHUB_DEMANDSIGNALS_NEXT`, `VERCEL_DEMANDSIGNALS_NEXT` |

---

## Core

### `NEXT_PUBLIC_SITE_URL`
- **Value:** `https://demandsignals.co` (prod), `http://localhost:3000` (dev)
- **Used by:** [src/lib/metadata.ts](src/lib/metadata.ts), sitemap, OG tags, canonical URLs
- **Notes:** `NEXT_PUBLIC_` prefix means it's baked into the client bundle. Safe.

### `NEXT_PUBLIC_APP_URL`
- **Likely duplicate of `NEXT_PUBLIC_SITE_URL`** — verify which is referenced where before deprecating either.

---

## Supabase

### `NEXT_PUBLIC_SUPABASE_URL`
- **Format:** `https://<project-ref>.supabase.co`
- **Used by:** [src/lib/supabase/](src/lib/supabase/) (client.ts, admin.ts, server.ts)

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Format:** JWT
- **Notes:** Public — safe in bundle because RLS policies gate all access.
- **Rotation:** Supabase dashboard → Settings → API.

### `SUPABASE_SERVICE_ROLE_KEY`
- **Format:** JWT
- **Used by:** [src/lib/supabase/admin.ts](src/lib/supabase/admin.ts) — every API route DB write
- **⚠️ NEVER expose to client.** Bypasses all RLS. If leaked, rotate immediately.
- **Rotation:** Supabase dashboard → Settings → API → roll service_role secret.

### `SUPABASE_WEBHOOK_SECRET`
- **Format:** arbitrary string
- **Used by:** Supabase database webhooks (scoring agent, see `001_crm_spine.sql` and `agent-utils.ts`)
- **Rotation:** Update BOTH Supabase webhook config AND Vercel env, then redeploy.

---

## Analytics

### `POSTGRES_URL` / `NEON_DATABASE_URL` / `DATABASE_URL`
- **Format:** `postgres://user:pass@host:port/db`
- **Used by:** [src/lib/analytics-db.ts](src/lib/analytics-db.ts) fallback chain for the admin analytics dashboard
- **Notes:** Separate from Supabase. Vercel Postgres / Neon instance. Pageview tracking only, not business data.

### `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST`
- **Used by:** PostHog client-side analytics (behavioral tracking, session replay)
- **Notes:** Set up per PostHog dashboard. Public by design.

### `GOOGLE_MEASUREMENT_API`
- **Used by:** Server-side GA4 Measurement Protocol events
- **Format:** API secret from GA4 admin → Data Streams → Measurement Protocol API secrets

---

## Contact form (SMTP)

### `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- **Current:** Gmail (smtp.gmail.com:587), user `DemandSignals@gmail.com`
- **SMTP_PASS:** Gmail app password — generate at https://myaccount.google.com/apppasswords
- **Used by:** nodemailer in contact/subscribe/report-request API routes

### `CONTACT_EMAIL`
- **Value:** `DemandSignals@gmail.com`
- **Used by:** contact form recipient address

---

## Claude API

### `ANTHROPIC_API_KEY`
- **Format:** `sk-ant-api...`
- **Used by:**
  - [src/lib/quote-ai.ts](src/lib/quote-ai.ts) — quote estimator AI
  - [scripts/backfill-changelog.mjs](scripts/backfill-changelog.mjs) — blog generation
- **Session-level caps:** enforced in [src/lib/quote-ai-budget.ts](src/lib/quote-ai-budget.ts) — 8K input/req, 1K output/req, 60K cumulative/session, $2/session
- **Kill switch:** `UPDATE quote_config SET value='false'::jsonb WHERE key='ai_enabled'` — stops all quote estimator AI calls in under 30 seconds (config cache TTL)
- **Rotation:** Anthropic console → API keys.

---

## Quote Estimator — phone encryption

### `QUOTE_PHONE_ENCRYPTION_KEY`
- **Format:** 32 bytes as hex (64 chars) OR base64 (44 chars)
- **Used by:** [src/lib/quote-crypto.ts](src/lib/quote-crypto.ts) — AES-256-GCM encryption of `quote_sessions.phone_encrypted`
- **Generate:**
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Rotation:** Move OLD to `QUOTE_PHONE_ENCRYPTION_KEY_PREV`, set NEW as `QUOTE_PHONE_ENCRYPTION_KEY`. `decryptPhone()` tries current, then previous.
- **⚠️ LOSING THIS KEY MAKES ALL ENCRYPTED PHONES UNREADABLE.** Back up to a password manager.

### `QUOTE_PHONE_ENCRYPTION_KEY_PREV` (optional)
- Set only during key rotation windows.

### `QUOTE_PHONE_HASH_PEPPER`
- **Format:** arbitrary string (32+ chars recommended)
- **Used by:** `hashPhone()` — SHA-256 of E.164 phone + pepper → `quote_sessions.phone_e164_hash` (auto-match lookups without decrypting)
- **⚠️ Never change this after launch.** Changing it invalidates every existing phone hash.

---

## Quote Estimator — Twilio

### `TWILIO_ACCOUNT_SID`
- **Format:** `AC` + 32 hex chars
- **Used by:** [src/lib/quote-twilio.ts](src/lib/quote-twilio.ts)
- **Find:** Twilio Console → Account Info

### `TWILIO_AUTH_TOKEN`
- **Format:** 32 hex chars
- **Used by:** [src/lib/quote-twilio.ts](src/lib/quote-twilio.ts)
- **⚠️ Master auth token.** Prefer API Key pairs for scripts.
- **Rotation:** Twilio Console → API keys & tokens → roll.

### `TWILIO_VERIFY_SERVICE_SID`
- **Format:** `VA` + 32 hex chars
- **Current value:** `VAcacb2e174a73a26ac4d870ab155f53a2` ("Demand Signals Quote" service)
- **Features:** SMS channel, Fraud Guard ON, 6-digit codes, 10-min expiry
- **Used by:** Phone gate at `/quote` — send and check verification codes
- **Notes:** Verify services are *configurations*, not credentials. Multiple can coexist per account.
- **Not affected by 10DLC registration** — Twilio uses short codes upstream.

### `TWILIO_DSIG_866_NUMBER`
- **Format:** E.164
- **Used by:** Stage C — outbound SMS cadence (NOT Stage B)
- **⚠️ 10DLC BLOCKER:** Unregistered as of 2026-04-17. All outbound SMS from this number blocked by Twilio until A2P 10DLC Marketing registration completes.

### `TWILIO_DSIG_PLATFORM_SID` / `TWILIO_DSIG_PLATFORM_SECRET`
- **Format:** `SK...` / hex
- **Used by:** Automation tooling (not runtime). Safer than master `AUTH_TOKEN` for scripts.

---

## Google OAuth (admin sign-in)

The Supabase Auth Google provider holds its own client_id/secret INSIDE the Supabase dashboard (Authentication → Providers → Google) — these are NOT Vercel env vars. There is no overlap with the Calendar integration credentials below.

- **Access control:** Sign-in alone does NOT grant access. The `admin_users` allowlist table in Supabase is the gate. Any Google user who is not in `admin_users` gets 403 on every `/api/admin/*` call via `requireAdmin()`.
- **Rotation:** Google Cloud Console → APIs & Services → Credentials → rotate client secret → update Supabase provider config.

---

## Google Calendar (booking integration)

Calendar code (`src/lib/google-oauth.ts`) reads dated DSIG_MAIN names exclusively. Generic `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are NOT consulted — see CLAUDE.md §12 for the collision history that led to retiring generic names entirely.

### `GOOGLE_DSIG_MAIN_ID_042826`
- **Value:** DSIG Main OAuth client ID (prefix `995295804425-tm28...`, GCP project `demand-signals-489406`)
- **Used by:** `src/lib/google-oauth.ts` for refresh-token redemption
- **Rotation:** GCP Console → DSIG Main credential → "+ Add secret" → set new value in Vercel under a new dated name (e.g. `GOOGLE_DSIG_MAIN_ID_<MMDDYY>`), update the env var name in `src/lib/google-oauth.ts` + the verification script, deploy, then drop the old dated env var from Vercel and the old secret from GCP

### `GOOGLE_DSIG_MAIN_SECRET_042826`
- **Value:** DSIG Main OAuth client secret
- **Rotation:** same flow as above — paired with the ID

### `GOOGLE_OAUTH_REDIRECT_URI`
- **Value:** `https://demandsignals.co/api/integrations/google/callback`
- **MUST match exactly** the redirect URI registered on DSIG Main in GCP

### `BOOKING_SLOT_SECRET`
- **Value:** 32-byte hex
- **Used by:** `src/lib/slot-signing.ts` to HMAC-sign slot ids the AI passes around (prevents prompt-injection from fabricating arbitrary booking timestamps)
- **Generate:** `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- **Rotation impact:** in-flight slot ids return `invalid_slot` after rotation; slots are short-lived (offered → booked within minutes), so safe to rotate any time

### Diagnostic endpoint
`GET /api/integrations/google/debug` (admin-gated) reports the live state of all relevant env vars, which one Calendar would actually use, and whether the client_id matches DSIG Main's prefix. Run this before debugging any "calendar disconnected" report.

---

## Meta / Facebook / Instagram

### `META_APP_ID` / `META_APP_SECRET`
- **Used by:** Facebook Graph API integration (page posting, Instagram)

### `FACEBOOK_PAGE_ID`
- **Used by:** Target FB page for syndication

### `FACEBOOK_PAGE_ACCESS_TOKEN`
- **Used by:** Page-level posting. Long-lived token.

### `FACEBOOK_PERMISSION_TOKEN`
- **Used by:** Specific permission scope actions

### `INSTAGRAM_ACCESS_TOKEN`
- **Used by:** Instagram posting via Meta's Graph API

---

## Blogger (Google Blogger API)

### `BLOGGER_API_KEY`, `BLOGGER_BLOG_ID`, `BLOGGER_CLIENT_ID`, `BLOGGER_CLIENT_SECRET`
- **Used by:** Blog syndication from this site to Blogger
- **Blogger API reference:** https://developers.google.com/blogger/docs/3.0/using

---

## Tumblr

### `TUMBLR_API_KEY`, `TUMBLR_SECRET_KEY`, `TUMBLR_OAUTH_CONSUMER_KEY`, `TUMBLR_TOKEN`, `TUMBLR_TOKEN_SECRET`, `TUMBLR_ACCESS_TOKEN`, `TUMBLR_BLOG_NAME`
- **Used by:** Tumblr syndication ([src/lib/oauth1a.ts](src/lib/oauth1a.ts) suggests Tumblr OAuth 1.0a flow)
- **Notes:** Tumblr uses OAuth 1.0a — the multiple token/secret pairs are a property of that protocol, not redundancy.

---

## Media generation

### `ELEVENLABS_API_KEY`
- **Used by:** ElevenLabs voice synthesis
- **Status:** May be redundant with VAPI (see MEMORY.md "Open questions"). Confirm before future work.

### `FAL_KEY`
- **Used by:** fal.ai for image/video generation
- **Check:** `grep -r FAL_KEY src/` to find current usage

---

## Cron authentication

### `CRON_SECRET`
- **Used by:** Vercel Cron jobs — every cron endpoint must verify `Authorization: Bearer ${CRON_SECRET}` header
- **⚠️ All Stage A+B+C cron work uses this.** Do not rotate without updating `vercel.json` cron definitions.

### `VERCEL_ANALYTICS_CRON_SECRET`
- **Used by:** Analytics-specific cron (likely for the weekly report)
- **Possibly redundant** with `CRON_SECRET` — investigate before adding new crons.

---

## Infrastructure tokens

### `GITHUB_DEMANDSIGNALS_NEXT`
- **Format:** OAuth token (`gho_...`)
- **Used by:** Vercel's GitHub integration for auto-deploy
- **⚠️ Fine-grained PATs (`github_pat_...`) return 403 on git push.** Use OAuth token only.

### `VERCEL_DEMANDSIGNALS_NEXT`
- **Format:** `vca_` + hex
- **Used by:** Vercel API / CLI operations

---

## Automatic Vercel runtime vars (don't set manually)

These are set by Vercel automatically at deploy time — don't add to `.env.local` or set manually:

`VERCEL`, `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_TARGET_ENV`, `VERCEL_OIDC_TOKEN`, `VERCEL_GIT_*` (commit SHA, branch, author, repo, etc.)

---

## Additional env vars (second-page audit 2026-04-17)

The full Vercel dashboard contains more than initially visible. Additional vars Hunter confirmed set:

### Future payments
- `STRIPE_API_KEY` — Stripe (not yet wired into any flow; reserved for Stage D+ paid invoice collection)

### Alt Anthropic key
- `ANTHROPIC_AGENT_DSIG_PLATFORM` — Separate Anthropic API key, likely for a different rate-limit pool or org. Default quote estimator still uses `ANTHROPIC_API_KEY`. Before switching, verify the key has Claude Sonnet/Opus access on the intended org.

### PostHog server-side
- `POSTHOG_CLAUDE_KEY` — server-side PostHog (distinct from the `NEXT_PUBLIC_POSTHOG_KEY` client-side key)
- `POSTHOG_DSIG_TOKEN` — PostHog project token
- `POSTHOG_DSIG_ID` — PostHog project ID

### Neon Postgres (dedicated analytics instance)
- `NEON_DATABASE_URL` — primary connection string
- `NEON_POSTGRES_URL_NO_SSL` — without SSL mode (use only for development or IP-allowlisted hosts)
- `NEON_PGHOST_UNPOOLED` — direct host for migrations / one-off queries
- `NEON_POSTGRES_DATABASE` — database name
- `NEON_POSTGRES_PASSWORD` — password component

**Correction to earlier:** The admin analytics dashboard uses **Neon Postgres**, not Vercel Postgres. `analytics-db.ts` falls through `NEON_DATABASE_URL → DATABASE_URL → POSTGRES_URL`.

### Vercel Postgres (second Postgres instance)
Separate from Neon — possibly a legacy or parallel setup:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL` — for Prisma connection pooling
- `POSTGRES_URL_NON_POOLING` — for direct connections (migrations)
- `POSTGRES_USER`, `POSTGRES_HOST`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`

**Worth investigating:** Which of Neon vs Vercel Postgres is the active analytics store. If both are live, one is dead weight.

### Supabase — dual key generations
Supabase rotated their key naming in early 2026. Both are set for compatibility:

| Old name | New name | Status |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Both active |
| `SUPABASE_ANON_KEY` | `SUPABASE_PUBLISHABLE_KEY` | Both active |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | Both active |
| — | `SUPABASE_JWT_SECRET` | Server-side JWT verification |
| `NEXT_PUBLIC_SUPABASE_URL` | `SUPABASE_URL` | Both active |

**Action item:** Confirm all our code references the old names (which still work). When Supabase deprecates the old names, do a migration sweep.

### Tumblr — one extra
- `TUMBLR_OAUTH_JS` — purpose unclear from name alone. May be a typo or a specific OAuth JS flow artifact. Confirm before relying on it.

---

## Currently MISSING from Vercel

**None found.** Full audit on 2026-04-17 confirmed every Stage B quote-estimator var is present.

---

## Checklist when adding a new env var

1. [ ] Add to this file with name, format, purpose, rotation notes
2. [ ] Add to `.env.local` if safe for local dev (skip OAuth/Twilio secrets — Hunter tests those only against Vercel)
3. [ ] Add to Vercel — all environments (production, preview, development) unless there's a reason not to
4. [ ] Update `MEMORY.md` "Environment state" section
5. [ ] Record sensitive values in `PROJECT.md` (gitignored), NOT here
6. [ ] Reference in code as `process.env.FOO` with clear fallback or explicit `throw` if missing
7. [ ] Update relevant runbook if this affects emergency procedures
8. [ ] Run `npm run build` — ensures no implicit dependency on the var that would crash a deploy

---

## Related files

- [CLAUDE.md](CLAUDE.md) — stable project spec
- [MEMORY.md](MEMORY.md) — current task state
- `PROJECT.md` — local-only, secret values (gitignored)
- [docs/runbooks/quote-estimator.md](docs/runbooks/quote-estimator.md) — operational procedures
