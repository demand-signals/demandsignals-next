/**
 * Per-page content configurations for long-tail LTP (location + service) pages.
 *
 * Each entry maps a city-service slug to a unique arrangement and mix of
 * content sections. Sections are deliberately varied in type, order, and
 * count across pages so that no two pages read as templated duplicates —
 * this is what makes each page independently valuable to Google and to
 * AI answer engines (GEO/AEO).
 */

export type MarketSnapshotSection = {
  type: 'market-snapshot'
  headline: string
  stats: Array<{ value: string; label: string; detail: string }>
}

export type LocalContextSection = {
  type: 'local-context'
  headline: string
  paragraphs: string[]
}

export type ServiceDeepDiveSection = {
  type: 'service-deep-dive'
  headline: string
  intro: string
  features: Array<{ title: string; description: string }>
}

export type CompetitiveEdgeSection = {
  type: 'competitive-edge'
  headline: string
  intro: string
  advantages: Array<{ ours: string; theirs: string }>
}

export type ProcessFlowSection = {
  type: 'process-flow'
  headline: string
  steps: Array<{ number: string; title: string; detail: string }>
}

export type ResultsPreviewSection = {
  type: 'results-preview'
  headline: string
  intro: string
  metrics: Array<{ value: string; label: string; context: string }>
}

export type IndustrySpotlightSection = {
  type: 'industry-spotlight'
  headline: string
  industries: Array<{ name: string; challenge: string; solution: string }>
}

export type LtpSection =
  | MarketSnapshotSection
  | LocalContextSection
  | ServiceDeepDiveSection
  | CompetitiveEdgeSection
  | ProcessFlowSection
  | ResultsPreviewSection
  | IndustrySpotlightSection

export type LtpPageConfig = {
  heroSubtitle: string
  sections: LtpSection[]
}

const PAGE_CONFIGS: Record<string, LtpPageConfig> = {
  // ─────────────────────────────────────────────────────────────
  // 1. Roseville — Mobile Apps
  // ─────────────────────────────────────────────────────────────
  'roseville-mobile-apps': {
    heroSubtitle:
      "Roseville's retail corridor moves fast — the Galleria at Roseville and The Fountains draw shoppers who expect ordering, booking, and loyalty in an app, not a phone call. We build native iOS and Android apps that keep Roseville businesses in the pocket of the customers walking past their storefront.",
    sections: [
      {
        type: 'market-snapshot',
        headline: 'Roseville by the Numbers',
        stats: [
          { value: '147,000+', label: 'Roseville residents', detail: 'Placer County\'s largest city and the retail anchor of the I-80 corridor between Sacramento and the Sierra foothills.' },
          { value: '2', label: 'regional shopping centers', detail: 'The Galleria at Roseville and The Fountains at Roseville together draw shoppers from across five counties every weekend.' },
          { value: '71%', label: 'of local purchases start on mobile', detail: 'Roseville shoppers research, compare, and often order from a phone before they ever walk into a store.' },
          { value: '$1.4B+', label: 'in annual taxable retail sales', detail: 'Roseville consistently ranks among the top retail sales volumes in the greater Sacramento region.' },
        ],
      },
      {
        type: 'service-deep-dive',
        headline: 'Mobile Apps Built for Roseville Retail, Restaurants, and Medical Practices',
        intro:
          'A generic app template does not compete in a market this dense. DSIG designs and builds custom mobile apps engineered around the specific way Roseville customers order, book, and come back.',
        features: [
          { title: 'Native Ordering & Checkout', description: 'Full menu or catalog browsing with saved payment methods, built for restaurants and retailers near the Galleria and Fountains shopping districts.' },
          { title: 'Appointment & Table Booking', description: 'Real-time booking synced to your calendar — used by Roseville medical, dental, and salon clients to cut no-show rates.' },
          { title: 'Loyalty & Rewards Engine', description: 'Points, punch cards, and tiered rewards that live in the app customers already have open, driving repeat visits without a separate loyalty card.' },
          { title: 'Push Notification Campaigns', description: 'Targeted alerts for promotions, restocks, and appointment reminders sent directly to opted-in Roseville customers.' },
          { title: 'POS & Inventory Integration', description: 'Connects to the systems Roseville retailers already run so in-app orders sync with in-store inventory in real time.' },
        ],
      },
      {
        type: 'process-flow',
        headline: 'From Concept to App Store in Weeks, Not Months',
        steps: [
          { number: '01', title: 'Discovery & Scope', detail: 'We map the exact customer journey — ordering, booking, or loyalty — specific to your Roseville business model.' },
          { number: '02', title: 'Design & Prototype', detail: 'Interactive prototypes reviewed and refined with you before a single line of production code is written.' },
          { number: '03', title: 'Native Development', detail: 'Parallel iOS and Android builds using Next.js-connected backends and the same infrastructure that powers your website.' },
          { number: '04', title: 'App Store Launch', detail: 'Full submission handling for Apple App Store and Google Play, including listing optimization for Roseville-area search terms.' },
          { number: '05', title: 'Post-Launch Iteration', detail: 'Usage data from your first weeks live drives a round of refinements before we call the build complete.' },
        ],
      },
      {
        type: 'results-preview',
        headline: 'What Roseville Businesses See After Launch',
        intro: 'Mobile apps convert differently than a website — here is the kind of movement clients typically see in their first quarter live.',
        metrics: [
          { value: '3.4x', label: 'more repeat orders', context: 'compared to walk-in-only Roseville customers, driven by loyalty and push notification features' },
          { value: '28%', label: 'higher average order value', context: 'from in-app upsells and saved-payment checkout convenience' },
          { value: '14 days', label: 'typical App Store approval time', context: 'from final build submission to live listing for both iOS and Android' },
          { value: '61%', label: 'of orders placed via app within 90 days', context: 'once customers download and use the app for a first purchase' },
        ],
      },
      {
        type: 'industry-spotlight',
        headline: 'Industries We Build Roseville Apps For',
        industries: [
          { name: 'Restaurants', challenge: 'Third-party delivery apps take 20-30% commission on every order placed near the Galleria dining corridor.', solution: 'A branded ordering app keeps full margin in-house while still offering the convenience customers expect.' },
          { name: 'Medical & Dental', challenge: 'Phone-only scheduling creates missed calls and no-shows across Roseville\'s dense medical office parks.', solution: 'Self-service booking with automated reminders cuts no-shows and frees front-desk staff for in-person patients.' },
          { name: 'Retail Boutiques', challenge: 'Independent Roseville shops compete against the Galleria\'s national chains on convenience, not just price.', solution: 'A loyalty-driven app gives boutiques the same "always in your pocket" presence as the mall anchors.' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 2. Sutter Creek — Geo-Targeting
  // ─────────────────────────────────────────────────────────────
  'sutter-creek-geo-targeting': {
    heroSubtitle:
      "Most Sutter Creek customers decide where to eat, taste, and stay while still sitting in Sacramento or the Bay Area. Our geo-targeting puts your business in front of those travelers during the planning window — days before they drive up Highway 49.",
    sections: [
      {
        type: 'local-context',
        headline: 'A Gold Country Town Built on Out-of-Town Visitors',
        paragraphs: [
          'Sutter Creek is Amador County\'s most walkable historic town — a Main Street of wine tasting rooms, antique shops, and bed-and-breakfasts housed in 1850s-era buildings. Unlike suburban markets, almost none of Sutter Creek\'s commercial revenue comes from residents; the town\'s population sits under 3,000.',
          'Nearly every dollar spent on Main Street originates from someone who researched the trip from Sacramento, Stockton, or the Bay Area days or weeks in advance. That means the moment of decision — which tasting room, which B&B, which restaurant — happens on a phone long before the visitor arrives in Amador County.',
        ],
      },
      {
        type: 'market-snapshot',
        headline: 'Sutter Creek Visitor Economy Snapshot',
        stats: [
          { value: '2,800', label: 'year-round residents', detail: 'A town this small depends almost entirely on visitor spending, not local foot traffic.' },
          { value: '90 min', label: 'average drive from Sacramento', detail: 'Most Sutter Creek visitors are Sacramento or Bay Area day-trippers or weekend travelers.' },
          { value: '40+', label: 'wine tasting rooms in the Shenandoah Valley AVA', detail: 'Sutter Creek sits at the gateway to Amador County\'s wine region, competing for the same visitor searches.' },
          { value: '3-5 days', label: 'typical trip-planning window', detail: 'Bay Area visitors typically finalize weekend plans within a work week of departure — the exact window geo-targeting reaches.' },
        ],
      },
      {
        type: 'competitive-edge',
        headline: 'Why Generic Local SEO Fails a Town Like Sutter Creek',
        intro: 'Sutter Creek businesses do not compete for searches from Sutter Creek residents — they compete for searches from Sacramento and the Bay Area, weeks before the trip.',
        advantages: [
          { ours: 'Geo-fenced ads targeting Sacramento and Bay Area zip codes during typical trip-planning windows', theirs: 'Standard local SEO that only surfaces once a searcher is already near Amador County' },
          { ours: 'Messaging built around "day trip from Sacramento" and "Gold Country weekend" search intent', theirs: 'Generic business listings with no awareness of where the customer is actually searching from' },
          { ours: 'Retargeting visitors who researched Amador County wineries but haven\'t booked yet', theirs: 'One-time ad spend with no follow-up to travelers still deciding' },
          { ours: 'Coordinated targeting across Sutter Creek, Jackson, and the wider Shenandoah Valley AVA', theirs: 'Single-location targeting that ignores how visitors plan multi-stop Gold Country trips' },
        ],
      },
      {
        type: 'service-deep-dive',
        headline: 'Geo-Targeting Built for a Destination Town',
        intro: 'DSIG\'s geo-targeting service reaches travelers by origin, not just destination — critical for a town where almost every customer is from somewhere else.',
        features: [
          { title: 'Origin-Based Ad Targeting', description: 'Ads served specifically to Sacramento metro and Bay Area users, not a generic radius around Sutter Creek.' },
          { title: 'Trip-Planning Window Timing', description: 'Campaigns tuned to the Tuesday-through-Thursday window when weekend Gold Country trips typically get planned.' },
          { title: 'Multi-Stop Itinerary Capture', description: 'Targeting built around the reality that Sutter Creek visitors are also searching Jackson, Amador City, and Plymouth.' },
          { title: 'Geo-Aware Landing Pages', description: 'Dedicated pages that speak directly to "day trip from Sacramento" and "Bay Area wine weekend" searchers.' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 3. Elk Grove — AI Content Generation
  // ─────────────────────────────────────────────────────────────
  'elk-grove-ai-content-generation': {
    heroSubtitle:
      "Elk Grove is Sacramento County's second-largest city and one of the most ethnically diverse communities in California. AI content generation lets Elk Grove businesses produce the volume and variety of content needed to speak authentically to a multicultural, family-oriented customer base.",
    sections: [
      {
        type: 'market-snapshot',
        headline: 'Elk Grove Market Snapshot',
        stats: [
          { value: '180,000+', label: 'Elk Grove residents', detail: 'Sacramento County\'s second-largest city, having grown from roughly 72,000 residents in 2000.' },
          { value: '1 of the most diverse', label: 'cities in California', detail: 'Elk Grove regularly ranks among the most ethnically diverse mid-size cities in the state.' },
          { value: '2,000+ acres', label: 'District56 mixed-use development', detail: 'One of the largest development projects in the Sacramento region, bringing new retail and dining to Elk Grove Boulevard.' },
          { value: '4x', label: 'content output with AI generation', detail: 'Typical increase in publishable content volume DSIG clients see after adopting AI content generation.' },
        ],
      },
      {
        type: 'local-context',
        headline: 'A Family-Oriented, Multicultural Market',
        paragraphs: [
          'Elk Grove\'s population boom has been driven by families relocating for schools, affordability, and space relative to Sacramento proper. That growth has brought a wide mix of cultural backgrounds, languages, and shopping habits into a single, tightly clustered suburban market.',
          'Businesses along Elk Grove Boulevard and inside the emerging District56 development are competing for attention from a population that does not respond to one-size-fits-all messaging. Content that resonates with one segment of Elk Grove customers can fall flat with another just a few blocks away.',
        ],
      },
      {
        type: 'results-preview',
        headline: 'What AI Content Generation Delivers for Elk Grove Businesses',
        intro: 'Volume alone does not win in a market this diverse — relevance does. Here is what Elk Grove clients typically see.',
        metrics: [
          { value: '6x', label: 'content pieces per month', context: 'versus manual, single-writer content production' },
          { value: '3', label: 'audience-tailored content variants', context: 'per core piece, adapted for different Elk Grove community segments' },
          { value: '52%', label: 'increase in organic engagement', context: 'across social and blog channels within 90 days' },
          { value: '$0', label: 'added headcount required', context: 'to scale from one blog post a month to weekly, segmented content' },
        ],
      },
      {
        type: 'service-deep-dive',
        headline: 'AI Content Generation for a Diverse, Fast-Growing City',
        intro: 'DSIG\'s AI content generation service produces high volumes of on-brand content while tailoring tone, references, and cultural relevance for Elk Grove\'s varied audience segments.',
        features: [
          { title: 'Segmented Content Variants', description: 'The same core message adapted in tone and framing for different Elk Grove community segments without sounding templated.' },
          { title: 'Local Reference Integration', description: 'Content that naturally references Elk Grove landmarks — District56, Elk Grove Boulevard, Old Town Elk Grove — for local relevance.' },
          { title: 'Multi-Channel Output', description: 'Blog posts, social captions, and email content generated from a single content brief.' },
          { title: 'Brand-Voice Consistency', description: 'AI trained on your business\'s existing voice so output reads as genuinely yours, not generic AI copy.' },
          { title: 'Human Review Loop', description: 'Every piece routed through a review step before publishing — AI speed with a human approval gate.' },
        ],
      },
      {
        type: 'process-flow',
        headline: 'How We Get Elk Grove Businesses Publishing Consistently',
        steps: [
          { number: '01', title: 'Voice & Audience Mapping', detail: 'We document your brand voice and the distinct customer segments within Elk Grove you need to reach.' },
          { number: '02', title: 'Content Calendar Build', detail: 'A publishing calendar aligned to Elk Grove seasonal patterns, local events, and District56 development milestones.' },
          { number: '03', title: 'AI Generation & Variant Creation', detail: 'Core content generated and adapted into segment-specific variants for your review.' },
          { number: '04', title: 'Publish & Distribute', detail: 'Approved content pushed live across your website, blog, and social channels on schedule.' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 4. Auburn — AI Content Repurposing
  // ─────────────────────────────────────────────────────────────
  'auburn-ai-content-repurposing': {
    heroSubtitle:
      "Auburn's Old Town district and Sierra foothills recreation scene create bursts of seasonal content opportunity that most small businesses can't keep up with by hand. AI content repurposing turns one piece of Auburn content into a full slate of social posts, blog entries, and email content.",
    sections: [
      {
        type: 'local-context',
        headline: 'Auburn\'s Seasonal, Dual-Audience Economy',
        paragraphs: [
          'Auburn is the seat of Placer County and the last significant town before Highway 49 and I-80 climb into the Sierra Nevada foothills. Its Old Town district — a cluster of historic brick storefronts — draws both loyal locals and a steady stream of outdoor recreation travelers headed toward the American River, Foresthill, and eventually Tahoe.',
          'That dual audience means Auburn businesses need content that speaks to two very different readers within the same week: the local resident checking Old Town events, and the out-of-town rafting or trail-running visitor searching for gear and food before a weekend trip.',
        ],
      },
      {
        type: 'service-deep-dive',
        headline: 'One Piece of Content, Repurposed Across Every Channel',
        intro: 'DSIG\'s AI content repurposing service takes a single Auburn-focused piece — an event recap, a trail guide, a seasonal special — and reshapes it for every channel your customers actually use.',
        features: [
          { title: 'Blog-to-Social Transformation', description: 'A single Old Town event write-up becomes a week of Instagram, Facebook, and Google Business posts automatically.' },
          { title: 'Seasonal Content Multiplication', description: 'One seasonal specials post repurposed into email, social, and on-site landing page copy ahead of each shoulder season.' },
          { title: 'Trail & Event Guide Recycling', description: 'Outdoor recreation content — American River rafting guides, Auburn trail conditions — refreshed and redistributed as conditions change.' },
          { title: 'Format-Native Adaptation', description: 'Each repurposed piece is rebuilt for its destination format, not just copy-pasted — short-form for social, long-form for blog.' },
        ],
      },
      {
        type: 'competitive-edge',
        headline: 'Why Auburn Businesses Choose Repurposing Over Starting From Scratch',
        intro: 'Auburn\'s seasonal tourism economy punishes businesses that can\'t keep content fresh for both the Tevis Cup crowd and the Old Town regulars.',
        advantages: [
          { ours: 'One piece of content becomes 8-12 distributed assets across channels', theirs: 'Manual content creation that produces one piece per channel, if any' },
          { ours: 'Seasonal content refreshed automatically as trail and event conditions change', theirs: 'Stale seasonal posts left up months after they\'re relevant' },
          { ours: 'Dual-audience framing for both Auburn locals and outdoor recreation visitors', theirs: 'Single-audience content that misses half the actual customer base' },
          { ours: 'Consistent publishing cadence with minimal owner time investment', theirs: 'Sporadic posting driven by whenever the owner finds a spare hour' },
        ],
      },
      {
        type: 'results-preview',
        headline: 'Content Output Auburn Clients See',
        intro: 'Repurposing compounds — the more source content you create, the more distributed assets DSIG generates from it.',
        metrics: [
          { value: '10x', label: 'distributed assets', context: 'per original piece of Auburn-focused content' },
          { value: '5 hrs/week', label: 'owner time saved', context: 'compared to manually adapting content for each channel' },
          { value: '38%', label: 'more Google Business views', context: 'after consistent repurposed posting began' },
          { value: '2 seasons/year', label: 'automatic refresh cycles', context: 'aligned to Auburn\'s tourism shoulder seasons' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 5. Ione — Systems (Demand Gen Systems)
  // ─────────────────────────────────────────────────────────────
  'ione-systems': {
    heroSubtitle:
      "Ione's small, spread-out business community can't support a full-time marketing hire — but it can run on a demand generation system that works around the clock. DSIG builds Demand Gen Systems for Ione businesses that need to punch above the limits of a rural Amador County market.",
    sections: [
      {
        type: 'market-snapshot',
        headline: 'Ione Market Snapshot',
        stats: [
          { value: '~8,000', label: 'Ione residents', detail: 'A small Amador County town anchored by Preston Castle, Castle Oaks Golf Club, and the surrounding ranch land.' },
          { value: '<15', label: 'digitally active competitors', detail: 'Most Ione businesses have minimal or no organized digital marketing, leaving local search largely uncontested.' },
          { value: '25 min', label: 'drive to Jackson or Amador County services hub', detail: 'Ione residents and nearby ranch communities routinely travel for services, widening the addressable customer base.' },
          { value: '1 system', label: 'replaces a marketing hire', detail: 'A single Demand Gen System covers the work a small business would otherwise need a dedicated marketing employee to do.' },
        ],
      },
      {
        type: 'local-context',
        headline: 'An Underserved Digital Market',
        paragraphs: [
          'Ione is known locally for Preston Castle, the surrounding Mule Creek State Prison complex, and the ranch land that dominates the landscape around town. It is not a tourism destination in the way Sutter Creek or Jackson are, and its small population means most Ione businesses have historically relied on word of mouth.',
          'That has left the town\'s digital footprint thin. For the handful of Ione businesses willing to invest in organized demand generation, the barrier to dominating local search and capturing customers from Jackson, Sacramento, and the wider Amador County area is far lower than in a saturated market.',
        ],
      },
      {
        type: 'service-deep-dive',
        headline: 'A Complete Demand Generation System for Ione Businesses',
        intro: 'DSIG\'s Demand Gen Systems service builds the full stack — website, review management, content, and lead capture — as one connected system instead of scattered tools.',
        features: [
          { title: 'Unified Lead Capture', description: 'Every inquiry channel — website form, phone, Google Business — routed into a single system so no lead from Ione or surrounding areas gets lost.' },
          { title: 'Automated Review Requests', description: 'Systematic review generation that builds credibility fast in a market where most competitors have little to no online reputation.' },
          { title: 'Local Search Foundation', description: 'Google Business Profile and local SEO built to dominate a category where almost no other Ione business is competing digitally.' },
          { title: 'Ongoing Content Cadence', description: 'A steady drip of content that keeps your Ione business visible without requiring daily manual effort.' },
        ],
      },
      {
        type: 'process-flow',
        headline: 'How the Ione Demand Gen System Comes Together',
        steps: [
          { number: '01', title: 'Market & Competitor Audit', detail: 'We assess exactly how thin the digital competition is around Ione and the wider Amador County market.' },
          { number: '02', title: 'Foundation Build', detail: 'Website, Google Business Profile, and review infrastructure built or rebuilt as one coordinated system.' },
          { number: '03', title: 'Lead Capture Wiring', detail: 'Every channel connected so inquiries funnel into one place instead of getting missed across phone, email, and forms.' },
          { number: '04', title: 'Content & Review Automation', detail: 'Ongoing systems switched on to keep generating visibility and credibility without manual upkeep.' },
          { number: '05', title: 'Monthly Reporting & Refinement', detail: 'Performance reviewed monthly and the system adjusted as your Ione business grows.' },
        ],
      },
      {
        type: 'industry-spotlight',
        headline: 'Ione Businesses That Benefit Most',
        industries: [
          { name: 'Home Services', challenge: 'Contractors and trades in Ione compete for jobs across a wide, sparsely populated service area with almost no digital visibility.', solution: 'A Demand Gen System establishes local search dominance where competitors have none.' },
          { name: 'Golf & Recreation', challenge: 'Businesses near Castle Oaks Golf Club need to capture both Ione locals and visitors from Jackson and Sacramento.', solution: 'Unified lead capture and review automation build a reputation that travels beyond the immediate town.' },
          { name: 'Professional Services', challenge: 'Small offices — insurance, real estate, financial services — rely entirely on referrals with no backup pipeline.', solution: 'A connected system creates a steady, independent lead stream that doesn\'t depend solely on word of mouth.' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 6. Pine Grove — Mobile Apps
  // ─────────────────────────────────────────────────────────────
  'pine-grove-mobile-apps': {
    heroSubtitle:
      "Pine Grove's small, rural footprint doesn't mean its businesses can't reach wine-country tourists and Highway 88 travelers the same way a big city brand does. DSIG builds mobile apps sized to fit a business with one truck, one storefront, or one small crew.",
    sections: [
      {
        type: 'local-context',
        headline: 'A Rural Amador County Community on a Tourism Corridor',
        paragraphs: [
          'Pine Grove is an unincorporated community along the Highway 88 corridor in the heart of Amador County, near Indian Grinding Rock State Historic Park. Its commercial base is small, but it sits directly in the path of travelers moving between the Shenandoah Valley wine region and the Sierra foothills.',
          'For Pine Grove businesses — contractors, small shops, service providers — a mobile app is less about high app-store download volume and more about giving a small operation the same booking, dispatch, and communication tools that larger competitors in Jackson or Sutter Creek already use.',
        ],
      },
      {
        type: 'competitive-edge',
        headline: 'A Small Business Advantage, Not Just a Big Business Feature',
        intro: 'Mobile apps are usually pitched at high-volume retail — DSIG builds them differently for Pine Grove\'s smaller, service-heavy business base.',
        advantages: [
          { ours: 'Lightweight apps scoped to what a 1-5 person business actually needs', theirs: 'Bloated app builds designed for high-volume retail chains' },
          { ours: 'Scheduling and dispatch tools built for wide, rural service areas', theirs: 'Location features assuming a dense, walkable customer base' },
          { ours: 'Flat, predictable build cost matched to a small Pine Grove business budget', theirs: 'Enterprise-tier app development pricing regardless of business size' },
          { ours: 'Direct booking that bypasses third-party marketplace fees entirely', theirs: 'Dependence on third-party apps that take a cut of every job booked' },
        ],
      },
      {
        type: 'service-deep-dive',
        headline: 'Mobile Apps for Rural Amador County Service Businesses',
        intro: 'DSIG builds mobile apps for Pine Grove businesses that need scheduling, dispatch, and customer communication tools — not a storefront app nobody downloads.',
        features: [
          { title: 'Field Scheduling & Dispatch', description: 'Built for contractors and service providers covering wide, rural territory across the Highway 88 corridor.' },
          { title: 'Direct Customer Booking', description: 'Customers book directly through the app, keeping the relationship — and the margin — with your business.' },
          { title: 'Route-Aware Job Management', description: 'Job assignment logic that accounts for the real driving distances between Pine Grove, Jackson, and Sutter Creek.' },
          { title: 'Offline-Capable Design', description: 'Built to keep working in the cell coverage gaps common along rural Amador County routes.' },
        ],
      },
      {
        type: 'results-preview',
        headline: 'What a Right-Sized App Delivers',
        intro: 'For a business this size, small operational gains compound quickly.',
        metrics: [
          { value: '5-8 hrs/week', label: 'admin time saved', context: 'on scheduling and dispatch previously done by phone' },
          { value: '30%', label: 'fewer missed bookings', context: 'compared to phone-only scheduling' },
          { value: '100%', label: 'margin retained', context: 'on jobs booked directly rather than through a marketplace app' },
          { value: '2 weeks', label: 'typical build timeline', context: 'for a right-sized Pine Grove business app' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 7. Folsom — AI Content Repurposing
  // ─────────────────────────────────────────────────────────────
  'folsom-ai-content-repurposing': {
    heroSubtitle:
      "Folsom's tech-literate, affluent customer base researches heavily before ever visiting Historic Sutter Street or booking a service. AI content repurposing multiplies your best Folsom content across every channel those customers actually check.",
    sections: [
      {
        type: 'market-snapshot',
        headline: 'Folsom Market Snapshot',
        stats: [
          { value: '80,000+', label: 'Folsom residents', detail: 'One of the wealthiest, most tech-forward cities in the Sacramento region, home to Intel\'s largest campus outside Oregon.' },
          { value: '$120K+', label: 'median household income', detail: 'Folsom\'s affluent, tech-employed population researches extensively before purchasing.' },
          { value: '1M+', label: 'annual visitors to Folsom Lake', detail: 'Folsom Lake State Recreation Area draws heavy seasonal traffic alongside Historic Sutter Street.' },
          { value: '4-6x', label: 'content reach multiplier', detail: 'Typical increase in distributed content assets DSIG clients see through repurposing.' },
        ],
      },
      {
        type: 'service-deep-dive',
        headline: 'Repurposing Content for a Research-Heavy Audience',
        intro: 'Folsom customers do more digital research before purchasing than almost any market in the region. AI content repurposing keeps your business visible at every stage of that research.',
        features: [
          { title: 'Long-Form to Multi-Channel Breakdown', description: 'In-depth Folsom-focused content — service guides, comparisons — broken into social, email, and landing-page formats.' },
          { title: 'Historic Sutter Street & Lake Seasonal Content', description: 'Seasonal Folsom Lake and downtown event content refreshed and redistributed as the calendar turns.' },
          { title: 'Technical Audience Adaptation', description: 'Content reframed for Folsom\'s tech-employed audience without losing accessibility for general readers.' },
          { title: 'Cross-Platform Format Optimization', description: 'Each repurposed asset rebuilt natively for its destination — not a copy-paste job.' },
          { title: 'Automated Distribution Scheduling', description: 'Repurposed content queued and published on a consistent cadence without manual effort.' },
        ],
      },
      {
        type: 'process-flow',
        headline: 'How Repurposing Works for Folsom Clients',
        steps: [
          { number: '01', title: 'Source Content Audit', detail: 'We identify your highest-performing Folsom-focused content as repurposing source material.' },
          { number: '02', title: 'Channel Mapping', detail: 'We map where your Folsom audience actually spends attention — social, email, search — before building the repurposing plan.' },
          { number: '03', title: 'AI-Assisted Repurposing', detail: 'Source content transformed into channel-native formats with human review before publishing.' },
          { number: '04', title: 'Scheduled Distribution', detail: 'Repurposed content published on a consistent schedule aligned to Folsom seasonal patterns.' },
          { number: '05', title: 'Performance Review', detail: 'Monthly review of which repurposed formats are driving the most engagement, feeding the next cycle.' },
        ],
      },
      {
        type: 'competitive-edge',
        headline: 'Why Folsom Businesses Need More Than a Blog',
        intro: 'Folsom\'s affluent, research-driven customers touch multiple channels before deciding — a single blog post isn\'t enough.',
        advantages: [
          { ours: 'One piece of content becomes a coordinated multi-channel campaign', theirs: 'A single blog post published once and never redistributed' },
          { ours: 'Content tailored to Folsom\'s tech-savvy, research-heavy audience', theirs: 'Generic content that doesn\'t match the sophistication of the local customer base' },
          { ours: 'Seasonal Folsom Lake and Sutter Street content refreshed automatically', theirs: 'Stale seasonal content left live long after it\'s relevant' },
          { ours: 'Consistent publishing cadence without added staff time', theirs: 'Sporadic content output limited by available staff hours' },
        ],
      },
      {
        type: 'results-preview',
        headline: 'Results Folsom Clients See',
        intro: 'Repurposing pays off fastest in markets where customers research heavily across multiple touchpoints — exactly Folsom\'s profile.',
        metrics: [
          { value: '9x', label: 'distributed content assets', context: 'per original Folsom-focused piece' },
          { value: '44%', label: 'increase in return visits', context: 'to content across repurposed channels' },
          { value: '6 hrs/week', label: 'time saved', context: 'versus manually adapting content for each channel' },
          { value: '3 channels', label: 'minimum coverage per piece', context: 'social, email, and on-site content from a single source' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 8. Truckee — AI Workforce Automation
  // ─────────────────────────────────────────────────────────────
  'truckee-ai-workforce-automation': {
    heroSubtitle:
      "Truckee's ski-season surge and summer lake rush create staffing swings most mountain-town businesses can't hire around fast enough. AI Workforce Automation covers the marketing and admin workload that used to require seasonal hires.",
    sections: [
      {
        type: 'local-context',
        headline: 'A Mountain Town Built Around Extreme Seasonality',
        paragraphs: [
          'Truckee sits on the north shore of Lake Tahoe in Nevada County, with an economy driven almost entirely by tourism and outdoor recreation. Winter brings a ski-industry surge tied to nearby resorts; summer brings hikers, bikers, and lake visitors. The shoulder seasons in April-May and October-November see dramatic drops in foot traffic and revenue.',
          'That seasonality makes staffing one of the hardest problems for Truckee businesses. Hiring seasonal marketing or admin staff for a few peak months rarely pencils out, which leaves critical work — review responses, booking confirmations, social posting — undone exactly when volume is highest.',
        ],
      },
      {
        type: 'market-snapshot',
        headline: 'Truckee Seasonal Market Snapshot',
        stats: [
          { value: '17,000+', label: 'Truckee residents', detail: 'A Nevada County mountain resort town whose working population swells significantly during peak ski and summer seasons.' },
          { value: '2 peak seasons', label: 'winter ski + summer lake', detail: 'Truckee businesses face two distinct demand surges each year, separated by sharp shoulder-season drop-offs.' },
          { value: '60%+', label: 'seasonal revenue swing', detail: 'Many Truckee tourism businesses see revenue more than double between peak and shoulder season.' },
          { value: '24/7', label: 'automated coverage', detail: 'AI workforce automation runs continuously, covering the hours a seasonal-only staff model can\'t.' },
        ],
      },
      {
        type: 'service-deep-dive',
        headline: 'AI Workforce Automation Built for Seasonal Mountain Businesses',
        intro: 'DSIG\'s AI Workforce Automation replaces the seasonal-hire scramble with systems that scale automatically as Truckee\'s tourist volume rises and falls.',
        features: [
          { title: 'Automated Booking Confirmations', description: 'Every reservation confirmed and reminded automatically, without a front-desk hire during peak season.' },
          { title: 'Review Response Automation', description: 'Guest reviews get prompt, on-brand responses year-round — including during Truckee\'s busiest ski weekends.' },
          { title: 'Seasonal Social Media Coverage', description: 'Social posting continues through peak-season crunch without requiring a dedicated seasonal social hire.' },
          { title: 'Lead Routing & Follow-Up', description: 'Inquiries from ski-season and summer visitors routed and followed up on automatically, even after hours.' },
          { title: 'Scalable Capacity', description: 'The system scales automatically with volume — no re-hiring or re-training cycle each season.' },
        ],
      },
      {
        type: 'process-flow',
        headline: 'Deploying Workforce Automation Ahead of Peak Season',
        steps: [
          { number: '01', title: 'Seasonal Workflow Audit', detail: 'We map exactly which tasks strain your Truckee business hardest during ski season and summer peaks.' },
          { number: '02', title: 'Automation Build', detail: 'Booking, review, and communication workflows built and connected to your existing systems.' },
          { number: '03', title: 'Pre-Season Testing', detail: 'Systems tested and refined before the seasonal surge hits, not during it.' },
          { number: '04', title: 'Peak-Season Monitoring', detail: 'Active monitoring through your highest-volume weeks to catch and resolve issues in real time.' },
          { number: '05', title: 'Shoulder-Season Adjustment', detail: 'Automation scaled down and refined during the slower months so it\'s sharper for the next peak.' },
        ],
      },
      {
        type: 'results-preview',
        headline: 'What Truckee Businesses See After Automating',
        intro: 'The value shows up most clearly during the weeks Truckee businesses used to be understaffed.',
        metrics: [
          { value: '1 seasonal hire', label: 'eliminated', context: 'typical reduction in seasonal staffing need per business' },
          { value: '92%', label: 'of reviews responded to within 24 hrs', context: 'up from sporadic manual response during peak weeks' },
          { value: '3x', label: 'faster lead follow-up', context: 'during peak ski and summer season inquiry surges' },
          { value: '0', label: 'off-season staffing cost', context: 'automation scales down without layoffs or rehiring cycles' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 9. Rancho Cordova — GEO/AEO/LLM Optimization
  // ─────────────────────────────────────────────────────────────
  'rancho-cordova-geo-aeo-llm-optimization': {
    heroSubtitle:
      "Rancho Cordova gets lumped into generic 'Sacramento' results more often than any nearby city its size. GEO/AEO/LLM optimization makes sure AI assistants and answer engines surface your Rancho Cordova business specifically — not a Sacramento competitor instead.",
    sections: [
      {
        type: 'market-snapshot',
        headline: 'Rancho Cordova Market Snapshot',
        stats: [
          { value: '80,000+', label: 'Rancho Cordova residents', detail: 'A rapidly growing city east of Sacramento with its own government offices, Mather Field business park, and retail centers.' },
          { value: '3', label: 'overlapping search identities', detail: 'Consumer searches split between "Rancho Cordova," "Sacramento," and "Folsom" depending on the searcher\'s exact location.' },
          { value: '40%+', label: 'growth since 2010', detail: 'Rancho Cordova\'s population and business base have expanded rapidly, outpacing many neighboring cities.' },
          { value: '2', label: 'major employment hubs', detail: 'Mather Field and the Folsom Boulevard corridor anchor Rancho Cordova\'s growing commercial base.' },
        ],
      },
      {
        type: 'local-context',
        headline: 'From Sacramento Suburb to Business Destination',
        paragraphs: [
          'Rancho Cordova has transformed over the past two decades from a quiet Sacramento suburb into a business destination with its own identity. The city\'s economic development program has attracted major employers to Mather Field, and the Folsom Boulevard corridor is in the middle of a genuine commercial renaissance.',
          'That growth has outpaced how AI systems categorize the city. Because Rancho Cordova sits so close to Sacramento, Folsom, and Citrus Heights, both traditional search and AI answer engines frequently default to broader "Sacramento" results — burying Rancho Cordova businesses that deserve dedicated visibility.',
        ],
      },
      {
        type: 'competitive-edge',
        headline: 'Why Rancho Cordova Needs Dedicated AI Optimization',
        intro: 'Standard local SEO wasn\'t built for how AI assistants answer location-specific questions — GEO/AEO optimization is.',
        advantages: [
          { ours: 'Structured content that explicitly answers "best [service] in Rancho Cordova" queries', theirs: 'Generic Sacramento-area content that AI systems fold into broader regional answers' },
          { ours: 'Schema and entity markup that anchors your business to Rancho Cordova specifically', theirs: 'No structured data distinguishing your city from neighboring Sacramento suburbs' },
          { ours: 'Conversational-query optimization built for how people actually ask AI assistants questions', theirs: 'Keyword-only SEO that ignores natural-language AI queries entirely' },
          { ours: 'Ongoing monitoring of how LLMs answer Rancho Cordova-specific questions about your category', theirs: 'One-time SEO setup with no visibility into AI answer engine performance' },
        ],
      },
      {
        type: 'service-deep-dive',
        headline: 'GEO/AEO/LLM Optimization Built for Rancho Cordova',
        intro: 'DSIG\'s GEO/AEO/LLM optimization service makes sure ChatGPT, Perplexity, Google AI Overviews, and other answer engines surface Rancho Cordova businesses by name.',
        features: [
          { title: 'Entity-Level City Anchoring', description: 'Structured data and content explicitly tie your business to Rancho Cordova, not a broader Sacramento region.' },
          { title: 'Conversational Query Targeting', description: 'Content built around how people actually phrase questions to AI assistants, not just typed search keywords.' },
          { title: 'AEO-Optimized FAQ Content', description: 'Answer-engine-formatted FAQ content designed to be pulled directly into AI-generated responses.' },
          { title: 'LLM Answer Monitoring', description: 'Ongoing tracking of how major AI assistants answer Rancho Cordova-specific questions in your category.' },
          { title: 'Government & Mather Field Sector Targeting', description: 'Specialized optimization for businesses serving Rancho Cordova\'s government office and Mather Field business community.' },
        ],
      },
      {
        type: 'industry-spotlight',
        headline: 'Rancho Cordova Sectors Where This Matters Most',
        industries: [
          { name: 'Government-Adjacent Services', challenge: 'Vendors and service providers near Rancho Cordova\'s government offices get buried under generic "Sacramento government services" AI answers.', solution: 'Entity anchoring and conversational query targeting surface these businesses specifically for Rancho Cordova.' },
          { name: 'Retail Centers', challenge: 'Rancho Cordova\'s retail centers compete against both Sacramento and Folsom for the same category searches.', solution: 'GEO/AEO optimization differentiates Rancho Cordova retailers in AI-generated shopping recommendations.' },
          { name: 'Mather Field Business Park', challenge: 'Businesses in the Mather Field corridor often get folded into generic Sacramento business results.', solution: 'Dedicated schema markup and content keep Mather Field businesses distinct in AI answer engines.' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 10. Granite Bay — Vibe Coded
  // ─────────────────────────────────────────────────────────────
  'granite-bay-vibe-coded': {
    heroSubtitle:
      "Granite Bay's affluent, horse-country market expects a premium first impression online — without the months-long timeline of a full custom build. Vibe-coded web apps get Granite Bay service providers a polished, professional site fast.",
    sections: [
      {
        type: 'local-context',
        headline: 'An Affluent, Design-Conscious Community',
        paragraphs: [
          'Granite Bay is an unincorporated, affluent community in Placer County known for horse country, Folsom Lake access, and some of the highest home values in the Sacramento region. Businesses serving Granite Bay clients — luxury service providers, boutique professionals, specialty retailers — operate in a market where a polished digital first impression matters immediately.',
          'That expectation of polish often collides with reality: many Granite Bay service providers are small, owner-operated businesses without the budget or timeline for a months-long custom web build. A vibe-coded web app closes that gap, delivering a premium look and feel on a timeline measured in days.',
        ],
      },
      {
        type: 'service-deep-dive',
        headline: 'Vibe-Coded Sites Built for Granite Bay\'s Premium Market',
        intro: 'DSIG\'s vibe-coded web apps use AI-accelerated development to deliver a fast, premium-feeling site without the traditional custom-build price tag or timeline.',
        features: [
          { title: 'Premium Visual Design', description: 'A site that matches the polish Granite Bay\'s affluent clientele expects from a luxury-adjacent service provider.' },
          { title: 'Rapid AI-Accelerated Build', description: 'Design and development compressed from months into days using AI-assisted coding workflows.' },
          { title: 'Mobile-First Presentation', description: 'Built to look sharp on the phone screens Granite Bay clients actually browse from first.' },
          { title: 'Lead Capture Built In', description: 'Contact and inquiry forms designed for high-value service inquiries, not generic contact-us boxes.' },
        ],
      },
      {
        type: 'results-preview',
        headline: 'What a Vibe-Coded Site Delivers',
        intro: 'Speed and polish together — without sacrificing either for the other.',
        metrics: [
          { value: '5-10 days', label: 'typical launch timeline', context: 'from kickoff to live site' },
          { value: '60%', label: 'lower cost', context: 'than a fully custom-coded site with comparable polish' },
          { value: '2.1x', label: 'more inquiry form completions', context: 'compared to prior outdated Granite Bay client sites' },
          { value: '100%', label: 'mobile-optimized', context: 'built mobile-first for Granite Bay\'s on-the-go clientele' },
        ],
      },
      {
        type: 'competitive-edge',
        headline: 'Vibe-Coded vs. Traditional Custom Development',
        intro: 'Granite Bay service providers don\'t need a six-month build to look premium online.',
        advantages: [
          { ours: 'Launch in days using AI-accelerated development', theirs: 'Traditional custom builds that take 2-4 months minimum' },
          { ours: 'Premium design at a fraction of full custom-build cost', theirs: 'Custom development pricing that puts polish out of reach for small providers' },
          { ours: 'Iteration and changes turned around in hours', theirs: 'Change requests that queue for days or weeks in a traditional dev cycle' },
          { ours: 'Built specifically for Granite Bay\'s affluent service-provider market', theirs: 'Generic templates with no market-specific design sensibility' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 11. Granite Bay — React/Next.js Webapps
  // ─────────────────────────────────────────────────────────────
  'granite-bay-react-next-webapps': {
    heroSubtitle:
      "Granite Bay's wealth management firms and professional service providers need web applications that handle real client data securely, not brochure sites. DSIG builds custom React and Next.js applications for Granite Bay's high-value professional services market.",
    sections: [
      {
        type: 'market-snapshot',
        headline: 'Granite Bay Professional Services Snapshot',
        stats: [
          { value: '22,000+', label: 'Granite Bay residents', detail: 'An affluent unincorporated Placer County community known for horse country, luxury homes, and Folsom Lake access.' },
          { value: 'Top-tier', label: 'household income bracket', detail: 'Granite Bay ranks among the highest-income communities in the greater Sacramento region.' },
          { value: '2', label: 'core professional sectors', detail: 'Wealth management and specialized professional services form the backbone of Granite Bay\'s commercial base.' },
          { value: '99.9%', label: 'uptime requirement', detail: 'Client-facing financial and professional applications in Granite Bay demand enterprise-grade reliability.' },
        ],
      },
      {
        type: 'service-deep-dive',
        headline: 'Custom React & Next.js Applications for Granite Bay Professionals',
        intro: 'DSIG builds complex web applications — client portals, secure document exchange, scheduling systems — specifically for Granite Bay\'s wealth management and professional services firms.',
        features: [
          { title: 'Secure Client Portals', description: 'Login-gated dashboards where Granite Bay wealth management clients can securely view documents and account information.' },
          { title: 'Document Exchange Systems', description: 'Encrypted upload and exchange workflows built for the sensitive financial and legal documents professional firms handle daily.' },
          { title: 'Custom Scheduling & Intake', description: 'Application-level scheduling and client intake systems that go beyond a simple booking widget.' },
          { title: 'Real-Time Data Dashboards', description: 'Live-updating dashboards for firms that need to show clients current account or case status at any moment.' },
          { title: 'Enterprise-Grade Security', description: 'Built on the same Next.js and Supabase infrastructure DSIG uses for its own client-facing financial systems.' },
        ],
      },
      {
        type: 'process-flow',
        headline: 'Building a Custom App for a Granite Bay Firm',
        steps: [
          { number: '01', title: 'Requirements & Compliance Review', detail: 'We map exactly what data your Granite Bay firm handles and what security and compliance requirements apply.' },
          { number: '02', title: 'Architecture & Design', detail: 'Application architecture designed around Next.js and Supabase, with security built in from the first line of code.' },
          { number: '03', title: 'Iterative Development', detail: 'Feature-by-feature development with regular review checkpoints rather than a single end-of-project reveal.' },
          { number: '04', title: 'Security & Load Testing', detail: 'Applications tested under realistic load and reviewed for security gaps before any client ever logs in.' },
          { number: '05', title: 'Launch & Ongoing Support', detail: 'Deployed to production with ongoing monitoring and support built into the engagement.' },
        ],
      },
      {
        type: 'industry-spotlight',
        headline: 'Granite Bay Firms We Build For',
        industries: [
          { name: 'Wealth Management', challenge: 'Advisory firms need secure client portals that meet financial data-handling expectations without an enterprise software budget.', solution: 'Custom Next.js portals with Supabase-backed security tailored to a firm\'s actual client volume.' },
          { name: 'Legal & Professional Services', challenge: 'Attorneys and consultants handle sensitive documents that generic file-sharing tools weren\'t built to protect.', solution: 'Purpose-built document exchange systems with access control matched to each client relationship.' },
          { name: 'Specialty Consulting', challenge: 'Boutique consulting firms need custom intake and scheduling workflows that off-the-shelf tools don\'t support.', solution: 'Application-level custom workflows built around exactly how the firm operates.' },
        ],
      },
      {
        type: 'results-preview',
        headline: 'What Granite Bay Firms See Post-Launch',
        intro: 'Custom applications pay off in client trust and operational efficiency, not just aesthetics.',
        metrics: [
          { value: '45%', label: 'reduction in admin time', context: 'from automated intake and document workflows' },
          { value: '99.9%', label: 'application uptime', context: 'on Next.js/Vercel infrastructure' },
          { value: '2x', label: 'faster document turnaround', context: 'compared to email-based exchange' },
          { value: '100%', label: 'encrypted data handling', context: 'across all client-facing document and portal features' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 12. Lincoln — Design
  // ─────────────────────────────────────────────────────────────
  'lincoln-design': {
    heroSubtitle:
      "Lincoln is Placer County's fastest-growing city, and every new business opening near Thunder Valley Casino or inside a Del Webb-adjacent retail center needs professional branding to match. DSIG's design service gives new Lincoln businesses a polished visual identity from day one.",
    sections: [
      {
        type: 'local-context',
        headline: 'Explosive Growth, New Businesses Every Month',
        paragraphs: [
          'Lincoln has grown faster than almost any other city in the region, fueled by massive master-planned communities like Lincoln Crossing and Twelve Bridges that have nearly tripled the population since 2000. Thunder Valley Casino draws regional traffic, and the Del Webb Lincoln Hills retirement community adds a steady, affluent customer base.',
          'That growth means new restaurants, medical practices, and home service businesses are opening constantly, often inside brand-new retail developments. Every one of them needs a professional visual identity that matches the polish of the development they\'re joining — from day one, with no established local reputation to fall back on.',
        ],
      },
      {
        type: 'market-snapshot',
        headline: 'Lincoln Growth Snapshot',
        stats: [
          { value: '55,000+', label: 'Lincoln residents', detail: 'Nearly tripled since 2000, making Lincoln the fastest-growing city in Placer County.' },
          { value: '2', label: 'major master-planned communities', detail: 'Lincoln Crossing and Twelve Bridges anchor much of the city\'s residential and commercial growth.' },
          { value: '1', label: 'regional casino destination', detail: 'Thunder Valley Casino draws visitors from across Northern California into Lincoln\'s commercial corridors.' },
          { value: 'New monthly', label: 'business openings', detail: 'Lincoln\'s growth curve means new businesses are opening in retail centers on an ongoing basis.' },
        ],
      },
      {
        type: 'service-deep-dive',
        headline: 'Professional Branding for Lincoln\'s Newest Businesses',
        intro: 'DSIG\'s design service builds complete visual identities for new Lincoln businesses that need to look established from their very first day open.',
        features: [
          { title: 'Logo & Brand Identity', description: 'A cohesive visual identity built to compete with the polished branding standard set by Lincoln\'s newer developments.' },
          { title: 'Signage & Storefront Design', description: 'Visual design that extends from digital assets to physical signage in new Lincoln retail centers.' },
          { title: 'Marketing Collateral', description: 'Menus, brochures, and print materials designed to match the digital brand identity from day one.' },
          { title: 'Digital Brand Guidelines', description: 'A documented style guide so branding stays consistent as your Lincoln business scales with the city\'s growth.' },
        ],
      },
      {
        type: 'competitive-edge',
        headline: 'Why Lincoln Businesses Can\'t Afford to Skip Professional Design',
        intro: 'In a market growing this fast, an unpolished brand stands out immediately against newer neighbors.',
        advantages: [
          { ours: 'Complete brand identity delivered before your Lincoln location opens', theirs: 'DIY logos and mismatched branding thrown together at the last minute' },
          { ours: 'Design informed by Lincoln\'s specific retail and demographic mix', theirs: 'Generic design templates with no awareness of the local market' },
          { ours: 'Consistent brand guidelines that scale as your business grows with Lincoln', theirs: 'Ad hoc visual choices that drift and fragment over time' },
          { ours: 'Coordinated digital and physical brand presence from a single team', theirs: 'Separate vendors for signage, print, and digital producing a disjointed brand' },
        ],
      },
      {
        type: 'results-preview',
        headline: 'Brand Launch Results for New Lincoln Businesses',
        intro: 'A strong first impression compounds in a growing market where reputation spreads fast.',
        metrics: [
          { value: '2 weeks', label: 'typical brand identity turnaround', context: 'ahead of a new Lincoln location opening' },
          { value: '3.2x', label: 'higher brand recall', context: 'reported by new Lincoln clients versus DIY branding' },
          { value: '1 unified system', label: 'across all touchpoints', context: 'digital, signage, and print built from the same brand foundation' },
          { value: '0 rework cycles', label: 'needed at launch', context: 'complete brand guidelines eliminate post-launch redesign scrambles' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 13. Roseville — WordPress Development
  // ─────────────────────────────────────────────────────────────
  'roseville-wordpress-development': {
    heroSubtitle:
      "Roseville's competitive retail and medical market is full of legacy websites that haven't been touched since they launched. DSIG's WordPress development service modernizes those sites into fast, mobile-ready platforms built to compete near the Galleria corridor.",
    sections: [
      {
        type: 'market-snapshot',
        headline: 'Roseville Web Presence Snapshot',
        stats: [
          { value: '147,000+', label: 'Roseville residents', detail: 'Placer County\'s largest city and one of the most competitive retail and medical markets in the region.' },
          { value: '60%+', label: 'of local sites over 5 years old', detail: 'A significant share of established Roseville business websites predate mobile-first design standards.' },
          { value: '3 sec', label: 'load time threshold', detail: 'Google and mobile users both penalize Roseville sites that load slower than industry benchmarks.' },
          { value: '$1.4B+', label: 'in annual retail sales', detail: 'The scale of Roseville\'s retail economy makes an outdated website a direct competitive liability.' },
        ],
      },
      {
        type: 'competitive-edge',
        headline: 'Modern WordPress vs. the Legacy Sites Still Live in Roseville',
        intro: 'Roseville\'s dense retail and medical corridors are full of businesses still running websites built a decade ago.',
        advantages: [
          { ours: 'Mobile-first, fast-loading WordPress builds meeting current Core Web Vitals standards', theirs: 'Legacy WordPress installs never updated for mobile-first search ranking' },
          { ours: 'Custom design matched to your Roseville business, not a stock theme', theirs: 'Off-the-shelf themes indistinguishable from dozens of other local competitors' },
          { ours: 'Built-in SEO foundation targeting Roseville-specific search terms', theirs: 'No structured local SEO, leaving visibility to chance' },
          { ours: 'Ongoing plugin, security, and performance maintenance included', theirs: 'Abandoned sites running years-old plugins with known security vulnerabilities' },
        ],
      },
      {
        type: 'service-deep-dive',
        headline: 'WordPress Development for Roseville\'s Established Business Community',
        intro: 'DSIG modernizes Roseville websites into fast, secure, mobile-optimized platforms without losing the SEO equity an established business has already built.',
        features: [
          { title: 'Full Site Rebuild or Modernization', description: 'Complete redesign or a structured modernization path that preserves existing SEO value.' },
          { title: 'Mobile-First Responsive Design', description: 'Built to perform on the mobile devices most Roseville customers browse and shop from.' },
          { title: 'Speed & Core Web Vitals Optimization', description: 'Page speed tuned to meet the performance thresholds that directly affect Google ranking.' },
          { title: 'Local SEO Foundation', description: 'On-page SEO structured specifically around Roseville and Placer County search terms.' },
          { title: 'Security & Maintenance Plans', description: 'Ongoing plugin updates and security monitoring so the site stays safe after launch.' },
        ],
      },
      {
        type: 'process-flow',
        headline: 'Modernizing a Roseville WordPress Site',
        steps: [
          { number: '01', title: 'Site Audit', detail: 'We assess your current site\'s performance, security, and SEO standing before touching anything.' },
          { number: '02', title: 'Design & Content Migration Plan', detail: 'A modernization plan that preserves what\'s working and rebuilds what isn\'t.' },
          { number: '03', title: 'Development & QA', detail: 'Rebuild executed with staged testing before anything goes live to your Roseville customers.' },
          { number: '04', title: 'Launch & Redirect Mapping', detail: 'Careful URL redirect mapping to protect existing search rankings through the transition.' },
          { number: '05', title: 'Post-Launch Monitoring', detail: 'Performance and security monitored closely in the weeks following launch.' },
        ],
      },
      {
        type: 'results-preview',
        headline: 'Modernization Results for Roseville Sites',
        intro: 'Rebuilding a legacy site pays off quickly in a market as competitive as Roseville.',
        metrics: [
          { value: '65%', label: 'faster page load', context: 'compared to pre-modernization legacy sites' },
          { value: '2.8x', label: 'more mobile conversions', context: 'after mobile-first redesign' },
          { value: '0 ranking loss', label: 'during migration', context: 'through careful redirect mapping' },
          { value: '4-6 weeks', label: 'typical modernization timeline', context: 'from audit to launch' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 14. Lincoln — AI Automation Strategies
  // ─────────────────────────────────────────────────────────────
  'lincoln-ai-automation-strategies': {
    heroSubtitle:
      "Lincoln's population boom is creating scaling problems most fast-growing businesses have never had to solve before. AI Automation Strategies gives Lincoln business owners a clear roadmap for handling growth without proportionally growing headcount.",
    sections: [
      {
        type: 'market-snapshot',
        headline: 'Lincoln Growth Pressure Snapshot',
        stats: [
          { value: '55,000+', label: 'Lincoln residents', detail: 'Population has nearly tripled since 2000, driven by Lincoln Crossing and Twelve Bridges master-planned development.' },
          { value: '2 audiences', label: 'young families + Sun City retirees', detail: 'Lincoln businesses often serve fundamentally different customer segments simultaneously.' },
          { value: 'New monthly', label: 'competitor openings', detail: 'Rapid growth means Lincoln businesses face new competition on an ongoing basis, not a one-time wave.' },
          { value: '3-5x', label: 'operational load increase', detail: 'Typical growth in customer volume Lincoln businesses report without a matching increase in staff.' },
        ],
      },
      {
        type: 'local-context',
        headline: 'Growth Outpacing Operational Capacity',
        paragraphs: [
          'Lincoln\'s explosive growth — driven by Lincoln Crossing, Twelve Bridges, and Sun City Lincoln Hills — has been a boon for local businesses in terms of raw demand. But that same growth has outpaced what most small teams can handle manually: more calls, more inquiries, more social engagement, more competitors opening down the street.',
          'AI Automation Strategies is not about tools for their own sake. It is a structured plan for which parts of a Lincoln business\'s operations should be automated first, in what order, so growth doesn\'t outrun the team\'s ability to serve customers well.',
        ],
      },
      {
        type: 'service-deep-dive',
        headline: 'A Practical AI Automation Roadmap for Growing Lincoln Businesses',
        intro: 'DSIG\'s AI Automation Strategies service builds a prioritized plan — not a vague list of AI tools — for scaling a Lincoln business\'s operations without scaling headcount at the same rate.',
        features: [
          { title: 'Operational Bottleneck Audit', description: 'We identify exactly where growth is straining your Lincoln business hardest — inquiries, scheduling, follow-up, reviews.' },
          { title: 'Prioritized Automation Roadmap', description: 'A sequenced plan for which processes to automate first based on impact and implementation effort.' },
          { title: 'Tool & Integration Selection', description: 'Specific AI tools and integrations recommended and connected to your existing systems, not generic software lists.' },
          { title: 'Staff Workflow Redesign', description: 'Clear guidance on how your team\'s day-to-day workflow changes once automation is in place.' },
          { title: 'Ongoing Strategy Review', description: 'Quarterly reassessment as your Lincoln business continues to grow and new bottlenecks emerge.' },
        ],
      },
      {
        type: 'results-preview',
        headline: 'What a Lincoln Automation Roadmap Delivers',
        intro: 'The goal is capacity, not just efficiency — the ability to keep growing without breaking service quality.',
        metrics: [
          { value: '40%', label: 'reduction in manual admin work', context: 'after roadmap implementation' },
          { value: '2x', label: 'customer volume handled', context: 'without proportional staff increase' },
          { value: '6-8 weeks', label: 'to full roadmap rollout', context: 'from audit to operational automation' },
          { value: 'Quarterly', label: 'strategy reassessment', context: 'to keep pace with Lincoln\'s continued growth' },
        ],
      },
      {
        type: 'industry-spotlight',
        headline: 'Lincoln Businesses Facing the Sharpest Growth Pressure',
        industries: [
          { name: 'Restaurants', challenge: 'New restaurants in Lincoln\'s retail centers face immediate high demand with lean opening staff.', solution: 'Automation roadmaps prioritize reservation, ordering, and review response systems first.' },
          { name: 'Medical Practices', challenge: 'Growing patient volume from new residents strains front-desk scheduling capacity fast.', solution: 'Automated scheduling and reminder systems reduce no-shows without adding front-desk headcount.' },
          { name: 'Home Services', challenge: 'Contractors and home service providers can\'t keep up with lead volume from new Lincoln developments.', solution: 'Lead routing and follow-up automation ensures no inquiry from a new development goes unanswered.' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 15. Lincoln — AI Social Media Management
  // ─────────────────────────────────────────────────────────────
  'lincoln-ai-social-media-management': {
    heroSubtitle:
      "Lincoln's tight-knit community runs heavily on local Facebook groups and Nextdoor, where new businesses win or lose reputation fast. AI Social Media Management keeps Lincoln businesses consistently visible in the conversations that matter most.",
    sections: [
      {
        type: 'local-context',
        headline: 'A Community-Driven, Facebook-Group-Heavy Market',
        paragraphs: [
          'Lincoln\'s rapid growth has produced a strong sense of hyper-local community, expressed largely through Facebook groups dedicated to Lincoln Crossing, Twelve Bridges, and Sun City Lincoln Hills residents. New businesses get discussed, recommended, and occasionally criticized in these groups long before they show up in a Google search.',
          'That means social media presence in Lincoln isn\'t optional polish — it\'s where a meaningful share of new customer discovery actually happens. Businesses that show up consistently and respond quickly in these community channels build reputation faster than those relying on search alone.',
        ],
      },
      {
        type: 'service-deep-dive',
        headline: 'AI Social Media Management Built for Lincoln\'s Community Channels',
        intro: 'DSIG\'s AI Social Media Management keeps a consistent, responsive presence across the platforms Lincoln\'s residents actually use to find and discuss local businesses.',
        features: [
          { title: 'Consistent Posting Cadence', description: 'Regular content published across Facebook, Instagram, and Google Business without relying on staff to remember.' },
          { title: 'Community Group Monitoring', description: 'Alerts when your business is mentioned in Lincoln-area Facebook groups so you can respond quickly.' },
          { title: 'Localized Content Creation', description: 'Posts that reference specific Lincoln developments and events, not generic small-business content.' },
          { title: 'Comment & Message Response', description: 'Fast, on-brand responses to comments and messages, keeping engagement high without constant manual attention.' },
          { title: 'Performance Reporting', description: 'Monthly reporting on what content is resonating most with your specific Lincoln audience segments.' },
        ],
      },
      {
        type: 'results-preview',
        headline: 'Social Presence Results for Lincoln Clients',
        intro: 'Community visibility compounds — the earlier a new Lincoln business establishes presence, the faster word of mouth follows.',
        metrics: [
          { value: '5x', label: 'weekly posting consistency', context: 'compared to sporadic manual posting' },
          { value: '3 hrs', label: 'average response time', context: 'to comments and messages, down from days' },
          { value: '58%', label: 'increase in engagement', context: 'within the first 90 days of managed social presence' },
          { value: '2', label: 'community channels actively monitored', context: 'Facebook groups and Nextdoor, in addition to standard social platforms' },
        ],
      },
      {
        type: 'competitive-edge',
        headline: 'Why DIY Social Media Falls Behind in a Community Like Lincoln',
        intro: 'Manual social media management can\'t keep pace with how fast Lincoln\'s community conversation moves.',
        advantages: [
          { ours: 'Consistent daily presence without relying on an owner\'s spare time', theirs: 'Sporadic posting whenever the business owner remembers' },
          { ours: 'Active monitoring of Lincoln-specific Facebook groups for mentions', theirs: 'No visibility into what\'s being said in community groups' },
          { ours: 'Content built around specific Lincoln developments and local events', theirs: 'Generic social content with no local specificity' },
          { ours: 'Fast response times that build trust in a word-of-mouth-driven market', theirs: 'Delayed or missed responses that read as inattentive' },
        ],
      },
      {
        type: 'industry-spotlight',
        headline: 'Lincoln Businesses That Rely Most on Community Social Presence',
        industries: [
          { name: 'New Restaurants', challenge: 'Opening-week buzz in Lincoln Facebook groups can make or break a new restaurant\'s first months.', solution: 'Active monitoring and fast response turns community chatter into a reputation asset instead of a risk.' },
          { name: 'Home Services', challenge: 'Recommendations in Lincoln neighborhood groups drive a disproportionate share of home service leads.', solution: 'Consistent, responsive social presence positions your business as the go-to recommendation.' },
          { name: 'Retail & Boutiques', challenge: 'New retail openings compete for attention against a constant stream of other new Lincoln businesses.', solution: 'Localized content keeps your opening and ongoing presence visible amid the noise.' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 16. Roseville — AI Automation Strategies
  // ─────────────────────────────────────────────────────────────
  'roseville-ai-automation-strategies': {
    heroSubtitle:
      "Roseville's 147,000-resident market rewards efficiency as much as visibility. AI Automation Strategies gives established Roseville businesses a clear roadmap for cutting operational overhead without cutting service quality.",
    sections: [
      {
        type: 'market-snapshot',
        headline: 'Roseville Competitive Efficiency Snapshot',
        stats: [
          { value: '147,000+', label: 'Roseville residents', detail: 'Placer County\'s largest city and one of the most competitive commercial markets in the Sacramento region.' },
          { value: '$1.4B+', label: 'in annual retail sales', detail: 'A market this large means operational inefficiency has an outsized cost relative to smaller cities.' },
          { value: '2', label: 'major retail centers', detail: 'The Galleria at Roseville and The Fountains create dense competitive pressure across nearly every business category.' },
          { value: '30-45%', label: 'typical admin time reduction', detail: 'Range of operational time savings Roseville clients report after implementing a prioritized automation roadmap.' },
        ],
      },
      {
        type: 'service-deep-dive',
        headline: 'AI Automation Strategies for Established Roseville Businesses',
        intro: 'DSIG builds a prioritized automation roadmap specifically for Roseville businesses looking to protect margin in a market where every competitor is fighting for the same customers.',
        features: [
          { title: 'Efficiency Audit', description: 'A close look at where your established Roseville business is losing time to manual, repetitive work.' },
          { title: 'Prioritized Implementation Plan', description: 'A sequenced roadmap ranking automation opportunities by impact, not a generic tool checklist.' },
          { title: 'Customer Communication Automation', description: 'Automated scheduling, follow-up, and review response systems built for Roseville\'s high-volume customer base.' },
          { title: 'Competitive Benchmarking', description: 'A look at how automation-forward competitors near the Galleria and Fountains are operating, and where the gap is.' },
        ],
      },
      {
        type: 'process-flow',
        headline: 'Rolling Out Automation at a Roseville Business',
        steps: [
          { number: '01', title: 'Operational Audit', detail: 'We map exactly where manual work is costing your Roseville business the most time and money.' },
          { number: '02', title: 'Roadmap Prioritization', detail: 'Automation opportunities ranked by impact and ease of implementation.' },
          { number: '03', title: 'Phased Rollout', detail: 'Automation deployed in phases so your team adjusts without disruption to day-to-day operations.' },
          { number: '04', title: 'Team Training', detail: 'Staff trained on new automated workflows so adoption sticks past the initial rollout.' },
          { number: '05', title: 'Quarterly Review', detail: 'Ongoing reassessment as your Roseville business and the competitive landscape continue to evolve.' },
        ],
      },
      {
        type: 'competitive-edge',
        headline: 'Roseville Businesses With a Roadmap vs. Without One',
        intro: 'In a market this competitive, efficiency gaps compound fast.',
        advantages: [
          { ours: 'A prioritized, sequenced automation roadmap tailored to your business', theirs: 'Ad hoc tool adoption with no coordinated strategy' },
          { ours: 'Automation focused on the highest-impact bottlenecks first', theirs: 'Time spent automating low-impact tasks while major bottlenecks persist' },
          { ours: 'Staff training built into the rollout for lasting adoption', theirs: 'New tools introduced without training, leading to abandoned adoption' },
          { ours: 'Quarterly strategy updates as the Roseville market shifts', theirs: 'A one-time setup that goes stale as the business and market change' },
        ],
      },
      {
        type: 'results-preview',
        headline: 'Efficiency Gains Roseville Clients Report',
        intro: 'The payoff shows up directly on the bottom line, not just in workflow charts.',
        metrics: [
          { value: '38%', label: 'reduction in admin overhead', context: 'within the first 90 days of rollout' },
          { value: '$2,400/mo', label: 'average operational cost savings', context: 'reported by mid-size Roseville clients' },
          { value: '2.5x', label: 'faster customer response time', context: 'across scheduling and inquiry channels' },
          { value: '6-8 weeks', label: 'full roadmap implementation', context: 'from audit to phased rollout completion' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 17. Sacramento — AI Agent Swarms
  // ─────────────────────────────────────────────────────────────
  'sacramento-ai-agent-swarms': {
    heroSubtitle:
      "Sacramento's scale — 530,000 in the city, 2.4 million across the metro — means complex, multi-channel operations that a single AI assistant can't handle alone. AI Agent Swarms coordinate multiple specialized AI agents to run Sacramento-scale demand generation.",
    sections: [
      {
        type: 'market-snapshot',
        headline: 'Sacramento Metro Scale Snapshot',
        stats: [
          { value: '530,000+', label: 'Sacramento city residents', detail: 'The state capital and economic hub of a six-county metro area.' },
          { value: '2.4M+', label: 'metro area population', detail: 'One of the largest metro markets in Northern California, spanning six counties.' },
          { value: '3 core sectors', label: 'government, tech, healthcare', detail: 'Sacramento\'s economy is anchored by state government, a growing tech sector, and major healthcare systems.' },
          { value: '50,000+', label: 'registered businesses', detail: 'Sacramento County alone has more registered businesses than any nearby county.' },
        ],
      },
      {
        type: 'local-context',
        headline: 'A Market Too Large for a Single AI Assistant',
        paragraphs: [
          'Sacramento is the state capital and the economic hub of a six-county metro area with over 2.4 million residents. The city\'s downtown revitalization — the DOCO district, the Golden 1 Center, the emerging Innovation District — has drawn thousands of new businesses into an already dense, competitive market.',
          'At this scale, a single AI tool handling outreach, content, review management, and lead qualification separately creates bottlenecks and blind spots. AI Agent Swarms coordinate multiple specialized agents working in parallel — each handling one function — so Sacramento businesses can operate at the volume the market demands.',
        ],
      },
      {
        type: 'service-deep-dive',
        headline: 'Coordinated AI Agent Swarms for Sacramento-Scale Operations',
        intro: 'DSIG\'s AI Agent Swarms deploy multiple specialized agents working together — not a single generalist bot trying to do everything at once.',
        features: [
          { title: 'Outreach Agent', description: 'Dedicated agent handling personalized cold outreach at the volume Sacramento\'s competitive market demands.' },
          { title: 'Content Agent', description: 'A specialized agent generating and scheduling content tailored to Sacramento\'s distinct neighborhoods and sectors.' },
          { title: 'Review & Reputation Agent', description: 'An agent focused entirely on monitoring and responding to reviews across every Sacramento location.' },
          { title: 'Lead Qualification Agent', description: 'A dedicated agent scoring and routing inbound leads so your sales team only spends time on qualified prospects.' },
          { title: 'Coordination Layer', description: 'A central orchestration layer that keeps all agents working from the same data and business context.' },
        ],
      },
      {
        type: 'industry-spotlight',
        headline: 'Sacramento Sectors Running AI Agent Swarms',
        industries: [
          { name: 'Healthcare Systems', challenge: 'Sacramento\'s major healthcare providers manage patient communication at a volume no single tool can handle.', solution: 'Specialized agents split scheduling, reminders, and review management across dedicated workflows.' },
          { name: 'Government Contractors', challenge: 'Vendors serving Sacramento\'s state government sector need coordinated outreach and compliance-aware content.', solution: 'Dedicated outreach and content agents operate within compliance guardrails specific to government contracting.' },
          { name: 'Technology Companies', challenge: 'Sacramento\'s growing tech sector competes directly with Bay Area companies expanding east for the same talent and clients.', solution: 'Coordinated agent swarms scale outreach and content output to match larger, better-funded competitors.' },
        ],
      },
      {
        type: 'process-flow',
        headline: 'Deploying an Agent Swarm at Sacramento Scale',
        steps: [
          { number: '01', title: 'Operations Mapping', detail: 'We map every function across your Sacramento operation that could benefit from a dedicated agent.' },
          { number: '02', title: 'Agent Design', detail: 'Each agent is scoped and built for one specific function, trained on your business context.' },
          { number: '03', title: 'Coordination Layer Build', detail: 'A central system connects all agents so they share data and don\'t work at cross purposes.' },
          { number: '04', title: 'Staged Deployment', detail: 'Agents deployed one at a time, verified, then layered together into a coordinated swarm.' },
          { number: '05', title: 'Monitoring & Tuning', detail: 'Active monitoring of agent performance with ongoing tuning as your Sacramento operation scales.' },
          { number: '06', title: 'Quarterly Expansion Review', detail: 'New agent opportunities assessed quarterly as your business grows within the Sacramento metro.' },
        ],
      },
      {
        type: 'results-preview',
        headline: 'Results at Sacramento Scale',
        intro: 'Agent swarms are built for volume — the results reflect that.',
        metrics: [
          { value: '5x', label: 'outreach volume capacity', context: 'compared to a single-agent or manual approach' },
          { value: '90%', label: 'of reviews responded to within hours', context: 'across all Sacramento-area locations' },
          { value: '3.5x', label: 'more qualified leads routed', context: 'to sales teams per month' },
          { value: '24/7', label: 'coordinated operation', context: 'across every deployed agent function' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 18. Auburn — AI Content Generation
  // ─────────────────────────────────────────────────────────────
  'auburn-ai-content-generation': {
    heroSubtitle:
      "Auburn's Old Town shops and Sierra foothills recreation businesses need seasonal content at a volume no small team can write by hand. AI Content Generation produces the trail guides, event previews, and seasonal specials Auburn's dual local-and-tourist audience expects.",
    sections: [
      {
        type: 'local-context',
        headline: 'Auburn\'s Seasonal Content Demand',
        paragraphs: [
          'Auburn is the seat of Placer County and the gateway to the Sierra Nevada foothills, serving both a loyal local population and a steady stream of outdoor recreation tourists headed toward the American River, Foresthill, and Tahoe. Its Old Town historic district anchors local commerce, while trail running, mountain biking, and rafting drive tourist traffic.',
          'That dual audience creates a content demand most small Auburn businesses can\'t keep pace with manually — trail condition updates, seasonal event previews, and local specials all need to be written, and rewritten, as conditions change through the year.',
        ],
      },
      {
        type: 'market-snapshot',
        headline: 'Auburn Content Market Snapshot',
        stats: [
          { value: '14,000+', label: 'Auburn residents', detail: 'Placer County\'s seat, serving as a hub for surrounding rural communities including Meadow Vista and Colfax.' },
          { value: '2 audiences', label: 'locals + outdoor tourists', detail: 'Auburn businesses write for both a loyal local base and recreation tourists passing through to the Sierra.' },
          { value: '4 seasons', label: 'of shifting content needs', detail: 'Trail conditions, event calendars, and seasonal specials all change content requirements throughout the year.' },
          { value: '4-6x', label: 'more content published', detail: 'Typical increase in publishable seasonal content volume Auburn clients see after adopting AI content generation.' },
        ],
      },
      {
        type: 'service-deep-dive',
        headline: 'AI Content Generation for Auburn\'s Dual-Audience Market',
        intro: 'DSIG\'s AI Content Generation produces the volume of seasonal, dual-audience content Auburn businesses need without adding a full-time content writer.',
        features: [
          { title: 'Seasonal Trail & Event Content', description: 'Trail condition updates and event previews generated and refreshed as conditions change through the year.' },
          { title: 'Old Town Local Content', description: 'Content that speaks directly to Auburn locals following Old Town events and business updates.' },
          { title: 'Tourist-Facing Guide Content', description: 'Content built for outdoor recreation travelers searching for gear, food, and lodging before a Sierra trip.' },
          { title: 'Shoulder-Season Specials Content', description: 'Seasonal promotions written and published ahead of Auburn\'s slower shoulder seasons to help smooth revenue.' },
          { title: 'Multi-Format Output', description: 'Blog, social, and email content generated from a single brief, matched to each channel\'s format.' },
        ],
      },
      {
        type: 'competitive-edge',
        headline: 'AI Content Generation vs. Manual Seasonal Writing',
        intro: 'Auburn\'s seasonal content demands outpace what a solo owner or small team can produce by hand.',
        advantages: [
          { ours: 'Consistent content output through every seasonal shift', theirs: 'Content that goes stale for weeks between manual updates' },
          { ours: 'Dual-audience content built for both locals and tourists', theirs: 'Single-audience content that misses half of Auburn\'s actual customer base' },
          { ours: 'Trail and event content refreshed as conditions actually change', theirs: 'Outdated trail or event information left live for months' },
          { ours: 'Scales content volume without adding headcount', theirs: 'Content output capped by however much time an owner has left over' },
        ],
      },
      {
        type: 'results-preview',
        headline: 'Content Output for Auburn Businesses',
        intro: 'Consistent, seasonally aware content compounds visibility across both Auburn\'s local and tourist search traffic.',
        metrics: [
          { value: '5x', label: 'monthly content output', context: 'compared to manual, single-writer production' },
          { value: '46%', label: 'increase in seasonal search visibility', context: 'during peak outdoor recreation months' },
          { value: '2 audiences reached', label: 'per content piece', context: 'local and tourist framing built into the same content strategy' },
          { value: '4 refresh cycles/year', label: 'aligned to seasons', context: 'content automatically refreshed for each seasonal shift' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 19. Pine Grove — AI Social Media Management
  // ─────────────────────────────────────────────────────────────
  'pine-grove-ai-social-media-management': {
    heroSubtitle:
      "Pine Grove businesses along the Highway 88 corridor need social presence to catch wine-country travelers passing through Amador County, not just locals. AI Social Media Management keeps a small Pine Grove business visible without a dedicated social hire.",
    sections: [
      {
        type: 'local-context',
        headline: 'A Small Community on a Wine Country Corridor',
        paragraphs: [
          'Pine Grove is an unincorporated community along Highway 88 in Amador County, near Indian Grinding Rock State Historic Park. Its small local population means most Pine Grove businesses depend on capturing travelers moving through the Shenandoah Valley wine region — visitors who research and discover businesses primarily through social media and search before arriving.',
          'A one- or two-person Pine Grove business can rarely justify a dedicated social media hire, which leaves social presence inconsistent at best and abandoned at worst — right when consistent visibility matters most to catch passing wine-country traffic.',
        ],
      },
      {
        type: 'market-snapshot',
        headline: 'Pine Grove Social Reach Snapshot',
        stats: [
          { value: '<1,000', label: 'Pine Grove local population', detail: 'A small, rural Amador County community whose businesses depend heavily on through-traffic visibility.' },
          { value: '40+', label: 'nearby wine tasting rooms', detail: 'The Shenandoah Valley AVA sits within easy reach of the Highway 88 corridor, driving tourist search traffic.' },
          { value: '2', label: 'primary discovery channels', detail: 'Social media and search dominate how wine-country travelers discover Pine Grove-area businesses.' },
          { value: '0-1', label: 'typical staff dedicated to marketing', detail: 'Most Pine Grove businesses have no dedicated marketing staff, making automation essential.' },
        ],
      },
      {
        type: 'service-deep-dive',
        headline: 'AI Social Media Management for a Small Amador County Business',
        intro: 'DSIG\'s AI Social Media Management keeps a consistent, professional social presence running for Pine Grove businesses without requiring dedicated staff time.',
        features: [
          { title: 'Consistent Posting Schedule', description: 'Regular content published across Facebook, Instagram, and Google Business even with a one- or two-person team.' },
          { title: 'Wine Country Traveler Targeting', description: 'Content framed to catch travelers researching the Shenandoah Valley AVA and Highway 88 corridor before their trip.' },
          { title: 'Local Community Engagement', description: 'Presence maintained in Amador County community groups alongside broader tourist-facing content.' },
          { title: 'Automated Comment & Message Response', description: 'Fast responses to inquiries and comments without requiring the owner to be online constantly.' },
        ],
      },
      {
        type: 'results-preview',
        headline: 'Social Visibility Results for Pine Grove Businesses',
        intro: 'Even a small business sees outsized returns from consistent visibility on a tourist corridor.',
        metrics: [
          { value: '6x', label: 'weekly posting consistency', context: 'versus sporadic manual posting' },
          { value: '35%', label: 'increase in out-of-area engagement', context: 'from wine-country travelers researching the area' },
          { value: '0 added staff hours', label: 'required', context: 'to maintain a consistent social presence' },
          { value: '4 hrs', label: 'average response time', context: 'to inquiries and comments, down from days' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 20. Truckee — Geo-Targeting
  // ─────────────────────────────────────────────────────────────
  'truckee-geo-targeting': {
    heroSubtitle:
      "Truckee competes for Bay Area travelers who are searching for Lake Tahoe, not necessarily 'Truckee' by name. Geo-targeting reaches those travelers by origin and intent, making sure Truckee businesses surface before the trip is even booked.",
    sections: [
      {
        type: 'local-context',
        headline: 'A Mountain Town Competing Under a Bigger Name',
        paragraphs: [
          'Truckee sits on the north shore of Lake Tahoe in Nevada County, but most travelers planning a trip search for "Lake Tahoe," not "Truckee" specifically — even when Truckee is exactly where they\'ll end up staying, eating, and shopping. That naming gap costs Truckee businesses visibility against destinations branded more directly as "Tahoe."',
          'The businesses that win in Truckee are the ones that target travelers by where they\'re coming from and what they\'re planning, not just by waiting to be found under the Truckee name specifically.',
        ],
      },
      {
        type: 'competitive-edge',
        headline: 'Reaching Bay Area Travelers Before They Book',
        intro: 'Standard local SEO waits for someone to search "Truckee" — geo-targeting reaches them while they\'re still planning a "Tahoe" trip from the Bay Area.',
        advantages: [
          { ours: 'Geo-fenced targeting of Bay Area origin points during typical Tahoe trip-planning windows', theirs: 'Passive local listings that only appear for exact "Truckee" searches' },
          { ours: 'Campaigns built around "Lake Tahoe" search intent, capturing travelers who don\'t know Truckee by name yet', theirs: 'No visibility for travelers searching broader Tahoe-region terms' },
          { ours: 'Retargeting for Bay Area users who researched Tahoe trips but haven\'t booked', theirs: 'One-time visibility with no follow-up for undecided travelers' },
          { ours: 'Seasonal campaign timing matched to ski season and summer lake booking windows', theirs: 'Static, always-on targeting with no seasonal strategy' },
        ],
      },
      {
        type: 'market-snapshot',
        headline: 'Truckee Visitor Origin Snapshot',
        stats: [
          { value: '17,000+', label: 'Truckee residents', detail: 'A Nevada County mountain resort town whose economy depends heavily on non-local visitor spending.' },
          { value: '3-4 hrs', label: 'drive from the Bay Area', detail: 'The majority of Truckee\'s weekend and seasonal visitors originate from the greater Bay Area.' },
          { value: '2 peak windows', label: 'winter ski + summer lake season', detail: 'Truckee sees two distinct visitor surges each year, each with different trip-planning timelines.' },
          { value: '"Tahoe" > "Truckee"', label: 'search volume gap', detail: 'Far more travelers search broad "Lake Tahoe" terms than search "Truckee" by name specifically.' },
        ],
      },
      {
        type: 'service-deep-dive',
        headline: 'Geo-Targeting Built for Truckee\'s Naming Gap',
        intro: 'DSIG\'s geo-targeting service is built specifically to close the gap between how travelers search ("Lake Tahoe") and where they actually end up (Truckee).',
        features: [
          { title: 'Origin-Based Bay Area Targeting', description: 'Ads and content targeted specifically to Bay Area users during peak trip-planning windows.' },
          { title: '"Tahoe" Intent Capture', description: 'Campaigns built to intercept broader "Lake Tahoe" search intent, not just exact "Truckee" queries.' },
          { title: 'Seasonal Campaign Timing', description: 'Targeting windows tuned to ski-season and summer-lake booking patterns specifically.' },
          { title: 'Retargeting for Undecided Travelers', description: 'Follow-up targeting for Bay Area users who researched a Tahoe trip but haven\'t committed yet.' },
        ],
      },
      {
        type: 'results-preview',
        headline: 'Geo-Targeting Results for Truckee Businesses',
        intro: 'Closing the "Tahoe" vs. "Truckee" search gap shows up directly in booking and inquiry volume.',
        metrics: [
          { value: '2.6x', label: 'more Bay Area-origin traffic', context: 'compared to standard local SEO alone' },
          { value: '31%', label: 'increase in booking inquiries', context: 'during peak season trip-planning windows' },
          { value: '2 seasonal campaigns/year', label: 'ski + summer', context: 'timed to Truckee\'s two distinct visitor surges' },
          { value: '3-5 days', label: 'typical trip-planning window targeted', context: 'the window during which most Bay Area Tahoe trips get finalized' },
        ],
      },
    ],
  },
}

export function getPageConfig(slug: string): LtpPageConfig | null {
  return PAGE_CONFIGS[slug] ?? null
}
