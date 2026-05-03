# Demand Signals — Next.js Site — Claude Code Reference

> **READ FIRST: the DSIG root constitution at `Y:\CLAUDE.md`.** It is the source of truth for memory architecture, file conventions, naming rules, build/run topology (Y:/GitHub/D:\dev\), credential handling, and behavioral defaults. THIS file is a project-scoped supplement — it can ADD to or SPECIALIZE root rules but cannot WEAKEN them. If a project-level rule below conflicts with the root, the root wins; surface the conflict and ask before acting.
>
> **Also read this entire file before making any changes.** It contains architecture decisions, known issues, credentials, and hard constraints that prevent regressions.

**Memory for this project:** the canonical project memory file is `Y:\DSIG\demandsignals-next\MEMORY.md` (in this repo, committed to git) — NOT `Y:\.claude-memory\demandsignals-next\memory\MEMORY.md`. The `/handoff` slash command must update the in-repo MEMORY.md alongside `Y:\.claude-memory\` cross-cutting files; it must NOT create a duplicate at the `.claude-memory\<project>\memory\` path. Sessions discovered violating this on 2026-05-04 — see root `Y:\.claude-memory\decisions.md` for the canonical resolution.

**For everything else** — runbooks, specs, plans, history — see [`docs/INDEX.md`](docs/INDEX.md).

---

## 1. What This Project Is

Next.js 16 rebuild of demandsignals.co — an AI-powered demand generation agency website. Live in production.

| Item | Value |
|------|-------|
| **Production URL** | https://demandsignals.co |
| **Staging URL** | https://dsig.demandsignals.dev (legacy; migration to `preview.demandsignals.co` deferred per §29) |
| **Y: working state (canonical)** | `Y:\DSIG\demandsignals-next` (multi-workstation; all sessions open here) |
| **D:\\dev (per workstation, optional)** | `D:\dev\demandsignals-next` (build/run loop; only when hot-reload needed) |
| **GitHub repo** | `demand-signals/demandsignals-next` |
| **Branch** | `master` |
| **Vercel project** | `demandsignals-next` — auto-deploys on push to master |
| **Owner** | Hunter — Managing Director @ Demand Signals |

---

## 2. Tech Stack

This project inherits all DSIG defaults from root `Y:\CLAUDE.md` §2 (Next.js App Router, TypeScript strict, Tailwind only, Supabase, Cloudflare R2, Resend, Twilio, Anthropic API, PostHog, Leaflet). The table below records project-specific versions and deviations only.

| Layer | Tech | Notes |
|-------|------|-------|
| Framework | Next.js 16.2.2 (App Router) | Read `node_modules/next/dist/docs/` for API changes |
| React | 19.2.4 | |
| Language | TypeScript (strict) | Zero TS errors required before push |
| Styling | Tailwind v4 + CSS Modules for layout | Deviation from root §2 (Tailwind only) — CSS Modules used for layout grids; documented and accepted |
| Animation | Framer Motion | |
| Maps | Leaflet + react-leaflet + OpenStreetMap | Prospect detail map, no API key (per root §2) |
| Blog | MDX via `next-mdx-remote` + `gray-matter` | 145 posts in `src/content/blog/` |
| Email (outbound) | **Resend** (per root §2 + memory) | Migrated from nodemailer 2026-04-27. SMTP forbidden. |
| SMS | Twilio | 5 dispatchers gated by kill switches (§23) |
| Calendar | Google Calendar API v3 | OAuth via dated env names (§23). Native booking UI on-site, no external Appointment Schedules link (§29). |
| File storage | Cloudflare R2 (S3-compatible) | Two buckets: public (`assets.demandsignals.co`) + private. Helper at `src/lib/r2-storage.ts`. |
| PDF generation | puppeteer-core + @sparticuz/chromium | Legal portrait per `dsig-pdf-standards`. Remote Chromium binary via `chromium.executablePath('https://...')`. |
| Sitemap | `next-sitemap` | |
| UI primitives | shadcn (base-ui), lucide-react | |
| Deployment | Vercel (auto-deploy on push to master) | |
| Dev server (when hot-reload needed) | `npm run dev` from `D:\dev\demandsignals-next` only | Per root §5 — SMB watchers don't fire reliably. Localhost runs aren't useful for OAuth-dependent features (Google Calendar, Stripe webhooks); test those against the deployed staging URL instead. |

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

**Per root constitution §4 (v2c) — credential VALUES never appear in any markdown file, including this one.** All workstation-wide tokens auto-load from `Y:\.credentials\dsig.env` at every Claude Code SessionStart via `Y:\SCRIPTS\load-dsig-env.ps1`. CLIs (`gh`, `vercel`, `wrangler`, `supabase`, etc.) read these env vars natively. No manual paste, no `PROJECT.md` token storage.

**For this project, the env vars actually used are:**

| Env var (loaded from `Y:\.credentials\dsig.env`) | What it's for |
|---|---|
| `GH_TOKEN` | `git push` to `demand-signals/demandsignals-next` |
| `VERCEL_TOKEN` | Vercel CLI ops, env var management |
| `ANTHROPIC_API_KEY` | Claude API (quote AI, agents, content generation) |
| `RESEND_API_KEY` | Outbound email (per root §2) |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | R2 buckets, DNS |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI (migrations, project mgmt) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | SMS dispatch (§23) |

**Project-specific Vercel identifiers (not secrets — IDs only):**
- **Team ID:** `team_jPyeNYJSdDRpqSdsw3WD3AiQ`
- **Project ID:** `prj_MOFD7RLAS1tVLG1yLlt0kIZwPQrp`

**Vercel env vars set in the platform** (Tier 1 per root §4) — read from Vercel dashboard, never duplicated here:
- App secrets: Stripe keys (live + test), Resend webhook secret, Supabase service role, Anthropic, Twilio, Google Calendar OAuth (`GOOGLE_DSIG_MAIN_ID_042826` + `_SECRET_042826` per §23 dated-name pattern), `BOOKING_SLOT_SECRET`, `ATTRIBUTION_COOKIE_SECRET`, `CRON_SECRET`
- Locations: Vercel project `demandsignals-next` → Settings → Environment Variables

**Reference public-facing values** (not secrets):
- **Contact email:** `DemandSignals@gmail.com` (root §2 — inbound + human comms)
- **Phone:** `(916) 542-2423`
- **Logo:** `https://assets.demandsignals.co/logos/dsig_logo_v2b.png` (R2 public bucket)
- **Booking:** native on-site `/book` page (per §29 — no external Google Appointment Schedules link)

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
- [x] **Stripe Plan A** (magic-link Pay button + activation): public invoice API exposes `stripe_enabled` flag; `/invoice/[number]/[uuid]` Pay button always renders for outstanding cash invoices when Stripe is enabled, points at `/api/invoices/public/[number]/pay` redirect (lazily creates Payment Link); `ensurePaymentLink()` sets `setup_future_usage='off_session'` so cards are saved on customer for re-use; `markInvoicePaidFromStripe()` supports partial payments + auto-issues RCT receipts via new `createReceiptForInvoice()` helper; webhook handler extracts amount data from event payloads.
- [x] **Stripe Plan B** (payment plans + SOW conversion): migrations 025a/b/d/e add `payment_schedules` + `payment_installments` tables, `sow_documents.parent_sow_id`, `invoices.payment_installment_id`, extends `receipts.payment_method` enum to include 'tik'. New `src/lib/payment-plan-types.ts` + `src/lib/payment-plans.ts` orchestrator: `convertSowToProject` runs full lifecycle (project + prospect.is_client + payment plan + TIK + Stripe subs), `firePaymentInstallment` (cash → invoice + Payment Link, TIK → ledger), `markInstallmentPaid` (handles partials, locks schedule on first paid), `cascadeOnPayment` (fires `on_completion_of_payment` dependents). Trigger types: `on_acceptance`, `time`, `milestone`, `on_completion_of_payment`. Currency types: `cash` + `tik`. Backfill mode (`already_paid` flag per row) for historical clients. New endpoints: `POST /api/admin/sow/[id]/convert`, `POST /api/admin/sow/[id]/change-order` (mini-SOW with parent_sow_id), `POST /api/admin/trade-credits/[id]/drawdown` (overage handling + auto RCT receipt with `payment_method='tik'`), `GET /api/admin/projects/[id]/obligations`, `GET/PATCH /api/admin/payment-schedules/[id]`. New cron `GET /api/cron/payment-triggers` (daily 13:00 UTC, fires time-triggered installments). Phase-complete endpoint extended to fire milestone-triggered installments. Webhook extended to call `markInstallmentPaid` → cascade. Public `/api/sow/public/[number]/accept` left on simple deposit-only path with divergence note. New admin pages: `/admin/payment-schedules/[id]`, project Outstanding Obligations panel. Always-visible Convert button on SOW detail page (`ConvertButton.tsx` + `ConvertModal.tsx` with payment-plan builder, presets, sum-check, TIK section, subscription rows).
- [x] **Stripe Plan C** (subscriptions + caps + pause): migration 025c adds `subscriptions.cycle_cap` + `paused_until`. New `src/lib/stripe-subscriptions.ts` helpers: `createStripeSubscription` (sets `trial_end` for future starts, `cancel_at` for capped terms, `setup_future_usage` via `payment_settings.save_default_payment_method='on_subscription'`), `pauseStripeSubscription`, `resumeStripeSubscription`, `createCustomerPortalSession`, `computeEndDate`. `convertSowToProject` wires real Stripe subscription creation per spec row (with `already_activated` backfill skipping Stripe call). New endpoints: `POST /api/admin/subscriptions/[id]/pause` (Stripe `pause_collection` + push end_date by duration_days), `POST /api/admin/subscriptions/[id]/resume`, `POST /api/admin/subscriptions/[id]/customer-portal` (Stripe Customer Portal session URL, used to send "Add Payment Method" magic link to client for future-start subscriptions). Webhook handles `customer.subscription.paused` + `customer.subscription.resumed`. Subscription detail page gains `SubscriptionActionPanel` (Pause/Resume + cycle remaining + portal link generator).
- [x] **Resend SDK swap + email/page tracking** (Project #1 of 3 in messaging sequence): All 6 nodemailer call sites (invoice-email, contact, subscribe, report-request, weekly-report, quote-notify) migrated to a single `sendEmail()` helper at `src/lib/email.ts` backed by Resend with SMTP fallback. Per-purpose `from` aliases on `demandsignals.co` (invoices@, noreply@, news@, reports@, alerts@). Three new tables: `system_notifications` (subsystem failure log + alert pipeline with 60s throttle), `email_engagement` (every send + Resend webhook events delivered/opened/clicked/bounced/complained, idempotent via UNIQUE constraint), `page_visits` (every magic-link page view with three-layer attribution: UUID > signed JWT cookie > IP+UA). Resend webhook handler at `/api/webhooks/resend` verifies Svix signatures. Magic-link pages (invoice/sow/quote) log visits via `logPageVisit()` and promote `dsig_attr` cookie when UUID resolves a prospect. New libs: `system-alerts.ts`, `email-engagement.ts`, `attribution-cookie.ts` (jose HS256 JWT), `page-tracking.ts`, `email.ts`. Migrations 026/027/028. Required env vars: `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `ATTRIBUTION_COOKIE_SECRET`. Optional: `ALERT_EMAIL`, `ARCHIVE_BCC` (both default to `DemandSignals@gmail.com`). Spec: `docs/superpowers/specs/2026-04-27-resend-email-swap-design.md`. Plan: `docs/superpowers/plans/2026-04-27-resend-email-tracking-plan.md`.
- [x] **Existing-client match during research** (added 2026-04-29): Returning prospect at `/quote` now silently links to existing prospects row — no duplicate created. Migration 034 adds `quote_sessions.matched_prospect_id` + `matched_phone_last_four`. New `src/lib/quote-existing-match.ts` runs read-only 3-tier match (phone E.164 → website host → name+city) after Google Places research. AI asks last-4 confirmation question with strict no-account-state directive. `syncProspectFromSession` honors `matched_prospect_id` before fuzzy fallback. Verification script at `scripts/verify-quote-existing-client.mjs`. Spec: `docs/superpowers/specs/2026-04-29-quote-existing-client-match-design.md`.
- [x] **Quote → booked meeting (real Google Calendar + Meet + SMS)** (added 2026-04-29): Replaces the fake "team will call" closing of `/quote` with real Calendar events. Migration 035 adds `integrations` + `bookings` tables. Three new AI tools: `capture_attendee_email`, `offer_meeting_slots`, `book_meeting`. Booking lifecycle includes prospect confirmation SMS, admin notification SMS, 24h + 1h reminder cron, admin cancel SMS. Right-pane CTA flips to MeetingConfirmedPanel after booking. Admin prospect record gets BookingCard + LatestQuotePanel + Quotes (EST) sub-section. Activity log cleaned up — verb-only rows ("Started new quote", "Phone verified", "Email captured", "Booked meeting"), `item_changed` noise dropped. Continue-to-SOW broken column fixed. New env vars: `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `BOOKING_SLOT_SECRET`. See §23. Spec: `docs/superpowers/specs/2026-04-29-quote-to-booked-meeting-design.md`. Plan: `docs/superpowers/plans/2026-04-29-quote-to-booked-meeting-plan.md`.

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
- [ ] **Public `/book` page** — native on-site booking UI (per §29 architectural decision: no external Google Appointment Schedules link, ever). Foundation laid in §23 booking system: `bookings.source='public_book'` is a valid value, `bookSlot()` is the single entry point. Availability is fetched via Google Calendar API (`listAvailableSlots`); bookings are pushed via Google Calendar API (`bookSlot`) — both server-side, no client-facing Google URL. What remains: non-AI form UI for slot selection, CAPTCHA + rate limit (unauth surface), small intake form to populate `bookings.context_for_summary`. Estimated half-day on top of the booking foundation.
- [ ] **Calendar webhook for prospect-side declines** — when a prospect declines via the Google invite email, today the platform doesn't know (soft drift between Google's record and ours). Add a Calendar push notification webhook that syncs `bookings.status` when the event flips on Google's side.
- [ ] **Multi-host scheduling** — `bookings.host_email` already supports it. Wire to a `team_members` table when the team grows beyond Hunter solo.
- [ ] **Quote AI booking smoke verification** — exercise the full flow end-to-end with a real prospect and confirm: AI asks email, AI offers two slots, book_meeting fires, calendar event lands, prospect invite arrives, SMS confirmations send (if phone resolved), reminders fire 24h + 1h ahead, admin BookingCard + LatestQuotePanel surface correctly. (As of 2026-04-29 the code is shipped, env vars are configured, OAuth is connected — remaining: live test.)

### High Priority — Site
1. **301 redirects from PHP site** — old .co URLs are Google-indexed; redirects needed for SEO continuity post-cutover
2. **Roll out Section Theater** to remaining 22 service pages (pilot done on wordpress-development)
3. **Google Search Console** — DNS TXT record in Cloudflare for verification

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
**Solution:** `GH_TOKEN` is auto-loaded from `Y:\.credentials\dsig.env` at SessionStart (per §4 + root §4 v2c). `git push` and `gh` CLI both read it natively — no prompt, no manual base64 trick needed.
**Token note:** The `GH_TOKEN` value in `dsig.env` must be either an OAuth token (`gho_...`) or a fine-grained PAT (`github_pat_...`) with the right scopes. Fine-grained PATs historically returned 403 on raw `git push` over HTTPS in some configurations — if push fails with 403 despite the token being valid for `gh api`, swap to an OAuth token in `dsig.env` and retry. This is a known footgun, not a project bug.

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

### psql meta-commands fail in the Supabase web SQL Editor
**Problem:** `\echo` and `\i` (and other backslash commands) throw `syntax error at or near "\"` when pasted into the Supabase web SQL Editor. Older `APPLY-NNN-*.sql` files in this repo were written for the `psql` CLI, where those work fine. Hunter applies migrations via the web editor, so the wrappers fail.
**Solution:** APPLY wrapper files going forward MUST inline the SQL content directly (don't `\i` other files). Web editor + psql CLI both run inlined SQL fine; only `\i` and `\echo` are CLI-only. As of 2026-04-29, `APPLY-036-2026-04-29.sql` is the new pattern — fully inlined, web-editor-safe. Older APPLY files remain unchanged but require running each individual `NNNa_*.sql` file separately in the web editor (or run via psql).

### Chromium on Vercel (serverless PDF)
**Problem:** `puppeteer-core` + `@sparticuz/chromium` will fail to bundle if not externalized. Also, `/var/task` is read-only in the Vercel runtime.
**Solution:** Add `['puppeteer-core', '@sparticuz/chromium']` to `serverExternalPackages` in `next.config.ts`. Write any temp files to `/tmp` (writable). Use the remote binary URL in `chromium.executablePath('https://...')` for v147+; do NOT vendor the binary in the repo.

### zod v4 rename
**Problem:** Zod v4 renamed `e.errors` → `e.issues` on `ZodError`. Old code catches a `ZodError` but reads `.errors` and gets `undefined`.
**Solution:** Use `e.issues` in all catch blocks when handling `ZodError`. Search for `.errors` on caught `ZodError` references and update.

### Serverless write-only path
**Problem:** Attempting to write temp files to `/var/task` on Vercel throws EROFS (read-only filesystem).
**Solution:** Always use `/tmp` for any transient file writes in API routes (e.g., Chromium temp profile, downloaded logo). `/tmp` is writable and ephemeral in the serverless context.

### JSONB kill-switch reads return native types
**Problem:** `quote_config.value` is JSONB. PostgREST returns native JS types — JSONB boolean `true` deserializes to JS boolean `true`, NOT string `'true'`. Naive `data?.value === 'true'` fails for every flag stored as a native boolean. Symptom: every kill switch silently returns `false` even though the DB shows `true`. Discovered when SMS dispatch on `/api/contact` was blocked by `isSmsEnabled()` even though `sms_delivery_enabled = true` in `quote_config`.
**Solution:** All `quote_config.value` reads for boolean flags must accept both formats:
```ts
return data?.value === true || data?.value === 'true'
```
The `/api/admin/config` PATCH path (commit `9e0784d`) coerces incoming `'true'`/`'false'` strings to native JS booleans before upserting, so future writes are canonical JSONB booleans. Mixed-format legacy rows continue to work because readers tolerate both.

### Empty initial query result during deploy lag
**Problem:** Running diagnostic SQL right after a code change that should write rows can return zero results — even though the new code was deployed and triggered. Cause: the test action ran against an OLD Vercel deploy that hadn't picked up the new code yet, OR the query ran before the row was inserted.
**Solution:** Always confirm the Vercel deploy SHA matches your latest commit BEFORE running a "did the new code run?" diagnostic. Easy check: `curl -s -o /dev/null -D - https://demandsignals.co | grep -i "x-vercel-id"` and compare.

### Generic OAuth env var names alias to the wrong client (resolved 2026-04-29 by retiring generic names)
**Problem (recurring, twice):** Generic env var names like `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` collide with other OAuth clients across the Vercel project. Symptoms include `Error 400: redirect_uri_mismatch` (when the wrong client is paired with our redirect URI) and silent `calendar_disconnected` failures (when refresh-token redemption returns invalid_client). First incident: generic name held `219907120133-uu2u...` instead of DSIG Main (`995295804425-tm28...`). Second incident: generic name was correct in Vercel but the dated name was missing, so code threw "not configured" before any token call.
**Permanent fix (2026-04-29):** Calendar code in `src/lib/google-oauth.ts` reads ONLY `GOOGLE_DSIG_MAIN_ID_042826` and `GOOGLE_DSIG_MAIN_SECRET_042826`. Generic `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are NOT consulted at all — even as a fallback. The dated, purpose-specific name is the single source of truth for the Calendar integration. Other future integrations should follow the same pattern (`<APP>_<PURPOSE>_<DATE>`) rather than generic names.
**Diagnostic endpoint:** `GET /api/integrations/google/debug` (admin-gated) reports which env vars are populated, what the runtime would actually use, and whether the client_id matches DSIG Main's prefix. Hit this BEFORE re-asking the user to verify config.
**Lesson:** Generic env var names aren't safe in a multi-OAuth-client project. Use dated, purpose-specific names (`<APP>_<PURPOSE>_<DATE>`) and read them exclusively. Never rely on a generic name to "probably hold the right thing."

### Always check CODE before blaming credentials
**Problem:** Repeated wasted-hours debugging cycles where the assistant defaults to "let me have you re-verify the credential" instead of inspecting the code that consumes the credential. The user has flagged this multiple times explicitly.
**Solution:** When something fails AFTER the user confirmed config is correct: assume the code is wrong. Read the code path end-to-end. Build a debug endpoint that returns literal runtime values if needed. Stop asking for repeat config verification. The user is not going to be wrong about something they've already verified twice.

### Chrome strips Origin on header-light same-origin POSTs (resolved 2026-05-01)
**Problem:** `fetch('/api/admin/...', { method: 'POST' })` with no body and no `Content-Type` header omits the `Origin` request header in Chrome. The CSRF guard at `requireAdmin()` (and `adminOriginCheck()`) was Origin-only and rejected those requests with `Forbidden — origin required`. Six "Send invoice" / "Send email" / etc. buttons on the invoice detail page were broken because of this.
**Two-part fix:**
1. Caller side — `src/app/admin/invoices/[id]/page.tsx`: added `headers: { 'Content-Type': 'application/json' }` to all six bare POSTs. With a header attached, Chrome includes Origin again. Match this pattern in any new admin POST.
2. Guard side — `src/lib/admin-auth.ts` and `src/lib/api-security.ts`: tiered check. If `Origin` is present, exact-match against `ALLOWED_ORIGINS` as before. If `Origin` is absent, accept `Sec-Fetch-Site: same-origin` or `none` as proof of CSRF-safety. `Sec-Fetch-Site` is a Fetch-Metadata "forbidden" header — JS can't set it, browser writes it after the fetch leaves the page. Cross-origin attackers cannot forge it.
**Don't remove the `Sec-Fetch-Site` fallback** without first restoring header-bearing-fetch conventions across every admin caller. The fallback is what keeps the system robust against a single forgotten header on a future admin button.

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
# Dev server (only when hot-reload needed; OAuth-dependent features won't
# work on localhost — test those against staging instead)
cd "D:\dev\demandsignals-next"
npm run dev

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

# Booking integration (Google Calendar) — added 2026-04-29, dated names locked 2026-04-29
# Calendar code (src/lib/google-oauth.ts) reads ONLY the dated env var
# names below. Generic GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are
# intentionally NOT consulted by Calendar — they had been aliased to the
# wrong OAuth client twice, causing silent calendar_disconnected
# failures (see §12). Dated names are the single source of truth for
# the Calendar integration.
#
# Both dated env vars must point at the DSIG Main OAuth client (Web
# application, GCP project demand-signals-489406, prefix 995295804425-tm28).
# DSIG Main has https://demandsignals.co/api/integrations/google/callback
# registered as an authorized redirect URI. Supabase Auth (admin login)
# uses separate config in the Supabase dashboard — independent of these.
#
# Rotation: bump the date suffix on these env var names, set the new
# secret in Vercel, deploy code referencing the new suffix, then drop
# the old suffix from Vercel + GCP.
GOOGLE_DSIG_MAIN_ID_042826=<DSIG Main OAuth client ID — 995295804425-tm28...>
GOOGLE_DSIG_MAIN_SECRET_042826=<DSIG Main OAuth client secret>
GOOGLE_OAUTH_REDIRECT_URI=https://demandsignals.co/api/integrations/google/callback
BOOKING_SLOT_SECRET=<32-byte hex for HMAC-signing slot ids>
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
| `preview.demandsignals.co` | Reserved for DSIG's own site staging. **Not yet used** — current staging still runs on `dsig.demandsignals.dev`. Migration deferred per §29. | reserved |
| `*.demos.demandsignals.co` | Per-client demo sandboxes. `[client-code].demos.demandsignals.co`. AI-generated pitch sites. | 30–90 days (throwaway) |
| `*.staging.demandsignals.co` | Per-client project staging. `[client-code].staging.demandsignals.co`. Real production builds pre-launch. | weeks to months |
| `assets.demandsignals.co` | R2 public bucket — CDN-backed static assets (marketing, media, logos, public project galleries) | permanent |
| `[clientdomain].com` | Client's live site. Same Vercel project as `[client-code].staging.demandsignals.co`, promoted via domain alias + env var change. | permanent (post-launch) |
| `demandsignals.dev` | **Retired 2026-04-27.** Historical demos remain reachable until DNS cut; no new demos use this domain; tracking-blind. | wind-down |
| `demandsignals.us` | **Retired 2026-04-27.** Historical demos remain reachable until DNS cut; tracking-blind. | wind-down |

### Reconciliation note (updated 2026-04-27)

Final decision: `[client_code].demos.demandsignals.co` is the canonical
demo-site URL going forward. `demandsignals.dev` and `demandsignals.us` are
being retired.

- **Canonical pattern:** `[client_code].demos.demandsignals.co` where
  `client_code` is the 4-letter prospect code (per §20). Examples:
  `hang.demos.demandsignals.co`, `mome.demos.demandsignals.co`,
  `sosi.demos.demandsignals.co`. (DNS is case-insensitive; `client_code`
  in the DB stays uppercase, the URL renders lowercase.)
- **`demandsignals.dev`:** historical demos remain reachable until DNS is
  cut. No new demos use this domain. Tracking on these legacy demos is
  blind by design — accepted gap.
- **`demandsignals.us`:** retired. Same blind-tracking acceptance.
- **Tracking on canonical demos:** every page on
  `[client_code].demos.demandsignals.co` beacons engagement events to
  `https://demandsignals.co/api/track/beacon` so all visits flow into the
  unified `page_visits` table keyed to the prospect via `client_code`.
  (Beacon implementation lives in the demo-sites repo; see Project #1.5
  Universal Engagement Tracking spec.)
- **`smma.demandsignals.dev` exception** still applies — Hunter assigned
  this domain directly to a per-client production Vercel project, not the
  `demo-sites` project. The exception persists until the client moves to
  their owned domain.

Operational fix path for the `.demos.demandsignals.co` DNS (still pending
until executed): add a `CNAME *.demos → vercel-target` at Cloudflare and
switch Vercel's domain mode to external DNS. Tracker:
`D:\CLAUDE\demo-sites\docs\DNS_STATUS.md`.

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

---

## 23. Booking System (Quote → Real Calendar Meeting)

**Added 2026-04-29.** Replaces the fake "team will call you" closing of `/quote` with real Google Calendar events + Meet links + prospect invite emails + SMS confirmations and reminders.

**Architecture:**

OAuth web-app flow against `DSIG Main` GCP client connects `demandsignals@gmail.com` once via `/admin/integrations/google`. Refresh token persisted in `integrations` table. Three new AI tools drive the booking flow: `capture_attendee_email`, `offer_meeting_slots`, `book_meeting`. Bookings persist in `bookings` table — canonical record for every meeting. Same primitives will power a future public `/book` page.

**Tables (migration 035):**

| Table | Purpose |
|---|---|
| `integrations` | OAuth refresh tokens (provider, account_email). `provider='google_calendar'` today. UNIQUE(provider, account_email). |
| `bookings` | Canonical meeting record. `source` ∈ {quote, public_book, admin_manual}. Holds `google_event_id`, `google_meet_link`, `attendee_phone` (E.164 if available), `reminder_24h_sent_at`, `reminder_1h_sent_at`, `status`. |

`quote_sessions` extended with `booking_id` (FK), `attendee_email`, `offered_slot_ids` (jsonb). `quote_config` seeds `booking_reminders_enabled=true`.

**OAuth client config:**

Calendar integration uses the `DSIG Main` OAuth client (Web application, GCP project `demand-signals-489406`, client ID prefix `995295804425-tm28`). The authorized redirect URI registered on this client is `https://demandsignals.co/api/integrations/google/callback` — the value MUST match exactly what Vercel's `GOOGLE_OAUTH_REDIRECT_URI` env var holds.

Supabase Auth (the `/admin-login` Google sign-in) configures its OAuth client INSIDE the Supabase dashboard (Authentication → Providers → Google), not via Vercel env vars. There is no env-var collision between Calendar and Supabase Auth.

**Key files:**

| File | Purpose |
|---|---|
| `src/lib/slot-signing.ts` | HMAC-sign + verify slot ids (prevents prompt-injection from fabricating arbitrary booking timestamps). Requires `BOOKING_SLOT_SECRET`. |
| `src/lib/google-oauth.ts` | OAuth dance + access-token refresh. Reads `GOOGLE_DSIG_MAIN_ID_042826` + `GOOGLE_DSIG_MAIN_SECRET_042826` exclusively — generic `GOOGLE_CLIENT_*` names are NOT consulted (see §12 collision history). |
| `src/lib/google-calendar.ts` | Calendar API v3 wrapper: `getAvailableSlots` (freebusy + 14-day walk, business-hours filter), `createMeetingEvent` (with Meet link), `cancelMeetingEvent`, `rescheduleMeetingEvent`. Raw fetch — no client lib. |
| `src/lib/bookings.ts` | Public API: `listAvailableSlots`, `bookSlot`, `cancelBooking`, `rescheduleBooking`. Resolves attendee_phone, fires confirmation SMS, writes canonical "Booked meeting" activity row. |
| `src/lib/booking-sms.ts` | 5 SMS dispatchers: prospect confirmation, admin notification, 24h reminder, 1h reminder, admin cancellation. Honors `sms_delivery_enabled` + `booking_reminders_enabled` kill switches. |
| `src/lib/quote-tools.ts` | New tool handlers: `capture_attendee_email`, `offer_meeting_slots`, `book_meeting`. |
| `src/lib/quote-ai.ts` | Tool defs + system-prompt "BOOKING A MEETING — REAL CALENDAR FLOW" directive that forbids legacy "team will call" closings without book_meeting=ok=true. |
| `src/app/api/integrations/google/{start,callback,test,disconnect,debug}/route.ts` | OAuth flow + admin-gated diagnostics. |
| `src/app/admin/integrations/google/page.tsx` | Connect / Test / Disconnect UI. |
| `src/app/api/admin/integrations/google/status/route.ts` | Connection state for the admin page. |
| `src/app/api/admin/bookings/[id]/{cancel,reschedule}/route.ts` + `available-slots/route.ts` | Admin booking ops. |
| `src/app/api/cron/booking-reminders/route.ts` | Vercel cron, every 5 min, fires 24h + 1h reminders with per-row dedup. |
| `src/components/admin/{BookingCard,RescheduleModal,LatestQuotePanel}.tsx` | Prospect-record surfacing. |
| `src/components/quote/MeetingConfirmedPanel.tsx` | Right-pane CTA replacement when booking exists. |
| `scripts/verify-booking-roundtrip.mjs` | E2E verification: refresh-token → create event → insert row → cancel → cleanup. |

**Activity log cleanup (concurrent change):** `quote-prospect-sync.ts` now writes activity rows ONLY for: `research_confirmed` ("Started new quote"), `phone_verified`, `email_captured`, `walkaway_flagged`. `item_changed` and `conversion_action='book_call'` no longer write activity rows. The canonical "Booked meeting" row is written by `bookSlot()` directly with the real time + meet link.

**Continue-to-SOW fix (concurrent change):** `/api/admin/quotes/[id]/continue-to-sow` was returning "Quote session not found" because its SELECT included `quote_sessions.scope_summary` (column doesn't exist — lives on `prospects`). Fixed: drop bad column, pull scope_summary from prospect record.

**Critical operational notes:**

- The `/admin/integrations/google` Connect flow requires the admin to be signed into `demandsignals@gmail.com` in their browser. Sign in to the right Google account before clicking Connect.
- The first connection requires `prompt=consent` to get a refresh token. Subsequent reconnects also force consent (in case the refresh token was revoked).
- If a refresh token is rejected (admin revoked access externally), `getValidAccessToken()` marks the integration row `revoked_at` and the admin page shows a Reconnect banner.
- `BOOKING_SLOT_SECRET` rotation: rotate by setting a new value, redeploying. In-flight slot ids signed with the old secret will return `invalid_slot` — slots are short-lived (offered then booked within minutes), so the rotation impact window is tiny.
- Vercel cron entry: `{ "path": "/api/cron/booking-reminders", "schedule": "*/5 * * * *" }` in `vercel.json`. Auth via `Authorization: Bearer ${CRON_SECRET}`.

**Out of scope (deferred, see spec):**

- Public `/book` page UI (foundation laid; `bookings.source='public_book'` + `bookSlot()` API both ready).
- Calendar webhook to sync prospect-side declines (today: admin notices on next dashboard load).
- Multi-host scheduling (today: every booking on `demandsignals@gmail.com`; `bookings.host_email` makes this a one-line change).

## 29. Booking architecture — native on-site, never external (2026-05-01)

**Hard rule: DSIG never sends visitors, prospects, or clients to an external Google Appointment Schedules link.** All booking happens on demandsignals.co (or, for retired URLs, a redirect lands the visitor on demandsignals.co/book).

**Architecture:**
- **Availability** is fetched from Google Calendar via API (`google.calendar.v3.freebusy.query` + custom slotting in `src/lib/bookings.ts:listAvailableSlots`). Returned as HMAC-signed slot ids per §23 (prevents prompt-injection fabrication).
- **Bookings** are created via Google Calendar API (`google.calendar.v3.events.insert` wrapped by `bookSlot()`), generating the Meet link, persisting to `bookings` table, dispatching SMS confirmations.
- **No client-side Google URL** is ever exposed in the UI. The visitor sees a DSIG-branded form on demandsignals.co; under the hood it's making the same Google API calls our admin does.

**What this replaces:** the prior `https://calendar.google.com/calendar/u/0/appointments/schedules/...` link in §4 footer, in marketing CTAs, and in the `/quote` AI's fallback. All of those are now removed or routed to `/book`.

**Why this is normative:** branded experience, full attribution (we own the page-visit data, not Google), conversion tracking via our `page_visits` table, future-proofs against Google changing their Appointment Schedules UI/URL.

**Implementation status:** §23 booking system is live for the `/quote` AI flow. The public `/book` page UI is the only remaining piece (see open work above). Until shipped, the only place a booking can happen is via the AI quote conversation — which is fine; there is currently NO public booking link anywhere on the site.

---

**Project CLAUDE.md update — 2026-05-01:** Aligned to root constitution v2c. §1 header table updated (production live, Y: as canonical working state with D:\dev\ as per-workstation build/run loop). §2 tech stack now references root §2 defaults instead of duplicating; nodemailer line removed (Resend only per root §2 + memory); localhost dev server qualified (only when needed; OAuth-dependent features won't work locally). §4 credentials section restructured to comply with root §4 v1g (no token references in markdown; env vars auto-load from `Y:\.credentials\dsig.env` via SessionStart hook). Cookbook path updated from `D:\CLAUDE\` to `D:\dev\`. `preview.demandsignals.co` flagged as reserved-not-yet-used. SMTP wiring item removed from open work (contradicts Resend-only). DNS-cutover-in-progress wording removed (cutover complete). Added §29 codifying native-on-site booking architecture.
