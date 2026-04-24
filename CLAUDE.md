# Demand Signals — Next.js Site — Claude Code Reference

> **Read this entire file before making any changes.** It contains architecture decisions, known issues, credentials, and hard constraints that prevent regressions.

**For everything else** — runbooks, specs, plans, history — see [`docs/INDEX.md`](docs/INDEX.md).

---

## 1. What This Project Is

Next.js 16 rebuild of demandsignals.co — an AI-powered demand generation agency website. **DNS cutover in progress** — demandsignals.co is being pointed to Vercel.

| Item | Value |
|------|-------|
| **Production URL** | https://demandsignals.co (DNS cutover to Vercel in progress) |
| **Staging URL** | https://dsig.demandsignals.dev |
| **Local path** | `D:\CLAUDE\demandsignals-next` |
| **GitHub repo** | `demand-signals/demandsignals-next` |
| **Branch** | `master` |
| **Vercel project** | `demandsignals-next` — auto-deploys on push to master |
| **Owner** | Hunter (MD, Demand Signals) — 30-year web dev veteran |

---

## 2. Tech Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Framework | Next.js 16.2.2 (App Router) | Read `node_modules/next/dist/docs/` for API changes |
| React | 19.2.4 | |
| Language | TypeScript (strict) | Zero TS errors required before push |
| Styling | Tailwind CSS v4 + CSS Modules for layout | CSS vars in `globals.css` |
| Animation | Framer Motion | |
| Maps | Leaflet + react-leaflet + OpenStreetMap | Prospect detail map, no API key |
| Blog | MDX via `next-mdx-remote` + `gray-matter` | 145 posts in `src/content/blog/` |
| Forms | Nodemailer (API routes) | SMTP not fully wired yet |
| Sitemap | `next-sitemap` | |
| UI primitives | shadcn (base-ui), lucide-react | |
| Deployment | Vercel (auto-deploy on push to master) | |
| Dev server | `npm run dev` → http://localhost:3000 | |

---

## 3. Brand Tokens (CSS vars in `globals.css`)

```
--teal:       #68c5ad       /* primary brand teal */
--teal-dark:  #4fa894
--teal-light: rgba(104, 197, 173, 0.12)
--slate:      #5d6780       /* body text */
--orange:     #f28500       /* accent */
--dark:       #1d2330       /* dark sections bg */
--dark-2:     #252c3d       /* slightly lighter dark */
--light:      #f4f6f9       /* light sections bg */
```

CTA button orange: `#FF6B2B` (used in most places, slight variation from `--orange`).

---

## 4. Credentials

### GitHub

> **All real tokens are in `PROJECT.md`** (gitignored, local only). CLAUDE.md uses placeholders.
- **OAuth token (git push):** See `PROJECT.md` section 2 — starts with `gho_`
- **Fine-grained PAT (API only, NOT git push):** See `PROJECT.md` section 2 — starts with `github_pat_`
- **Vercel env var names:** `GITHUB_DEMANDSIGNALS_NEXT` (GitHub), `VERCEL_DEMANDSIGNALS_NEXT` (Vercel)

**Git push command (headless bash):**
```bash
# Token from PROJECT.md section 2 (OAuth token, NOT the fine-grained PAT)
GHTOKEN="<get from PROJECT.md>"
git -c credential.helper="" \
  -c "http.https://github.com.extraheader=Authorization: Basic $(echo -n "demand-signals:${GHTOKEN}" | base64 -w0)" \
  push origin master
```

### Vercel
- **Token:** See `PROJECT.md` section 2 — starts with `vca_`
- **Team ID:** `team_jPyeNYJSdDRpqSdsw3WD3AiQ`
- **Project ID:** `prj_MOFD7RLAS1tVLG1yLlt0kIZwPQrp`

### Other
- **Contact email:** `DemandSignals@gmail.com`
- **Phone:** `(916) 542-2423`
- **Booking URL:** `https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3yjIRXePILfG3aDwDq7N_ZdQIEOxi0HioY6NFF1vzE7PfH-xYXGVOW95ZNJ0BZj5d4-uUVJNPK?gv=true`
- **Logo:** `https://demandsignals.us/assets/logos/dsig_logo_v2b.png`

---

## 5. Current Navigation Structure (as of 2026-04-05)

The nav was refactored from 3 dropdowns (Services, AI & Agents, Tools) to 5 dropdowns + 1 direct link:

### Desktop Header: 5 Dropdowns + Portfolio Link + 2 CTAs

**Websites & Apps** dropdown:
| Label | URL |
|-------|-----|
| WordPress Sites | `/websites-apps/wordpress-development` |
| React / Next.js Apps | `/websites-apps/react-next-webapps` |
| iOS & Android Apps | `/websites-apps/mobile-apps` |
| Vibe Coded Web Apps | `/websites-apps/vibe-coded` |
| UI/UX Design | `/websites-apps/design` |
| Agent & App Hosting | `/websites-apps/hosting` |

**Demand Generation** dropdown:
| Label | URL |
|-------|-----|
| LLM Optimization | `/demand-generation/geo-aeo-llm-optimization` |
| Local SEO | `/demand-generation/local-seo` |
| Geo-Targeting | `/demand-generation/geo-targeting` |
| Google Business Admin | `/demand-generation/gbp-admin` |
| Demand Gen Systems | `/demand-generation/systems` |

**Content & Social** dropdown:
| Label | URL |
|-------|-----|
| AI Content Generation | `/content-social/ai-content-generation` |
| AI Social Media Management | `/content-social/ai-social-media-management` |
| AI Review Auto Responders | `/content-social/ai-review-auto-responders` |
| AI Auto Blogging | `/content-social/ai-auto-blogging` |
| AI Content Republishing | `/content-social/ai-content-repurposing` |

**AI & Agents** dropdown:
| Label | URL |
|-------|-----|
| AI Adoption Strategies | `/ai-services/ai-automation-strategies` |
| AI Workforce Automation | `/ai-services/ai-workforce-automation` |
| AI Infrastructure | `/ai-services/ai-agent-infrastructure` |
| AI Powered Outreach | `/ai-services/ai-automated-outreach` |
| AI Agent Swarms | `/ai-services/ai-agent-swarms` |
| AI Private LLMs | `/ai-services/private-llms` |
| AI Clawbot Setup | `/ai-services/clawbot-setup` |

**Learn** dropdown:
| Label | URL |
|-------|-----|
| Company | `/about` |
| Our Teams | `/about/team` |
| Blog & News | `/blog` |
| Service Locations | `/locations` |

**Direct link:** Portfolio → `/portfolio`
**CTAs:** Book a Call (external Google Calendar) + Get a Quote → `/contact`

### Source files for nav:
- Nav data: `src/lib/constants.ts` (all `NAV_*` exports)
- Header: `src/components/layout/Header.tsx` + `header.module.css`
- Dropdown panel: `src/components/layout/NavDropdownPanel.tsx` + `navDropdown.module.css`
- Mobile menu: `src/components/layout/MobileMenu.tsx` + `mobileMenu.module.css`
- Footer: `src/components/layout/Footer.tsx`

---

## 6. File Structure

```
src/
├── app/
│   ├── layout.tsx                    — root layout, Header + Footer + ContactBot + AnalyticsTracker
│   ├── page.tsx                      — homepage (assembles all sections)
│   ├── globals.css                   — CSS vars, Tailwind, base styles
│   ├── sitemap.ts                    — sitemap generation
│   ├── robots.ts / manifest.ts
│   ├── feed.xml/route.ts           — RSS 2.0 blog feed
│   ├── atom.xml/route.ts           — Atom 1.0 blog feed
│   ├── feed.json/route.ts          — JSON Feed 1.1
│   ├── faqs.md/route.ts            — Master FAQ markdown (250+ questions)
│   ├── content-index.json/route.ts — Content API directory (JSON)
│   ├── feeds/                       — Content API markdown endpoints
│   │   ├── about/route.ts          — Company about markdown
│   │   ├── services.md/route.ts    — Services directory
│   │   ├── blog.md/route.ts        — Blog index
│   │   ├── locations.md/route.ts   — Locations directory
│   │   ├── locations/route.ts      — Locations index
│   │   ├── locations/[county]/     — County hub markdown (5)
│   │   ├── locations/[county]/[city]/ — City hub markdown (23)
│   │   ├── blog/[slug]/route.ts    — Per-blog-post markdown (142)
│   │   ├── services/[slug]/route.ts — Per-service markdown (23)
│   │   ├── categories/[slug]/route.ts — Per-category markdown (4)
│   │   ├── ltp/[cityService]/route.ts — Per-LTP markdown (529)
│   │   └── pages/                  — Static page markdown
│   │       ├── home/route.ts
│   │       ├── contact/route.ts
│   │       ├── portfolio/route.ts
│   │       ├── team/route.ts
│   │       ├── terms/route.ts
│   │       ├── privacy/route.ts
│   │       ├── accessibility/route.ts
│   │       ├── tools/route.ts
│   │       └── tools/[slug]/route.ts
│   │
│   ├── websites-apps/               — CATEGORY: Websites & Apps
│   │   ├── page.tsx                  — index (CategoryIndexTemplate)
│   │   ├── wordpress-development/    — individual service pages
│   │   ├── react-next-webapps/       — (each uses ServicePageTemplate)
│   │   ├── mobile-apps/
│   │   ├── vibe-coded/
│   │   ├── design/
│   │   └── hosting/
│   │
│   ├── demand-generation/            — CATEGORY: Demand Generation
│   │   ├── page.tsx
│   │   ├── geo-aeo-llm-optimization/
│   │   ├── local-seo/
│   │   ├── geo-targeting/
│   │   ├── gbp-admin/
│   │   └── systems/
│   │
│   ├── content-social/               — CATEGORY: Content & Social
│   │   ├── page.tsx
│   │   ├── ai-content-generation/
│   │   ├── ai-social-media-management/
│   │   ├── ai-review-auto-responders/
│   │   ├── ai-auto-blogging/
│   │   └── ai-content-repurposing/
│   │
│   ├── ai-services/                  — CATEGORY: AI & Agent Services
│   │   ├── page.tsx
│   │   ├── ai-automation-strategies/
│   │   ├── ai-workforce-automation/
│   │   ├── ai-agent-infrastructure/
│   │   ├── ai-automated-outreach/
│   │   ├── ai-agent-swarms/
│   │   ├── private-llms/
│   │   └── clawbot-setup/
│   │
│   ├── services/                     — LEGACY (301 redirects to new structure)
│   ├── ai-agents/                    — LEGACY (301 redirects to new structure)
│   ├── tools/                        — Tools (kept as-is)
│   ├── blog/                         — MDX blog
│   ├── locations/                    — Location pages (23 cities, 5 counties)
│   │   ├── page.tsx                  — regional hub with CountySelector
│   │   ├── [county]/page.tsx         — county hub (5 pages)
│   │   └── [county]/[city]/page.tsx  — city hub (23 pages, lists all 23 services)
│   ├── [cityService]/page.tsx        — Root-level LTPs (575 pages: /el-dorado-hills-local-seo)
│   ├── not-found.tsx                 — Custom 404 page (noindex)
│   ├── about/ (+ about/team/)        — Company pages
│   ├── contact/
│   │   ├── page.tsx                  — server component (metadata export)
│   │   └── ContactPageClient.tsx     — client component (form logic)
│   ├── portfolio/ privacy/ terms/ accessibility/
│   ├── admin/                        — Admin portal
│   │   ├── page.tsx                  — Dashboard
│   │   ├── prospects/                — Prospect table + [id] detail (with map + activity form)
│   │   ├── pipeline/                 — Pipeline board (Kanban)
│   │   ├── demos/                    — Demo tracker (score badges)
│   │   ├── import/                   — Import wizard (CSV/JSON)
│   │   ├── agents/                   — Agent registry
│   │   ├── long-tails/               — LTP admin (575+ pages, search/filter)
│   │   ├── blog/                     — Blog admin (145 posts, search/filter)
│   │   └── analytics/                — Visitor analytics dashboard
│   ├── admin-login/                  — Google OAuth login page
│   └── api/                          — contact, subscribe, report-request
│       ├── admin/                    — Admin APIs (prospects, demos, deals, activities, import, score, analytics, blog, long-tails)
│       ├── analytics/                — Pageview collection (collect, init, weekly-report)
│       ├── agents/                   — Agent webhooks (scorer)
│       └── webhooks/                 — Supabase webhooks
│
├── components/
│   ├── admin/                        — Admin portal components
│   │   ├── admin-sidebar.tsx         — Sidebar with Prospecting/Content/Insights nav groups
│   │   ├── analytics-dashboard.tsx   — Visitor analytics (trends, sources, geo, devices, UTM)
│   │   ├── blog-table.tsx            — Blog posts admin table
│   │   ├── ltp-table.tsx             — Long-tail pages admin table
│   │   ├── prospect-map.tsx          — Leaflet/OSM map for prospect detail
│   │   ├── prospect-score-badge.tsx  — Diamond/Gold/Silver/Bronze tier badges
│   │   └── stat-card.tsx             — Reusable stat card component
│   ├── layout/                       — Header, Footer (+footer.module.css), MobileMenu, NavDropdown, ContactBot, AnalyticsTracker
│   ├── sections/                     — Page sections
│   │   ├── PageHero.tsx              — Parallax hero with particle canvas
│   │   ├── FeatureShowcase.tsx       — Scroll-pinned feature carousel (desktop) / stacked cards (mobile)
│   │   ├── StatsCounter.tsx          — Animated stat counters with dark gradient band
│   │   ├── AnimatedTechStack.tsx     — Two-col tech stack with blur-reveal (responsive)
│   │   ├── AnimatedAICallout.tsx     — Dark section with pulsing glow + bullet spring-in
│   │   ├── AnimatedCTA.tsx           — Gradient hue-shift CTA on scroll
│   │   ├── HomeBlogSection.tsx       — Featured post + marquee (responsive)
│   │   └── (HeroCanvas, ServicesGrid, etc.)
│   ├── templates/                    — Reusable page templates
│   │   ├── ServicePageTemplate.tsx   — Hero → Features → Stats → Tech → Proof → AI → Blog → FAQ → CTA
│   │   └── CategoryIndexTemplate.tsx — Hero + Service Cards + FAQ + CTA
│   ├── motion/                       — ScrollReveal wrapper
│   ├── seo/                          — JsonLd
│   └── ui/                           — GlassCard, FaqAccordion, ShapeBg, SectionHeading, shadcn
│
├── middleware.ts                    — HTTP Link headers for markdown discovery
│
├── content/blog/                     — 145 MDX blog posts
│
├── hooks/
│   └── useCountUp.ts                 — RAF counter animation hook
│
└── lib/
    ├── constants.ts                  — All nav data, site URLs, contact info
    ├── metadata.ts                   — buildMetadata() helper
    ├── schema.ts                     — JSON-LD schema generators
    ├── icons.ts                      — Lucide icon resolver
    ├── cities.ts                     — 23 cities across 5 counties
    ├── services.ts                   — 23 services, keyword/FAQ templates with {city}/{county} vars
    ├── counties.ts                   — County data + getCountiesWithCities()
    ├── city-service-slugs.ts         — LTP slug lookup table (575 entries)
    ├── blog.ts                       — MDX blog loader (145 posts, 7 categories)
    ├── analytics-db.ts               — Pageview insertion + visitor hashing (Vercel Postgres)
    ├── admin-auth.ts                  — Admin authentication (requireAdmin)
    ├── scoring.ts                     — 5-signal prospect scoring engine
    ├── api-security.ts               — Rate limiting, CSRF, input validation
    ├── feed-utils.ts                 — Feed helpers (ETag, cache, detail levels)
    ├── all-faqs.ts                   — Centralized FAQ registry (250+ FAQs)
    ├── category-content.ts           — Category page content data
    └── utils.ts                      — cn() utility
```

---

## 7. Page Templates

### ServicePageTemplate (`src/components/templates/ServicePageTemplate.tsx`)
Server component (cannot use 'use client' — imports blog.ts which uses `fs`). All motion is in extracted client components.

Section order: PageHero (parallax) → FeatureShowcase (scroll-pinned carousel) → StatsCounter (optional) → AnimatedTechStack (optional) → Proof Section (optional) → AnimatedAICallout (optional) → HomeBlogSection → FaqAccordion → AnimatedCTA.

Props include optional `stats` (animated counters) and `aiCalloutBullets`.

### CategoryIndexTemplate (`src/components/templates/CategoryIndexTemplate.tsx`)
Used by category index pages (`/websites-apps`, `/demand-generation`, `/content-social`, `/ai-services`). Sections: Dark Hero → Service Cards grid → FAQ with FAQPage schema → CTA.

Both templates auto-generate JSON-LD schema (Service, BreadcrumbList, FAQPage).

---

## 8. Header Implementation

- `position: fixed` (NOT sticky)
- Transparent at top → `rgba(20,27,40,0.97)` + `backdrop-filter: blur(20px)` on scroll
- Scroll listener via `useEffect` with passive event
- Height: 72px, max-width: 1300px, padding: 0 28px
- `<main>` has `paddingTop: '72px'` to offset fixed header
- Dropdown: mouse-enter/leave with 120ms close timer
- Caret: `▾` text, rotates 180° when open

---

## 9. Redirects

### In `next.config.ts`:
16 permanent 301 redirects from old `/services/*` and `/ai-agents/*` URLs to new structure. CSP header also configured here.

### In `vercel.json`:
20 vanity/shortcut redirects for common paths — `/seo`, `/llm`, `/geo`, `/wordpress`, `/reviews`, `/team`, etc. All point to the correct new URL structure. Updated 2026-04-07.

---

## 10. What Is Complete

- [x] All 4 category index pages with FAQs and schema
- [x] All 23 individual service pages with unique FAQs and schema
- [x] Header: 5 dropdown nav with new categories
- [x] Mobile menu: sectioned navigation
- [x] Footer: 4-column with new categories + hours link + basement tagline
- [x] Homepage: ServicesGrid updated with new category links
- [x] Templates: ServicePageTemplate + CategoryIndexTemplate
- [x] 301 redirects from old URLs (in next.config.ts)
- [x] Sitemap: all routes + 141 blog posts with frontmatter dates
- [x] llms.txt updated with new URL structure
- [x] About/Team page with Person schema (Hunter, Tiffany, Sarah)
- [x] Blog: 141 MDX posts across 7 categories, index + [slug] with BlogPosting schema
- [x] Tools: demand-audit, research-reports, demand-links, dynamic-qr
- [x] Locations: 23 cities, 5 counties, CountySelector, services.ts data layer
- [x] URL Restructure: county hubs (5), city hubs (23), root-level LTPs (575 pages)
- [x] Contact page with form + ContactPage schema + FAQ accordion + physical address
- [x] JSON-LD: org, website, service, breadcrumb, FAQ, BlogPosting, Person, CollectionPage, ContactPage, LocalBusiness
- [x] GBP/LocalBusiness schema: address, geo, openingHours, sameAs (8 socials), image, priceRange
- [x] Vercel auto-deploy from GitHub master
- [x] Section Theater motion upgrade (pilot: wordpress-development page)
- [x] Security hardening: API routes, CSP header, git history purge
- [x] Accessibility page (WCAG 2.1 AA, comprehensive)
- [x] Privacy page (CCPA/CPRA compliant, 12 sections)
- [x] Terms of Service page (16 sections, JAMS arbitration)
- [x] Custom 404 page with navigation links
- [x] Card game easter egg (ArcCardGame in layout.tsx)
- [x] Mobile responsive: tech stack, blog featured, footer all stack on mobile
- [x] SEO/GEO/AEO site-wide audit: titles, descriptions, breadcrumbs, headings, H1 keywords
- [x] NAP consistency: (916) 542-2423 format, physical address on contact page
- [x] buildMetadata(): siteName, locale, twitter.creator propagated to all pages
- [x] Category-specific LTP content: unique discovery bullets and HowTo steps per category
- [x] hreflang, preconnect hints, noindex on spacegame/404
- [x] 796 static pages building clean
- [x] Homepage scroll animations: all 8 sections with ScrollReveal/StaggerContainer/StaggerItem
- [x] Sitemap: 6-tier priority system (1.0→0.5), dynamic date, blog daily frequency
- [x] llms-full.txt: 517-line comprehensive LLM discovery file (141 posts, 40 FAQs, service details)
- [x] Site-wide audit: E.164 phone, logo migration, skip link, font-display:swap, aria-hidden, metadata splits
- [x] Contact + research-reports: server/client component split for proper metadata exports
- [x] Favicon: removed duplicate src/app/favicon.ico (App Router convention shadowed public/favicon.ico)
- [x] Content API: RSS 2.0, Atom 1.0, JSON Feed 1.1 blog feeds
- [x] Content API: Per-page markdown endpoints for every page (740+ endpoints)
- [x] Content API: Master FAQ aggregation (250+ FAQs with cross-links)
- [x] Content API: Self-describing content-index.json API directory
- [x] Content API: HTTP Link headers via middleware for markdown discovery
- [x] Content API: OpenSearch, security.txt, WebSub hub references
- [x] Content API: ETags + Last-Modified on all feed endpoints
- [x] Content API: Progressive detail levels (?detail=summary|full)
- [x] Meta tags: max-video-preview:-1, twitter:site added site-wide
- [x] Robots: 5 additional AI bot user-agents allowlisted
- [x] Schema: Enhanced org schema with knowsAbout (15), hasOfferCatalog (23 services), expanded areaServed
- [x] dsig-rank-system.md: Complete ranking system methodology document
- [x] Admin portal: CRM spine with Google OAuth, 8 Supabase tables, RLS, scoring engine
- [x] Admin portal: Dashboard, Prospects (table + detail), Pipeline (Kanban), Demos, Import, Agents
- [x] Admin portal: 5-signal prospect scoring (review authority, digital vulnerability, industry value, close probability, revenue potential)
- [x] Admin portal: Diamond/Gold/Silver/Bronze tier classification with badges
- [x] Admin portal: Prospect detail map (Leaflet/OSM + Nominatim geocoding + Google Maps link)
- [x] Admin portal: Activity form (note/call/email/meeting logging on prospect detail)
- [x] Admin portal: Long-Tails admin page (575+ LTP pages with search, city, category filters)
- [x] Admin portal: Blog Posts admin page (145 MDX posts with search, category, featured filters)
- [x] Admin portal: Visitor Analytics dashboard (pageviews, visitors, trends, sources, geo, devices, UTM)
- [x] Admin portal: Sidebar restructured — DSIG ADMIN PORTAL, Prospecting/Content/Insights nav groups
- [x] AnalyticsTracker: privacy-preserving pageview tracking (SHA256 visitor hash, no cookies, no PII)
- [x] 843 static pages building clean
- [x] Retainer bundling at /quote: required selection step, 4 tiers (Essential/Growth/Full/Site-only), one-signature SOW flow with SowOngoingServices payload, launch activation creates subscription row via `activateRetainer()`
- [x] SOW accept triggers client + project creation: prospects.is_client + became_client_at, projects row with phases materialized from SOW phases, monthly_value computed from recurring deliverable cents
- [x] Executive dashboard at /admin: pipeline funnel (Visitors → Revenue) + per-category stat tiles for every sidebar section. 30-day rolling window default with 7d/30d/90d selector. Cached 5min at the edge.
- [x] SOW phase hierarchy: phases with nested priced deliverables (one-time/monthly/quarterly/annual + start_trigger). Migrations 017a-c.
- [x] Doc-system overhaul: in-repo editable SOW + invoice detail pages (no iframes). Invoice edit-after-create + refund + resend + mark-paid. Subscription detail: edit/refund/mark-paid/delete/end-date/override-amount. Subscription Plans admin CRUD.
- [x] prospects.client_code (4-letter code, unique partial index) + prospects.channels jsonb (7 review channels + 7 simple channels with ratings/URLs). Migrations 019a-b, 020a, 022a.
- [x] prospect_notes table: append-only timeline with add/edit/delete UI.
- [x] Document numbering: TYPE-CLIENT-MMDDYY{A-Z} platform-wide convention. allocate_document_number() RPC + src/lib/doc-numbering.ts. Receipts table. Migration 019a-b + 021a.
- [x] SOW accept auto-creates deposit invoice (INV-…). Invoice mark-paid auto-creates receipt (RCT-…). Partial payments supported.
- [x] Quote sessions: doc_number (EST-CLIENT-MMDDYYA) allocated lazily on prospect-sync. Continue-to-SOW button at /admin/quotes/[id] pre-populates SOW from EST line items.
- [x] Admin sidebar reorganized into 10 collapsible accordion groups: PROSPECTING / ONBOARDING / CLIENTS / PROJECTS / FINANCE / SERVICES / CONTENT / AGENTS / INSIGHTS / ADMIN.
- [x] PDF pipeline replaced: Chromium HTML→PDF in-repo (puppeteer-core + @sparticuz/chromium). Legal format (8.5×14). Python dsig_pdf renderer deprecated. Renderer files: src/lib/pdf/{sow,invoice,receipt,render,chromium,_shared}.ts.
- [x] PDF design reconciled to DSIG v2 spec: #3D4566 slate, #52C9A0 teal, #F26419 orange. Helvetica. Interior header/footer. Cover with decorative circles + 3-col meta band + orange pill badge. Back cover restored. Signatures on last interior content page.
- [x] Public document pages branded to match PDF design: /sow/[number]/[uuid] (proposal microsite + Accept form), /invoice/[number]/[uuid] (Stripe-receipt treatment + Pay button), /quote/s/[token] (EST hero + next-steps CTAs).
- [x] Trade-in-Kind on SOWs: sow_documents.trade_credit_cents + trade_credit_description. Shows TIK credit row in pricing section + PDF. Migration 023a.
- [x] Supabase security hardening: SECURITY DEFINER views → security_invoker=true, 9 functions with explicit search_path, 5 permissive RLS policies dropped, leaked password protection enabled. Migration 024a.
- [x] Channels + ratings: review channels (google_business, yelp, facebook, trustpilot, bbb, angi, nextdoor) store {url, rating, review_count, last_synced_at}. Simple channels (website, linkedin, tiktok, youtube, instagram, twitter_x, pinterest). Migration 022a backfills legacy website_url + google_rating/yelp_rating.

---

### Retainer flow (added 2026-04-21)

`/quote` captures retainer selection at the retainer step (between build-scope-done and terminal CTA). One of 4 tiers: Essential / Growth / Full / Site-only. Stored on `quote_sessions.selected_plan_id` + `retainer_custom_items` + `retainer_monthly_cents`.

Admin marks quote launched via `/admin/quotes/[id]` → `RetainerPanel` Mark Launched button → `POST /api/admin/quotes/[id]/launch` → `activateRetainer(quoteId)` in `src/lib/retainer.ts` → creates `subscriptions` row (skipped for site_only).

Retainer plans editable at `/admin/retainer-plans` + `/admin/retainer-plans/[id]`. The retainer menu is filtered rows of `services_catalog` where `pricing_type IN ('monthly','both')` — single source of truth, no parallel table.

SOW includes `ongoing_services` (see `SowOngoingServices` in `invoice-types.ts`) populated via `buildSowOngoingServices(quoteId)`. The Python PDF renderer is deprecated — PDFs are now Chromium HTML→PDF (see §21).

---

### Project lifecycle (added 2026-04-22)

SOW accept (`/api/sow/public/[number]/accept`) now converts the prospect into a client
(prospects.is_client=true) and materializes a projects row with phases copied from the
SOW. Phases carry `status` (pending/in_progress/completed). Deliverables carry `status`
(pending/delivered). Admin manages at `/admin/projects` + `/admin/projects/[id]`.
Subscription rows are created for recurring deliverables as part of accept.

Migration: `supabase/migrations/018b_client_lifecycle.sql` adds `prospects.is_client`,
`prospects.became_client_at`, `projects.sow_document_id`, `projects.phases`.
Apply via `supabase/migrations/APPLY-018-2026-04-22.sql`.

Key files:
- `src/lib/invoice-types.ts` — `ProjectPhaseDeliverable`, `ProjectPhase`, `ProjectRow` types
- `src/app/api/admin/projects/route.ts` — list projects
- `src/app/api/admin/projects/[id]/route.ts` — GET + PATCH project
- `src/app/api/admin/projects/[id]/phases/[phaseId]/route.ts` — update phase status
- `src/app/api/admin/projects/[id]/deliverables/[deliverableId]/route.ts` — update deliverable status
- `src/app/admin/projects/page.tsx` — admin list view
- `src/app/admin/projects/[id]/page.tsx` — admin detail with phase/deliverable management

---

## 11. What Is NOT Done (Open Work)

### High Priority — CRM / Agency OS
1. **First Google sign-in** at demandsignals.co/admin-login with demandsignals@gmail.com
2. **Seed admin_users** — SQL INSERT after first sign-in (see project_crm_deployment.md)
3. **Add SUPABASE_WEBHOOK_SECRET** to Vercel env vars
4. **Import 142 prospects** via /admin/import using data/prospects-import.json
5. **Demo Factory (Module 2)** — auto-generate demo sites
6. **Outreach Engine (Module 3)** — email/SMS/voice via Resend/Twilio/Vapi
- [ ] **Manual EST admin form** — standalone admin-created budgetary estimate not originating from the /quote AI conversation. Feeds into the same EST→SOW continuation path. Low priority; admin process starts with SOW when /quote wasn't used.
- [ ] **Project expense tracking** — new table `project_expenses` (project_id, description, amount_cents, category, incurred_at, receipt_url). UI on `/admin/projects/[id]`.
- [ ] **Project time tracking** — new table `project_time_entries` (project_id, phase_id, deliverable_id, hours, description, logged_at, logged_by). UI on `/admin/projects/[id]`. Aggregate hours roll up per phase and project.
- [ ] **Scheduled rating sync for clients** — weekly/daily cron re-runs research specifically on `prospects.is_client = true` review channels. New cron: `scripts/sync-client-ratings.mjs` + Vercel cron entry.
- [ ] **PDF design v2 fine-tuning** — iterate as real prospects respond; design spec at DSIG_PDF_STANDARDS_v2.md is authoritative.

### High Priority — Site
1. **301 redirects from PHP site** — old .co URLs are Google-indexed; need redirects now that DNS is cutting over
2. **Roll out Section Theater** to remaining 22 service pages (pilot done on wordpress-development)
3. **SMTP wiring** — contact form needs Gmail app password in Vercel env vars
4. **Google Search Console** — DNS TXT record in Cloudflare for verification

### Medium Priority
- [ ] **Mobile menu UX** — currently a simple slide-down; .co uses full-screen overlay with animations
- [ ] **OG image** — `/og-image.png` is placeholder, needs real branded asset
- [ ] **Portfolio page** — needs real client case studies with results data
- [ ] **GA4** — optional now that custom analytics tracker is deployed (Vercel Analytics also installed)

### Lower Priority
- [ ] Blog: more posts targeting buyer search terms
- [ ] Tools: demand-audit and research-reports need real functionality
- [ ] Social proof: real testimonials
- [ ] Performance optimization pass (Core Web Vitals)

---

## 12. Known Issues & Lessons Learned

### Git push in headless bash
**Problem:** Windows credential manager opens GUI dialog — fails in non-interactive shell.
**Solution:** Always use `credential.helper=""` with inline base64 token (see section 4).
**Token note:** Fine-grained PAT (`github_pat_...`) returns 403 on git push. Use OAuth token (`gho_...`).

### Vercel deployment API
**Problem:** Including `projectId` in request body causes 400.
**Solution:** Use GitHub push auto-deploy (simpler, always works).

### Next.js 16 breaking changes
**Problem:** APIs, conventions, and file structure differ from training data.
**Solution:** Read `node_modules/next/dist/docs/` before writing code that uses Next.js internals.

### Header sticky vs fixed
**Problem:** `position: sticky` with solid bg doesn't match .co.
**Solution:** Use `position: fixed` with scroll listener + `paddingTop: '72px'` on `<main>`.

### ServicePageTemplate must stay a server component
**Problem:** Adding `'use client'` to ServicePageTemplate breaks the build because it imports `blog.ts` which uses Node `fs`.
**Solution:** Extract all animated/motion sections into separate client components (AnimatedTechStack, AnimatedAICallout, AnimatedCTA, etc.) and import them into the server-side template.

### ShapeBg hydration mismatch
**Problem:** `Math.random()` in `useMemo` produces different values on server vs client, causing hydration errors.
**Solution:** Use a seeded PRNG (`mulberry32` with seed 42) that produces deterministic output on both server and client.

### Favicon duplication (src/app/ vs public/)
**Problem:** `src/app/favicon.ico` triggers Next.js App Router's automatic favicon route, which shadows the explicit `<link>` tags in layout.tsx that point to `public/favicon.ico`.
**Solution:** Only keep favicon files in `public/`. Do NOT put favicon.ico in `src/app/`.

### Cloudflare + Vercel DNS
**Problem:** Cloudflare proxy (orange cloud) intercepts TLS and conflicts with Vercel's edge network.
**Solution:** Always use DNS Only (grey cloud) for Vercel domains. A record: `@` → `216.150.1.1`. CNAME: `www` → `cname.vercel-dns.com`. SSL mode: Full (Strict).

### Contact/research-reports metadata exports
**Problem:** Pages with `useState` (client components) can't export `metadata` or `generateMetadata` (server-only).
**Solution:** Split into server component (page.tsx with `buildMetadata()`) + client component (PageClient.tsx with form logic).

### Generated pages (Python script)
15 service pages were batch-generated using `generate_pages.py` (in repo root). The script is a build artifact — content can be edited directly in the page files. The script can be deleted.

### Supabase schema cache
**Problem:** After applying a migration cleanly, API calls return "Could not find column X" or "relation does not exist".
**Solution:** PostgREST's schema cache hasn't refreshed yet. Wait 30 seconds and retry, or reload the Supabase SQL Editor tab. This is not a migration bug — the migration applied; it's purely a cache TTL issue.

### Chromium on Vercel (serverless PDF)
**Problem:** `puppeteer-core` + `@sparticuz/chromium` will fail to bundle if not externalized. Also, `/var/task` is read-only in the Vercel runtime.
**Solution:** Add `['puppeteer-core', '@sparticuz/chromium']` to `serverExternalPackages` in `next.config.ts`. Write any temp files to `/tmp` (writable). Use the remote binary URL in `chromium.executablePath('https://...')` for v147+; do NOT vendor the binary in the repo.

### zod v4 rename
**Problem:** Zod v4 renamed `e.errors` → `e.issues` on `ZodError`. Old code catches a `ZodError` but reads `.errors` and gets `undefined`.
**Solution:** Use `e.issues` in all catch blocks when handling `ZodError`. Search for `.errors` on caught `ZodError` references and update.

### Serverless write-only path
**Problem:** Attempting to write temp files to `/var/task` on Vercel throws EROFS (read-only filesystem).
**Solution:** Always use `/tmp` for any transient file writes in API routes (e.g., Chromium temp profile, downloaded logo). `/tmp` is writable and ephemeral in the serverless context.

---

## 13. Important Constraints

- **No pricing sections** on any service page (owner's explicit preference)
- **Tech stack talk is good** — mention Next.js, Claude API, Supabase, Vercel, etc. on service pages
- **The .co PHP site is the visual reference** — match it when in doubt
- **Do NOT touch the PHP site** unless explicitly asked
- **Always run `npm run build` before pushing** — catch TS/Next.js errors locally
- **Every page must have a unique FAQ** — SEO/GEO/AEO optimized for LLM indexing
- **Every FAQ must be in FAQPage schema** — auto-included via templates
- **llms.txt must be updated** when page URLs change
- **llms-full.txt** exists in `public/` — 517-line comprehensive version with full blog archive
- **Favicon files live in `public/` only** — never put favicon.ico in `src/app/` (App Router convention conflicts)
- **Cloudflare proxy must be OFF** (grey cloud) for Vercel domains

---

## 14. Running the Project

```bash
# Dev server
cd "D:\CLAUDE\demandsignals-next"
npm run dev
# → http://localhost:3000

# Build check (ALWAYS before pushing)
npm run build

# Push to GitHub (triggers Vercel auto-deploy)
git add -A
git commit -m "your message"
git push origin master
```

---

## 15. Environment Variables

Required in `.env.local` and Vercel:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=DemandSignals@gmail.com
SMTP_PASS=<gmail app password>
CONTACT_EMAIL=DemandSignals@gmail.com
NEXT_PUBLIC_SITE_URL=https://demandsignals.co
NEXT_PUBLIC_SUPABASE_URL=https://uoekjqkawssbskfkziwz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<supabase service role key>
SUPABASE_WEBHOOK_SECRET=<webhook secret for scorer agent>
POSTGRES_URL=<vercel postgres connection string for analytics>
```

---

## 16. Business Context

Demand Signals is an AI-first demand generation agency. The positioning:

> **Your website, built by AI experts. Your content, generated by AI. Your reviews, handled by AI. Your social media, run by AI. You approve — AI does the rest.**

- Replaces marketing employees and agency retainers with AI systems
- Products: AI-Powered Websites ($5K-25K build + $800-2K/mo), AI Content & Reputation ($800-2.5K/mo), AI Business Operations (custom)
- Based in Northern California, serving clients across the USA, Thailand, Australia and Beyond
- Competitive advantage: three-layer discovery strategy (SEO + GEO + AEO), domain loop architecture, llms.txt, continuous AI optimization

The site itself is a demo of what DSIG delivers — it should look, perform, and rank like the best example of our own work.

---

## 17. Content API & Feed Infrastructure

### Overview
Every page on the site has a machine-readable markdown version accessible via HTTP. 740+ content endpoints serve token-efficient markdown to AI crawlers while HTML pages remain canonical for Google.

### Key Endpoints
| Endpoint | Purpose |
|----------|---------|
| `/feed.xml` | RSS 2.0 (WebSub-enabled) |
| `/atom.xml` | Atom 1.0 (WebSub-enabled) |
| `/feed.json` | JSON Feed 1.1 |
| `/faqs.md` | Master FAQ (250+ questions) |
| `/content-index.json` | Self-describing API directory |
| `/feeds/services.md` | Services directory |
| `/feeds/blog.md` | Blog index |
| `/feeds/locations.md` | Locations directory |

### Dynamic Endpoints
| Pattern | Count | Source |
|---------|-------|--------|
| `/feeds/blog/{slug}` | 142 | blog.ts getAllPosts() |
| `/feeds/services/{slug}` | 23 | services.ts SERVICES |
| `/feeds/categories/{slug}` | 4 | category-content.ts |
| `/feeds/locations/{county}` | 5 | counties.ts |
| `/feeds/locations/{county}/{city}` | 23 | cities.ts |
| `/feeds/ltp/{city-service}` | 529 | city-service-slugs.ts |
| `/feeds/pages/*` | 12 | Hardcoded content |

### Duplicate Content Prevention
- All feed/markdown endpoints return `X-Robots-Tag: noindex, follow`
- Not included in sitemap.xml
- Each endpoint links to canonical HTML version
- Google only indexes HTML; AI crawlers get markdown

### Content Operations Checklist

**Adding a new blog post:**
- Drop MDX in `src/content/blog/` → auto-appears in all feeds/indexes
- Run `npm run ping-hub` to notify WebSub subscribers
- Update llms-full.txt if high-value post

**Adding a new service:**
- Add to SERVICES array in `services.ts` → auto-populates feeds
- Add to `category-content.ts` category listing
- Update middleware.ts SERVICE_SLUGS
- Update llms.txt + llms-full.txt

### Key Files
| File | Purpose |
|------|---------|
| `src/lib/feed-utils.ts` | ETag, cache headers, detail level parsing |
| `src/lib/all-faqs.ts` | Centralized FAQ registry (250+ FAQs) |
| `src/lib/category-content.ts` | Category page content data |
| `src/middleware.ts` | HTTP Link headers for markdown discovery |
| `dsig-rank-system.md` | Full ranking system methodology |

---

## 18. Domain Architecture

**Decided 2026-04-17 during Stage C item 1 (invoicing) brainstorm. Locked-in rule.**

All DSIG operations live on `demandsignals.co` subdomains. `demandsignals.dev` is retired
(registration held for squatting defense only; no DNS records beyond a parking page).
Lifecycle is encoded in the subdomain, which keeps routing, tracking, OAuth, and cookie
scope unified under a single apex domain.

| Domain | Purpose | Lifetime |
|--------|---------|----------|
| `demandsignals.co` | Production DSIG site — main marketing, admin portal, client portal, all public APIs | permanent |
| `preview.demandsignals.co` | DSIG's own site staging (currently at `dsig.demandsignals.dev` — migrate later, not urgent) | permanent |
| `*.demos.demandsignals.co` | Per-client demo sandboxes. `[client-code].demos.demandsignals.co`. AI-generated pitch sites. | 30–90 days (throwaway) |
| `*.staging.demandsignals.co` | Per-client project staging. `[client-code].staging.demandsignals.co`. Real production builds pre-launch. | weeks to months |
| `assets.demandsignals.co` | R2 public bucket — CDN-backed static assets (marketing, media, logos, public project galleries) | permanent |
| `[clientdomain].com` | Client's live site. Same Vercel project as `[client-code].staging.demandsignals.co`, promoted via domain alias + env var change. | permanent (post-launch) |
| `demandsignals.dev` | **Intended to be retired (squat-protection only), but currently active as demo-sites fallback — see reconciliation note below.** | — |

### Reconciliation note (added 2026-04-21)

The 2026-04-17 decision above declared `demandsignals.dev` retired. That has
not happened in practice yet. As of 2026-04-21:

- **`*.demandsignals.dev` is the active, working URL for demo sites.** The
  `demo-sites` Vercel project serves every prospect's demo at
  `[code].demandsignals.dev`. The Vercel wildcard entry is Valid.
- **`*.demos.demandsignals.co` shows "Invalid Configuration" in Vercel.**
  Middleware in `demo-sites/src/middleware.ts` was updated 2026-04-21 to
  recognize both roots, but the `.co` DNS is not wired. Fixing it requires
  either changing NS on `demandsignals.co` to Vercel (losing Cloudflare for
  the whole `.co` zone), or adding a `CNAME *.demos → vercel-target` at
  Cloudflare + switching Vercel's domain mode to external DNS. Pending
  decision. See `D:\CLAUDE\demo-sites\docs\DNS_STATUS.md` for the live tracker.
- **`smma.demandsignals.dev` is an exception.** Hunter assigned it directly to
  the SMMA production Vercel project (`client-southside-mma` repo), not the
  `demo-sites` project. The mockup for that client lives at
  `https://smma.demandsignals.dev/mockup` on that production project. This
  per-project domain assignment overrides the demo-sites wildcard.

Until the `.co` DNS is fixed and demos are migrated, `demandsignals.dev`
stays active. Update this section when that cut over.

### Demo vs Staging (different lifecycle, different rigor)

- **Demo** = sales tool. Prospect sees before contract. Placeholder copy, partial features, mock data OK. Publicly viewable. `noindex`. Lifespan: 30–90 days, then converts to staging or gets killed.
- **Staging** = construction workspace. Signed client, real content, real integrations. Password-gated + `noindex`. Lifespan: weeks to months, then deploys to `[clientdomain].com` via Vercel domain alias + env var swap (no URL rewrite, no rebuild).

### Why one apex domain

- **OAuth redirect URIs** — single `https://demandsignals.co/auth/callback`, no cross-TLD flow complexity.
- **Analytics unification** — cookie `Domain=.demandsignals.co` works across every subdomain.
- **CORS simplicity** — same-origin policy covers admin ↔ demos ↔ staging ↔ assets.
- **Tracking consolidation** — admin portal can query every visit across every client subdomain natively.

### Security discipline (required when using one apex)

- Admin cookies MUST scope `Domain=demandsignals.co` (exact, no leading dot) + `SameSite=Strict` + `HttpOnly` + `Secure`.
- Demo sites that need session cookies MUST scope to `Domain=demos.demandsignals.co` (not `.demandsignals.co`). Never share auth scope between admin and demo subdomains.
- Client project codebases (running on `*.staging.*` / `*.demos.*`) must NOT share cookies with admin portal.

### Client project lifecycle (reference)

```
Prospect → /quote → closes deal
   ↓
Demo Factory spins up [code].demos.demandsignals.co          (Stage C-D feature)
   ↓
Client approves → contract signed
   ↓
New Vercel project → [code].staging.demandsignals.co         (real build)
   ↓
Client approves final build
   ↓
Vercel domain alias + env var swap → [clientdomain].com      (~20 min, no rebuild)
   ↓
Staging URL retired or kept as internal backup
```

The "no rebuild at go-live" contract depends on every client project using:
- Relative paths for internal links (never absolute to the staging/demo URL)
- Single `SITE_URL` env var for canonical/OG/sitemap absolute URLs
- No URL-prefix routing (no `basePath` tricks) — each client gets their own subdomain (`[code].staging.*`), content served at `/` always

---

## 19. File Storage Architecture

**Decided 2026-04-17 during Stage C item 1 (invoicing) brainstorm. Locked-in rule.**

DSIG uses **Cloudflare R2** for all file storage across every project. S3-compatible API,
zero egress cost, `$0.015/GB/month` storage. Pattern is reusable across every future DSIG
project — any new project drops in the same `r2-storage.ts` helper and two env vars.

### Two-bucket split (by privacy, not by project)

| Bucket name | Access | Custom domain | Use |
|---|---|---|---|
| `dsig-assets-public` | Public read, CDN-cached | `https://assets.demandsignals.co` | Marketing, logos, OG images, blog media, public project galleries, client site media (post-launch) |
| `dsig-docs-private` | Private, signed URLs only (15-min TTL) | None (served via admin-auth API routes) | Invoice PDFs, SOW PDFs, contract PDFs, client uploads, research reports, internal drafts |

### Why separate buckets (not folders in one bucket)

- Each bucket has its own public-access rule — a mistake in one can't leak the other.
- Cloudflare custom-domain routing is per-bucket, not per-path.
- Backup/lifecycle policies are per-bucket.
- Blast radius containment is cheap insurance.

### Public bucket path conventions (`assets.demandsignals.co`)

```
/brand/                                → DSIG logos, wordmarks, favicons
/marketing/                            → OG images, hero videos, ad creative
/blog/[post-slug]/                     → per-blog-post media
/clients/[client-code]/gallery/        → public portfolio (post-launch, with client approval)
/site/                                 → DSIG site's own media (hero videos, testimonial photos)
```

### Private bucket path conventions

```
/invoices/[invoice-number]_v[n].pdf    → invoice PDFs (immutable per version)
/sow/[sow-id].pdf                      → statements of work
/contracts/[contract-id].pdf           → signed contracts
/clients/[client-code]/uploads/[file]  → client-uploaded source files
/clients/[client-code]/drafts/[file]   → pre-approval drafts
/prospects/[prospect-id]/research/[f]  → research reports, audits
```

### Library

`src/lib/r2-storage.ts` exports:
- `uploadPublic(key, body, contentType): Promise<string>` — returns `https://assets.demandsignals.co/{key}`
- `getPublicUrl(key): string` — synchronous, no network call
- `uploadPrivate(key, body, contentType): Promise<void>`
- `getPrivateSignedUrl(key, ttlSeconds?): Promise<string>` — default 15 min
- `deletePrivate(key): Promise<void>` — for compensating rollback

Single `@aws-sdk/client-s3` install. Same API pattern for both buckets (R2 is S3-compatible).

### Required env vars

```bash
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-api-token-id>
R2_SECRET_ACCESS_KEY=<r2-api-token-secret>
R2_PUBLIC_BUCKET=dsig-assets-public
R2_PUBLIC_URL=https://assets.demandsignals.co
R2_PRIVATE_BUCKET=dsig-docs-private
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

### Transactional safety for private uploads

R2 upload + Supabase row insert is not atomic. Use a compensating rollback pattern:

```ts
// 1. Insert DB row first
const { error: rowErr, data: row } = await supabase.from('invoices').insert(...).select().single()
if (rowErr) throw rowErr

// 2. Upload PDF
try {
  await r2.uploadPrivate(`invoices/${row.invoice_number}_v1.pdf`, pdfBuffer, 'application/pdf')
  await supabase.from('invoices').update({ pdf_storage_path: `invoices/${row.invoice_number}_v1.pdf` }).eq('id', row.id)
} catch (uploadErr) {
  await supabase.from('invoices').delete().eq('id', row.id)  // compensating rollback
  throw uploadErr
}
```

### Why NOT Supabase Storage

Supabase Storage egress is `$0.09/GB` — punishes exactly the video/media use cases DSIG will grow into. R2's free egress wins decisively at scale. And consistency across DSIG projects matters more than the minor transactional-atomicity gain Supabase Storage offers.

---

## 20. Document Numbering Convention

**Format:** `TYPE-CLIENT-MMDDYY{SUFFIX}`

| Component | Meaning |
|---|---|
| TYPE | `EST` · `SOW` · `INV` · `RCT` |
| CLIENT | 4-letter code on `prospects.client_code` (auto-suggested from business_name, admin-editable) |
| MMDDYY | America/Los_Angeles date |
| SUFFIX | Sequential letter per (type, client, date): A, B, ..., Z, AA, AB |

Example: first invoice to Hangtown today → `INV-HANG-042326A`. Second same day → `INV-HANG-042326B`.

**Allocation:** server-side via `allocateDocNumber()` in `src/lib/doc-numbering.ts` → DB RPC `allocate_document_number()` (atomic, race-safe, SECURITY DEFINER, service_role only).

**Audit log:** every allocated number is recorded in `document_numbers` table with `ref_table` + `ref_id` back-pointer.

**Legacy numbers preserved:** existing records (pre-2026-04-23) keep their old numbers (`DSIG-2026-0001`, `SOW-2026-0001`) — do NOT backfill.

**Legacy RPCs preserved:** `generate_sow_number()` and `generate_invoice_number()` remain in the DB as fallbacks when no prospect/client_code is present. Do NOT drop them.

**Auto-transitions:**
- SOW `accept` creates an invoice for the deposit amount (`INV-...`), linked via `sow_documents.deposit_invoice_id`
- Invoice `mark-paid` creates a receipt (`RCT-...`), linked via `receipts.invoice_id`
- Partial payments: if `amount_paid_cents < total_due_cents`, invoice status stays `sent` (not flipped to `paid`); a receipt is created for the partial amount. Sum of receipt amounts vs `invoice.total_due_cents` tracks outstanding balance.
- Receipt creation is always best-effort — failures are logged but never fail mark-paid.

**Client code convention:** first 2 letters of each of the first 2 words in business_name, uppercased. E.g. "Hangtown Range & Retail Store" → `HANG`, "South Side MMA" → `SOSI`. Admin can edit on the prospect record (/admin/prospects/[id]).

**Admin UI:**
- `/admin/prospects/[id]` — Client Code card with inline edit + Suggest button
- `/admin/receipts` — Receipts list (Receipt #, Client, Invoice #, Amount, Method, Paid At)
- `/admin/receipts/[id]` — Receipt detail (immutable read-only)
- Admin sidebar Finance group — "Receipts" link added (FileCheck icon)

**EST (quote sessions):** `quote_sessions.doc_number` column added via migration 021a. Number is allocated lazily on prospect-sync (when the session first gets linked to a prospect with a `client_code`). `/admin/quotes/[id]` shows the EST number and a "Continue to SOW" button that pre-populates a new SOW from the EST's `selected_items`. Mapping: `pricing_type → cadence` (one-time/monthly; `both` defaults to one-time).

---

## 21. PDF Pipeline

**Added 2026-04-24. Python dsig_pdf renderer is deprecated.**

### Implementation

PDFs are generated in-repo using **Chromium HTML→PDF** via `puppeteer-core` + `@sparticuz/chromium`. The remote Chromium binary is downloaded at cold-start via `chromium.executablePath('https://...')` (v147 tar URL). No binary is committed to the repo.

**Page format:** Legal portrait (8.5 × 14 in = 612 × 1008 pt), matching the PDF standards spec.

**Renderer files (`src/lib/pdf/`):**
| File | Purpose |
|------|---------|
| `_shared.ts` | Brand tokens, color constants, shared HTML helpers |
| `chromium.ts` | Chromium loader + executablePath resolution |
| `render.ts` | `htmlToPdfBuffer()` — Puppeteer launch + PDF export |
| `sow.ts` | SOW document: cover, scope, investment, signature pages |
| `invoice.ts` | Invoice document: header, line items, totals, payment footer |
| `receipt.ts` | Receipt document: confirmation + payment details |

**next.config.ts requirement:**
```ts
serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium']
```
Without this, Vercel bundles the binary and deployment fails.

**Temp path:** always `/tmp` (not `/var/task` which is read-only).

### Design Authority

**`J:\My Drive\Agentic Agents\CLAUDE\DSIG\DSIG_PDF_STANDARDS_v2.md`** governs colors, typography, layout, and component patterns. This spec was written for Python/ReportLab but applies directly to the HTML/CSS/Chromium pipeline — translate Flowable classes to equivalent HTML structures.

Key tokens from the spec (authoritative — use these, not web CSS vars):
- Slate: `#3D4566` (NOT `#1d2330`)
- Teal: `#52C9A0` (implementation) / `#3ECFAA` (spec)
- Orange: `#F26419` (spec dividers/badges) / `#FF6B2B` (implementation CTAs)
- Helvetica font stack throughout

### API routes

- `GET /api/admin/sow/[id]/pdf` — renders + streams SOW PDF
- `GET /api/admin/invoices/[id]/pdf` — renders + streams invoice PDF
- `GET /api/admin/receipts/[id]/pdf` — renders + streams receipt PDF

### Deprecated Python renderer

`D:\CLAUDE\dsig-pdf-service` — the Python/ReportLab microservice at `pdf.demandsignals.co`. Files in the repo marked `@deprecated`. Not yet deleted (other DSIG client projects, e.g. Southside MMA, may still use it). The design spec in DSIG_PDF_STANDARDS_v2.md still applies to both implementations.

---

## 22. Public Document Pages

**Added 2026-04-24.**

Magic-link pages that clients see when they receive a document. All branded to match the PDF design treatment.

| Route | Purpose |
|-------|---------|
| `/sow/[number]/[uuid]` | Premium proposal microsite — full scope summary + inline Accept form. Accept creates deposit invoice + project + flips is_client. |
| `/invoice/[number]/[uuid]` | Stripe-receipt treatment — invoice details + Pay button (Stripe Payment Link). |
| `/quote/s/[token]` | EST hero — budget estimate summary + next-steps CTAs (book call, accept, view full). |

**Auth model:** UUID suffix is the auth token — no cookie, no login required. URLs are unguessable (UUID v4). Treat the URL itself as the secret.

**Key files:**
- `src/app/sow/[number]/[uuid]/page.tsx`
- `src/app/invoice/[number]/[uuid]/page.tsx`
- `src/app/quote/s/[token]/page.tsx`
