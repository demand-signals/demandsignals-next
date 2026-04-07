# URL Restructure: County Hubs → City Hubs → Root-Level LTPs

## Context
Restructuring location pages from `/locations/{city}/{service}` to a three-tier SEO-optimized hierarchy. LTPs move to root level for maximum search juice. County hubs added as new tier. City hubs nest under counties. All old URLs get 301 redirects.

## New URL Structure
| Page Type | URL Pattern | Example | Count |
|-----------|-------------|---------|-------|
| County Hub | `/locations/{county}-county` | `/locations/el-dorado-county` | 5 |
| City Hub | `/locations/{county}-county/{city}` | `/locations/el-dorado-county/el-dorado-hills` | 23 |
| LTP (core) | `/{city}-{service}` | `/el-dorado-hills-local-seo` | 529 |
| LTP (alias) | `/{city}-{alias}` | `/el-dorado-hills-web-developer` | 46+ |

**Why `-county` suffix**: Disambiguates counties from cities/areas. "El Dorado" is both a county and an unincorporated area. "Sacramento" is both a county and a city. Adding `-county` makes intent clear.

**Why `/locations/` prefix for hubs**: These are navigation/authority pages, not primary search targets. The prefix provides clean routing and prevents collisions. LTPs (the money pages) are already at root level — that's where SEO matters.

## Workflow: Templates First, Then Buildout
1. Build data layer (counties.ts, city-service-slugs.ts, update cities.ts stats)
2. Build **1 example of each page type** for approval:
   - County Hub: `/locations/el-dorado-county`
   - City Hub: `/locations/el-dorado-county/el-dorado-hills`
   - LTP: `/el-dorado-hills-local-seo`
3. Hunter reviews and approves each template
4. Generate all remaining pages from approved templates
5. Wire up redirects, sitemap, internal links

## Phase 1: Data Layer (build stays clean, no route changes)

### 1a. Create `src/lib/counties.ts`
- Extract `COUNTIES_RAW` from locations/page.tsx into shared module
- County slugs with `-county`: `el-dorado-county`, `sacramento-county`, `placer-county`, `amador-county`, `nevada-county`
- Exports: `COUNTIES`, `COUNTY_SLUGS`, `getCountyBySlug()`, `getCountyForCity()`
- **NO median income stats** — use business count, top industries, growth rate

### 1b. Update `src/lib/cities.ts`
- Remove all `median household income` stats from every city
- Replace with: `2,400+ local businesses`, `+12% business growth`, etc.
- Update heroSubtitle/description text that references income
- Add fields: `businessCount`, `growthRate`

### 1c. Create `src/lib/city-service-slugs.ts`
- Pre-built lookup table: `el-dorado-hills-local-seo` → `{ citySlug: 'el-dorado-hills', serviceSlug: 'local-seo' }`
- Alias entries: `{city}-web-developer` → wordpress-development, `{city}-websites` → wordpress-development
- Cannot split on hyphens (both sides have hyphens), so lookup is required
- Exports: `ALL_CITY_SERVICE_SLUGS`, `getCityServiceBySlug()`

### 1d. Update `src/lib/services.ts`
- Add FAQ templates with "best", "near me", "top" natural keyword density
- Service names in page content use highest-keyword-intent phrasing:
  - NOT "WordPress in El Dorado Hills"
  - YES "WordPress Developer El Dorado Hills" / "Best WordPress Developer Near El Dorado Hills"
- Add `searchIntentName` field per service for natural keyword phrasing:
  - wordpress-development → "WordPress Developer"
  - react-next-webapps → "Web App Developer"
  - local-seo → "Local SEO Expert"
  - design → "Website Designer"
  - hosting → "Web Hosting Provider"
  - etc.

## Phase 2: Build 3 Example Pages

### 2a. County Hub — `/locations/el-dorado-county`
- Route: `src/app/locations/[county]/page.tsx`
- `generateStaticParams` returns 5 county slugs
- Sections: Hero → Stats (business-focused, NO income) → City Cards Grid → Services Overview → FAQ → CTA

### 2b. City Hub — `/locations/el-dorado-county/el-dorado-hills`
- Route: `src/app/locations/[county]/[city]/page.tsx`
- Adapted from current `[city]/page.tsx`
- Service cards link to `/{city}-{service}` root-level LTPs
- Uses `searchIntentName` for card titles ("WordPress Developer in El Dorado Hills")
- Breadcrumb: Home > Locations > El Dorado County > El Dorado Hills

### 2c. LTP — `/el-dorado-hills-local-seo`
- Route: `src/app/[cityService]/page.tsx`
- Adapted from current `[city]/[service]/page.tsx`
- High density of "Best", "Near Me", "Top" in headings and body:
  - H1: "Best Local SEO Expert Near El Dorado Hills, CA"
  - H2s: "Top Local SEO Services in El Dorado Hills", "Best Google Maps Optimization Near El Dorado Hills"
- Business stats (not income) in content
- `notFound()` guard for invalid slugs

### 2d. Delete old routes after examples approved
- Remove `src/app/locations/[city]/` directory (old city hub + old LTPs)

## Phase 3: Full Buildout (after template approval)
- All 5 county hubs generate from approved template
- All 23 city hubs generate from approved template
- All 529+ LTPs generate from approved template

## Phase 4: Redirects & Sitemap

### 301 Redirects in `next.config.ts`
- 23 city hub redirects: `/locations/{city}` → `/locations/{county}-county/{city}`
  - Including `/locations/sacramento` → `/locations/sacramento-county/sacramento` (no ambiguity now that county slug has `-county`)
- 529 LTP redirects: `/locations/{city}/{service}` → `/{city}-{service}` (generated programmatically)
- Total: ~552 redirects (within Vercel's 1,024 limit)

### Sitemap (`src/app/sitemap.ts`)
- 5 county hub URLs (priority 0.8)
- 23 city hub URLs at new paths (priority 0.7)
- 575+ LTP URLs at root level (priority 0.6)

## Phase 5: Internal Link Updates
- `CountySelector.tsx` — city links use new `/locations/{county}-county/{city}` paths
- `constants.ts` — NAV_LOCATIONS href updates
- `locations/page.tsx` — import from counties.ts

## Phase 6: Update CLAUDE.md & Memory
- Update CLAUDE.md with new URL structure, route files, decisions
- Update memory files for fresh session context

## Key Decisions
- County slugs always end in `-county` (el-dorado-county, sacramento-county, etc.)
- `/locations/` prefix for hub pages (organizational, doesn't hurt LTP SEO)
- `{city}-web-developer` and `{city}-websites` = aliases to wordpress-development
- Service names in content use search-intent phrasing, not formal names
- Business count/growth stats replace median income everywhere
- Reasonable estimate stats initially, refined later

## Critical Files
| File | Action |
|------|--------|
| `src/lib/counties.ts` | NEW |
| `src/lib/city-service-slugs.ts` | NEW |
| `src/lib/cities.ts` | MODIFY — remove income, add business stats |
| `src/lib/services.ts` | MODIFY — add searchIntentName, best/near-me FAQs |
| `src/app/locations/[county]/page.tsx` | NEW — county hub |
| `src/app/locations/[county]/[city]/page.tsx` | NEW — city hub |
| `src/app/[cityService]/page.tsx` | NEW — root-level LTPs |
| `src/app/locations/[city]/` | DELETE — old routes |
| `next.config.ts` | MODIFY — ~552 redirects |
| `src/app/sitemap.ts` | MODIFY — new URL patterns |
| `src/components/sections/CountySelector.tsx` | MODIFY — link paths |
| `src/lib/constants.ts` | MODIFY — NAV_LOCATIONS |
