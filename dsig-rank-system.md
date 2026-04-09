# DSIG Ranking & Discovery System

**Version 1.0 | April 2026**
**Demand Signals — AI-First Demand Generation**

A reusable methodology for building machine-readable, LLM-optimized, and search-engine-dominant websites. This playbook documents the content API architecture deployed on demandsignals.co and available for implementation on all client properties.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Feed Formats](#3-feed-formats)
4. [Per-Page Markdown System](#4-per-page-markdown-system)
5. [Master FAQ System](#5-master-faq-system)
6. [AI Bot Optimization](#6-ai-bot-optimization)
7. [Meta Tag Directives](#7-meta-tag-directives)
8. [Schema Markup (JSON-LD)](#8-schema-markup-json-ld)
9. [HTTP-Level Signals](#9-http-level-signals)
10. [Discovery Files](#10-discovery-files)
11. [Content Operations Checklist](#11-content-operations-checklist)
12. [WebSub Ping](#12-websub-ping)
13. [Client Implementation Guide](#13-client-implementation-guide)
14. [Platform-Specific Optimization Notes](#14-platform-specific-optimization-notes)
15. [Appendix: Complete Endpoint Table](#15-appendix-complete-endpoint-table)

---

## 1. Overview

### What This System Is

The DSIG Ranking & Discovery System is a machine-readable content API layer that transforms a website from a passive display interface into an active knowledge API. Every page, every FAQ, every blog post, and every service description becomes individually addressable, machine-parseable, and optimized for consumption by search engines, AI crawlers, and LLM retrieval systems.

### The Problem It Solves

Traditional websites -- including those built on WordPress with RankMath, Yoast, or similar SEO plugins -- treat content as HTML documents designed for human browsers. Search engines and AI systems must scrape, parse, and interpret that HTML to extract meaning. This is lossy, slow, and unreliable.

The DSIG system inverts this model. Instead of forcing machines to extract content from HTML, we serve content directly in the formats machines prefer: structured markdown, JSON feeds, RSS/Atom XML, and JSON-LD schema. The HTML page is for humans. The content API is for machines. Both are served from the same source of truth.

### Competitive Advantage

| Capability | WordPress + RankMath | DSIG System |
|---|---|---|
| XML Sitemap | Yes | Yes |
| RSS Feed | Yes (basic) | Yes (RSS 2.0 + Atom 1.0 + JSON Feed 1.1) |
| JSON Feed | No | Yes -- native, no plugin |
| Per-page markdown endpoints | No | Yes -- every page has a machine-readable version |
| Master FAQ aggregation | No | Yes -- 250+ FAQs with source attribution |
| Content index (API directory) | No | Yes -- self-describing JSON manifest |
| HTTP Link headers for discovery | No | Yes -- automatic markdown discovery |
| WebSub real-time push | Rarely configured | Yes -- hub ping on publish |
| llms.txt / llms-full.txt | No | Yes -- AI crawler discovery files |
| Detail-level query parameters | No | Yes -- summary vs full content |
| ETag + Last-Modified on all feeds | Partial | Yes -- every endpoint |
| Per-service, per-city markdown | No | Yes -- 740+ individual endpoints |

The result: a site that is simultaneously the best version for human visitors and the most accessible version for every AI system and search engine that encounters it.

---

## 2. Architecture

### Content API Layer Diagram

```
                         INCOMING REQUESTS
                               |
                    +----------+-----------+
                    |                      |
               Human Browser          AI / Search Bot
                    |                      |
                    v                      v
            +---------------+    +-------------------+
            |   HTML Pages  |    |  Content API Layer |
            |   (Next.js    |    |                   |
            |    App Router)|    |  /feed.xml        |
            |               |    |  /atom.xml        |
            +-------+-------+    |  /feed.json       |
                    |            |  /faqs.md         |
                    |            |  /feeds/*          |
                    |            |  /llms.txt         |
                    |            |  /content-index.json|
                    |            +--------+----------+
                    |                     |
                    +----------+----------+
                               |
                    +----------+-----------+
                    |   Shared Data Layer   |
                    |                      |
                    |  services.ts         |
                    |  cities.ts           |
                    |  counties.ts         |
                    |  blog.ts (MDX)       |
                    |  all-faqs.ts         |
                    |  category-content.ts |
                    |  constants.ts        |
                    +----------------------+
```

### Feed Ecosystem

```
+------------------+     +------------------+     +------------------+
|    RSS 2.0       |     |    Atom 1.0      |     |  JSON Feed 1.1   |
|  /feed.xml       |     |  /atom.xml       |     |  /feed.json      |
|                  |     |                  |     |                  |
| Google, Bing,    |     | Feedly, Inoreader|     | LLM APIs,        |
| Perplexity,      |     | NewsBlur,        |     | AI Agents,       |
| traditional      |     | structured       |     | ChatGPT plugins, |
| aggregators      |     | consumers        |     | custom bots      |
+--------+---------+     +--------+---------+     +--------+---------+
         |                         |                        |
         +------------+------------+------------------------+
                      |
              +-------+--------+
              |   WebSub Hub   |
              | pubsubhubbub   |
              | .appspot.com   |
              +----------------+
```

### Per-Page Markdown Endpoints

```
/feeds/
  +-- blog/
  |     +-- {slug}                 142 posts
  +-- services/
  |     +-- {slug}                  23 services
  +-- categories/
  |     +-- {slug}                   4 categories
  +-- locations/
  |     +-- {county}                 5 counties
  |     +-- {county}/{city}         23 cities
  +-- ltp/
  |     +-- {city-service}         529 LTPs
  +-- pages/
        +-- home
        +-- contact
        +-- portfolio
        +-- team
        +-- terms
        +-- privacy
        +-- accessibility
        +-- tools
        +-- tools/{slug}             4 tools
```

### Master Aggregation Files

| File | Purpose | Content |
|---|---|---|
| `/faqs.md` | Master FAQ registry | 250+ questions, cross-linked to source pages and markdown endpoints |
| `/feeds/services.md` | Services directory | All 23 services with descriptions, links to HTML and markdown |
| `/feeds/blog.md` | Blog index | All 142 posts with dates, categories, links |
| `/feeds/locations.md` | Locations directory | All 5 counties, 23 cities, service availability |

### Content Index

`/content-index.json` is a self-describing API directory. It tells any AI agent exactly what content is available, how to access it, and in what formats. This is the entry point for autonomous agents exploring the site.

### Middleware-Based Response Enhancement

Next.js middleware intercepts every response and adds:
- `Link` headers pointing HTML pages to their markdown equivalents
- Cache-control headers with `stale-while-revalidate`
- `X-Robots-Tag` headers on feed endpoints (noindex, follow)
- WebSub hub discovery headers on feed responses

---

## 3. Feed Formats

### RSS 2.0 (`/feed.xml`)

**Who consumes it:** Google, Bing, Perplexity, traditional RSS readers (Feedly, Inoreader, NewsBlur), podcast directories, and legacy aggregation systems.

**Why it matters:** RSS 2.0 remains the most widely supported syndication format. Google News, Google Podcasts, and Perplexity all actively poll RSS feeds. Perplexity checks feeds every 1-6 hours and uses recency as a ranking signal.

**Implementation details:**
- Full `<description>` with complete post content (not truncated summaries)
- `<pubDate>` in RFC 822 format for temporal signals
- `<category>` tags matching blog taxonomy
- `<atom:link rel="hub">` pointing to WebSub hub for real-time push
- `<atom:link rel="self">` for feed self-identification
- `<guid isPermaLink="true">` for unique item identification
- `<image>` element with site logo for feed reader display

**WebSub hub:** Google's PubSubHubbub (`pubsubhubbub.appspot.com`) is declared as the hub. When new content is published, a ping to this hub notifies all subscribers immediately rather than waiting for their next poll cycle.

```xml
<atom:link rel="hub" href="https://pubsubhubbub.appspot.com/" />
<atom:link rel="self" type="application/rss+xml"
           href="https://demandsignals.co/feed.xml" />
```

### Atom 1.0 (`/atom.xml`)

**Who consumes it:** Feedly (preferred format), Inoreader, The Old Reader, Miniflux, and systems that require strict XML validation. Atom is an IETF standard (RFC 4287) while RSS 2.0 is a de facto standard with ambiguities.

**Structural advantages over RSS:**
- Required `<id>` element (URN-based) eliminates GUID ambiguity
- `<updated>` uses ISO 8601 (more precise than RFC 822)
- `<content type="html">` explicitly declares content encoding
- `<link rel="alternate">` cleanly separates content URL from feed URL
- `<author>` is a structured element (name, email, URI) rather than flat text
- Namespace-clean: no mixing of RSS and Atom namespaces

**Implementation details:**
- `<entry>` elements for each blog post with full content
- `<link rel="hub">` for WebSub discovery
- `<category term="...">` with proper taxonomy
- `<updated>` on both feed and entry level for change detection

### JSON Feed 1.1 (`/feed.json`)

**Who consumes it:** LLM APIs, AI agents, ChatGPT plugins, custom automation scripts, modern feed readers (NetNewsWire, Reeder), and any system that prefers JSON over XML.

**Why this is the key differentiator:**

No WordPress plugin generates JSON Feed 1.1. Not Yoast. Not RankMath. Not Jetrails. Not any of them. This is a format that requires custom implementation, and it is the format that AI systems natively consume.

When an LLM or AI agent encounters a JSON Feed, it can parse it without XML processing, extract content without HTML stripping, and consume structured metadata without namespace resolution. JSON is the lingua franca of APIs, and a JSON Feed makes a blog look like an API endpoint.

**Implementation details:**
- Conforms to JSON Feed 1.1 specification (https://www.jsonfeed.org/version/1.1/)
- `version` field: `https://jsonfeed.org/version/1.1`
- `items` array with `id`, `url`, `title`, `content_html`, `date_published`, `tags`
- `authors` array (1.1 format, not deprecated `author` object)
- `hubs` array with WebSub hub reference
- `next_url` for pagination (if applicable)
- Content-Type: `application/feed+json`

```json
{
  "version": "https://jsonfeed.org/version/1.1",
  "title": "Demand Signals Blog",
  "home_page_url": "https://demandsignals.co/blog",
  "feed_url": "https://demandsignals.co/feed.json",
  "hubs": [
    { "type": "WebSub", "url": "https://pubsubhubbub.appspot.com/" }
  ],
  "items": [
    {
      "id": "https://demandsignals.co/blog/post-slug",
      "url": "https://demandsignals.co/blog/post-slug",
      "title": "Post Title",
      "content_html": "<p>Full post content...</p>",
      "date_published": "2026-04-09T00:00:00Z",
      "tags": ["AI", "SEO"],
      "authors": [{ "name": "Demand Signals" }]
    }
  ]
}
```

---

## 4. Per-Page Markdown System

### Philosophy

Every page on the site has a machine-readable markdown equivalent. This is not a simplified version or a summary -- it is the complete content of the page, structured for machine consumption. The HTML page exists for human browsers. The markdown endpoint exists for AI crawlers, LLM retrieval systems, and any automated system that needs to consume the content without parsing HTML.

This treats the website as a content API, not just a display layer.

### URL Patterns

All markdown endpoints live under the `/feeds/` path prefix:

| Pattern | Example | Count |
|---|---|---|
| `/feeds/blog/{slug}` | `/feeds/blog/ai-seo-strategies-2026` | 142 |
| `/feeds/services/{slug}` | `/feeds/services/local-seo` | 23 |
| `/feeds/categories/{slug}` | `/feeds/categories/demand-generation` | 4 |
| `/feeds/locations/{county}` | `/feeds/locations/sacramento` | 5 |
| `/feeds/locations/{county}/{city}` | `/feeds/locations/sacramento/elk-grove` | 23 |
| `/feeds/ltp/{city-service}` | `/feeds/ltp/elk-grove-local-seo` | 529 |
| `/feeds/pages/{slug}` | `/feeds/pages/contact` | 11 |
| `/feeds/pages/tools/{slug}` | `/feeds/pages/tools/demand-audit` | 4 |

### Detail Levels

Every markdown endpoint supports a `detail` query parameter:

**`?detail=summary`** (~100 tokens)
Returns a concise summary of the page suitable for embedding context windows, search result snippets, or quick content assessment. Includes title, one-paragraph description, and key metadata.

**`?detail=full`** (complete content)
Returns the full page content in markdown format. This includes all sections, FAQs, service descriptions, and structured data. Default when no parameter is specified.

```
GET /feeds/services/local-seo?detail=summary
Content-Type: text/markdown

# Local SEO — Demand Signals

AI-powered local search optimization for Northern California businesses.
Includes Google Business Profile management, citation building, review
monitoring, and geo-targeted content distribution across 23 service areas.

**Category:** Demand Generation
**URL:** https://demandsignals.co/demand-generation/local-seo
```

```
GET /feeds/services/local-seo?detail=full
Content-Type: text/markdown

# Local SEO — Demand Signals

[Full service page content in markdown...]
[Features, tech stack, FAQs, all sections...]
```

### Noindex Strategy

All `/feeds/*` endpoints return the HTTP header:

```
X-Robots-Tag: noindex, follow
```

This means:
- **Google and Bing ignore these pages** for their web index -- no duplicate content penalty, no cannibalization of the HTML pages
- **AI crawlers consume them freely** -- GPTBot, ClaudeBot, PerplexityBot, and others do not respect `noindex` in the same way (they are looking for content, not indexable pages)
- **Links within the markdown are followed** -- `follow` ensures that any links in the markdown content still pass signals

This is a deliberate architectural decision: the HTML pages rank in Google. The markdown endpoints feed AI systems. Both serve from the same data. No duplication penalty. Maximum coverage.

### Content-Type

All markdown endpoints return:

```
Content-Type: text/markdown; charset=utf-8
```

Not `text/plain`. Not `text/html`. The explicit `text/markdown` content type tells consuming systems exactly what format to expect, enabling proper rendering and parsing.

### Caching Headers

Every markdown endpoint returns:

```
ETag: "hash-of-content"
Last-Modified: Wed, 09 Apr 2026 00:00:00 GMT
Cache-Control: public, max-age=3600, stale-while-revalidate=86400
```

- **ETag:** Content hash for conditional requests (`If-None-Match`). Returns 304 Not Modified if content has not changed, saving bandwidth for frequent crawlers.
- **Last-Modified:** Timestamp for temporal caching (`If-Modified-Since`). Tells crawlers when the content last changed.
- **Cache-Control:** 1 hour fresh, 24 hours stale-while-revalidate. Balances freshness with server load.

---

## 5. Master FAQ System

### Centralized FAQ Registry

The master FAQ file (`/faqs.md`) aggregates every FAQ from every page on the site into a single, searchable document. This is not a simple dump -- it is a structured registry with:

- **Table of contents** listing all sections with question counts
- **Section grouping** by page/service origin
- **Source attribution** on every answer: links to both the HTML page and the markdown endpoint
- **Cross-linking** between related questions across different services

### Structure

```markdown
# Demand Signals - Frequently Asked Questions

> 250+ questions and answers covering all services, locations, and capabilities.
> Each answer includes a link to the source page for full context.

## Table of Contents

- Services (23 sections, 115 questions)
- Categories (4 sections, 20 questions)
- Locations (28 sections, 56 questions)
- Company (3 sections, 15 questions)
- Tools (4 sections, 12 questions)
- Blog Topics (35 questions)

---

## WordPress Development

**Source:** [WordPress Development](/websites-apps/wordpress-development)
| [Markdown](/feeds/services/wordpress-development)

### What makes AI-powered WordPress development different from traditional agencies?
AI-powered WordPress development combines...

### How long does a typical WordPress project take?
Most WordPress projects are delivered in...
```

### Why This Matters

When an LLM is asked "What does Demand Signals charge for WordPress development?" or "Does Demand Signals serve Elk Grove?", the FAQ registry gives it a single, authoritative place to find the answer -- with source attribution that lets it cite the specific page.

No WordPress site has this. Yoast generates FAQ schema per page, but never aggregates across the site. RankMath does the same. Neither produces a machine-readable master FAQ file.

### FAQ Count Targets

| Source | FAQ Count |
|---|---|
| 23 service pages | 5 each = 115 |
| 4 category index pages | 5 each = 20 |
| About / Team / Portfolio | 5 each = 15 |
| Contact page | 5 |
| 4 tools pages | 3 each = 12 |
| 5 county pages | 4 each = 20 |
| 23 city pages | 3 each = 69 |
| Blog topic FAQs | 35+ |
| **Total** | **290+** |

---

## 6. AI Bot Optimization

### robots.txt Allowlist

The `robots.txt` file explicitly allows every known AI crawler:

```
# AI Crawlers — Explicitly Allowed
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Applebot-Extended
Allow: /
```

### What Each Bot Does

| Bot | Operator | Purpose | What It Consumes |
|---|---|---|---|
| **GPTBot** | OpenAI | Training data + ChatGPT Search index | HTML, feeds, llms.txt, markdown endpoints |
| **ChatGPT-User** | OpenAI | Real-time browsing for ChatGPT Plus users | HTML pages, follows links |
| **OAI-SearchBot** | OpenAI | SearchGPT / ChatGPT Search results | HTML, structured data, feeds |
| **Google-Extended** | Google | Gemini training + AI Overviews | HTML, JSON-LD schema, feeds |
| **PerplexityBot** | Perplexity | Real-time search index | RSS feeds, HTML, markdown, recency signals |
| **ClaudeBot** | Anthropic | Claude training data collection | HTML, llms.txt, markdown endpoints |
| **Claude-SearchBot** | Anthropic | Claude search tool (Brave-powered) | HTML, structured content, llms.txt |
| **Claude-User** | Anthropic | Real-time browsing for Claude users | HTML pages |
| **anthropic-ai** | Anthropic | General Anthropic crawling | All content |
| **Applebot-Extended** | Apple | Apple Intelligence / Siri training | HTML, structured data |

### Why Explicit Allow Rules Matter

Many websites block AI crawlers by default (either through `robots.txt` Disallow rules or by not specifying them at all). When a bot is not mentioned in `robots.txt`, its behavior depends on the operator's policy -- some crawl anyway, some don't.

By explicitly allowing each bot with `Allow: /`, we:

1. **Remove ambiguity** -- every bot knows it is welcome
2. **Signal content availability** -- crawlers that respect explicit allows will crawl more aggressively
3. **Differentiate from competitors** -- most agency sites either block or ignore AI crawlers
4. **Maximize training inclusion** -- content that is explicitly allowed is more likely to be included in training datasets

Additionally, the `/feeds/` path is explicitly called out in `llms.txt` as the content API entry point, directing AI crawlers to the machine-readable versions first.

---

## 7. Meta Tag Directives

### Robots Meta Directives

Every HTML page includes:

```html
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
```

| Directive | Value | Effect |
|---|---|---|
| `index, follow` | Standard | Page is indexable, links are followed |
| `max-snippet:-1` | Unlimited | Google can use any length snippet in search results. No truncation. |
| `max-image-preview:large` | Full size | Google can show the largest available image preview in search results |
| `max-video-preview:-1` | Unlimited | Google can show full-length video previews (relevant for embedded content) |

These directives maximize the amount of content Google displays in search results. Many sites leave these at defaults (which are restrictive). Setting them to unlimited ensures maximum SERP real estate.

### Open Graph Tags

Every page includes Open Graph tags for social sharing:

```html
<meta property="og:title" content="Page Title | Demand Signals" />
<meta property="og:description" content="Page description..." />
<meta property="og:url" content="https://demandsignals.co/page-path" />
<meta property="og:site_name" content="Demand Signals" />
<meta property="og:type" content="website" />
<meta property="og:image" content="https://demandsignals.co/og-image.png" />
<meta property="og:locale" content="en_US" />
```

### Twitter Card Tags

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@demandsignals" />
<meta name="twitter:creator" content="@demandsignals" />
<meta name="twitter:title" content="Page Title | Demand Signals" />
<meta name="twitter:description" content="Page description..." />
```

The `twitter:site` and `twitter:creator` tags associate shared links with the brand's Twitter/X account, building entity authority across platforms.

---

## 8. Schema Markup (JSON-LD)

### Schema Types Used

Every page includes one or more JSON-LD schema blocks injected via `<script type="application/ld+json">`. Schema types are selected based on page purpose:

| Schema Type | Where Used | Purpose |
|---|---|---|
| `Organization` | Site-wide (layout) | Core business entity with contact, logo, social profiles |
| `LocalBusiness` | Site-wide (layout) | Physical location, hours, service area, geo coordinates |
| `ProfessionalService` | Site-wide (layout) | Professional services classification |
| `WebSite` | Homepage | Site-level search action, publisher info |
| `Service` | Each service page | Individual service with provider, area served |
| `BreadcrumbList` | All pages | Navigation path for rich breadcrumb display |
| `FAQPage` | All pages with FAQs | FAQ rich results in Google |
| `HowTo` | LTP pages | Step-by-step process for service delivery |
| `BlogPosting` | Blog post pages | Article with author, date, publisher |
| `Person` | Team page | Individual team members with roles |
| `CollectionPage` | Category index pages | Collection of related services |
| `ContactPage` | Contact page | Contact form, address, hours |

### Organization Schema - Entity Authority

The `Organization` schema establishes the business as a recognized entity in knowledge graphs:

```json
{
  "@type": ["Organization", "LocalBusiness", "ProfessionalService"],
  "name": "Demand Signals",
  "url": "https://demandsignals.co",
  "logo": "https://demandsignals.us/assets/logos/dsig_logo_v2b.png",
  "image": "https://demandsignals.us/assets/logos/dsig_logo_v2b.png",
  "telephone": "+19165422423",
  "email": "DemandSignals@gmail.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "4819 Central Ave",
    "addressLocality": "Sacramento",
    "addressRegion": "CA",
    "postalCode": "95820",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 38.5382,
    "longitude": -121.4686
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
      "opens": "08:00",
      "closes": "18:00"
    }
  ],
  "priceRange": "$$",
  "knowsAbout": [
    "AI-Powered Web Development",
    "Search Engine Optimization",
    "Generative Engine Optimization",
    "LLM Optimization",
    "AI Agent Development",
    "Local SEO",
    "Geo-Targeting",
    "AI Content Generation",
    "WordPress Development",
    "React/Next.js Development",
    "Mobile App Development",
    "AI Workforce Automation"
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Demand Signals Services",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Local SEO",
          "url": "https://demandsignals.co/demand-generation/local-seo"
        }
      }
    ]
  },
  "areaServed": [
    {
      "@type": "State",
      "name": "California"
    },
    {
      "@type": "Country",
      "name": "United States"
    }
  ],
  "sameAs": [
    "https://www.facebook.com/demandsignals",
    "https://twitter.com/demandsignals",
    "https://www.linkedin.com/company/demand-signals",
    "https://www.instagram.com/demandsignals",
    "https://www.youtube.com/@demandsignals",
    "https://github.com/demand-signals",
    "https://www.threads.net/@demandsignals",
    "https://bsky.app/profile/demandsignals.co"
  ]
}
```

### Key Schema Fields for AI Discovery

**`knowsAbout`** -- Tells Gemini and Google's Knowledge Graph exactly what topics the business is authoritative on. This directly feeds AI Overviews and Gemini's entity understanding. List every core competency.

**`hasOfferCatalog`** -- Structures all 23 services as formal offers within a catalog. Google's Knowledge Graph consumes this to understand what the business sells. Each offer links to its service page URL.

**`areaServed`** -- Defines geographic coverage. Critical for local SEO and "near me" queries. Can include cities, counties, states, or countries. Combined with `geo` coordinates and `address`, this creates a complete geographic footprint.

**`sameAs`** -- Links to all social media profiles. This is the primary mechanism for entity verification across platforms. Google uses `sameAs` to confirm that the business entity on the website is the same entity on LinkedIn, Facebook, GitHub, etc.

---

## 9. HTTP-Level Signals

### Link Headers for Markdown Discovery

Every HTML page response includes a `Link` header pointing to its markdown equivalent:

```
Link: </feeds/services/local-seo>; rel="alternate"; type="text/markdown"
```

This is an HTTP-level signal that tells any crawler or AI agent: "There is a machine-readable version of this page available at this URL." The crawler does not need to parse the HTML or find a `<link>` tag -- the information is in the response header itself.

**Implementation:** Next.js middleware inspects the request path, maps it to the corresponding `/feeds/` endpoint, and injects the `Link` header into the response.

### ETags for Conditional Requests

Every feed and markdown endpoint returns an `ETag` header:

```
ETag: "a1b2c3d4e5f6"
```

When a crawler re-requests the same URL, it sends:

```
If-None-Match: "a1b2c3d4e5f6"
```

If the content has not changed, the server returns `304 Not Modified` with no body. This saves bandwidth for both the server and the crawler, and allows frequent polling without performance penalty.

**Why this matters for AI crawlers:** PerplexityBot polls every 1-6 hours. GPTBot and ClaudeBot crawl regularly. Without ETags, every poll transfers the full response body. With ETags, unchanged content returns a 130-byte 304 response.

### Last-Modified for Temporal Caching

```
Last-Modified: Wed, 09 Apr 2026 12:00:00 GMT
```

Crawlers can send `If-Modified-Since` to check for updates. This is particularly important for blog feeds where post dates are known, and for service pages where update frequency is lower.

### Cache-Control with Stale-While-Revalidate

```
Cache-Control: public, max-age=3600, stale-while-revalidate=86400
```

- **`public`** -- CDN and proxy caches can store this
- **`max-age=3600`** -- Fresh for 1 hour
- **`stale-while-revalidate=86400`** -- Serve stale content for up to 24 hours while revalidating in the background

This ensures fast responses for frequent crawlers while keeping content reasonably fresh. The `stale-while-revalidate` directive is critical for Vercel's edge network, which can serve cached responses globally while refreshing from the origin.

### WebSub Hub References

Feed responses include the WebSub hub in both HTTP headers and feed body:

```
Link: <https://pubsubhubbub.appspot.com/>; rel="hub"
Link: <https://demandsignals.co/feed.xml>; rel="self"
```

Any WebSub-compatible subscriber can register with the hub to receive push notifications when new content is published, eliminating the need for polling entirely.

---

## 10. Discovery Files

### llms.txt

**Path:** `/llms.txt`

The `llms.txt` file is a plain-text discovery document designed specifically for AI crawlers and LLM retrieval systems. It provides a structured overview of the site, its services, content, and -- critically -- its content API endpoints.

**Format:**

```
# Demand Signals

> AI-powered demand generation agency serving Northern California and beyond.

## Services
- [Local SEO](https://demandsignals.co/demand-generation/local-seo)
- [WordPress Development](https://demandsignals.co/websites-apps/wordpress-development)
...

## Content API
- RSS Feed: https://demandsignals.co/feed.xml
- Atom Feed: https://demandsignals.co/atom.xml
- JSON Feed: https://demandsignals.co/feed.json
- Master FAQ: https://demandsignals.co/faqs.md
- Content Index: https://demandsignals.co/content-index.json
- Services Directory: https://demandsignals.co/feeds/services.md
- Blog Directory: https://demandsignals.co/feeds/blog.md
- Locations Directory: https://demandsignals.co/feeds/locations.md

## Recent Blog Posts
...
```

**Who consumes it:** Claude (Anthropic explicitly supports llms.txt), ChatGPT (follows the pattern), Perplexity (crawls it), any AI agent following the emerging llms.txt convention.

### llms-full.txt

**Path:** `/llms-full.txt`

The comprehensive version. 550+ lines covering:
- Complete service descriptions for all 23 services
- All 140+ blog post titles with URLs and dates
- All 40+ company FAQs with full answers
- Service area details for all 23 cities
- Contact information and business hours
- Technology stack and methodology descriptions

**Use case:** When an AI system has a large enough context window, `llms-full.txt` provides everything it needs in a single request. Claude's 200K context window can consume this entire file and answer virtually any question about the business.

### opensearch.xml

**Path:** `/opensearch.xml`

Allows browsers to add the site as a search engine. When a user visits the site, their browser's address bar can offer "Search Demand Signals" as an option.

```xml
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>Demand Signals</ShortName>
  <Description>Search Demand Signals for AI-powered marketing services</Description>
  <Url type="text/html"
       template="https://demandsignals.co/blog?q={searchTerms}" />
</OpenSearchDescription>
```

### security.txt

**Path:** `/.well-known/security.txt`

RFC 9116 compliant security contact file. Tells security researchers how to report vulnerabilities:

```
Contact: mailto:DemandSignals@gmail.com
Preferred-Languages: en
Canonical: https://demandsignals.co/.well-known/security.txt
```

### content-index.json

**Path:** `/content-index.json`

A self-describing API directory in JSON format. This is the machine-readable map of every content endpoint on the site:

```json
{
  "name": "Demand Signals Content API",
  "version": "1.0",
  "base_url": "https://demandsignals.co",
  "endpoints": {
    "feeds": {
      "rss": "/feed.xml",
      "atom": "/atom.xml",
      "json": "/feed.json"
    },
    "markdown": {
      "services": {
        "index": "/feeds/services.md",
        "pattern": "/feeds/services/{slug}",
        "count": 23
      },
      "blog": {
        "index": "/feeds/blog.md",
        "pattern": "/feeds/blog/{slug}",
        "count": 142
      },
      "categories": {
        "pattern": "/feeds/categories/{slug}",
        "count": 4
      },
      "locations": {
        "index": "/feeds/locations.md",
        "counties": "/feeds/locations/{county}",
        "cities": "/feeds/locations/{county}/{city}",
        "county_count": 5,
        "city_count": 23
      },
      "ltp": {
        "pattern": "/feeds/ltp/{city-service}",
        "count": 529
      },
      "pages": {
        "pattern": "/feeds/pages/{slug}",
        "available": ["home", "contact", "portfolio", "team",
                      "terms", "privacy", "accessibility", "tools"]
      }
    },
    "discovery": {
      "llms_txt": "/llms.txt",
      "llms_full": "/llms-full.txt",
      "opensearch": "/opensearch.xml",
      "security": "/.well-known/security.txt",
      "sitemap": "/sitemap.xml",
      "robots": "/robots.txt"
    },
    "aggregation": {
      "faqs": "/faqs.md",
      "content_index": "/content-index.json"
    }
  },
  "query_parameters": {
    "detail": {
      "values": ["summary", "full"],
      "default": "full",
      "description": "Controls response detail level for markdown endpoints"
    }
  },
  "total_endpoints": "740+"
}
```

An AI agent encountering this file for the first time can immediately understand the entire content API surface, enumerate all available endpoints, and construct requests for specific content. No documentation needed. No guessing.

---

## 11. Content Operations Checklist

### Adding a New Blog Post

| Step | Auto/Manual | Action |
|---|---|---|
| Drop MDX file in `src/content/blog/` | Manual | Create file with frontmatter (title, date, category, excerpt) |
| Appears in RSS, Atom, JSON Feed | Auto | `getAllPosts()` scans directory dynamically |
| Appears in `/feeds/blog.md` index | Auto | Blog index regenerates on build |
| Per-post markdown at `/feeds/blog/{slug}` | Auto | Route handler serves from MDX content |
| Appears in sitemap | Auto | `sitemap.ts` includes all blog posts |
| Ping WebSub hub | Manual | Run `npm run ping-hub` to notify subscribers |
| Update llms-full.txt | Manual | Add post to blog section if high-value content |
| Update content-index.json blog count | Manual | Increment count if tracking total |

### Adding a New Service

| Step | Auto/Manual | Action |
|---|---|---|
| Add to `SERVICES` array in `services.ts` | Manual | Define slug, name, description, category, keywords, FAQs |
| Appears in `/feeds/services.md` | Auto | Services directory regenerates |
| Per-service markdown at `/feeds/services/{slug}` | Auto | Route handler serves from SERVICES data |
| Appears in master FAQ (`/faqs.md`) | Auto | FAQ aggregation pulls from all services |
| Add to `category-content.ts` | Manual | Include in appropriate category listing |
| Create service page in category directory | Manual | Use ServicePageTemplate |
| Update `middleware.ts` SERVICE_SLUGS | Manual | Add slug to Link header mapping |
| Update `middleware.ts` CATEGORY_SERVICE_MAP | Manual | Map slug to category |
| Update `llms.txt` | Manual | Add to services section |
| Update `llms-full.txt` | Manual | Add service description and FAQs |
| Update `content-index.json` service count | Manual | Increment count |
| Update nav constants in `constants.ts` | Manual | Add to appropriate dropdown |

### Adding a New Location (City)

| Step | Auto/Manual | Action |
|---|---|---|
| Add to `cities.ts` | Manual | Define city name, slug, county, coordinates |
| Add to county's `citySlugs` in `counties.ts` | Manual | Register city in county listing |
| Appears in `/feeds/locations.md` | Auto | Locations directory regenerates |
| Per-city markdown at `/feeds/locations/{county}/{city}` | Auto | Route handler serves from cities data |
| LTP pages auto-generate | Auto | `[cityService]/page.tsx` generates for all city/service combos |
| LTP markdown at `/feeds/ltp/{city-service}` | Auto | Route handler serves from city + service data |
| Update `llms.txt` location section | Manual | Add city to locations list |
| Sitemap auto-includes | Auto | Sitemap generates from cities/services arrays |

### Adding a New Category

| Step | Auto/Manual | Action |
|---|---|---|
| Add to `category-content.ts` | Manual | Define category name, slug, description, services |
| Create category index page | Manual | Use CategoryIndexTemplate in new directory |
| Per-category markdown at `/feeds/categories/{slug}` | Auto | Route handler serves from category data |
| Update `middleware.ts` CATEGORY_SLUGS | Manual | Add to Link header mapping |
| Update `middleware.ts` CATEGORY_SERVICE_MAP | Manual | Map all services to new category |
| Update `constants.ts` nav data | Manual | Add dropdown with service links |
| Update `content-index.json` | Manual | Add category and increment count |
| Update `llms.txt` | Manual | Add to categories section |

---

## 12. WebSub Ping

WebSub (formerly PubSubHubbub) enables real-time content distribution. Instead of waiting for crawlers to poll feeds on their own schedule, a WebSub ping tells the hub "new content is available," and the hub immediately notifies all subscribers.

### NPM Script

```bash
# Run after publishing new content:
npm run ping-hub
```

### Manual Ping

```bash
# Ping for RSS feed
curl -s -d "hub.mode=publish&hub.url=https://demandsignals.co/feed.xml" \
  https://pubsubhubbub.appspot.com/

# Ping for Atom feed
curl -s -d "hub.mode=publish&hub.url=https://demandsignals.co/atom.xml" \
  https://pubsubhubbub.appspot.com/

# Ping for JSON Feed
curl -s -d "hub.mode=publish&hub.url=https://demandsignals.co/feed.json" \
  https://pubsubhubbub.appspot.com/
```

### When to Ping

- After publishing a new blog post
- After adding a new service page
- After significant content updates to existing pages
- After adding new location pages

### Who Receives the Ping

Any system subscribed to the hub for these feed URLs. Known subscribers include:
- Google (monitors PubSubHubbub for Google News and Discover)
- Perplexity (subscribes to RSS feeds for real-time indexing)
- Feed readers (Feedly, Inoreader) that support WebSub
- Any custom subscriber registered via the hub

---

## 13. Client Implementation Guide

### WordPress Sites

WordPress provides basic RSS out of the box but lacks most DSIG system capabilities. Implementation requires a mix of plugins and custom development:

**Core Setup:**
1. Install Yoast SEO or RankMath for XML sitemap, meta tags, and basic schema
2. Configure FAQ schema via ACF (Advanced Custom Fields) + custom JSON-LD injection
3. Set robots meta to `max-snippet:-1, max-image-preview:large, max-video-preview:-1`

**Content API Layer:**
1. Create `llms.txt` and `llms-full.txt` as static files in the WordPress root directory
2. Add `security.txt` to `.well-known/` directory (requires server config or plugin)
3. Create `opensearch.xml` in root directory
4. Add feed discovery links in `wp_head`:
   ```php
   add_action('wp_head', function() {
       echo '<link rel="alternate" type="application/rss+xml" title="RSS" href="/feed/" />';
       echo '<link rel="alternate" type="application/atom+xml" title="Atom" href="/feed/atom/" />';
       echo '<link rel="alternate" type="application/feed+json" title="JSON Feed" href="/feed.json" />';
   });
   ```

**JSON Feed (WordPress does NOT have this natively):**
- Create a custom REST API endpoint or template that outputs JSON Feed 1.1 format
- Register at `/feed.json` via `add_rewrite_rule`
- Pull posts via `WP_Query` and format as JSON Feed items

**Per-Page Markdown:**
- Create custom REST API endpoints under `/wp-json/dsig/v1/feeds/`
- Each endpoint pulls page/post content and strips HTML to markdown
- Add `X-Robots-Tag: noindex, follow` header via PHP

**FAQ Aggregation:**
- Create a custom template or REST endpoint at `/faqs.md`
- Query all FAQ ACF field groups across all pages
- Format as structured markdown with source attribution

**WebSub:**
- Install WebSub/PubSubHubbub plugin (exists for WordPress)
- Configure hub URL as `https://pubsubhubbub.appspot.com/`

**Limitations:**
- WordPress cannot do middleware-based Link header injection without server config (Nginx/Apache rules)
- ETag and Last-Modified headers depend on hosting provider
- No native `content-index.json` -- must be manually maintained or generated via cron

### Shopify Sites

Shopify is more constrained than WordPress due to its closed platform, but the core system can still be implemented:

**Core Setup:**
1. Shopify generates XML sitemap automatically
2. Use theme Liquid templates for JSON-LD schema injection
3. Add meta tags via `theme.liquid` `<head>` section

**Content API Layer:**
1. Add `llms.txt` via theme Assets: upload as `llms.txt`, serve via `/pages/llms` with a Liquid template that sets `Content-Type: text/plain`
2. Alternatively, use Cloudflare Workers to intercept `/llms.txt` and serve static content
3. JSON Feed: create a Liquid template at `/pages/feed.json` that loops through blog articles

**Schema:**
- Inject JSON-LD via Liquid snippets in `theme.liquid`
- Use `{% schema %}` blocks in sections for structured data
- Organization, LocalBusiness, Product, and BreadcrumbList schemas via Liquid

**Limitations:**
- No server-side middleware -- cannot inject HTTP Link headers
- No per-page markdown endpoints without Cloudflare Workers or external proxy
- Limited control over caching headers
- No WebSub support without external service

### Custom / Static Sites

Full implementation as documented in this playbook is possible with modern frameworks:

**Recommended Stack:**
- **Next.js** (App Router) -- route handlers for feeds, middleware for headers, SSG for performance
- **Astro** -- excellent SSG with route handlers, good for content-heavy sites
- **Nuxt** -- Vue equivalent of Next.js, server routes for feeds

**Implementation Approach:**
1. Define all content in structured data files (TypeScript modules or MDX)
2. Create route handlers for every feed format and markdown endpoint
3. Use middleware for HTTP-level signal injection (Link headers, ETags)
4. Use SSG (Static Site Generation) for HTML pages, ISR (Incremental Static Regeneration) for dynamic content
5. Deploy to Vercel, Netlify, or Cloudflare Pages for edge caching and global CDN

**Key Files to Create:**
```
/app/feed.xml/route.ts          -- RSS 2.0 generator
/app/atom.xml/route.ts          -- Atom 1.0 generator
/app/feed.json/route.ts         -- JSON Feed 1.1 generator
/app/faqs.md/route.ts           -- Master FAQ aggregator
/app/content-index.json/route.ts -- API directory
/app/feeds/[...slug]/route.ts   -- Per-page markdown handler
/middleware.ts                   -- Link headers, caching, X-Robots-Tag
/public/llms.txt                -- AI discovery file
/public/llms-full.txt           -- Comprehensive AI content file
/public/opensearch.xml          -- Browser search integration
/public/.well-known/security.txt -- Security contact
```

---

## 14. Platform-Specific Optimization Notes

### Perplexity

**Crawl behavior:** PerplexityBot crawls live and indexes in near real-time. It favors recency -- recently published content ranks higher than stale content for time-sensitive queries.

**Feed consumption:** Perplexity polls RSS feeds every 1-6 hours. It extracts full content from `<description>` or `<content:encoded>` elements. Truncated feeds (summary only) receive less coverage.

**Content preferences:** Perplexity heavily favors structured content with clear headings, bullet points, and factual statements. It uses a citation-heavy response style and rewards content that is easy to extract quotes from.

**WebSub advantage:** Because Perplexity polls frequently, WebSub hub pings ensure the fastest possible indexing -- often within minutes of publication rather than hours.

**Optimization priorities:**
1. Publish frequently (weekly minimum)
2. Use full-content RSS feeds (not summaries)
3. Ping WebSub hub on every publish
4. Structure content with clear, quotable statements
5. Include factual data points (numbers, dates, statistics)

### ChatGPT Search

**Crawl behavior:** ChatGPT Search uses a hybrid approach: Bing's web index combined with OpenAI's proprietary crawling (GPTBot + OAI-SearchBot). It also draws on training-era knowledge for established entities.

**Citation style:** ChatGPT Search cites approximately 22 sources per response -- more than any other LLM search system. This means there are more citation slots available, and well-structured content has a higher chance of being included.

**What it favors:**
- Structured data (JSON-LD schema) is heavily weighted
- FAQ content is frequently cited in conversational responses
- Authority signals (backlinks, domain age, social proof) from Bing's index
- Content that matches conversational query patterns

**Optimization priorities:**
1. Maximize JSON-LD schema coverage (every page, every type)
2. Write FAQs in conversational Q&A format
3. Ensure Bing Webmaster Tools verification
4. Build backlink profile (Bing weighs this heavily)
5. Include `knowsAbout` and `hasOfferCatalog` in Organization schema

### Claude Search

**Crawl behavior:** Claude's search tool uses Brave Search for real-time web retrieval. ClaudeBot and Claude-SearchBot crawl for index building. Claude is the most selective citation system -- averaging only 5.67 sources per response.

**What it favors:**
- `llms.txt` and `llms-full.txt` are highest value -- Claude explicitly supports the llms.txt convention
- Structured, expert content with logical depth and nuance
- Content that demonstrates genuine expertise rather than keyword-stuffed SEO content
- Markdown-formatted content (Claude's native format)

**Content preferences:** Claude rewards depth over breadth. A single well-written, comprehensive page outperforms ten thin pages. Logical structure, clear reasoning, and expert-level detail are weighted heavily.

**Optimization priorities:**
1. Maintain comprehensive `llms.txt` and `llms-full.txt`
2. Write in-depth, expert content (1500+ words per service page)
3. Use markdown formatting in feed content
4. Provide detailed FAQs with substantive answers (not one-liners)
5. Per-page markdown endpoints give Claude direct access to clean content

### Gemini

**Crawl behavior:** Gemini uses Google's web index plus Knowledge Graph data. Google-Extended crawls for AI training and AI Overviews (formerly SGE). Gemini draws heavily on structured data and entity understanding.

**Knowledge Graph integration:** Gemini directly consumes JSON-LD schema to build entity understanding. The `knowsAbout` field feeds Gemini's expertise assessment. The `hasOfferCatalog` field tells Gemini exactly what the business offers. The `sameAs` field verifies entity identity across platforms.

**Citation style:** Gemini cites approximately 8.34 sources per response. It strongly favors sources that appear in Google's index and have established E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) signals.

**Optimization priorities:**
1. Maximize JSON-LD schema with `knowsAbout`, `hasOfferCatalog`, `areaServed`
2. Ensure Google Search Console verification and healthy index
3. Build E-E-A-T signals: author pages, about page, credentials, reviews
4. Use Google Business Profile for local entity establishment
5. Maintain comprehensive `sameAs` array for entity verification

---

## 15. Appendix: Complete Endpoint Table

### Feed Endpoints

| Endpoint | Format | Description |
|---|---|---|
| `/feed.xml` | RSS 2.0 (XML) | Blog syndication feed with WebSub hub |
| `/atom.xml` | Atom 1.0 (XML) | Blog syndication feed (IETF standard) |
| `/feed.json` | JSON Feed 1.1 | Blog syndication feed (JSON native) |

### Aggregation Endpoints

| Endpoint | Format | Description |
|---|---|---|
| `/faqs.md` | Markdown | Master FAQ registry (250+ questions) |
| `/content-index.json` | JSON | Self-describing API directory |
| `/feeds/services.md` | Markdown | All 23 services directory |
| `/feeds/blog.md` | Markdown | All 142 blog posts index |
| `/feeds/locations.md` | Markdown | All counties and cities directory |

### Per-Page Markdown -- Blog

| Endpoint Pattern | Count | Description |
|---|---|---|
| `/feeds/blog/{slug}` | 142 | Individual blog post in markdown |

### Per-Page Markdown -- Services

| Endpoint Pattern | Count | Description |
|---|---|---|
| `/feeds/services/{slug}` | 23 | Individual service page in markdown |

Available slugs:
`wordpress-development`, `react-next-webapps`, `mobile-apps`, `vibe-coded`, `design`, `hosting`, `geo-aeo-llm-optimization`, `local-seo`, `geo-targeting`, `gbp-admin`, `systems`, `ai-content-generation`, `ai-social-media-management`, `ai-review-auto-responders`, `ai-auto-blogging`, `ai-content-repurposing`, `ai-automation-strategies`, `ai-workforce-automation`, `ai-agent-infrastructure`, `ai-automated-outreach`, `ai-agent-swarms`, `private-llms`, `clawbot-setup`

### Per-Page Markdown -- Categories

| Endpoint Pattern | Count | Description |
|---|---|---|
| `/feeds/categories/{slug}` | 4 | Category index page in markdown |

Available slugs:
`websites-apps`, `demand-generation`, `content-social`, `ai-services`

### Per-Page Markdown -- Locations

| Endpoint Pattern | Count | Description |
|---|---|---|
| `/feeds/locations/{county}` | 5 | County hub page in markdown |
| `/feeds/locations/{county}/{city}` | 23 | City hub page in markdown |

Counties: `sacramento`, `el-dorado`, `placer`, `yolo`, `san-joaquin`

Cities by county:
- **Sacramento:** `sacramento`, `elk-grove`, `roseville`, `folsom`, `rancho-cordova`, `citrus-heights`, `arden-arcade`, `carmichael`, `north-highlands`, `antelope`, `orangevale`, `fair-oaks`, `gold-river`
- **El Dorado:** `el-dorado-hills`, `cameron-park`, `shingle-springs`, `placerville`
- **Placer:** `rocklin`, `lincoln`, `auburn`, `granite-bay`, `loomis`
- **Yolo:** `davis`, `woodland`
- **San Joaquin:** `stockton`, `lodi`

### Per-Page Markdown -- Local Targeted Pages (LTPs)

| Endpoint Pattern | Count | Description |
|---|---|---|
| `/feeds/ltp/{city-service}` | 529 | City + service combination in markdown |

Format: `{city-slug}-{service-slug}` (e.g., `elk-grove-local-seo`, `sacramento-wordpress-development`)

23 cities x 23 services = 529 LTP endpoints

### Per-Page Markdown -- Static Pages

| Endpoint | Description |
|---|---|
| `/feeds/pages/home` | Homepage content |
| `/feeds/pages/contact` | Contact page with form details and address |
| `/feeds/pages/portfolio` | Portfolio and case studies |
| `/feeds/pages/team` | Team members and roles |
| `/feeds/pages/terms` | Terms of Service |
| `/feeds/pages/privacy` | Privacy Policy |
| `/feeds/pages/accessibility` | Accessibility Statement |
| `/feeds/pages/tools` | Tools index page |
| `/feeds/pages/tools/demand-audit` | Demand Audit tool |
| `/feeds/pages/tools/research-reports` | Research Reports tool |
| `/feeds/pages/tools/demand-links` | Demand Links tool |
| `/feeds/pages/tools/dynamic-qr` | Dynamic QR tool |
| `/feeds/about` | Company about page |

### Discovery Files

| Endpoint | Format | Description |
|---|---|---|
| `/llms.txt` | Plain text | AI crawler discovery file (overview) |
| `/llms-full.txt` | Plain text | AI crawler content file (550+ lines, comprehensive) |
| `/opensearch.xml` | XML | Browser search integration |
| `/.well-known/security.txt` | Plain text | RFC 9116 security contact |
| `/sitemap.xml` | XML | Complete XML sitemap (796 URLs) |
| `/robots.txt` | Plain text | Robots directives with AI bot allowlist |

### Endpoint Count Summary

| Category | Count |
|---|---|
| Feed formats (RSS, Atom, JSON) | 3 |
| Aggregation files (FAQs, indexes) | 5 |
| Blog markdown endpoints | 142 |
| Service markdown endpoints | 23 |
| Category markdown endpoints | 4 |
| County markdown endpoints | 5 |
| City markdown endpoints | 23 |
| LTP markdown endpoints | 529 |
| Static page markdown endpoints | 13 |
| Discovery files | 6 |
| **Total** | **753** |

---

## Document History

| Date | Version | Change |
|---|---|---|
| 2026-04-09 | 1.0 | Initial release -- complete DSIG Ranking & Discovery System playbook |

---

*This document is maintained by Demand Signals. For implementation inquiries, contact DemandSignals@gmail.com.*
