# Stage C Item 1 — Invoicing System Design

**Status:** approved design, ready for implementation planning
**Author:** Opus 4.7 brainstorming session with Hunter, 2026-04-18
**Prerequisites:** Stage A + B shipped (commit `c695f27`), all migrations applied, 25/25 RLS passing
**Parent plan:** `docs/runbooks/stage-c-plan.md` item 1
**Estimated scope:** 9 migrations, ~1 new service repo, ~18 new files in main repo, ~10 new API routes, 4 new UI pages/sections

---

## 1. Purpose and scope

### What this ships

- Admin-driven invoice creation from quote sessions or standalone
- Invoice versioning via void + re-issue (immutable once sent, new number for corrections)
- Restaurant Rule $0 research invoices — auto-draft from `/quote` CTA, one-click admin Send
- Client-facing public invoice viewer at `/invoice/[number]/[uuid]`
- PDF generation via reusable `dsig-pdf-service` (separate Python microservice)
- R2 cloud storage for all invoice PDFs (immutable, versioned, permanent)
- Persistence across every surface: admin portal, prospect record, future client portal
- Manual-routed delivery (Phase 1) — admin copies URL into preferred channel
- Schema foundations for future SMS delivery (Phase 2), email delivery (Phase 3), auto-route (Phase 4), payment processing (Stage D), backend accounting (Stage D+)

### What is deferred

- SMS delivery via Twilio (Phase 2a test → Phase 2b production, after A2P Transactional campaign approval)
- Email delivery via Gmail SMTP (Phase 3, after SMTP wiring)
- Auto-route on main Send (Phase 4, after both channels live)
- Payment processing / Stripe integration (Stage D)
- Backend accounting / chart-of-accounts / GL mapping (Stage D+)
- Client portal (Stage C item 7 — OAuth Checkpoint 2)
- Bid-accept → invoice flow (Stage C item 3)
- SOW auto-generation (Stage C item 4, separate spec — but uses same `dsig-pdf-service`)
- Recurring billing automation (Stage D, schema supports it via `auto_generated` flags)
- R2 public bucket migration of marketing assets (separate housekeeping)

### External dependencies introduced

- Cloudflare R2 account + 2 buckets (`dsig-assets-public`, `dsig-docs-private`) — Hunter sets up
- New GitHub repo + Vercel project: `demand-signals/dsig-pdf-service` — Hunter sets up
- Custom domain `pdf.demandsignals.co` — Hunter configures DNS
- `@aws-sdk/client-s3` (npm) — R2 is S3-compatible
- Python 3.11 runtime on Vercel (for `dsig-pdf-service`)
- `reportlab`, `pypdf`, `pydantic`, `pytest` (Python deps for PDF service)

### Integration points (existing code, additive-only changes)

- `is_admin()` Postgres function → reused for RLS on new tables
- `requireAdmin` middleware → reused for admin API route auth
- `generate_invoice_number()` Postgres function → already live, reused as-is
- `invoices` and `invoice_line_items` tables → ALTER TABLE adds columns, no drops/renames
- Catalog (`src/lib/quote-catalog-schema.ts` / JSON) → additive: `display_price_cents` field per item
- `/admin/quotes/[id]` page → new action buttons added
- `/admin/prospects/[id]` page → new Documents section added
- `/admin/page.tsx` sidebar → new Finance nav group added
- `quote_config` table → new config keys added (`automated_invoicing_enabled`, etc.)
- `prospects` table → new `delivery_preference` column

---

## 2. Architectural decisions (locked in brainstorm)

### 2.1 Domain architecture (see CLAUDE.md §18)

All DSIG operations on `demandsignals.co` subdomains; `demandsignals.dev` retired (squat-defense only). Invoicing runs on `demandsignals.co` — no cross-TLD concerns. PDF microservice on new subdomain `pdf.demandsignals.co`.

### 2.2 File storage (see CLAUDE.md §19)

Cloudflare R2, two buckets — private for invoices, public for future media. Invoice PDFs live at `invoices/[number]_v[n].pdf` in `dsig-docs-private` bucket. Served to prospects via admin-auth-gated API route that returns 302 redirects to 15-minute signed URLs.

### 2.3 Invoice versioning — void + re-issue

Drafts are mutable. Once an invoice enters `sent` status, it is immutable. Corrections require **void + re-issue**: admin clicks a dedicated button, the old invoice transitions to `void` (with `voided_by`, `voided_at`, `void_reason`, `superseded_by_invoice_id`), and a new invoice is created with a fresh invoice number (`supersedes_invoice_id` points back). Both remain visible forever. PDFs are immutable per version — `invoices/DSIG-2026-0007_v1.pdf` never overwrites even when superseded.

### 2.4 Public URL authentication — uuid suffix

Client-facing URL: `/invoice/[number]/[uuid]`. The `public_uuid` column is a fresh `gen_random_uuid()` per invoice. URL is shareable, un-guessable, requires no login. Timing-attack-safe: always returns 404 on mismatch (does not leak existence). Pattern mirrors existing `quote_sessions.share_token`.

### 2.5 Invoice automation tiers

Schema supports three tiers via `auto_generated`, `auto_trigger`, `auto_sent` flags:

- **Tier 1 (manual):** admin creates + sends. `auto_generated=false`.
- **Tier 2 (auto-draft + review):** system creates draft, admin reviews + clicks send. `auto_generated=true, auto_sent=false`. **Restaurant Rule uses this tier.**
- **Tier 3 (full auto):** system creates + sends without review. `auto_generated=true, auto_sent=true`. Reserved for future contractually-agreed automation (retainers, milestones).

All tiers respect `quote_config.automated_invoicing_enabled` kill switch.

### 2.6 $0 zero-balance handling

Any invoice with `total_due_cents = 0` auto-transitions to `status='paid'` on Send (skips the `sent → awaiting payment → paid` flow). `paid_method='zero_balance'`, `paid_note='Complimentary — no payment required'`. PDF renders with PAID ✓ COMPLIMENTARY stamp. Prevents awkward "awaiting payment: $0" states.

### 2.7 Category hints for future accounting

Every invoice has `category_hint` set at creation: `service_revenue` (default), `marketing_expense` (Restaurant Rule auto-sets this), `research_credit`, `other`. These are breadcrumbs for the Stage D+ accounting module's GL account mapping. Not authoritative yet, but structured data ready when accounting lands.

### 2.8 PDF rendering — shared Python microservice

`dsig-pdf-service` is a separate repo on its own Vercel deployment at `pdf.demandsignals.co`. Implements `DSIG_PDF_STANDARDS_v2` (Legal portrait, Helvetica, gradient bar, slate covers, teal/orange accents). Reusable across every DSIG project forever — proposals, SOWs, reports, audits all use the same shared components (`covers.py`, `components.py`, `typography.py`). One enhancement propagates globally. Each doc type adds one file in `dsig_pdf/docs/`.

### 2.9 Famous-quote back cover

Back cover of every generated PDF includes a deterministically-chosen famous quote contextual to the doc_type. Seeded by doc identifier (invoice number, SOW id, etc.) so re-renders produce the same quote. Starter quote bank ~30-50, grown over time. Library location: `dsig-pdf-service/dsig_pdf/quotes.py`.

### 2.10 Delivery — staged rollout

**Phase 1 (ships with item 1):** Admin Send creates invoice + PDF, then shows a modal with public URL (copy button) + pre-formatted SMS/email text snippets. Admin routes manually via chat/SMS/email client of choice. `sent_via_channel='manual'`.

**Phase 2a (SMS test mode):** Twilio SMS wiring with `SMS_TEST_MODE` + `SMS_TEST_ALLOWLIST` guards. Works only for Hunter's verified cell until A2P Transactional approved.

**Phase 2b (SMS production):** After A2P Transactional campaign approved, flip config flag, patch consent copy, drop allowlist. SMS invoice delivery live from DSIG 866#.

**Phase 3 (Email production):** After Gmail SMTP password wired, email with PDF attachment + BCC to DemandSignals@gmail.com.

**Phase 4 (auto-route):** Main Send auto-dispatches to `prospects.delivery_preference` (`email_only` / `sms_only` / `both`). Manual copy-paste remains as fallback.

Each phase can ship independently and non-blocking.

### 2.11 A2P 10DLC status (2026-04-18)

- Customer Profile: **Approved** ✓
- Standard Brand: **Registered** ✓
- Campaign: **Failed** ❌ — needs resubmission

Campaign resubmission is a separate focused task. Item 1 does not block on it. When Hunter is ready to retry, a dedicated session will produce the complete submission kit (use-case description, sample messages, opt-in evidence screenshots, STOP/HELP handler proof, privacy URL references). Deliverable file when that happens: `docs/runbooks/a2p-10dlc-campaign-spec.md`.

---

## 3. Data model

All migrations additive-only. File-per-concern per durable lesson (avoid Supabase SQL Editor multi-statement parse failures).

### 3.1 Catalog update (no SQL migration needed)

Catalog is TypeScript-only, defined as `const CATALOG` in `src/lib/quote-pricing.ts` (not a Postgres table, not a JSON file). Update is a code change, not a migration:

1. Add `displayPriceCents: number` field to the `PricingItem` type
2. Populate values for the 4 free-research items (these are the "perceived value" numbers shown on the $0 Restaurant Rule invoice):
   - `market-research` → `displayPriceCents: 50000` ($500)
   - `competitor-analysis` → `displayPriceCents: 50000` ($500)
   - `site-audit` → `displayPriceCents: 40000` ($400)
   - `social-audit` → `displayPriceCents: 35000` ($350)
3. All other catalog items: `displayPriceCents` = mid-range of their existing price estimate (computed or hand-set per item at implementation)
4. Update `validateCatalog()` if it enforces schema, to require the new field
5. Bump `CATALOG_VERSION` from `2026.04.16-1` to `2026.04.18-1`
6. Update any snapshots/fixtures that reference catalog items

### 3.2 Migration `011a_invoices_versioning.sql`

```sql
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS public_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS supersedes_invoice_id uuid REFERENCES invoices(id),
  ADD COLUMN IF NOT EXISTS superseded_by_invoice_id uuid REFERENCES invoices(id),
  ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS void_reason text;
```

### 3.3 Migration `011b_invoices_automation.sql`

```sql
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_trigger text,
  ADD COLUMN IF NOT EXISTS auto_sent boolean NOT NULL DEFAULT false;
```

### 3.4 Migration `011c_invoices_pdf_storage.sql`

```sql
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS pdf_storage_path text,
  ADD COLUMN IF NOT EXISTS pdf_rendered_at timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_version integer NOT NULL DEFAULT 1;
```

### 3.5 Migration `011d_invoices_payment_and_category.sql`

```sql
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS paid_method text,        -- 'zero_balance', 'check', 'wire', 'stripe', 'other'
  ADD COLUMN IF NOT EXISTS paid_note text,
  ADD COLUMN IF NOT EXISTS category_hint text,      -- 'service_revenue', 'marketing_expense', 'research_credit', 'other'
  ADD COLUMN IF NOT EXISTS sent_via_channel text,   -- 'manual', 'email', 'sms', 'both'
  ADD COLUMN IF NOT EXISTS sent_via_email_to text,
  ADD COLUMN IF NOT EXISTS public_viewed_count integer NOT NULL DEFAULT 0;
```

### 3.6 Migration `011e_invoices_indexes.sql`

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_public_uuid ON invoices (public_uuid);
CREATE INDEX IF NOT EXISTS idx_invoices_supersedes ON invoices (supersedes_invoice_id) WHERE supersedes_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_auto_trigger ON invoices (auto_trigger) WHERE auto_trigger IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_auto_draft_queue ON invoices (created_at DESC)
  WHERE auto_generated = true AND status = 'draft';
CREATE INDEX IF NOT EXISTS idx_invoices_category_hint ON invoices (category_hint) WHERE category_hint IS NOT NULL;
```

### 3.7 Migration `011f_invoice_delivery_log.sql`

```sql
CREATE TABLE IF NOT EXISTS invoice_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','sms','manual')),
  recipient text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL,
  provider_message_id text,
  error_message text
);

CREATE INDEX idx_invoice_delivery_log_invoice ON invoice_delivery_log (invoice_id, sent_at DESC);

ALTER TABLE invoice_delivery_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read invoice_delivery_log" ON invoice_delivery_log FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert invoice_delivery_log" ON invoice_delivery_log FOR INSERT WITH CHECK (is_admin());

REVOKE ALL ON invoice_delivery_log FROM anon;
```

### 3.8 Migration `011g_invoice_email_log.sql`

```sql
CREATE TABLE IF NOT EXISTS invoice_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sent_to text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  smtp_message_id text,
  success boolean NOT NULL,
  error_message text
);

CREATE INDEX idx_invoice_email_log_invoice ON invoice_email_log (invoice_id, sent_at DESC);

ALTER TABLE invoice_email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read invoice_email_log" ON invoice_email_log FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert invoice_email_log" ON invoice_email_log FOR INSERT WITH CHECK (is_admin());

REVOKE ALL ON invoice_email_log FROM anon;
```

### 3.9 Migration `012a_automated_invoicing_config.sql`

```sql
INSERT INTO quote_config (key, value) VALUES
  ('automated_invoicing_enabled', 'true'),
  ('a2p_transactional_enabled', 'false'),
  ('email_delivery_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
```

### 3.10 Migration `013a_prospects_delivery_preference.sql`

```sql
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS delivery_preference text NOT NULL DEFAULT 'both'
    CHECK (delivery_preference IN ('email_only','sms_only','both'));
```

### 3.11 Status transitions

```
Status lifecycle:
  draft       → sent        (on send)
  draft       → [deleted]   (pre-send cancel; DELETE row)
  sent        → viewed      (first public URL load)
  sent        → paid        (admin Mark Paid; auto if total=0)
  viewed      → paid        (ditto)
  sent        → void        (Void or Void & Re-issue)
  viewed      → void        (ditto)
  paid        → void        (refund correction)
  void        → [terminal]  (never reversible)
```

Void & Re-issue behavior (transactional):
1. `generate_invoice_number()` for new invoice
2. INSERT new row: `supersedes_invoice_id=old.id`, `status='draft'`, line items copied
3. UPDATE old row: `status='void'`, `voided_at=now()`, `voided_by=<user>`, `superseded_by_invoice_id=new.id`
4. Both statements in a single transaction

---

## 4. API surface

### 4.1 Admin routes (gated by `requireAdmin`)

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/invoices` | List. Query: `status`, `prospect_id`, `auto_generated`, `search`, `limit`, `offset`. Returns summary shape. |
| `POST` | `/api/admin/invoices` | Create draft. Body: `{ quote_session_id?, prospect_id?, line_items[], notes?, due_date?, category_hint? }`. |
| `GET` | `/api/admin/invoices/[id]` | Detail + line items + linked prospect/session + version chain. |
| `PATCH` | `/api/admin/invoices/[id]` | Update draft only. 400 if not `status='draft'`. |
| `DELETE` | `/api/admin/invoices/[id]` | Delete draft only (pre-send cancel). 400 if not draft. |
| `POST` | `/api/admin/invoices/[id]/send` | Draft → sent. Renders PDF via `dsig-pdf-service`, uploads to R2, stamps timestamps. Auto-paid if total=0. Returns public URL + signed PDF URL for copy-paste modal. |
| `POST` | `/api/admin/invoices/[id]/mark-paid` | Stamp `paid_at`, status → `paid`, sets `paid_method` + `paid_note`. |
| `POST` | `/api/admin/invoices/[id]/void` | Pure void without re-issue. Requires `void_reason`. |
| `POST` | `/api/admin/invoices/[id]/void-and-reissue` | Atomic void+re-issue. Returns new draft invoice id. |
| `GET` | `/api/admin/invoices/[id]/pdf` | 302 redirect to R2 signed URL for admin preview. Works on any status. |
| `POST` | `/api/admin/invoices/restaurant-rule-draft` | Internal automation endpoint. Body: `{ quote_session_id }`. Respects `automated_invoicing_enabled`. Creates Tier 2 draft, fires admin email alert. |
| `GET` | `/api/admin/invoices/[id]/delivery-log` | Returns `invoice_delivery_log` + `invoice_email_log` entries for this invoice. |

### 4.2 Public routes (uuid-gated)

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/invoices/public/[number]` | Query `?key=<uuid>`. Returns invoice + line items if `status IN ('sent','viewed','paid','void')` AND uuid matches. Increments view counter + transitions `sent→viewed` on first load. 404 otherwise. |
| `GET` | `/api/invoices/public/[number]/pdf` | Same uuid gate. 302 to R2 signed URL. Forced download filename: `Invoice-DSIG-2026-XXXX.pdf`. |

### 4.3 Rate limiting

- Admin routes: authenticated, no rate limit
- Public routes: 30 req/min per IP per invoice (uses existing `src/lib/api-security.ts` helper)

### 4.4 Error shapes

Standard JSON: `{ error: string, code?: string, details?: unknown }`. Normal HTTP status codes.

### 4.5 Restaurant Rule trigger wiring

Prospect-facing `/quote` flow does not get a new button in item 1. Instead, a new AI conversation tool (or extension of `trigger_handoff`) calls `POST /api/admin/invoices/restaurant-rule-draft` when the state is: phone verified + email captured + business identified + prospect accepts an offer like "send me the research plan." Exact CTA wording is a v1.14 prompt-tuning pass that ships alongside or after item 1 code.

---

## 5. UI

### 5.1 Admin sidebar

New nav group: **Finance**
- Invoices (`/admin/invoices`)
- (future: Payments, Subscriptions, Chart of Accounts)

### 5.2 `/admin/invoices` — list page

- Top strip: 4 stat cards (Total Invoices, Outstanding AR, Paid This Month, Needs Review)
- Filter bar: status, prospect search, auto-generated toggle, date range
- Action button: `+ New Invoice` → `/admin/invoices/new`
- Conditional amber banner: "🍽️ N Restaurant Rule drafts ready for review"
- Table: Invoice # · Client · Total · Status pill · Created · Sent · Actions
- Status pills: draft=slate, sent=blue, viewed=amber, paid=emerald, void=muted-red
- Row hover: quick-view eye → drawer with PDF iframe preview
- Row click: navigates to `/admin/invoices/[id]`

### 5.3 `/admin/invoices/new` — create invoice

- **Client section:** prospect dropdown (searchable) + "Create new prospect" inline form
- **Line items section:** table editor
  - Per row: description (autocomplete from catalog) · qty · unit price · discount % · discount label · line total
  - Catalog-backed lines fill description + unit price (toggle `display_price_cents` vs `price_cents`)
  - Custom lines: free text + manual amount
  - Drag-to-reorder
  - `+ Add line` button
  - `+ Add 100% discount line` shortcut (for $0 invoices)
- **Details section:** due date (default +14 days), notes, category hint dropdown
- Actions: Save as draft / Save & Send / Cancel

### 5.4 `/admin/invoices/[id]` — detail page

**Top bar:**
- Back to `/admin/invoices`
- Invoice # + status pill
- Context badges: `🍽️ Auto-generated via Restaurant Rule` / `↓ Replaced by DSIG-2026-XXXX` / `↑ Replaces DSIG-2026-XXXX`
- Action buttons (status-dependent):
  - `draft`: Edit, Delete, Send
  - `sent`/`viewed`: Mark Paid, Void & Re-issue, Void, Download PDF, Resend (Phase 2+)
  - `paid`: Void & Re-issue, Download PDF
  - `void`: Download PDF

**Main layout (2 cols):**
- Left (⅔): PDF preview iframe + expandable line items table
- Right (⅓):
  - Client card (reuses `/admin/quotes/[id]` pattern)
  - Timeline card (status timestamps + `invoice_delivery_log` + `invoice_email_log`)
  - Version chain card (supersession graph)

**Void & Re-issue modal:**
- Title: "This will void [number] and create a new draft you can edit."
- Required field: `Void reason` (≥5 chars)
- Confirm → transaction fires → redirect to new draft

**Send modal (Phase 1):**
- Copy URL button (pre-selected): `https://demandsignals.co/invoice/[number]/[uuid]`
- PDF download link for admin convenience
- Three pre-formatted text options to copy:
  1. Casual SMS template
  2. Formal email template (with subject + body)
  3. Bare URL
- Instructions: "Paste into your preferred channel. This invoice is now sent — any future changes require Void & Re-issue."

### 5.5 `/invoice/[number]/[uuid]` — public viewer

Zero site chrome. Pure invoice. Looks like a QuickBooks/Stripe invoice.

- DSIG logo top-left
- Invoice # + status badge right-aligned
- Client details + invoice meta
- Line items table
- Subtotal / Discount / Total
- Notes
- `[Download PDF]` button top-right
- Footer: DSIG contact (from `lib/constants.ts`)

**Status-specific treatments:**
- `paid`: large teal PAID badge top-right
- `void`: muted red VOIDED banner + link to superseding invoice + body dimmed 60%
- `viewed`/`sent`: standard view

Mobile responsive, single column, download button stays prominent.

### 5.6 `/admin/quotes/[id]` — new action buttons

In the existing top-right action bar:
- `Create Invoice` → pre-filled new-invoice form (scope from quote session)
- `Send Restaurant Rule 🍽️` — only visible when: email captured + phone verified + no existing Restaurant Rule invoice for this session → calls `/api/admin/invoices/restaurant-rule-draft` → redirects to new draft with prominent Send button

### 5.7 `/admin/prospects/[id]` — Documents section

New section below existing cards:
- Lists all invoices for this prospect, sorted date desc
- Per row: invoice # · total · status · date sent · quick PDF preview · detail link
- Void chains collapsed by default ("Show 2 voided")
- Pattern extends to future SOW docs, contracts

### 5.8 UI tech

- Tailwind v4 + CSS vars (existing)
- Lucide icons (existing)
- shadcn components where applicable (existing)
- No new UI libraries

---

## 6. PDF service architecture

### 6.1 Repository: `demand-signals/dsig-pdf-service`

Separate GitHub repo + Vercel project. Custom domain `pdf.demandsignals.co`. Single endpoint, internal auth via shared secret.

### 6.2 Structure

```
dsig-pdf-service/
├── api/
│   └── render.py                    POST /api/render
├── dsig_pdf/
│   ├── __init__.py
│   ├── standards.py                 Colors, fonts, sizes (from DSIG_PDF_STANDARDS_v2)
│   ├── covers.py                    FrontCover, BackCover
│   ├── quotes.py                    Famous quote library + picker
│   ├── components.py                ODiv, StatRow, AlertBox, Callout, Timeline, ScoreGauge,
│   │                                ArchDiagram, CostCompare, PaidStamp, VoidStamp,
│   │                                GradientBar, SectionHeader, SectionFooter
│   ├── tables.py                    MT() helper, bts() style function
│   ├── typography.py                ParagraphStyle definitions
│   ├── layout.py                    Legal page setup, margins, frames
│   └── docs/
│       ├── __init__.py
│       └── invoice.py               ← ships in item 1
├── tests/
│   ├── test_standards.py
│   ├── test_covers.py
│   ├── test_components.py
│   ├── test_invoice_render.py
│   └── fixtures/
│       └── sample_invoice.json
├── requirements.txt
├── vercel.json
├── README.md
└── .github/workflows/ci.yml
```

### 6.3 API contract

```http
POST https://pdf.demandsignals.co/api/render
Authorization: Bearer <PDF_SERVICE_SECRET>
Content-Type: application/json

{
  "doc_type": "invoice",
  "version": 1,
  "data": {
    "invoice_number": "DSIG-2026-0007",
    "issue_date": "2026-04-18",
    "due_date": "2026-05-02",
    "status": "paid",
    "bill_to": { "business_name": "...", "contact_name": "...", "email": "..." },
    "line_items": [
      { "description": "Market Research", "quantity": 1, "unit_price_cents": 50000, "line_total_cents": 50000 },
      { "description": "Introductory Research Credit (100% off)", "quantity": 1, "unit_price_cents": -175000, "line_total_cents": -175000 }
    ],
    "subtotal_cents": 175000,
    "discount_cents": 175000,
    "total_due_cents": 0,
    "notes": "This research is complimentary. Your investment comes later...",
    "is_paid": true,
    "is_void": false,
    "supersedes_number": null,
    "superseded_by_number": null
  }
}

→ 200 OK
→ Content-Type: application/pdf
→ <PDF bytes>
```

### 6.4 Doc type: invoice

**Page 1 (Front Cover):**
- Full-bleed slate (#3D4566) + decorative circles (35% opacity)
- Logo top-left 36pt
- Eyebrow: `I N V O I C E` (8pt, #888888, spaced caps) ~56% down
- Title block (44-52pt bold): line 1 white `INVOICE`, line 2 teal `DSIG-2026-0007`
- Orange divider (2pt × 60pt, #F26419)
- Tagline (11pt, #CCCCCC)
- Meta fields, 3 columns: `PREPARED FOR` / `ISSUE DATE` / `INVOICE NUMBER`
- Second meta row: `DUE DATE` / `TOTAL DUE`
- Footer: contact info left, status pill right (PAID / DUE / VOID)

**Page 2 (Interior — Line Items):**
- Gradient bar (orange → teal, 80-step) at top
- Logo left, section label right: `01 — INVOICE DETAIL`
- Separator rule
- Eyebrow: `L I N E   I T E M S` (teal 9pt spaced caps)
- H1: `Invoice Detail` (22pt bold slate)
- Orange divider
- Line items table (Paragraph-wrapped cells, alternating rows, slate header)
- Totals block (right-aligned): SUBTOTAL / DISCOUNT / TOTAL DUE
- Notes callout (teal variant) if notes present
- PAID ✓ / VOID stamp overlay on totals (diagonal, 30% opacity, rotated -15°)

**Page 3 (Back Cover):**
- Full-bleed slate + decorative circles
- Logo centered, 40pt, ~60% down
- Famous quote, italicized, 14pt teal, centered (picked via `quotes.pick_quote("invoice", seed=invoice_number)`)
- Attribution below quote (8pt, #888888)
- Headline (28-32pt bold): thank-you message
- Orange pill CTA button
- Contact grid (3 columns)
- Attribution + copyright

### 6.5 Famous quote system

`dsig_pdf/quotes.py`:

```python
QUOTES = [
  {"text": "...", "author": "...", "tags": [...], "fit": ["invoice", "proposal", ...]},
  ...
]

def pick_quote(doc_type: str, seed: str = None) -> dict:
    """Deterministic per-seed quote selection from doc_type-eligible quotes."""
```

Seed = invoice number (or SOW id, etc.). Same doc → same quote on re-render. Quote bank grows over time as good ones are added.

### 6.6 PAID / VOID stamp implementation

Custom reportlab Flowable:
- Rotated -15° via `canvas.rotate(-15)`
- 4pt rect border + 8pt corner radius
- 48pt bold text, 30% alpha via `canvas.setFillAlpha(0.3)` / `canvas.setStrokeAlpha(0.3)`
- PaidStamp: emerald (#10B981), text "PAID ✓" + smaller "COMPLIMENTARY" or "[date]"
- VoidStamp: muted red (#DC2626), text "VOID" + smaller "Superseded by DSIG-2026-XXXX"
- VoidStamp additionally renders a 60% alpha white overlay rect across invoice body

### 6.7 Integration from main repo

```ts
// src/lib/invoice-pdf/render.ts
export async function renderInvoicePdf(invoice: InvoiceWithLineItems): Promise<Buffer> {
  const res = await fetch(`${process.env.PDF_SERVICE_URL}/api/render`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PDF_SERVICE_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      doc_type: 'invoice',
      version: 1,
      data: invoiceToRenderPayload(invoice),
    }),
  })
  if (!res.ok) throw new Error(`PDF service error: ${res.status} ${await res.text()}`)
  return Buffer.from(await res.arrayBuffer())
}
```

Called only by `/send` and `/void-and-reissue`. Never on draft edits (cost + storage waste). R2 upload + DB update follows the compensating-rollback pattern from CLAUDE.md §19.

---

## 7. Delivery — Phase 1 implementation

### 7.1 Send flow (code)

```ts
// /api/admin/invoices/[id]/send/route.ts (abridged)
export async function POST(req, { params }) {
  await requireAdmin(req)
  const { id } = await params

  // 1. Fetch invoice + line items
  const invoice = await fetchInvoiceWithLineItems(id)
  if (invoice.status !== 'draft') return Response.json({ error: 'Not draft' }, { status: 409 })

  // 2. Render PDF
  const pdfBuffer = await renderInvoicePdf(invoice)

  // 3. Upload to R2
  const pdfKey = `invoices/${invoice.invoice_number}_v${invoice.pdf_version}.pdf`
  await r2.uploadPrivate(pdfKey, pdfBuffer, 'application/pdf')

  // 4. Update invoice row
  const isZero = invoice.total_due_cents === 0
  const now = new Date().toISOString()
  const { error } = await supabaseServiceRole
    .from('invoices')
    .update({
      status: isZero ? 'paid' : 'sent',
      sent_at: now,
      sent_via_channel: 'manual',
      pdf_storage_path: pdfKey,
      pdf_rendered_at: now,
      ...(isZero ? {
        paid_at: now,
        paid_method: 'zero_balance',
        paid_note: 'Complimentary — no payment required'
      } : {}),
    })
    .eq('id', id)

  if (error) {
    await r2.deletePrivate(pdfKey)  // compensating rollback
    throw error
  }

  // 5. Log delivery intent (Phase 1: 'manual')
  await supabaseServiceRole.from('invoice_delivery_log').insert({
    invoice_id: id,
    channel: 'manual',
    recipient: invoice.bill_to_email ?? invoice.bill_to_phone ?? '',
    success: true,
  })

  // 6. Return URLs for admin modal
  return Response.json({
    public_url: `https://demandsignals.co/invoice/${invoice.invoice_number}/${invoice.public_uuid}`,
    pdf_admin_url: `/api/admin/invoices/${id}/pdf`,
    status: isZero ? 'paid' : 'sent',
  })
}
```

### 7.2 Phase 1 admin modal UI

Post-send modal contains:
- Copy-URL button
- Three pre-formatted text snippets (SMS/Email/bare URL)
- Instructions
- Dismiss

Admin pastes into their preferred channel. Tracking of actual delivery happens when admin manually confirms via a "Mark as delivered" action (optional, low-friction).

### 7.3 Phase 2a — SMS test mode

- New env vars: `SMS_TEST_MODE=true` and `SMS_TEST_ALLOWLIST=<E.164 cell>`
- New button on invoice detail: `Send Test SMS` (only visible when `SMS_TEST_MODE=true`)
- Twilio SDK wired in `/api/admin/invoices/[id]/send-sms/route.ts`
- Endpoint checks: allowlist match → send via Twilio trial/verified number → log to `invoice_delivery_log`
- Logs all sends regardless of success
- STOP/HELP keyword handlers pre-wired in `/api/sms/webhook/route.ts` (prep for Phase 2b)

### 7.4 Phase 2b — SMS production

- A2P Transactional campaign approved
- Flip `quote_config.a2p_transactional_enabled=true`
- Patch `/quote` consent copy (tighter language covering invoices + service notifications — see §2.11)
- Remove `SMS_TEST_MODE` guard in send-sms endpoint
- Production SMS delivery unlocks

### 7.5 Phase 3 — Email production

- Gmail SMTP password added to Vercel env `SMTP_PASS`
- Flip `quote_config.email_delivery_enabled=true`
- Email template in `src/lib/invoice-email.ts` builds HTML + text + PDF attachment
- BCC: `DemandSignals@gmail.com`
- New button on invoice detail: `Send via Email`
- Logs to `invoice_email_log`

### 7.6 Phase 4 — Auto-route

- Main Send button auto-dispatches to `prospects.delivery_preference` channels
- If `both` → sends SMS + Email simultaneously
- If `email_only` or `sms_only` → sends only that channel
- Copy-paste modal remains as "Other options" fallback

---

## 8. Testing

### 8.1 Unit tests (Node, `scripts/test-invoice-*.mjs`)

| Test | Verifies |
|---|---|
| `test-invoice-rls.mjs` | Anon blocked on all new tables; service role succeeds |
| `test-invoice-number-generation.mjs` | Unique DSIG-YYYY-NNNN, increments correctly |
| `test-invoice-totals.mjs` | Math correct across positive/discount/mixed line combos |
| `test-invoice-void-reissue.mjs` | Transactional atomicity + both-row updates |
| `test-invoice-public-view.mjs` | uuid gating, status filtering, view counter |
| `test-invoice-automation-config.mjs` | Kill switch honored |

### 8.2 Integration test

`scripts/test-invoice-e2e.mjs` — creates full lifecycle: prospect → quote session → invoice draft → send → R2 verify → public view → void & re-issue → teardown.

### 8.3 PDF service tests (Python, `dsig-pdf-service/tests/`)

| Test | Verifies |
|---|---|
| `test_invoice_render.py` | Renders valid 3-page PDF, pypdf opens successfully |
| `test_paid_stamp.py` | $0 invoice → PAID ✓ COMPLIMENTARY stamp present |
| `test_void_stamp.py` | Void → VOID + Superseded by text |
| `test_long_line_items.py` | 30-item invoice wraps without overlap |
| `test_currency_formatting.py` | $0 / $X,XXX.XX / -$500 / $1M all format correctly |
| `test_quote_determinism.py` | Same seed → same quote across re-renders |

### 8.4 Manual QA checklist

File: `docs/runbooks/stage-c-invoicing-qa.md` (created during implementation). Covers:
- [ ] Create draft from `/admin/quotes/[id]` with catalog items
- [ ] Edit draft → totals update live
- [ ] Send → PDF matches DSIG_PDF_STANDARDS_v2 visually
- [ ] Public URL in incognito → no admin chrome
- [ ] Download PDF → correct filename
- [ ] Void & Re-issue → chain visible, both invoices present
- [ ] Restaurant Rule → draft in queue, Send → PAID stamp present
- [ ] Prospect page Documents section populated
- [ ] R2 direct anonymous GET → 403 (security)
- [ ] `automated_invoicing_enabled=false` → Restaurant Rule returns graceful error

### 8.5 Regression gates

Before declaring item 1 complete:
- `node scripts/test-quote-rls.mjs` → still 25/25 passing
- `npx tsx tests/quote-ai-evals.mjs` → still 38/38 passing
- `npx tsc --noEmit` → clean
- New invoice RLS tests passing

---

## 9. Deployment plan

### 9.1 Prerequisites (Hunter does before implementation starts)

1. **Cloudflare R2:**
   - Create R2 account + buckets `dsig-assets-public` and `dsig-docs-private`
   - Configure custom domain on `dsig-assets-public` → `assets.demandsignals.co`
   - Generate API token, capture credentials

2. **dsig-pdf-service repo:**
   - Create GitHub repo `demand-signals/dsig-pdf-service` (empty)
   - Import to Vercel as new project, Python preset
   - Add custom domain `pdf.demandsignals.co`

3. **Vercel env vars** (add to `demandsignals-next`):
   ```
   R2_ACCOUNT_ID=<...>
   R2_ACCESS_KEY_ID=<...>
   R2_SECRET_ACCESS_KEY=<...>
   R2_PUBLIC_BUCKET=dsig-assets-public
   R2_PUBLIC_URL=https://assets.demandsignals.co
   R2_PRIVATE_BUCKET=dsig-docs-private
   R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   PDF_SERVICE_URL=https://pdf.demandsignals.co
   PDF_SERVICE_SECRET=<generate 64-char random hex>
   SMS_TEST_MODE=true
   SMS_TEST_ALLOWLIST=<hunter cell E.164>
   ```

4. **Vercel env vars** (add to `dsig-pdf-service`):
   ```
   PDF_SERVICE_SECRET=<same value as above>
   ```

### 9.2 Implementation order

1. Update catalog in `src/lib/quote-pricing.ts` (add `displayPriceCents` field + bump version) per §3.1
2. Apply migrations 011-013 (Supabase SQL Editor, one file at a time, one statement-type per file per durable lesson)
3. Build `src/lib/r2-storage.ts` + unit tests
4. Scaffold `dsig-pdf-service` — standards/covers/components/typography/layout/quotes/invoice
5. Deploy `dsig-pdf-service` to Vercel, verify `/api/render` returns valid PDF
6. Build invoice API routes in main repo
7. Build admin UI: `/admin/invoices`, `/admin/invoices/new`, `/admin/invoices/[id]`
8. Build `/admin/quotes/[id]` action buttons (Create Invoice + Restaurant Rule)
9. Build `/admin/prospects/[id]` Documents section
10. Build public `/invoice/[number]/[uuid]` page
11. Wire Restaurant Rule trigger from AI conversation (minimal, v1.14 prompt update)
12. Run tests + manual QA checklist
13. Deploy to production, first real invoice test

### 9.3 Rollback plan

- **Kill switch:** `quote_config.automated_invoicing_enabled=false` disables Restaurant Rule auto-draft instantly
- **Code rollback:** `git revert` + push (Vercel auto-deploys prior version)
- **Data integrity:** migrations additive-only, rollback leaves extra columns but nothing breaks
- **Orphan PDF cleanup:** if rollback orphans R2 objects, `scripts/cleanup-orphan-invoice-pdfs.mjs` (ships with item 1) reconciles

### 9.4 Success criteria

- [ ] All migrations applied to production Supabase
- [ ] All unit + integration tests passing
- [ ] `dsig-pdf-service` responding with valid PDFs at `pdf.demandsignals.co/api/render`
- [ ] Hunter has created + sent 2 real invoices (1 standard + 1 Restaurant Rule $0)
- [ ] Public URL works end-to-end when Hunter shares via manual channel
- [ ] PDF matches DSIG_PDF_STANDARDS_v2 reference
- [ ] R2 cost tracked at <$0.10/month
- [ ] TypeScript clean
- [ ] 25/25 + new RLS tests pass
- [ ] 38/38 AI evals pass (regression check)
- [ ] Runbook updated (`docs/runbooks/quote-estimator.md` appended with Invoicing section)
- [ ] `MEMORY.md` + `CLAUDE.md` §10 updated

---

## 10. Future evolutions (recorded, not in scope for item 1)

- **Proposal doc_type** in `dsig-pdf-service` — ships with Stage C item 2 or parallel
- **SOW doc_type** — Stage C item 4
- **Estimate / budgetary estimate doc_type** — when admin estimate builder lands
- **SEO audit / project plan / master plan doc_types** — ports from Southside MMA project references
- **Report doc_type** — generic branded report container
- **E-signature flow** — `/sign/[doc_number]/[uuid]` signature pad page, signed PDF stored in R2 with signature metadata + IP + timestamp audit log
- **Payment links in SMS/email** — Stripe Payment Link pre-generated at send time, shortened, click-tracked (Stage D)
- **Payment reminder automations** — cron-driven cadence (Day 7, 14, 30), templated, per-invoice opt-out
- **QuickBooks / Xero export** — CSV or API sync of paid invoices
- **Chart of accounts / GL mapping** — promotes `category_hint` to authoritative categorization, adds proper double-entry ledger (Stage D+)
- **Recurring billing engine** — Tier 3 automation fully utilized, subscription invoices auto-generated + auto-sent
- **Multi-currency** — currently USD-only via `currency='USD'` column; schema supports expansion
- **Tax calculation** — deferred to when DSIG hits nexus thresholds
- **A2P 10DLC campaign resubmission** — separate focused session using `docs/runbooks/a2p-10dlc-campaign-spec.md` (to be created)

---

## 11. Files that will be created or modified

### New files (main repo)

```
supabase/migrations/011a_invoices_versioning.sql
supabase/migrations/011b_invoices_automation.sql
supabase/migrations/011c_invoices_pdf_storage.sql
supabase/migrations/011d_invoices_payment_and_category.sql
supabase/migrations/011e_invoices_indexes.sql
supabase/migrations/011f_invoice_delivery_log.sql
supabase/migrations/011g_invoice_email_log.sql
supabase/migrations/012a_automated_invoicing_config.sql
supabase/migrations/013a_prospects_delivery_preference.sql

src/lib/r2-storage.ts
src/lib/invoice-pdf/render.ts
src/lib/invoice-email.ts                       (stub in Phase 1, wired Phase 3)

src/app/api/admin/invoices/route.ts
src/app/api/admin/invoices/[id]/route.ts
src/app/api/admin/invoices/[id]/send/route.ts
src/app/api/admin/invoices/[id]/mark-paid/route.ts
src/app/api/admin/invoices/[id]/void/route.ts
src/app/api/admin/invoices/[id]/void-and-reissue/route.ts
src/app/api/admin/invoices/[id]/pdf/route.ts
src/app/api/admin/invoices/[id]/delivery-log/route.ts
src/app/api/admin/invoices/restaurant-rule-draft/route.ts
src/app/api/invoices/public/[number]/route.ts
src/app/api/invoices/public/[number]/pdf/route.ts

src/app/admin/invoices/page.tsx
src/app/admin/invoices/new/page.tsx
src/app/admin/invoices/[id]/page.tsx
src/app/invoice/[number]/[uuid]/page.tsx

scripts/test-invoice-rls.mjs
scripts/test-invoice-number-generation.mjs
scripts/test-invoice-totals.mjs
scripts/test-invoice-void-reissue.mjs
scripts/test-invoice-public-view.mjs
scripts/test-invoice-automation-config.mjs
scripts/test-invoice-e2e.mjs
scripts/cleanup-orphan-invoice-pdfs.mjs

docs/runbooks/stage-c-invoicing-qa.md
```

### Modified files (main repo)

```
src/lib/quote-pricing.ts                       (add displayPriceCents field to PricingItem type + populate values + bump CATALOG_VERSION)
src/app/admin/quotes/[id]/page.tsx             (add Create Invoice + Restaurant Rule buttons)
src/app/admin/prospects/[id]/page.tsx          (add Documents section)
src/components/admin/admin-sidebar.tsx         (add Finance nav group)
src/app/quote/QuotePageClient.tsx              (Phase 2b: patch consent copy; not in item 1)
docs/runbooks/quote-estimator.md               (append Invoicing operations section)
docs/runbooks/stage-c-plan.md                  (mark item 1 complete)
CLAUDE.md                                       (update §10 What Is Complete)
MEMORY.md                                       (append task completion entry)
package.json                                    (add @aws-sdk/client-s3)
```

### New repo: `dsig-pdf-service`

```
api/render.py
dsig_pdf/__init__.py
dsig_pdf/standards.py
dsig_pdf/covers.py
dsig_pdf/quotes.py
dsig_pdf/components.py
dsig_pdf/tables.py
dsig_pdf/typography.py
dsig_pdf/layout.py
dsig_pdf/docs/__init__.py
dsig_pdf/docs/invoice.py
tests/test_standards.py
tests/test_covers.py
tests/test_components.py
tests/test_invoice_render.py
tests/fixtures/sample_invoice.json
requirements.txt
vercel.json
README.md
.github/workflows/ci.yml
```

---

## 12. References

- `CLAUDE.md` §18 — Domain architecture
- `CLAUDE.md` §19 — File storage architecture
- `MEMORY.md` — current state, recent decisions
- `docs/runbooks/stage-c-plan.md` — parent plan, item 1 section
- `docs/runbooks/quote-estimator.md` — operational playbook
- `D:\CLAUDE\DSIG\DSIG_PDF_STANDARDS_v2.md` — PDF visual standards (authoritative reference for `dsig-pdf-service`)
- `docs/superpowers/specs/2026-04-15-quote-estimator-design.md` — original Stage A/B spec (parent design)

---

*End of Stage C Item 1 — Invoicing System Design.*
