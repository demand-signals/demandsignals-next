# PDF Pipeline — Retrospective Spec

**Date:** 2026-04-24
**Status:** SHIPPED
**Author:** Hunter / Claude (retrospective capture)
**See also:** `docs/runbooks/pdf-pipeline.md` for operational procedures

---

## Problem

DSIG documents (invoices, SOWs, receipts) needed branded PDF generation. The initial approach was a Python Flask microservice (`dsig-pdf-service`) deployed to `pdf.demandsignals.co` using `reportlab`. This created several problems:

1. **Separate deploy with separate drift.** When the TypeScript types changed (new columns on `sow_documents`, new SOW phases shape, TIK fields), the Python renderer had to be updated in a separate repo and deployed separately. During rapid iteration this was a constant bottleneck.
2. **Schema synchronization was fragile.** The Python service accepted a JSON payload whose shape was defined by a separate Python pydantic model. When the TypeScript `SowDocument` type changed, both the TypeScript payload builder AND the Python pydantic model needed updating in lockstep.
3. **ReportLab's output quality lagged the spec.** The `DSIG_PDF_STANDARDS_v2.md` brand spec describes visual elements (gradient bars, ODiv layout, typography hierarchy) that were painstaking to implement in ReportLab and brittle to tweak.
4. **Two operations tracks.** Every PDF debugging session required context about the Python service's logs, its Vercel function URL, the Bearer token auth — a separate mental stack from the Next.js admin portal.

---

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| **Keep Python + fix sync** | No migration cost | Drift problem persists; two codebases forever |
| **Switch to in-repo Chromium HTML→PDF (chosen)** | One deploy, WYSIWYG HTML, same TS types, no schema sync | Cold-start latency (~5s first PDF); bundle size concerns |
| **Paid PDF service (DocRaptor / Prince / WeasyPrint API)** | No cold-start; high-quality output | Per-page cost; external dependency for a core feature; vendor lock |
| **React-PDF (react-pdf/renderer)** | React component model; no browser | Very different layout model from HTML/CSS; can't reuse CSS skills; immature for complex layouts |
| **Puppeteer full (bundled Chrome)** | No download on cold start | 300+ MB bundle; exceeds Vercel function size limits |

---

## Chosen approach: In-repo Chromium HTML→PDF

`puppeteer-core` + `@sparticuz/chromium` runs inside the Next.js API route. The Chromium binary is not bundled (too large) — it is fetched from a GitHub release URL to `/tmp` on cold start, then cached for the instance lifetime.

**Design authority stays unchanged:** `J:\My Drive\Agentic Agents\CLAUDE\DSIG\DSIG_PDF_STANDARDS_v2.md` governs every visual decision. The brand tokens, cover layout, interior header/footer design, typography hierarchy, and ODiv component are all defined there. The implementation in `src/lib/pdf/_shared.ts` (the `T` object and shared partials) is the single TypeScript expression of those standards.

---

## Rationale

- **One deploy.** TypeScript types, HTML templates, and API routes all live in `demandsignals-next`. When `SowDocument` gains a new field, the PDF template can be updated in the same commit.
- **WYSIWYG.** The HTML preview (served by `GET /api/admin/sow/[id]/preview`) renders the same template that produces the PDF. What Hunter sees in the browser is what the client receives.
- **Brand standards are implementation-agnostic.** `DSIG_PDF_STANDARDS_v2.md` was written to describe design intent, not Python API calls. Chromium renders HTML/CSS, so it naturally expresses gradient bars, typography scales, and flexbox layouts that were awkward in ReportLab.
- **Cold-start tradeoff is acceptable.** Admin-triggered PDFs tolerate 5–8 seconds on first render per instance. Vercel keeps instances warm for ~20 minutes of activity. Bulk batch rendering is not a current use case.

---

## Implementation

### File map

| File | Purpose |
|---|---|
| `src/lib/pdf/chromium.ts` | Launcher: Vercel serverless path (remote binary) vs local dev path |
| `src/lib/pdf/render.ts` | Core `htmlToPdfBuffer(html, options?)` function |
| `src/lib/pdf/_shared.ts` | Brand tokens (`T.*`), HTML helpers, `docShell()`, `interiorPageHeader()`, `interiorPageFooter()` |
| `src/lib/pdf/sow.ts` | SOW HTML template |
| `src/lib/pdf/invoice.ts` | Invoice HTML template |
| `src/lib/pdf/receipt.ts` | Receipt HTML template |

### `next.config.ts` requirement

```typescript
serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium', ...]
```

These packages use native Node bindings that webpack cannot bundle. Removing them from this list produces a silent runtime 500 on any PDF route.

### Page format

Legal: 8.5 × 14 inches. All templates use `@page { size: Legal; margin: 0; }` and handle their own internal padding. This matches the Python implementation's format.

### Cold-start path

1. `@sparticuz/chromium.executablePath(remoteURL)` downloads a `.tar` to `/tmp` (first call: ~5s)
2. Extracts Chromium binary locally
3. `puppeteer.launch({ executablePath, headless: true, args: chromium.args })`
4. Subsequent calls on the same warm instance reuse `/tmp` — no re-download

**Remote binary URL (hardcoded, v147):**
```
https://github.com/Sparticuz/chromium/releases/download/v147.0.2/chromium-v147.0.2-pack.x64.tar
```

---

## Brand token values (from `_shared.ts`)

These intentionally differ from the site's CSS vars (`--teal: #68c5ad`). The PDF spec uses values from the original brand standards document. Do not "normalize" them to match the site.

```typescript
T.SLATE      = '#3D4566'   // cover bg, table headers
T.TEAL       = '#52C9A0'   // accent headlines, eyebrow labels
T.TEAL_S     = '#3ECFAA'   // stat box values, callout borders
T.ORANGE     = '#FF6B2B'   // CTA buttons
T.ORANGE_S   = '#F26419'   // dividers, interior gradient bar
T.BODY       = '#333333'   // body copy
T.GRAY       = '#888888'   // captions, eyebrows, footers
T.BORDER     = '#E2E8F0'   // table grid, card borders
```

---

## Rollout notes

- Python `dsig-pdf-service` repo is deprecated but not deleted. The `pdf.demandsignals.co` subdomain can be retired after confirming no live references to `PDF_SERVICE_URL`.
- `src/lib/invoice-pdf/render.ts` and `src/lib/sow-pdf/render.ts` (which called the Python service) should be considered deprecated wrappers — new doc types use `src/lib/pdf/*.ts` directly.
- `PDF_SERVICE_URL` and `PDF_SERVICE_SECRET` env vars can be removed from Vercel once confirmed no code path references them.

---

## Open questions

1. **Scheduled PDF generation.** A future weekly ratings sync may need to auto-generate updated SOW/invoice PDFs. The same `htmlToPdfBuffer()` function can be called from a cron route — but cold-start on a cron function that wasn't recently warm could add latency. Consider pre-warming the function or hosting the Chromium binary on R2 to reduce download time.
2. **Sparticuz binary SLA.** The remote binary URL points to a GitHub release. GitHub has no availability SLA. The mitigation is documented in `docs/runbooks/pdf-pipeline.md` — upload the tar to R2 and swap the URL in `chromium.ts`. This fallback should be prepared proactively rather than waiting for an outage.
3. **Vercel function timeout.** Default timeout on Vercel hobby is 10s, which is tight on cold start. On Pro the limit is 60s. Add `export const maxDuration = 60` to PDF route files if on Pro.
