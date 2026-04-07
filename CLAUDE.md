# Demand Signals — Next.js Site — Claude Code Reference

> **Read this entire file before making any changes.** It contains architecture decisions, known issues, credentials, and hard constraints that prevent regressions.

---

## 1. What This Project Is

Next.js 16 rebuild of demandsignals.co — an AI-powered demand generation agency website. Currently staged at **dsig.demandsignals.dev**, will eventually replace the PHP production site at demandsignals.co.

| Item | Value |
|------|-------|
| **Staging URL** | https://dsig.demandsignals.dev |
| **Production URL** | https://demandsignals.co (PHP on Verpex — do NOT touch) |
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
| Blog | MDX via `next-mdx-remote` + `gray-matter` | 141 posts in `src/content/blog/` |
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
│   ├── layout.tsx                    — root layout, Header + Footer + ContactBot
│   ├── page.tsx                      — homepage (assembles all sections)
│   ├── globals.css                   — CSS vars, Tailwind, base styles
│   ├── sitemap.ts                    — sitemap generation
│   ├── robots.ts / manifest.ts
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
│   ├── contact/ portfolio/ privacy/ terms/ accessibility/
│   └── api/                          — contact, subscribe, report-request
│
├── components/
│   ├── layout/                       — Header, Footer (+footer.module.css), MobileMenu, NavDropdown, ContactBot
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
├── content/blog/                     — 141 MDX blog posts
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
    ├── blog.ts                       — MDX blog loader (141 posts, 7 categories)
    ├── api-security.ts               — Rate limiting, CSRF, input validation
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

---

## 11. What Is NOT Done (Open Work)

### High Priority
1. **Roll out Section Theater** to remaining 22 service pages (pilot done on wordpress-development)
2. **301 redirects** — ~552 redirects from old `/locations/[city]/[service]` URLs to new root-level LTPs
3. **DNS cutover** — Vercel domain + Cloudflare + SMTP + GSC + GA4
4. **Google Search Console** — verification pending until DNS cutover to demandsignals.co

### Medium Priority
- [ ] **Mobile menu UX** — currently a simple slide-down; .co uses full-screen overlay with animations
- [ ] **OG image** — `/og-image.png` is placeholder, needs real branded asset
- [ ] **SMTP wiring** — real credentials in Vercel env vars for contact form
- [ ] **Analytics** — GA4 or equivalent (Vercel Analytics installed)
- [ ] **Portfolio page** — needs real client case studies with results data

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

### Generated pages (Python script)
15 service pages were batch-generated using `generate_pages.py` (in repo root). The script is a build artifact — content can be edited directly in the page files. The script can be deleted.

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
