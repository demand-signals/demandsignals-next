# DSIG Operator's Playbook

Last updated: 2026-04-24

## What this is

Start-here doc for anyone (human or agent) opening a new session. For reference details, see CLAUDE.md. For history, see MEMORY.md.

---

## The stack in 60 seconds

- Next.js 16 App Router + Supabase Postgres + Vercel
- Admin portal at /admin (middleware-gated Google OAuth)
- Public site = marketing + /quote AI budget estimator
- PDFs via in-repo Chromium HTML→PDF (`src/lib/pdf/`)
- Document numbering: TYPE-CLIENT-MMDDYY{A} (see CLAUDE.md §20)
- File storage: Cloudflare R2 — public (`assets.demandsignals.co`) + private (signed URLs)

---

## Daily operations

### Issue a proposal to a new prospect

1. Prospect comes in via /quote (self-serve) or admin creates via /admin/prospects + /admin/sow/new
2. Confirm `client_code` is set on the prospect (auto-suggested; override at /admin/prospects/[id])
3. Build SOW at /admin/sow/new — or use "Continue to SOW" from /admin/quotes/[id] if an EST exists
4. Preview PDF — should be `SOW-CLIENT-MMDDYYA.pdf`
5. Send via /admin/sow/[id] → client receives magic link `/sow/[number]/[uuid]`

### Client accepts SOW

- They click Accept on the magic-link page (`/sow/[number]/[uuid]`)
- Auto-creates: deposit invoice (`INV-CLIENT-MMDDYYA`), subscription rows for recurring deliverables, project row with phases, flips `prospect.is_client=true`
- Admin sees the new invoice in /admin/invoices + project in /admin/projects

### Invoice paid

- /admin/invoices/[id] → Mark Paid (full or partial amount)
- Auto-creates receipt (`RCT-CLIENT-MMDDYYA`)
- Partial payment: invoice stays `sent`; balance = `total_due - sum(receipts.amount_paid)`

### Mark a project phase complete

- /admin/projects/[id] → expand the phase → set status to `completed`
- Deliverable statuses track individually (pending / delivered)

---

## Common tasks

### Apply a new migration

Paste `supabase/migrations/APPLY-NNN-YYYY-MM-DD.sql` into Supabase SQL Editor → Run.
After running, wait ~30s for PostgREST schema cache to refresh before hitting API routes.

### Push code to production

```bash
npm run build          # ALWAYS run locally first — catches TS + Next.js errors
git add <files>
git commit -m "..."
# Then push using the token from PROJECT.md §2:
GHTOKEN=$(grep -oE 'gho_[A-Za-z0-9]+' D:/CLAUDE/demandsignals-next/PROJECT.md | head -1)
git -c credential.helper="" \
  -c "http.https://github.com.extraheader=Authorization: Basic $(echo -n "demand-signals:${GHTOKEN}" | base64 -w0)" \
  push origin master
```

Vercel auto-deploys on push to master.

### Check if a migration landed

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = '<table>' AND column_name = '<col>';
```

### Debug schema cache errors

"Could not find column X" after a migration that ran cleanly = PostgREST cache lag.
Wait 30s, reload page. Not a migration bug.

### Allocate a document number manually

```ts
import { allocateDocNumber } from '@/lib/doc-numbering'
const num = await allocateDocNumber('INV', 'HANG', new Date(), invoiceId, 'invoices')
// → 'INV-HANG-042324A'
```

### Preview a PDF locally

Chromium binary downloads at cold-start (remote URL). Locally: `npm run dev` then hit
`GET /api/admin/sow/[id]/pdf` — first call may be slow (~5s) while binary downloads.

---

## Where things live

| What | Where |
|------|-------|
| PDF rendering | `src/lib/pdf/` |
| Magic-link public pages | `src/app/sow/[number]/[uuid]`, `src/app/invoice/[number]/[uuid]`, `src/app/quote/s/[token]` |
| Admin pages | `src/app/admin/*` |
| Doc numbering | `src/lib/doc-numbering.ts` |
| Brand tokens (PDF) | `src/lib/pdf/_shared.ts` |
| Brand tokens (web) | `src/app/globals.css` |
| Supabase migrations | `supabase/migrations/` |
| R2 storage helper | `src/lib/r2-storage.ts` |
| Prospect scoring | `src/lib/scoring.ts` |
| PDF design spec | `J:\My Drive\Agentic Agents\CLAUDE\DSIG\DSIG_PDF_STANDARDS_v2.md` |

---

## Don't re-debate (locked architectural decisions)

1. **One apex domain** (`demandsignals.co`) — cookies, OAuth, CORS all unified. See CLAUDE.md §18.
2. **Cloudflare R2 for file storage.** Two buckets: public (`assets.demandsignals.co`) + private (signed URLs via admin routes). See CLAUDE.md §19.
3. **services_catalog is the single source of truth** for line items across EST, SOW, INV, RCT.
4. **subscription_plans is the only plans table.** Retainer tiers are rows with `is_retainer=true`.
5. **Document numbering is TYPE-CLIENT-MMDDYY{A}.** Legacy numbers preserved. See CLAUDE.md §20.
6. **PDF pipeline is Chromium HTML→PDF in-repo.** Python ReportLab renderer is deprecated. Design spec (DSIG_PDF_STANDARDS_v2.md) still applies to both. See CLAUDE.md §21.
7. **Prospects transition to clients via `is_client` flag.** No separate clients table. Project row is created on SOW accept.

---

## Roadmap reference

See CLAUDE.md §11 "What Is NOT Done (Open Work)" for the current priority list.

---

## When in doubt

1. Read CLAUDE.md top-to-bottom
2. Search MEMORY.md for a date near the thing you're wondering about
3. Check `git log --oneline` — commit messages are descriptive
4. Ask before guessing
