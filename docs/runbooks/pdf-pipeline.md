# PDF Pipeline — Operational Runbook

**Owner:** Hunter (DSIG)
**Last updated:** 2026-04-24
**Scope:** Chromium HTML→PDF rendering pipeline — architecture, cold-start behavior, design tokens, and troubleshooting.

> **The three things to know at 2am:**
> 1. **Cold-start is slow by design.** First PDF on a fresh serverless instance downloads the 60 MB Chromium binary from GitHub to `/tmp`. Expect 4–8 seconds. Subsequent PDFs on the same warm instance: <500ms. This is acceptable for admin-triggered renders; not acceptable if you try to batch-render 50 PDFs at once.
> 2. **`serverExternalPackages` in `next.config.ts` is load-bearing.** Removing `puppeteer-core` or `@sparticuz/chromium` from that list breaks the build with a "module not found" error at runtime on Vercel. Do not remove those entries.
> 3. **The remote binary URL is hardcoded to v147.** If GitHub ever rate-limits or removes that release, PDFs will 500. The R2 fallback URL is the fix — see Troubleshooting below.

---

## Architecture

```
Admin UI (browser)
  → GET /api/admin/sow/[id]/pdf   (or /invoices/[id]/pdf, /receipts/[id]/pdf)
  → Route handler (src/app/api/admin/...)
      → buildSowHtml(sow, client)   (src/lib/pdf/sow.ts)
      → htmlToPdfBuffer(html)       (src/lib/pdf/render.ts)
          → launchChromium()         (src/lib/pdf/chromium.ts)
              → @sparticuz/chromium.executablePath(remoteURL) [cold: ~5s]
              → puppeteer.launch({ args, executablePath, headless: true })
          → page.setContent(html, { waitUntil: 'networkidle0' })
          → page.pdf({ format: 'Legal', printBackground: true })
          → browser.close()
      → Buffer returned as application/pdf
```

### File map

| File | Purpose |
|---|---|
| `src/lib/pdf/chromium.ts` | Launcher: serverless vs local dev path |
| `src/lib/pdf/render.ts` | Core `htmlToPdfBuffer(html, options?)` |
| `src/lib/pdf/_shared.ts` | Brand tokens (T.*), helpers (esc, eyebrow, oDiv, interiorPageHeader, interiorPageFooter, docShell) |
| `src/lib/pdf/sow.ts` | SOW HTML template → full document |
| `src/lib/pdf/invoice.ts` | Invoice HTML template |
| `src/lib/pdf/receipt.ts` | Receipt HTML template |

---

## Page format

**Legal: 8.5 × 14 inches** (612 × 1008 pt). Hardcoded in `render.ts`:
```typescript
format: options.format ?? 'Legal',
```

All templates use `@page { size: Legal; margin: 0; }` — templates handle their own padding internally. The `interiorPageHeader` and `interiorPageFooter` partials add 5px gradient bar + logo row + separator to every interior page.

---

## Cold-start behavior

On Vercel serverless functions, `/var/task` (the deploy artifact) is read-only. The Chromium binary cannot be bundled — it must be fetched at runtime.

**Chromium binary remote URL (hardcoded in `chromium.ts`):**
```
https://github.com/Sparticuz/chromium/releases/download/v147.0.2/chromium-v147.0.2-pack.x64.tar
```

On cold start:
1. `chromium.executablePath(remoteURL)` fetches the `.tar` to `/tmp`
2. Extracts the Chromium binary
3. Returns the local path
4. Subsequent calls on the same instance reuse `/tmp` cache — no re-download

**Impact on admin UX:** the first PDF request after a Vercel instance cold-starts shows a loading spinner for 5–8 seconds. This is expected. Warm requests are <500ms. Vercel keeps instances warm for ~20 minutes of activity.

---

## Design authority

**Source:** `J:\My Drive\Agentic Agents\CLAUDE\DSIG\DSIG_PDF_STANDARDS_v2.md`

That file governs every visual decision: colors, typography, layout, cover design, interior header/footer, table styles. The `src/lib/pdf/_shared.ts` `T` constants are the single implementation of those tokens.

**Canonical brand token values (from `_shared.ts`):**
```typescript
T.SLATE      = '#3D4566'   // dark slate — page cover bg, table headers
T.TEAL       = '#52C9A0'   // accent headlines, eyebrow labels
T.TEAL_S     = '#3ECFAA'   // stat box values, callout borders
T.ORANGE     = '#FF6B2B'   // CTA buttons
T.ORANGE_S   = '#F26419'   // dividers under H1, interior gradient bar
T.BODY       = '#333333'   // body copy
T.GRAY       = '#888888'   // captions, eyebrows, footers
T.BORDER     = '#E2E8F0'   // table grid, card borders
```

**Note:** these differ from the site's CSS vars (`--teal: #68c5ad`, `--dark: #1d2330`). The PDF spec uses slightly different hex values from the original brand standards. Do not "fix" them to match the site — they intentionally reflect the professional print spec.

---

## Changing the design

### To change a shared token (applies to all doc types):
Edit `src/lib/pdf/_shared.ts` — the `T` object. Rebuild to verify.

### To change layout for one doc type:
Edit the relevant file: `sow.ts`, `invoice.ts`, or `receipt.ts`. These import from `_shared.ts` but own their own HTML structure.

### To add a new doc type:
1. Create `src/lib/pdf/newdoc.ts`
2. Import `T`, `esc`, `docShell`, `interiorPageHeader`, `interiorPageFooter` from `_shared.ts`
3. Export `buildNewdocHtml(data: NewdocData, client: ClientInfo): string`
4. Add an admin API route at `src/app/api/admin/newdoc/[id]/pdf/route.ts` that calls `htmlToPdfBuffer(buildNewdocHtml(...))`
5. No new deps needed — Chromium is shared

---

## `next.config.ts` requirement

The `serverExternalPackages` list in `next.config.ts` must include these packages. They use native Node modules that cannot be bundled by webpack:

```typescript
serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium', ...]
```

If these are missing, Vercel build succeeds but runtime throws `Cannot find module` or silent 500 on any PDF route. Verify they're present before any `next.config.ts` edits.

---

## Local development

On Windows (this repo's native environment), `launchChromium()` falls back to the full `puppeteer` package (which ships its own Chrome). The `/tmp` remote-fetch path only runs on Vercel.

If the local `puppeteer` import fails (e.g., not installed), `chromium.ts` falls back to the Sparticuz path which will attempt the remote download. This is slow locally but functional.

**To test PDFs locally:**
```bash
npm run dev
# Then: GET http://localhost:3000/api/admin/sow/[id]/pdf
# Requires a valid SOW id from local Supabase
```

---

## Troubleshooting

### PDF route returns 500 with "binary not found" or "ENOENT"

1. Verify `serverExternalPackages` in `next.config.ts` includes `puppeteer-core` and `@sparticuz/chromium`
2. Verify the remote URL is reachable:
   ```bash
   curl -I "https://github.com/Sparticuz/chromium/releases/download/v147.0.2/chromium-v147.0.2-pack.x64.tar"
   # Expect: HTTP 302 (redirect to S3/CDN) or 200
   ```
3. If GitHub is down or rate-limiting: upload the tar to R2 and update the URL in `chromium.ts`:
   ```typescript
   const remotePack = 'https://assets.demandsignals.co/internal/chromium-v147.0.2-pack.x64.tar'
   ```
   Then `aws s3 cp chromium-v147.0.2-pack.x64.tar s3://dsig-assets-public/internal/` (or use `uploadPublic()` from `r2-storage.ts`).

### PDF renders blank or with broken layout

**Likely cause:** `setContent` with `waitUntil: 'networkidle0'` timed out before the logo URL loaded.

Check: the logo URL in `_shared.ts` is `https://demandsignals.co/logo.png` (served by Vercel from `public/logo.png` in this repo, 750×150 PNG). It's the same production domain the rest of the site lives on, so reachability problems are extremely unlikely — but if Vercel is having an outage or the asset has been deleted from `public/`, the PDF render will hang waiting for the image. If you need to fall back to a different host:
1. Upload the logo to R2: `r2.uploadPublic('brand/dsig_logo_v2b.png', buffer, 'image/png')`
2. Update `LOGO_URL` in `_shared.ts` to `https://assets.demandsignals.co/brand/dsig_logo_v2b.png`

Also check: no `filter: invert(...)` CSS on the logo — invert removes color in PDF mode.

### PDF has correct text but wrong colors (all black/gray)

`printBackground: true` may not be propagating. Verify `render.ts` sets it:
```typescript
await page.pdf({ format: 'Legal', printBackground: true, ... })
```

Also check: the CSS in `_shared.ts` docShell includes:
```css
-webkit-print-color-adjust: exact;
print-color-adjust: exact;
```
These are required for Chromium to render background colors in PDF mode.

### PDF timeout (>30 seconds)

Default Vercel serverless function timeout is 10 seconds (hobby) or 60 seconds (pro). Cold-start + large HTML can approach the limit.

Options:
1. Upgrade to Vercel Pro for 60s timeout
2. Pre-warm the function by calling a lightweight health endpoint (not a PDF) before the user triggers the PDF
3. Add a `maxDuration: 60` export to the API route (Vercel Pro feature)

### Logo appears with wrong aspect ratio or cut off

The PDF template sets `height: 28px; object-fit: contain;` on the logo `<img>`. If the logo file dimensions change significantly, adjust these values in `_shared.ts` `interiorPageHeader()`.

---

## Swap to R2 remote URL (emergency fallback)

If GitHub CDN is blocked or unavailable:

1. Download the Chromium tar locally (from a Sparticuz release or GitHub Actions artifact)
2. Upload to R2 private bucket (not public — this is a binary, not a web asset):
   ```typescript
   await uploadPrivate('chromium/chromium-v147.0.2-pack.x64.tar', fs.readFileSync(tarPath), 'application/x-tar')
   ```
   Wait — private bucket uses signed URLs, but `executablePath()` needs a direct URL. Upload to the **public** bucket instead:
   ```typescript
   const url = await uploadPublic('chromium/chromium-v147.0.2-pack.x64.tar', buffer, 'application/x-tar')
   ```
3. Update `chromium.ts` with the returned URL:
   ```typescript
   const remotePack = 'https://assets.demandsignals.co/chromium/chromium-v147.0.2-pack.x64.tar'
   ```
4. Commit + push. Vercel deploys. Test PDF route.

---

## Cross-references

- `sow-lifecycle.md` — preview PDF from SOW detail page
- `environment-and-deploy.md` — `next.config.ts` serverExternalPackages requirement
- DSIG PDF Standards v2 spec at `J:\My Drive\Agentic Agents\CLAUDE\DSIG\DSIG_PDF_STANDARDS_v2.md`
