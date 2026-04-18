// DSIG pricing catalog — SERVER ONLY.
// Never import this from a client component. Never expose via API without session gating.
// Version is declared at bottom; stamp on every quote_sessions row at creation.
//
// Money conventions:
//   - All monetary values are integers in cents (USD).
//   - $600 = 60000. Display formatting lives at the render layer.
//
// Timeline conventions:
//   - timelineWeeks = [min, max] weeks.
//   - parallelGroup = items in the same group run concurrently on the project timeline.
//   - dependsOn = item IDs that must substantially complete before this item can start.
//     Used by the timeline calculator to build a DAG.
//
// Validation:
//   - validateCatalog() runs on first import and throws if any rule fails.
//   - All item IDs referenced in suggestsWith/excludes/dependsOn must resolve.
//   - Quantifiable items must have perUnitRange + quantityLabel.
//   - baseRange[0] <= baseRange[1], timelineWeeks[0] <= timelineWeeks[1].

import { z } from 'zod'

export const CATALOG_VERSION = '2026.04.18-1'

export type QuoteCategory =
  | 'your-website'
  | 'existing-site'
  | 'features-integrations'
  | 'get-found'
  | 'content-social'
  | 'ai-automation'
  | 'research-strategy'
  | 'monthly-services'
  | 'hosting'
  | 'team-rates'

export type PricingType = 'one-time' | 'monthly' | 'both'

export type ParallelGroup =
  | 'design'
  | 'build'
  | 'content'
  | 'seo'
  | 'ai-setup'
  | 'research'
  | 'launch'
  | 'ongoing'

export interface NarrowingFactor {
  id: string
  question: string
  type: 'number' | 'select' | 'boolean'
  options?: readonly string[]
  tightenBy?: number
  shiftMultiplier?: number
}

export interface PricingItem {
  id: string
  category: QuoteCategory
  name: string
  benefit: string
  aiBadge: string
  description?: string

  type: PricingType
  baseRange: readonly [number, number]
  monthlyRange?: readonly [number, number]

  quantifiable: boolean
  quantityLabel?: string
  perUnitRange?: readonly [number, number]
  defaultQuantity?: number
  minQuantity?: number
  maxQuantity?: number

  narrowingFactors: readonly NarrowingFactor[]

  timelineWeeks: readonly [number, number]
  parallelGroup: ParallelGroup
  dependsOn?: readonly string[]

  financeable: boolean
  financingTermMonths?: number

  suggestsWith?: readonly string[]
  requiresBase?: boolean
  excludes?: readonly string[]

  phase: 1 | 2 | 3
  availableForBid: boolean
  available: boolean
  isFree?: boolean
  freeWithPaidProject?: boolean

  /** Perceived $-value shown on invoices (used by $0 Restaurant Rule
   *  invoices for the "value" line before the 100% discount takes total
   *  to zero). If not set, falls back to midpoint of baseRange via
   *  getDisplayPriceCents(). Only free-research items need explicit values.
   */
  displayPriceCents?: number
}

// ============================================================
// Catalog — single source of truth for every price in the app.
// ============================================================
const CATALOG: readonly PricingItem[] = [
  // ──────────────── Your Website (New Build) ────────────────
  {
    id: 'single-page',
    category: 'your-website',
    name: 'Single Page Site',
    benefit: 'Your business online today.',
    aiBadge: 'Ready-made, deploy today',
    type: 'one-time',
    baseRange: [60000, 100000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [0, 1],
    parallelGroup: 'build',
    financeable: false,
    suggestsWith: ['hosting-php', 'gbp-setup'],
    excludes: ['react-nextjs-site', 'react-nextjs-app', 'mobile-app'],
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'react-nextjs-site',
    category: 'your-website',
    name: 'React/Next.js Website',
    benefit: 'Human-designed, AI-built. Blazing fast. Mobile-first.',
    aiBadge: 'Human-led design, AI-built, blazing fast',
    type: 'one-time',
    baseRange: [400000, 900000],
    quantifiable: false,
    narrowingFactors: [
      {
        id: 'page-count',
        question: 'Roughly how many core pages do you need?',
        type: 'number',
        tightenBy: 0.35,
      },
      {
        id: 'design-fidelity',
        question: 'Starting from a template we tailor, or fully custom design?',
        type: 'select',
        options: ['template-tailored', 'semi-custom', 'fully-custom'],
        tightenBy: 0.3,
      },
    ],
    timelineWeeks: [2, 4],
    parallelGroup: 'build',
    financeable: true,
    financingTermMonths: 12,
    suggestsWith: ['ui-ux-design', 'local-seo', 'hosting-node', 'analytics'],
    excludes: ['single-page', 'react-nextjs-app'],
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'react-nextjs-app',
    category: 'your-website',
    name: 'React/Next.js Web App',
    benefit: 'Full-stack web app with server rendering and edge deployment.',
    aiBadge: 'Full-stack, SSR, edge-deployed',
    type: 'one-time',
    baseRange: [600000, 1400000],
    quantifiable: false,
    narrowingFactors: [
      {
        id: 'feature_count',
        question: 'How many distinct user-facing features?',
        type: 'number',
        tightenBy: 0.3,
      },
      {
        id: 'auth_required',
        question: 'User accounts / login required?',
        type: 'boolean',
        tightenBy: 0.15,
      },
      {
        id: 'integration_count',
        question: 'How many third-party integrations (stripe, APIs, etc.)?',
        type: 'number',
        tightenBy: 0.2,
      },
    ],
    timelineWeeks: [3, 6],
    parallelGroup: 'build',
    financeable: true,
    financingTermMonths: 12,
    suggestsWith: ['admin-portal', 'api-connection', 'hosting-enterprise'],
    excludes: ['single-page', 'react-nextjs-site'],
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'mobile-app',
    category: 'your-website',
    name: 'Mobile App (iOS & Android)',
    benefit: 'One codebase, both stores, AI-accelerated.',
    aiBadge: 'Cross-platform, one codebase',
    type: 'one-time',
    baseRange: [800000, 1800000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [4, 8],
    parallelGroup: 'build',
    financeable: true,
    financingTermMonths: 12,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'additional-pages',
    category: 'your-website',
    name: 'Additional Core Pages',
    benefit: 'Extra pages for your site.',
    aiBadge: 'AI-drafted, developer-polished',
    type: 'one-time',
    baseRange: [7500, 15000],
    quantifiable: true,
    quantityLabel: 'pages',
    perUnitRange: [7500, 15000],
    defaultQuantity: 3,
    minQuantity: 1,
    maxQuantity: 50,
    narrowingFactors: [
      {
        id: 'content_provided',
        question: 'Will you provide the page content, or does DSIG write it?',
        type: 'select',
        options: ['client-provides', 'ai-drafts-client-approves', 'dsig-writes'],
        tightenBy: 0.25,
      },
    ],
    timelineWeeks: [1, 2],
    parallelGroup: 'content',
    dependsOn: ['react-nextjs-site'],
    financeable: true,
    requiresBase: true,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'ui-ux-design',
    category: 'your-website',
    name: 'UI/UX Design',
    benefit: 'Conversion-optimized, mobile-first design.',
    aiBadge: 'Conversion-optimized, mobile-first',
    type: 'one-time',
    baseRange: [150000, 400000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [1, 3],
    parallelGroup: 'design',
    financeable: true,
    phase: 1,
    availableForBid: true,
    available: true,
  },

  // ──────────────── Existing Site Services ────────────────
  {
    id: 'fractional-webmaster',
    category: 'existing-site',
    name: 'Fractional Webmaster',
    benefit: 'Your pro on call for site updates, security, and fixes.',
    aiBadge: 'Your pro on call for updates',
    type: 'monthly',
    baseRange: [0, 0],
    monthlyRange: [20000, 50000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [0, 1],
    parallelGroup: 'ongoing',
    financeable: false,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'site-restyle',
    category: 'existing-site',
    name: 'Site Restyle (legacy platform)',
    benefit: 'Fresh look for an existing WordPress/Wix/Squarespace site — NOT our recommendation. React/Next.js is faster, cheaper, and AI-native. Use this item only when prospect insists on keeping their current platform.',
    aiBadge: 'Bridge service — we recommend React rebuild instead',
    type: 'one-time',
    baseRange: [150000, 400000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [2, 4],
    parallelGroup: 'design',
    financeable: true,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'performance-optimization',
    category: 'existing-site',
    name: 'Performance Optimization',
    benefit: 'Faster load times. Better Core Web Vitals.',
    aiBadge: 'Speed, Core Web Vitals, mobile',
    type: 'one-time',
    baseRange: [50000, 150000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [1, 2],
    parallelGroup: 'build',
    financeable: false,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'seo-retrofit',
    category: 'existing-site',
    name: 'SEO Retrofit',
    benefit: 'Schema, meta, structure, and sitemap on an existing site.',
    aiBadge: 'Schema, meta, structure, sitemap',
    type: 'one-time',
    baseRange: [80000, 200000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [2, 3],
    parallelGroup: 'seo',
    financeable: true,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'content-migration',
    category: 'existing-site',
    name: 'Content Migration to React/Next.js',
    benefit: 'Move everything from WordPress/Wix/Squarespace to our modern AI-native stack — no SEO loss, dramatically faster site, built for LLM citation.',
    aiBadge: 'Migrate to the stack that AI can actually crawl',
    type: 'one-time',
    baseRange: [50000, 200000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [1, 3],
    parallelGroup: 'content',
    financeable: true,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'ai-integration-existing',
    category: 'existing-site',
    name: 'AI Integration (Existing Site)',
    benefit: 'Add chatbot, automation, and AI tools to your current site.',
    aiBadge: 'Add AI tools without a rebuild',
    type: 'one-time',
    baseRange: [80000, 250000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [1, 3],
    parallelGroup: 'ai-setup',
    financeable: true,
    phase: 1,
    availableForBid: true,
    available: true,
  },

  // ──────────────── Features & Integrations ────────────────
  {
    id: 'api-connection',
    category: 'features-integrations',
    name: 'API Connection',
    benefit: 'Connect any external system to your site.',
    aiBadge: 'Plug into any system',
    type: 'one-time',
    baseRange: [40000, 120000],
    quantifiable: true,
    quantityLabel: 'integrations',
    perUnitRange: [40000, 120000],
    defaultQuantity: 1,
    minQuantity: 1,
    maxQuantity: 20,
    narrowingFactors: [
      {
        id: 'api_complexity',
        question: 'Simple REST API, or OAuth + webhooks + real-time?',
        type: 'select',
        options: ['simple-rest', 'oauth-required', 'realtime-webhooks'],
        tightenBy: 0.3,
      },
      {
        id: 'provider_has_docs',
        question: 'Does the third-party provide clear API docs?',
        type: 'boolean',
        tightenBy: 0.15,
      },
    ],
    timelineWeeks: [1, 2],
    parallelGroup: 'build',
    financeable: true,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'admin-portal',
    category: 'features-integrations',
    name: 'Backend Admin Portal',
    benefit: 'Manage your business data without touching code.',
    aiBadge: 'Manage your business data',
    type: 'one-time',
    baseRange: [40000, 120000],
    quantifiable: false,
    narrowingFactors: [
      {
        id: 'entity_count',
        question: 'How many data types to manage (users, orders, posts, etc.)?',
        type: 'number',
        tightenBy: 0.3,
      },
      {
        id: 'roles_required',
        question: 'Need multiple user roles with different permissions?',
        type: 'boolean',
        tightenBy: 0.2,
      },
    ],
    timelineWeeks: [1, 3],
    parallelGroup: 'build',
    financeable: true,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'customer-portal',
    category: 'features-integrations',
    name: 'Customer Portal',
    benefit: 'Self-service for your clients.',
    aiBadge: 'Self-service for your clients',
    type: 'one-time',
    baseRange: [40000, 120000],
    quantifiable: false,
    narrowingFactors: [
      {
        id: 'portal_features',
        question: 'Core portal features — just profile + messaging, or also booking/payments/documents?',
        type: 'select',
        options: ['basic-profile-messaging', 'plus-booking', 'plus-payments-docs', 'full-stack'],
        tightenBy: 0.3,
      },
      {
        id: 'auth_strategy',
        question: 'Email/password, OAuth, or SSO integration?',
        type: 'select',
        options: ['email-password', 'oauth-google-facebook', 'sso-enterprise'],
        tightenBy: 0.15,
      },
    ],
    timelineWeeks: [1, 3],
    parallelGroup: 'build',
    financeable: true,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'semantic-layers',
    category: 'features-integrations',
    name: 'Semantic Site Layers',
    benefit: 'Serve humans, bots, and AI crawlers the right content.',
    aiBadge: 'Human + bot + AI layers',
    type: 'one-time',
    baseRange: [80000, 140000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [1, 2],
    parallelGroup: 'seo',
    financeable: true,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'custom-functionality',
    category: 'features-integrations',
    name: 'Custom App Functionality',
    benefit: 'Custom features built to your spec.',
    aiBadge: 'Built to your spec',
    type: 'one-time',
    baseRange: [40000, 120000],
    quantifiable: true,
    quantityLabel: 'modules',
    perUnitRange: [40000, 120000],
    defaultQuantity: 1,
    minQuantity: 1,
    maxQuantity: 20,
    narrowingFactors: [],
    timelineWeeks: [1, 4],
    parallelGroup: 'build',
    financeable: true,
    phase: 1,
    availableForBid: true,
    available: true,
  },

  // ──────────────── Get Found ────────────────
  {
    id: 'local-seo',
    category: 'get-found',
    name: 'Local SEO',
    benefit: 'Dominate the Map Pack in every city you serve.',
    aiBadge: 'AI monitors, team optimizes',
    type: 'both',
    baseRange: [50000, 120000],
    monthlyRange: [20000, 40000],
    quantifiable: false,
    narrowingFactors: [
      {
        id: 'city-count',
        question: 'How many cities or service areas?',
        type: 'number',
        tightenBy: 0.3,
      },
    ],
    timelineWeeks: [2, 4],
    parallelGroup: 'seo',
    financeable: true,
    suggestsWith: ['gbp-setup', 'citations', 'long-tail-pages'],
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'long-tail-pages',
    category: 'get-found',
    name: 'Long-Tail Landing Pages',
    benefit: 'One page per city × service — 24x more chances to rank locally.',
    aiBadge: 'AI-generated, developer-reviewed',
    type: 'one-time',
    baseRange: [2000, 3500],
    quantifiable: true,
    quantityLabel: 'pages',
    perUnitRange: [2000, 3500],
    defaultQuantity: 12,
    minQuantity: 1,
    maxQuantity: 1000,
    narrowingFactors: [
      {
        id: 'city-service-grid',
        question: 'Cities × services — how many combinations?',
        type: 'number',
        tightenBy: 0.4,
      },
    ],
    timelineWeeks: [1, 2],
    parallelGroup: 'seo',
    financeable: true,
    suggestsWith: ['local-seo'],
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'geo-aeo-llm',
    category: 'get-found',
    name: 'GEO/AEO/LLM Optimization',
    benefit: 'Get cited by ChatGPT, Claude, Gemini, and Perplexity.',
    aiBadge: 'Get cited by ChatGPT & Gemini',
    type: 'both',
    baseRange: [80000, 140000],
    monthlyRange: [25000, 50000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [2, 3],
    parallelGroup: 'seo',
    financeable: true,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'gbp-setup',
    category: 'get-found',
    name: 'Google Business Profile',
    benefit: 'Full setup + optimization for Map Pack visibility.',
    aiBadge: 'Full setup + optimization',
    type: 'one-time',
    baseRange: [20000, 45000],
    quantifiable: false,
    narrowingFactors: [
      {
        id: 'location-count',
        question: 'How many business locations?',
        type: 'number',
        tightenBy: 0.3,
      },
    ],
    timelineWeeks: [1, 2],
    parallelGroup: 'seo',
    financeable: false,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'citations',
    category: 'get-found',
    name: 'Citation Sites',
    benefit: 'Consistent NAP across directories — boosts local rankings.',
    aiBadge: 'Consistent NAP everywhere',
    type: 'one-time',
    baseRange: [2000, 4500],
    quantifiable: true,
    quantityLabel: 'citations',
    perUnitRange: [2000, 4500],
    defaultQuantity: 20,
    minQuantity: 5,
    maxQuantity: 200,
    narrowingFactors: [],
    timelineWeeks: [1, 2],
    parallelGroup: 'seo',
    financeable: false,
    suggestsWith: ['local-seo', 'gbp-setup'],
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'geo-targeting',
    category: 'get-found',
    name: 'Geo-Targeting Campaigns',
    benefit: 'Zip-code-precision ad targeting.',
    aiBadge: 'Zip-code precision',
    type: 'monthly',
    baseRange: [0, 0],
    monthlyRange: [30000, 80000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [1, 2],
    parallelGroup: 'ongoing',
    financeable: false,
    phase: 1,
    availableForBid: true,
    available: true,
  },

  // ──────────────── Content & Social ────────────────
  {
    id: 'auto-blogging',
    category: 'content-social',
    name: 'AI Auto-Blogging',
    benefit: 'AI writes, team reviews, SEO-optimized — every week.',
    aiBadge: 'AI writes, team reviews',
    type: 'monthly',
    baseRange: [0, 0],
    monthlyRange: [20000, 50000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [1, 2],
    parallelGroup: 'ongoing',
    financeable: false,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'catchup-blogs',
    category: 'content-social',
    name: 'Catchup Blog Posts',
    benefit: 'Close the content gap fast — one-time batch.',
    aiBadge: 'Close the content gap fast',
    type: 'one-time',
    baseRange: [12500, 22500],
    quantifiable: true,
    quantityLabel: 'posts',
    perUnitRange: [12500, 22500],
    defaultQuantity: 8,
    minQuantity: 1,
    maxQuantity: 100,
    narrowingFactors: [],
    timelineWeeks: [1, 2],
    parallelGroup: 'content',
    financeable: true,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'automated-posts',
    category: 'content-social',
    name: 'Automated Blog Posts',
    benefit: 'AI pipeline, team-reviewed — per-post pricing.',
    aiBadge: 'AI pipeline, team-reviewed',
    type: 'monthly',
    baseRange: [0, 0],
    monthlyRange: [2000, 5500],
    quantifiable: true,
    quantityLabel: 'posts/mo',
    perUnitRange: [2000, 5500],
    defaultQuantity: 4,
    minQuantity: 1,
    maxQuantity: 60,
    narrowingFactors: [],
    timelineWeeks: [0, 1],
    parallelGroup: 'ongoing',
    financeable: false,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'social-automation',
    category: 'content-social',
    name: 'Social Media Automation',
    benefit: 'Site to social, hands-free — per platform.',
    aiBadge: 'Site to social, hands-free',
    type: 'monthly',
    baseRange: [0, 0],
    monthlyRange: [12500, 22500],
    quantifiable: true,
    quantityLabel: 'platforms',
    perUnitRange: [12500, 22500],
    defaultQuantity: 2,
    minQuantity: 1,
    maxQuantity: 10,
    narrowingFactors: [],
    timelineWeeks: [1, 2],
    parallelGroup: 'ongoing',
    financeable: false,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'social-integration',
    category: 'content-social',
    name: 'Social Media Integration',
    benefit: 'Social feeds displayed on your site.',
    aiBadge: 'Social feeds on your site',
    type: 'one-time',
    baseRange: [4000, 12500],
    quantifiable: true,
    quantityLabel: 'platforms',
    perUnitRange: [4000, 12500],
    defaultQuantity: 2,
    minQuantity: 1,
    maxQuantity: 10,
    narrowingFactors: [],
    timelineWeeks: [0, 1],
    parallelGroup: 'build',
    financeable: false,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'review-responders',
    category: 'content-social',
    name: 'AI Review Auto-Responders',
    benefit: 'Every review answered, 24/7, in your brand voice.',
    aiBadge: 'Every review answered 24/7',
    type: 'monthly',
    baseRange: [0, 0],
    monthlyRange: [17500, 22500],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [0, 1],
    parallelGroup: 'ongoing',
    financeable: false,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'content-repurposing',
    category: 'content-social',
    name: 'AI Content Repurposing',
    benefit: 'One piece becomes ten — across channels.',
    aiBadge: 'One piece becomes ten',
    type: 'monthly',
    baseRange: [0, 0],
    monthlyRange: [20000, 45000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [1, 2],
    parallelGroup: 'ongoing',
    financeable: false,
    phase: 1,
    availableForBid: true,
    available: true,
  },

  // ──────────────── AI & Automation ────────────────
  {
    id: 'ai-strategy',
    category: 'ai-automation',
    name: 'AI Adoption Strategy',
    benefit: 'Roadmap + ROI analysis for AI in your business.',
    aiBadge: 'Roadmap + ROI analysis',
    type: 'one-time',
    baseRange: [120000, 300000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [2, 3],
    parallelGroup: 'research',
    financeable: true,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'ai-workforce',
    category: 'ai-automation',
    name: 'AI Workforce Automation',
    benefit: 'Replace manual processes with autonomous agents.',
    aiBadge: 'Replace manual processes',
    type: 'one-time',
    baseRange: [200000, 600000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [3, 6],
    parallelGroup: 'ai-setup',
    financeable: true,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'ai-infrastructure',
    category: 'ai-automation',
    name: 'AI Agent Infrastructure',
    benefit: 'Deploy, monitor, and scale AI agents.',
    aiBadge: 'Deploy, monitor, scale',
    type: 'both',
    baseRange: [200000, 500000],
    monthlyRange: [40000, 100000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [2, 4],
    parallelGroup: 'ai-setup',
    financeable: true,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'ai-outreach',
    category: 'ai-automation',
    name: 'AI Powered Outreach',
    benefit: 'Personalized outreach at scale.',
    aiBadge: 'Personalized at scale',
    type: 'both',
    baseRange: [150000, 400000],
    monthlyRange: [30000, 80000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [2, 4],
    parallelGroup: 'ai-setup',
    financeable: true,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'ai-swarms',
    category: 'ai-automation',
    name: 'AI Agent Swarms',
    benefit: 'Coordinated AI workforce.',
    aiBadge: 'Coordinated AI workforce',
    type: 'both',
    baseRange: [300000, 800000],
    monthlyRange: [50000, 150000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [4, 8],
    parallelGroup: 'ai-setup',
    financeable: true,
    phase: 2,
    availableForBid: true,
    available: true,
  },
  {
    id: 'private-llm',
    category: 'ai-automation',
    name: 'Private LLM Setup',
    benefit: 'Your data stays yours. Private deployment.',
    aiBadge: 'Your data stays yours',
    type: 'one-time',
    baseRange: [400000, 1200000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [3, 8],
    parallelGroup: 'ai-setup',
    financeable: true,
    phase: 2,
    availableForBid: true,
    available: true,
  },
  {
    id: 'clawbot',
    category: 'ai-automation',
    name: 'Clawbot Setup',
    benefit: 'Competitive intelligence agent.',
    aiBadge: 'Competitive intelligence',
    type: 'one-time',
    baseRange: [150000, 400000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [2, 4],
    parallelGroup: 'ai-setup',
    financeable: true,
    phase: 1,
    availableForBid: true,
    available: true,
  },

  // ──────────────── Research & Strategy (FREE invoiced at 100% discount) ────────────────
  {
    id: 'market-research',
    category: 'research-strategy',
    name: 'Market Research Report',
    benefit: 'Industry + opportunity analysis.',
    aiBadge: 'Industry + opportunity analysis',
    type: 'one-time',
    baseRange: [40000, 60000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [0, 1],
    parallelGroup: 'research',
    financeable: false,
    phase: 1,
    availableForBid: false,
    available: true,
    isFree: true,
    displayPriceCents: 50000, // $500 — shown on Restaurant Rule invoices before 100% discount
  },
  {
    id: 'competitor-analysis',
    category: 'research-strategy',
    name: 'Competitor Analysis',
    benefit: 'Know your competition.',
    aiBadge: 'Know your competition',
    type: 'one-time',
    baseRange: [40000, 60000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [0, 1],
    parallelGroup: 'research',
    financeable: false,
    phase: 1,
    availableForBid: false,
    available: true,
    isFree: true,
    displayPriceCents: 50000, // $500
  },
  {
    id: 'site-social-audit',
    category: 'research-strategy',
    name: 'Current Site & Social Audit',
    benefit: 'Know exactly where you stand.',
    aiBadge: 'Know exactly where you stand',
    type: 'one-time',
    baseRange: [30000, 50000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [0, 1],
    parallelGroup: 'research',
    financeable: false,
    phase: 1,
    availableForBid: false,
    available: true,
    isFree: true,
    displayPriceCents: 75000, // $750 — combined site + social audit
  },
  {
    id: 'project-plan',
    category: 'research-strategy',
    name: 'Comprehensive Project Plan',
    benefit: 'Full scope + roadmap. Free with any paid project.',
    aiBadge: 'Full scope + roadmap',
    type: 'one-time',
    baseRange: [80000, 120000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [1, 2],
    parallelGroup: 'research',
    financeable: false,
    phase: 1,
    availableForBid: false,
    available: true,
    isFree: true,
    freeWithPaidProject: true,
  },

  // ──────────────── Monthly Services ────────────────
  {
    id: 'site-admin',
    category: 'monthly-services',
    name: 'Site Admin Services',
    benefit: 'Updates, security, content edits.',
    aiBadge: 'Updates, security, content edits',
    type: 'monthly',
    baseRange: [0, 0],
    monthlyRange: [8500, 45000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [0, 1],
    parallelGroup: 'ongoing',
    financeable: false,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'review-admin',
    category: 'monthly-services',
    name: 'Review Admin Services',
    benefit: 'Monitoring + management of reviews across platforms.',
    aiBadge: 'Monitoring + management',
    type: 'monthly',
    baseRange: [0, 0],
    monthlyRange: [17500, 22500],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [0, 1],
    parallelGroup: 'ongoing',
    financeable: false,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'analytics',
    category: 'monthly-services',
    name: 'Analytics Package',
    benefit: 'DNS analytics, session replays, heatmaps.',
    aiBadge: 'DNS analytics, replays, heatmaps',
    type: 'monthly',
    baseRange: [0, 0],
    monthlyRange: [2000, 8500],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [0, 1],
    parallelGroup: 'ongoing',
    financeable: false,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'google-admin',
    category: 'monthly-services',
    name: 'Google Admin & Updates',
    benefit: 'GBP, Search Console, ads — managed.',
    aiBadge: 'GBP, search console, ads',
    type: 'monthly',
    baseRange: [0, 0],
    monthlyRange: [20000, 27500],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [0, 1],
    parallelGroup: 'ongoing',
    financeable: false,
    phase: 1,
    availableForBid: true,
    available: true,
  },

  // ──────────────── Hosting ────────────────
  {
    id: 'hosting-php',
    category: 'hosting',
    name: 'PHP Server',
    benefit: 'Shared hosting — suitable for single-page sites.',
    aiBadge: 'Shared hosting, single page',
    type: 'monthly',
    baseRange: [0, 0],
    monthlyRange: [1500, 2500],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [0, 1],
    parallelGroup: 'ongoing',
    financeable: false,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'hosting-node',
    category: 'hosting',
    name: 'Node.js Server',
    benefit: 'Edge-deployed app hosting with global CDN.',
    aiBadge: 'App hosting, edge-deployed',
    type: 'monthly',
    baseRange: [0, 0],
    monthlyRange: [3500, 5000],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [0, 1],
    parallelGroup: 'ongoing',
    financeable: false,
    phase: 1,
    availableForBid: true,
    available: true,
  },
  {
    id: 'hosting-enterprise',
    category: 'hosting',
    name: 'Enterprise Stack',
    benefit: 'Full infrastructure with dedicated resources.',
    aiBadge: 'Full infrastructure',
    type: 'monthly',
    baseRange: [0, 0],
    monthlyRange: [8500, 12500],
    quantifiable: false,
    narrowingFactors: [],
    timelineWeeks: [0, 1],
    parallelGroup: 'ongoing',
    financeable: false,
    phase: 1,
    availableForBid: true,
    available: true,
  },
] as const

// ============================================================
// Validation — runs on first import. Throws if catalog invariants break.
// ============================================================

const narrowingFactorSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  type: z.enum(['number', 'select', 'boolean']),
  options: z.array(z.string()).optional(),
  tightenBy: z.number().min(0).max(1).optional(),
  shiftMultiplier: z.number().positive().optional(),
})

const pricingItemSchema = z.object({
  id: z.string().min(1),
  category: z.enum([
    'your-website',
    'existing-site',
    'features-integrations',
    'get-found',
    'content-social',
    'ai-automation',
    'research-strategy',
    'monthly-services',
    'hosting',
    'team-rates',
  ]),
  name: z.string().min(1),
  benefit: z.string().min(1),
  aiBadge: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['one-time', 'monthly', 'both']),
  baseRange: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]),
  monthlyRange: z
    .tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])
    .optional(),
  quantifiable: z.boolean(),
  quantityLabel: z.string().optional(),
  perUnitRange: z
    .tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])
    .optional(),
  defaultQuantity: z.number().int().positive().optional(),
  minQuantity: z.number().int().positive().optional(),
  maxQuantity: z.number().int().positive().optional(),
  narrowingFactors: z.array(narrowingFactorSchema),
  timelineWeeks: z.tuple([z.number().nonnegative(), z.number().nonnegative()]),
  parallelGroup: z.enum([
    'design',
    'build',
    'content',
    'seo',
    'ai-setup',
    'research',
    'launch',
    'ongoing',
  ]),
  dependsOn: z.array(z.string()).optional(),
  financeable: z.boolean(),
  financingTermMonths: z.number().int().positive().optional(),
  suggestsWith: z.array(z.string()).optional(),
  requiresBase: z.boolean().optional(),
  excludes: z.array(z.string()).optional(),
  phase: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  availableForBid: z.boolean(),
  available: z.boolean(),
  isFree: z.boolean().optional(),
  freeWithPaidProject: z.boolean().optional(),
})

function validateCatalog(items: readonly PricingItem[]): void {
  const idSet = new Set<string>()

  for (const item of items) {
    pricingItemSchema.parse(item)

    if (idSet.has(item.id)) {
      throw new Error(`Duplicate catalog id: ${item.id}`)
    }
    idSet.add(item.id)

    if (item.baseRange[0] > item.baseRange[1]) {
      throw new Error(`${item.id}: baseRange low > high`)
    }
    if (item.monthlyRange && item.monthlyRange[0] > item.monthlyRange[1]) {
      throw new Error(`${item.id}: monthlyRange low > high`)
    }
    if (item.timelineWeeks[0] > item.timelineWeeks[1]) {
      throw new Error(`${item.id}: timelineWeeks low > high`)
    }

    if (item.quantifiable) {
      if (!item.perUnitRange) throw new Error(`${item.id}: quantifiable requires perUnitRange`)
      if (!item.quantityLabel) throw new Error(`${item.id}: quantifiable requires quantityLabel`)
      if (item.perUnitRange[0] > item.perUnitRange[1]) {
        throw new Error(`${item.id}: perUnitRange low > high`)
      }
    }

    if (item.type === 'both' || item.type === 'monthly') {
      if (!item.monthlyRange) {
        throw new Error(`${item.id}: type=${item.type} requires monthlyRange`)
      }
    }
  }

  // Second pass — validate cross-references.
  for (const item of items) {
    for (const ref of item.suggestsWith ?? []) {
      if (!idSet.has(ref)) {
        throw new Error(`${item.id}.suggestsWith contains unknown id: ${ref}`)
      }
    }
    for (const ref of item.excludes ?? []) {
      if (!idSet.has(ref)) {
        throw new Error(`${item.id}.excludes contains unknown id: ${ref}`)
      }
      if (ref === item.id) {
        throw new Error(`${item.id}.excludes contains itself`)
      }
    }
    for (const ref of item.dependsOn ?? []) {
      if (!idSet.has(ref)) {
        throw new Error(`${item.id}.dependsOn contains unknown id: ${ref}`)
      }
      if (ref === item.id) {
        throw new Error(`${item.id}.dependsOn contains itself`)
      }
    }
  }

  // Third pass — check for dependsOn cycles (simple DFS).
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const byId = new Map(items.map((i) => [i.id, i]))

  function visit(id: string, path: string[]): void {
    if (visited.has(id)) return
    if (visiting.has(id)) {
      throw new Error(`Catalog dependsOn cycle: ${[...path, id].join(' → ')}`)
    }
    visiting.add(id)
    const node = byId.get(id)
    for (const dep of node?.dependsOn ?? []) {
      visit(dep, [...path, id])
    }
    visiting.delete(id)
    visited.add(id)
  }

  for (const item of items) visit(item.id, [])
}

validateCatalog(CATALOG)

// ============================================================
// Public API
// ============================================================

export function getCatalog(): readonly PricingItem[] {
  return CATALOG
}

export function getItem(id: string): PricingItem | undefined {
  return CATALOG.find((item) => item.id === id)
}

/** Alias for getItem — exists for naming consistency with Plan 3. */
export function getItemById(id: string): PricingItem | undefined {
  return getItem(id)
}

/**
 * Returns the perceived $ value (in cents) to display on invoice line items.
 * Explicit `displayPriceCents` wins; otherwise midpoint of baseRange.
 * Used for Restaurant Rule invoices to show value before 100% discount.
 */
export function getDisplayPriceCents(item: PricingItem): number {
  if (typeof item.displayPriceCents === 'number') return item.displayPriceCents
  const [lo, hi] = item.baseRange
  return Math.round((lo + hi) / 2)
}

export function getItemsByCategory(category: QuoteCategory): readonly PricingItem[] {
  return CATALOG.filter((item) => item.category === category)
}

export function getItemsForPhase(phase: 1 | 2 | 3): readonly PricingItem[] {
  return CATALOG.filter((item) => item.phase <= phase && item.available)
}

export function getFreeItems(): readonly PricingItem[] {
  return CATALOG.filter((item) => item.isFree === true)
}

export function getBidEligibleItems(): readonly PricingItem[] {
  return CATALOG.filter((item) => item.availableForBid && item.available)
}

/**
 * Returns true if the given set of item IDs has any mutual exclusions.
 */
export function findExclusionConflicts(selectedIds: readonly string[]): string[][] {
  const conflicts: string[][] = []
  const selected = new Set(selectedIds)
  for (const id of selectedIds) {
    const item = getItem(id)
    if (!item?.excludes) continue
    for (const excluded of item.excludes) {
      if (selected.has(excluded)) {
        conflicts.push([id, excluded].sort())
      }
    }
  }
  return Array.from(new Set(conflicts.map((c) => c.join('::')))).map((s) => s.split('::'))
}

/**
 * Returns true if the selection includes at least one item that satisfies
 * requiresBase=true items (any "your-website" category one-time build).
 */
export function hasBaseWebsite(selectedIds: readonly string[]): boolean {
  return selectedIds.some((id) => {
    const item = getItem(id)
    if (!item) return false
    return (
      item.category === 'your-website' &&
      item.type === 'one-time' &&
      !item.quantifiable &&
      item.id !== 'additional-pages' &&
      item.id !== 'ui-ux-design'
    )
  })
}
