# Environment and Deploy — Operational Runbook

**Owner:** Hunter (DSIG)
**Last updated:** 2026-04-24
**Scope:** Required environment variables, the git push procedure, Vercel auto-deploy, Cloudflare DNS, and common deploy gotchas.

> **The three things to know at 2am:**
> 1. **Use the OAuth token (`gho_...`) for git push, NOT the fine-grained PAT (`github_pat_...`).** The fine-grained PAT returns 403 on push. The OAuth token is in `PROJECT.md` section 2. The credential.helper="" flag prevents Windows GUI popups.
> 2. **Vercel auto-deploys on every push to master.** Do not use the Vercel API to trigger deploys — it conflicts with the project config. Just push to master and watch the Vercel dashboard.
> 3. **Always run `npm run build` locally before pushing.** TypeScript errors that slip past ts-check will cause the Vercel build to fail. Build locally, fix, then push.

---

## Emergency procedures

### Vercel build failed

1. Vercel Dashboard → `demandsignals-next` → Deployments → click the failing deploy
2. Click "Build Logs" → scroll to the first error
3. Common causes:
   - TypeScript error: fix the type error locally, `npm run build` to confirm clean, push
   - Missing env var: add it in Vercel Dashboard → Settings → Environment Variables, then redeploy
   - `NEXT_PUBLIC_SUPABASE_URL` not set: this causes `/api/admin/config` route to fail at build-time static analysis. Ensure it's set in Vercel.
4. To redeploy the last commit without changes:
   ```bash
   # Just push a trivial no-op (empty commit)
   git commit --allow-empty -m "chore: trigger redeploy"
   git push origin master
   ```

### Site is down / 500 on all routes

1. Check Vercel status: https://vercel-status.com
2. Check Supabase status: https://status.supabase.com
3. If both are green: check the most recent deployment for errors
4. Emergency rollback via git revert (do NOT force-push master):
   ```bash
   git revert HEAD
   git push origin master
   # Vercel auto-deploys the revert commit
   ```

### DNS change broke the site

All DNS for `demandsignals.co` goes through Cloudflare. Critical rule: **Cloudflare proxy must be OFF (grey cloud)** for Vercel domains.

DNS records:
- `@` (apex) → A record → `216.150.1.1` (Vercel) — Proxy: DNS Only (grey)
- `www` → CNAME → `cname.vercel-dns.com` — Proxy: DNS Only (grey)

If you accidentally turned on the orange cloud (proxied):
1. Cloudflare Dashboard → DNS → click the orange cloud → it turns grey
2. DNS propagates in ~1 minute

SSL mode must be Full (Strict) in Cloudflare → SSL/TLS.

---

## Environment variables

### Required in `.env.local` AND Vercel (all environments)

| Variable | Purpose | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server-only) | Supabase Dashboard → Settings → API |
| `ANTHROPIC_API_KEY` | Claude AI calls | Anthropic Console → API keys |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL | `https://demandsignals.co` |

### Stripe (required for payment flows)

| Variable | Purpose |
|---|---|
| `STRIPE_API_KEY` | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_...`) — from Stripe Dashboard → Webhooks |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_live_...`) — for future client-side flows |

### Twilio (required for SMS)

| Variable | Purpose |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_VERIFY_SERVICE_SID` | Verify service SID (`VAcacb2e174a73a26ac4d870ab155f53a2`) |
| `TWILIO_DSIG_866_NUMBER` | DSIG outbound SMS number |

### Email (required for email delivery)

| Variable | Purpose |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `DemandSignals@gmail.com` |
| `SMTP_PASS` | Gmail app password (2FA required) |
| `CONTACT_EMAIL` | `DemandSignals@gmail.com` |

### Cloudflare R2 (required for file storage)

| Variable | Purpose |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token ID |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_PUBLIC_BUCKET` | `dsig-assets-public` |
| `R2_PUBLIC_URL` | `https://assets.demandsignals.co` |
| `R2_PRIVATE_BUCKET` | `dsig-docs-private` |
| `R2_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |

### Quote engine

| Variable | Purpose |
|---|---|
| `QUOTE_PHONE_ENCRYPTION_KEY` | 32-byte hex — AES-GCM key for phone numbers |
| `QUOTE_PHONE_HASH_PEPPER` | Random string for deterministic lookup hash |

### Analytics

| Variable | Purpose |
|---|---|
| `POSTGRES_URL` | Vercel Postgres connection string (visitor analytics) |

### Supabase Google OAuth

| Variable | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

---

## Vercel project details

| Item | Value |
|---|---|
| Project name | `demandsignals-next` |
| Team ID | `team_jPyeNYJSdDRpqSdsw3WD3AiQ` |
| Project ID | `prj_MOFD7RLAS1tVLG1yLlt0kIZwPQrp` |
| Production URL | `https://demandsignals.co` |
| Preview URL | `https://dsig.demandsignals.dev` (migration to preview.demandsignals.co pending) |
| Auto-deploy trigger | Push to `master` branch |
| Framework preset | Next.js |
| Node version | 20.x |

---

## Git push procedure (headless bash)

Windows credential manager blocks interactive git auth in scripts. Always use this pattern:

```bash
# Get the OAuth token from PROJECT.md (the gho_... one, NOT github_pat_...)
GHTOKEN=$(grep -oE 'gho_[A-Za-z0-9]+' PROJECT.md | head -1)

git -c credential.helper="" \
  -c "http.https://github.com.extraheader=Authorization: Basic $(echo -n "demand-signals:${GHTOKEN}" | base64 -w0)" \
  push origin master
```

**Important:**
- Use the `gho_...` OAuth token for git push — fine-grained PATs (`github_pat_...`) return 403 on push
- `credential.helper=""` prevents Windows from intercepting and opening a GUI dialog
- `-w0` in base64 prevents line wrapping which would corrupt the token

---

## Local development

```bash
cd D:/CLAUDE/demandsignals-next
npm run dev
# → http://localhost:3000

# Build check (run before every push):
npm run build
# Must succeed with 0 TypeScript errors and 0 Next.js build errors
```

**What `.env.local` needs:** copy the full list from above. Hunter's local `.env.local` intentionally omits `TWILIO_*` and phone encryption keys — those flows are tested against Vercel staging.

---

## `next.config.ts` critical entries

```typescript
serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium']
```

These must be present. If removed, PDF routes 500 on Vercel. See `pdf-pipeline.md`.

Also: CSP header is configured in `next.config.ts` headers. If you add a new third-party script, add its domain to `script-src`.

---

## Build-time known gotcha — NEXT_PUBLIC_SUPABASE_URL

The route `src/app/api/admin/config/route.ts` (the settings page API) references `NEXT_PUBLIC_SUPABASE_URL` at module evaluation time for a readiness check. If this env var is not set in Vercel, the build may succeed but the route fails with a static analysis error in some Next.js versions.

**Fix:** ensure `NEXT_PUBLIC_SUPABASE_URL` is set in Vercel → Settings → Environment Variables for Production, Preview, and Development.

---

## Vercel function timeout

Default function timeout: 10 seconds (Vercel Hobby), 60 seconds (Vercel Pro).

PDF routes (Chromium cold start) can take 5–8 seconds. If cold-start + render approaches 10 seconds, the function will timeout on Hobby plan.

**Fix options:**
1. Upgrade to Vercel Pro (60 second timeout)
2. Add `export const maxDuration = 60` to PDF route files (Vercel Pro feature)
3. Pre-warm by calling a lightweight endpoint before triggering a PDF

---

## Chromium binary cold-start trade-off

The Chromium binary is fetched from GitHub on every new serverless instance. This is a ~60 MB download that takes 4–8 seconds. Pros:
- No binary bundled in deploy artifact (Vercel function size limit: 50 MB compressed)
- Binary can be updated by changing the URL in `chromium.ts` without a full redeploy

Con: first PDF on a new instance is slow. See `pdf-pipeline.md` for the R2 fallback URL.

---

## Troubleshooting

### TypeScript error during build on Vercel

Build log shows `error TS2345: ...`. The local build must have been dirty.

1. Run `npx tsc --noEmit` locally
2. Fix all errors shown
3. Run `npm run build` to verify clean
4. Push

### 404 on all routes after deploy

New Next.js build may have generated different static routes. Check:
- `supabase/migrations/APPLY-*` — if a new migration changed a table the code references, and the migration wasn't applied to the Supabase project
- Vercel build logs for any "could not resolve" errors on dynamic segments

### Missing env var causes 500 on one route but not others

Env vars are read at runtime (not build time) except for `NEXT_PUBLIC_*` vars. If one route 500s immediately:
1. Check Vercel function logs for `Cannot read properties of undefined` or `is not defined`
2. Add the missing env var in Vercel → Settings → Environment Variables
3. Redeploy (push an empty commit)

---

## Cross-references

- `pdf-pipeline.md` — `serverExternalPackages` requirement + Chromium cold-start
- `security-and-rls.md` — `SUPABASE_SERVICE_ROLE_KEY` and auth model
- `supabase-migrations.md` — applying migrations after deploy
- `when-something-breaks.md` — emergency index
