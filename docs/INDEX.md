# DSIG Documentation Index

**Last updated: 2026-04-29**

Start here to find every artifact in the DSIG Next.js project.

## Reading order for new sessions

1. `CLAUDE.md` — project conventions + current state
2. `MEMORY.md` — recent shipping log + locked architectural decisions
3. This file (`docs/INDEX.md`) — everything else
4. `docs/runbooks/when-something-breaks.md` if something's on fire

---

## Specs — design decisions with rationale

| File | Date | Status | Summary |
|---|---|---|---|
| [`docs/superpowers/specs/2026-04-06-section-theater-rollout-design.md`](superpowers/specs/2026-04-06-section-theater-rollout-design.md) | 2026-04-06 | SHIPPED | Section-theater motion system pilot + rollout plan |
| [`docs/superpowers/specs/2026-04-06-url-restructure-design.md`](superpowers/specs/2026-04-06-url-restructure-design.md) | 2026-04-06 | SHIPPED | 5-category URL structure |
| [`docs/superpowers/specs/2026-04-15-quote-estimator-design.md`](superpowers/specs/2026-04-15-quote-estimator-design.md) | 2026-04-15 | SUPERSEDED | v1 of quote estimator — replaced by v2 below |
| [`docs/superpowers/specs/2026-04-15-quote-estimator-design-v2.md`](superpowers/specs/2026-04-15-quote-estimator-design-v2.md) | 2026-04-15 | SHIPPED | Canonical /quote AI estimator design |
| [`docs/superpowers/specs/2026-04-18-invoicing-design.md`](superpowers/specs/2026-04-18-invoicing-design.md) | 2026-04-18 | SHIPPED | Invoicing v2 + SOW flow design |
| [`docs/superpowers/specs/2026-04-21-retainer-bundling-design.md`](superpowers/specs/2026-04-21-retainer-bundling-design.md) | 2026-04-21 | SHIPPED | /quote retainer bundling design |
| [`docs/superpowers/specs/2026-04-24-document-numbering.md`](superpowers/specs/2026-04-24-document-numbering.md) | 2026-04-24 | SHIPPED | TYPE-CLIENT-MMDDYY{A} numbering convention (retrospective) |
| [`docs/superpowers/specs/2026-04-24-pdf-pipeline.md`](superpowers/specs/2026-04-24-pdf-pipeline.md) | 2026-04-24 | SHIPPED | In-repo Chromium HTML→PDF pipeline (retrospective) |
| [`docs/superpowers/specs/2026-04-24-client-lifecycle.md`](superpowers/specs/2026-04-24-client-lifecycle.md) | 2026-04-24 | SHIPPED | Prospect → client transition + project auto-creation (retrospective) |
| [`docs/superpowers/specs/2026-04-24-tik-accounting.md`](superpowers/specs/2026-04-24-tik-accounting.md) | 2026-04-24 | SHIPPED | Trade-in-Kind credit on SOWs (retrospective) |
| [`docs/superpowers/specs/2026-04-24-channels-ratings.md`](superpowers/specs/2026-04-24-channels-ratings.md) | 2026-04-24 | SHIPPED | Prospect channels + review ratings data model (retrospective) |
| [`docs/superpowers/specs/2026-04-24-stripe-payment-plans-design.md`](superpowers/specs/2026-04-24-stripe-payment-plans-design.md) | 2026-04-24 | SHIPPED | Stripe payment plans + subscriptions design (Plans A/B/C) |
| [`docs/superpowers/specs/2026-04-27-quick-inquiry-form-design.md`](superpowers/specs/2026-04-27-quick-inquiry-form-design.md) | 2026-04-27 | SHIPPED | Quick inquiry form (homepage CTA alt path) |
| [`docs/superpowers/specs/2026-04-27-resend-email-swap-design.md`](superpowers/specs/2026-04-27-resend-email-swap-design.md) | 2026-04-27 | SHIPPED | Resend SDK swap + email/page tracking infrastructure |
| [`docs/superpowers/specs/2026-04-28-portal-messaging-design.md`](superpowers/specs/2026-04-28-portal-messaging-design.md) | 2026-04-28 | DRAFT | Portal-side prospect messaging system |
| [`docs/superpowers/specs/2026-04-28-quote-fix-pass-design.md`](superpowers/specs/2026-04-28-quote-fix-pass-design.md) | 2026-04-28 | SHIPPED | /quote fix pass — intro pre-parser, ranges, anti-fabrication, close-the-loop, kill ongoing-mgmt panel |
| [`docs/superpowers/specs/2026-04-29-client-sms-notifications-design.md`](superpowers/specs/2026-04-29-client-sms-notifications-design.md) | 2026-04-29 | DRAFT | Client-facing SMS notifications |
| [`docs/superpowers/specs/2026-04-29-quote-existing-client-match-design.md`](superpowers/specs/2026-04-29-quote-existing-client-match-design.md) | 2026-04-29 | SHIPPED | Existing-client match during /quote research |
| [`docs/superpowers/specs/2026-04-29-quote-to-booked-meeting-design.md`](superpowers/specs/2026-04-29-quote-to-booked-meeting-design.md) | 2026-04-29 | SHIPPED | /quote → real Google Calendar booking + Meet + SMS reminders |
| [`docs/superpowers/specs/2026-05-04-sow-lockdown-deferred.md`](superpowers/specs/2026-05-04-sow-lockdown-deferred.md) | 2026-05-04 | DEFERRED | Lock down accepted SOWs + hide from default views — premature at 1-operator scale, revisit on team growth |
| [`docs/superpowers/specs/2026-05-04-international-clients-tiers.md`](superpowers/specs/2026-05-04-international-clients-tiers.md) | 2026-05-04 | TIER 1 SHIPPED | International client support — Tier 1 (country column + non-US display) shipped; Tier 2 (locale labels, address_line_2) and Tier 3 (multi-currency, VAT/GST) deferred |

---

## Plans — implementation sequences

| File | Date | Status | Commit range | Summary |
|---|---|---|---|---|
| [`docs/superpowers/plans/2026-04-18-r2-storage.md`](superpowers/plans/2026-04-18-r2-storage.md) | 2026-04-18 | SHIPPED | various | Cloudflare R2 storage library |
| [`docs/superpowers/plans/2026-04-18-dsig-pdf-service.md`](superpowers/plans/2026-04-18-dsig-pdf-service.md) | 2026-04-18 | DEPRECATED | — | Python dsig_pdf service — replaced by Chromium HTML→PDF (2026-04-24) |
| [`docs/superpowers/plans/2026-04-18-invoicing-feature.md`](superpowers/plans/2026-04-18-invoicing-feature.md) | 2026-04-18 | SHIPPED | various | Invoicing v1 |
| [`docs/superpowers/plans/2026-04-18-invoicing-v2-expanded.md`](superpowers/plans/2026-04-18-invoicing-v2-expanded.md) | 2026-04-18 | SHIPPED | various | Invoicing v2 overnight build |
| [`docs/superpowers/plans/2026-04-21-retainer-bundling.md`](superpowers/plans/2026-04-21-retainer-bundling.md) | 2026-04-21 | SHIPPED | various | /quote retainer bundling |
| [`docs/superpowers/plans/2026-04-22-doc-system.md`](superpowers/plans/2026-04-22-doc-system.md) | 2026-04-22 | SHIPPED | various | SOW + Invoice + Receipt doc overhaul |
| [`docs/superpowers/plans/2026-04-24-stripe-plan-A-magic-link-pay.md`](superpowers/plans/2026-04-24-stripe-plan-A-magic-link-pay.md) | 2026-04-24 | SHIPPED | various | Stripe Plan A — magic-link Pay button + activation |
| [`docs/superpowers/plans/2026-04-24-stripe-plan-B-payment-plans.md`](superpowers/plans/2026-04-24-stripe-plan-B-payment-plans.md) | 2026-04-24 | SHIPPED | various | Stripe Plan B — payment plans + SOW conversion |
| [`docs/superpowers/plans/2026-04-24-stripe-plan-C-subscriptions.md`](superpowers/plans/2026-04-24-stripe-plan-C-subscriptions.md) | 2026-04-24 | SHIPPED | various | Stripe Plan C — subscriptions + caps + pause |
| [`docs/superpowers/plans/2026-04-25-READY-TO-APPLY.md`](superpowers/plans/2026-04-25-READY-TO-APPLY.md) | 2026-04-25 | reference | — | Migration apply notes |
| [`docs/superpowers/plans/2026-04-27-quick-inquiry-form-plan.md`](superpowers/plans/2026-04-27-quick-inquiry-form-plan.md) | 2026-04-27 | SHIPPED | various | Quick inquiry form |
| [`docs/superpowers/plans/2026-04-27-resend-email-tracking-plan.md`](superpowers/plans/2026-04-27-resend-email-tracking-plan.md) | 2026-04-27 | SHIPPED | various | Resend email + tracking infrastructure |
| [`docs/superpowers/plans/2026-04-29-quote-existing-client-match-plan.md`](superpowers/plans/2026-04-29-quote-existing-client-match-plan.md) | 2026-04-29 | SHIPPED | various | /quote existing-client match |
| [`docs/superpowers/plans/2026-04-29-quote-to-booked-meeting-plan.md`](superpowers/plans/2026-04-29-quote-to-booked-meeting-plan.md) | 2026-04-29 | SHIPPED | various | /quote → real Calendar booking |

---

## Runbooks — operational procedures

20 runbooks covering every major system. See `docs/runbooks/` for full list.

| File | Purpose |
|---|---|
| [`docs/runbooks/when-something-breaks.md`](runbooks/when-something-breaks.md) | Emergency index — start here in a crisis |
| [`docs/runbooks/supabase-migrations.md`](runbooks/supabase-migrations.md) | How to apply migrations |
| [`docs/runbooks/document-numbering.md`](runbooks/document-numbering.md) | client_code + doc number operations |
| [`docs/runbooks/pdf-pipeline.md`](runbooks/pdf-pipeline.md) | PDF debugging + cold-start behavior |
| [`docs/runbooks/admin-portal.md`](runbooks/admin-portal.md) | Admin CRM operations |
| [`docs/runbooks/channels-and-research.md`](runbooks/channels-and-research.md) | prospects.channels jsonb + research flow |
| [`docs/runbooks/client-lifecycle.md`](runbooks/client-lifecycle.md) | Prospect → client transition + project tracking |
| [`docs/runbooks/environment-and-deploy.md`](runbooks/environment-and-deploy.md) | Vercel env vars + deploy process |
| [`docs/runbooks/invoicing-morning-2026-04-18.md`](runbooks/invoicing-morning-2026-04-18.md) | Invoicing launch day ops |
| [`docs/runbooks/invoicing-phase4-activation.md`](runbooks/invoicing-phase4-activation.md) | Retainer activation after launch |
| [`docs/runbooks/magic-link-public-pages.md`](runbooks/magic-link-public-pages.md) | Public SOW/Invoice page auth |
| [`docs/runbooks/project-management.md`](runbooks/project-management.md) | Project + phase + deliverable operations |
| [`docs/runbooks/quote-estimator-to-sow.md`](runbooks/quote-estimator-to-sow.md) | Quote → SOW conversion flow |
| [`docs/runbooks/quote-estimator.md`](runbooks/quote-estimator.md) | /quote estimator operations |
| [`docs/runbooks/receipts-and-payments.md`](runbooks/receipts-and-payments.md) | RCT allocation + mark-paid flow |
| [`docs/runbooks/retainer-bundling.md`](runbooks/retainer-bundling.md) | Retainer tier selection + activation |
| [`docs/runbooks/security-and-rls.md`](runbooks/security-and-rls.md) | RLS policies + auth hardening |
| [`docs/runbooks/services-catalog.md`](runbooks/services-catalog.md) | services_catalog table operations |
| [`docs/runbooks/sow-lifecycle.md`](runbooks/sow-lifecycle.md) | SOW draft → sent → accepted lifecycle |
| [`docs/runbooks/stage-c-plan.md`](runbooks/stage-c-plan.md) | Stage C feature roadmap |

---

## Memory docs

| File | Purpose |
|---|---|
| `CLAUDE.md` | Project conventions + current state (read first) |
| `MEMORY.md` | Shipping log + architectural decisions (read second) |
| `.claude-memory/MEMORY.md` | Session pointer to MEMORY.md |
| `PROJECT.md` | Credentials + ops secrets — read but **do not echo secrets** |

---

## External docs

| File | Purpose |
|---|---|
| `J:\My Drive\Agentic Agents\CLAUDE\DSIG\DSIG_PDF_STANDARDS_v2.md` | PDF design authority — colors, typography, layout, cover design. Governs DSIG PDFs even though implementation is HTML→Chromium, not ReportLab. |

---

## Conventions

### When you create a new spec / plan / runbook

- Add an entry to this INDEX in the same commit
- Use date prefix format: `YYYY-MM-DD-<topic>-<type>.md`
- Specs go in `docs/superpowers/specs/`
- Plans go in `docs/superpowers/plans/`
- Runbooks go in `docs/runbooks/`

### When you ship a plan

- Change status in this INDEX to SHIPPED
- Add a commit range reference if useful

### When a spec is superseded

- Mark old one as SUPERSEDED in this INDEX
- Note which doc replaces it in the old spec file

### When an architectural decision is made

- Write a spec BEFORE or retrospectively within 24h
- Reference the spec from relevant runbooks
- If it's a convention everyone must follow, also add it to CLAUDE.md
